const { graphRequest } = require ('../call-graph.js')

// This function retrieves a user from the Microsoft Graph API
const getUser = async (upn) => {
  // Input validation
  if (!upn) throw new Error('Cannot search for a user if \'upn\' is not specified')
      
  const url = `https://graph.microsoft.com/v1.0/users/${upn}?$select=id,displayName,givenName,surname,userPrincipalName,companyName,officeLocation,preferredLanguage,mail,jobTitle,mobilePhone,businessPhones`
  let data = await graphRequest(url, 'GET', 'null', 'eventual')
  return data
}

module.exports = { getUser }