const { app } = require("@azure/functions");
const { logger } = require("@vestfoldfylke/loglady");
const { getMongoClient } = require("../lib/auth/mongoClient.js");
const { mongoDB } = require("../../config.js");

app.http("history", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "history/{teacher?}/{course?}/{school?}",
  handler: async (request, _context) => {
    const logPrefix = "history";
    const teacher = request.params.teacher;
    const course = request.params.course;
    const school = request.params.school;

    // Build filter object
    const filter = {};

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
      const mongoClient = await getMongoClient();

      logger.info("{logPrefix} - Filter applied, making the query", logPrefix);
      const response = await mongoClient
        .db(mongoDB.dbName)
        .collection(mongoDB.historyCollection)
        .find(filter, { sort: { _id: -1 } })
        .toArray();

      return { status: 200, jsonBody: response };
    } catch (error) {
      logger.errorException(error, "{logPrefix} - Error fetching history", logPrefix);
      return { status: 400, jsonBody: error.message };
    }
  }
});
