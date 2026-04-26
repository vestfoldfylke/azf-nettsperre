const { logger } = require("@vestfoldfylke/loglady");
const { statistics } = require("../../../config.js");
const { getUser } = require("../graph/jobs/users.js");

/**
 * Creates statistics for a given block and action.
 *
 * @param {Object} block - The block object containing details about the block.
 * @param {string} block._id - The unique identifier of the block.
 * @param {Object} block.teacher - The teacher object associated with the block.
 * @param {string} block.teacher.userPrincipalName - The user principal name of the teacher.
 * @param {Object} block.createdBy - The user object who created the block.
 * @param {string} block.createdBy.userPrincipalName - The user principal name of the creator.
 * @param {Object} block.typeBlock - The type block object.
 * @param {string} block.typeBlock.type - The type of the block.
 * @param {Array} block.students - The array of students in the block.
 * @param {Array} block.updated - The array of updates made to the block.
 * @param {string} action - The action type for the statistics.
 * @returns {Promise<Object|undefined>} The created statistics data or undefined if creation failed.
 * @throws {Error} Throws an error if unable to create statistics.
 */
const createStatistics = async (block, action) => {
  const logPrefix = "createStatistics";
  logger.info("{logPrefix} - Creating statistics for block: {BlockId}", logPrefix, block._id);

  // Get info about the teacher who owns the team
  const teamOwner = await getUser(block.teacher.userPrincipalName);

  // Get info about the person who created the block
  const createdBy = await getUser(block.createdBy.userPrincipalName);

  const payload = {
    system: "Nettsperre",
    engine: "azf-nettsperre",
    company: teamOwner.companyName,
    department: teamOwner.officeLocation,
    description: "Viser antall elever i blokken og hvor mange ganger blokken er oppdatert. Hvilke skole blokken tilhører. Hvilken type blokk det er og hvor blokken ble opprettet fra.",
    externalId: block._id,
    type: action,
    // Optional fields
    blockType: block.typeBlock.type,
    createdByCompany: createdBy.companyName,
    createdByDepartment: createdBy.officeLocation,
    numberOfStudents: block.students.length,
    timesBlockWasUpdated: block.updated.length
  };

  const response = await fetch(`${statistics.url}/stats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Functions-Key": statistics.key
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    logger.errorException(error, "Failed to POST statistics update. Status: {Status}, StatusText: {StatusText}", response.status, response.statusText);
    throw new Error(`Failed to POST statistics update. Status: ${response.status}, StatusText: ${response.statusText}. Error: ${JSON.stringify(error)}`);
  }

  const responseData = await response.json();

  if (Array.isArray(responseData)) {
    if (responseData.length === 0) {
      return undefined;
    }

    if (responseData.length > 1) {
      logger.error("{logPrefix} - Was not able to create statistics", logPrefix);
      throw new Error("Was not able to create statistics");
    }

    logger.info("{logPrefix} - Statistics created for block: {BlockId}", logPrefix, block._id);
    return responseData[0];
  }

  logger.info("{logPrefix} - Statistics created for block: {BlockId}", logPrefix, block._id);
  return responseData;
};

module.exports = { createStatistics };
