const { app } = require('@azure/functions');
const { misc, mongoDB } = require('../../config.js')
const { logger } = require('@vtfk/logger')
const { handleUserActions } = require('../lib/jobs/handleUserActions.js')
const { moveDocuments } = require('../lib/jobs/moveDocuments.js')

app.timer('deactivateBlocks', {
    // At every 5th minute from 2 through 59.
    schedule: '2-59/5 * * * *', 
    // schedule: '*/5 6-21 * * 1-5', // Every 5 minutes between 6am and 9pm, Monday to Friday
    handler: async (myTimer, context) => {
        const logPrefix = 'deactivateBlock'
        console.log(misc.email_domain)
        try {
            const response = await handleUserActions('deactivate')
            // Move blocks when they are deactivated
            // Move blocks when they are deactivated
            await moveDocuments(mongoDB.blocksCollection, mongoDB.historyCollection, {status: 'expired'}, 10)
            // Move blocks when they are deleted
            await moveDocuments(mongoDB.blocksCollection, mongoDB.historyCollection, {status: 'deleted'}, 10)
            return { status: 200, jsonBody: response }
        } catch (error) {
            logger('error', [logPrefix, error])
            return { status: 400, body: error.message }
            
        }
    }
});
