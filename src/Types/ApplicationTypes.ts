// ===== UOP_Applications List =====
export type AppCategory = string;
export type AppStatus = 'Active' | 'Inactive';

export interface IAppCategory {
  Id: number;
  Title: string;
  Description?: string;
  SortOrder?: number;
  BgColor?: string;
  TextColor?: string;
  IconName?: string;
  IsActive: boolean;
}

export interface IApplication {
  Id: number;                  // SharePoint auto-generated integer ID
  Title: string;               // Application name.
  Description?: string;        // Short description shown on the app card
  AppURL: string;              // Direct URL to the application
  Category: AppCategory;       // Grouping category
  Status: AppStatus;           // 'Active' | 'Inactive'
  AssignedTo?: string;         // Comma-separated UPNs with access
  SortOrder?: number;          // Lower = higher display position
  IsVisibleToAll: boolean;     // If true, all portal users can see without being in AssignedTo
  IconName?: string;           // Bootstrap Icon name 
  CreatedDate?: string;        // ISO date string
  LastUpdatedDate?: string;    // ISO date string
}

// Payload for creating or updating an application
export interface IApplicationPayload {
  Title: string;
  Description?: string;
  AppURL: string;
  Category: AppCategory;
  Status: AppStatus;
  AssignedTo?: string;
  SortOrder?: number;
  IsVisibleToAll: boolean;
  IconName?: string;           // Bootstrap Icon name (e.g. "globe", "shield-lock")
  LastUpdatedDate: string;
}

// Helper: parsed assigned users from the CSV field
export interface IApplicationWithUsers extends IApplication {
  assignedUserEmails: string[];  // Parsed array from AssignedTo CSV
  assignedUserCount: number;     // Count of assigned users
}
