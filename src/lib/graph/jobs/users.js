const { graphRequest } = require ('../call-graph.js')

/**
 * Fetches user details from Microsoft Graph API based on the provided user principal name (UPN).
 *
 * @param {string} upn - The user principal name of the user to fetch.
 * @returns {Promise<Object>} A promise that resolves to the user details object.
 * @throws {Error} Throws an error if the 'upn' parameter is not specified.
 */
const getUser = async (upn) => {
  // Input validation
  if (!upn) throw new Error('Cannot search for a user if \'upn\' is not specified')
      
  const url = `https://graph.microsoft.com/v1.0/users/${upn}?$select=id,displayName,givenName,surname,userPrincipalName,companyName,officeLocation,preferredLanguage,mail,jobTitle,mobilePhone,businessPhones`
  let data = await graphRequest(url, 'GET', 'null')
  return data
}

module.exports = { getUser }