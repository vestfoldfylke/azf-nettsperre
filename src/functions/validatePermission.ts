import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { logger } from "@vestfoldfylke/loglady";
import type { GraphUser } from "../../types/graph.js";
import type { ValidatePermissionBody } from "../../types/requests.js";
import type { ValidationLogEntry } from "../../types/validation-log-entry.js";
import { misc } from "../config.js";
import { formatDate } from "../lib/formatDate.js";
import { getUser } from "../lib/graph/jobs/users.js";
import { createLogEntry } from "../lib/jobs/handleLogEntry.js";

const validatePermissionHandler = async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
  const logPrefix: string = "validatePermission";
  const body: ValidatePermissionBody = (await request.json()) as ValidatePermissionBody;

  // Get requestor and teacher to be edited info
  const requestorInfo: GraphUser = await getUser(body.requestorUPN);
  const teacherToBeEditedInfo: GraphUser = await getUser(body.teacherToBeEditedUPN);
  const sessionId: string = body.sessionId;

  const logData: ValidationLogEntry = {
    requestor: requestorInfo,
    teacherToBeEdited: teacherToBeEditedInfo,
    sessionId,
    skipValidation: "",
    validationMsg: "",
    performedActions: [],
    createdTimeStamp: formatDate(new Date())
  };

  // Skip if requestor is in the allowed comma separated string
  const shouldSkipValidation: boolean = requestorInfo.companyName !== null && misc.allowedCompanies.includes(requestorInfo.companyName);

  if (shouldSkipValidation) {
    logger.info("{logPrefix} - Requestor is a part of the allowed companies, skipping validation", logPrefix);
    logData.skipValidation = true;
    logData.validationMsg = "Requestor is a part of the allowed companies, skipping validation";
  }

  // If requestor is not in the allowed list, perform validation
  if (!shouldSkipValidation) {
    logger.info("{logPrefix} - Requestor is not a part of the allowed companies, performing validation", logPrefix);

    // Check if requestor and teacher to be edited are in the same office location
    if (requestorInfo.officeLocation !== teacherToBeEditedInfo.officeLocation) {
      logData.skipValidation = false;
      logData.validationMsg = "Validation failed, requestor and teacher to be edited are not in the same location";
      logger.error("{logPrefix} - Requestor and teacher to be edited are not in the same location", logPrefix);

      try {
        await createLogEntry(logData);
      } catch (error) {
        logger.errorException(error, "{logPrefix}", logPrefix);
        return { status: 500, body: "Internal Server Error" };
      }

      return { status: 403, body: "Forbidden" };
    }

    // If requestor and teacher to be edited are in the same office location, log the validation result.
    logData.skipValidation = false;
    logData.validationMsg = "Validation successful, requestor and teacher to be edited are in the same location";
  }

  // Log validation result
  logger.info("{logPrefix} - Validation successful, creating log entry", logPrefix);

  try {
    await createLogEntry(logData);
  } catch (error) {
    logger.errorException(error, "{logPrefix}", logPrefix);
    return { status: 500, body: "Internal Server Error" };
  }

  // Return requestor and teacher to be edited info
  return { status: 200, jsonBody: { requestor: requestorInfo, teacher: teacherToBeEditedInfo } };
};

app.http("validatePermission", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "validatePermission",
  handler: validatePermissionHandler
});
