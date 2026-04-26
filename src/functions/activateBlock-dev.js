const { app } = require("@azure/functions");
const { logger } = require("@vestfoldfylke/loglady");
const { handleUserActions } = require("../lib/jobs/handleUserActions.js");

app.http("activateBlock-dev", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "activateBlock-dev",
  handler: async (_request, _context) => {
    const logPrefix = "activateBlock-dev";

    try {
      const response = await handleUserActions("activate");
      return { status: 200, jsonBody: response };
    } catch (error) {
      logger.errorException(error, "{logPrefix}", logPrefix);
      return { status: 400, body: error.message };
    }
  }
});
