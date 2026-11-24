import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { logger } from "@vestfoldfylke/loglady";
import type { Filter, MongoClient, WithId } from "mongodb";
import type { Block, BlockStatus } from "../../types/block.js";
import { mongoDB } from "../config.js";
import { getMongoClient } from "../lib/auth/mongoClient.js";
import { getErrorMessage } from "../lib/getErrorMessage.js";

const VALID_STATUSES: BlockStatus[] = ["pending", "active", "expired"];

const isValidStatus = (status: string): status is BlockStatus => VALID_STATUSES.includes(status as BlockStatus);

const getBlocksHandler = async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
  const status: string = request.params.status ?? "";
  const upn: string = request.params.upn ?? "";
  const school: string = request.params.school ?? "";

  const logPrefix: string = "getBlocks";
  const statusArray: string[] = status.split(",");

  logger.info("{logPrefix} - Validating status values: {@Status}", logPrefix, statusArray);

  // Check if the array contains valid status
  if (!statusArray.every(isValidStatus)) {
    logger.error("{logPrefix} - Invalid status provided", logPrefix);
    return { status: 400, body: "Invalid status provided" };
  }

  try {
    // Connect to the database
    const mongoClient: MongoClient = await getMongoClient();

    // Find all blocks with status in the statusArray and teacher upn
    logger.info("{logPrefix} - Fetching blocks with status: {@Status}", logPrefix, statusArray);

    // Filter object used to query blocks based on status, teacher's user principal name and the school of the teacher.
    const filter: Filter<Block> = {
      status: {
        $in: statusArray
      },
      "teacher.userPrincipalName": upn !== "null" ? upn : { $exists: true },
      "teacher.officeLocation": school !== "null" ? school : { $exists: true }
    };

    // Fetch the blocks
    const response: WithId<Block>[] = await mongoClient.db(mongoDB.dbName).collection<Block>(mongoDB.blocksCollection).find(filter).toArray();
    logger.info("{logPrefix} - Blocks fetched, found: {BlockCount}", logPrefix, response.length);

    // Return the response
    return { status: 200, jsonBody: response };
  } catch (error) {
    logger.errorException(error, "{logPrefix}", logPrefix);
    // Return the error
    return { status: 400, body: getErrorMessage(error) };
  }
};

app.http("getBlocks", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "getBlocks/{status}/{upn}/{school}",
  handler: getBlocksHandler
});
