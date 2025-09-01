const axios = require('axios')
const getMsalToken = require('../auth/get-endtraid-token.js')
// Calls the MS Graph API and returns the data
/**
 *
 * @param {string} url
 * @param {string} method
 * @param {object} data
 * @param {string} [consistencyLevel]
 * @returns {Promise<any>}
 */
const graphRequest = async (url, method, data, consistencyLevel = undefined) => {
  // Get access token
  const accessToken = await getMsalToken('https://graph.microsoft.com/.default')
  // Build the request with data from the call
  const options = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  }
  // Add data to the request if it exists
  if (data) options.data = data
  // Add consistency level to the request if it exists
  if (consistencyLevel) options.headers.ConsistencyLevel = consistencyLevel
  // Make the request
  const response = await axios(options)
  // Return the data
  return response.data
}

module.exports = { graphRequest }
