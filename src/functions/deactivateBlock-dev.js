const { app } = require("@azure/functions");
const { logger } = require("@vestfoldfylke/loglady");
const { mongoDB } = require("../../config.js");
const { handleUserActions } = require("../lib/jobs/handleUserActions.js");
const { moveDocuments } = require("../lib/jobs/moveDocuments.js");

app.http("deactivateBlock-dev", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "deactivateBlock-dev",
  handler: async (_request, _context) => {
    const logPrefix = "deactivateBlock-dev";

    try {
      const response = await handleUserActions("deactivate");

      // Move blocks when they are deactivated
      await moveDocuments(mongoDB.blocksCollection, mongoDB.historyCollection, { status: "expired" }, 10);

      // Move blocks when they are deleted
      await moveDocuments(mongoDB.blocksCollection, mongoDB.historyCollection, { status: "deleted" }, 10);

      return { status: 200, jsonBody: response };
    } catch (error) {
      logger.errorException(error, "{logPrefix}", logPrefix);
      return { status: 400, body: error.message };
    }
  }
});
