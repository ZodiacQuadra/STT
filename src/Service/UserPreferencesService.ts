import { IUserPreferences, IUserPreferencesPayload } from '../Types/UserPreferencesTypes';
import { logError } from './LoggerService';
import {
  getCollection,
  addItemToCollection,
  updateItemInCollection
} from '../Config/storage';

const COLLECTION_NAME = 'UOP_UserPreferences';

export const MAX_RECENT_LENGTH = 100;

export const parsePrefIds = (csv: string | undefined | null): number[] => {
  if (!csv || csv.trim() === '') return [];
  return csv
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n));
};

export const serializePrefIds = (ids: number[]): string => {
  return ids.join(',');
};

export const getUserPreferences = async (adObjectId: string): Promise<IUserPreferences | null> => {
  if (!adObjectId) return null;
  try {
    const items = getCollection<IUserPreferences>(COLLECTION_NAME);
    const match = items.find(p => (p.AAD_ObjectId || '').toLowerCase() === adObjectId.toLowerCase());
    return match || null;
  } catch (error: any) {
    console.error('Error fetching user preferences:', error);
    await logError({
      Title: 'Error fetching user preferences',
      Error_Source: 'Frontend',
      Component_Name: 'UserPreferencesService',
      Function_Name: 'getUserPreferences',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ adObjectId })
    });
    return null;
  }
};

export const saveUserPreferences = async (
  spItemId: number | null,
  adObjectId: string,
  payload: Partial<IUserPreferencesPayload>
): Promise<number | null> => {
  if (!adObjectId) return null;
  try {
    const fullPayload: IUserPreferencesPayload = {
      ...payload,
      AAD_ObjectId: adObjectId
    };

    if (spItemId === null) {
      const items = getCollection<IUserPreferences>(COLLECTION_NAME);
      const existing = items.find(p => (p.AAD_ObjectId || '').toLowerCase() === adObjectId.toLowerCase());
      if (existing) {
        updateItemInCollection(COLLECTION_NAME, existing.Id, fullPayload);
        return existing.Id;
      }
      const created = addItemToCollection<IUserPreferences>(COLLECTION_NAME, fullPayload);
      return created.Id;
    } else {
      updateItemInCollection(COLLECTION_NAME, spItemId, fullPayload);
      return spItemId;
    }
  } catch (error: any) {
    console.error('Error saving user preferences:', error);
    await logError({
      Title: 'Error saving user preferences',
      Error_Source: 'Frontend',
      Component_Name: 'UserPreferencesService',
      Function_Name: 'saveUserPreferences',
      Error_Message: error.message,
      Stack_Trace: error.stack,
      Request_Payload: JSON.stringify({ spItemId, adObjectId, payload })
    });
    return null;
  }
};

export interface IUsageRecord {
  frequencies: { [appId: string]: number };
  lastNormalizedAt: string;
}

const DECAY_INTERVAL_DAYS = 30;
const THRESHOLD = 100;
const SCALE_FACTOR = 2;

export const parseUsageRecord = (jsonStr: string | null | undefined): IUsageRecord => {
  const defaultRecord: IUsageRecord = {
    frequencies: {},
    lastNormalizedAt: new Date().toISOString()
  };

  if (!jsonStr || jsonStr.trim() === '') return defaultRecord;
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      frequencies: parsed.frequencies || {},
      lastNormalizedAt: parsed.lastNormalizedAt || defaultRecord.lastNormalizedAt
    };
  } catch (e) {
    return defaultRecord;
  }
};

export const recordAppLaunch = (currentJson: string | null | undefined, appId: number): string => {
  const record = parseUsageRecord(currentJson);
  const key = appId.toString();
  const now = new Date();

  // 1. Time-based decay check
  const lastDecay = new Date(record.lastNormalizedAt);
  const diffTime = Math.abs(now.getTime() - lastDecay.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= DECAY_INTERVAL_DAYS) {
    const decayCycles = Math.floor(diffDays / DECAY_INTERVAL_DAYS);

    for (let i = 0; i < decayCycles; i++) {
      Object.keys(record.frequencies).forEach(k => {
        const decayed = Math.floor(record.frequencies[k] / SCALE_FACTOR);
        if (decayed > 0) {
          record.frequencies[k] = decayed;
        } else {
          delete record.frequencies[k];
        }
      });
    }

    const nextDecayTime = lastDecay.getTime() + (decayCycles * DECAY_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
    record.lastNormalizedAt = new Date(nextDecayTime).toISOString();
  }

  // 2. Increment frequency
  record.frequencies[key] = (record.frequencies[key] || 0) + 1;

  // 3. Threshold-based decay
  if (record.frequencies[key] >= THRESHOLD) {
    Object.keys(record.frequencies).forEach(k => {
      const decayed = Math.floor(record.frequencies[k] / SCALE_FACTOR);
      if (decayed > 0) {
        record.frequencies[k] = decayed;
      } else {
        delete record.frequencies[k];
      }
    });
  }

  return JSON.stringify(record);
};
