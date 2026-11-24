import { logger } from "@vestfoldfylke/loglady";
import type { WithId } from "mongodb";
import type { Block, BlockAction } from "../../../types/block.js";
import type { GraphUser } from "../../../types/graph.js";
import type { StatisticsResponse } from "../../../types/statistics.js";
import { statistics } from "../../config.js";
import { getUser } from "../graph/jobs/users.js";

type StatisticsPayload = {
  system: string;
  engine: string;
  company: string | null;
  department: string | null;
  description: string;
  externalId: WithId<Block>["_id"];
  type: BlockAction;
  blockType: string;
  createdByCompany: string | null;
  createdByDepartment: string | null;
  numberOfStudents: number;
  timesBlockWasUpdated: number;
};

/**
 * Creates statistics for a given block and action.
 *
 * @param block - The block to create statistics for.
 * @param action - The action type for the statistics.
 * @returns The created statistics data or null if creation returned nothing.
 * @throws Throws an error if unable to create statistics.
 */
export const createStatistics = async (block: WithId<Block>, action: BlockAction): Promise<StatisticsResponse | null> => {
  const logPrefix: string = "createStatistics";
  logger.info("{logPrefix} - Creating statistics for block: {BlockId}", logPrefix, block._id.toString());

  // Get info about the teacher who owns the team
  const teamOwner: GraphUser = await getUser(block.teacher.userPrincipalName);

  // Get info about the person who created the block
  const createdBy: GraphUser = await getUser(block.createdBy.userPrincipalName);

  const payload: StatisticsPayload = {
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

  const response: Response = await fetch(`${statistics.url}/stats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Functions-Key": statistics.key
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error: unknown = await response.json();
    logger.errorException(error, "Failed to POST statistics update. Status: {Status}, StatusText: {StatusText}", response.status, response.statusText);
    throw new Error(`Failed to POST statistics update. Status: ${response.status}, StatusText: ${response.statusText}. Error: ${JSON.stringify(error)}`);
  }

  const responseData: StatisticsResponse | StatisticsResponse[] = (await response.json()) as StatisticsResponse | StatisticsResponse[];

  if (!Array.isArray(responseData)) {
    logger.info("{logPrefix} - Statistics created for block: {BlockId}", logPrefix, block._id.toString());
    return responseData;
  }

  if (responseData.length > 1) {
    logger.error("{logPrefix} - Was not able to create statistics", logPrefix);
    throw new Error("Was not able to create statistics");
  }

  const [createdStatistics] = responseData;
  if (!createdStatistics) {
    return null;
  }

  logger.info("{logPrefix} - Statistics created for block: {BlockId}", logPrefix, block._id.toString());
  return createdStatistics;
};
