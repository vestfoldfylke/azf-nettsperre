import { type ClientCredentialRequest, ConfidentialClientApplication, type Configuration } from "@azure/msal-node";
import { logger } from "@vestfoldfylke/loglady";
import NodeCache from "node-cache";
import { appReg } from "../../config.js";

type CacheOptions = {
  forceNew: boolean;
};

const CACHE_TTL_SECONDS = 3000;
const MILLISECONDS_PER_SECOND = 1000;

const cache: NodeCache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS });

export const getMsalTokenForScope = async (scope: string, options: CacheOptions = { forceNew: false }): Promise<string> => {
  const cacheKey: string = scope;
  const logPrefix: string = "getGraphToken";
  const cachedValue: string | undefined = cache.get<string>(cacheKey);

  if (!options.forceNew && cachedValue) {
    logger.info("{logPrefix} - found valid token in cache, will use that instead of fetching new", logPrefix);
    return cachedValue;
  }

  logger.info("{logPrefix} - no token in cache, fetching new from Microsoft", logPrefix);

  const config: Configuration = {
    auth: {
      clientId: appReg.clientId,
      authority: `https://login.microsoftonline.com/${appReg.tenantId}/`,
      clientSecret: appReg.clientSecret
    }
  };

  // Create msal application object
  const cca: ConfidentialClientApplication = new ConfidentialClientApplication(config);
  const clientCredentials: ClientCredentialRequest = {
    scopes: [scope]
  };

  const token = await cca.acquireTokenByClientCredential(clientCredentials);
  if (!token?.expiresOn) {
    throw new Error(`Failed to acquire token for scope '${scope}': MSAL returned no token or expiry. Verify the app registration settings and the requested scope.`);
  }

  const expires: number = Math.floor((token.expiresOn.getTime() - Date.now()) / MILLISECONDS_PER_SECOND);
  logger.info("{logPrefix} - Got token from Microsoft, expires in {ExpireSeconds} seconds.", logPrefix, expires);
  cache.set(cacheKey, token.accessToken, expires);
  logger.info("{logPrefix} - Token stored in cache", logPrefix);

  return token.accessToken;
};
