import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import type { GraphGroupMember } from "../../types/graph.js";
import { getGroupMembers } from "../lib/graph/jobs/groups.js";

app.http("getGroupMembers", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "getGroupMembers/{groupId}/{onlyStudents?}",
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const groupId: string = request.params.groupId ?? "";
    const onlyStudents: string | undefined = request.params.onlyStudents;

    const groupMembers: GraphGroupMember[] = await getGroupMembers(groupId, onlyStudents);

    return { status: 200, jsonBody: groupMembers };
  }
});
