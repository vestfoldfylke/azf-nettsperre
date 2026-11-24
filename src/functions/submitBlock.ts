import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { logger } from "@vestfoldfylke/loglady";
import type { InsertOneResult, MongoClient, WithId } from "mongodb";
import type { Block } from "../../types/block.js";
import type { SubmitBlockBody } from "../../types/requests.js";
import { blockGroup, mongoDB } from "../config.js";
import { getMongoClient } from "../lib/auth/mongoClient.js";
import { getErrorMessage } from "../lib/getErrorMessage.js";

type SubmittedBlock = Pick<WithId<Block>, "_id" | "students" | "teacher" | "blockedGroup" | "typeBlock" | "startBlock" | "endBlock">;

const submitBlockHandler = async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
  const body: SubmitBlockBody | null = (await request.json()) as SubmitBlockBody | null;

  const logPrefix: string = "submitBlock";

  // Validate the request body
  if (!body) {
    logger.error("{logPrefix} - Invalid request, no body provided", logPrefix);
    return { status: 400, body: "Invalid request, no body provided" };
  }

  if (body.students.length < 0) {
    logger.error("{logPrefix} - Invalid request, no students provided", logPrefix);
    return { status: 400, body: "Invalid request, no students provided" };
  }

  if (!body.teacher.teacherId) {
    logger.error("{logPrefix} - Invalid request, no teacherId provided", logPrefix);
    return { status: 400, body: "Invalid request, no teacherId provided" };
  }

  if (!body.blockedGroup.id) {
    logger.error("{logPrefix} - Invalid request, no blockedGroupId provided", logPrefix);
    return { status: 400, body: "Invalid request, no blockedGroupId provided" };
  }

  if (!body.typeBlock.type) {
    logger.error("{logPrefix} - Invalid request, no type provided", logPrefix);
    return { status: 400, body: "Invalid request, no type provided" };
  }

  if (!body.startBlock) {
    logger.error("{logPrefix} - Invalid request, no startBlock provided", logPrefix);
    return { status: 400, body: "Invalid request, no startBlock provided" };
  }

  if (!body.endBlock) {
    logger.error("{logPrefix} - Invalid request, no endBlock provided", logPrefix);
    return { status: 400, body: "Invalid request, no endBlock provided" };
  }

  // Modify the request body
  if (body.typeBlock.type === "eksamen") {
    body.typeBlock.groupId = blockGroup.eksamenID;
  }

  if (body.typeBlock.type === "fullBlock") {
    body.typeBlock.groupId = blockGroup.offlineID;
  }

  if (body.typeBlock.type === "formsFile") {
    body.typeBlock.groupId = blockGroup.formsFile;
  }

  if (body.typeBlock.type === "forms") {
    body.typeBlock.groupId = blockGroup.forms;
  }

  try {
    logger.info("{logPrefix} - Inserting block into database", logPrefix);
    const mongoClient: MongoClient = await getMongoClient();
    const response: InsertOneResult<Block> = await mongoClient.db(mongoDB.dbName).collection<Block>(mongoDB.blocksCollection).insertOne(body);

    const returnBlock: SubmittedBlock = {
      _id: response.insertedId,
      students: body.students,
      teacher: body.teacher,
      blockedGroup: body.blockedGroup,
      typeBlock: body.typeBlock,
      startBlock: body.startBlock,
      endBlock: body.endBlock
    };

    logger.info("{logPrefix} - Block inserted into database", logPrefix);

    return { status: 201, jsonBody: returnBlock };
  } catch (error) {
    logger.errorException(error, "{logPrefix}", logPrefix);
    return { status: 500, body: getErrorMessage(error) };
  }
};

app.http("submitBlock", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "submitBlock",
  handler: submitBlockHandler
});
