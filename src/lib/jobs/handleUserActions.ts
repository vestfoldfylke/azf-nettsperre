import { setTimeout as sleep } from "node:timers/promises";
import { logger } from "@vestfoldfylke/loglady";
import type { MongoClient, WithId } from "mongodb";
import type { Block, BlockStatus, UserAction } from "../../../types/block.js";
import type { BlockActionsResult, UserActionsResponse } from "../../../types/results.js";
import { mongoDB } from "../../config.js";
import { getMongoClient } from "../auth/mongoClient.js";
import { formatDate } from "../formatDate.js";
import { addGroupMembers, removeGroupMembers } from "../graph/jobs/groups.js";
import { createStatistics } from "./createStats.js";

const DELAY_BETWEEN_BLOCKS_MS = 1000;

/**
 * Handles user actions to activate or deactivate blocks.
 *
 * @param action - The action to perform, either 'activate' or 'deactivate'.
 * @returns The result of the action, including status and details of blocks added or removed.
 * @throws Throws an error if there is an issue connecting to the database or performing the action.
 */
export const handleUserActions = async (action: UserAction): Promise<UserActionsResponse> => {
  const logPrefix: string = "handleUserActions";

  logger.info("{logPrefix} - Action: {Action}", logPrefix, action);

  // Connect to the database
  const mongoClient: MongoClient = await getMongoClient();

  const dateLocalFormat: string = formatDate(new Date());

  const blockStatus: BlockStatus = action === "activate" ? "pending" : "active";

  const blockObj: BlockActionsResult = {
    blocksAdded: [],
    blocksRemoved: []
  };

  if (action === "activate") {
    // Find any blocks with the start date less than or equal to the current date
    logger.info("{logPrefix} - Finding blocks with start date less than or equal to current date - {Date}", logPrefix, dateLocalFormat);

    const blocks: WithId<Block>[] = await mongoClient
      .db(mongoDB.dbName)
      .collection<Block>(mongoDB.blocksCollection)
      .find({
        status: blockStatus,
        startBlock: { $lte: dateLocalFormat }
      })
      .toArray();
    logger.info("{logPrefix} - Found {BlockCount} blocks", logPrefix, blocks.length);

    // If there are no blocks, return
    if (blocks.length < 1) {
      return {
        status: 200,
        jsonBody: `No blocks to ${action}`
      };
    }

    // Loop through the blocks that are found
    for (const block of blocks) {
      try {
        // If there's more than one block to activate, delay the activation of the next block by 1 seconds
        if (blocks.length > 1) {
          logger.info("{logPrefix} - Found more than 1 block to {Action}, delaying the activation of the next block by 1 second", logPrefix, action);
          await sleep(DELAY_BETWEEN_BLOCKS_MS);
        }

        // Add the students to the group
        logger.info("{logPrefix} - Adding {StudentCount} students to group: {GroupId}", logPrefix, block.students.length, block.typeBlock.groupId);
        await addGroupMembers(block.typeBlock.groupId, block.students);

        // Create stats
        await createStatistics(block, action);
      } catch (error) {
        logger.errorException(error, "{logPrefix} - Error adding members to group", logPrefix);
      }

      // Update the status of the block to active/expired
      await mongoClient
        .db(mongoDB.dbName)
        .collection<Block>(mongoDB.blocksCollection)
        .updateOne({ _id: block._id }, { $set: { status: "active" } });

      blockObj.blocksAdded.push(block);
    }

    return {
      status: 200,
      jsonBody: blockObj
    };
  }

  // Find any blocks with the start date less than or equal to the current date
  logger.info("{logPrefix} - Finding blocks with start date less than or equal to current date - {Date}", logPrefix, dateLocalFormat);

  const blocks: WithId<Block>[] = await mongoClient
    .db(mongoDB.dbName)
    .collection<Block>(mongoDB.blocksCollection)
    .find({
      status: blockStatus,
      endBlock: { $lte: dateLocalFormat }
    })
    .toArray();

  logger.info("{logPrefix} - Found {BlockCount} blocks", logPrefix, blocks.length);

  // If there are no blocks, return
  if (blocks.length < 1) {
    return {
      status: 200,
      jsonBody: `No blocks to ${action}`
    };
  }

  // Loop through the blocks that are found
  for (const block of blocks) {
    try {
      // If there's more than one block to deactivate, delay the deactivation of the next block by 1 seconds
      if (blocks.length > 1) {
        logger.info("{logPrefix} - Found more than 1 block to {Action}, delaying the deactivation of the next block by 1 second", logPrefix, action);
        await sleep(DELAY_BETWEEN_BLOCKS_MS);
      }

      logger.info("{logPrefix} - Removing {StudentCount} students from group: {GroupId}", logPrefix, block.students.length, block.typeBlock.groupId);
      await removeGroupMembers(block.typeBlock.groupId, block.students);

      // Create stats
      await createStatistics(block, action);
    } catch (error) {
      logger.errorException(error, "{logPrefix} - Error removing members from group", logPrefix);
    }

    // Update the status of the block to active/expired
    await mongoClient
      .db(mongoDB.dbName)
      .collection<Block>(mongoDB.blocksCollection)
      .updateOne({ _id: block._id }, { $set: { status: "expired" } });

    blockObj.blocksRemoved.push(block);
  }

  return {
    status: 200,
    jsonBody: blockObj
  };
};
