import { IUserConfig, IUserConfigPayload } from '../Types/UserConfigTypes';
import { logError } from './LoggerService';
import {
  getCollection,
  addItemToCollection,
  updateItemInCollection,
  saveCollection
} from '../Config/storage';

const COLLECTION_NAME = 'UOP_UserConfiguration';

export const getUserConfigs = async (): Promise<IUserConfig[]> => {
  try {
    const items = getCollection<IUserConfig>(COLLECTION_NAME);
    return items.filter(u => u.IsActive !== false);
  } catch (error: any) {
    await logError({
      Title: 'Error fetching user configs',
      Error_Source: 'Frontend',
      Component_Name: 'UserConfigService',
      Function_Name: 'getUserConfigs',
      Error_Message: error.message,
      Stack_Trace: error.stack
    });
    return [];
  }
};

export const addUserConfig = async (payload: IUserConfigPayload): Promise<void> => {
  try {
    addItemToCollection(COLLECTION_NAME, payload);
  } catch (error: any) {
    await logError({
      Title: 'Error adding user config',
      Error_Source: 'Frontend',
      Component_Name: 'UserConfigService',
      Function_Name: 'addUserConfig',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify(payload)
    });
    throw error;
  }
};

export const updateUserConfig = async (id: number, payload: Partial<IUserConfigPayload>): Promise<void> => {
  try {
    updateItemInCollection(COLLECTION_NAME, id, payload);
  } catch (error: any) {
    await logError({
      Title: 'Error updating user config',
      Error_Source: 'Frontend',
      Component_Name: 'UserConfigService',
      Function_Name: 'updateUserConfig',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ id, payload })
    });
    throw error;
  }
};

export const deactivateUser = async (id: number): Promise<void> => {
  try {
    updateItemInCollection(COLLECTION_NAME, id, { IsActive: false });
  } catch (error: any) {
    await logError({
      Title: 'Error deactivating user',
      Error_Source: 'Frontend',
      Component_Name: 'UserConfigService',
      Function_Name: 'deactivateUser',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ id })
    });
    throw error;
  }
};

export const deleteUsers = async (ids: number[]): Promise<void> => {
  try {
    let items = getCollection<IUserConfig>(COLLECTION_NAME);
    const idSet = new Set(ids);
    items = items.filter(it => !idSet.has(it.Id));
    saveCollection(COLLECTION_NAME, items);
  } catch (error: any) {
    await logError({
      Title: 'Error deleting user configs',
      Error_Source: 'Frontend',
      Component_Name: 'UserConfigService',
      Function_Name: 'deleteUsers',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ ids })
    });
    throw error;
  }
};
