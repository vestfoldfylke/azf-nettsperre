const { logger } = require("@vestfoldfylke/loglady");
const getMsalToken = require("../auth/get-endtraid-token.js");
const HTTPError = require("../HTTPError.js");

// Calls the MS Graph API and returns the data
/**
 *
 * @param {string} url
 * @param {string} method
 * @param {object} [data]
 * @param {string} [consistencyLevel]
 * @returns {Promise<any>}
 */
const graphRequest = async (url, method, data = undefined, consistencyLevel = undefined) => {
  // Get access token
  const accessToken = await getMsalToken("https://graph.microsoft.com/.default");

  const fetchMethod = method.toUpperCase();

  const options = {
    method: fetchMethod,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  };

  if (consistencyLevel) {
    options.headers.ConsistencyLevel = consistencyLevel;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json();
    const isGraphObjectNotFound = (error.data?.error?.message || "").includes("object references do not exist");
    if (isGraphObjectNotFound) {
      throw new HTTPError(404, response.statusText, error);
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

  if (!["DELETE", "PATCH"].includes(fetchMethod)) {
    return response.json();
  }
};

module.exports = { graphRequest };
