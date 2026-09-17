import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import styles from './UserApplications.module.scss';
import { IApplicationWithUsers, AppCategory, IAppCategory } from '../../../../Types/ApplicationTypes';
import {
  saveUserPreferences,
  serializePrefIds,
  recordAppLaunch,
  parseUsageRecord,
  MAX_RECENT_LENGTH
} from '../../../../Service/UserPreferencesService';
import { writeActivityLog } from '../../../../Service/AuditLogService';

export interface IUserApplicationsProps {
  currentUserEmail: string;
  context?: any;
  applications: IApplicationWithUsers[];
  categories: IAppCategory[];
  favoriteAppIds: number[];
  setFavoriteAppIds: React.Dispatch<React.SetStateAction<number[]>>;
  recentAppIds: number[];
  setRecentAppIds: React.Dispatch<React.SetStateAction<number[]>>;
  mostUsedAppsRaw: string;
  setMostUsedAppsRaw: React.Dispatch<React.SetStateAction<string>>;
  userAadObjectId: string;
  userPrefsSpItemId: number | null;
  setUserPrefsSpItemId: React.Dispatch<React.SetStateAction<number | null>>;
}

const UserApplications: React.FC<IUserApplicationsProps> = (props) => {
  const {
    currentUserEmail, context, applications, categories,
    favoriteAppIds, setFavoriteAppIds, recentAppIds, setRecentAppIds,
    mostUsedAppsRaw, setMostUsedAppsRaw, userAadObjectId, userPrefsSpItemId, setUserPrefsSpItemId
  } = props;

  // ── State ──────────────────────────────────────────────────────────────────
  // Filters
  const [viewMode, setViewMode] = useState<'Grid' | 'List'>('Grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedStatus, setSelectedStatus] = useState<string>('All Status');
  const [activeTab, setActiveTab] = useState<'All' | 'Favorites' | 'Recent' | 'MostUsed'>('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);

  const [openMenuAppId, setOpenMenuAppId] = useState<number | null>(null);
  const [selectedAppForDetails, setSelectedAppForDetails] = useState<IApplicationWithUsers | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      setOpenMenuAppId(prev => {
        if (prev !== null && contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
          return null;
        }
        return prev;
      });
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const clearFilters = (): void => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setSelectedStatus('All Status');
    setCurrentPage(1);
  };

  const toggleFavorite = (appId: number): void => {
    const isRemoving = favoriteAppIds.includes(appId);
    const newFavs = isRemoving
      ? favoriteAppIds.filter(id => id !== appId)
      : [...favoriteAppIds, appId];

    // Optimistic UI update
    setFavoriteAppIds(newFavs);

    // Record activity asynchronously
    const app = applications.find(a => a.Id === appId);
    const appTitle = app ? app.Title : `ID: ${appId}`;
    const displayName = context.pageContext.user.displayName;
    writeActivityLog({
      Title: `${isRemoving ? 'Unfavourited' : 'Favourited'} Application: ${appTitle}`,
      EventType: isRemoving ? 'App Unfavourited' : 'App Favourited',
      ActorName: displayName || currentUserEmail,
      ActorEmail: currentUserEmail,
      TargetEntity: appTitle,
      TargetEntityId: appId,
      Description: `${displayName || currentUserEmail} ${isRemoving ? 'removed' : 'added'} '${appTitle}' ${isRemoving ? 'from' : 'to'} their favourites.`,
      Timestamp: new Date().toISOString()
    }).catch(e => console.error('Failed to write activity log:', e));

    if (userAadObjectId) {
      saveUserPreferences(userPrefsSpItemId, userAadObjectId, {
        FavouriteApps: serializePrefIds(newFavs),
        Title: displayName || currentUserEmail,
        UserEmail: currentUserEmail
      }).then(newSpItemId => {
        if (userPrefsSpItemId === null && newSpItemId !== null) {
          setUserPrefsSpItemId(newSpItemId);
        }
      }).catch(err => {
        console.error('Failed to save favourite to SharePoint:', err);
      });
    }
  };

  const launchApp = (appId: number, url: string): void => {
    const deduped = recentAppIds.filter(id => id !== appId);
    const newRecents = [appId, ...deduped].slice(0, MAX_RECENT_LENGTH);
    const updatedMostUsedRaw = recordAppLaunch(mostUsedAppsRaw, appId);

    // Optimistic UI update
    setRecentAppIds(newRecents);
    setMostUsedAppsRaw(updatedMostUsedRaw);

    // Record activity asynchronously
    const app = applications.find(a => a.Id === appId);
    const appTitle = app ? app.Title : `ID: ${appId}`;
    const displayName = context.pageContext.user.displayName;
    writeActivityLog({
      Title: `Launched Application: ${appTitle}`,
      EventType: 'App Launched',
      ActorName: displayName || currentUserEmail,
      ActorEmail: currentUserEmail,
      TargetEntity: appTitle,
      TargetEntityId: appId,
      Description: `${displayName || currentUserEmail} launched application '${appTitle}'.`,
      Timestamp: new Date().toISOString()
    }).catch(e => console.error('Failed to write activity log:', e));

    if (userAadObjectId) {
      saveUserPreferences(userPrefsSpItemId, userAadObjectId, {
        RecentApps: serializePrefIds(newRecents),
        MostUsedApps: updatedMostUsedRaw,
        Title: displayName || currentUserEmail,
        UserEmail: currentUserEmail
      }).then(newSpItemId => {
        if (userPrefsSpItemId === null && newSpItemId !== null) {
          setUserPrefsSpItemId(newSpItemId);
        }
      }).catch(err => {
        console.error('Failed to save recent/usage app to SharePoint:', err);
      });
    }
    window.open(url, '_blank');
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getCategoryStyles = (category: AppCategory): React.CSSProperties => {
    const isDark = typeof document !== 'undefined' && (
      document.querySelector('.darkTheme') !== null ||
      document.querySelector('[class*="darkTheme"]') !== null ||
      sessionStorage.getItem('STT_Theme_DarkMode') === 'true'
    );
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
        const brightColor = darkTextColors[cat.TextColor.toLowerCase()] || '#38BDF8';
        return { backgroundColor: '#26282E', color: brightColor };
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

  const formatRelativeTime = (isoString?: string): string => {
    if (!isoString) return 'Never launched';
    const now = new Date();
    const updated = new Date(isoString);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    return updated.toLocaleDateString();
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

  // ── Render Helpers ─────────────────────────────────────────────────────────
  const renderContextMenu = (app: IApplicationWithUsers): React.ReactNode => {
    if (openMenuAppId !== app.Id) return null;
    const isFav = favoriteAppIds.includes(app.Id);
    return (
      <div className={styles.contextMenu} ref={contextMenuRef} style={{ right: 0, top: '28px', position: 'absolute' }}>
        <button className={styles.menuItem} onClick={() => { launchApp(app.Id, app.AppURL); setOpenMenuAppId(null); }}>
          <i className="bi bi-box-arrow-up-right" style={{ fontSize: '13px', marginRight: '8px' }} />
          Open Application
        </button>
        <button className={styles.menuItem} onClick={() => { toggleFavorite(app.Id); setOpenMenuAppId(null); }}>
          <i className={`bi ${isFav ? 'bi-star-fill' : 'bi-star'}`} style={{ fontSize: '13px', marginRight: '8px', color: isFav ? '#4A5568' : '#718096' }} />
          {isFav ? 'Remove from Favorites' : 'Add to Favorites'}
        </button>
        <button className={styles.menuItem} onClick={() => { setSelectedAppForDetails(app); setOpenMenuAppId(null); }}>
          <i className="bi bi-info-circle" style={{ fontSize: '13px', marginRight: '8px' }} />
          View Details
        </button>
      </div>
    );
  };

  const renderPaginationSection = (
    startIndex: number,
    totalFiltered: number,
    page: number,
    totalPages: number,
    size: number,
    hasBorderTop: boolean = true
  ): React.ReactNode => (
    <div className={styles.paginationSection} style={hasBorderTop ? {} : { borderTop: 'none' }}>
      <div className={styles.showingLabel}>
        Showing {Math.min(startIndex + 1, totalFiltered)}-{Math.min(startIndex + size, totalFiltered)} of {totalFiltered} entries
      </div>
      <div className={styles.rightControls}>
        <button className={styles.pageBtn} onClick={() => setCurrentPage(Math.max(1, page - 1))} disabled={page === 1}>&lt;</button>
        <div className={styles.pageNumbers}>
          {getPageNumbers(page, totalPages).map((p, idx) => {
            if (p === '...') return <span key={`ellipsis-${idx}`} className={styles.ellipsis}>...</span>;
            return (
              <button key={p} className={`${styles.numberBtn} ${page === p ? styles.active : ''}`} onClick={() => setCurrentPage(p as number)}>{p}</button>
            );
          })}
        </div>
        <button className={styles.pageBtn} onClick={() => setCurrentPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>&gt;</button>
        <div className={styles.pageSizeSelector}>
          <select className={styles.selectPageSize} value={size} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
            <option value="4">4</option>
            <option value="8">8</option>
            <option value="12">12</option>
            <option value="16">16</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderDetailsDrawer = (): React.ReactNode => {
    if (!selectedAppForDetails) return null;
    const catStyle = getCategoryStyles(selectedAppForDetails.Category);
    return (
      <div
        className={styles.drawerBackdrop}
        onClick={(e) => { if (e.target === e.currentTarget) setSelectedAppForDetails(null); }}
      >
        <div className={styles.drawerPanel}>
          <div className={styles.drawerHeader}>
            <div
              className={styles.detailAvatar}
              style={{
                backgroundColor: selectedAppForDetails.IconName ? 'transparent' : getHashCodeColor(selectedAppForDetails.Title),
                boxShadow: selectedAppForDetails.IconName ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}
            >
              {selectedAppForDetails.IconName ? (
                <i className={`bi bi-${selectedAppForDetails.IconName}`} style={{ fontSize: '32px', color: '#7C3AED' }} />
              ) : (
                selectedAppForDetails.Title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
              )}
            </div>
            <div className={styles.drawerTitleInfo}>
              <h3>{selectedAppForDetails.Title}</h3>
              <div className={styles.detailBadgeRow}>
                {(() => {
                  if (!selectedAppForDetails.Category) return null;
                  const cat = categories.find(c => c.Title === selectedAppForDetails.Category);
                  if (!cat || !cat.IsActive) return null;
                  return <span className={styles.categoryTag} style={catStyle}>{selectedAppForDetails.Category}</span>;
                })()}
                <span className={styles.statusDot}>
                  <span className={`${styles.dot} ${selectedAppForDetails.Status === 'Active' ? styles.active : styles.inactive}`}></span>
                  {selectedAppForDetails.Status}
                </span>
              </div>
            </div>
            <button className={styles.drawerCloseBtn} onClick={() => setSelectedAppForDetails(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className={styles.drawerBody}>
            <div className={styles.drawerCard}>
              <h4>Application Details</h4>
              <div className={styles.detailGrid}>
                <div className={styles.detailLabel}>Application Name</div>
                <div className={styles.detailValue}>{selectedAppForDetails.Title}</div>
                <div className={styles.detailLabel}>Description</div>
                <div className={styles.detailValue}>{selectedAppForDetails.Description || 'No description provided.'}</div>
                <div className={styles.detailLabel}>Category</div>
                <div className={styles.detailValue}>{selectedAppForDetails.Category || 'N/A'}</div>
                <div className={styles.detailLabel}>Status</div>
                <div className={styles.detailValue}>{selectedAppForDetails.Status || 'N/A'}</div>
                <div className={styles.detailLabel}>Last Accessed</div>
                <div className={styles.detailValue}>{formatRelativeTime(selectedAppForDetails.LastUpdatedDate)}</div>
                <div className={styles.detailLabel}>App URL</div>
                <div className={styles.detailValue}>
                  <a href={selectedAppForDetails.AppURL} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>
                    {selectedAppForDetails.AppURL}
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.drawerFooter}>
            <button
              className={styles.btnLaunchApp}
              onClick={() => { launchApp(selectedAppForDetails.Id, selectedAppForDetails.AppURL); setSelectedAppForDetails(null); }}
            >
              Launch Application
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Derived State ──────────────────────────────────────────────────────────
  const baseFiltered = applications.filter(app => {
    if (selectedCategory !== 'All Categories' && app.Category !== selectedCategory) return false;
    if (selectedStatus !== 'All Status' && app.Status !== selectedStatus) return false;
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      return app.Title.toLowerCase().includes(q) || (app.Description && app.Description.toLowerCase().includes(q));
    }
    return true;
  });

  const favCount = baseFiltered.filter(app => favoriteAppIds.includes(app.Id)).length;
  const recentCount = baseFiltered.filter(app => recentAppIds.includes(app.Id)).length;
  const usageRec = parseUsageRecord(mostUsedAppsRaw);

  let filteredApps = [...baseFiltered];
  if (activeTab === 'All') {
    filteredApps.sort((a, b) => {
      const freqA = usageRec.frequencies[a.Id.toString()] || 0;
      const freqB = usageRec.frequencies[b.Id.toString()] || 0;
      if (freqA !== freqB) return freqB - freqA;
      return a.Title.localeCompare(b.Title);
    });
  } else if (activeTab === 'Favorites') {
    filteredApps = filteredApps.filter(app => favoriteAppIds.includes(app.Id));
  } else if (activeTab === 'Recent') {
    filteredApps = filteredApps.filter(app => recentAppIds.includes(app.Id));
    filteredApps.sort((a, b) => recentAppIds.indexOf(a.Id) - recentAppIds.indexOf(b.Id));
  } else if (activeTab === 'MostUsed') {
    filteredApps = filteredApps.filter(app => Object.keys(usageRec.frequencies).includes(app.Id.toString()));
    filteredApps.sort((a, b) => (usageRec.frequencies[b.Id.toString()] || 0) - (usageRec.frequencies[a.Id.toString()] || 0));
  }

  const totalFiltered = filteredApps.length;
  const totalAppsCount = applications.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedApps = filteredApps.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(totalFiltered / pageSize);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.userAppsContainer}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.titleInfo}>
          <h2>Applications</h2>
          <p className={styles.subtitle}>Browse and launch your authorized applications.</p>
        </div>

        {/* Grid / List Switcher */}
        <div className={styles.viewModeToggle}>
          <button
            className={`${styles.toggleBtn} ${viewMode === 'Grid' ? styles.active : ''}`}
            onClick={() => setViewMode('Grid')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Grid
          </button>
          <button
            className={`${styles.toggleBtn} ${viewMode === 'List' ? styles.active : ''}`}
            onClick={() => { setViewMode('List'); setCurrentPage(1); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            List
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterRow}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
          {searchQuery && (
            <span className={styles.clearSearchIcon} onClick={() => setSearchQuery('')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </span>
          )}
        </div>

        <div className={styles.dropdownWrapper}>
          <span className={styles.filterIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </span>
          <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}>
            <option value="All Categories">All Categories</option>
            {categories.map(cat => <option key={cat.Id} value={cat.Title}>{cat.Title}</option>)}
          </select>
        </div>

        {/* Commented out Status filter dropdown wrapper as users only view active apps
        <div className={`${styles.dropdownWrapper} ${styles.noIcon}`}>
          <select value={selectedStatus} onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}>
            <option value="All Status">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        */}

        {(searchQuery || selectedCategory !== 'All Categories' || selectedStatus !== 'All Status') && (
          <button className={styles.btnClearFilters} onClick={clearFilters}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear Filters
          </button>
        )}
      </div>

      {/* Tab Row */}
      <div className={styles.tabRow}>
        <div className={styles.tabBar}>
          <button className={`${styles.tabItem} ${activeTab === 'All' ? styles.active : ''}`} onClick={() => { setActiveTab('All'); setCurrentPage(1); }}>
            All Applications <span className={styles.countBadge}>{baseFiltered.length}</span>
          </button>
          <button className={`${styles.tabItem} ${activeTab === 'Favorites' ? styles.active : ''}`} onClick={() => { setActiveTab('Favorites'); setCurrentPage(1); }}>
            Favorites <span className={styles.countBadge}>{favCount}</span>
          </button>
          <button className={`${styles.tabItem} ${activeTab === 'Recent' ? styles.active : ''}`} onClick={() => { setActiveTab('Recent'); setCurrentPage(1); }}>
            Recent <span className={styles.countBadge}>{recentCount}</span>
          </button>
        </div>
        <div className={styles.showingLabel}>Showing {totalFiltered} of {totalAppsCount} applications</div>
      </div>

      {/* Content Area */}
      {totalFiltered === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#888', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #eaeaea' }}>
          No authorized applications match the selected filters.
        </div>
      ) : viewMode === 'Grid' ? (
        <>
          <div className={styles.appsGrid}>
            {paginatedApps.map(app => {
              const catStyle = getCategoryStyles(app.Category);
              return (
                <div key={app.Id} className={styles.appCard}>
                  <div className={styles.cardHeader}>
                    <div
                      className={styles.iconFrame}
                      style={{
                        backgroundColor: app.IconName ? 'transparent' : getHashCodeColor(app.Title),
                        boxShadow: app.IconName ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      {app.IconName ? (
                        <i className={`bi bi-${app.IconName}`} style={{ fontSize: '24px', color: '#7C3AED' }} />
                      ) : (
                        app.Title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.btnAction}
                        onClick={() => toggleFavorite(app.Id)}
                        title={favoriteAppIds.includes(app.Id) ? 'Remove from Favorites' : 'Add to Favorites'}
                        style={{ cursor: 'pointer' }}
                      >
                        <svg
                          width="16" height="16" viewBox="0 0 24 24"
                          fill={favoriteAppIds.includes(app.Id) ? '#D946EF' : 'none'}
                          stroke={favoriteAppIds.includes(app.Id) ? '#D946EF' : '#bbbbbb'}
                          strokeWidth="2"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                      <div style={{ position: 'relative' }}>
                        <button
                          className={styles.btnAction}
                          onClick={() => setOpenMenuAppId(openMenuAppId === app.Id ? null : app.Id)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>
                        {renderContextMenu(app)}
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardTitleInfo}>
                    <h3 onClick={() => launchApp(app.Id, app.AppURL)} style={{ cursor: 'pointer' }} title="Click to launch">
                      {app.Title}
                    </h3>
                    <p className={styles.desc} title={app.Description}>{app.Description || 'No description provided.'}</p>
                  </div>

                  <div className={styles.cardMetaRow}>
                    {(() => {
                      if (!app.Category) return null;
                      const isCatActive = categories.some(c => c.Title === app.Category);
                      if (!isCatActive) return null;
                      return <span className={styles.categoryTag} style={catStyle}>{app.Category}</span>;
                    })()}
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.statusDot}>
                      <span className={`${styles.dot} ${app.Status === 'Active' ? styles.active : styles.inactive}`}></span>
                      {app.Status}
                    </span>
                    <span className={styles.lastUpdated}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {totalFiltered > 0 && (
            <div className={styles.tableCard} style={{ marginTop: '24px' }}>
              {renderPaginationSection(startIndex, totalFiltered, currentPage, totalPages, pageSize, false)}
            </div>
          )}
        </>
      ) : (
        /* List Mode Table */
        <div className={styles.tableCard}>
          <table className={styles.appsTable}>
            <thead>
              <tr>
                <th>APPLICATION</th>
                <th>CATEGORY</th>
                <th>STATUS</th>
                <th>LAST ACCESSED</th>
                <th style={{ width: '80px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedApps.map(app => {
                const catStyle = getCategoryStyles(app.Category);
                return (
                  <tr key={app.Id}>
                    <td>
                      <div className={styles.appCell}>
                        <button
                          className={styles.btnStar}
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(app.Id); }}
                          title={favoriteAppIds.includes(app.Id) ? 'Remove from Favorites' : 'Add to Favorites'}
                        >
                          <i className={`bi ${favoriteAppIds.includes(app.Id) ? 'bi-star-fill' : 'bi-star'} ${favoriteAppIds.includes(app.Id) ? styles.favoriteActive : styles.favoriteInactive}`} />
                        </button>
                        <div
                          className={styles.iconSmall}
                          style={{
                            backgroundColor: app.IconName ? 'transparent' : getHashCodeColor(app.Title),
                            boxShadow: app.IconName ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          {app.IconName ? (
                            <i className={`bi bi-${app.IconName}`} style={{ fontSize: '14px', color: '#7C3AED' }} />
                          ) : (
                            app.Title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                          )}
                        </div>
                        <div className={styles.nameDescContainer}>
                          <span className={styles.name} onClick={() => launchApp(app.Id, app.AppURL)} style={{ cursor: 'pointer' }}>
                            {app.Title}
                          </span>
                          <span className={styles.description}>{app.Description || 'No description provided.'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {(() => {
                        if (!app.Category) return null;
                        const isCatActive = categories.some(c => c.Title === app.Category);
                        if (!isCatActive) return null;
                        return <span className={styles.categoryTag} style={catStyle}>{app.Category}</span>;
                      })()}
                    </td>
                    <td>
                      <span className={styles.statusDot}>
                        <span className={`${styles.dot} ${app.Status === 'Active' ? styles.active : styles.inactive}`}></span>
                        {app.Status}
                      </span>
                    </td>
                    <td>{formatRelativeTime(app.LastUpdatedDate)}</td>
                    <td style={{ position: 'relative', textAlign: 'center' }}>
                      <button
                        className={styles.btnThreeDots}
                        onClick={(e) => { e.stopPropagation(); setOpenMenuAppId(openMenuAppId === app.Id ? null : app.Id); }}
                        title="Actions"
                      >
                        <i className="bi bi-three-dots-vertical" style={{ fontSize: '16px' }} />
                      </button>
                      {renderContextMenu(app)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalFiltered > 0 && renderPaginationSection(startIndex, totalFiltered, currentPage, totalPages, pageSize, true)}
        </div>
      )}

      {/* Render Details Drawer */}
      {renderDetailsDrawer()}
    </div>
  );
};

export default UserApplications;
