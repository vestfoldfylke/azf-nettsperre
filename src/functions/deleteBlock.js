const { app } = require("@azure/functions");
const { logger } = require("@vestfoldfylke/loglady");
const { getMongoClient } = require("../lib/auth/mongoClient.js");
const { mongoDB } = require("../../config.js");
const { removeGroupMembers } = require("../lib/graph/jobs/groups.js");
const { ObjectId } = require("mongodb");
const { createStatistics } = require("../lib/jobs/createStats.js");

app.http("deleteBlock", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "deleteBlock/{id}/{action}",
  handler: async (request, _context) => {
    const body = await request.json();
    const id = request.params.id;
    let action = request.params.action; // Must be able to change the action to deactivate if the block is active
    const logPrefix = "deleteBlock";

    // Connect to the database
    const mongoClient = await getMongoClient();

    try {
      // Find the block with the provided id
      const block = await mongoClient
        .db(mongoDB.dbName)
        .collection(mongoDB.blocksCollection)
        .findOne({ _id: new ObjectId(id) });
      if (!block) {
        logger.error("{logPrefix} - Block not found", logPrefix);
        return { status: 404, body: "Block not found" };
      }

      if (block.status === "active" && action === "delete") {
        logger.warn("{logPrefix} - Cannot delete an active block, change the action to deactivate", logPrefix);
        action = "deactivate";
      }

      if (action === "delete") {
        logger.info("{logPrefix} - Deleting block with id: {Id}", logPrefix, id);
        await mongoClient
          .db(mongoDB.dbName)
          .collection(mongoDB.blocksCollection)
          .updateOne({ _id: new ObjectId(id) }, { $set: { status: "deleted" } });
        // Create stats
        await createStatistics(block, action);
        return { status: 200, jsonBody: body };
      }

      if (action === "deactivate") {
        // Deactivate the block
        logger.info("{logPrefix} - Deactivating block with id: {Id}", logPrefix, id);
        try {
          logger.info("{logPrefix} - Removing {StudentCount} students from group: {GroupId}", logPrefix, block.students.length, block.typeBlock.groupId);
          await removeGroupMembers(block.typeBlock.groupId, block.students);
          await mongoClient
            .db(mongoDB.dbName)
            .collection(mongoDB.blocksCollection)
            .updateOne({ _id: new ObjectId(id) }, { $set: { status: "expired" } });
          // Create stats
          await createStatistics(block, action);

          return { status: 200, jsonBody: body };
        } catch (error) {
          logger.errorException(error, "{logPrefix} - Failed to deactivate block with id: {Id}", logPrefix, id);
          return { status: 400, body: error.message };
        }
      }
    } catch (error) {
      logger.errorException(error, "{logPrefix} - Failed to find block or delete block with id: {Id}", logPrefix, id);
      return { status: 400, body: error.message };
    }
  }
});
