import { IAppCategory } from '../Types/ApplicationTypes';
import { logError } from './LoggerService';
import {
  getCollection,
  addItemToCollection,
  updateItemInCollection,
  deleteItemFromCollection
} from '../Config/storage';

const COLLECTION_NAME = 'UOP_AppCategories';

export const getAppCategories = async (onlyActive: boolean = true): Promise<IAppCategory[]> => {
  try {
    let items = getCollection<IAppCategory>(COLLECTION_NAME);
    if (onlyActive) {
      items = items.filter(cat => cat.IsActive !== false);
    }
    return [...items].sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));
  } catch (error: any) {
    await logError({
      Title: 'Error fetching app categories',
      Error_Source: 'Frontend',
      Component_Name: 'CategoryService',
      Function_Name: 'getAppCategories',
      Error_Message: error.message,
      Stack_Trace: error.stack
    });
    return [];
  }
};

export const addAppCategory = async (payload: Omit<IAppCategory, 'Id'>): Promise<IAppCategory> => {
  try {
    const newCategory = addItemToCollection<IAppCategory>(COLLECTION_NAME, payload);
    return newCategory;
  } catch (error: any) {
    await logError({
      Title: 'Error adding app category',
      Error_Source: 'Frontend',
      Component_Name: 'CategoryService',
      Function_Name: 'addAppCategory',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify(payload)
    });
    throw error;
  }
};

export const updateAppCategory = async (id: number, payload: Partial<IAppCategory>): Promise<void> => {
  try {
    updateItemInCollection<IAppCategory>(COLLECTION_NAME, id, payload);
  } catch (error: any) {
    await logError({
      Title: 'Error updating app category',
      Error_Source: 'Frontend',
      Component_Name: 'CategoryService',
      Function_Name: 'updateAppCategory',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ id, payload })
    });
    throw error;
  }
};

export const deactivateAppCategory = async (id: number): Promise<void> => {
  try {
    updateItemInCollection<IAppCategory>(COLLECTION_NAME, id, { IsActive: false });
  } catch (error: any) {
    await logError({
      Title: 'Error deactivating app category',
      Error_Source: 'Frontend',
      Component_Name: 'CategoryService',
      Function_Name: 'deactivateAppCategory',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ id })
    });
    throw error;
  }
};

export const deleteAppCategory = async (id: number): Promise<void> => {
  try {
    deleteItemFromCollection(COLLECTION_NAME, id);
  } catch (error: any) {
    await logError({
      Title: 'Error permanently deleting app category',
      Error_Source: 'Frontend',
      Component_Name: 'CategoryService',
      Function_Name: 'deleteAppCategory',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ id })
    });
    throw error;
  }
};
