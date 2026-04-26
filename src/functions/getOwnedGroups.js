const { app } = require("@azure/functions");
const { getOwnedObjects } = require("../lib/graph/jobs/groups.js");

app.http("getOwnedGroups", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "getOwnedGroups/{upn}",
  handler: async (request, _context) => {
    const upn = request.params.upn;

    const ownedObjects = await getOwnedObjects(upn);

    return { status: 200, jsonBody: ownedObjects };
  }
});
