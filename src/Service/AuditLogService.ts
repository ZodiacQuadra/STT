import { IAuditLog, IAuditLogPayload, IActivityLog, IActivityLogPayload } from '../Types/AuditLogTypes';
import { logError } from './LoggerService';
import { getCollection, addItemToCollection } from '../Config/storage';

const AUDIT_COLLECTION = 'UOP_AuditLogs';
const ACTIVITY_COLLECTION = 'UOP_ActivityLogs';

const generateGUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getAuditLogs = async (top: number = 500): Promise<IAuditLog[]> => {
  try {
    const items = getCollection<IAuditLog>(AUDIT_COLLECTION);
    const sorted = [...items].sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
    return top > 0 ? sorted.slice(0, top) : sorted;
  } catch (error: any) {
    await logError({
      Title: 'Error fetching audit logs',
      Error_Source: 'Frontend',
      Component_Name: 'AuditLogService',
      Function_Name: 'getAuditLogs',
      Error_Message: error.message,
      Stack_Trace: error.stack
    });
    return [];
  }
};

export const getAuditLogsByType = async (eventType: string, top: number = 500): Promise<IAuditLog[]> => {
  try {
    const items = getCollection<IAuditLog>(AUDIT_COLLECTION);
    const filtered = items.filter(l => (l.EventType || '').toLowerCase() === eventType.toLowerCase());
    const sorted = filtered.sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
    return top > 0 ? sorted.slice(0, top) : sorted;
  } catch (error: any) {
    await logError({
      Title: 'Error fetching audit logs by event type',
      Error_Source: 'Frontend',
      Component_Name: 'AuditLogService',
      Function_Name: 'getAuditLogsByType',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ eventType, top })
    });
    return [];
  }
};

export const writeAuditLog = async (payload: IAuditLogPayload): Promise<void> => {
  try {
    addItemToCollection(AUDIT_COLLECTION, {
      ...payload,
      LogsGUID: generateGUID(),
      Timestamp: payload.Timestamp || new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Failed to record audit log:', error);
  }
};

export const getActivityLogs = async (top: number = 500): Promise<IActivityLog[]> => {
  try {
    const items = getCollection<IActivityLog>(ACTIVITY_COLLECTION);
    const sorted = [...items].sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
    return top > 0 ? sorted.slice(0, top) : sorted;
  } catch (error: any) {
    await logError({
      Title: 'Error fetching activity logs',
      Error_Source: 'Frontend',
      Component_Name: 'AuditLogService',
      Function_Name: 'getActivityLogs',
      Error_Message: error.message,
      Stack_Trace: error.stack
    });
    return [];
  }
};

export const writeActivityLog = async (payload: IActivityLogPayload): Promise<void> => {
  try {
    addItemToCollection(ACTIVITY_COLLECTION, {
      ...payload,
      LogsGUID: generateGUID(),
      Timestamp: payload.Timestamp || new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Failed to record activity log:', error);
  }
};
