import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { logger } from "@vestfoldfylke/loglady";
import type { UserActionsResponse } from "../../types/results.js";
import { getErrorMessage } from "../lib/getErrorMessage.js";
import { handleUserActions } from "../lib/jobs/handleUserActions.js";

const activateBlockDevHandler = async (_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
  const logPrefix: string = "activateBlock-dev";

  try {
    const response: UserActionsResponse = await handleUserActions("activate");
    return { status: 200, jsonBody: response };
  } catch (error) {
    logger.errorException(error, "{logPrefix}", logPrefix);
    return { status: 400, body: getErrorMessage(error) };
  }
};

app.http("activateBlock-dev", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "activateBlock-dev",
  handler: activateBlockDevHandler
});
