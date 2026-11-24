import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import type { GraphOwnedObject } from "../../types/graph.js";
import { getOwnedObjects } from "../lib/graph/jobs/groups.js";

app.http("getOwnedGroups", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "getOwnedGroups/{upn}",
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const upn: string = request.params.upn ?? "";

    const ownedObjects: GraphOwnedObject[] = await getOwnedObjects(upn);

    return { status: 200, jsonBody: ownedObjects };
  }
});
