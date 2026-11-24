export type GraphMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type GraphCollectionResponse<T> = {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.count"?: number;
};

export type GraphUser = {
  id: string;
  displayName: string | null;
  givenName: string | null;
  surname: string | null;
  userPrincipalName: string;
  companyName: string | null;
  officeLocation: string | null;
  preferredLanguage: string | null;
  mail: string | null;
  jobTitle: string | null;
  mobilePhone: string | null;
  businessPhones: string[];
};

export type GraphOwnedObject = {
  id: string;
  displayName: string;
  mail: string | null;
  description: string | null;
};

export type GraphGroupMember = {
  id: string;
  displayName: string | null;
  userPrincipalName?: string | null;
  mail?: string | null;
  officeLocation?: string | null;
};
