const { app } = require('@azure/functions');
const { logger } = require('@vtfk/logger')
const { handleUserActions } = require('../lib/jobs/handleUserActions.js')

app.timer('deactivateBlocks', {
    // Every 5min for testing
    schedule: '*/5 * * * *', 
    // schedule: '*/5 6-21 * * 1-5', // Every 5 minutes between 6am and 9pm, Monday to Friday
    handler: async (myTimer, context) => {
        const logPrefix = 'deactivateBlock-dev'
        try {
            const response = await handleUserActions('deactivate')
            return { status: 200, jsonBody: response }
        } catch (error) {
            logger('error', [logPrefix, error])
            return { status: 400, body: error.message }
            
        }
    }
});
