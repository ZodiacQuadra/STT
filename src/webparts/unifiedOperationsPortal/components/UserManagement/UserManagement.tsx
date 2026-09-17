import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './UserManagement.module.scss';
import { IADUser } from '../../../../Types/ADUsersTypes';
import { IUserConfig } from '../../../../Types/UserConfigTypes';
import { IApplicationWithUsers } from '../../../../Types/ApplicationTypes';
import { getADUsers, syncADUsersToList } from '../../../../Service/ADUsersService';
import { getUserConfigs, addUserConfig, deactivateUser, updateUserConfig } from '../../../../Service/UserConfigService';
import { getAllADUsers } from '../../../../Service/commonService';
import { getApplications, assignUserToApp, removeUserFromApp } from '../../../../Service/ApplicationService';
import { IAuditLog } from '../../../../Types/AuditLogTypes';
import { getAuditLogsByType, writeAuditLog } from '../../../../Service/AuditLogService';

export interface IUserManagementProps {
  currentUserEmail: string;
  currentUserDisplayName: string;
}

type SortField = 'Title' | 'UserPrincipalName' | 'Department' | 'Role' | 'LastLogin';

const UserManagement: React.FC<IUserManagementProps> = (props) => {
  const { currentUserEmail, currentUserDisplayName } = props;

  // ── State ──────────────────────────────────────────────────────────────────
  const [adUsers, setAdUsers] = useState<IADUser[]>([]);
  const [adminConfigs, setAdminConfigs] = useState<IUserConfig[]>([]);
  const [applications, setApplications] = useState<IApplicationWithUsers[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [loginLogs, setLoginLogs] = useState<IAuditLog[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedRole, setSelectedRole] = useState<'All' | 'Admin' | 'User'>('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('Title');
  const [sortAscending, setSortAscending] = useState<boolean>(true);

  // Detail Drawer
  const [selectedUser, setSelectedUser] = useState<IADUser | null>(null);
  const [updatingAccessAppId, setUpdatingAccessAppId] = useState<number | null>(null);
  const [updatingRole, setUpdatingRole] = useState<boolean>(false);

  // ── Data Loading ───────────────────────────────────────────────────────────
  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [users, configs, apps, logs] = await Promise.all([
        getADUsers(),
        getUserConfigs(),
        getApplications(),
        getAuditLogsByType('Login', 5000)
      ]);
      setAdUsers(users);
      setAdminConfigs(configs);
      setApplications(apps);
      setLoginLogs(logs);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading User Management data:', err);
      setIsLoading(false);
    }
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    void loadData();
  }, []);

  const handleSync = async (): Promise<void> => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const graphUsers = await getAllADUsers();
      const payloadUsers = graphUsers.map(user => ({
        Title: user.displayName || 'Unnamed User',
        AD_ObjectId: user.id,
        UserPrincipalName: user.userPrincipalName || user.mail || '',
        Email: user.mail || user.userPrincipalName || '',
        JobTitle: user.jobTitle || undefined,
        Department: user.department || undefined,
        OfficeLocation: user.officeLocation || undefined,
        IsActive: true,
        LastSyncedAt: new Date().toISOString()
      })).filter(u => u.UserPrincipalName !== '');

      await syncADUsersToList(payloadUsers);
      setSyncStatus({ success: true, message: 'Azure AD synchronization completed successfully.' });
      await loadData();
    } catch (error: any) {
      console.error('Sync failed:', error);
      setSyncStatus({ success: false, message: `Sync failed: ${error.message || 'Unknown error'}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleAdminRole = async (user: IADUser): Promise<void> => {
    const userEmail = (user.UserPrincipalName || user.Email || '').toLowerCase();
    if (!userEmail) return;

    setUpdatingRole(true);
    try {
      const existingConfig = adminConfigs.find(c => c.UserMailId?.toLowerCase() === userEmail);
      const isAdminNow = !!existingConfig && existingConfig.IsActive;

      if (isAdminNow) {
        if (existingConfig) {
          await deactivateUser(existingConfig.Id);
          await writeAuditLog({
            Title: 'Admin Access Revoked',
            EventType: 'Role Updated',
            ActorName: currentUserDisplayName || currentUserEmail,
            ActorEmail: currentUserEmail,
            TargetEntity: user.Title,
            TargetEntityId: user.Id,
            Description: `Revoked administrator privileges from ${user.Title} (${userEmail}).`,
            Timestamp: new Date().toISOString()
          });
        }
      } else {
        if (existingConfig) {
          await updateUserConfig(existingConfig.Id, { IsActive: true, DeactivatedOn: undefined });
        } else {
          await addUserConfig({
            Title: user.Title,
            UserMailId: user.UserPrincipalName || user.Email,
            Username: user.UserPrincipalName.split('@')[0],
            IsActive: true
          });
        }
        await writeAuditLog({
          Title: 'Admin Access Granted',
          EventType: 'Role Updated',
          ActorName: currentUserDisplayName || currentUserEmail,
          ActorEmail: currentUserEmail,
          TargetEntity: user.Title,
          TargetEntityId: user.Id,
          Description: `Granted administrator privileges to ${user.Title} (${userEmail}).`,
          Timestamp: new Date().toISOString()
        });
      }

      const updatedConfigs = await getUserConfigs();
      setAdminConfigs(updatedConfigs);
      setUpdatingRole(false);
    } catch (err) {
      console.error('Error toggling role:', err);
      setUpdatingRole(false);
    }
  };

  const toggleAppAccess = async (app: IApplicationWithUsers, user: IADUser): Promise<void> => {
    const userEmail = (user.UserPrincipalName || user.Email).toLowerCase();
    setUpdatingAccessAppId(app.Id);
    try {
      const isCurrentlyAssigned = app.assignedUserEmails.includes(userEmail);
      if (isCurrentlyAssigned) {
        await removeUserFromApp(app.Id, app.AssignedTo || '', userEmail);
        await writeAuditLog({
          Title: 'Application Access Revoked',
          EventType: 'Mapping Removed',
          ActorName: currentUserDisplayName || currentUserEmail,
          ActorEmail: currentUserEmail,
          TargetEntity: app.Title,
          TargetEntityId: app.Id,
          Description: `Removed application "${app.Title}" access from user ${user.Title} (${userEmail}).`,
          Timestamp: new Date().toISOString()
        });
      } else {
        await assignUserToApp(app.Id, app.AssignedTo || '', userEmail);
        await writeAuditLog({
          Title: 'Application Access Granted',
          EventType: 'Mapping Added',
          ActorName: currentUserDisplayName || currentUserEmail,
          ActorEmail: currentUserEmail,
          TargetEntity: app.Title,
          TargetEntityId: app.Id,
          Description: `Assigned application "${app.Title}" access to user ${user.Title} (${userEmail}).`,
          Timestamp: new Date().toISOString()
        });
      }
      const updatedApps = await getApplications();
      setApplications(updatedApps);
      setUpdatingAccessAppId(null);
    } catch (err) {
      console.error('Error updating app access:', err);
      setUpdatingAccessAppId(null);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getUserInitials = (name: string): string => {
    if (!name) return '??';
    return name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
  };

  const getAvatarColor = (name: string): string => {
    const colors = [
      '#6200EE', '#3700B3', '#03DAC6', '#018786',
      '#1976D2', '#00796B', '#388E3C', '#F57C00',
      '#E64A19', '#D32F2F', '#C2185B', '#7B1FA2'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      if (date.toDateString() === now.toDateString()) return `Today, ${hours}:${minutes}`;

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${hours}:${minutes}`;

      if (diffDays > 0 && diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${date.getFullYear()}`;
    } catch {
      return 'Never';
    }
  };

  const handleSort = (field: SortField): void => {
    const isAscending = sortField === field ? !sortAscending : true;
    setSortField(field);
    setSortAscending(isAscending);
    setCurrentPage(1);
  };

  const getPageNumbers = (page: number, totalPages: number): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const renderSortArrow = (field: SortField): React.ReactNode => {
    if (sortField !== field) {
      return (
        <span className={styles.sortIcon}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
        </span>
      );
    }
    return (
      <span className={styles.sortIcon} style={{ color: '#7C3AED' }}>
        {sortAscending ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
        )}
      </span>
    );
  };

  // ── Derived State ──────────────────────────────────────────────────────────
  const rawDepts = adUsers.map(u => u.Department).filter(Boolean) as string[];
  const uniqueDepts = rawDepts.filter((v, i, a) => a.indexOf(v) === i);
  const departments = ['All', ...uniqueDepts].sort();

  const enrichedUsers = adUsers.map(user => {
    const email = (user.UserPrincipalName || user.Email || '').toLowerCase();
    const config = adminConfigs.find(c => c.UserMailId?.toLowerCase() === email);
    const isAdmin = !!config && config.IsActive;
    const assignedApps = applications.filter(app => app.IsVisibleToAll || app.assignedUserEmails.includes(email));
    const userLogs = loginLogs.filter(log => log.ActorEmail?.toLowerCase() === email);
    const latestLog = userLogs.length > 0 ? userLogs[0] : null;
    return {
      ...user,
      role: (isAdmin ? 'Admin' : 'User') as 'Admin' | 'User',
      assignedAppsCount: assignedApps.length,
      lastLoginTime: latestLog ? new Date(latestLog.Timestamp).getTime() : 0,
      lastLoginText: latestLog ? formatDate(latestLog.Timestamp) : 'Never'
    };
  });

  const filteredUsers = enrichedUsers.filter(user => {
    const matchesSearch =
      user.Title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.UserPrincipalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.Email && user.Email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDepartment = selectedDepartment === 'All' || user.Department === selectedDepartment;
    const matchesRole = selectedRole === 'All' || user.role === selectedRole;
    return matchesSearch && matchesDepartment && matchesRole;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal: any = '';
    let bVal: any = '';
    if (sortField === 'Title') { aVal = a.Title.toLowerCase(); bVal = b.Title.toLowerCase(); }
    else if (sortField === 'UserPrincipalName') { aVal = a.UserPrincipalName.toLowerCase(); bVal = b.UserPrincipalName.toLowerCase(); }
    else if (sortField === 'Department') { aVal = (a.Department || '').toLowerCase(); bVal = (b.Department || '').toLowerCase(); }
    else if (sortField === 'Role') { aVal = a.role; bVal = b.role; }
    else if (sortField === 'LastLogin') { aVal = a.lastLoginTime; bVal = b.lastLoginTime; }
    if (aVal < bVal) return sortAscending ? -1 : 1;
    if (aVal > bVal) return sortAscending ? 1 : -1;
    return 0;
  });

  const totalItems = sortedUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + pageSize);
  const showFrom = totalItems === 0 ? 0 : startIndex + 1;
  const showTo = Math.min(startIndex + pageSize, totalItems);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.userManagementContainer}>
      {/* ── Header ── */}
      <div className={styles.headerSection}>
        <div className={styles.titleInfo}>
          <h2>User Management</h2>
          <p className={styles.subtitle}>Manage users, application access, and role permissions across the portal.</p>
        </div>
        <div className={styles.actionButtons}>
          <button className={styles.btnSync} onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <span className={styles.spinner} />
                Syncing...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.57-2.19" />
                </svg>
                Sync Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Status Notifications ── */}
      {syncStatus && (
        <div className={`${styles.syncStatusMessage} ${syncStatus.success ? styles.success : styles.error}`}>
          {syncStatus.success ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {syncStatus.message}
        </div>
      )}

      {/* ── Filters ── */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search users..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className={styles.selectWrapper}>
          <span className={styles.selectIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <line x1="9" y1="22" x2="9" y2="16" /><line x1="15" y1="22" x2="15" y2="16" />
              <line x1="9" y1="16" x2="15" y2="16" />
            </svg>
          </span>
          <select
            className={styles.selectFilter}
            value={selectedDepartment}
            onChange={(e) => { setSelectedDepartment(e.target.value); setCurrentPage(1); }}
          >
            <option value="All">All Departments</option>
            {departments.filter(d => d !== 'All').map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <span className={styles.selectArrow}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </span>
        </div>

        <div className={styles.selectWrapper}>
          <span className={styles.selectIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <select
            className={styles.selectFilter}
            value={selectedRole}
            onChange={(e) => { setSelectedRole(e.target.value as any); setCurrentPage(1); }}
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>
          <span className={styles.selectArrow}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </span>
        </div>

        <button
          className={styles.btnClear}
          onClick={() => { setSearchQuery(''); setSelectedDepartment('All'); setSelectedRole('All'); setCurrentPage(1); }}
        >
          Clear Filters
        </button>
      </div>

      {/* ── Table Grid ── */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <span className={styles.spinnerDark} />
            <span style={{ marginLeft: 12, color: '#666', fontWeight: 600 }}>Loading users data...</span>
          </div>
        ) : (
          <>
            <table className={styles.usersTable}>
              <thead>
                <tr>
                  <th onClick={() => handleSort('Title')}>
                    <div className={styles.headerCell}>NAME {renderSortArrow('Title')}</div>
                  </th>
                  <th onClick={() => handleSort('UserPrincipalName')}>
                    <div className={styles.headerCell}>EMAIL {renderSortArrow('UserPrincipalName')}</div>
                  </th>
                  <th onClick={() => handleSort('Department')}>
                    <div className={styles.headerCell}>DEPARTMENT {renderSortArrow('Department')}</div>
                  </th>
                  <th onClick={() => handleSort('Role')}>
                    <div className={styles.headerCell}>ROLE {renderSortArrow('Role')}</div>
                  </th>
                  {/*
                  <th>
                    <div className={styles.headerCell}>ASSIGNED APPLICATIONS</div>
                  </th>
                  */}
                  <th onClick={() => handleSort('LastLogin')}>
                    <div className={styles.headerCell}>LAST LOGIN {renderSortArrow('LastLogin')}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>
                      No records found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map(user => (
                    <tr key={user.Id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatar} style={{ backgroundColor: getAvatarColor(user.Title) }}>
                            {getUserInitials(user.Title)}
                          </div>
                          <div className={styles.userInfo}>
                            <span className={styles.name}>{user.Title}</span>
                          </div>
                        </div>
                      </td>
                      <td>{user.UserPrincipalName || user.Email}</td>
                      <td>{user.Department || 'Operations'}</td>
                      <td>
                        <span className={`${styles.roleBadge} ${user.role === 'Admin' ? styles.admin : styles.user}`}>
                          {user.role}
                        </span>
                      </td>
                      {/*
                      <td>
                        <span className={styles.appViewLink} onClick={() => setSelectedUser(user)}>
                          <span className={styles.appCount}>{user.assignedAppsCount}</span> view
                        </span>
                      </td>
                      */}
                      <td style={{ color: '#555' }}>{user.lastLoginText}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* ── Pagination Footer ── */}
            <div className={styles.paginationSection}>
              <div className={styles.showingLabel}>
                Showing {showFrom} to {showTo} of {totalItems} users
              </div>
              <div className={styles.rightControls}>
                <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  &lt;
                </button>
                <div className={styles.pageNumbers}>
                  {getPageNumbers(currentPage, totalPages).map((p, idx) => {
                    if (p === '...') {
                      return <span key={`ellipsis-${idx}`} className={styles.ellipsis}>...</span>;
                    }
                    return (
                      <button
                        key={p}
                        className={`${styles.numberBtn} ${currentPage === p ? styles.active : ''}`}
                        onClick={() => setCurrentPage(p as number)}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button className={styles.pageBtn} disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  &gt;
                </button>
                <div className={styles.pageSizeSelector}>
                  <select
                    className={styles.selectPageSize}
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Slide-out Details Drawer ── */}
      {selectedUser && (
        <div className={styles.drawerBackdrop} onClick={() => setSelectedUser(null)}>
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerAvatar} style={{ backgroundColor: getAvatarColor(selectedUser.Title) }}>
                {getUserInitials(selectedUser.Title)}
              </div>
              <div className={styles.drawerTitleInfo}>
                <h3>{selectedUser.Title}</h3>
                <p>{selectedUser.Department || 'Operations'}</p>
              </div>
              <button className={styles.drawerCloseBtn} onClick={() => setSelectedUser(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* ── User Information Card ── */}
              <div className={styles.drawerCard}>
                <h4>Account details</h4>
                <div className={styles.detailGrid}>
                  <div className={styles.detailLabel}>Email ID</div>
                  <div className={styles.detailValue}>{selectedUser.UserPrincipalName || selectedUser.Email}</div>
                  <div className={styles.detailLabel}>Job Title</div>
                  <div className={styles.detailValue}>{selectedUser.JobTitle || '—'}</div>
                  <div className={styles.detailLabel}>Office Location</div>
                  <div className={styles.detailValue}>{selectedUser.OfficeLocation || '—'}</div>
                </div>
              </div>

              {/* ── Role Management ── */}
              <div className={styles.drawerCard}>
                <h4>Administrative Privileges</h4>
                <p className={styles.cardDesc}>Admins can manage portal users, audit logs, and assign system applications.</p>
                {(() => {
                  const email = (selectedUser.UserPrincipalName || selectedUser.Email || '').toLowerCase();
                  const config = adminConfigs.find(c => c.UserMailId?.toLowerCase() === email);
                  const isAdmin = !!config && config.IsActive;
                  return (
                    <div className={styles.roleActionRow}>
                      <span className={`${styles.roleBadge} ${isAdmin ? styles.admin : styles.user}`}>
                        {isAdmin ? 'Admin' : 'User'}
                      </span>
                      <button
                        className={styles.roleToggleBtn}
                        disabled={updatingRole}
                        onClick={() => toggleAdminRole(selectedUser)}
                      >
                        {updatingRole ? 'Updating...' : (isAdmin ? 'Revoke Admin' : 'Grant Admin')}
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* ── Application Access List ──
              <div className={styles.drawerCard}>
                <h4>Assign Applications</h4>
                <p className={styles.cardDesc}>Toggle applications below to authorize or revoke direct SSO permissions for this user.</p>
                <div className={styles.appList}>
                  {applications.map(app => {
                    const email = (selectedUser.UserPrincipalName || selectedUser.Email).toLowerCase();
                    const isAssigned = app.IsVisibleToAll || app.assignedUserEmails.includes(email);
                    const isUpdating = updatingAccessAppId === app.Id;
                    return (
                      <div key={app.Id} className={styles.appItem}>
                        <div className={styles.appMeta}>
                          <span className={styles.appName}>{app.Title}</span>
                          <span className={styles.appCategory}>{app.Category}</span>
                        </div>
                        {app.IsVisibleToAll ? (
                          <span className={styles.publicTag}>Visible to all</span>
                        ) : (
                          <label className={styles.switchContainer}>
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              disabled={isUpdating}
                              onChange={() => toggleAppAccess(app, selectedUser)}
                            />
                            <span className={styles.sliderRound}></span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              ── */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
