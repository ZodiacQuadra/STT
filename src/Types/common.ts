// Shared / common types used across UOP services and components

export interface IUserProfile {
  id: string;
  displayName: string;
  mail: string;
  mobilePhone?: string;
  jobTitle?: string;
  officeLocation?: string;
  surname?: string;
  userPrincipalName: string;
  mailNickname?: string;
  department?: string;
}

export type UOPUserAccess = 'Admin' | 'User';

export interface INavItem {
  key: string;
  label: string;
  Icon?: React.ReactNode;
  onclick?: () => void;
  children?: INavItem[];
}
