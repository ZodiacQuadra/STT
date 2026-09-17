import { IADUser, IADUserPayload } from '../Types/ADUsersTypes';
import { logError } from './LoggerService';
import {
  getCollection,
  addItemToCollection,
  updateItemInCollection
} from '../Config/storage';

const COLLECTION_NAME = 'UOP_ADUsers';

export const getADUsers = async (): Promise<IADUser[]> => {
  try {
    const items = getCollection<IADUser>(COLLECTION_NAME);
    return [...items].sort((a, b) => (a.Title || '').localeCompare(b.Title || ''));
  } catch (error: any) {
    await logError({
      Title: 'Error fetching AD users',
      Error_Source: 'Frontend',
      Component_Name: 'ADUsersService',
      Function_Name: 'getADUsers',
      Error_Message: error.message,
      Stack_Trace: error.stack
    });
    return [];
  }
};

export const addADUser = async (payload: IADUserPayload): Promise<void> => {
  try {
    addItemToCollection(COLLECTION_NAME, payload);
  } catch (error: any) {
    await logError({
      Title: 'Error adding AD user',
      Error_Source: 'Frontend',
      Component_Name: 'ADUsersService',
      Function_Name: 'addADUser',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify(payload)
    });
    throw error;
  }
};

export const updateADUser = async (id: number, payload: Partial<IADUserPayload>): Promise<void> => {
  try {
    updateItemInCollection(COLLECTION_NAME, id, payload);
  } catch (error: any) {
    await logError({
      Title: 'Error updating AD user',
      Error_Source: 'Frontend',
      Component_Name: 'ADUsersService',
      Function_Name: 'updateADUser',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ id, payload })
    });
    throw error;
  }
};

export const syncADUsersToList = async (graphUsers: IADUserPayload[]): Promise<void> => {
  try {
    const existing = await getADUsers();
    const existingMap = new Map(existing.map(u => [(u.UserPrincipalName || '').toLowerCase(), u]));
    const timestamp = new Date().toISOString();

    for (const graphUser of graphUsers) {
      const key = graphUser.UserPrincipalName?.toLowerCase();
      if (!key) continue;

      const payload: IADUserPayload = { ...graphUser, LastSyncedAt: timestamp };
      const existingItem = existingMap.get(key);

      if (existingItem) {
        updateItemInCollection(COLLECTION_NAME, existingItem.Id, payload);
      } else {
        addItemToCollection(COLLECTION_NAME, payload);
      }
    }
  } catch (error: any) {
    await logError({
      Title: 'Error syncing AD users',
      Error_Source: 'Frontend',
      Component_Name: 'ADUsersService',
      Function_Name: 'syncADUsersToList',
      Error_Message: error.message,
      Stack_Trace: error.stack
    });
    throw error;
  }
};
