const { getMongoClient } = require('../../lib/auth/mongoClient.js')
const { mongoDB } = require('../../../config.js')
const { logger } = require('@vtfk/logger')

const logPrefix = 'moveDocuments'

const connectToDB = async () => {
    const mongoClient = await getMongoClient()
    return mongoClient.db(mongoDB.dbName)
}

/**
 * Inserts a batch of documents into a specified collection in the database.
 *
 * @param {string} collection - The name of the collection to insert documents into.
 * @param {Array<Object>} documents - An array of documents to be inserted.
 * @returns {Promise<void>} - A promise that resolves when the documents have been inserted.
 * @throws {Error} - Throws an error if the insertion fails.
 */
const insertBatch = async (collection, documents) => {
    const db = await connectToDB()
    try {
        await db.collection(collection).insertMany(documents)
    } catch (error) {
        logger('error', [logPrefix, `Error inserting batch: ${error}`])
    }
}

/**
 * Deletes a batch of documents from a specified collection in the database.
 *
 * @param {string} collection - The name of the collection from which documents will be deleted.
 * @param {Array<Object>} documents - An array of documents to be deleted, each containing an `_id` property.
 * @returns {Promise<void>} - A promise that resolves when the deletion process is complete.
 */
const deleteBatch = async (collection, documents) => {
    const db = await connectToDB()
    for (const document of documents) {
        try {
            await db.collection(collection).deleteOne({ _id: document._id })
        } catch (error) {
            logger('error', [logPrefix, `Error deleting document: ${error}`])
        }
    }

}

/**
 * Moves documents from a source collection to a target collection in batches.
 *
 * @param {string} sourceCollection - The name of the source collection.
 * @param {string} targetCollection - The name of the target collection.
 * @param {Object} filter - The filter criteria to select documents from the source collection.
 * @param {number} limit - The maximum number of documents to move.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 */
const moveDocuments = async (sourceCollection, targetCollection, filter, limit) => {
    const batchSize = 5
    // Connect to the database
    const db = await connectToDB()
    // Find all the documents in the source collection that match the filter
    const documents = batchSize === null ? await db.collection(sourceCollection).find(filter).toArray() : await db.collection(sourceCollection).find(filter).limit(limit).toArray()
    if(documents.length < 1) {
        logger('info', [logPrefix, `No documents found in ${sourceCollection} that match the filter: ${JSON.stringify(filter)}`])
        return
    }
    // Split the documents into batches of the specified size
    const batches = []
    while (documents.length > 0) {
        batches.push(documents.splice(0, batchSize))
    }
    // Insert each batch of documents into the target collection
    for (const batch of batches) {
        await insertBatch(targetCollection, batch)
    }
    // Delete each batch of documents from the source collection
    for (const batch of batches) {
        await deleteBatch(sourceCollection, batch)
    }
}

module.exports = { 
    moveDocuments
}