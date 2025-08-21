const { app } = require('@azure/functions')

app.http('getGroupMembers', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'getGroupMembers/{groupId}/{onlyStudents?}',
  handler: async (request, context) => {
    const { getGroupMembers } = require('../lib/graph/jobs/groups.js')
    const groupId = request.params.groupId
    const onlyStudents = request.params.onlyStudents

    const groupMembers = await getGroupMembers(groupId, onlyStudents)

    return { status: 200, jsonBody: groupMembers }
  }
})
