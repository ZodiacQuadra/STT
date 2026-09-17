// ===== UOP_ADUsers List =====
export interface IADUser {
  Id: number;
  Title: string;               // Full display name
  AD_ObjectId: string;         // Azure AD Object GUID
  UserPrincipalName: string;   // UPN / login email
  Email: string;               // Primary SMTP email
  JobTitle?: string;
  Department?: string;
  OfficeLocation?: string;
  IsActive: boolean;
  LastSyncedAt?: string;       // ISO date string
}

// Used when upserting from Graph API sync
export interface IADUserPayload {
  Title: string;
  AD_ObjectId: string;
  UserPrincipalName: string;
  Email: string;
  JobTitle?: string;
  Department?: string;
  OfficeLocation?: string;
  IsActive: boolean;
  LastSyncedAt: string;
}
