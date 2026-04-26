const { app } = require("@azure/functions");
const { logger } = require("@vestfoldfylke/loglady");
const { getUser } = require("../lib/graph/jobs/users.js");

app.http("extendedUserInfo", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "extendedUserInfo/{upn}",
  handler: async (request, _context) => {
    const upn = request.params.upn;

    try {
      const userInfo = await getUser(upn);
      return { status: 200, jsonBody: userInfo };
    } catch (error) {
      logger.errorException(error, "extendedUserInfo");
      return { status: 400, jsonBody: error.message };
    }
  }
});
