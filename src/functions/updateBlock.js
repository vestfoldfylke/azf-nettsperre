const { app } = require('@azure/functions');
const { getMongoClient } = require('../lib/auth/mongoClient.js')
const { mongoDB, blockGroup } = require('../../config.js')
const { logger } = require('@vtfk/logger')
const { ObjectId } = require('mongodb')
const { removeGroupMembers } = require('../lib/graph/jobs/groups.js')

app.http('updateBlock', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'updateBlock',
    handler: async (request, context) => {
        const body = await request.json();
        const logPrefix = 'submitBlock'
        let response = null
        let lastItem = null
        let removeGroupMembersResponse = null
        let isChanged = false

        try {
            if(await body.updated.length < 1){
                logger('error', [logPrefix, 'Invalid request, no updated array provided'])
                throw new Error('Invalid request, no updated array provided')
            }
            // Get the last item in the updated array
            lastItem = await body.updated[body.updated.length - 1]
            response = {
                ...lastItem,
                blockedGroup:{
                    displayName: await body.blockedGroup.displayName
                }
            }
        } catch (error) {
            logger('error', [logPrefix, error])
            return { status: 400, body: error.message }
        }

        try {
            // Connect to the database
            const mongoClient = await getMongoClient()
            const id = new ObjectId(body._id)

            // Look for changes in the last item of the updated array
            if(lastItem.studentsToRemove.length > 0){
                // Remove members from the array of students
                logger('info', [logPrefix, `Number of students to remove: ${lastItem.studentsToRemove.length}`])
                for (const studentsToRemove of lastItem.studentsToRemove) {
                    logger('info', [logPrefix, `Removing student ${studentsToRemove.id} from block`])
                    await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).updateOne({ _id: id }, {$pull: { 'students': {'id': studentsToRemove.id}}})
                }
                isChanged = true
            }
            if(lastItem.studentsToRemove.length > 0 && await body.status === 'active'){
                // Remove members from the group since the block is already active and remove from thje array of students
                logger('info', [logPrefix, `Number of students removed: ${lastItem.studentsToRemove.length}`])
                const groupId = await body.typeBlock.groupId
                removeGroupMembersResponse = await removeGroupMembers(groupId, lastItem.studentsToRemove)
                isChanged = true
            }
            // If the status is pending, add the members to the array of students
            if(lastItem.studentsToAdd.length > 0 && await body.status === 'pending'){
                logger('info', [logPrefix, `Number of students to add: ${lastItem.studentsToAdd.length}`])
                for (const studentsToAdd of lastItem.studentsToAdd) {
                    logger('info', [logPrefix, `Adding student ${studentsToAdd.id} to block`])
                    await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).updateOne({ _id: id }, {$push: { 'students': studentsToAdd }})
                }
                isChanged = true
            }
           
            if(lastItem.typeBlockChange?.newType !== undefined){
                // If the type of the block has changed, update the groupId
                if(lastItem.typeBlockChange.newType !== lastItem.typeBlockChange.oldType) {
                    // If the new type is different from the old type, update the type
                    logger('info', [logPrefix, 'Block type has changed, updating groupId and type'])
                    // Get the block types from the config file
                    let groupId = null
                    if(lastItem.typeBlockChange.newType === 'eksamen'){
                        logger('info', [logPrefix, 'New block type is eksamen'])
                        groupId = blockGroup.eksamenID
                    }
                    if(lastItem.typeBlockChange.newType === 'fullBlock'){
                        logger('info', [logPrefix, 'New block type is fullBlock'])
                        groupId = blockGroup.offlineID
                    }
                    await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).updateOne({ _id: id }, {$set: { 'typeBlock.type': lastItem.typeBlockChange.newType, 'typeBlock.groupId': groupId }})
                    logger('info', [logPrefix, 'Block type updated'])
                    isChanged = true
                }
            }

            if(lastItem.dateBlockChange?.start?.new !== undefined && await body.status === 'pending'){
                // If the date of the block has changed, update the startBlock time
                logger('info', [logPrefix, 'Block start date has changed, updating startBlock'])
                await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).updateOne({ _id: id }, {$set: { 'startBlock': lastItem.dateBlockChange.start.new }})
                isChanged = true
            }
            if(lastItem.dateBlockChange?.end.new !== undefined) {
                // If the date of the block has changed, update the endBlock time
                logger('info', [logPrefix, 'Block end date has changed, updating endBlock'])
                await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).updateOne({ _id: id }, {$set: { 'endBlock': lastItem.dateBlockChange.end.new }})
                isChanged = true
            }

            // If any changes have been made, push the last item of the updated array to the database
            if(isChanged){
                logger('info', [logPrefix, 'Pushing the last item of the updated array to the database'])
                await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).updateOne({ _id: id }, {$push: { 'updated': lastItem }})
            }

            return { status: 200, jsonBody: response };
        } catch (error) {
            logger('error', [logPrefix, error])
            return { status: 400, body: error.message           
            }
        }
    }
});
