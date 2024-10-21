const { app } = require('@azure/functions');
const { misc } = require('../../config.js')
const { logger } = require('@vtfk/logger')
const { handleUserActions } = require('../lib/jobs/handleUserActions.js')

app.http('deactivateBlock-dev', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'deactivateBlock-dev',
    handler: async (request, context) => {
        const logPrefix = 'deactivateBlock-dev'
        console.log(misc.email_domain)
        try {
            const response = await handleUserActions('deactivate')
            return { status: 200, jsonBody: response }
        } catch (error) {
            logger('error', [logPrefix, error])
            return { status: 400, body: error.message }
            
        }
    }
});
