const { graphRequest } = require ('../call-graph.js')
const { misc } = require ('../../../../config.js')
const { logger } = require('@vtfk/logger')

/**
 * 
 * @param {String} upn 
 * @returns 
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
 * 
 * @param {String} groupId
 * @param {Boolean} onlyStudents 
 * @returns 
 */
const getGroupMembers = async (groupId, onlyStudents) => {
    logPrefix = 'getGroupMembers'
    // Get the list of members in a group
    // Input validation
    if (!groupId) throw new Error('Cannot search for a group if \'groupId\' is not specified')
    const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members?$select=id,displayName,userPrincipalName,mail`
    let data = await graphRequest(url, 'GET', 'null', 'eventual')
    
    // Clean up the response
    if (data?.value) data = data.value
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
 * 
 * @param {String} groupId 
 * @param {Array} members 
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
    console.log(members)
    if(members.length === 0) return membersRemoved
    logger('info', [logPrefix, `Found ${members.length} members to remove from the group with id ${groupId}`])

    for (const member of members) {
        console.log(member.id)
        let memberInfo = {
            memberID: member.id,
            groupID: groupId,
            error: null
        }
        membersRemoved.total++
        const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/${member.id}/$ref`
        try {
            const request = await graphRequest(url, 'DELETE', 'null', 'eventual')
            console.log(request)
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
    console.log(membersRemoved)
    return membersRemoved
}

/**
 * 
 * @param {String} groupId 
 * @param {Array} members 
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