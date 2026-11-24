import type { Block } from "./block.js";

export type SubmitBlockBody = Block;

export type UpdateBlockBody = Block & {
  _id: string;
};

export type ValidatePermissionBody = {
  requestorUPN: string;
  teacherToBeEditedUPN: string;
  sessionId: string;
};
