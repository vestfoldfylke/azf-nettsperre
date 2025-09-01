const { app } = require('@azure/functions')
const { getMongoClient } = require('../lib/auth/mongoClient.js')
const { mongoDB } = require('../../config.js')
const { logger } = require('@vtfk/logger')

app.http('getBlocks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getBlocks/{status}/{upn}/{school}',
  handler: async (request, context) => {
    const status = request.params.status
    const upn = request.params.upn
    const school = request.params.school

    const logPrefix = 'getBlocks'
    const statusArray = []
    const validStatus = ['pending', 'active', 'expired']
    try {
      // Check if status is a comma separated string
      if (status.includes(',')) {
        logger('info', [logPrefix, 'Status is a comma separated string'])
        // Split the string into an array
        const stringToArray = status.split(',')
        // Check if the array contains valid status
        stringToArray.forEach(status => {
          if (!validStatus.includes(status)) {
            logger('error', [logPrefix, 'Invalid status provided'])
            throw new Error('Invalid status provided')
          }
        })
        // Loop through the array and push each value to the statusArray
        stringToArray.forEach(status => {
          statusArray.push(status)
        })
      } else {
        logger('info', [logPrefix, 'Status is not a comma separated string'])
        // If status is not a comma separated string, push the value to the statusArray
        // Check if the status is valid
        if (!validStatus.includes(status)) {
          logger('error', [logPrefix, 'Invalid status provided'])
          return { status: 400, body: 'Invalid status provided' }
        }
        statusArray.push(status)
      }
    } catch (error) {
      logger('error', [logPrefix, error])
      return { status: 400, body: error.message }
    }

    try {
      // Connect to the database
      const mongoClient = await getMongoClient()
      // Find all blocks with status in the statusArray and teacher upn
      logger('info', [logPrefix, `Fetching blocks with status: ${statusArray}`])
      /**
             * Filter object used to query blocks based on status and teacher's user principal name.
             *
             * @typedef {Object} Filter
             * @property {Object} status - The status filter object.
             * @property {Array} status.$in - Array of statuses to include in the filter.
             * @property {string} teacher.userPrincipalName - The user principal name of the teacher.
             * @property {string} teacher.officeLocation - The school of the teacher.
             */
      const filter = {
        status: {
          $in: statusArray
        },
        'teacher.userPrincipalName': upn !== 'null' ? upn : { $exists: true },
        'teacher.officeLocation': school !== 'null' ? school : { $exists: true }
      }
      // Fetch the blocks
      const response = await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).find(filter).toArray()
      logger('info', [logPrefix, `Blocks fetched, found: ${response.length}`])
      // Return the response
      return { status: 200, jsonBody: response }
    } catch (error) {
      logger('error', [logPrefix, error])
      // Return the error
      return { status: 400, body: error.message }
    }
  }
})
