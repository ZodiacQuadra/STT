import { IUserProfile, UOPUserAccess } from '../Types/common';
import { IUserConfig } from '../Types/UserConfigTypes';
import { getCollection } from '../Config/storage';
import { logError } from './LoggerService';

const COLLECTION_USER_CONFIG = 'UOP_UserConfiguration';
const COLLECTION_AD_USERS = 'UOP_ADUsers';

export const getCurrentUser = async (): Promise<IUserProfile> => {
  try {
    const saved = localStorage.getItem('UOP_ACTIVE_USER');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        id: parsed.aadId || 'aad-admin-1',
        displayName: parsed.name || 'Admin User',
        mail: parsed.email || 'admin@sttgdc.com',
        userPrincipalName: parsed.email || 'admin@sttgdc.com',
        jobTitle: parsed.role === 'Admin' ? 'Portal Administrator' : 'Enterprise User',
        department: 'Global IT & Operations',
        officeLocation: 'HQ',
        mobilePhone: '+65 6789 0100'
      };
    }

    return {
      id: 'aad-admin-1',
      displayName: 'Admin User',
      mail: 'admin@sttgdc.com',
      userPrincipalName: 'admin@sttgdc.com',
      jobTitle: 'Portal Administrator',
      department: 'Global IT & Operations',
      officeLocation: 'HQ',
      mobilePhone: '+65 6789 0100'
    };
  } catch (error: any) {
    console.error('Error getting current user:', error);
    await logError({
      Title: 'Error getting current user',
      Error_Source: 'Frontend',
      Component_Name: 'commonService',
      Function_Name: 'getCurrentUser',
      Error_Message: error.message,
      Stack_Trace: error.stack
    });
    throw error;
  }
};

export const getAllADUsers = async (): Promise<IUserProfile[]> => {
  try {
    const adUsers = getCollection<any>(COLLECTION_AD_USERS);
    return adUsers.map(u => ({
      id: u.AD_ObjectId || `id-${u.Id}`,
      displayName: u.Title || u.Username,
      mail: u.Email || u.UserPrincipalName,
      userPrincipalName: u.UserPrincipalName || u.Email,
      jobTitle: u.JobTitle || 'Staff',
      department: u.Department || 'Operations',
      officeLocation: u.OfficeLocation || 'HQ',
      mobilePhone: u.MobilePhone || ''
    }));
  } catch (error: any) {
    await logError({
      Title: 'Error fetching AD users',
      Error_Source: 'Frontend',
      Component_Name: 'commonService',
      Function_Name: 'getAllADUsers',
      Error_Message: error.message,
      Stack_Trace: error.stack
    });
    return [];
  }
};

export const getUserAccess = async (): Promise<UOPUserAccess> => {
  try {
    const user = await getCurrentUser();
    const currentEmail = (user.mail || user.userPrincipalName || '').toLowerCase();

    const configUsers = getCollection<IUserConfig>(COLLECTION_USER_CONFIG);
    const match = configUsers.find(
      item => item.UserMailId?.toLowerCase() === currentEmail && item.IsActive !== false
    );

    return match ? 'Admin' : 'User';
  } catch (error: any) {
    await logError({
      Title: 'Error fetching user access',
      Error_Source: 'Frontend',
      Component_Name: 'commonService',
      Function_Name: 'getUserAccess',
      Error_Message: error.message,
      Stack_Trace: error.stack
    });
    return 'User';
  }
};

export const getSiteUrl = async (): Promise<string> => {
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
};

export const getUserProfilePhoto = async (email: string): Promise<string | null> => {
  return null;
};
