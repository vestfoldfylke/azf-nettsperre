import { logger } from "@vestfoldfylke/loglady";
import type { MongoClient } from "mongodb";
import type { LogEntryResponse } from "../../../types/results.js";
import type { ValidationLogEntry } from "../../../types/validation-log-entry.js";
import { mongoDB } from "../../config.js";
import { getMongoClient } from "../auth/mongoClient.js";

export const createLogEntry = async (logEntry: ValidationLogEntry): Promise<LogEntryResponse> => {
  const logPrefix: string = "createLogEntry";

  // Connect to the database
  const mongoClient: MongoClient = await getMongoClient();

  try {
    await mongoClient.db(mongoDB.dbName).collection<ValidationLogEntry>(mongoDB.impersonationCollection).insertOne(logEntry);
    return {
      status: 200,
      body: "Log entry created"
    };
  } catch (error) {
    logger.errorException(error, "{logPrefix}", logPrefix);
  }

  return {
    status: 500,
    body: "Internal Server Error"
  };
};
