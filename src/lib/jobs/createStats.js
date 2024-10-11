const { statistics } = require('../../../config.js')
const { logger } = require('@vtfk/logger')
const { getUser } = require('../graph/jobs/users.js')
const axios = require('axios')

const createStatistics = async (block, action) => {
    const logPrefix = 'createStatistics'
    logger('info', [logPrefix, `Creating statistics for block: ${block._id}`])
    // Get info about the teacher who owns the team
    const teamOwner = await getUser(block.teacher.userPrincipalName)
    // Get info about the person who created the block
    const createdBy = await getUser(block.createdBy.userPrincipalName)
    // Build the request
    const request = {
        method: 'post',
        url: statistics.url + '/stats',
        headers: {
        'x-functions-key': statistics.key,
        },
        data: {
            system: 'Nettsperre',
            engine: 'azf-nettsperre',
            company: teamOwner.companyName,
            department: teamOwner.officeLocation,
            description: 'Viser antall elever i blokken og hvor mange ganger blokken er oppdatert. Hvilke skole blokken tilhører. Hvilken type blokk det er og hvor blokken ble opprettet fra.',
            externalId: block._id,
            type: action,
            // Optional fields
            blockType: block.typeBlock.type,
            createdByCompany: createdBy.companyName,
            createdByDepartment: createdBy.officeLocation,
            numberOfStudents: block.students.length,
            timesBlockWasUpdated: block.updated.length,
        }
    }

    // Make the request
    const response = await axios.request(request)
    // Handle and return the response
    if (!response || !response.data) return undefined
    if (Array.isArray(response.data)) {
        if (response.data.length === 0) return undefined
        if (response.data.length > 1) {
            logger('error', [logPrefix, 'Was not able to create statistics'])
            throw new Error('Was not able to create statistics')
        }
        response.data = response.data[0]
    }
    logger('info', [logPrefix, `Statistics created for block: ${block._id}`])
    return response.data
    }

    module.exports = { createStatistics }