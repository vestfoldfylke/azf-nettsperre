const { app } = require('@azure/functions');
const { getMongoClient } = require('../lib/auth/mongoClient.js')
const { mongoDB, blockGroup } = require('../../config.js')
const { logger } = require('@vtfk/logger')
const { addGroupMembers } = require('../lib/graph/jobs/groups.js') 


app.http('activateBlock-dev', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'activateBlock-dev',
    handler: async (request, context) => {

        // Connect to the database
        const mongoClient = await getMongoClient()
        const d = new Date();
        // We need to format the date to match the format in the database
        const dateFormat = [d.getFullYear(), d.getDate(), d.getMonth() + 1].join('-')+'T' + [d.getHours(), d.getMinutes()].join(':')
        // Add leading zeros to the date if it is less than 10
        const date = dateFormat.replace(/(\D)(\d)(?=\D|$)/g, '$10$2')

        // Find any blocks with the start date less than or equal to the current date(UTC)
        // const blocks = await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).find({ startBlock: { $lte: new Date() } }).toArray()


        // const test = await addGroupMembers('7706000b-b3f5-4965-a35f-a7bce947959c', members)
        return {status: 200, jsonBody: date};
    }
});
