const { app } = require('@azure/functions')
const { misc } = require('../../config.js')
const { logger } = require('@vtfk/logger')
const { handleUserActions } = require('../lib/jobs/handleUserActions.js')

app.http('activateBlock-dev', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'activateBlock-dev',
  handler: async (request, context) => {
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
})
