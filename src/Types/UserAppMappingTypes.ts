// ===== UOP_UserAppMapping List =====
export interface IUserAppMapping {
  Id: number;
  Title: string;               // Auto-generated summary
  UserMailId: string;          // Comma-separated UPN emails granted access
  ApplicationId: number;       // SP Id of the related UOP_Applications item
  ApplicationName: string;     // Cached app name to avoid expensive JOINs
  IsActive: boolean;           // false = access revoked (soft delete)
  MappedBy?: string;           // Display name of the Admin who created the mapping
  MappedOn?: string;           // ISO date string of when the mapping was created/modified
}

// Payload for creating a new mapping
export interface IUserAppMappingPayload {
  Title: string;
  UserMailId: string;
  ApplicationId: number;
  ApplicationName: string;
  IsActive: boolean;
  MappedBy?: string;
  MappedOn: string;
}

