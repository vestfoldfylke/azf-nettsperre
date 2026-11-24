import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { logger } from "@vestfoldfylke/loglady";
import type { GraphUser } from "../../types/graph.js";
import { getErrorMessage } from "../lib/getErrorMessage.js";
import { getUser } from "../lib/graph/jobs/users.js";

app.http("extendedUserInfo", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "extendedUserInfo/{upn}",
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const upn: string = request.params.upn ?? "";

    try {
      const userInfo: GraphUser = await getUser(upn);
      return { status: 200, jsonBody: userInfo };
    } catch (error) {
      logger.errorException(error, "extendedUserInfo");
      return { status: 400, jsonBody: getErrorMessage(error) };
    }
  }
});
