import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { logger } from "@vestfoldfylke/loglady";
import { type MongoClient, ObjectId } from "mongodb";
import type { Block, BlockUpdate } from "../../types/block.js";
import type { UpdateBlockBody } from "../../types/requests.js";
import { blockGroup, mongoDB } from "../config.js";
import { getMongoClient } from "../lib/auth/mongoClient.js";
import { getErrorMessage } from "../lib/getErrorMessage.js";
import { removeGroupMembers } from "../lib/graph/jobs/groups.js";

type UpdateBlockResponse = BlockUpdate & {
  blockedGroup: {
    displayName: string;
  };
};

app.http("updateBlock", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "updateBlock",
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const body: UpdateBlockBody = (await request.json()) as UpdateBlockBody;

    const logPrefix: string = "updateBlock";
    let isChanged: boolean = false;

    // Get the last item in the updated array
    const lastItem: BlockUpdate | undefined = body.updated.at(-1);
    if (!lastItem) {
      logger.error("{logPrefix} - Invalid request, no updated array provided", logPrefix);
      return { status: 400, body: "Invalid request, no updated array provided" };
    }

    const response: UpdateBlockResponse = {
      ...lastItem,
      blockedGroup: {
        displayName: body.blockedGroup.displayName
      }
    };

    try {
      // Connect to the database
      const mongoClient: MongoClient = await getMongoClient();
      const id: ObjectId = new ObjectId(body._id);

      // Look for changes in the last item of the updated array
      if (lastItem.studentsToRemove.length > 0) {
        // Remove members from the array of students
        logger.info("{logPrefix} - Number of students to remove: {StudentsToRemoveCount}", logPrefix, lastItem.studentsToRemove.length);

        for (const studentsToRemove of lastItem.studentsToRemove) {
          logger.info("{logPrefix} - Removing student {StudentId} from block", logPrefix, studentsToRemove.id);
          await removeGroupMembers(body.typeBlock.groupId, [{ id: studentsToRemove.id }]);
          await mongoClient
            .db(mongoDB.dbName)
            .collection<Block>(mongoDB.blocksCollection)
            .updateOne({ _id: id }, { $pull: { students: { id: studentsToRemove.id } } });
        }

        isChanged = true;
      }

      // If the status is pending, add the members to the array of students
      if (lastItem.studentsToAdd.length > 0 && body.status === "pending") {
        logger.info("{logPrefix} - Number of students to add: {StudentsToAddCount}", logPrefix, lastItem.studentsToAdd.length);

        for (const studentsToAdd of lastItem.studentsToAdd) {
          logger.info("{logPrefix} - Adding student {StudentId} to block", logPrefix, studentsToAdd.id);
          await mongoClient
            .db(mongoDB.dbName)
            .collection<Block>(mongoDB.blocksCollection)
            .updateOne({ _id: id }, { $push: { students: studentsToAdd } });
        }

        isChanged = true;
      }

      // If the type of the block has changed, update the groupId and type
      const newType: string | undefined = lastItem.typeBlockChange?.newType;
      if (newType !== undefined && newType !== lastItem.typeBlockChange?.oldType) {
        logger.info("{logPrefix} - Block type has changed, updating groupId and type", logPrefix);
        logger.info("{logPrefix} - New block type is {BlockType}", logPrefix, newType);

        // Get the block types from the config file
        let groupId: string | null = null;
        if (newType === "eksamen") {
          groupId = blockGroup.eksamenID;
        }

        if (newType === "fullBlock") {
          groupId = blockGroup.offlineID;
        }

        if (newType === "formsFile") {
          groupId = blockGroup.formsFile;
        }

        if (newType === "forms") {
          groupId = blockGroup.forms;
        }

        await mongoClient
          .db(mongoDB.dbName)
          .collection<Block>(mongoDB.blocksCollection)
          .updateOne({ _id: id }, { $set: { "typeBlock.type": newType, "typeBlock.groupId": groupId } });
        logger.info("{logPrefix} - Block type updated", logPrefix);

        isChanged = true;
      }

      const newStartBlock: string | undefined = lastItem.dateBlockChange?.start?.new;
      if (newStartBlock !== undefined && body.status === "pending") {
        // If the date of the block has changed, update the startBlock time
        logger.info("{logPrefix} - Block start date has changed, updating startBlock", logPrefix);

        await mongoClient
          .db(mongoDB.dbName)
          .collection<Block>(mongoDB.blocksCollection)
          .updateOne({ _id: id }, { $set: { startBlock: newStartBlock } });

        isChanged = true;
      }

      const newEndBlock: string | undefined = lastItem.dateBlockChange?.end.new;
      if (newEndBlock !== undefined) {
        // If the date of the block has changed, update the endBlock time
        logger.info("{logPrefix} - Block end date has changed, updating endBlock", logPrefix);

        await mongoClient
          .db(mongoDB.dbName)
          .collection<Block>(mongoDB.blocksCollection)
          .updateOne({ _id: id }, { $set: { endBlock: newEndBlock } });

        isChanged = true;
      }

      // If any changes have been made, push the last item of the updated array to the database
      if (isChanged) {
        logger.info("{logPrefix} - Pushing the last item of the updated array to the database", logPrefix);

        await mongoClient
          .db(mongoDB.dbName)
          .collection<Block>(mongoDB.blocksCollection)
          .updateOne({ _id: id }, { $push: { updated: lastItem } });
      }

      return { status: 200, jsonBody: response };
    } catch (error) {
      logger.errorException(error, "{logPrefix}", logPrefix);
      return { status: 400, body: getErrorMessage(error) };
    }
  }
});
