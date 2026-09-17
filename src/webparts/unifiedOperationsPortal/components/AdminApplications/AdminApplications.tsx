import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import styles from './AdminApplications.module.scss';
import { IADUser } from '../../../../Types/ADUsersTypes';
import { IApplicationWithUsers, AppCategory, AppStatus, IApplicationPayload, IAppCategory } from '../../../../Types/ApplicationTypes';
import { getADUsers } from '../../../../Service/ADUsersService';
import {
  getApplications,
  addApplication,
  updateApplication,
  deleteApplication,
  getAppIconsMap,
  updateApplicationCategoryName,
  getNextSortOrder,
  applicationExists
} from '../../../../Service/ApplicationService';
import { writeAuditLog } from '../../../../Service/AuditLogService';
import { getAppCategories, addAppCategory, updateAppCategory, deleteAppCategory } from '../../../../Service/CategoryService';
import bootstrapIconsMap from 'bootstrap-icons/font/bootstrap-icons.json';

export interface IAdminApplicationsProps {
  context?: any;
  applications: IApplicationWithUsers[];
  categories: IAppCategory[];
  setApplications: React.Dispatch<React.SetStateAction<IApplicationWithUsers[]>>;
  setCategories: React.Dispatch<React.SetStateAction<IAppCategory[]>>;
  isDarkMode?: boolean;
}

const PRESET_ICONS = [
  'bar-chart-line', 'file-earmark-lock', 'shield-lock', 'shield-check', 'person-badge', 'graph-up-arrow',
  'file-earmark-text', 'pc-display', 'people', 'envelope',
  'calendar-check', 'activity', 'person-workspace', 'tools', 'currency-dollar', 'link',
  'folder', 'arrow-repeat', 'grid', 'bar-chart-steps', 'graph-down', 'bug',
  'search', 'clipboard2-check', 'hourglass-split', 'check-circle', 'exclamation-triangle', 'info-circle'
];

const ALL_BOOTSTRAP_ICONS: string[] = Object.keys(bootstrapIconsMap);

const ICON_SEARCH_GROUPS: Record<string, string[]> = {
  'Business Analytics': [
    'bar-chart-line', 'graph-up-arrow', 'activity', 'search',
    'bar-chart', 'bar-chart-steps', 'pie-chart', 'pie-chart-fill', 'graph-up', 'speedometer2', 'clipboard-data', 'clipboard2-data', 'lightbulb', 'compass'
  ],
  'Process Flow': [
    'arrow-repeat', 'link', 'folder',
    'diagram-2', 'diagram-2-fill', 'diagram-3', 'diagram-3-fill', 'kanban', 'kanban-fill', 'share', 'shuffle', 'signpost', 'signpost-split'
  ],
  'Project Management': [
    'calendar-check', 'person-workspace', 'person-badge', 'clipboard2-check', 'folder',
    'kanban', 'list-task', 'list-check', 'list-columns', 'calendar-event', 'calendar-week', 'flag', 'flag-fill', 'trophy', 'person-check'
  ],
  'Maintenance Checks': [
    'tools', 'clipboard2-check', 'hourglass-split', 'check-circle', 'activity',
    'wrench', 'wrench-adjustable', 'screwdriver', 'gear-wide-connected', 'clock-history', 'stopwatch', 'heart-pulse', 'clipboard-pulse', 'clipboard2-pulse', 'journal-check'
  ],
  'Compliance': [
    'shield-check', 'shield-lock', 'file-earmark-lock', 'check-circle', 'clipboard2-check',
    'shield-exclamation', 'shield-fill-check', 'shield-fill-exclamation', 'patch-check', 'patch-exclamation', 'file-earmark-check', 'file-earmark-medical', 'journal-medical', 'award', 'award-fill'
  ],
  'Risk': [
    'exclamation-triangle', 'bug', 'shield-lock', 'hourglass-split', 'graph-down',
    'exclamation-diamond', 'exclamation-octagon', 'shield-exclamation', 'x-octagon', 'bug-fill', 'patch-exclamation', 'thermometer', 'radar', 'bullseye', 'compass'
  ],
  'Testing': [
    'bug', 'check-circle', 'search', 'clipboard2-check', 'info-circle',
    'bug-fill', 'check2-square', 'check2-all', 'ui-checks', 'ui-checks-grid', 'clipboard-check', 'clipboard2-x', 'search-heart', 'magnet', 'vector-pen'
  ]
};

const CATEGORY_PRESET_ICONS = [
  { name: 'grid', label: 'Grid' },
  { name: 'folder', label: 'Folder' },
  { name: 'folder-plus', label: 'Folder+' },
  { name: 'file-earmark-text', label: 'Document' },
  { name: 'file-earmark-check', label: 'Approved' },
  { name: 'bar-chart-line', label: 'Bar Chart' },
  { name: 'graph-up', label: 'Line Chart' },
  { name: 'activity', label: 'Activity' },
  { name: 'speedometer2', label: 'Gauge' },
  { name: 'phone', label: 'Mobile' },
  { name: 'shield', label: 'Shield' },
  { name: 'shield-check', label: 'Secured' },
  { name: 'lock', label: 'Lock' },
  { name: 'key', label: 'Key' },
  { name: 'globe', label: 'Globe' },
  { name: 'geo-alt', label: 'Location' },
  { name: 'house', label: 'Home' },
  { name: 'briefcase', label: 'Business' },
  { name: 'people', label: 'Users' },
  { name: 'person', label: 'User' },
  { name: 'envelope', label: 'Email' },
  { name: 'bell', label: 'Alerts' },
  { name: 'calendar3', label: 'Calendar' },
  { name: 'clock', label: 'Clock' },
  { name: 'rocket-takeoff', label: 'Launch' },
  { name: 'box-arrow-up-right', label: 'External' },
  { name: 'link-45deg', label: 'Link' },
  { name: 'gear', label: 'Settings' },
  { name: 'sliders', label: 'Controls' },
  { name: 'funnel', label: 'Filter' },
  { name: 'list-ul', label: 'List' },
  { name: 'search', label: 'Search' },
  { name: 'eye', label: 'View' },
  { name: 'pencil-square', label: 'Edit' },
  { name: 'star', label: 'Star' },
  { name: 'heart', label: 'Heart' },
  { name: 'ticket-perforated', label: 'Ticket' },
  { name: 'currency-dollar', label: 'Finance' },
  { name: 'book', label: 'Docs' },
  { name: 'info-circle', label: 'Info' },
  { name: 'question-circle', label: 'Help' },
  { name: 'exclamation-circle', label: 'Alert' },
  { name: 'exclamation-triangle', label: 'Warning' },
  { name: 'check-circle', label: 'Done' },
  { name: 'camera-video', label: 'Video' },
  { name: 'arrow-clockwise', label: 'Refresh' },
  { name: 'arrow-repeat', label: 'Sync' },
  { name: 'database', label: 'Database' },
  { name: 'cloud', label: 'Cloud' },
  { name: 'diagram-3', label: 'Network' },
  { name: 'server', label: 'Server' }
];

const CATEGORY_COLOR_PRESETS = [
  { bg: '#7C3AED', text: '#FFFFFF' },
  { bg: '#8A4BFC', text: '#FFFFFF' },
  { bg: '#10B981', text: '#FFFFFF' },
  { bg: '#3B82F6', text: '#FFFFFF' },
  { bg: '#64748B', text: '#FFFFFF' },
  { bg: '#F59E0B', text: '#FFFFFF' }
];

const isValidHttpUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);

    // 1. Verify scheme is http or https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    const hostname = url.hostname;

    // 2. Reject if hostname has consecutive dots (e.g. google..com)
    if (hostname.includes('..')) {
      return false;
    }

    // 3. Reject if there are empty parts in the hostname
    const parts = hostname.split('.');
    const hasEmptyParts = parts.some((part, index) => {
      // Single trailing dot is valid DNS syntax (e.g. google.com.), allow empty last element if so
      if (index === parts.length - 1 && part === '' && hostname.endsWith('.')) {
        return false;
      }
      return part === '';
    });

    if (hasEmptyParts) {
      return false;
    }

    // 4. Validate hostname patterns (Localhost, IPv4, IPv6, or Standard Domain Names)
    if (hostname.toLowerCase() === 'localhost') {
      return true;
    }

    // Match standard IPv4 addresses (0.0.0.0 to 255.255.255.255)
    const ipv4Regex = /^(((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))$/;
    if (ipv4Regex.test(hostname)) {
      return true;
    }

    // Match bracketed IPv6 addresses
    const ipv6Regex = /^\[([a-f0-9:]+)\]$/i;
    if (ipv6Regex.test(hostname)) {
      return true;
    }

    // Match standard domain names (labels separated by single dots, valid TLD of 2+ letters)
    // Label can contain alphanumeric characters and hyphens, but cannot start/end with a hyphen.
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(hostname);

  } catch (_) {
    return false;
  }
};


const AdminApplications: React.FC<IAdminApplicationsProps> = (props) => {
  const { context, applications, categories, setApplications, setCategories, isDarkMode } = props;

  const isDarkEffective = isDarkMode ?? (
    typeof document !== 'undefined' && (
      document.querySelector('.darkTheme') !== null ||
      document.querySelector('[class*="darkTheme"]') !== null ||
      sessionStorage.getItem('STT_Theme_DarkMode') === 'true'
    )
  );

  // ── State ──────────────────────────────────────────────────────────────────
  const [adUsers, setAdUsers] = useState<IADUser[]>([]);
  const [appIcons, setAppIcons] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // View & Tab
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Inactive' | 'Categories'>('All');
  const [selectedCategory, setSelectedCategory] = useState<AppCategory>('Operations');
  const [viewMode, setViewMode] = useState<'Grid' | 'List'>('Grid');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);

  // Add/Edit Application Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [editingApp, setEditingApp] = useState<IApplicationWithUsers | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategory, setFormCategory] = useState<AppCategory>('Operations');
  const [formAppURL, setFormAppURL] = useState<string>('');
  const [formStatus, setFormStatus] = useState<AppStatus>('Active');
  const [formIsVisibleToAll, setFormIsVisibleToAll] = useState<boolean>(true);
  const [formIconFile, setFormIconFile] = useState<File | null>(null);
  const [formIconFileName, setFormIconFileName] = useState<string>('');
  const [formIconName, setFormIconName] = useState<string>(PRESET_ICONS[0] || '');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showIconSuggestions, setShowIconSuggestions] = useState<boolean>(false);

  // Details Drawer
  const [selectedApp, setSelectedApp] = useState<IApplicationWithUsers | null>(null);
  const [detailsTab, setDetailsTab] = useState<'Overview' | 'Users'>('Overview');
  const [detailsUserSearchQuery, setDetailsUserSearchQuery] = useState<string>('');

  // Context Menu
  const [openMenuAppId, setOpenMenuAppId] = useState<number | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // Category Drawer
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState<boolean>(false);
  const [catFormName, setCatFormName] = useState<string>('');
  const [catFormDescription, setCatFormDescription] = useState<string>('');
  const [catFormBgColor, setCatFormBgColor] = useState<string>('#7C3AED');
  const [catFormTextColor, setCatFormTextColor] = useState<string>('#FFFFFF');
  const [catFormIconName, setCatFormIconName] = useState<string>('grid');
  const [catFormIconSearchText, setCatFormIconSearchText] = useState<string>('');
  const [isCategorySaving, setIsCategorySaving] = useState<boolean>(false);
  const [showCategoryIconSuggestions, setShowCategoryIconSuggestions] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<IAppCategory | null>(null);
  const [openMenuCategoryId, setOpenMenuCategoryId] = useState<number | null>(null);
  const [selectedCategoryDetails, setSelectedCategoryDetails] = useState<IAppCategory | null>(null);
  const [catFormIsActive, setCatFormIsActive] = useState<boolean>(true);
  const [deleteCategoryError, setDeleteCategoryError] = useState<{ categoryName: string; count: number; appTitles: string[] } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'app' | 'category' | null;
    targetId: number | null;
    targetTitle: string;
  }>({
    isOpen: false,
    type: null,
    targetId: null,
    targetTitle: ''
  });

  // ── Refs ───────────────────────────────────────────────────────────────────
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const iconSearchRef = useRef<HTMLDivElement>(null);
  const categoryIconSearchRef = useRef<HTMLDivElement>(null);

  // ── Data Loading ───────────────────────────────────────────────────────────
  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [users, iconsMap] = await Promise.all([
        getADUsers(),
        getAppIconsMap()
      ]);
      setAdUsers(users.filter(u => u.IsActive));
      setAppIcons(iconsMap);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading admin applications data:', err);
      setIsLoading(false);
    }
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setOpenMenuAppId(null);
        setOpenMenuCategoryId(null);
      }
      if (iconSearchRef.current && !iconSearchRef.current.contains(event.target as Node)) {
        setShowIconSuggestions(false);
      }
      if (categoryIconSearchRef.current && !categoryIconSearchRef.current.contains(event.target as Node)) {
        setShowCategoryIconSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    void loadData();
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (message: string, durationMs: number = 3000): void => {
    setToast(message);
    setTimeout(() => setToast(null), durationMs);
  };

  // ── Application Drawer Operations ──────────────────────────────────────────
  const openAddDrawer = (): void => {

    setIsDrawerOpen(true);
    setEditingApp(null);
    setFormTitle('');
    setFormDescription('');
    setFormAppURL('');
    setFormStatus('Active');
    setFormIsVisibleToAll(true);
    setFormIconFile(null);
    setFormIconFileName('');
    setFormIconName(PRESET_ICONS[0] || '');
    setSelectedUsers([]);
    setUserSearchQuery('');
    setOpenMenuAppId(null);
    setShowIconSuggestions(false);
    if (categories && categories.length > 0) {
      setFormCategory(categories[0].Title);
    }
  };

  const openEditDrawer = async (app: IApplicationWithUsers): Promise<void> => {
    // Guard against stale state: another admin may have deleted this app
    // after our list was fetched.
    const exists = await applicationExists(app.Id);
    if (!exists) {
      showToast('This application no longer exists. It may have been deleted by another user.', 5000);
      setOpenMenuAppId(null);
      setTimeout(() => {
        setApplications(prev => prev.filter(a => a.Id !== app.Id));
      }, 5000);
      return;
    }

    setIsDrawerOpen(true);
    setEditingApp(app);
    setFormTitle(app.Title);
    setFormDescription(app.Description || '');
    setFormAppURL(app.AppURL);
    setFormStatus(app.Status);
    setFormIsVisibleToAll(app.IsVisibleToAll);
    setFormIconFile(null);
    setFormIconFileName('');
    setFormIconName(app.IconName || '');
    setSelectedUsers(app.assignedUserEmails);
    setUserSearchQuery('');
    setOpenMenuAppId(null);
    setShowIconSuggestions(false);
    const categoryExists = categories.some(c => c.Title === app.Category);
    setFormCategory(categoryExists ? app.Category : (categories[0]?.Title || app.Category));
  };

  const handleIconInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value;
    setFormIconName(val.toLowerCase().trim());
    setShowIconSuggestions(val.trim().length > 0);
  };

  const handleIconInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowIconSuggestions(false);
    }
  };

  const handleIconInputFocus = (): void => {
    if (formIconName.trim().length > 0) {
      setShowIconSuggestions(true);
    }
  };

  const toggleUserSelection = (email: string): void => {
    const lowerEmail = email.toLowerCase();
    setSelectedUsers(prev =>
      prev.includes(lowerEmail) ? prev.filter(e => e !== lowerEmail) : [...prev, lowerEmail]
    );
  };

  const toggleSelectAllUsers = (filteredUserEmails: string[]): void => {
    const allFilteredSelected = filteredUserEmails.every(email => selectedUsers.includes(email));
    if (allFilteredSelected) {
      setSelectedUsers(prev => prev.filter(email => !filteredUserEmails.includes(email)));
    } else {
      const newSelected = [...selectedUsers];
      filteredUserEmails.forEach(email => {
        if (!newSelected.includes(email)) newSelected.push(email);
      });
      setSelectedUsers(newSelected);
    }
  };

  const saveApplication = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const trimmedTitle = formTitle.trim();
    const trimmedUrl = formAppURL.trim();
    if (!trimmedTitle || !trimmedUrl) {
      alert('Application Name and URL are required.');
      return;
    }

    if (!isValidHttpUrl(trimmedUrl)) {
      alert('Please enter a valid application URL (e.g., https://finance.sttelemedia.com).');
      return;
    }

    const isDuplicate = editingApp
      ? applications.some(app => app.Id !== editingApp.Id && app.Title.toLowerCase() === trimmedTitle.toLowerCase())
      : applications.some(app => app.Title.toLowerCase() === trimmedTitle.toLowerCase());

    if (isDuplicate) {
      alert(`There is already an application existing with the name ${trimmedTitle}.`);
      return;
    }

    setIsSaving(true);
    try {
      const user = context.pageContext.user;
      const actorName = user.displayName;
      const actorEmail = user.email || user.loginName;

      const payload: IApplicationPayload = {
        Title: formTitle.trim(),
        Description: formDescription.trim(),
        Category: formCategory,
        AppURL: trimmedUrl,
        Status: formStatus,
        IsVisibleToAll: formIsVisibleToAll,
        IconName: formIconName.trim(),
        AssignedTo: selectedUsers.join(','),
        LastUpdatedDate: new Date().toISOString()
      };

      if (editingApp) {
        await updateApplication(editingApp.Id, payload);
        await writeAuditLog({
          Title: `Updated Application: ${payload.Title}`,
          EventType: 'App Updated',
          ActorName: actorName,
          ActorEmail: actorEmail,
          TargetEntity: payload.Title,
          TargetEntityId: editingApp.Id,
          Description: `Application '${payload.Title}' details were updated by ${actorName}.`,
          Timestamp: new Date().toISOString()
        });
        showToast('Application updated successfully.');
      } else {
        const nextSortOrder = await getNextSortOrder();
        const createPayload: IApplicationPayload = { ...payload, SortOrder: nextSortOrder };
        const newAppId = await addApplication(createPayload);
        await writeAuditLog({
          Title: `Created Application: ${payload.Title}`,
          EventType: 'App Created',
          ActorName: actorName,
          ActorEmail: actorEmail,
          TargetEntity: payload.Title,
          TargetEntityId: newAppId,
          Description: `Application '${payload.Title}' was successfully registered in the portal by ${actorName}.`,
          Timestamp: new Date().toISOString()
        });
        showToast('Application registered successfully.');
      }

      setIsDrawerOpen(false);
      const [freshApps] = await Promise.all([getApplications(), loadData()]);
      setApplications(freshApps);
    } catch (err: any) {
      console.error('Error saving application:', err);
      showToast(err.message || 'An unexpected error occurred. Please try again.', 6000);
    } finally {
      setIsSaving(false);
    }
  };

  const executeDeleteApp = async (id: number, title: string): Promise<void> => {
    try {
      const user = context.pageContext.user;
      const actorName = user.displayName;
      const actorEmail = user.email || user.loginName;
      await deleteApplication(id);
      await writeAuditLog({
        Title: `Deleted Application: ${title}`,
        EventType: 'App Deleted',
        ActorName: actorName,
        ActorEmail: actorEmail,
        TargetEntity: title,
        TargetEntityId: id,
        Description: `Application '${title}' was removed from the operations portal by ${actorName}.`,
        Timestamp: new Date().toISOString()
      });
      showToast('Application deleted successfully.');
      const [freshApps] = await Promise.all([getApplications(), loadData()]);
      setApplications(freshApps);
    } catch (err) {
      console.error('Error deleting application:', err);
      showToast('Failed to delete the application: Item does not exist. It may have been deleted by another user.', 3000);
      setTimeout(() => {
        setApplications(prev => prev.filter(app => app.Id !== id));
      }, 3000);
    }
  };

  const deleteApp = (app: IApplicationWithUsers): void => {
    setDeleteConfirm({
      isOpen: true,
      type: 'app',
      targetId: app.Id,
      targetTitle: app.Title
    });
  };

  // ── Inline Access Toggle in Details Drawer ─────────────────────────────────
  const toggleUserAccessInline = async (userEmail: string): Promise<void> => {
    if (!selectedApp) return;
    const lowerEmail = userEmail.toLowerCase();
    const isCurrentlyAssigned = selectedApp.assignedUserEmails.includes(lowerEmail);
    const updatedEmails = isCurrentlyAssigned
      ? selectedApp.assignedUserEmails.filter(e => e !== lowerEmail)
      : [...selectedApp.assignedUserEmails, lowerEmail];

    try {
      const user = context.pageContext.user;
      const actorName = user.displayName;
      const actorEmail = user.email || user.loginName;
      await updateApplication(selectedApp.Id, { AssignedTo: updatedEmails.join(',') });
      await writeAuditLog({
        Title: isCurrentlyAssigned ? `Revoked Access: ${selectedApp.Title}` : `Granted Access: ${selectedApp.Title}`,
        EventType: 'App Updated',
        ActorName: actorName,
        ActorEmail: actorEmail,
        TargetEntity: selectedApp.Title,
        TargetEntityId: selectedApp.Id,
        Description: `${isCurrentlyAssigned ? 'Revoked access from' : 'Granted access to'} user ${userEmail} for application '${selectedApp.Title}'.`,
        Timestamp: new Date().toISOString()
      });
      const updatedApps = applications.map(app => {
        if (app.Id === selectedApp.Id) {
          return { ...app, assignedUserEmails: updatedEmails, assignedUserCount: updatedEmails.length, AssignedTo: updatedEmails.join(',') };
        }
        return app;
      });
      setApplications(updatedApps);
      setSelectedApp(updatedApps.find(a => a.Id === selectedApp.Id) || null);
      showToast(`Access updated for ${userEmail}`);
    } catch (err) {
      console.error('Error updating access inline:', err);
      showToast('Failed to update access permissions');
    }
  };

  const toggleSelectAllInline = async (filteredUserEmails: string[]): Promise<void> => {
    if (!selectedApp) return;
    const allFilteredSelected = filteredUserEmails.every(email => selectedApp.assignedUserEmails.includes(email));
    let updatedEmails = [...selectedApp.assignedUserEmails];
    if (allFilteredSelected) {
      updatedEmails = updatedEmails.filter(email => !filteredUserEmails.includes(email));
    } else {
      filteredUserEmails.forEach(email => {
        if (!updatedEmails.includes(email)) updatedEmails.push(email);
      });
    }

    try {
      const user = context.pageContext.user;
      const actorName = user.displayName;
      const actorEmail = user.email || user.loginName;
      await updateApplication(selectedApp.Id, { AssignedTo: updatedEmails.join(',') });
      await writeAuditLog({
        Title: `Bulk Access Update: ${selectedApp.Title}`,
        EventType: 'App Updated',
        ActorName: actorName,
        ActorEmail: actorEmail,
        TargetEntity: selectedApp.Title,
        TargetEntityId: selectedApp.Id,
        Description: `Bulk access mappings were updated for application '${selectedApp.Title}' by ${actorName}.`,
        Timestamp: new Date().toISOString()
      });
      const updatedApps = applications.map(app => {
        if (app.Id === selectedApp.Id) {
          return { ...app, assignedUserEmails: updatedEmails, assignedUserCount: updatedEmails.length, AssignedTo: updatedEmails.join(',') };
        }
        return app;
      });
      setApplications(updatedApps);
      setSelectedApp(updatedApps.find(a => a.Id === selectedApp.Id) || null);
      showToast('Bulk permissions updated.');
    } catch (err) {
      console.error('Error updating bulk access inline:', err);
      showToast('Failed to update permissions.');
    }
  };

  // ── Category Operations ────────────────────────────────────────────────────
  const openAddCategoryDrawer = (): void => {
    setIsCategoryDrawerOpen(true);
    setEditingCategory(null);
    setCatFormName('');
    setCatFormDescription('');
    setCatFormBgColor('#7C3AED');
    setCatFormTextColor('#FFFFFF');
    setCatFormIconName('grid');
    setIsCategorySaving(false);
    setShowCategoryIconSuggestions(false);
    setOpenMenuCategoryId(null);
    setCatFormIsActive(true);
  };

  const openEditCategoryDrawer = (cat: IAppCategory): void => {
    setIsCategoryDrawerOpen(true);
    setEditingCategory(cat);
    setCatFormName(cat.Title);
    setCatFormDescription(cat.Description || '');
    setCatFormBgColor(cat.BgColor || '#7C3AED');
    setCatFormTextColor(cat.TextColor || '#FFFFFF');
    setCatFormIconName(cat.IconName || 'grid');
    setIsCategorySaving(false);
    setShowCategoryIconSuggestions(false);
    setOpenMenuCategoryId(null);
    setCatFormIsActive(cat.IsActive);
  };

  const closeCategoryDrawer = (): void => {
    setIsCategoryDrawerOpen(false);
    setEditingCategory(null);
  };

  const saveCategory = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const trimmedName = catFormName.trim();
    if (!trimmedName) {
      alert('Category Name is required.');
      return;
    }

    // Reject characters that break OData filter strings or SharePoint field values
    const invalidCharsRegex = /['"<>#%{}|\\^`]/;
    if (invalidCharsRegex.test(trimmedName)) {
      alert("Category name cannot contain special characters like quotes (' \"), angle brackets (< >), or # % { } | \\ ^ `.");
      return;
    }

    const isDuplicate = editingCategory
      ? categories.some(c => c.Id !== editingCategory.Id && c.Title.toLowerCase() === trimmedName.toLowerCase())
      : categories.some(c => c.Title.toLowerCase() === trimmedName.toLowerCase());

    if (isDuplicate) {
      alert(`There is already a cateogry existing with the name ${trimmedName}.`);
      return;
    }

    setIsCategorySaving(true);
    try {
      const user = context.pageContext.user;
      const actorName = user.displayName;
      const actorEmail = user.email || user.loginName;
      const nextSortOrder = categories.length > 0 ? Math.max(...categories.map(c => c.SortOrder || 0)) + 1 : 1;

      if (editingCategory) {
        const payload: Partial<IAppCategory> = {
          Title: catFormName.trim(),
          Description: catFormDescription.trim(),
          BgColor: catFormBgColor,
          TextColor: catFormTextColor,
          IconName: catFormIconName.trim(),
          IsActive: catFormIsActive
        };
        await updateAppCategory(editingCategory.Id, payload);

        const newTitle = catFormName.trim();
        if (editingCategory.Title !== newTitle) {
          await updateApplicationCategoryName(editingCategory.Title, newTitle);
        }

        await writeAuditLog({
          Title: `Updated Category: ${newTitle}`,
          EventType: 'System',
          ActorName: actorName,
          ActorEmail: actorEmail,
          TargetEntity: newTitle,
          TargetEntityId: editingCategory.Id,
          Description: `App Category '${editingCategory.Title}' was modified and updated by ${actorName}.`,
          Timestamp: new Date().toISOString()
        });
        showToast('Category updated successfully.');
      } else {
        const payload = {
          Title: catFormName.trim(),
          Description: catFormDescription.trim(),
          SortOrder: nextSortOrder,
          BgColor: catFormBgColor,
          TextColor: catFormTextColor,
          IconName: catFormIconName.trim(),
          IsActive: catFormIsActive
        };
        const newCat = await addAppCategory(payload);
        await writeAuditLog({
          Title: `Created Category: ${payload.Title}`,
          EventType: 'System',
          ActorName: actorName,
          ActorEmail: actorEmail,
          TargetEntity: payload.Title,
          TargetEntityId: newCat.Id,
          Description: `App Category '${payload.Title}' was dynamically created by ${actorName}.`,
          Timestamp: new Date().toISOString()
        });
        showToast('Category created successfully.');
      }

      const [activeCats, apps] = await Promise.all([getAppCategories(false), getApplications()]);
      setCategories(activeCats);
      setApplications(apps);
      setIsCategoryDrawerOpen(false);
      setIsCategorySaving(false);
      setEditingCategory(null);
    } catch (err) {
      console.error('Error saving app category:', err);
      setIsCategorySaving(false);
      alert('Failed to save category. Please check Error Logs.');
    }
  };

  const executeDeleteCategory = async (id: number, title: string): Promise<void> => {
    try {
      const user = context.pageContext.user;
      const actorName = user.displayName;
      const actorEmail = user.email || user.loginName;
      await deleteAppCategory(id);
      await updateApplicationCategoryName(title, '');
      await writeAuditLog({
        Title: `Deleted Category: ${title}`,
        EventType: 'System',
        ActorName: actorName,
        ActorEmail: actorEmail,
        TargetEntity: title,
        TargetEntityId: id,
        Description: `App Category '${title}' was permanently deleted by ${actorName}.`,
        Timestamp: new Date().toISOString()
      });
      showToast('Category deleted permanently.');
      const [activeCats, apps] = await Promise.all([getAppCategories(false), getApplications()]);
      setCategories(activeCats);
      setApplications(apps);
      setOpenMenuCategoryId(null);
    } catch (err) {
      console.error('Error deleting category:', err);
      showToast('Failed to delete category.');
    }
  };

  const deleteCategory = (cat: IAppCategory): void => {
    const assignedApps = applications.filter(a => a.Category === cat.Title);
    if (assignedApps.length > 0) {
      setDeleteCategoryError({
        categoryName: cat.Title,
        count: assignedApps.length,
        appTitles: assignedApps.map(a => a.Title)
      });
      setOpenMenuCategoryId(null);
      return;
    }

    setDeleteConfirm({
      isOpen: true,
      type: 'category',
      targetId: cat.Id,
      targetTitle: cat.Title
    });
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getCategoryStyles = (category: AppCategory): React.CSSProperties => {
    const isDark = isDarkEffective;
    const cat = categories.find(c => c.Title === category);
    if (cat && cat.BgColor && cat.TextColor) {
      if (isDark) {
        const darkTextColors: Record<string, string> = {
          '#0369a1': '#38BDF8', // Cloud Platforms
          '#b45309': '#FBBF24', // Productivity & Office
          '#15803d': '#4ADE80', // Enterprise ERP
          '#be185d': '#F472B6', // CRM & Sales
          '#6d28d9': '#C084FC', // IT Operations & Monitoring
          '#b91c1c': '#F87171', // Security & Access
        };
        const brightColor = darkTextColors[cat.TextColor.toLowerCase()] || cat.TextColor;
        const bg = darkTextColors[cat.TextColor.toLowerCase()] ? '#26282E' : (cat.BgColor || '#26282E');
        return { backgroundColor: bg, color: brightColor };
      }
      return { backgroundColor: cat.BgColor, color: cat.TextColor };
    }
    return isDark ? { backgroundColor: '#26282E', color: '#94A3B8' } : { backgroundColor: '#eaeaea', color: '#555555' };
  };

  const getHashCodeColor = (str: string): string => {
    const colors = ['#4299E1', '#48BB78', '#9F7AEA', '#ED8936', '#ED64A6', '#667EEA', '#319795'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const formatDate = (isoString?: string): string => {
    if (!isoString) return '--';
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatRelativeTime = (isoString?: string): string => {
    if (!isoString) return 'Never updated';
    const now = new Date();
    const updated = new Date(isoString);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const getPageNumbers = (page: number, totalPages: number): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) pages.push(i); return pages; }
    pages.push(1);
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  // ── Render Helpers ─────────────────────────────────────────────────────────
  const renderNavbarTabs = (): React.ReactNode => {
    const allCount = applications.length;
    const activeCount = applications.filter(a => a.Status === 'Active').length;
    const inactiveCount = applications.filter(a => a.Status === 'Inactive').length;

    const renderTab = (tab: typeof activeTab, label: string, count: number) => (
      <button
        key={tab}
        className={`${styles.tabItem} ${activeTab === tab ? styles.active : ''}`}
        onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
      >
        {label}
        <span className={styles.countBadge}>{count}</span>
      </button>
    );

    return (
      <div className={styles.tabBar}>
        {renderTab('All', 'All Applications', allCount)}
        {renderTab('Active', 'Active', activeCount)}
        {renderTab('Inactive', 'Inactive', inactiveCount)}
        {renderTab('Categories', 'Categories', categories.length)}
      </div>
    );
  };

  const renderContextMenu = (app: IApplicationWithUsers, openUpward: boolean = false): React.ReactNode => {
    if (openMenuAppId !== app.Id) return null;
    return (
      <div className={`${styles.contextMenu} ${openUpward ? styles.openUpward : ''}`} ref={contextMenuRef}>
        <button className={styles.menuItem} onClick={() => { setSelectedApp(app); setDetailsTab('Overview'); setOpenMenuAppId(null); }}>
          <i className="bi bi-info-circle" style={{ fontSize: '13px', marginRight: '8px' }} />
          View Details
        </button>
        <button className={styles.menuItem} onClick={() => { void openEditDrawer(app); }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Edit Application
        </button>
        <button className={`${styles.menuItem} ${styles.delete}`} onClick={() => deleteApp(app)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete Application
        </button>
      </div>
    );
  };

  const renderPagination = (totalItems: number, borderTop: boolean = true): React.ReactNode => {
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    return (
      <div className={styles.paginationSection} style={borderTop ? {} : { borderTop: 'none' }}>
        <div className={styles.showingLabel}>
          Showing {Math.min(startIndex + 1, totalItems)}-{Math.min(startIndex + pageSize, totalItems)} of {totalItems} entries
        </div>
        <div className={styles.rightControls}>
          <button className={styles.pageBtn} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>&lt;</button>
          <div className={styles.pageNumbers}>
            {getPageNumbers(currentPage, totalPages).map((p, idx) => {
              if (p === '...') return <span key={`e-${idx}`} className={styles.ellipsis}>...</span>;
              return (
                <button key={p} className={`${styles.numberBtn} ${currentPage === p ? styles.active : ''}`} onClick={() => setCurrentPage(p as number)}>{p}</button>
              );
            })}
          </div>
          <button className={styles.pageBtn} onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>&gt;</button>
          <div className={styles.pageSizeSelector}>
            <select className={styles.selectPageSize} value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
              <option value="4">4</option>
              <option value="8">8</option>
              <option value="12">12</option>
              <option value="16">16</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  const renderGridMode = (apps: IApplicationWithUsers[]): React.ReactNode => {
    if (apps.length === 0) {
      return <div style={{ padding: '60px 0', textAlign: 'center', color: '#888' }}>No applications match the current tab filter or search query.</div>;
    }
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedApps = apps.slice(startIndex, startIndex + pageSize);

    return (
      <>
        <div className={styles.appsGrid}>
          {paginatedApps.map(app => {
            const catStyle = getCategoryStyles(app.Category);
            return (
              <div key={app.Id} className={styles.appCard} onClick={() => window.open(app.AppURL, '_blank')} style={{ cursor: 'pointer' }}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconFrame} style={{ backgroundColor: app.IconName ? 'transparent' : getHashCodeColor(app.Title), boxShadow: app.IconName ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.05)' }}>
                    {app.IconName ? <i className={`bi bi-${app.IconName}`} style={{ fontSize: '24px', color: '#7C3AED' }} /> : app.Title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className={styles.menuWrapper} onClick={(e) => e.stopPropagation()}>
                    <button className={styles.btnMenu} onClick={() => setOpenMenuAppId(openMenuAppId === app.Id ? null : app.Id)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>
                    {renderContextMenu(app)}
                  </div>
                </div>
                <div className={styles.cardTitleInfo}>
                  <h3>{app.Title}</h3>
                  <p className={styles.desc} title={app.Description}>{app.Description || 'No description provided.'}</p>
                </div>
                <div className={styles.cardMetaRow}>
                  {(() => {
                    if (!app.Category) return null;
                    const cat = categories.find(c => c.Title === app.Category);
                    if (!cat || !cat.IsActive) return null;
                    return <span className={styles.categoryTag} style={catStyle}>{app.Category}</span>;
                  })()}
                  <span className={styles.statusDot}>
                    <span className={`${styles.dot} ${app.Status === 'Active' ? styles.active : styles.inactive}`}></span>
                    {app.Status}
                  </span>
                </div>
                {/* Commented out card footer since user count is inactive
                <div className={styles.cardFooter}>
                  <span className={styles.usersLink} onClick={() => { setSelectedApp(app); setDetailsTab('Users'); }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle' }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    </svg>
                    {app.IsVisibleToAll ? 'All Users' : `${app.assignedUserCount} ${app.assignedUserCount === 1 ? 'User' : 'Users'}`}
                  </span>
                </div>
                */}
              </div>
            );
          })}
        </div>
        {apps.length > 0 && (
          <div className={styles.tableCard} style={{ marginTop: '24px' }}>
            {renderPagination(apps.length, false)}
          </div>
        )}
      </>
    );
  };

  const renderListMode = (apps: IApplicationWithUsers[]): React.ReactNode => {
    if (apps.length === 0) {
      return <div className={styles.tableCard} style={{ padding: '40px', textAlign: 'center', color: '#888' }}>No applications match the current tab filter or search query.</div>;
    }
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedApps = apps.slice(startIndex, startIndex + pageSize);

    return (
      <div className={styles.tableCard}>
        <table className={styles.appsTable}>
          <thead>
            <tr>
              <th>Application Name</th>
              <th>Category</th>
              <th>Application URL</th>
              <th>Status</th>
              {/* <th>User Access</th> */}
              <th style={{ width: '40px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedApps.map((app, idx) => {
              const catStyle = getCategoryStyles(app.Category);
              const isLastRow = idx === paginatedApps.length - 1;
              return (
                <tr key={app.Id} onClick={() => window.open(app.AppURL, '_blank')} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className={styles.appCell}>
                      <div className={styles.iconSmall} style={{ backgroundColor: app.IconName ? 'transparent' : getHashCodeColor(app.Title), boxShadow: app.IconName ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                        {app.IconName ? <i className={`bi bi-${app.IconName}`} style={{ fontSize: '14px', color: '#7C3AED' }} /> : app.Title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <span className={styles.name}>{app.Title}</span>
                    </div>
                  </td>
                  <td>
                    {(() => {
                      if (!app.Category) return null;
                      const cat = categories.find(c => c.Title === app.Category);
                      if (!cat || !cat.IsActive) return null;
                      return <span className={styles.categoryTag} style={catStyle}>{app.Category}</span>;
                    })()}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <a href={app.AppURL} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>
                      {app.AppURL.length > 35 ? `${app.AppURL.substring(0, 35)}...` : app.AppURL}
                    </a>
                  </td>
                  <td>
                    <span className={styles.statusDot}>
                      <span className={`${styles.dot} ${app.Status === 'Active' ? styles.active : styles.inactive}`}></span>
                      {app.Status}
                    </span>
                  </td>
                  {/* Commented out User Access cell since user count is inactive
                  <td>
                    <span style={{ cursor: 'pointer', textDecoration: 'underline', color: '#7C3AED', fontWeight: 600 }} onClick={() => { setSelectedApp(app); setDetailsTab('Users'); }}>
                      {app.IsVisibleToAll ? 'All Users' : `${app.assignedUserCount} User(s)`}
                    </span>
                  </td>
                  */}
                  <td style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                    <button className={styles.btnMenu} onClick={() => setOpenMenuAppId(openMenuAppId === app.Id ? null : app.Id)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>
                    {renderContextMenu(app, isLastRow)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className={styles.paginationSection}>
          <div className={styles.showingLabel}>
            Showing {Math.min((currentPage - 1) * pageSize + 1, apps.length)}-{Math.min(currentPage * pageSize, apps.length)} of {apps.length} entries
          </div>
          <div className={styles.rightControls}>
            <button className={styles.pageBtn} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>&lt;</button>
            <div className={styles.pageNumbers}>
              {getPageNumbers(currentPage, Math.ceil(apps.length / pageSize)).map((p, idx) => {
                if (p === '...') return <span key={`e-${idx}`} className={styles.ellipsis}>...</span>;
                return <button key={p} className={`${styles.numberBtn} ${currentPage === p ? styles.active : ''}`} onClick={() => setCurrentPage(p as number)}>{p}</button>;
              })}
            </div>
            <button className={styles.pageBtn} onClick={() => setCurrentPage(Math.min(Math.ceil(apps.length / pageSize), currentPage + 1))} disabled={currentPage === Math.ceil(apps.length / pageSize)}>&gt;</button>
            <div className={styles.pageSizeSelector}>
              <select className={styles.selectPageSize} value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAddEditDrawer = (): React.ReactNode => {
    if (!isDrawerOpen) return null;

    const filteredADUsers = adUsers.filter(u => {
      const q = userSearchQuery.toLowerCase().trim();
      return u.Title.toLowerCase().includes(q) || u.UserPrincipalName.toLowerCase().includes(q) || (u.Department && u.Department.toLowerCase().includes(q));
    });
    const filteredEmails = filteredADUsers.map(u => u.UserPrincipalName.toLowerCase());

    return (
      <div className={styles.drawerBackdrop} onClick={(e) => { if (e.target === e.currentTarget && !isSaving) setIsDrawerOpen(false); }}>
        <div className={styles.drawerPanel}>
          <div className={styles.drawerHeader}>
            <div className={styles.drawerTitleInfo}>
              <h3>{editingApp ? 'Edit Application' : 'Add Application'}</h3>
              <p>{editingApp ? `Modifying portal setup for '${editingApp.Title}'` : 'Define new application endpoints and authorization rules'}</p>
            </div>
            <button className={styles.drawerCloseBtn} disabled={isSaving} onClick={() => setIsDrawerOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form className={styles.drawerBody} onSubmit={saveApplication}>
            <div className={styles.formGroup}>
              <label>Application Name *</label>
              <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Finance Hub" required disabled={isSaving} />
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Short summary displayed on the user's dashboard launcher card" disabled={isSaving} />
            </div>

            <div className={styles.formGroup}>
              <label>Category</label>
              <select value={formCategory} onChange={e => setFormCategory(e.target.value as AppCategory)} disabled={isSaving}>
                {categories.map(cat => <option key={cat.Id} value={cat.Title}>{cat.Title}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Application URL *</label>
              <input type="text" value={formAppURL} onChange={e => setFormAppURL(e.target.value)} placeholder="https://finance.sttelemedia.com" title="Enter a valid web URL starting with http:// or https://" required disabled={isSaving} />
            </div>

            <div className={styles.statusRow}>
              <span>Application Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: formStatus === 'Active' ? '#228B22' : '#888' }}>{formStatus}</span>
                <label className={styles.switchContainer}>
                  <input type="checkbox" checked={formStatus === 'Active'} onChange={e => setFormStatus(e.target.checked ? 'Active' : 'Inactive')} disabled={isSaving} />
                  <span className={styles.sliderRound}></span>
                </label>
              </div>
            </div>

            {/* Commented out toggle since all applications are public by default now
            <div className={styles.statusRow}>
              <span>Visible to All Users</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: formIsVisibleToAll ? '#7C3AED' : '#888' }}>{formIsVisibleToAll ? 'Yes' : 'No'}</span>
                <label className={styles.switchContainer}>
                  <input type="checkbox" checked={formIsVisibleToAll} onChange={e => setFormIsVisibleToAll(e.target.checked)} disabled={isSaving} />
                  <span className={styles.sliderRound}></span>
                </label>
              </div>
            </div>
            */}

            <div className={styles.formGroup}>
              <label>Application Icon</label>
              <div className={styles.iconPickerWrapper}>
                <div className={styles.iconSearchRow}>
                  <div ref={iconSearchRef} className={styles.inputContainer}>
                    <input
                      type="text"
                      placeholder="e.g. globe, gear, card-list..."
                      value={formIconName}
                      onChange={handleIconInputChange}
                      onKeyDown={handleIconInputKeyDown}
                      onFocus={handleIconInputFocus}
                      disabled={isSaving}
                    />
                    {showIconSuggestions && formIconName && (() => {
                      const query = formIconName.toLowerCase();
                      const matchedKeys = Object.keys(ICON_SEARCH_GROUPS).filter(key => key.toLowerCase().includes(query));
                      const filteredIcons = matchedKeys.length > 0
                        ? Array.from(new Set(matchedKeys.flatMap(key => ICON_SEARCH_GROUPS[key])))
                        : ALL_BOOTSTRAP_ICONS.filter(icon => icon.toLowerCase().includes(query)).slice(0, 10);
                      if (filteredIcons.length === 0) return null;
                      return (
                        <div className={styles.suggestionsDropdown}>
                          {filteredIcons.map(icon => (
                            <div key={icon} className={styles.suggestionItem} onClick={() => { setFormIconName(icon); setShowIconSuggestions(false); }}>
                              <i className={`bi bi-${icon}`} /><span>{icon}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div className={styles.iconLivePreview}>
                    <i className={`bi bi-${formIconName || 'app-indicator'}`} />
                  </div>
                </div>
              </div>
              <div className={styles.quickPickSection}>
                <span className={styles.quickPickLabel}>Quick Pick Common Icons:</span>
                <div className={styles.quickIconsGrid}>
                  {PRESET_ICONS.map(icon => (
                    <button key={icon} type="button" className={`${styles.quickIconBtn} ${formIconName === icon ? styles.active : ''}`}
                      onClick={() => { setFormIconName(icon); setShowIconSuggestions(false); }} title={icon} disabled={isSaving}>
                      <i className={`bi bi-${icon}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* <div className={styles.summaryRowCard}>
              <div className={styles.summaryIcon}>i</div>
              <div>This application is visible to all portal users. Individual permissions check is disabled.</div>
            </div> */}
            {/* Commented out Assign User Access checklist since assignments are inactive
            {!formIsVisibleToAll && (
              <div className={styles.accessCard}>
                <h4 className={styles.accessTitle}>Assign User Access</h4>
                <div className={styles.searchWrapper}>
                  <svg className={styles.searchIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input type="text" placeholder="Search users by name or department..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} disabled={isSaving} />
                </div>
                <div className={styles.selectAllRow}>
                  <span>Select users who should have access</span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={filteredEmails.length > 0 && filteredEmails.every(email => selectedUsers.includes(email))} onChange={() => toggleSelectAllUsers(filteredEmails)} disabled={isSaving || filteredEmails.length === 0} />
                    Select All ({filteredEmails.length})
                  </label>
                </div>
                <div className={styles.userCheckboxList}>
                  {filteredADUsers.map(user => {
                    const isChecked = selectedUsers.includes(user.UserPrincipalName.toLowerCase());
                    const initials = user.Title.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                    return (
                      <div key={user.Id} className={styles.userCheckItem}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggleUserSelection(user.UserPrincipalName)} disabled={isSaving} />
                        <div className={styles.userLabel}>
                          <div className={styles.avatar} style={{ backgroundColor: getHashCodeColor(user.Title) }}>{initials}</div>
                          <div className={styles.nameMeta}>
                            <span className={styles.name}>{user.Title}</span>
                            <span className={styles.email}>{user.UserPrincipalName}</span>
                          </div>
                          {user.Department && <span className={styles.deptBadge}>{user.Department}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            */}
            <input type="submit" style={{ display: 'none' }} />
          </form>

          <div className={styles.drawerFooter}>
            <button className={styles.btnCancel} onClick={() => setIsDrawerOpen(false)} disabled={isSaving}>Cancel</button>
            <button className={styles.btnSubmit} onClick={saveApplication} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingApp ? 'Save Changes' : '+ Add Application'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailsDrawer = (): React.ReactNode => {
    if (!selectedApp) return null;
    const catStyle = getCategoryStyles(selectedApp.Category);
    const filteredUsers = adUsers.filter(u => {
      const hasAccess = selectedApp.assignedUserEmails.includes(u.UserPrincipalName.toLowerCase());
      if (!hasAccess) return false;
      const q = detailsUserSearchQuery.toLowerCase().trim();
      return u.Title.toLowerCase().includes(q) || u.UserPrincipalName.toLowerCase().includes(q) || (u.Department && u.Department.toLowerCase().includes(q));
    });

    return (
      <div className={styles.drawerBackdrop} onClick={(e) => { if (e.target === e.currentTarget) setSelectedApp(null); }}>
        <div className={styles.drawerPanel}>
          <div className={styles.drawerHeader}>
            <div className={styles.detailAvatar} style={{ backgroundColor: selectedApp.IconName ? 'transparent' : getHashCodeColor(selectedApp.Title), boxShadow: selectedApp.IconName ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
              {selectedApp.IconName ? <i className={`bi bi-${selectedApp.IconName}`} style={{ fontSize: '32px', color: '#7C3AED' }} /> : selectedApp.Title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className={styles.drawerTitleInfo}>
              <h3>{selectedApp.Title}</h3>
              <div className={styles.detailBadgeRow}>
                {(() => {
                  if (!selectedApp.Category) return null;
                  const cat = categories.find(c => c.Title === selectedApp.Category);
                  if (!cat || !cat.IsActive) return null;
                  return <span className={styles.categoryTag} style={catStyle}>{selectedApp.Category}</span>;
                })()}
                <span className={styles.statusDot}>
                  <span className={`${styles.dot} ${selectedApp.Status === 'Active' ? styles.active : styles.inactive}`}></span>
                  {selectedApp.Status}
                </span>
              </div>
            </div>
            <button className={styles.drawerCloseBtn} onClick={() => setSelectedApp(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className={styles.drawerBody}>
            {/* Commented out details tabs since only Overview is relevant now
            <div className={styles.tabBar} style={{ marginBottom: '8px', borderBottom: '1px solid #eaeaea' }}>
              <button className={`${styles.tabItem} ${detailsTab === 'Overview' ? styles.active : ''}`} onClick={() => setDetailsTab('Overview')}>Overview</button>
              <button className={`${styles.tabItem} ${detailsTab === 'Users' ? styles.active : ''}`} onClick={() => setDetailsTab('Users')}>Users Access</button>
            </div>
            */}

            {true || detailsTab === 'Overview' ? (
              <div className={styles.drawerCard}>
                <h4>Meta Specifications</h4>
                <div className={styles.detailGrid}>
                  <div className={styles.detailLabel}>Application ID</div><div className={styles.detailValue}>{selectedApp.Id}</div>
                  <div className={styles.detailLabel}>Name</div><div className={styles.detailValue}>{selectedApp.Title}</div>
                  <div className={styles.detailLabel}>Description</div><div className={styles.detailValue}>{selectedApp.Description || 'None'}</div>
                  <div className={styles.detailLabel}>App Link</div>
                  <div className={styles.detailValue}><a href={selectedApp.AppURL} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>{selectedApp.AppURL}</a></div>
                  <div className={styles.detailLabel}>Category</div><div className={styles.detailValue}>{selectedApp.Category}</div>
                  {/* Commented out Sort Index and Visible to All per user request
                  <div className={styles.detailLabel}>Sort Index</div><div className={styles.detailValue}>{selectedApp.SortOrder || 0}</div>
                  <div className={styles.detailLabel}>Visible to All</div><div className={styles.detailValue}>{selectedApp.IsVisibleToAll ? 'Yes (Public)' : 'No (Restricted)'}</div>
                  */}
                  <div className={styles.detailLabel}>Created Date</div><div className={styles.detailValue}>{formatDate(selectedApp.CreatedDate)}</div>
                  <div className={styles.detailLabel}>Last Modified</div><div className={styles.detailValue}>{formatDate(selectedApp.LastUpdatedDate)}</div>
                </div>
              </div>
            ) : null}
            {/* Commented out Users Access tab details since all users have access now
            {detailsTab === 'Users' && (
              <div>
                {selectedApp.IsVisibleToAll ? (
                  <div className={styles.summaryRowCard}>
                    <div className={styles.summaryIcon}>i</div>
                    <div>This application is visible to all portal users. Individual permissions check is disabled.</div>
                  </div>
                ) : (
                  <div className={styles.accessCard}>
                    <h4 className={styles.accessTitle}>Authorised Personnel</h4>
                    <div className={styles.searchWrapper}>
                      <svg className={styles.searchIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input type="text" placeholder="Search users..." value={detailsUserSearchQuery} onChange={e => setDetailsUserSearchQuery(e.target.value)} />
                    </div>
                    {filteredUsers.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#888888', background: '#fcfcfc', borderRadius: '8px', border: '1px solid #eaeaea', fontSize: '13px', marginTop: '12px' }}>
                        No users currently have launch access to this application. Edit the application to assign permissions.
                      </div>
                    ) : (
                      <div className={styles.userCheckboxList} style={{ maxHeight: '320px', marginTop: '12px' }}>
                        {filteredUsers.map(user => {
                          const initials = user.Title.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                          return (
                            <div key={user.Id} className={styles.userCheckItem} style={{ paddingLeft: '8px' }}>
                              <div className={styles.userLabel} style={{ marginLeft: 0 }}>
                                <div className={styles.avatar} style={{ backgroundColor: getHashCodeColor(user.Title) }}>{initials}</div>
                                <div className={styles.nameMeta}>
                                  <span className={styles.name}>{user.Title}</span>
                                  <span className={styles.email}>{user.UserPrincipalName}</span>
                                </div>
                                {user.Department && <span className={styles.deptBadge}>{user.Department}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            */}
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryContextMenu = (cat: IAppCategory): React.ReactNode => {
    if (openMenuCategoryId !== cat.Id) return null;
    return (
      <div className={styles.contextMenu} ref={contextMenuRef}>
        <button className={styles.menuItem} onClick={() => openEditCategoryDrawer(cat)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Edit Category
        </button>
        <button className={`${styles.menuItem} ${styles.delete}`} onClick={() => deleteCategory(cat)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete Category
        </button>
      </div>
    );
  };

  const renderCategoriesGrid = (): React.ReactNode => {
    if (filteredCategories.length === 0) {
      return (
        <div className={styles.tableCard} style={{ padding: '40px', textAlign: 'center' }}>
          <span className={styles.tableEmpty}>No categories match the current search query.</span>
        </div>
      );
    }
    return (
      <div className={styles.categoriesGrid}>
        {filteredCategories.map(cat => {
          const count = applications.filter(a => a.Category === cat.Title).length;
          const catStyle = getCategoryStyles(cat.Title as AppCategory);
          return (
            <div key={cat.Id} className={styles.categoryCard} style={{ cursor: 'pointer' }}
              onClick={(e) => { if ((e.target as HTMLElement).closest(`.${styles.menuWrapper}`)) return; setSelectedCategoryDetails(cat); }}>
              <div className={styles.cardHeader}>
                <div className={styles.iconFrame} style={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
                  <i className={`bi bi-${cat.IconName || 'grid'}`} style={{ fontSize: '24px', color: '#7C3AED' }} />
                </div>
                <div className={styles.menuWrapper}>
                  <button className={styles.btnMenu} onClick={() => setOpenMenuCategoryId(openMenuCategoryId === cat.Id ? null : cat.Id)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                    </svg>
                  </button>
                  {renderCategoryContextMenu(cat)}
                </div>
              </div>
              <div className={styles.cardTitleInfo}>
                <h3 style={{ fontFamily: "'Outfit', 'Lato', -apple-system, sans-serif" }}>
                  {cat.Title}
                  <span className={styles.categoryCountBadge}>
                    &middot; {count} {count === 1 ? 'Application' : 'Applications'}
                  </span>
                  {!cat.IsActive && (
                    <span className={styles.categoryInactiveBadge}>
                      Inactive
                    </span>
                  )}
                </h3>
                <p className={styles.desc} title={cat.Description} style={{ height: 'auto', minHeight: '34px' }}>
                  {cat.Description || 'No description provided.'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCategoriesList = (): React.ReactNode => {
    if (filteredCategories.length === 0) {
      return (
        <div className={styles.tableCard} style={{ padding: '40px', textAlign: 'center' }}>
          <span className={styles.tableEmpty}>No categories match the current search query.</span>
        </div>
      );
    }
    return (
      <div className={styles.tableCard}>
        <table className={styles.appsTable}>
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Description</th>
              <th>Applications Count</th>
              <th>Status</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.map(cat => {
              const count = applications.filter(a => a.Category === cat.Title).length;
              const catStyle = getCategoryStyles(cat.Title as AppCategory);
              return (
                <tr key={cat.Id}>
                  <td>
                    <div className={styles.appCell}>
                      <div className={styles.iconSmall} style={{ backgroundColor: 'transparent', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={`bi bi-${cat.IconName || 'grid'}`} style={{ fontSize: '16px', color: '#7C3AED' }} />
                      </div>
                      <span className={styles.name} onClick={() => setSelectedCategoryDetails(cat)} style={{ cursor: 'pointer' }}>{cat.Title}</span>
                    </div>
                  </td>
                  <td><div className={styles.tableDesc}>{cat.Description || 'No description provided.'}</div></td>
                  <td><span className={styles.tableCount}>{count} {count === 1 ? 'Application' : 'Applications'}</span></td>
                  <td>
                    <span className={styles.statusDot}>
                      <span className={`${styles.dot} ${cat.IsActive ? styles.active : styles.inactive}`}></span>
                      {cat.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ position: 'relative', textAlign: 'center' }}>
                    <button className={styles.btnMenu} onClick={() => setOpenMenuCategoryId(openMenuCategoryId === cat.Id ? null : cat.Id)} title="Actions">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>
                    {renderCategoryContextMenu(cat)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAddCategoryDrawer = (): React.ReactNode => {
    if (!isCategoryDrawerOpen) return null;
    return (
      <div className={styles.drawerBackdrop} onClick={closeCategoryDrawer}>
        <div className={styles.drawerPanel} onClick={e => e.stopPropagation()}>
          <div className={styles.drawerHeader}>
            <div className={styles.drawerTitleInfo}>
              <h3>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <p>{editingCategory ? 'Modify app category and badge aesthetics.' : 'Configure dynamic application categories and badge aesthetics.'}</p>
            </div>
            <button className={styles.drawerCloseBtn} onClick={closeCategoryDrawer}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={saveCategory} className={styles.drawerBody}>
            <div className={styles.drawerTwoColumn}>
              <div className={styles.drawerLeftColumn}>
                <div className={styles.formGroup}>
                  <label>Name</label>
                  <input type="text" placeholder="e.g. Operations" value={catFormName} onChange={e => setCatFormName(e.target.value)} disabled={isCategorySaving} required />
                </div>

                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea placeholder="Short description" value={catFormDescription} onChange={e => setCatFormDescription(e.target.value)} disabled={isCategorySaving} />
                </div>

                <div className={styles.formGroup}>
                  <label>Color Badge Styling</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className={styles.colorPresetGrid} style={{ padding: 0 }}>
                      {CATEGORY_COLOR_PRESETS.map((p, idx) => (
                        <button type="button" key={idx}
                          className={`${styles.colorBtn} ${catFormBgColor === p.bg && catFormTextColor === p.text ? styles.active : ''}`}
                          style={{ backgroundColor: p.bg }}
                          onClick={() => { setCatFormBgColor(p.bg); setCatFormTextColor(p.text); }}
                          disabled={isCategorySaving} title={`Preset ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup} ref={categoryIconSearchRef}>
                  <label>Icon</label>
                  <div className={styles.iconSearchInputWrapper}>
                    <i className="bi bi-search" />
                    <input type="text" placeholder="Search icon..." value={catFormIconSearchText} onChange={e => setCatFormIconSearchText(e.target.value)} disabled={isCategorySaving} style={{ paddingLeft: '36px' }} />
                  </div>
                  <div className={styles.quickPickGridWrapper}>
                    <div className={styles.quickPickGrid}>
                      {CATEGORY_PRESET_ICONS.filter(icon =>
                        icon.name.toLowerCase().includes(catFormIconSearchText.toLowerCase()) ||
                        icon.label.toLowerCase().includes(catFormIconSearchText.toLowerCase())
                      ).map(icon => (
                        <button key={icon.name} type="button"
                          className={`${styles.categoryIconPresetBtn} ${catFormIconName === icon.name ? styles.selected : ''}`}
                          onClick={() => setCatFormIconName(icon.name)} title={icon.label} disabled={isCategorySaving}>
                          {catFormIconName === icon.name && (
                            <div className={styles.selectedCheck}><i className="bi bi-check-circle-fill" /></div>
                          )}
                          <i className={`bi bi-${icon.name}`} />
                          <span>{icon.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Category Status toggle hidden — all categories default to IsActive: true.
                    The IsActive flag is preserved in SP and still filters user-facing badge/dropdown rendering,
                    but admins no longer need to toggle it manually from the UI.
                <div className={styles.statusRow} style={{ marginTop: '20px', marginBottom: '8px' }}>
                  <span>Category Status</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: catFormIsActive ? '#228B22' : '#888' }}>{catFormIsActive ? 'Active' : 'Inactive'}</span>
                    <label className={styles.switchContainer}>
                      <input type="checkbox" checked={catFormIsActive} onChange={e => setCatFormIsActive(e.target.checked)} disabled={isCategorySaving} />
                      <span className={styles.sliderRound}></span>
                    </label>
                  </div>
                </div>
                */}
              </div>

              <div className={styles.drawerRightColumn}>
                <div className={styles.formGroup} style={{ position: 'sticky', top: '0' }}>
                  <label>Live Preview</label>
                  <div className={styles.livePreviewBox}>
                    <div className={styles.categoryCard} style={{ margin: 0, pointerEvents: 'none', transform: 'none', boxShadow: 'none', width: '100%', boxSizing: 'border-box', padding: '16px' }}>
                      <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className={styles.iconFrame} style={{ backgroundColor: catFormBgColor, color: catFormTextColor }}>
                          <i className={`bi bi-${catFormIconName || 'grid'}`} style={{ fontSize: '20px' }} />
                        </div>
                        <div className={styles.previewStatusPill} style={{ backgroundColor: catFormIsActive ? '#E6F4EA' : '#F8F9FA', color: catFormIsActive ? '#1E8E3E' : '#888888' }}>
                          <span className={styles.statusDot} style={{ backgroundColor: catFormIsActive ? '#1E8E3E' : '#888888' }}></span>
                          {catFormIsActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <div className={styles.cardTitleInfo}>
                        <h3 style={{ fontFamily: "'Outfit', 'Lato', -apple-system, sans-serif" }}>
                          {catFormName || 'Category Name'}
                          <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#888888', marginLeft: '6px' }}>&middot; 0 Apps</span>
                        </h3>
                        <p className={styles.desc} style={{ height: 'auto', minHeight: '34px', fontSize: '11px' }}>
                          {catFormDescription || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    <div className={styles.badgePreviewBox}>
                      <span className={styles.badgePreviewTitle}>Badge View</span>
                      <span className={styles.categoryTag} style={{ backgroundColor: catFormBgColor, color: catFormTextColor }}>
                        {catFormName || 'CATEGORY'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>

          <div className={styles.drawerFooter}>
            <button className={styles.btnCancel} onClick={closeCategoryDrawer} disabled={isCategorySaving}>Cancel</button>
            <button className={styles.btnSubmit} onClick={saveCategory} disabled={isCategorySaving}>
              {isCategorySaving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryDetailsDrawer = (): React.ReactNode => {
    if (!selectedCategoryDetails) return null;
    const associatedApps = applications.filter(app => app.Category === selectedCategoryDetails.Title);
    const count = associatedApps.length;
    const catStyle = getCategoryStyles(selectedCategoryDetails.Title as AppCategory);

    return (
      <div className={styles.drawerBackdrop} onClick={(e) => { if (e.target === e.currentTarget) setSelectedCategoryDetails(null); }}>
        <div className={styles.drawerPanel}>
          <div className={styles.drawerHeader}>
            <div className={styles.drawerTitleInfo}>
              <h3>Category Details - {selectedCategoryDetails.Title}</h3>
              <p>View applications and configuration settings for this category.</p>
            </div>
            <button className={styles.drawerCloseBtn} onClick={() => setSelectedCategoryDetails(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className={styles.drawerBody}>
            <div className={`${styles.drawerCard} ${styles.categoryDetailHeroCard}`}>
              <div className={styles.detailAvatar} style={{ backgroundColor: 'transparent', boxShadow: 'none', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`bi bi-${selectedCategoryDetails.IconName || 'grid'}`} style={{ fontSize: '32px', color: '#7C3AED' }} />
              </div>
              <div className={styles.categoryDetailHeroInfo}>
                <h4 className={styles.categoryDetailHeroTitle}>{selectedCategoryDetails.Title}</h4>
                <span className={styles.categoryDetailHeroDesc}>{selectedCategoryDetails.Description || 'No description provided.'}</span>
              </div>
            </div>

            <div className={styles.categoryDetailSectionHeader}>
              <h4 className={styles.categoryDetailSectionTitle}>Applications Under This Category</h4>
              <span className={styles.categoryDetailSectionCount}>Total Applications: <strong>{count}</strong></span>
            </div>

            <div className={styles.categoryDetailAppsList}>
              {count === 0 ? (
                <div className={styles.categoryDetailEmptyState}>
                  No applications are currently assigned to this category.
                </div>
              ) : (
                associatedApps.map(app => (
                  <div key={app.Id} className={styles.drawerAppItemCard}>
                    <div className={styles.drawerAppItemMain}>
                      <div className={styles.drawerAppIcon} style={{ backgroundColor: app.IconName ? 'transparent' : getHashCodeColor(app.Title), boxShadow: app.IconName ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                        {app.IconName ? <i className={`bi bi-${app.IconName}`} style={{ fontSize: '20px', color: '#7C3AED' }} /> : app.Title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className={styles.drawerAppMeta}>
                        <span className={styles.drawerAppTitle}>{app.Title}</span>
                        <span className={styles.drawerAppDesc} title={app.Description}>{app.Description || 'No description provided.'}</span>
                        <div className={styles.drawerAppFooterRow}>
                          <span className={styles.statusDot}>
                            <span className={`${styles.dot} ${app.Status === 'Active' ? styles.active : styles.inactive}`}></span>
                            {app.Status}
                          </span>
                          <span className={styles.drawerAppUpdated}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                            </svg>
                            Updated {formatRelativeTime(app.LastUpdatedDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      className={styles.drawerAppViewBtn}
                      onClick={() => { setSelectedApp(app); setDetailsTab('Overview'); setSelectedCategoryDetails(null); }}
                    >
                      View
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteCategoryErrorModal = (): React.ReactNode => {
    if (!deleteCategoryError) return null;
    return (
      <div className={styles.modalBackdrop}>
        <div className={styles.modalContent}>
          <h3>Cannot Delete Category</h3>
          <p>This category currently contains {deleteCategoryError.count} {deleteCategoryError.count === 1 ? 'application' : 'applications'}. Please move or remove these applications before deleting the category.</p>
          <ul>
            {deleteCategoryError.appTitles.map((title, idx) => <li key={idx}>{title}</li>)}
          </ul>
          <div className={styles.modalFooter}>
            <button className={styles.btnCloseModal} onClick={() => setDeleteCategoryError(null)}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteConfirmModal = (): React.ReactNode => {
    if (!deleteConfirm.isOpen) return null;

    const handleConfirm = async (): Promise<void> => {
      const { type, targetId, targetTitle } = deleteConfirm;
      setDeleteConfirm({ isOpen: false, type: null, targetId: null, targetTitle: '' });
      if (type === 'app' && targetId !== null) {
        await executeDeleteApp(targetId, targetTitle);
      } else if (type === 'category' && targetId !== null) {
        await executeDeleteCategory(targetId, targetTitle);
      }
    };

    const handleCancel = (): void => {
      setDeleteConfirm({ isOpen: false, type: null, targetId: null, targetTitle: '' });
      if (deleteConfirm.type === 'category') {
        setOpenMenuCategoryId(null);
      }
    };

    return (
      <div className={styles.modalBackdrop}>
        <div className={styles.modalContent}>
          <h3>Confirm Delete</h3>
          <p>
            {deleteConfirm.type === 'app'
              ? `Are you sure you want to delete '${deleteConfirm.targetTitle}'? This action cannot be undone.`
              : `Are you sure you want to delete category '${deleteConfirm.targetTitle}'?`}
          </p>
          <div className={styles.modalFooter} style={{ gap: '12px', marginTop: '16px' }}>
            <button
              className={styles.btnCancel}
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className={styles.btnCloseModal}
              onClick={handleConfirm}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Derived State ──────────────────────────────────────────────────────────
  const filteredApps = applications.filter(app => {
    if (activeTab === 'Active' && app.Status !== 'Active') return false;
    if (activeTab === 'Inactive' && app.Status !== 'Inactive') return false;
    if (activeTab === 'Categories' && app.Category !== selectedCategory) return false;
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      return app.Title.toLowerCase().includes(q) || (app.Description && app.Description.toLowerCase().includes(q)) || app.Category.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredCategories = categories.filter(cat => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return cat.Title.toLowerCase().includes(q) || (cat.Description && cat.Description.toLowerCase().includes(q));
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.adminAppsContainer}>
      {/* Toast Notification */}
      {toast && (
        <div className={styles.toastContainer}>
          <div className={styles.toastCheckIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className={styles.toastMessage}>{toast}</span>
        </div>
      )}

      {/* Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.titleInfo}>
          <h2>Applications</h2>
          <p className={styles.subtitle}>Manage and configure applications available in the portal.</p>
        </div>
        {activeTab === 'Categories' ? (
          <button className={styles.btnAddApp} onClick={openAddCategoryDrawer}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Category
          </button>
        ) : (
          <button className={styles.btnAddApp} onClick={openAddDrawer}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Application
          </button>
        )}
      </div>

      {/* Controls Bar */}
      <div className={styles.controlPanel}>
        {renderNavbarTabs()}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={styles.accessCard} style={{ padding: 0, border: 'none', background: 'transparent' }}>
            <div className={styles.searchWrapper}>
              <svg className={styles.searchIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder={activeTab === 'Categories' ? 'Search categories...' : 'Search applications...'}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                style={{ width: '220px', padding: '6px 12px 6px 30px' }}
              />
            </div>
          </div>
          <div className={styles.viewModeToggle}>
            <button className={`${styles.toggleBtn} ${viewMode === 'Grid' ? styles.active : ''}`} onClick={() => { setViewMode('Grid'); setCurrentPage(1); setPageSize(8); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
              Grid
            </button>
            <button className={`${styles.toggleBtn} ${viewMode === 'List' ? styles.active : ''}`} onClick={() => { setViewMode('List'); setCurrentPage(1); setPageSize(10); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              List
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#888' }}>Loading applications catalog...</div>
      ) : (
        activeTab === 'Categories'
          ? (viewMode === 'Grid' ? renderCategoriesGrid() : renderCategoriesList())
          : (viewMode === 'Grid' ? renderGridMode(filteredApps) : renderListMode(filteredApps))
      )}

      {/* Drawers */}
      {renderAddEditDrawer()}
      {renderDetailsDrawer()}
      {renderAddCategoryDrawer()}
      {renderCategoryDetailsDrawer()}
      {renderDeleteCategoryErrorModal()}
      {renderDeleteConfirmModal()}
    </div>
  );
};

export default AdminApplications;
