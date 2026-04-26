const { app } = require("@azure/functions");
const { logger } = require("@vestfoldfylke/loglady");
const { handleUserActions } = require("../lib/jobs/handleUserActions.js");

app.timer("activateBlocks", {
  // At every 5th minute from 0 through 59.
  schedule: "0-59/5 * * * *",
  // schedule: '*/5 6-21 * * 1-5', // Every 5 minutes between 6am and 9pm, Monday to Friday
  handler: async (_myTimer, _context) => {
    const logPrefix = "activateBlock";

    try {
      const response = await handleUserActions("activate");
      return { status: 200, jsonBody: response };
    } catch (error) {
      logger.errorException(error, "{logPrefix}", logPrefix);
      return { status: 400, body: error.message };
    }
  }
});
