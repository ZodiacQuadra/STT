// Local Persistent Storage Layer for STT GDC Unified Operations Portal
const STORAGE_PREFIX = 'STT_UOP_LOCAL_';

export const INITIAL_CATEGORIES = [
  { Id: 1, Title: 'Cloud Platforms', Description: 'Cloud infrastructure & hosting platforms', SortOrder: 1, BgColor: '#e0f2fe', TextColor: '#0369a1', IconName: 'cloud', IsActive: true },
  { Id: 2, Title: 'Productivity & Office', Description: 'Enterprise workplace tools and communication', SortOrder: 2, BgColor: '#fef3c7', TextColor: '#b45309', IconName: 'briefcase', IsActive: true },
  { Id: 3, Title: 'Enterprise ERP', Description: 'Core business management and financial ERP', SortOrder: 3, BgColor: '#dcfce7', TextColor: '#15803d', IconName: 'building', IsActive: true },
  { Id: 4, Title: 'CRM & Sales', Description: 'Customer relationships, leads and support', SortOrder: 4, BgColor: '#fce7f3', TextColor: '#be185d', IconName: 'people', IsActive: true },
  { Id: 5, Title: 'IT Operations & Monitoring', Description: 'Systems diagnostics, APM and monitoring', SortOrder: 5, BgColor: '#ede9fe', TextColor: '#6d28d9', IconName: 'speedometer2', IsActive: true },
  { Id: 6, Title: 'Security & Access', Description: 'Identity governance, SSO and access management', SortOrder: 6, BgColor: '#fee2e2', TextColor: '#b91c1c', IconName: 'shield-lock', IsActive: true }
];

export const INITIAL_APPLICATIONS = [
  {
    Id: 1,
    Title: 'AWS Management Console',
    Description: 'Access and manage all Amazon Web Services cloud resources and computing instances.',
    AppURL: 'https://aws.amazon.com/console/',
    Category: 'Cloud Platforms',
    Status: 'Active',
    SortOrder: 1,
    IsVisibleToAll: true,
    IconName: 'cloud-fill',
    CreatedDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    LastUpdatedDate: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    Id: 2,
    Title: 'Microsoft 365 Hub',
    Description: 'Productivity suite including Outlook, Teams, OneDrive, SharePoint, and Office tools.',
    AppURL: 'https://www.office.com/',
    Category: 'Productivity & Office',
    Status: 'Active',
    SortOrder: 2,
    IsVisibleToAll: true,
    IconName: 'microsoft',
    CreatedDate: new Date(Date.now() - 25 * 86400000).toISOString(),
    LastUpdatedDate: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    Id: 3,
    Title: 'Microsoft Azure Portal',
    Description: 'Build, manage, and monitor cloud apps, virtual networks, and hybrid infrastructure.',
    AppURL: 'https://portal.azure.com/',
    Category: 'Cloud Platforms',
    Status: 'Active',
    SortOrder: 3,
    IsVisibleToAll: true,
    IconName: 'cloud-arrow-up-fill',
    CreatedDate: new Date(Date.now() - 20 * 86400000).toISOString(),
    LastUpdatedDate: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    Id: 4,
    Title: 'SAP S/4HANA ERP',
    Description: 'Next-generation intelligent ERP system for corporate operations and finance.',
    AppURL: 'https://www.sap.com/',
    Category: 'Enterprise ERP',
    Status: 'Active',
    SortOrder: 4,
    IsVisibleToAll: true,
    IconName: 'gear-wide-connected',
    CreatedDate: new Date(Date.now() - 15 * 86400000).toISOString(),
    LastUpdatedDate: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    Id: 5,
    Title: 'Salesforce CRM',
    Description: 'Manage sales pipelines, customer accounts, opportunities, and support tickets.',
    AppURL: 'https://login.salesforce.com/',
    Category: 'CRM & Sales',
    Status: 'Active',
    SortOrder: 5,
    IsVisibleToAll: true,
    IconName: 'person-lines-fill',
    CreatedDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    LastUpdatedDate: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    Id: 6,
    Title: 'Oracle Cloud Infrastructure',
    Description: 'Autonomous services, high-performance computing, and enterprise database clusters.',
    AppURL: 'https://cloud.oracle.com/',
    Category: 'Cloud Platforms',
    Status: 'Active',
    SortOrder: 6,
    IsVisibleToAll: true,
    IconName: 'database-fill-gear',
    CreatedDate: new Date(Date.now() - 8 * 86400000).toISOString(),
    LastUpdatedDate: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    Id: 7,
    Title: 'Datadog APM',
    Description: 'Full-stack cloud monitoring, real-time observability, and telemetry diagnostics.',
    AppURL: 'https://app.datadoghq.com/',
    Category: 'IT Operations & Monitoring',
    Status: 'Active',
    SortOrder: 7,
    IsVisibleToAll: true,
    IconName: 'activity',
    CreatedDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    LastUpdatedDate: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    Id: 8,
    Title: 'Okta Identity Governance',
    Description: 'Single sign-on, multi-factor authentication and user lifecycle management.',
    AppURL: 'https://www.okta.com/',
    Category: 'Security & Access',
    Status: 'Active',
    SortOrder: 8,
    IsVisibleToAll: true,
    IconName: 'shield-lock-fill',
    CreatedDate: new Date(Date.now() - 4 * 86400000).toISOString(),
    LastUpdatedDate: new Date(Date.now() - 1 * 86400000).toISOString()
  }
];

export const INITIAL_USER_CONFIGS = [
  { Id: 1, Title: 'Admin User', UserMailId: 'admin@sttgdc.com', Username: 'Admin User', IsActive: true },
  { Id: 2, Title: 'Sarah Chen', UserMailId: 'sarah.chen@sttgdc.com', Username: 'Sarah Chen', IsActive: true },
  { Id: 3, Title: 'Michael Rodriguez', UserMailId: 'michael.r@sttgdc.com', Username: 'Michael Rodriguez', IsActive: true },
  { Id: 4, Title: 'Priya Sharma', UserMailId: 'priya.sharma@sttgdc.com', Username: 'Priya Sharma', IsActive: true }
];

export const INITIAL_AD_USERS = [
  {
    Id: 1,
    Title: 'Admin User',
    UserPrincipalName: 'admin@sttgdc.com',
    Email: 'admin@sttgdc.com',
    AD_ObjectId: 'aad-admin-1',
    Department: 'Global IT & Operations',
    JobTitle: 'Portal Administrator',
    MobilePhone: '+65 6789 0100',
    OfficeLocation: 'STT Tai Seng DC1 (HQ)',
    IsActive: true
  },
  {
    Id: 2,
    Title: 'Sarah Chen',
    UserPrincipalName: 'sarah.chen@sttgdc.com',
    Email: 'sarah.chen@sttgdc.com',
    AD_ObjectId: 'aad-user-2',
    Department: 'Operations',
    JobTitle: 'Data Center Lead',
    MobilePhone: '+65 6789 0101',
    OfficeLocation: 'STT Defu 1',
    IsActive: true
  },
  {
    Id: 3,
    Title: 'Michael Rodriguez',
    UserPrincipalName: 'michael.r@sttgdc.com',
    Email: 'michael.r@sttgdc.com',
    AD_ObjectId: 'aad-user-3',
    Department: 'Engineering',
    JobTitle: 'Principal Cloud Architect',
    MobilePhone: '+44 20 7946 0102',
    OfficeLocation: 'STT London DC2',
    IsActive: true
  },
  {
    Id: 4,
    Title: 'Priya Sharma',
    UserPrincipalName: 'priya.sharma@sttgdc.com',
    Email: 'priya.sharma@sttgdc.com',
    AD_ObjectId: 'aad-user-4',
    Department: 'Finance & Planning',
    JobTitle: 'Financial Planning Manager',
    MobilePhone: '+91 22 6123 0103',
    OfficeLocation: 'STT Mumbai DC1',
    IsActive: true
  }
];

export const INITIAL_USER_PREFERENCES = [
  {
    Id: 1,
    Title: 'Admin User',
    UserEmail: 'admin@sttgdc.com',
    AAD_ObjectId: 'aad-admin-1',
    FavouriteApps: '1,2,3',
    RecentApps: '1,2,5',
    MostUsedApps: '{"1":24,"2":18,"3":10,"5":8}'
  }
];

export const INITIAL_AUDIT_LOGS = [
  {
    Id: 1,
    Title: 'User Login',
    EventType: 'Login',
    ActorName: 'Admin User',
    ActorEmail: 'admin@sttgdc.com',
    Description: 'Admin User logged into the Unified Operations Portal.',
    Timestamp: new Date(Date.now() - 7200000).toISOString()
  },
  {
    Id: 2,
    Title: 'Application Launched: AWS Management Console',
    EventType: 'App Launched',
    ActorName: 'Admin User',
    ActorEmail: 'admin@sttgdc.com',
    TargetEntity: 'AWS Management Console',
    TargetEntityId: 1,
    Description: 'Admin User launched application AWS Management Console.',
    Timestamp: new Date(Date.now() - 3600000).toISOString()
  }
];

export const getCollection = <T = any>(name: string): T[] => {
  const key = STORAGE_PREFIX + name;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored) as T[];
    } catch {
      // parse failed, re-seed
    }
  }

  let defaults: any[] = [];
  if (name === 'UOP_AppCategories') defaults = INITIAL_CATEGORIES;
  else if (name === 'UOP_Applications') defaults = INITIAL_APPLICATIONS;
  else if (name === 'UOP_UserConfiguration') defaults = INITIAL_USER_CONFIGS;
  else if (name === 'UOP_ADUsers') defaults = INITIAL_AD_USERS;
  else if (name === 'UOP_UserPreferences') defaults = INITIAL_USER_PREFERENCES;
  else if (name === 'UOP_AuditLogs' || name === 'UOP_ActivityLogs') defaults = INITIAL_AUDIT_LOGS;
  else if (name === 'UOP_UserAppMapping') defaults = [];
  else if (name === 'UOP_ErrorLogs') defaults = [];

  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults as T[];
};

export const saveCollection = <T = any>(name: string, items: T[]): void => {
  const key = STORAGE_PREFIX + name;
  localStorage.setItem(key, JSON.stringify(items));
};

export const addItemToCollection = <T extends { Id?: number }>(name: string, payload: any): T => {
  const items = getCollection(name);
  const maxId = items.reduce((max: number, it: any) => Math.max(max, Number(it.Id) || 0), 0);
  const now = new Date().toISOString();
  const newItem: any = {
    Id: maxId + 1,
    ...payload,
    CreatedDate: payload.CreatedDate || now,
    LastUpdatedDate: now
  };
  items.push(newItem);
  saveCollection(name, items);
  return newItem;
};

export const updateItemInCollection = <T extends { Id?: number }>(name: string, id: number, payload: any): T | null => {
  const items = getCollection(name);
  const idx = items.findIndex((it: any) => Number(it.Id) === Number(id));
  if (idx === -1) return null;
  items[idx] = {
    ...items[idx],
    ...payload,
    LastUpdatedDate: new Date().toISOString()
  };
  saveCollection(name, items);
  return items[idx];
};

export const deleteItemFromCollection = (name: string, id: number): void => {
  let items = getCollection(name);
  items = items.filter((it: any) => Number(it.Id) !== Number(id));
  saveCollection(name, items);
};
