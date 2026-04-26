const { logger } = require("@vestfoldfylke/loglady");
const getMsalToken = require("../auth/get-endtraid-token.js");

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

  const options = {
    method: method.toUpperCase(),
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
    logger.errorException(error, "Failed to make {Method} request to graph. Status: {Status}, StatusText: {StatusText}", method, response.status, response.statusText);
    throw new Error(`Failed to make ${method} request to graph. Status: ${response.status}, StatusText: ${response.statusText}. Error: ${JSON.stringify(error)}`);
  }

  return response.json();
};

module.exports = { graphRequest };
