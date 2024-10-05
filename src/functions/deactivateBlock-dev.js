const { app } = require('@azure/functions');
const { logger } = require('@vtfk/logger')
const { handleUserActions } = require('../lib/jobs/handleUserActions.js')

app.http('deactivateBlock-dev', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'deactivateBlock-dev',
    handler: async (request, context) => {
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
