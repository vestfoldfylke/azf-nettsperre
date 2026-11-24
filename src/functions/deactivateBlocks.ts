import { app, type InvocationContext, type Timer } from "@azure/functions";
import { logger } from "@vestfoldfylke/loglady";
import type { UserActionsResponse } from "../../types/results.js";
import { mongoDB } from "../config.js";
import { handleUserActions } from "../lib/jobs/handleUserActions.js";
import { moveDocuments } from "../lib/jobs/moveDocuments.js";

const MAX_DOCUMENTS_TO_MOVE = 10;

const deactivateBlocksHandler = async (_myTimer: Timer, _context: InvocationContext): Promise<void> => {
  const logPrefix: string = "deactivateBlock";

  try {
    const response: UserActionsResponse = await handleUserActions("deactivate");

    // Move blocks when they are deactivated
    await moveDocuments(mongoDB.blocksCollection, mongoDB.historyCollection, { status: "expired" }, MAX_DOCUMENTS_TO_MOVE);

    // Move blocks when they are deleted
    await moveDocuments(mongoDB.blocksCollection, mongoDB.historyCollection, { status: "deleted" }, MAX_DOCUMENTS_TO_MOVE);

    logger.info("{logPrefix} - Finished with status {Status}", logPrefix, response.status);
  } catch (error) {
    logger.errorException(error, "{logPrefix}", logPrefix);
  }
};

app.timer("deactivateBlocks", {
  // At every 5th minute from 2 through 59.
  schedule: "2-59/5 * * * *",
  handler: deactivateBlocksHandler
});
