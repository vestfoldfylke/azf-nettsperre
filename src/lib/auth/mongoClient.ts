import { logger } from "@vestfoldfylke/loglady";
import { MongoClient } from "mongodb";
import { mongoDB } from "../../config.js";

let client: MongoClient | null = null;

export const getMongoClient = async (): Promise<MongoClient> => {
  if (client) {
    return client;
  }

  logger.info("mongo-client - Client does not exist - creating");
  client = new MongoClient(mongoDB.connectionString);
  logger.info("mongo-client - Client connected");

  return client;
};

export const closeMongoClient = async (): Promise<void> => {
  if (client) {
    await client.close();
  }

  client = null;
};
