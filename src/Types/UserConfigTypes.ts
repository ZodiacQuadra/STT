// ===== UOP_UserConfiguration List =====

export interface IUserConfig {
  Id: number;
  Title: string;               // Display name 
  UserMailId: string;          // Primary email 
  Username: string;            // Human-readable username
  IsActive: boolean;           // true = user has admin privileges
  CreatedBy_Name?: string;     // Display name of admin who created this record
  DeactivatedOn?: string;      // ISO date string, null if still active
  Notes?: string;              // Optional admin remarks
}

// Payload for creating or updating a user config entry
export interface IUserConfigPayload {
  Title: string;
  UserMailId: string;
  Username: string;
  IsActive: boolean;
  CreatedBy_Name?: string;
  DeactivatedOn?: string;
  Notes?: string;
}
