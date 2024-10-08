const { app } = require('@azure/functions');
const { getMongoClient } = require('../lib/auth/mongoClient.js')
const { mongoDB } = require('../../config.js')
const { logger } = require('@vtfk/logger');
const { removeGroupMembers } = require('../lib/graph/jobs/groups.js'); 
const { ObjectId } = require('mongodb');


app.http('deleteBlock', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'deleteBlock/{id}/{action}',
    handler: async (request, context) => {
        const body = await request.json();
        const id = request.params.id
        const action = request.params.action
        const logPrefix = 'deleteBlock'

        // Connect to the database
        const mongoClient = await getMongoClient()

        try {
            if(action === 'delete'){
                logger('info', [logPrefix, `Deleting block with id: ${id}`])
                await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).updateOne({ _id: new ObjectId(id) }, {$set: { status: 'deleted' }})
                return { status: 200, jsonBody: body }
            } else {
                if(action === 'deactivate') {
                    // Deactivate the block
                    logger('info', [logPrefix, `Deactivating block with id: ${id}`])
                    try {
                        // Find the block with the provided id
                        const block = await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).findOne({ _id: new ObjectId(id) })
                        console.log(block)
                        if(!block){
                            logger('error', [logPrefix, 'Block not found'])
                            return { status: 404, body: 'Block not found' }
                        }

                        logger('info', [logPrefix, `Removing ${block.students.length} students from group: ${block.typeBlock.groupId}`])
                        await removeGroupMembers(block.typeBlock.groupId, block.students)
                        await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).updateOne({ _id: new ObjectId(id) }, {$set: { status: 'expired' }})
                        return { status: 200, jsonBody: body }
                    } catch (error) {
                        logger('error', [logPrefix, error])
                        return { status: 400, body: error.message }
                    }
                }
            }
        } catch (error) {
            logger('error', [logPrefix, error])
            return { status: 400, body: error.message }
        }
    }
});
