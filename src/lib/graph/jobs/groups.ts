import { logger } from "@vestfoldfylke/loglady";
import type { BlockStudent } from "../../../../types/block.js";
import type { GraphCollectionResponse, GraphGroupMember, GraphOwnedObject } from "../../../../types/graph.js";
import type { GroupMemberResult, MembersAddedResult, MembersRemovedResult } from "../../../../types/results.js";
import { misc } from "../../../config.js";
import { getErrorMessage } from "../../getErrorMessage.js";
import { HTTPError } from "../../HTTPError.js";
import { graphRequest } from "../call-graph.js";

// 20 is the maximum number of members that can be added in a single request. Refer to the Microsoft Graph API documentation for more details.
const GRAPH_MAX_MEMBERS_PER_REQUEST = 20;
const HTTP_NOT_FOUND = 404;

/**
 * Retrieves the list of directory objects owned by a user, filters out non-SDS teams and expired resources.
 *
 * @param upn - The User Principal Name (UPN) of the user.
 * @returns A promise that resolves to an array of owned objects that are school teams and not expired.
 * @throws If the 'upn' parameter is not specified.
 */
export const getOwnedObjects = async (upn: string): Promise<GraphOwnedObject[]> => {
  const logPrefix: string = "getOwnedObjects";

  // Get the list of directory objects that are owned by the user.
  // Input validation
  if (!upn) {
    throw new Error("Cannot search for a user if 'upn' is not specified");
  }

  const url: string = `https://graph.microsoft.com/v1.0/users/${upn}/ownedObjects?$select=id,displayName,mail,description`;
  const response: GraphCollectionResponse<GraphOwnedObject> = await graphRequest<GraphCollectionResponse<GraphOwnedObject>>(url, "GET");

  // Return only school teams.
  // Filter out any resources that is not an SDS team
  logger.info("{logPrefix} - Removing any resources that is not an SDS team for user with upn {Upn}", logPrefix, upn);

  // Filter out any resources that is not a school team, kopi0624 or section_. Kopi0624 is a quick fix for this school year.
  const schoolTeams: GraphOwnedObject[] = response.value.filter(
    (object: GraphOwnedObject): boolean => !!object.mail && (object.mail.toLowerCase().startsWith("section_") || object.mail.toLowerCase().startsWith("kopi0624"))
  );

  // Filter out any resources that is expired
  logger.info("{logPrefix} - Removing any expired resources for user with upn {Upn}", logPrefix, upn);
  const activeTeams: GraphOwnedObject[] = schoolTeams.filter((object: GraphOwnedObject): boolean => !object.displayName.toLowerCase().startsWith("exp"));

  // Return the teams
  logger.info("{logPrefix} - Found {TeamsCount} teams for user with upn {Upn}", logPrefix, activeTeams.length, upn);

  return activeTeams;
};

/**
 * Retrieves the members of a specified group from Microsoft Graph API.
 *
 * @param groupId - The ID of the group to retrieve members from.
 * @param onlyStudents - If 'true', filters the members to include only students.
 * @returns A promise that resolves to an array of group members.
 * @throws Throws an error if the groupId is not specified.
 */
export const getGroupMembers = async (groupId: string, onlyStudents: string = ""): Promise<GraphGroupMember[]> => {
  const logPrefix: string = "getGroupMembers";

  // Get the list of members in a group
  // Input validation
  if (!groupId) {
    throw new Error("Cannot search for a group if 'groupId' is not specified");
  }

  let url: string | undefined = `https://graph.microsoft.com/v1.0/groups/${groupId}/members?$select=id,displayName,userPrincipalName,mail,officeLocation&$count=true&$top=100`;
  const members: GraphGroupMember[] = [];

  while (url) {
    const page: GraphCollectionResponse<GraphGroupMember> = await graphRequest<GraphCollectionResponse<GraphGroupMember>>(url, "GET", undefined, "eventual");
    members.push(...page.value);
    url = page["@odata.nextLink"];
  }

  if (onlyStudents !== "true") {
    logger.info("{logPrefix} - Found {MemberCount} members in group with id {GroupId}", logPrefix, members.length, groupId);
    return members;
  }

  // Filter out any resources that is not a student
  logger.info("{logPrefix} - Removing any resources that is not a student for group with id {GroupId}", logPrefix, groupId);
  const students: GraphGroupMember[] = members.filter((member: GraphGroupMember): boolean => !!member.userPrincipalName?.toLowerCase().endsWith(`@skole.${misc.email_domain}`));

  logger.info("{logPrefix} - Found {MemberCount} members in group with id {GroupId}", logPrefix, students.length, groupId);

  return students;
};

/**
 * Removes specified members from a group.
 *
 * @param groupId - The ID of the group from which members will be removed.
 * @param members - An array of member objects to be removed from the group.
 * @returns An object containing the results of the removal operation.
 * @throws Throws an error if 'groupId' or 'members' is not specified, or if 'members' is not an array.
 */
export const removeGroupMembers = async (groupId: string | null, members: BlockStudent[]): Promise<MembersRemovedResult> => {
  const logPrefix: string = "removeGroupMembers";

  // Input validation
  if (!groupId) {
    throw new Error("Cannot remove members from a group if 'groupId' is not specified");
  }

  if (!members) {
    throw new Error("Cannot remove members from a group if 'members' is not specified");
  }

  if (!Array.isArray(members)) {
    throw new Error("'members' must be an array");
  }

  // Remove the members from the group
  const membersRemoved: MembersRemovedResult = {
    total: 0,
    membersRemoved: 0,
    failedNumber: 0,
    failed: [],
    success: []
  };

  // Check if the member is in the group, if the member is not in the group, remove them from the list
  const currentMembers: GraphGroupMember[] = await getGroupMembers(groupId);
  const currentMemberIds: string[] = currentMembers.map((member: GraphGroupMember): string => member.id);

  const membersToRemove: BlockStudent[] = members.filter((member: BlockStudent): boolean => currentMemberIds.includes(member.id));

  if (membersToRemove.length === 0) {
    logger.info("{logPrefix} - No members to remove found in group with id {GroupId}", logPrefix, groupId);
    return membersRemoved;
  }

  logger.info("{logPrefix} - Found {MemberCount} members to remove from the group with id {GroupId}", logPrefix, membersToRemove.length, groupId);

  for (const member of membersToRemove) {
    const memberInfo: GroupMemberResult = {
      memberID: member.id,
      groupID: groupId,
      error: null
    };

    membersRemoved.total++;

    const url: string = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/${member.id}/$ref`;
    try {
      await graphRequest(url, "DELETE");
      logger.info("{logPrefix} - Removed member with id {MemberId} from group with id {GroupId}", logPrefix, member.id, groupId);

      membersRemoved.membersRemoved++;
      membersRemoved.success.push(memberInfo);
    } catch (error) {
      // Avoid logging ResourceNotFound errors as they are expected when the member is not in the group
      if (error instanceof HTTPError && error.status === HTTP_NOT_FOUND) {
        logger.info("{logPrefix} - Member with id {MemberId} was not found in group with id {GroupId}. Error: {@Error}", logPrefix, member.id, groupId, error);
      } else {
        logger.warn(
          "{logPrefix} - Failed to remove member with id {MemberId} from group with id {GroupId}. Member was probably already removed from the group but Microsoft was to slow to update the group members. Error: {ErrorMessage}",
          logPrefix,
          member.id,
          groupId,
          getErrorMessage(error)
        );
      }

      membersRemoved.failedNumber++;
      memberInfo.error = error;
      membersRemoved.failed.push(memberInfo);
    }
  }

  return membersRemoved;
};

/**
 * Adds members to a specified group.
 *
 * @param groupId - The ID of the group to add members to.
 * @param members - An array of member objects to be added to the group.
 * @returns An object containing the results of the operation, including total members processed, members successfully added, and any failures.
 * @throws Throws an error if 'groupId' or 'members' is not specified, or if 'members' is not an array.
 */
export const addGroupMembers = async (groupId: string | null, members: BlockStudent[]): Promise<MembersAddedResult> => {
  const logPrefix: string = "addGroupMembers";

  // Add members to a group
  // Input validation
  if (!groupId) {
    throw new Error("Cannot add members to a group if 'groupId' is not specified");
  }

  if (!members) {
    throw new Error("Cannot add members to a group if 'members' is not specified");
  }

  if (!Array.isArray(members)) {
    throw new Error("'members' must be an array");
  }

  // Add the members to the group
  const membersAdded: MembersAddedResult = {
    total: 0,
    membersAdded: 0,
    failedNumber: 0,
    failed: [],
    success: []
  };

  // Check if the member is already in the group and remove them from the list
  const currentMembers: GraphGroupMember[] = await getGroupMembers(groupId);
  const currentMemberIds: string[] = currentMembers.map((member: GraphGroupMember): string => member.id);

  const membersToAdd: BlockStudent[] = members.filter((member: BlockStudent): boolean => !currentMemberIds.includes(member.id));
  logger.info("{logPrefix} - Found {MemberCount} members to add to group with id {GroupId}", logPrefix, membersToAdd.length, groupId);

  // Bulk add members to the group
  const url: string = `https://graph.microsoft.com/v1.0/groups/${groupId}`;

  // Divide the members into chunks
  const chunks: BlockStudent[][] = [];

  for (let i = 0; i < membersToAdd.length; i += GRAPH_MAX_MEMBERS_PER_REQUEST) {
    chunks.push(membersToAdd.slice(i, i + GRAPH_MAX_MEMBERS_PER_REQUEST));
  }

  // Loop through the chunks and add the members to the group
  for (const chunk of chunks) {
    const memberIds: string[] = chunk.map((member: BlockStudent): string => member.id);
    const body: Record<string, string[]> = {
      "members@odata.bind": memberIds.map((memberId: string): string => `https://graph.microsoft.com/v1.0/directoryObjects/${memberId}`)
    };

    try {
      await graphRequest(url, "PATCH", body);
      logger.info("{logPrefix} - Added {MemberCount} members to group with id {GroupId}. Members added: {@MemberIds}", logPrefix, chunk.length, groupId, memberIds);

      membersAdded.membersAdded += chunk.length;
      membersAdded.success.push(
        ...memberIds.map(
          (memberId: string): GroupMemberResult => ({
            memberID: memberId,
            groupID: groupId
          })
        )
      );
    } catch (error) {
      logger.errorException(error, "{logPrefix} - Failed to add members with ids {@MemberIds} to group with id {GroupId}", logPrefix, memberIds, groupId);

      membersAdded.failedNumber++;
      membersAdded.failed.push({ error });
    }
  }

  return membersAdded;
};
