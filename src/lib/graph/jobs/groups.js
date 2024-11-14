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
    let data = await graphRequest(url, 'GET', 'null', 'eventual')
    
    // Clean up the response
    if (data?.value) data = data.value

    // Return only school teams. 
    // Filter out any resources that is not an SDS team
    logger('info', [logPrefix, `Removing any resources that is not an SDS team for user with upn ${upn}`])
    data = data.filter(object => object.mail && object.mail.toLowerCase().startsWith('section_'))
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
    if(members.length === 0) return membersRemoved
    logger('info', [logPrefix, `Found ${members.length} members to remove from the group with id ${groupId}`])

    for (const member of members) {
        // If members.length is greater than 5, split the array into equal parts but not bigger than 5. This is to avoid throttling and issues with the graph api.
        if (members.length > 5) {
            logger('info', [logPrefix, `Found more than 5 members to remove from the group with id ${groupId}, splitting the array into equal parts of 5`])
            const memberIndex = members.indexOf(member)
            const memberIndexEnd = memberIndex + 5
            const membersToProcess = members.slice(memberIndex, memberIndexEnd)
            members.splice(memberIndex, 5)
            const membersRemovedPart = await removeGroupMembers(groupId, membersToProcess)
            continue
        }
        let memberInfo = {
            memberID: member.id,
            groupID: groupId,
            error: null
        }
        membersRemoved.total++
        const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/${member.id}/$ref`
        try {
            const request = await graphRequest(url, 'DELETE', 'null', 'eventual')
            logger('info', [logPrefix, `Removed member with id ${member.id} to group with id ${groupId}`])
            membersRemoved.membersRemoved++
            membersRemoved.success.push(memberInfo)
        } catch (error) {
            console.error(error?.response?.data?.error || error)
            logger('WARN', [logPrefix, `Failed to remove member with id ${member.id} from group with id ${groupId}`, error?.response?.data?.error || error])
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
 
    for (const member of members) {
        // If members.length is greater than 5, split the array into equal parts but not bigger than 5. This is to avoid throttling and issues with the graph api.
        if (members.length > 5) {
            logger('info', [logPrefix, `Found more than 5 members to remove from the group with id ${groupId}, splitting the array into equal parts of 5`])
            const memberIndex = members.indexOf(member)
            const memberIndexEnd = memberIndex + 5
            const membersToProcess = members.slice(memberIndex, memberIndexEnd)
            members.splice(memberIndex, 5)
            const membersRemovedPart = await removeGroupMembers(groupId, membersToProcess)
            continue
        }
        let memberInfo = {
            memberID: member.id,
            groupID: groupId,
            error: null
        }
        membersAdded.total++
        const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/$ref`
        try {
            const request = await graphRequest(url, 'POST', { '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${member.id}` }, 'eventual')
            logger('info', [logPrefix, `Added member with id ${member.id} to group with id ${groupId}`])
            membersAdded.membersAdded++
            membersAdded.success.push(memberInfo)
        } catch (error) {
            console.error(error?.response?.data?.error || error)
            logger('WARN', [logPrefix, `Failed to add member with id ${member.id} to group with id ${groupId}`, error?.response?.data?.error || error])
            membersAdded.failedNumber++
            memberInfo.error = (error?.response?.data?.error || error)
            membersAdded.failed.push(memberInfo)
        }
    }

    return membersAdded
}

module.exports = { getOwnedObjects, getGroupMembers, addGroupMembers, removeGroupMembers }