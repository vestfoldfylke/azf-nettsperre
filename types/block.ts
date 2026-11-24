import type { validBlockTypes } from "../src/config.js";

export type BlockStatus = "pending" | "active" | "expired" | "deleted";

export type BlockAction = "activate" | "deactivate" | "delete";

export type BlockType = (typeof validBlockTypes)[number];

export type UserAction = Exclude<BlockAction, "delete">;

export type BlockStudent = {
  id: string;
  displayName?: string;
  userPrincipalName?: string;
};

export type BlockTeacher = {
  teacherId: string;
  userPrincipalName: string;
  displayName: string;
  officeLocation: string;
};

export type BlockCreatedBy = {
  userId: string;
  userPrincipalName: string;
  displayName: string;
  officeLocation: string;
};

export type BlockedGroup = {
  id: string;
  displayName: string;
};

export type TypeBlock = {
  type: string;
  groupId: string | null;
};

export type BlockDateChange = {
  old?: string;
  new?: string;
};

export type BlockUpdate = {
  updatedBy: {
    displayName: string;
    teacherId: string;
    userPrincipalName: string;
  };
  updatedTimeStamp: string;
  studentsToRemove: BlockStudent[];
  studentsToAdd: BlockStudent[];
  typeBlockChange?: {
    oldType?: string;
    newType?: string;
  };
  dateBlockChange?: {
    start?: BlockDateChange;
    end: BlockDateChange;
  };
};

export type Block = {
  status: BlockStatus;
  students: BlockStudent[];
  teacher: BlockTeacher;
  blockedGroup: BlockedGroup;
  typeBlock: TypeBlock;
  createdBy: BlockCreatedBy;
  startBlock: string;
  endBlock: string;
  createdTimeStamp?: string;
  updated: BlockUpdate[];
};
