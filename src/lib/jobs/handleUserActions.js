const { getMongoClient } = require('../../lib/auth/mongoClient.js')
const { mongoDB } = require('../../../config.js')
const { logger } = require('@vtfk/logger')
const { addGroupMembers, removeGroupMembers } = require('../../lib/graph/jobs/groups.js'); 
const { createStatistics } = require('./createStats.js');

/**
 * Handles user actions to activate or deactivate blocks.
 *
 * @param {string} action - The action to perform, either 'activate' or 'deactivate'.
 * @returns {Promise<{status: number, jsonBody: Object}>} - The result of the action, including status and details of blocks added or removed.
 *
 * @async
 * @function handleUserActions
 *
 * @example
 * const result = await handleUserActions('activate');
 * console.log(result);
 *
 * @throws {Error} - Throws an error if there is an issue connecting to the database or performing the action.
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

    let blockObj = {
        blocksAdded: [],
        blocksRemoved: []
    }

    if(action === 'activate') {
        // Find any blocks with the start date less than or equal to the current date
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
                // If there's more than one block to activate, delay the activation of the next block by 1 seconds
                if(blocks.length > 1) {
                    logger('info', [logPrefix, `Found more than 1 block to ${action}, delaying the activation of the next block by 1 second`])
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                // Add the students to the group
                logger('info', [logPrefix, `Adding ${block.students.length} students to group: ${block.typeBlock.groupId}`])
                await addGroupMembers(block.typeBlock.groupId, block.students)
                // Create stats
                await createStatistics(block, action)
            } catch (error) {
                logger('error', [logPrefix, `Error adding members to group: ${error}`])
            }
            // Update the status of the block to active/expired
            await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).updateOne({ _id: block._id }, {$set: { status: 'active' }})
            blockObj.blocksAdded.push(block)
        }
    } else {
         // Find any blocks with the start date less than or equal to the current date
         logger('info', [logPrefix, `Finding blocks with start date less than or equal to current date - ${dateLocalFormat}` ])
         const blocks = await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).find({status: blockStatus, endBlock: { $lte: dateLocalFormat }}).toArray()
         logger('info', [logPrefix, `Found ${blocks.length} blocks`])
 
         // If there are no blocks, return
         if(blocks.length < 1){
             return {status: 200, jsonBody: `No blocks to ${action}`}
         }
         // Loop through the blocks that are found
         for (const block of blocks) {
            try {
                // If there's more than one block to deactivate, delay the deactivation of the next block by 1 seconds
                if(blocks.length > 1) {
                    logger('info', [logPrefix, `Found more than 1 block to ${action}, delaying the deactivation of the next block by 1 second`])
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                logger('info', [logPrefix, `Removing ${block.students.length} students from group: ${block.typeBlock.groupId}`])
                await removeGroupMembers(block.typeBlock.groupId, block.students)
                // Create stats
                await createStatistics(block, action)
            } catch (error) {
                logger('error', [logPrefix, `Error removing members from group: ${error}`])
            }
            // Update the status of the block to active/expired
            await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).updateOne({ _id: block._id }, {$set: { status: 'expired' }})
            blockObj.blocksRemoved.push(block)
         }
    }
        return {status: 200, jsonBody: blockObj};
}

module.exports = {handleUserActions}