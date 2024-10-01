const { app } = require('@azure/functions');

app.http('getOwnedGroups', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'getOwnedGroups/{upn}',
    handler: async (request, context) => {
        const { getOwnedObjects } = require('../lib/graph/jobs/groups.js')
        const upn = request.params.upn

        const ownedObjects = await getOwnedObjects(upn)

        return { status: 200, jsonBody: ownedObjects };
    }
});
