import { IApplication, IApplicationPayload, IApplicationWithUsers } from '../Types/ApplicationTypes';
import { logError } from './LoggerService';
import { saveUserAppMapping, deleteUserAppMapping } from './UserAppMappingService';
import {
  getCollection,
  addItemToCollection,
  updateItemInCollection,
  deleteItemFromCollection,
  saveCollection
} from '../Config/storage';

const COLLECTION_NAME = 'UOP_Applications';

const parseAssignedTo = (csv: string | undefined): string[] => {
  if (!csv || csv.trim() === '') return [];
  return csv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
};

const getMappingsMap = async (): Promise<Record<number, string>> => {
  try {
    const mappings = getCollection<any>('UOP_UserAppMapping');
    const map: Record<number, string> = {};
    mappings.forEach(m => {
      if (m.ApplicationId && m.IsActive !== false) {
        map[m.ApplicationId] = m.UserMailId || '';
      }
    });
    return map;
  } catch (error: any) {
    await logError({
      Title: 'Error fetching mappings map',
      Error_Source: 'Frontend',
      Component_Name: 'ApplicationService',
      Function_Name: 'getMappingsMap',
      Error_Message: error.message,
      Stack_Trace: error.stack
    });
    return {};
  }
};

export const getApplications = async (): Promise<IApplicationWithUsers[]> => {
  try {
    const [rawApps, mappingsMap] = await Promise.all([
      getCollection<IApplication>(COLLECTION_NAME),
      getMappingsMap()
    ]);

    const appsWithUsers: IApplicationWithUsers[] = rawApps.map(app => {
      const assignedCSV = mappingsMap[app.Id] !== undefined ? mappingsMap[app.Id] : (app.AssignedTo || '');
      const assignedEmails = parseAssignedTo(assignedCSV);
      return {
        ...app,
        AssignedTo: assignedCSV,
        assignedUserEmails: assignedEmails,
        assignedUserCount: assignedEmails.length
      };
    });

    return appsWithUsers.sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));
  } catch (error: any) {
    await logError({
      Title: 'Error fetching applications',
      Error_Source: 'Frontend',
      Component_Name: 'ApplicationService',
      Function_Name: 'getApplications',
      Error_Message: error.message,
      Stack_Trace: error.stack
    });
    return [];
  }
};

export const getActiveApplications = async (): Promise<IApplicationWithUsers[]> => {
  const all = await getApplications();
  return all.filter(a => a.Status === 'Active');
};

export const getApplicationsForUser = async (userEmail: string): Promise<IApplicationWithUsers[]> => {
  try {
    const allApps = await getApplications();
    const normalizedEmail = (userEmail || '').trim().toLowerCase();

    return allApps.filter(app => {
      if (app.Status === 'Inactive') return false;
      if (app.IsVisibleToAll) return true;
      return app.assignedUserEmails.includes(normalizedEmail);
    });
  } catch (error: any) {
    await logError({
      Title: 'Error fetching applications for user',
      Error_Source: 'Frontend',
      Component_Name: 'ApplicationService',
      Function_Name: 'getApplicationsForUser',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ userEmail })
    });
    return [];
  }
};

export const getNextSortOrder = async (): Promise<number> => {
  try {
    const apps = getCollection<IApplication>(COLLECTION_NAME);
    const maxSort = apps.reduce((max, a) => Math.max(max, a.SortOrder || 0), 0);
    return maxSort + 1;
  } catch (error: any) {
    return 1;
  }
};

export const addApplication = async (payload: IApplicationPayload): Promise<number> => {
  try {
    const { AssignedTo, ...appFields } = payload;
    const now = new Date().toISOString();

    const newApp = addItemToCollection<IApplication>(COLLECTION_NAME, {
      ...appFields,
      AssignedTo: AssignedTo || '',
      CreatedDate: now,
      LastUpdatedDate: now
    });

    if (AssignedTo) {
      const emails = parseAssignedTo(AssignedTo);
      await saveUserAppMapping(newApp.Id, payload.Title, emails, 'Admin');
    }

    return newApp.Id;
  } catch (error: any) {
    await logError({
      Title: 'Error adding application',
      Error_Source: 'Frontend',
      Component_Name: 'ApplicationService',
      Function_Name: 'addApplication',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify(payload)
    });
    throw error;
  }
};

export const updateApplication = async (
  id: number,
  payload: Partial<IApplicationPayload>,
  userEmails?: string[],
  actorName: string = 'Admin'
): Promise<void> => {
  try {
    const { AssignedTo, ...appFields } = payload;
    const updateData: any = { ...appFields };

    if (userEmails !== undefined) {
      updateData.AssignedTo = userEmails.join(',');
    } else if (AssignedTo !== undefined) {
      updateData.AssignedTo = AssignedTo;
    }

    updateItemInCollection(COLLECTION_NAME, id, updateData);

    if (userEmails !== undefined) {
      const app = getCollection<IApplication>(COLLECTION_NAME).find(a => a.Id === id);
      const appTitle = app ? app.Title : `Application ${id}`;
      await saveUserAppMapping(id, appTitle, userEmails, actorName);
    } else if (AssignedTo !== undefined) {
      const app = getCollection<IApplication>(COLLECTION_NAME).find(a => a.Id === id);
      const appTitle = app ? app.Title : `Application ${id}`;
      const emails = parseAssignedTo(AssignedTo);
      await saveUserAppMapping(id, appTitle, emails, actorName);
    }
  } catch (error: any) {
    await logError({
      Title: 'Error updating application',
      Error_Source: 'Frontend',
      Component_Name: 'ApplicationService',
      Function_Name: 'updateApplication',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ id, payload })
    });
    throw error;
  }
};

export const applicationExists = async (id: number): Promise<boolean> => {
  const apps = getCollection<IApplication>(COLLECTION_NAME);
  return apps.some(a => a.Id === id);
};

export const deleteApplication = async (id: number): Promise<void> => {
  try {
    deleteItemFromCollection(COLLECTION_NAME, id);
    await deleteUserAppMapping(id);
  } catch (error: any) {
    await logError({
      Title: 'Error deleting application',
      Error_Source: 'Frontend',
      Component_Name: 'ApplicationService',
      Function_Name: 'deleteApplication',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ id })
    });
    throw error;
  }
};

export const assignUserToApp = async (appId: number, currentAssignedTo: string, userEmail: string): Promise<void> => {
  const emails = parseAssignedTo(currentAssignedTo);
  if (emails.includes(userEmail.toLowerCase())) return;
  emails.push(userEmail.toLowerCase());
  await updateApplication(appId, { AssignedTo: emails.join(',') });
};

export const removeUserFromApp = async (appId: number, currentAssignedTo: string, userEmail: string): Promise<void> => {
  const emails = parseAssignedTo(currentAssignedTo).filter(e => e !== userEmail.toLowerCase());
  await updateApplication(appId, { AssignedTo: emails.join(',') });
};

export const getAppIconsMap = async (): Promise<Record<number, string>> => {
  return {};
};

export const uploadAppIcon = async (appId: number, file: File): Promise<string> => {
  return '';
};

export const updateApplicationCategoryName = async (oldCategory: string, newCategory: string): Promise<void> => {
  try {
    const items = getCollection<IApplication>(COLLECTION_NAME);
    items.forEach(app => {
      if (app.Category === oldCategory) {
        app.Category = newCategory as any;
        app.LastUpdatedDate = new Date().toISOString();
      }
    });
    saveCollection(COLLECTION_NAME, items);
  } catch (error: any) {
    await logError({
      Title: 'Error updating application category names in bulk',
      Error_Source: 'Frontend',
      Component_Name: 'ApplicationService',
      Function_Name: 'updateApplicationCategoryName',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ oldCategory, newCategory })
    });
    throw error;
  }
};

export const reorderApplications = async (orderedApps: { Id: number; SortOrder: number }[]): Promise<void> => {
  try {
    const items = getCollection<IApplication>(COLLECTION_NAME);
    const orderMap = new Map(orderedApps.map(o => [o.Id, o.SortOrder]));
    items.forEach(it => {
      if (orderMap.has(it.Id)) {
        it.SortOrder = orderMap.get(it.Id);
      }
    });
    saveCollection(COLLECTION_NAME, items);
  } catch (error: any) {
    await logError({
      Title: 'Error reordering applications',
      Error_Source: 'Frontend',
      Component_Name: 'ApplicationService',
      Function_Name: 'reorderApplications',
      Error_Message: error.message,
      Stack_Trace: error.stack
    });
    throw error;
  }
};
