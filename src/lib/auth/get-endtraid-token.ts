import { type AuthenticationResult, ConfidentialClientApplication, type Configuration } from "@azure/msal-node";
import { logger } from "@vestfoldfylke/loglady";
import { appReg } from "../../config.js";

type TokenOptions = {
  forceNew: boolean;
};

const config: Configuration = {
  auth: {
    clientId: appReg.clientId,
    authority: `https://login.microsoftonline.com/${appReg.tenantId}/`,
    clientSecret: appReg.clientSecret
  }
};

// Single instance so MSAL's built-in in-memory token cache is reused across invocations
const confidentialClient: ConfidentialClientApplication = new ConfidentialClientApplication(config);

export const getMsalTokenForScope = async (scope: string, options: TokenOptions = { forceNew: false }): Promise<string> => {
  const logPrefix: string = "getGraphToken";

  const authResult: AuthenticationResult | null = await confidentialClient.acquireTokenByClientCredential({
    scopes: [scope],
    skipCache: options.forceNew
  });

  if (!authResult) {
    throw new Error(`Failed to acquire token for scope '${scope}': MSAL returned no token. Verify the app registration settings and the requested scope.`);
  }

  if (!authResult.fromCache) {
    logger.info("{logPrefix} - Got new token, expires on {ExpiresOn}", logPrefix, authResult.expiresOn?.toISOString());
  }

  return authResult.accessToken;
};
