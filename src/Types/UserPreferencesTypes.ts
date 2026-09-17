// ===== UOP_UserPreferences List =====

/**
 * Represents a row in the UOP_UserPreferences SharePoint list.
 * One row per user, keyed by AD_ObjectId (Azure AD Object GUID).
 */
export interface IUserPreferences {
  Id: number;              // SharePoint item ID — used for update calls
  Title: string;           // User Display Name — cosmetic only
  AD_ObjectId: string;     // Azure AD Object ID — primary lookup key
  UserEmail: string;       // User email — reference only, not used for lookups
  FavouriteApps: string;   // Comma-separated Application IDs the user starred, e.g. "3,7,12"
  RecentApps: string;      // LIFO comma-separated App IDs, newest first, e.g. "12,7,3"
  MostUsedApps?: string;   // JSON string storing launch frequencies with last decay date
}

/**
 * Payload for creating or updating a UOP_UserPreferences row.
 */
export interface IUserPreferencesPayload {
  Title?: string;
  AD_ObjectId: string;
  UserEmail?: string;
  FavouriteApps?: string;
  RecentApps?: string;
  MostUsedApps?: string;
}
