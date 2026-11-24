import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { logger } from "@vestfoldfylke/loglady";
import type { Filter, MongoClient, WithId } from "mongodb";
import type { Block } from "../../types/block.js";
import { mongoDB } from "../config.js";
import { getMongoClient } from "../lib/auth/mongoClient.js";
import { getErrorMessage } from "../lib/getErrorMessage.js";

const historyHandler = async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
  const logPrefix: string = "history";
  const teacher: string | undefined = request.params.teacher;
  const course: string | undefined = request.params.course;
  const school: string | undefined = request.params.school;

  // Build filter object
  const filter: Filter<Block> = {};

  if (teacher !== "null") {
    filter["teacher.userPrincipalName"] = teacher;
  }

  if (course !== "null") {
    filter["blockedGroup.displayName"] = course;
  }

  if (school !== "null") {
    filter["teacher.officeLocation"] = school;
  }

  try {
    const mongoClient: MongoClient = await getMongoClient();

    logger.info("{logPrefix} - Filter applied, making the query", logPrefix);
    const response: WithId<Block>[] = await mongoClient
      .db(mongoDB.dbName)
      .collection<Block>(mongoDB.historyCollection)
      .find(filter, { sort: { _id: -1 } })
      .toArray();

    return { status: 200, jsonBody: response };
  } catch (error) {
    logger.errorException(error, "{logPrefix} - Error fetching history", logPrefix);
    return { status: 400, jsonBody: getErrorMessage(error) };
  }
};

app.http("history", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "history/{teacher?}/{course?}/{school?}",
  handler: historyHandler
});
