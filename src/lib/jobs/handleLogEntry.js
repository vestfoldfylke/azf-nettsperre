const { logger } = require("@vestfoldfylke/loglady");
const { getMongoClient } = require("../../lib/auth/mongoClient.js");
const { mongoDB } = require("../../../config.js");

const createLogEntry = async (logEntry) => {
  const logPrefix = "createLogEntry";

  // Connect to the database
  const mongoClient = await getMongoClient();

  try {
    await mongoClient.db(mongoDB.dbName).collection(mongoDB.impersonationCollection).insertOne(logEntry);
    return { status: 200, body: "Log entry created" };
  } catch (error) {
    logger.errorException(error, "{logPrefix}", logPrefix);
  }

  return { status: 500, body: "Internal Server Error" };
};

/* const updateLogEntry = async (logEntry) => {
  // Connect to the database
  const mongoClient = await getMongoClient()
} */

module.exports = {
  createLogEntry
  // updateLogEntry
};
