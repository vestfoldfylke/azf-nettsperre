import { logger } from "@vestfoldfylke/loglady";
import type { GraphMethod } from "../../../types/graph.js";
import { getMsalTokenForScope } from "../auth/get-endtraid-token.js";
import { HTTPError } from "../HTTPError.js";

type GraphErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const HTTP_NOT_FOUND = 404;
const NO_CONTENT_METHODS: GraphMethod[] = ["DELETE", "PATCH"];

/**
 * Calls the MS Graph API and returns the data (GET / POST)
 */
export function graphRequest<T>(url: string, method: "GET" | "POST", data?: Record<string, unknown>, consistencyLevel?: string): Promise<T>;
/**
 * Calls the MS Graph API without expecting a response body (PATCH / DELETE)
 */
export function graphRequest(url: string, method: "PATCH" | "DELETE", data?: Record<string, unknown>): Promise<void>;
export async function graphRequest(url: string, method: GraphMethod, data?: Record<string, unknown>, consistencyLevel?: string): Promise<unknown> {
  const authorizationHeader: string = `Bearer ${await getMsalTokenForScope(GRAPH_SCOPE)}`;

  const headers: Record<string, string> = {
    Authorization: authorizationHeader,
    "Content-Type": "application/json"
  };

  if (consistencyLevel) {
    headers.ConsistencyLevel = consistencyLevel;
  }

  const options: RequestInit = {
    method,
    headers
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response: Response = await fetch(url, options);

  if (!response.ok) {
    const error: GraphErrorResponse = (await response.json()) as GraphErrorResponse;
    const isGraphObjectNotFound: boolean = (error.error?.message || "").includes("object references do not exist");
    if (isGraphObjectNotFound || response.status === HTTP_NOT_FOUND) {
      throw new HTTPError(HTTP_NOT_FOUND, response.statusText, error);
    }

    logger.error(
      "Failed to make {Method} request to graph with URL: {Url} and possibly Data: {@Data}. Status: {Status}, StatusText: {StatusText}. Error: {@Error}",
      method,
      url,
      data,
      response.status,
      response.statusText,
      error
    );
    throw new HTTPError(response.status, response.statusText, error);
  }

  if (NO_CONTENT_METHODS.includes(method)) {
    return;
  }

  return response.json();
}
