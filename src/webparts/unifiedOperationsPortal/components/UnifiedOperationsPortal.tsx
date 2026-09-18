import * as React from 'react';
import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import styles from './UnifiedOperationsPortal.module.scss';
import type { IUnifiedOperationsPortalProps } from './IUnifiedOperationsPortalProps';
import { getUserAccess } from '../../../Service/commonService';
import { UOPUserAccess } from '../../../Types/common';
import { writeAuditLog, writeActivityLog } from '../../../Service/AuditLogService';
import AuditLogs from './AuditLogs/AuditLogs';
import AdminApplications from './AdminApplications/AdminApplications';
import UserApplications from './UserApplications/UserApplications';
import { IApplicationWithUsers, IAppCategory, AppCategory } from '../../../Types/ApplicationTypes';
import { getApplications, getApplicationsForUser } from '../../../Service/ApplicationService';
import { getAppCategories } from '../../../Service/CategoryService';
import { getADUsers } from '../../../Service/ADUsersService';
import UserProfile from './UserProfile/UserProfile';
import {
  getUserPreferences,
  saveUserPreferences,
  parsePrefIds,
  serializePrefIds,
  MAX_RECENT_LENGTH,
  recordAppLaunch,
  parseUsageRecord
} from '../../../Service/UserPreferencesService';

import STTGDCLogoFull from '../assets/STTGDC_Logo_Full.png';
import STTGDCLogoWhite from '../assets/STTGDC_Logo_White.png';

type ViewKey = 'dashboard' | 'applications' | 'profile' | 'logs';

const getInitialLoginTime = (): string => {
  let storedLoginTime = sessionStorage.getItem('UOP_Session_LoginTime');
  if (!storedLoginTime) {
    storedLoginTime = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    });
    sessionStorage.setItem('UOP_Session_LoginTime', storedLoginTime);
  }
  return storedLoginTime;
};

interface IAdminRouteProps {
  userAccess: UOPUserAccess | null;
  children: React.ReactElement;
}

const AdminRoute: React.FC<IAdminRouteProps> = ({ userAccess, children }) => {
  if (userAccess === null) return null;
  return userAccess === 'Admin' ? children : <Navigate to="/" replace />;
};

const UnifiedOperationsPortal: React.FC<IUnifiedOperationsPortalProps> = (props) => {
  const { userDisplayName, userEmail, context } = props;

  // ── State ──────────────────────────────────────────────────────────────────
  const [userAccess, setUserAccess] = useState<UOPUserAccess>(() => {
    const savedRole = localStorage.getItem('UOP_ACTIVE_ROLE');
    if (savedRole === 'User' || savedRole === 'Admin') return savedRole;
    return 'Admin';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStatus, setLoadingStatus] = useState<string>('Initializing...');
  const [applications, setApplications] = useState<IApplicationWithUsers[]>([]);
  const [categories, setCategories] = useState<IAppCategory[]>([]);
  const [userViewMode, setUserViewMode] = useState<'Grid' | 'List'>('Grid');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userActiveTab, setUserActiveTab] = useState<'Recent' | 'Favorites' | 'MostUsed' | 'All'>('All');
  const [favoriteAppIds, setFavoriteAppIds] = useState<number[]>([]);
  const [recentAppIds, setRecentAppIds] = useState<number[]>([]);
  const [mostUsedAppsRaw, setMostUsedAppsRaw] = useState<string>('');
  const [userAadObjectId, setUserAadObjectId] = useState<string>('');
  const [userPrefsSpItemId, setUserPrefsSpItemId] = useState<number | null>(null);
  const [userDashboardCurrentPage, setUserDashboardCurrentPage] = useState<number>(1);
  const [userDashboardPageSize] = useState<number>(8);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(sessionStorage.getItem('STT_Theme_DarkMode') === 'true');
  const [loginTime] = useState<string>(getInitialLoginTime());

  const handleSetRole = (role: UOPUserAccess): void => {
    setUserAccess(role);
    localStorage.setItem('UOP_ACTIVE_ROLE', role);
  };

  const handleToggleRole = (): void => {
    const nextRole: UOPUserAccess = userAccess === 'Admin' ? 'User' : 'Admin';
    handleSetRole(nextRole);
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async (): Promise<void> => {
      setLoadingStatus('Verifying access...');
      const access = await getUserAccess();
      const savedRole = localStorage.getItem('UOP_ACTIVE_ROLE');
      const activeRole: UOPUserAccess = (savedRole === 'User' || savedRole === 'Admin') ? savedRole : access;
      setUserAccess(activeRole);

      setLoadingStatus('Loading data...');
      try {
        const [allApps, cats, adUsers, userApps] = await Promise.all([
          getApplications(),
          getAppCategories(false),
          getADUsers(),
          getApplicationsForUser(userEmail || '')
        ]);

        setApplications(allApps);
        setCategories(cats);

        let adObjectId = '';
        if (context && context.pageContext && context.pageContext.aadInfo && context.pageContext.aadInfo.userId) {
          adObjectId = context.pageContext.aadInfo.userId.toString();
        }

        if (!adObjectId && adUsers && adUsers.length > 0) {
          const lowerEmail = (userEmail || '').toLowerCase();
          const adUser = adUsers.find(
            u => (u.UserPrincipalName || '').toLowerCase() === lowerEmail || (u.Email || '').toLowerCase() === lowerEmail
          );
          if (adUser) adObjectId = adUser.AD_ObjectId;
        }

        if (!adObjectId) {
          adObjectId = (userEmail || 'mock-user-id').toLowerCase();
        }

        let favIds: number[] = [];
        let recentIds: number[] = [];
        let mostUsedRaw = '';
        let prefsSpItemId: number | null = null;

        if (adObjectId) {
          const prefs = await getUserPreferences(adObjectId);
          if (prefs) {
            favIds = parsePrefIds(prefs.FavouriteApps);
            recentIds = parsePrefIds(prefs.RecentApps);
            mostUsedRaw = prefs.MostUsedApps || '';
            prefsSpItemId = prefs.Id;
          }
        }

        setUserAadObjectId(adObjectId);
        setUserPrefsSpItemId(prefsSpItemId);
        setFavoriteAppIds(favIds);
        setRecentAppIds(recentIds);
        setMostUsedAppsRaw(mostUsedRaw);
        setLoadingStatus('');
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading portal data:', err);
        setLoadingStatus('');
        setIsLoading(false);
      }

      // Log the user login event only once per browser session
      const sessionLogged = sessionStorage.getItem('UOP_Session_Logged');
      if (!sessionLogged) {
        try {
          await writeAuditLog({
            Title: 'User Login',
            EventType: 'Login',
            ActorName: userDisplayName || userEmail,
            ActorEmail: userEmail,
            Description: `${userDisplayName || userEmail} logged into the portal.`,
            Timestamp: new Date().toISOString()
          });
          sessionStorage.setItem('UOP_Session_Logged', 'true');
        } catch (err) {
          console.error('Failed to log user login:', err);
        }
      }
    };

    void init();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('darkTheme', isDarkMode);
    document.documentElement.classList.toggle('darkTheme', isDarkMode);
    if (isDarkMode) {
      document.body.style.backgroundColor = '#000000';
      document.documentElement.style.backgroundColor = '#000000';
    } else {
      document.body.style.backgroundColor = '#f8fafc';
      document.documentElement.style.backgroundColor = '#f8fafc';
    }
  }, [isDarkMode]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleTheme = (darkMode: boolean): void => {
    setIsDarkMode(darkMode);
    sessionStorage.setItem('STT_Theme_DarkMode', String(darkMode));
  };

  const toggleFavorite = (appId: number): void => {
    const isRemoving = favoriteAppIds.includes(appId);
    const newFavs = isRemoving ? favoriteAppIds.filter(id => id !== appId) : [...favoriteAppIds, appId];
    setFavoriteAppIds(newFavs);

    const app = applications.find(a => a.Id === appId);
    const appTitle = app ? app.Title : `ID: ${appId}`;
    writeActivityLog({
      Title: `${isRemoving ? 'Unfavourited' : 'Favourited'} Application: ${appTitle}`,
      EventType: isRemoving ? 'App Unfavourited' : 'App Favourited',
      ActorName: userDisplayName || userEmail,
      ActorEmail: userEmail,
      TargetEntity: appTitle,
      TargetEntityId: appId,
      Description: `${userDisplayName || userEmail} ${isRemoving ? 'removed' : 'added'} '${appTitle}' ${isRemoving ? 'from' : 'to'} their favourites.`,
      Timestamp: new Date().toISOString()
    }).catch(e => console.error('Failed to write activity log:', e));

    if (userAadObjectId) {
      saveUserPreferences(userPrefsSpItemId, userAadObjectId, {
        FavouriteApps: serializePrefIds(newFavs),
        Title: userDisplayName || userEmail,
        UserEmail: userEmail
      }).then(newSpItemId => {
        if (userPrefsSpItemId === null && newSpItemId !== null) setUserPrefsSpItemId(newSpItemId);
      }).catch(err => console.error('Failed to save favourite to SharePoint:', err));
    }
  };

  const launchUserApp = (appId: number, url: string): void => {
    const deduped = recentAppIds.filter(id => id !== appId);
    const newRecents = [appId, ...deduped].slice(0, MAX_RECENT_LENGTH);
    const updatedMostUsedRaw = recordAppLaunch(mostUsedAppsRaw, appId);

    setRecentAppIds(newRecents);
    setMostUsedAppsRaw(updatedMostUsedRaw);

    const app = applications.find(a => a.Id === appId);
    const appTitle = app ? app.Title : `ID: ${appId}`;
    writeActivityLog({
      Title: `Launched Application: ${appTitle}`,
      EventType: 'App Launched',
      ActorName: userDisplayName || userEmail,
      ActorEmail: userEmail,
      TargetEntity: appTitle,
      TargetEntityId: appId,
      Description: `${userDisplayName || userEmail} launched application '${appTitle}'.`,
      Timestamp: new Date().toISOString()
    }).catch(e => console.error('Failed to write activity log:', e));

    if (userAadObjectId) {
      saveUserPreferences(userPrefsSpItemId, userAadObjectId, {
        RecentApps: serializePrefIds(newRecents),
        MostUsedApps: updatedMostUsedRaw,
        Title: userDisplayName || userEmail,
        UserEmail: userEmail
      }).then(newSpItemId => {
        if (userPrefsSpItemId === null && newSpItemId !== null) setUserPrefsSpItemId(newSpItemId);
      }).catch(err => console.error('Failed to save preferences to SharePoint:', err));
    }
    window.open(url, '_blank');
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getCategoryStyles = (category: AppCategory): React.CSSProperties => {
    const cat = categories.find(c => c.Title === category);
    if (cat && cat.BgColor && cat.TextColor) {
      if (isDarkMode) {
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
    return isDarkMode ? { backgroundColor: '#26282E', color: '#94A3B8' } : { backgroundColor: '#eaeaea', color: '#555555' };
  };

  const getHashCodeColor = (str: string): string => {
    const colors = ['#7C3AED', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4', '#3B82F6', '#D946EF', '#6366F1'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const formatRelativeTime = (isoString?: string): string => {
    if (!isoString) return 'Never updated';
    const now = new Date();
    const updated = new Date(isoString);
    const diffMs = now.getTime() - updated.getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return '1 week ago';
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    return updated.toLocaleDateString();
  };

  // ── Render Helpers ─────────────────────────────────────────────────────────
  const renderIcon = (type: ViewKey, active: boolean): React.ReactElement => {
    const color = active ? '#7C3AED' : '#555555';
    switch (type) {
      case 'dashboard':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case 'applications':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
          </svg>
        );
      case 'profile':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        );

      case 'logs':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
    }
  };

  const renderThemeToggle = (): React.ReactNode => (
    <button
      className={styles.themeSingleToggleBtn}
      onClick={() => toggleTheme(!isDarkMode)}
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDarkMode ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );

  const renderUserBannerChart = (): React.ReactNode => {
    const totalApps = applications.length;
    const favCount = favoriteAppIds.filter(id => applications.some(a => a.Id === id)).length;
    const recentCount = recentAppIds.filter(id => applications.some(a => a.Id === id)).length;

    const stats = [
      {
        label: 'Total Applications', value: totalApps,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        )
      },
      {
        label: 'Favourites', value: favCount,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        )
      },
      {
        label: 'Recently Used', value: recentCount,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        )
      }
    ];

    return (
      <div className={styles.bannerStats}>
        {stats.map((stat, idx) => (
          <React.Fragment key={stat.label}>
            <div className={styles.bannerStatCard}>
              <div className={styles.bannerStatHeader}>
                <span className={styles.bannerStatIcon}>{stat.icon}</span>
                <span className={styles.bannerStatLabel}>{stat.label}</span>
              </div>
              <strong className={styles.bannerStatNumber}>{stat.value}</strong>
            </div>
            {idx < stats.length - 1 && <div className={styles.bannerStatDivider} />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderAdminBannerChart = (): React.ReactNode => {
    const totalApps = applications.length;
    const activeCats = categories.filter(c => c.IsActive).length;

    const stats = [
      {
        label: 'Total Applications',
        value: totalApps,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        )
      },
      {
        label: 'App Categories',
        value: activeCats,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        )
      },
      {
        label: 'System Status',
        value: 'Active',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        )
      }
    ];

    return (
      <div className={styles.bannerStats}>
        {stats.map((stat, idx) => (
          <React.Fragment key={stat.label}>
            <div className={styles.bannerStatCard}>
              <div className={styles.bannerStatHeader}>
                <span className={styles.bannerStatIcon}>{stat.icon}</span>
                <span className={styles.bannerStatLabel}>{stat.label}</span>
              </div>
              <strong className={styles.bannerStatNumber}>{stat.value}</strong>
            </div>
            {idx < stats.length - 1 && <div className={styles.bannerStatDivider} />}
          </React.Fragment>
        ))}
      </div>
    );
  };



  const renderApplicationsShowcase = (): React.ReactNode => {
    const displayedApps = applications.slice(0, 10);
    return (
      <div className={styles.showcaseSection}>
        <div className={styles.showcaseHeader}>
          <div>
            <h2 className={styles.showcaseTitle}>Applications Showcase</h2>
            <p className={styles.showcaseSubtitle}>Explore applications available in the portal</p>
          </div>
          <button className={styles.viewAllLink} onClick={() => { window.location.hash = '#/applications'; }}>
            View All Applications &gt;
          </button>
        </div>
        <div className={styles.showcaseGrid}>
          {displayedApps.map(app => {
            const catStyle = getCategoryStyles(app.Category);
            return (
              <div key={app.Id} className={styles.showcaseCard} onClick={() => window.open(app.AppURL, '_blank')} style={{ cursor: 'pointer' }} title="Click to launch application">
                <div className={styles.showcaseCardHeader}>
                  <div className={styles.showcaseIconFrame} style={{ backgroundColor: app.IconName ? 'transparent' : getHashCodeColor(app.Title), boxShadow: app.IconName ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.05)' }}>
                    {app.IconName ? <i className={`bi bi-${app.IconName}`} style={{ fontSize: '24px', color: '#7C3AED' }} /> : app.Title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <span className={styles.showcaseStatusDot}>
                    <span className={`${styles.dot} ${app.Status === 'Active' ? styles.active : styles.inactive}`}></span>
                    {app.Status}
                  </span>
                </div>
                <div className={styles.showcaseCardBody}>
                  <h3>{app.Title}</h3>
                  <p className={styles.showcaseDesc} title={app.Description}>{app.Description || 'No description provided.'}</p>
                </div>
                <div className={styles.showcaseCardFooter}>
                  {(() => {
                    if (!app.Category) return null;
                    const cat = categories.find(c => c.Title === app.Category);
                    if (!cat || !cat.IsActive) return null;
                    return <span className={styles.showcaseCategoryTag} style={catStyle}>{app.Category}</span>;
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderUserApplicationsShowcase = (): React.ReactNode => {
    let filtered = applications.filter(app => {
      const q = userSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return app.Title.toLowerCase().includes(q) || (app.Description && app.Description.toLowerCase().includes(q));
    });

    const usageRec = parseUsageRecord(mostUsedAppsRaw);

    if (userActiveTab === 'All') {
      filtered.sort((a, b) => {
        const freqA = usageRec.frequencies[a.Id.toString()] || 0;
        const freqB = usageRec.frequencies[b.Id.toString()] || 0;
        if (freqA !== freqB) return freqB - freqA;
        return a.Title.localeCompare(b.Title);
      });
    } else if (userActiveTab === 'Favorites') {
      filtered = filtered.filter(app => favoriteAppIds.includes(app.Id));
    } else if (userActiveTab === 'Recent') {
      const recent = filtered.filter(app => recentAppIds.includes(app.Id));
      if (recent.length === 0) {
        // No recent apps yet — fall back to showing the first 2 apps
        filtered = filtered.slice(0, 2);
      } else {
        recent.sort((a, b) => recentAppIds.indexOf(a.Id) - recentAppIds.indexOf(b.Id));
        filtered = recent.slice(0, 5);
      }
    } else if (userActiveTab === 'MostUsed') {
      const appIds = Object.keys(usageRec.frequencies);
      filtered = filtered.filter(app => appIds.includes(app.Id.toString()));
      filtered.sort((a, b) => (usageRec.frequencies[b.Id.toString()] || 0) - (usageRec.frequencies[a.Id.toString()] || 0));
    }

    const totalFiltered = filtered.length;
    const paginatedApps = filtered;

    return (
      <div className={styles.userShowcaseSection}>
        <div className={styles.userShowcaseHeader}>
          <h2 className={styles.userShowcaseTitle}>Applications</h2>
          <div className={styles.userShowcaseControls}>
            <div className={styles.userSearchContainer}>
              <svg className={styles.userSearchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Search applications..." value={userSearchQuery} onChange={e => { setUserSearchQuery(e.target.value); setUserDashboardCurrentPage(1); }} />
              {userSearchQuery && (
                <span className={styles.userClearSearchIcon} onClick={() => { setUserSearchQuery(''); setUserDashboardCurrentPage(1); }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
              )}
            </div>
            <div className={styles.userViewModeToggle}>
              <button className={`${styles.userToggleBtn} ${userViewMode === 'Grid' ? styles.active : ''}`} onClick={() => { setUserViewMode('Grid'); setUserDashboardCurrentPage(1); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
                Grid View
              </button>
              <button className={`${styles.userToggleBtn} ${userViewMode === 'List' ? styles.active : ''}`} onClick={() => { setUserViewMode('List'); setUserDashboardCurrentPage(1); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                List View
              </button>
            </div>
          </div>
        </div>

        <div className={styles.userCapsuleTabBar}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={`${styles.userCapsuleTab} ${userActiveTab === 'All' ? styles.active : ''}`} onClick={() => { setUserActiveTab('All'); setUserDashboardCurrentPage(1); }}>
              All Applications
              <span className={styles.tabCount}>{applications.length}</span>
            </button>
            <button className={`${styles.userCapsuleTab} ${userActiveTab === 'Favorites' ? styles.active : ''}`} onClick={() => { setUserActiveTab('Favorites'); setUserDashboardCurrentPage(1); }}>
              Favourites
              <span className={styles.tabCount}>{favoriteAppIds.filter(id => applications.some(a => a.Id === id)).length}</span>
            </button>
            <button className={`${styles.userCapsuleTab} ${userActiveTab === 'Recent' ? styles.active : ''}`} onClick={() => { setUserActiveTab('Recent'); setUserDashboardCurrentPage(1); }}>
              Recent
              <span className={styles.tabCount}>{recentAppIds.filter(id => applications.some(a => a.Id === id)).length}</span>
            </button>
          </div>
        </div>

        {totalFiltered === 0 ? (
          <div className={styles.userShowcaseEmpty}>No applications found matching your criteria.</div>
        ) : userViewMode === 'Grid' ? (
          <div className={styles.userShowcaseGrid}>
            {paginatedApps.map(app => {
              const cat = categories.find(c => c.Title === app.Category);
              const catStyle = getCategoryStyles(app.Category);
              const isFav = favoriteAppIds.includes(app.Id);
              return (
                <div key={app.Id} className={styles.userShowcaseCard}>
                  <div className={styles.userShowcaseCardHeader}>
                    <div className={styles.userShowcaseIconFrame} style={{ backgroundColor: app.IconName ? 'transparent' : getHashCodeColor(app.Title), boxShadow: app.IconName ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.05)' }}>
                      {app.IconName ? <i className={`bi bi-${app.IconName}`} style={{ fontSize: '24px', color: '#7C3AED' }} /> : app.Title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <button className={styles.userShowcaseStarButton} onClick={(e) => { e.stopPropagation(); toggleFavorite(app.Id); }}>
                      <i className={`bi ${isFav ? 'bi-star-fill' : 'bi-star'}`} style={{ color: isFav ? '#D946EF' : '#bbbbbb', fontSize: '18px' }} />
                    </button>
                  </div>
                  <div className={styles.userShowcaseCardBody}>
                    <h3 onClick={() => launchUserApp(app.Id, app.AppURL)} style={{ cursor: 'pointer' }}>{app.Title}</h3>
                    <p className={styles.userShowcaseDesc} title={app.Description}>{app.Description || 'No description provided.'}</p>
                  </div>
                  <div className={styles.userShowcaseCardFooter}>
                    {cat && cat.IsActive && <span className={styles.userShowcaseCategoryTag} style={catStyle}>{app.Category}</span>}
                    <span className={styles.userShowcaseRelativeTime}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }}>
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      {formatRelativeTime(app.LastUpdatedDate)}
                    </span>
                  </div>
                  </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.userShowcaseList}>
            {paginatedApps.map(app => {
              const isFav = favoriteAppIds.includes(app.Id);
              return (
                <div key={app.Id} className={styles.userShowcaseListRow} onClick={() => launchUserApp(app.Id, app.AppURL)}>
                  <div className={styles.userShowcaseListRowLeft}>
                    <div className={styles.userShowcaseIconFrame} style={{ backgroundColor: app.IconName ? 'transparent' : getHashCodeColor(app.Title), boxShadow: app.IconName ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.05)' }}>
                      {app.IconName ? <i className={`bi bi-${app.IconName}`} style={{ fontSize: '20px', color: '#7C3AED' }} /> : app.Title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className={styles.userShowcaseListRowText}>
                      <h3>{app.Title}</h3>
                      <p className={styles.userShowcaseListDesc}>{app.Description || 'No description provided.'}</p>
                    </div>
                  </div>
                  <div className={styles.userShowcaseListRowRight}>
                    <span className={styles.userShowcaseRelativeTime}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }}>
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      {formatRelativeTime(app.LastUpdatedDate)}
                    </span>
                    <button className={styles.userShowcaseStarButton} onClick={(e) => { e.stopPropagation(); toggleFavorite(app.Id); }}>
                      <i className={`bi ${isFav ? 'bi-star-fill' : 'bi-star'}`} style={{ color: isFav ? '#D946EF' : '#bbbbbb', fontSize: '18px' }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Derived State ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <section className={`${styles.unifiedOperationsPortal} ${isDarkMode ? 'darkTheme' : ''}`}>
        <div className={styles.loadingScreen}>
          <img src={isDarkMode ? STTGDCLogoWhite : STTGDCLogoFull} alt="STT GDC" className={styles.loadingLogo} />
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingStatusText}>{loadingStatus}</p>
        </div>
      </section>
    );
  }

  const isAdmin = userAccess === 'Admin';

  const userNavItems: { id: ViewKey; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'applications', label: 'Applications' },
    { id: 'profile', label: 'Profile' }
  ];

  const adminNavItems: { id: ViewKey; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'applications', label: 'Applications' },
    { id: 'logs', label: 'Logs' }
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  const currentUserName = isAdmin
    ? (userDisplayName || 'Admin User')
    : ((userDisplayName && !userDisplayName.toLowerCase().includes('admin')) ? userDisplayName : 'Akshara T');

  const currentUserEmail = isAdmin
    ? (userEmail || 'admin@sttgdc.com')
    : ((userEmail && !userEmail.toLowerCase().includes('admin')) ? userEmail : 'akshara.t@sttgdc.com');

  const initials = currentUserName
    ? currentUserName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : (currentUserEmail ? currentUserEmail.substring(0, 2).toUpperCase() : 'AT');

  const PortalLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const pathname = location.pathname;
    let currentView: ViewKey = 'dashboard';
    if (pathname === '/applications') currentView = 'applications';
    else if (pathname === '/profile') currentView = 'profile';
    else if (pathname === '/logs') currentView = 'logs';

    const allLabels: Record<ViewKey, string> = {
      'dashboard': 'Dashboard',
      'applications': 'Applications',
      'profile': 'Profile',
      'logs': 'Logs'
    };

    const getBreadcrumbs = (): React.ReactNode => {
      const parentLabel = 'Home';
      const activeLabel = allLabels[currentView] || 'Dashboard';
      return (
        <div className={styles.breadcrumb}>
          <span
            className={styles.crumbParent}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setUserViewMode('Grid');
              navigate('/');
            }}
          >
            {parentLabel}
          </span>
          <span className={styles.crumbSeparator}>/</span>
          <span className={styles.activeCrumb}>{activeLabel}</span>
        </div>
      );
    };

    return (
      <section className={`${styles.unifiedOperationsPortal} ${isDarkMode ? 'darkTheme' : ''}`}>
        {/* ── Sidebar ── */}
        <div className={styles.sidebar}>
          <div>
            <div
              className={styles.logoContainer}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setUserViewMode('Grid');
                navigate('/');
              }}
            >
              <img src={isDarkMode ? STTGDCLogoWhite : STTGDCLogoFull} alt="STT GDC logo" />
              <span className={styles.portalSubTitle}>OPERATIONS PORTAL</span>
            </div>
            <nav className={styles.navMenu}>
              {navItems.map(item => {
                const targetPath = item.id === 'dashboard' ? '/' : `/${item.id}`;
                const isActive = pathname === targetPath || (item.id === 'dashboard' && pathname === '/');
                return (
                  <button
                    key={item.id}
                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    onClick={() => {
                      if (item.id === 'dashboard') {
                        setUserViewMode('Grid');
                      }
                      navigate(targetPath);
                    }}
                  >
                    {renderIcon(item.id, isActive)}
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className={styles.sidebarFooter}>
            <div className={styles.roleCard}>
              <div className={styles.roleCardName}>{currentUserName}</div>
              <div className={styles.roleCardEmail}>{currentUserEmail}</div>
              <div className={styles.roleCardBadge}>Role: {isAdmin ? 'Admin' : 'User'}</div>
              <div className={styles.roleCardDivider} />
              <button
                className={styles.roleSwitchBtn}
                onClick={handleToggleRole}
                title={`Switch to ${isAdmin ? 'User' : 'Admin'} View`}
              >
                <i className="bi bi-arrow-repeat" />
                Switch to {isAdmin ? 'User' : 'Admin'} View
              </button>
            </div>

            <div className={styles.userBadge}>
              <div className={styles.avatar}>{initials}</div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{currentUserName}</span>
                <span className={styles.userBadgeRolePill}>Role: {isAdmin ? 'Admin' : 'User'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className={styles.mainContent}>
          <div className={styles.topNavbar}>
            {getBreadcrumbs()}
            <div className={styles.topControls}>
              {renderThemeToggle()}
            </div>
          </div>

          <div className={styles.contentBody}>
            <Routes>
            <Route path="/" element={
              <>
                <div className={styles.welcomeBanner}>
                  <div className={styles.bannerLeft}>
                    <div className={styles.bannerContentTop}>
                      <h1>
                        {isAdmin ? (
                          <>Welcome back, <span className={styles.highlightRed}>Admin!</span></>
                        ) : (
                          <>Welcome back, <span className={styles.highlightRed}>{currentUserName.split(' ')[0]}!</span></>
                        )}
                      </h1>
                      <div className={styles.subtitle}>{isAdmin ? 'Unified Operations Portal Administration' : 'Unified Operations Portal'}</div>
                      <div className={styles.desc}>
                        {isAdmin
                          ? 'Manage users, applications, permissions and portal settings from one place.'
                          : 'Access all your authorised applications securely through Azure AD SSO.'}
                      </div>
                    </div>
                    {!isAdmin && (
                      <div className={styles.bannerStatsLeft}>
                        {renderUserBannerChart()}
                      </div>
                    )}
                    {isAdmin && (
                      <div className={styles.bannerContentBottom}>
                        {renderAdminBannerChart()}
                      </div>
                    )}
                  </div>
                </div>
                {isAdmin ? renderApplicationsShowcase() : renderUserApplicationsShowcase()}
              </>
            } />

            <Route path="/applications" element={
              isAdmin ? (
                <AdminApplications
                  context={context}
                  applications={applications}
                  categories={categories}
                  setApplications={setApplications}
                  setCategories={setCategories}
                  isDarkMode={isDarkMode}
                />
              ) : (
                <UserApplications
                  context={context}
                  currentUserEmail={userEmail}
                  applications={applications}
                  categories={categories}
                  favoriteAppIds={favoriteAppIds}
                  setFavoriteAppIds={setFavoriteAppIds}
                  recentAppIds={recentAppIds}
                  setRecentAppIds={setRecentAppIds}
                  mostUsedAppsRaw={mostUsedAppsRaw}
                  setMostUsedAppsRaw={setMostUsedAppsRaw}
                  userAadObjectId={userAadObjectId}
                  userPrefsSpItemId={userPrefsSpItemId}
                  setUserPrefsSpItemId={setUserPrefsSpItemId}
                />
              )
            } />



            <Route path="/profile" element={
              <UserProfile
                userDisplayName={currentUserName}
                userEmail={currentUserEmail}
                userRole={userAccess}
                loginTime={loginTime}
                favoriteAppIds={favoriteAppIds}
                recentAppIds={recentAppIds}
                mostUsedAppsRaw={mostUsedAppsRaw}
                applications={applications}
                categories={categories}
                isDarkMode={isDarkMode}
                onToggleFavorite={toggleFavorite}
                onLaunchApp={launchUserApp}
              />
            } />
            <Route path="/logs" element={
              <AdminRoute userAccess={userAccess}>
                <AuditLogs />
              </AdminRoute>
            } />


            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

            <div className={styles.footer}>
              <span>© 2026 ST Data Centres. All rights reserved.</span>
              <span>Version 1.0.0</span>
            </div>
          </div>
        </div>
      </section>
    );
  };

  // ── Render ──
  return (
    <HashRouter>
      <PortalLayout />
    </HashRouter>
  );
};

export default UnifiedOperationsPortal;
