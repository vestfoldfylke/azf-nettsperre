const { app } = require('@azure/functions');
const { misc } = require('../../config.js')
const { logger } = require('@vtfk/logger')
const { handleUserActions } = require('../lib/jobs/handleUserActions.js')

app.timer('activateBlocks', {
    // Every 5min for testing
    schedule: '*/5 * * * *', 
    // schedule: '*/5 6-21 * * 1-5', // Every 5 minutes between 6am and 9pm, Monday to Friday
    handler: async (myTimer, context) => {
        const logPrefix = 'activateBlock-dev'
        console.log(misc.email_domain)
        try {
            const response = await handleUserActions('activate')
            return { status: 200, jsonBody: response }
        } catch (error) {
            logger('error', [logPrefix, error])
            return { status: 400, body: error.message }
            
        }
    }
});
