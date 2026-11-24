import type { GraphUser } from "./graph.js";

export type ValidationLogEntry = {
  requestor: GraphUser;
  teacherToBeEdited: GraphUser;
  sessionId: string;
  skipValidation: boolean | "";
  validationMsg: string;
  performedActions: string[];
  createdTimeStamp: string;
};
