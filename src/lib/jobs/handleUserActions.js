const { getMongoClient } = require('../../lib/auth/mongoClient.js')
const { mongoDB } = require('../../../config.js')
const { logger } = require('@vtfk/logger')
const { addGroupMembers, removeGroupMembers } = require('../../lib/graph/jobs/groups.js'); 

/**
 * 
 * @param {String} action | The action to be performed by the user [activate, deactivate]
 */
const handleUserActions = async (action) => {
    const logPrefix = 'handleUserActions'
    logger('info', [logPrefix, `Action: ${action}`])

    // Connect to the database
    const mongoClient = await getMongoClient()
    const d = new Date();
    // We need to format the date to match the format in the database
    const dateLocal = d.toLocaleString('nb-NO', {timeZone: 'Europe/Oslo', hour12: false, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'});
    // Reformat date from this "DD.MM.YYYY, HH:MM" to this format: YYYY-MM-DDTHH:MM
    const dateLocalFormat = dateLocal.replace(/(\d{2})\.(\d{2})\.(\d{4}),\s(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5')
    
    let blockStatus = null
    if(action === 'activate') {
        blockStatus = 'pending'
    } else {
        blockStatus = 'active'
    }

    // Find any blocks with the start date less than or equal to the current date
    try {
        logger('info', [logPrefix, `Finding blocks with start date less than or equal to current date - ${dateLocalFormat}` ])
        const blocks = await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).find({status: blockStatus, startBlock: { $lte: dateLocalFormat }}).toArray()
        logger('info', [logPrefix, `Found ${blocks.length} blocks`])

        // If there are no blocks, return
        if(blocks.length < 1){
            return {status: 200, jsonBody: `No blocks to ${action}`}
        }

        // Loop through the blocks that are found
        for (const block of blocks) {
            try {
                // Add/remove the students to the group
                if(action === 'activate') {
                    logger('info', [logPrefix, `Adding ${block.students.length} students to group: ${block.typeBlock.groupId}`])
                    await addGroupMembers(block.typeBlock.groupId, block.students)
                } else {
                    logger('info', [logPrefix, `Removing ${block.students.length} students from group: ${block.typeBlock.groupId}`])
                    await removeGroupMembers(block.typeBlock.groupId, block.students)
                }
            } catch (error) {
                if(action === 'activate') {
                    logger('error', [logPrefix, `Error adding members to group: ${error}`])
                } else {
                    logger('error', [logPrefix, `Error removing members from group: ${error}`])
                }
            }
            // Update the status of the block to active/expired
            if(action === 'activate') {
                await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).updateOne({ _id: block._id }, {$set: { status: 'active' }})
            } else {
                await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).updateOne({ _id: block._id }, {$set: { status: 'expired' }})
            }
        }
        return {status: 200, jsonBody: blocks};
    } catch (error) {
        logger('error', [logPrefix, `Error finding blocks: ${error}`])
    }
}

module.exports = {handleUserActions}