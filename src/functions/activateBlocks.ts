import { app, type InvocationContext, type Timer } from "@azure/functions";
import { logger } from "@vestfoldfylke/loglady";
import type { UserActionsResponse } from "../../types/results.js";
import { handleUserActions } from "../lib/jobs/handleUserActions.js";

const activateBlocksHandler = async (_myTimer: Timer, _context: InvocationContext): Promise<void> => {
  const logPrefix: string = "activateBlock";

  try {
    const response: UserActionsResponse = await handleUserActions("activate");
    logger.info("{logPrefix} - Finished with status {Status}", logPrefix, response.status);
  } catch (error) {
    logger.errorException(error, "{logPrefix}", logPrefix);
  }
};

app.timer("activateBlocks", {
  // At every 5th minute from 0 through 59.
  schedule: "0-59/5 * * * *",
  handler: activateBlocksHandler
});
