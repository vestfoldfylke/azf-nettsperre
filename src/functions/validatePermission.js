const { app } = require('@azure/functions');
const { misc } = require('../../config.js');
const { logger } = require('@vtfk/logger')
const { getUser } = require('../lib/graph/jobs/users.js')

app.http('validatePermission', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'validatePermission',
    handler: async (request, context) => {
        const logPrefix = 'validatePermission';
        const body = await request.json();

        // Skip if requestor is in the allowed list
        let skipValidation = false;
        // Get requestor and teacher to be edited info
        const requestorInfo = await getUser(body.requestorUPN);
        const teacherToBeEditedInfo = await getUser(body.teacherToBeEditedUPN);

        // Check if requestor is in the allowed comma separated string
        if(misc.allowedCompanies.includes(requestorInfo.companyName)) {
            logger('info', [logPrefix, 'Requestor is a part of the allowed companies, skipping validation']);
            skipValidation = true;
        }
        // If requestor is not in the allowed list, perform validation
        if(!skipValidation) {
            logger('info', [logPrefix, 'Requestor is not a part of the allowed companies, performing validation']);
            // Check if requestor and teacher to be edited are in the same office location
            if(requestorInfo.officeLocation !== teacherToBeEditedInfo.officeLocation) {
                logger('error', [logPrefix, 'Requestor and teacher to be edited are not in the same location']);
                return { status: 403, body: 'Forbidden' };
            }
        }
        // Return requestor and teacher to be edited info
        return { status: 200, jsonBody: {requestor: requestorInfo, teacher: teacherToBeEditedInfo} };
    }
});
