const { graphRequest } = require ('../call-graph.js')
const { misc } = require ('../../../../config.js')
const { logger } = require('@vtfk/logger')

/**
 * Retrieves the list of directory objects owned by a user, filters out non-SDS teams and expired resources.
 *
 * @param {string} upn - The User Principal Name (UPN) of the user.
 * @returns {Promise<Array>} A promise that resolves to an array of owned objects that are school teams and not expired.
 * @throws {Error} If the 'upn' parameter is not specified.
 */
const getOwnedObjects = async (upn) => {
    logPrefix = 'getOwnedObjects'
    // Get the list of directory objects that are owned by the user.
    // Input validation
    if (!upn) throw new Error('Cannot search for a user if \'upn\' is not specified')
    const url = `https://graph.microsoft.com/v1.0/users/${upn}/ownedObjects?$select=id,displayName,mail,description`
    let data = await graphRequest(url, 'GET', 'null')
    
    // Clean up the response
    if (data?.value) data = data.value

    // Return only school teams. 
    // Filter out any resources that is not an SDS team
    logger('info', [logPrefix, `Removing any resources that is not an SDS team for user with upn ${upn}`])
    // Filter out any resources that is not a school team, kopi0624 or section_. Kopi0624 is a quick fix for this school year. 
    data = data.filter(object => object.mail && (object.mail.toLowerCase().startsWith('section_') || object.mail.toLowerCase().startsWith('kopi0624')))
    // Filter out any resources that is expired
    logger('info', [logPrefix, `Removing any expired resources for user with upn ${upn}`])
    data = data.filter(object => !object.displayName.toLowerCase().startsWith('exp'))

    
    // Return the teams
    logger('info', [logPrefix, `Found ${data.length} teams for user with upn ${upn}`])

    return data
}


/**
 * Retrieves the members of a specified group from Microsoft Graph API.
 *
 * @param {string} groupId - The ID of the group to retrieve members from.
 * @param {boolean} onlyStudents - If true, filters the members to include only students.
 * @returns {Promise<Array>} A promise that resolves to an array of group members.
 * @throws {Error} Throws an error if the groupId is not specified.
 */
const getGroupMembers = async (groupId, onlyStudents) => {
    logPrefix = 'getGroupMembers'
    // Get the list of members in a group
    // Input validation
    if (!groupId) throw new Error('Cannot search for a group if \'groupId\' is not specified')
    let url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members?$select=id,displayName,userPrincipalName,mail,officeLocation&$count=true&$top=100`
    let finished = false
    const result = {
        count: 0, 
        value: []
    }
    let page = 0
    let data
    while (!finished) {
        data = await graphRequest(url, 'GET', 'null', 'eventual')
        finished = data['@odata.nextLink'] === undefined
        url = data['@odata.nextLink']
        result.value = result.value.concat(data.value)
        page++
    }
    result.count = result.value.length

    // Clean up the response
    if (result?.value) data = result.value
    if (onlyStudents === 'true') {
        // Filter out any resources that is not a student
        logger('info', [logPrefix, `Removing any resources that is not a student for group with id ${groupId}`])
        data = data.filter(member => member.userPrincipalName && member.userPrincipalName.toLowerCase().endsWith(`@skole.${misc.email_domain}`))
    }

    // Return the members
    logger('info', [logPrefix, `Found ${data.length} members in group with id ${groupId}`])

    return data
}

/**
 * Removes specified members from a group.
 *
 * @param {string} groupId - The ID of the group from which members will be removed.
 * @param {Array} members - An array of member objects to be removed from the group.
 * @returns {Object} An object containing the results of the removal operation.
 * @throws {Error} Throws an error if 'groupId' or 'members' is not specified, or if 'members' is not an array.
*/
const removeGroupMembers = async (groupId, members) => {
    logPrefix = 'removeGroupMembers'
    // Input validation
    if (!groupId) throw new Error('Cannot remove members from a group if \'groupId\' is not specified')
    if (!members) throw new Error('Cannot remove members from a group if \'members\' is not specified')
    if (!Array.isArray(members)) throw new Error('\'members\' must be an array');

    // Remove the members from the group
    let membersRemoved = {
        total: 0,
        membersRemoved: 0,
        failedNumber: 0,
        failed: [],
        success: []
    }

    // Check if the member is in the group, if the member is not in the group, remove them from the list
    const currentMembers = await getGroupMembers(groupId)
    const currentMemberIds = currentMembers.map(member => member.id)
    members = members.filter(member => currentMemberIds.includes(member.id))
    if(members.length === 0) {  
        logger('info', [logPrefix, `No members to removed found in group with id ${groupId}`])
        return membersRemoved
    }
    logger('info', [logPrefix, `Found ${members.length} members to remove from the group with id ${groupId}`])
    for (const member of members) {
        let memberInfo = {
            memberID: member.id,
            groupID: groupId,
            error: null
        }
        membersRemoved.total++
        const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/${member.id}/$ref`
        try {
            const request = await graphRequest(url, 'DELETE', 'null')
            logger('info', [logPrefix, `Removed member with id ${member.id} from group with id ${groupId}`])
            membersRemoved.membersRemoved++
            membersRemoved.success.push(memberInfo)
        } catch (error) {
            // Avoid logging ResourceNotFound errors as they are expected when the member is not in the group
            if (error?.response?.data?.error?.code === 'Request_ResourceNotFound') {
                logger('info', [logPrefix, `Member with id ${member.id} was not found in group with id ${groupId}`])
            } else {
                logger('WARN', [logPrefix, `Failed to remove member with id ${member.id} from group with id ${groupId}`,'Member was probably already removed from the group but Microsoft was to slow to update the group members.' , error?.response?.data?.error || error])
            }
            membersRemoved.membersRemoved++
            memberInfo.error = (error?.response?.data?.error || error)
            membersRemoved.failed.push(memberInfo)
            continue
        } 
    }
    return membersRemoved
}

/**
 * Adds members to a specified group.
 *
 * @param {string} groupId - The ID of the group to add members to.
 * @param {Array} members - An array of member objects to be added to the group.
 * @returns {Promise<Object>} An object containing the results of the operation, including total members processed, members successfully added, and any failures.
 * @throws {Error} Throws an error if 'groupId' or 'members' is not specified, or if 'members' is not an array.
 */
const addGroupMembers = async (groupId, members) => {
    logPrefix = 'addGroupMembers'
    // Add members to a group
    // Input validation
    if (!groupId) throw new Error('Cannot add members to a group if \'groupId\' is not specified')
    if (!members) throw new Error('Cannot add members to a group if \'members\' is not specified')
    if (!Array.isArray(members)) throw new Error('\'members\' must be an array');

    // Add the members to the group
    let membersAdded = {
        total: 0,
        membersAdded: 0,
        failedNumber: 0,
        failed: [],
        success: []
    }

    // Check if the member is already in the group and remove them from the list
    const currentMembers = await getGroupMembers(groupId)
    const currentMemberIds = currentMembers.map(member => member.id)
    members = members.filter(member => !currentMemberIds.includes(member.id))
    logger('info', [logPrefix, `Found ${members.length} members to add to group with id ${groupId}`])


    // Bulk add members to the group
    const url = `https://graph.microsoft.com/v1.0/groups/${groupId}`

    // Divide the members into chunks of 20
    const chunkSize = 20 // 20 is the maximum number of members that can be added in a single request. Refer to the Microsoft Graph API documentation for more details.
    const chunks = []
    for (let i = 0; i < members.length; i += chunkSize) {
        chunks.push(members.slice(i, i + chunkSize))
    }

    // Loop through the chunks and add the members to the group
    for (const chunk of chunks) {
        const body = {
            "members@odata.bind": chunk.map(member => `https://graph.microsoft.com/v1.0/directoryObjects/${member.id}`)
        }
        try {
            const request = await graphRequest(url, 'PATCH', body)
            logger('info', [logPrefix, `Added ${chunk.length} members to group with id ${groupId}. Members added: ${chunk.map(member => member.id).join(', ')}`])
            membersAdded.membersAdded += chunk.length
            membersAdded.success.push(...chunk.map(member => ({ memberID: member.id, groupID: groupId })))
        } catch (error) {
            console.error(error?.response?.data?.error || error)
            logger('WARN', [logPrefix, `Failed to add members with ids ${chunk.map(member => member.id).join(', ')} to group with id ${groupId}`, error?.response?.data?.error || error])
            membersAdded.failedNumber++
            memberInfo.error = (error?.response?.data?.error || error)
            membersAdded.failed.push(memberInfo)
        }
    }
    // Dont need this anymore, since we are using the bulk add method above. But im a hoarder so I will keep it for now. 🦖
    // for (const member of members) {
    //     let memberInfo = {
    //         memberID: member.id,
    //         groupID: groupId,
    //         error: null
    //     }
    //     membersAdded.total++
    //     const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/$ref` // Single member
    //     try {
    //         const request = await graphRequest(url, 'POST', { '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${member.id}` })
    //         logger('info', [logPrefix, `Added member with id ${member.id} to group with id ${groupId}`])
    //         membersAdded.membersAdded++
    //         membersAdded.success.push(memberInfo)
    //     } catch (error) {
    //         console.error(error?.response?.data?.error || error)
    //         logger('WARN', [logPrefix, `Failed to add member with id ${member.id} to group with id ${groupId}`, error?.response?.data?.error || error])
    //         membersAdded.failedNumber++
    //         memberInfo.error = (error?.response?.data?.error || error)
    //         membersAdded.failed.push(memberInfo)
    //     }
    // }

    return membersAdded
}

module.exports = { getOwnedObjects, getGroupMembers, addGroupMembers, removeGroupMembers }