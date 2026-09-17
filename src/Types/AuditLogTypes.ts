// ===== UOP_AuditLogs List =====
export type AuditEventType =
  | 'User Created'
  | 'User Updated'
  | 'User Deactivated'
  | 'User Deleted'
  | 'App Created'
  | 'App Updated'
  | 'App Deleted'
  | 'Mapping Added'
  | 'Mapping Removed'
  | 'Role Updated'
  | 'Export'
  | 'Login'
  | 'Error'
  | 'System';

export interface IAuditLog {
  Id: number;
  Title: string;               // Short log headline
  LogsGUID?: string;           // Unique tracking identifier for indexing/retrieval
  EventType: AuditEventType;
  ActorName: string;           // Display name of the person who performed the action
  ActorEmail: string;          // UPN of the actor (used for avatar initials)
  TargetEntity?: string;       // Name of the affected object (user name, app name, etc.)
  TargetEntityId?: number;     // SP Id of the affected record, if applicable
  Description: string;         // Full descriptive message shown in the Audit Logs table
  Timestamp: string;           // ISO date string of the exact event time
}

// Payload for writing a new audit log entry
export interface IAuditLogPayload {
  Title: string;
  LogsGUID?: string;           // Optional LogsGUID (will be generated automatically if not provided)
  EventType: AuditEventType;
  ActorName: string;
  ActorEmail: string;
  TargetEntity?: string;
  TargetEntityId?: number;
  Description: string;
  Timestamp: string;
}

// ===== UOP_ActivityLogs List =====
export type ActivityEventType =
  | 'App Launched'
  | 'App Favourited'
  | 'App Unfavourited';

export interface IActivityLog {
  Id: number;
  Title: string;
  LogsGUID?: string;           // Unique tracking identifier for indexing/retrieval
  EventType: ActivityEventType;
  ActorName: string;           // Display name of the person who performed the action
  ActorEmail: string;          // UPN of the actor
  TargetEntity?: string;       // Name of the affected object (app name, etc.)
  TargetEntityId?: number;     // SP Id of the affected record, if applicable
  Description: string;         // Full descriptive message
  Timestamp: string;           // ISO date string of the exact event time
}

// Payload for writing a new activity log entry
export interface IActivityLogPayload {
  Title: string;
  LogsGUID?: string;           // Optional LogsGUID (will be generated automatically if not provided)
  EventType: ActivityEventType;
  ActorName: string;
  ActorEmail: string;
  TargetEntity?: string;
  TargetEntityId?: number;
  Description: string;
  Timestamp: string;
}
