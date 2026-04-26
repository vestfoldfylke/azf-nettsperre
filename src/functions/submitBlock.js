const { app } = require("@azure/functions");
const { logger } = require("@vestfoldfylke/loglady");
const { getMongoClient } = require("../lib/auth/mongoClient.js");
const { mongoDB, blockGroup } = require("../../config.js");

app.http("submitBlock", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "submitBlock",
  handler: async (request, _context) => {
    const body = await request.json();

    const logPrefix = "submitBlock";
    let response = null;

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

    let returnBlock;
    try {
      logger.info("{logPrefix} - Inserting block into database", logPrefix);
      const mongoClient = await getMongoClient();
      response = await mongoClient.db(mongoDB.dbName).collection(mongoDB.blocksCollection).insertOne(body);

      returnBlock = {
        _id: response.insertedId,
        students: body.students,
        teacher: body.teacher,
        blockedGroup: body.blockedGroup,
        typeBlock: body.typeBlock,
        startBlock: body.startBlock,
        endBlock: body.endBlock
      };

      logger.info("{logPrefix} - Block inserted into database", logPrefix);
    } catch (error) {
      logger.errorException(error, "{logPrefix}", logPrefix);
      return { status: 500, body: error.message };
    }
    return { status: 201, jsonBody: returnBlock };
  }
});
