const { getMongoClient } = require('../../lib/auth/mongoClient.js')
const { mongoDB } = require('../../../config.js')
const { logger } = require('@vtfk/logger')

const logPrefix = 'moveDocuments'

const connectToDB = async () => {
    const mongoClient = await getMongoClient()
    return mongoClient.db(mongoDB.dbName)
}

// Function to insert a batch of documents into a collection
const insertBatch = async (collection, documents) => {
    const db = await connectToDB()
    try {
        await db.collection(collection).insertMany(documents)
    } catch (error) {
        logger('error', [logPrefix, `Error inserting batch: ${error}`])
    }
}

// Function to delete a batch of documents from a collection
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

// Function to move documents from one collection to another, using the insertBatch and deleteBatch functions. 
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