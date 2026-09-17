import * as React from 'react';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UserProfile.module.scss';
import { IApplicationWithUsers, IAppCategory } from '../../../../Types/ApplicationTypes';
import { parseUsageRecord } from '../../../../Service/UserPreferencesService';

export interface IUserProfileProps {
  userDisplayName: string;
  userEmail: string;
  userRole: 'Admin' | 'User';
  loginTime: string;
  favoriteAppIds: number[];
  recentAppIds: number[];
  mostUsedAppsRaw: string;
  applications: IApplicationWithUsers[];
  categories: IAppCategory[];
  isDarkMode: boolean;
  onToggleFavorite: (appId: number) => void;
  onLaunchApp: (appId: number, url: string) => void;
}

const UserProfile: React.FC<IUserProfileProps> = ({
  userDisplayName,
  userEmail,
  userRole,
  loginTime,
  favoriteAppIds,
  recentAppIds,
  mostUsedAppsRaw,
  applications,
  categories,
  isDarkMode,
  onToggleFavorite,
  onLaunchApp
}) => {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const defaultProfile = {
    fullName: userDisplayName || 'Akshara T',
    email: userEmail || 'akshara.t@quadrasystems.net',
    employeeId: 'EMP-1042',
    phone: '+91 98765 43210',
    jobTitle: 'Associate - UI designer',
    department: 'Accelerated Intelligence Group',
    officeLocation: 'Coimbatore - Corporate Office',
    manager: 'Naveen Bala Kumar S',
    bio: 'UI designer working on enterprise data centre operations tools.',
    avatarPhotoUrl: ''
  };

  const [profileData, setProfileData] = useState(() => {
    try {
      const saved = localStorage.getItem('STT_UserProfile');
      if (saved) return { ...defaultProfile, ...JSON.parse(saved) };
    } catch (_) {}
    return defaultProfile;
  });

  const [editForm, setEditForm] = useState(profileData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image must be less than 2 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, avatarPhotoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenEdit = () => {
    setEditForm(profileData);
    setEditOpen(true);
  };

  const handleSaveProfile = () => {
    setProfileData(editForm);
    try {
      localStorage.setItem('STT_UserProfile', JSON.stringify(editForm));
    } catch (_) {}
    setEditOpen(false);
  };

  const initials = profileData.fullName
    ? profileData.fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AT';

  const department = profileData.department || 'Accelerated Intelligence Group';

  const usageRec = parseUsageRecord(mostUsedAppsRaw);
  const mostUsedId = Object.keys(usageRec.frequencies).sort(
    (a, b) => (usageRec.frequencies[b] || 0) - (usageRec.frequencies[a] || 0)
  )[0];
  const mostUsedApp = mostUsedId ? applications.find(a => a.Id.toString() === mostUsedId) : null;
  const lastAccessedApp = recentAppIds.length > 0 ? applications.find(a => a.Id === recentAppIds[0]) : null;

  const getAppIconName = (title: string, iconName?: string): string => {
    if (iconName && iconName.trim().length > 0) return iconName;
    const t = title.toLowerCase();
    if (t.includes('aws') || t.includes('cloud')) return 'cloud-fill';
    if (t.includes('datadog') || t.includes('apm') || t.includes('tracking')) return 'activity';
    if (t.includes('microsoft 365') || t.includes('m365') || t.includes('cmt')) return 'grid-fill';
    if (t.includes('azure')) return 'cloud-arrow-up-fill';
    if (t.includes('okta') || t.includes('identity') || t.includes('compliance')) return 'shield-lock-fill';
    if (t.includes('oracle')) return 'server';
    if (t.includes('salesforce') || t.includes('crm')) return 'people-fill';
    if (t.includes('sap') || t.includes('erp')) return 'gear-fill';
    if (t.includes('customer mor') || t.includes('internal mor') || t.includes('report')) return 'file-earmark-text';
    if (t.includes('ranking') || t.includes('dc')) return 'bar-chart';
    if (t.includes('spvcc')) return 'currency-dollar';
    return 'app-indicator';
  };

  const getCategoryStyles = (catTitle?: string): React.CSSProperties => {
    if (!catTitle) return { backgroundColor: '#F3F4F6', color: '#374151' };
    const cat = categories.find(c => c.Title.toLowerCase() === catTitle.toLowerCase());
    if (cat && cat.BgColor && cat.TextColor) {
      return { backgroundColor: cat.BgColor, color: cat.TextColor };
    }
    const t = catTitle.toLowerCase();
    if (t.includes('cloud')) return { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.16)' : '#E0F2FE', color: isDarkMode ? '#7DD3FC' : '#0369A1' };
    if (t.includes('prod') || t.includes('office')) return { backgroundColor: isDarkMode ? 'rgba(251, 191, 36, 0.16)' : '#FEF3C7', color: isDarkMode ? '#FCD34D' : '#92400E' };
    if (t.includes('enterprise') || t.includes('erp')) return { backgroundColor: isDarkMode ? 'rgba(192, 132, 252, 0.16)' : '#F3E8FF', color: isDarkMode ? '#D8B4FE' : '#7E22CE' };
    if (t.includes('sec') || t.includes('access')) return { backgroundColor: isDarkMode ? 'rgba(244, 114, 182, 0.16)' : '#FCE7F3', color: isDarkMode ? '#F472B6' : '#BE185D' };
    if (t.includes('it') || t.includes('monit')) return { backgroundColor: isDarkMode ? 'rgba(167, 139, 250, 0.16)' : '#EDE9FE', color: isDarkMode ? '#C4B5FD' : '#5B21B6' };
    return { backgroundColor: isDarkMode ? 'rgba(124, 58, 237, 0.16)' : '#F3F4F6', color: isDarkMode ? '#C4B5FD' : '#374151' };
  };

  const formatRelativeTime = (isoString?: string): string => {
    if (!isoString) return '1 hour ago';
    const now = new Date();
    const updated = new Date(isoString);
    const diffMs = now.getTime() - updated.getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMins < 60) return `${diffMins || 1} min ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks === 1) return '1 week ago';
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    return updated.toLocaleDateString();
  };

  const fallbackApps: IApplicationWithUsers[] = [
    {
      Id: 1,
      Title: 'AWS Management Console',
      Description: 'Access and manage all Amazon Web Services cloud resources and computing instances.',
      Category: 'Cloud Platforms',
      AppURL: '#',
      IconName: 'cloud-fill',
      Status: 'Active',
      IsVisibleToAll: true,
      LastUpdatedDate: new Date(Date.now() - 172800000).toISOString(),
      assignedUserEmails: [],
      assignedUserCount: 0
    },
    {
      Id: 2,
      Title: 'Datadog APM',
      Description: 'Full-stack cloud monitoring, real-time observability, and telemetry diagnostics.',
      Category: 'IT Operations & Monitoring',
      AppURL: '#',
      IconName: 'activity',
      Status: 'Active',
      IsVisibleToAll: true,
      LastUpdatedDate: new Date(Date.now() - 86400000).toISOString(),
      assignedUserEmails: [],
      assignedUserCount: 0
    },
    {
      Id: 3,
      Title: 'Microsoft 365 Hub',
      Description: 'Productivity suite including Outlook, Teams, OneDrive, and Office web apps.',
      Category: 'Productivity & Office',
      AppURL: '#',
      IconName: 'grid-fill',
      Status: 'Active',
      IsVisibleToAll: true,
      LastUpdatedDate: new Date(Date.now() - 259200000).toISOString(),
      assignedUserEmails: [],
      assignedUserCount: 0
    },
    {
      Id: 4,
      Title: 'Microsoft Azure Portal',
      Description: 'Build, manage, and monitor cloud apps, virtual networks, and hybrid resources.',
      Category: 'Cloud Platforms',
      AppURL: '#',
      IconName: 'cloud-arrow-up-fill',
      Status: 'Active',
      IsVisibleToAll: true,
      LastUpdatedDate: new Date(Date.now() - 345600000).toISOString(),
      assignedUserEmails: [],
      assignedUserCount: 0
    },
    {
      Id: 5,
      Title: 'Okta Identity Governance',
      Description: 'Single sign-on, multi-factor authentication, and lifecycle access control.',
      Category: 'Security & Access',
      AppURL: '#',
      IconName: 'shield-lock-fill',
      Status: 'Active',
      IsVisibleToAll: true,
      LastUpdatedDate: new Date(Date.now() - 86400000).toISOString(),
      assignedUserEmails: [],
      assignedUserCount: 0
    },
    {
      Id: 6,
      Title: 'Oracle Cloud Infrastructure',
      Description: 'High-performance cloud compute, autonomous databases, and enterprise workloads.',
      Category: 'Cloud Platforms',
      AppURL: '#',
      IconName: 'server',
      Status: 'Active',
      IsVisibleToAll: true,
      LastUpdatedDate: new Date(Date.now() - 86400000).toISOString(),
      assignedUserEmails: [],
      assignedUserCount: 0
    },
    {
      Id: 7,
      Title: 'Salesforce CRM',
      Description: 'Manage sales pipelines, customer interactions, and enterprise relationships.',
      Category: 'CRM & Sales',
      AppURL: '#',
      IconName: 'people-fill',
      Status: 'Active',
      IsVisibleToAll: true,
      LastUpdatedDate: new Date(Date.now() - 86400000).toISOString(),
      assignedUserEmails: [],
      assignedUserCount: 0
    },
    {
      Id: 8,
      Title: 'SAP S/4HANA ERP',
      Description: 'Next-generation intelligent ERP suite for financial and supply chain management.',
      Category: 'Enterprise ERP',
      AppURL: '#',
      IconName: 'gear-fill',
      Status: 'Active',
      IsVisibleToAll: true,
      LastUpdatedDate: new Date(Date.now() - 432000000).toISOString(),
      assignedUserEmails: [],
      assignedUserCount: 0
    }
  ];

  const displayApps = applications && applications.length > 0 ? applications : fallbackApps;
  const effectiveFavIds = favoriteAppIds && favoriteAppIds.length > 0 ? favoriteAppIds : [1, 4];

  const statCards = [
    {
      key: 'assigned',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
      iconColor: isDarkMode ? '#C4B5FD' : '#7C3AED',
      iconBg: isDarkMode ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.08)',
      label: 'APPLICATIONS ASSIGNED',
      value: applications.length > 0 ? String(applications.length) : '5',
      sub: 'Apps you can access'
    },
    {
      key: 'mostused',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
      iconColor: '#3B82F6',
      iconBg: isDarkMode ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.08)',
      label: 'MOST USED APP',
      value: mostUsedApp ? mostUsedApp.Title : 'CMT',
      sub: 'Your top application'
    },
    {
      key: 'lastaccess',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      iconColor: '#10B981',
      iconBg: isDarkMode ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.08)',
      label: 'LAST ACCESSED APP',
      value: lastAccessedApp ? lastAccessedApp.Title : 'Customer MOR',
      sub: 'Most recent activity'
    },
    {
      key: 'favs',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      iconColor: isDarkMode ? '#F0ABFC' : '#D946EF',
      iconBg: isDarkMode ? 'rgba(217,70,239,0.18)' : 'rgba(217,70,239,0.08)',
      label: 'FAVORITES',
      value: favoriteAppIds.length > 0 ? String(favoriteAppIds.length) : '2',
      sub: 'Your favorite apps'
    }
  ];

  return (
    <div className={`${styles.profilePage} ${isDarkMode ? styles.dark : ''}`}>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Profile</h1>
          <p className={styles.pageSubtitle}>View and manage your user profile information</p>
        </div>
        <button className={styles.editProfileBtn} onClick={handleOpenEdit}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit Profile
        </button>
      </div>

      {/* Profile Card */}
      <div className={styles.profileCard}>
        <div className={styles.profileCardHeader}>
          <div className={styles.profileUserMain}>
            <div className={styles.avatarCircle}>
              {profileData.avatarPhotoUrl ? (
                <img src={profileData.avatarPhotoUrl} alt="Avatar" className={styles.avatarImg} />
              ) : (
                initials
              )}
            </div>
            <div className={styles.profileUserDetails}>
              <div className={styles.profileNameRow}>
                <span className={styles.profileName}>{profileData.fullName}</span>
                <span className={styles.employeeBadge}>{userRole === 'Admin' ? 'Administrator' : 'Employee'}</span>
              </div>
              <span className={styles.profileRoleTitle}>
                {userRole === 'Admin' ? 'System Administrator • Operations Portal' : `${profileData.jobTitle} • ${profileData.department}`}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.profileCardDivider} />

        <div className={styles.profileInfoGrid}>
          <div className={styles.profileInfoBlock}>
            <div className={styles.infoIconBox}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>
              </svg>
            </div>
            <div className={styles.infoTextGroup}>
              <span className={styles.infoFieldLabel}>EMAIL</span>
              <span className={styles.infoFieldValue} title={profileData.email}>
                {profileData.email}
              </span>
            </div>
          </div>

          <div className={styles.profileInfoBlock}>
            <div className={styles.infoIconBox}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            </div>
            <div className={styles.infoTextGroup}>
              <span className={styles.infoFieldLabel}>DEPARTMENT</span>
              <span className={styles.infoFieldValue} title={profileData.department}>
                {profileData.department}
              </span>
            </div>
          </div>

          <div className={styles.profileInfoBlock}>
            <div className={styles.infoIconBox}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className={styles.infoTextGroup}>
              <span className={styles.infoFieldLabel}>LAST LOGIN</span>
              <span className={styles.infoFieldValue}>
                {loginTime || '09 Jun 2026, 09:42 AM'}
              </span>
            </div>
          </div>

          <div className={styles.profileInfoBlock}>
            <div className={styles.infoIconBox}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className={styles.infoTextGroup}>
              <span className={styles.infoFieldLabel}>ACCOUNT STATUS</span>
              <div className={styles.statusRow}>
                <span className={styles.statusDot} />
                <span className={styles.statusText}>Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className={styles.statsGrid}>
        {statCards.map(card => (
          <div key={card.key} className={styles.statCard}>
            <div className={styles.statCardIcon} style={{ backgroundColor: card.iconBg, color: card.iconColor }}>
              {card.icon}
            </div>
            <div className={styles.statCardContent}>
              <span className={styles.statCardLabel}>{card.label}</span>
              <span className={styles.statCardValue}>{card.value}</span>
              <span className={styles.statCardSub}>{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* My Applications */}
      <div className={styles.appsSection}>
        <div className={styles.appsSectionHeader}>
          <div>
            <h2 className={styles.appsSectionTitle}>My Applications</h2>
            <p className={styles.appsSectionSubtitle}>Apps assigned to your account</p>
          </div>
          <button className={styles.viewAllBtn} onClick={() => navigate('/applications')}>
            View All Applications &gt;
          </button>
        </div>
        <div className={styles.appsGrid}>
          {displayApps.map(app => {
            const isFav = effectiveFavIds.includes(app.Id);
            const cat = categories.find(c => c.Title === app.Category);
            const iconName = getAppIconName(app.Title, app.IconName);
            const catStyle = getCategoryStyles(app.Category);
            return (
              <div key={app.Id} className={styles.appCard} onClick={() => onLaunchApp(app.Id, app.AppURL)}>
                <div className={styles.appCardHeader}>
                  <div className={styles.appIconBox}>
                    <i className={`bi bi-${iconName}`} />
                  </div>
                  <button
                    className={styles.favBtn}
                    onClick={e => {
                      e.stopPropagation();
                      onToggleFavorite(app.Id);
                    }}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <i className={`bi ${isFav ? 'bi-star-fill' : 'bi-star'}`} style={{ color: isFav ? '#D946EF' : (isDarkMode ? '#71717A' : '#bbbbbb'), fontSize: '18px' }} />
                  </button>
                </div>

                <div className={styles.appCardBody}>
                  <h3 className={styles.appCardTitle} title={app.Title}>{app.Title}</h3>
                  <p className={styles.appCardDesc} title={app.Description}>
                    {app.Description || 'Access and manage all cloud resources, tools, and computing instances.'}
                  </p>
                </div>

                <div className={styles.appCardDivider} />

                <div className={styles.appCardFooter}>
                  <span className={styles.appCardCategory} style={catStyle}>
                    {(cat?.Title || app.Category || 'GENERAL').toUpperCase()}
                  </span>
                  <span className={styles.appCardTime}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {formatRelativeTime(app.LastUpdatedDate)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Edit Profile Drawer ── */}
      {editOpen && (
        <div className={styles.drawerOverlay} onClick={() => setEditOpen(false)}>
          <div className={`${styles.drawer} ${isDarkMode ? styles.drawerDark : ''}`} onClick={e => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Edit Profile</span>
              <button className={styles.drawerClose} onClick={() => setEditOpen(false)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Avatar Section */}
              <div className={styles.drawerAvatarRow}>
                <div className={styles.drawerAvatar}>
                  {editForm.avatarPhotoUrl ? (
                    <img src={editForm.avatarPhotoUrl} alt="Avatar Preview" className={styles.avatarImg} />
                  ) : (
                    initials
                  )}
                </div>
                <div className={styles.drawerAvatarInfo}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/png, image/jpeg, image/jpg"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className={styles.changePhotoBtn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Change Photo
                  </button>
                  <span className={styles.drawerAvatarNote}>JPG, PNG up to 2 MB</span>
                </div>
              </div>

              {/* Form Fields */}
              <div className={styles.drawerForm}>
                {/* Row 1: Full Name & Email */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Full Name</label>
                    <div className={styles.formInputWrap}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <input
                        className={styles.formInput}
                        value={editForm.fullName}
                        onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                        placeholder="Full name"
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Email</label>
                    <div className={styles.formInputWrap}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <path d="M22 6l-10 7L2 6"/>
                      </svg>
                      <input
                        className={styles.formInput}
                        value={editForm.email}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="Email"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Employee ID & Phone */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Employee ID</label>
                    <div className={styles.formInputWrap}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      <input
                        className={styles.formInput}
                        value={editForm.employeeId}
                        readOnly
                        style={{ opacity: 0.7, cursor: 'not-allowed' }}
                      />
                    </div>
                    <span className={styles.formNote}>Synced from Azure AD</span>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Phone</label>
                    <div className={styles.formInputWrap}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                        <line x1="12" y1="18" x2="12.01" y2="18"/>
                      </svg>
                      <input
                        className={styles.formInput}
                        value={editForm.phone}
                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="Phone"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Job Title & Department */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Job Title</label>
                    <div className={styles.formInputWrap}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                      </svg>
                      <input
                        className={styles.formInput}
                        value={editForm.jobTitle}
                        onChange={e => setEditForm({ ...editForm, jobTitle: e.target.value })}
                        placeholder="Job title"
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Department</label>
                    <div className={styles.formInputWrap}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                      </svg>
                      <input
                        className={styles.formInput}
                        value={editForm.department}
                        onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                        placeholder="Department"
                      />
                    </div>
                    <span className={styles.formNote}>Managed by HR</span>
                  </div>
                </div>

                {/* Row 4: Office Location & Manager */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Office Location</label>
                    <div className={styles.formInputWrap}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <input
                        className={styles.formInput}
                        value={editForm.officeLocation}
                        onChange={e => setEditForm({ ...editForm, officeLocation: e.target.value })}
                        placeholder="Office location"
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Manager</label>
                    <div className={styles.formInputWrap}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <input
                        className={styles.formInput}
                        value={editForm.manager}
                        onChange={e => setEditForm({ ...editForm, manager: e.target.value })}
                        placeholder="Manager name"
                      />
                    </div>
                    <span className={styles.formNote}>Synced from Azure AD</span>
                  </div>
                </div>

                {/* Row 5: Bio (full width) */}
                <div className={styles.formGroupFull}>
                  <label className={styles.formLabel}>Bio</label>
                  <div className={styles.formTextareaWrap}>
                    <svg className={styles.textareaIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <textarea
                      className={styles.formTextarea}
                      value={editForm.bio}
                      onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                      rows={3}
                      placeholder="Write a short bio..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className={styles.drawerFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setEditOpen(false)}>Cancel</button>
              <button type="button" className={styles.saveBtn} onClick={handleSaveProfile}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserProfile;
