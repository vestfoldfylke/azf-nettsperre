import type { WithId } from "mongodb";
import type { Block } from "./block.js";

export type GroupMemberResult = {
  memberID: string;
  groupID: string;
  error?: unknown;
};

export type MembersRemovedResult = {
  total: number;
  membersRemoved: number;
  failedNumber: number;
  failed: GroupMemberResult[];
  success: GroupMemberResult[];
};

export type MembersAddedResult = {
  total: number;
  membersAdded: number;
  failedNumber: number;
  failed: { error: unknown }[];
  success: GroupMemberResult[];
};

export type BlockActionsResult = {
  blocksAdded: WithId<Block>[];
  blocksRemoved: WithId<Block>[];
};

export type UserActionsResponse = {
  status: number;
  jsonBody: BlockActionsResult | string;
};

export type LogEntryResponse = {
  status: number;
  body: string;
};
