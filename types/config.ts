type AppRegKey = "tenantId" | "clientId" | "clientSecret" | "scope" | "grantType" | "issuer" | "jwkUri" | "audience";

export type AppRegConfig = Record<AppRegKey, string>;

export type MongoDbConfig = {
  connectionString: string;
  dbName: string;
  blocksCollection: string;
  historyCollection: string;
  impersonationCollection: string;
};

export type StatisticsConfig = {
  url: string;
  key: string;
};

export type BlockGroupConfig = {
  eksamenID: string;
  proveID: string;
  teamsID: string;
  offlineID: string;
  forms: string;
  formsFile: string;
};

export type MiscConfig = {
  email_domain: string;
  allowedCompanies: string[];
};
