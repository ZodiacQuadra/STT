import { IUserAppMapping, IUserAppMappingPayload } from '../Types/UserAppMappingTypes';
import { logError } from './LoggerService';
import {
  getCollection,
  addItemToCollection,
  updateItemInCollection,
  deleteItemFromCollection,
  saveCollection
} from '../Config/storage';

const COLLECTION_NAME = 'UOP_UserAppMapping';

export const getUserAppMappings = async (): Promise<IUserAppMapping[]> => {
  try {
    return getCollection<IUserAppMapping>(COLLECTION_NAME);
  } catch (error: any) {
    await logError({
      Title: 'Error fetching user-app mappings',
      Error_Source: 'Frontend',
      Component_Name: 'UserAppMappingService',
      Function_Name: 'getUserAppMappings',
      Error_Message: error.message,
      Stack_Trace: error.stack
    });
    return [];
  }
};

export const getMappingsForUser = async (userEmail: string): Promise<IUserAppMapping[]> => {
  try {
    const items = getCollection<IUserAppMapping>(COLLECTION_NAME);
    const target = userEmail.toLowerCase();
    return items.filter(m => m.IsActive && m.UserMailId?.toLowerCase().includes(target));
  } catch (error: any) {
    await logError({
      Title: 'Error fetching mappings for user',
      Error_Source: 'Frontend',
      Component_Name: 'UserAppMappingService',
      Function_Name: 'getMappingsForUser',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ userEmail })
    });
    return [];
  }
};

export const getMappingsForApp = async (applicationId: number): Promise<IUserAppMapping[]> => {
  try {
    const items = getCollection<IUserAppMapping>(COLLECTION_NAME);
    return items.filter(m => m.IsActive && Number(m.ApplicationId) === Number(applicationId));
  } catch (error: any) {
    await logError({
      Title: 'Error fetching mappings for app',
      Error_Source: 'Frontend',
      Component_Name: 'UserAppMappingService',
      Function_Name: 'getMappingsForApp',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ applicationId })
    });
    return [];
  }
};

export const addUserAppMapping = async (payload: IUserAppMappingPayload): Promise<void> => {
  try {
    addItemToCollection(COLLECTION_NAME, payload);
  } catch (error: any) {
    await logError({
      Title: 'Error adding user-app mapping',
      Error_Source: 'Frontend',
      Component_Name: 'UserAppMappingService',
      Function_Name: 'addUserAppMapping',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify(payload)
    });
    throw error;
  }
};

export const deactivateMapping = async (id: number): Promise<void> => {
  try {
    updateItemInCollection(COLLECTION_NAME, id, {
      IsActive: false,
      MappedOn: new Date().toISOString()
    });
  } catch (error: any) {
    await logError({
      Title: 'Error deactivating user-app mapping',
      Error_Source: 'Frontend',
      Component_Name: 'UserAppMappingService',
      Function_Name: 'deactivateMapping',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ id })
    });
    throw error;
  }
};

export const deleteMappings = async (ids: number[]): Promise<void> => {
  try {
    let items = getCollection<IUserAppMapping>(COLLECTION_NAME);
    const idSet = new Set(ids);
    items = items.filter(it => !idSet.has(it.Id));
    saveCollection(COLLECTION_NAME, items);
  } catch (error: any) {
    await logError({
      Title: 'Error deleting user-app mappings',
      Error_Source: 'Frontend',
      Component_Name: 'UserAppMappingService',
      Function_Name: 'deleteMappings',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ ids })
    });
    throw error;
  }
};

export const saveUserAppMapping = async (
  appId: number,
  appName: string,
  userEmails: string[],
  actorName: string
): Promise<void> => {
  try {
    const items = getCollection<IUserAppMapping>(COLLECTION_NAME);
    const existing = items.find(m => Number(m.ApplicationId) === Number(appId));

    const emailsCSV = userEmails.join(',');
    const payload = {
      Title: `${appName} Mapping`,
      UserMailId: emailsCSV,
      ApplicationId: appId,
      ApplicationName: appName,
      IsActive: true,
      MappedBy: actorName,
      MappedOn: new Date().toISOString()
    };

    if (existing) {
      updateItemInCollection(COLLECTION_NAME, existing.Id, payload);
    } else {
      addItemToCollection(COLLECTION_NAME, payload);
    }
  } catch (error: any) {
    await logError({
      Title: 'Error saving user-app mapping',
      Error_Source: 'Frontend',
      Component_Name: 'UserAppMappingService',
      Function_Name: 'saveUserAppMapping',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ appId, appName, userEmails, actorName })
    });
    throw error;
  }
};

export const deleteUserAppMapping = async (appId: number): Promise<void> => {
  try {
    const items = getCollection<IUserAppMapping>(COLLECTION_NAME);
    const match = items.find(m => Number(m.ApplicationId) === Number(appId));
    if (match) {
      deleteItemFromCollection(COLLECTION_NAME, match.Id);
    }
  } catch (error: any) {
    await logError({
      Title: 'Error deleting user-app mapping by appId',
      Error_Source: 'Frontend',
      Component_Name: 'UserAppMappingService',
      Function_Name: 'deleteUserAppMapping',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ appId })
    });
    throw error;
  }
};
