import { logger } from "@vestfoldfylke/loglady";
import type { Db, Filter, MongoClient, WithId } from "mongodb";
import type { Block, BlockStudent } from "../../../types/block.js";
import { mongoDB } from "../../config.js";
import { getMongoClient } from "../auth/mongoClient.js";
import { removeGroupMembers } from "../graph/jobs/groups.js";

const BATCH_SIZE = 5;

const logPrefix: string = "moveDocuments";

const connectToDB = async (): Promise<Db> => {
  const mongoClient: MongoClient = await getMongoClient();
  return mongoClient.db(mongoDB.dbName);
};

/**
 * Inserts a batch of documents into a specified collection in the database.
 *
 * @param collection - The name of the collection to insert documents into.
 * @param documents - An array of documents to be inserted.
 */
const insertBatch = async (collection: string, documents: WithId<Block>[]): Promise<void> => {
  const db: Db = await connectToDB();
  try {
    await db.collection<Block>(collection).insertMany(documents);
  } catch (error) {
    logger.errorException(error, "{logPrefix} - Error inserting batch", logPrefix);
  }
};

/**
 * Deletes a batch of documents from a specified collection in the database.
 *
 * @param collection - The name of the collection from which documents will be deleted.
 * @param documents - An array of documents to be deleted, each containing an `_id` property.
 */
const deleteBatch = async (collection: string, documents: WithId<Block>[]): Promise<void> => {
  const db: Db = await connectToDB();
  for (const document of documents) {
    try {
      await db.collection<Block>(collection).deleteOne({ _id: document._id });
    } catch (error) {
      logger.errorException(error, "{logPrefix} - Error deleting document", logPrefix);
    }
  }
};

/**
 * Collects every student that has ever been part of the block (initial students + students removed through updates), without duplicates.
 */
const collectStudentsToRemove = (document: WithId<Block>): BlockStudent[] => {
  const studentsToRemove: BlockStudent[] = [...document.students];
  for (const updated of document.updated) {
    studentsToRemove.push(...updated.studentsToRemove);
  }

  const uniqueStudents: Map<string, BlockStudent> = new Map(
    studentsToRemove.map((student: BlockStudent): [string, BlockStudent] => [[student.id, student.displayName, student.userPrincipalName].join("|"), student])
  );

  return [...uniqueStudents.values()];
};

/**
 * Moves documents from a source collection to a target collection in batches.
 *
 * @param sourceCollection - The name of the source collection.
 * @param targetCollection - The name of the target collection.
 * @param filter - The filter criteria to select documents from the source collection.
 * @param limit - The maximum number of documents to move, or null for no limit.
 */
export const moveDocuments = async (sourceCollection: string, targetCollection: string, filter: Filter<Block>, limit: number | null): Promise<void> => {
  // Connect to the database
  const db: Db = await connectToDB();

  // Find all the documents in the source collection that match the filter
  const documents: WithId<Block>[] =
    limit === null ? await db.collection<Block>(sourceCollection).find(filter).toArray() : await db.collection<Block>(sourceCollection).find(filter).limit(limit).toArray();

  if (documents.length < 1) {
    logger.info("{logPrefix} - No documents found in {SourceCollection} that match the filter: {@Filter}", logPrefix, sourceCollection, filter);
    return;
  }

  logger.info("{logPrefix} - Found {DocumentCount} documents in {SourceCollection} that match the filter: {@Filter}", logPrefix, documents.length, sourceCollection, filter);

  // Check if all the members actually is removed from the group before moving the documents
  logger.info("{logPrefix} - Checking if all the members in the block is removed from the group", logPrefix);

  for (const document of documents) {
    try {
      await removeGroupMembers(document.typeBlock.groupId, collectStudentsToRemove(document));
    } catch (error) {
      logger.errorException(error, "{logPrefix} - Error moving document", logPrefix);
    }
  }

  logger.info("{logPrefix} - All members in the block is removed from the group", logPrefix);

  // Split the documents into batches of the specified size
  const batches: WithId<Block>[][] = [];
  while (documents.length > 0) {
    batches.push(documents.splice(0, BATCH_SIZE));
  }

  // Insert each batch of documents into the target collection
  for (const batch of batches) {
    await insertBatch(targetCollection, batch);
  }

  // Delete each batch of documents from the source collection
  for (const batch of batches) {
    await deleteBatch(sourceCollection, batch);
  }
};
