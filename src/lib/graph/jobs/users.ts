import type { GraphUser } from "../../../../types/graph.js";
import { graphRequest } from "../call-graph.js";

/**
 * Fetches user details from Microsoft Graph API based on the provided user principal name (UPN).
 *
 * @param upn - The user principal name of the user to fetch.
 * @returns A promise that resolves to the user details object.
 * @throws Throws an error if the 'upn' parameter is not specified.
 */
export const getUser = async (upn: string): Promise<GraphUser> => {
  // Input validation
  if (!upn) {
    throw new Error("Cannot search for a user if 'upn' is not specified");
  }

  const url: string = `https://graph.microsoft.com/v1.0/users/${upn}?$select=id,displayName,givenName,surname,userPrincipalName,companyName,officeLocation,preferredLanguage,mail,jobTitle,mobilePhone,businessPhones`;
  return await graphRequest<GraphUser>(url, "GET");
};
