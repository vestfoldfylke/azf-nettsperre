import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { logger } from "@vestfoldfylke/loglady";
import type { UserActionsResponse } from "../../types/results.js";
import { mongoDB } from "../config.js";
import { getErrorMessage } from "../lib/getErrorMessage.js";
import { handleUserActions } from "../lib/jobs/handleUserActions.js";
import { moveDocuments } from "../lib/jobs/moveDocuments.js";

const MAX_DOCUMENTS_TO_MOVE = 10;

const deactivateBlockDevHandler = async (_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
  const logPrefix: string = "deactivateBlock-dev";

  try {
    const response: UserActionsResponse = await handleUserActions("deactivate");

    // Move blocks when they are deactivated
    await moveDocuments(mongoDB.blocksCollection, mongoDB.historyCollection, { status: "expired" }, MAX_DOCUMENTS_TO_MOVE);

    // Move blocks when they are deleted
    await moveDocuments(mongoDB.blocksCollection, mongoDB.historyCollection, { status: "deleted" }, MAX_DOCUMENTS_TO_MOVE);

    return {
      status: 200,
      jsonBody: response
    };
  } catch (error) {
    logger.errorException(error, "{logPrefix}", logPrefix);
    return {
      status: 400,
      body: getErrorMessage(error)
    };
  }
};

app.http("deactivateBlock-dev", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "deactivateBlock-dev",
  handler: deactivateBlockDevHandler
});
