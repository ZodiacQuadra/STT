import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import styles from './AuditLogs.module.scss';
import { IAuditLog, IActivityLog } from '../../../../Types/AuditLogTypes';
import { getAuditLogs, getActivityLogs } from '../../../../Service/AuditLogService';
import * as XLSX from 'xlsx';

export interface IAuditLogsProps {}

const getTodayStr = (): string => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const AuditLogs: React.FC<IAuditLogsProps> = () => {
  const todayStr = getTodayStr();

  // ── State ──────────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [sortAscending, setSortAscending] = useState<boolean>(false); // newest first by default
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');
  const [exportDateRange, setExportDateRange] = useState<'today' | 'yesterday' | 'last7' | 'last30' | 'all' | 'custom'>('last30');
  const [exportStartDate, setExportStartDate] = useState<string>(todayStr);
  const [exportEndDate, setExportEndDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<'audit' | 'activity'>('audit');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [activityLogs, setActivityLogs] = useState<IActivityLog[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState<boolean>(false);
  const [hasLoadedActivity, setHasLoadedActivity] = useState<boolean>(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const toastTimerRef = useRef<any>(null);

  // ── Data Loading ───────────────────────────────────────────────────────────
  const loadLogs = async (isReload: boolean = false): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(data);
      setIsLoading(false);

      if (isReload) {
        setShowToast(true);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          setShowToast(false);
        }, 3000);
      }
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setIsLoading(false);
    }
  };

  const loadActivityLogs = async (isReload: boolean = false): Promise<void> => {
    setIsActivityLoading(true);
    try {
      const data = await getActivityLogs();
      setActivityLogs(data);
      setIsActivityLoading(false);
      setHasLoadedActivity(true);

      if (isReload) {
        setShowToast(true);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          setShowToast(false);
        }, 3000);
      }
    } catch (err) {
      console.error('Error loading activity logs:', err);
      setIsActivityLoading(false);
    }
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    void loadLogs(false);
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getUserInitials = (name: string): string => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
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

  const formatTimestamp = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      const ss = String(date.getSeconds()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    } catch {
      return isoString;
    }
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

  const getDateRangeDisplayLabel = (option: string): string => {
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatDateShort = (d: Date): string => `${months[d.getMonth()]} ${d.getDate()}`;
    const formatDateWithYear = (d: Date): string => `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

    switch (option) {
      case 'today': return `Today · ${formatDateWithYear(today)}`;
      case 'yesterday': {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        return `Yesterday · ${formatDateWithYear(yesterday)}`;
      }
      case 'last7': {
        const start = new Date();
        start.setDate(today.getDate() - 7);
        return `Last 7 days · ${formatDateShort(start)} – ${formatDateWithYear(today)}`;
      }
      case 'last30': {
        const start = new Date();
        start.setDate(today.getDate() - 30);
        return `Last 30 days · ${formatDateShort(start)} – ${formatDateWithYear(today)}`;
      }
      case 'all': return 'All Logs';
      case 'custom': return 'Custom Range';
      default: return '';
    }
  };

  // ── Export Handler ─────────────────────────────────────────────────────────
  const handleExport = (): void => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = new Date(today);
    let end = new Date(today);
    let filterByDate = true;

    switch (exportDateRange) {
      case 'today': break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'last7': start.setDate(today.getDate() - 7); break;
      case 'last30': start.setDate(today.getDate() - 30); break;
      case 'custom':
        start = exportStartDate ? new Date(exportStartDate) : new Date(0);
        start.setHours(0, 0, 0, 0);
        end = exportEndDate ? new Date(exportEndDate) : new Date();
        end.setHours(0, 0, 0, 0);
        break;
      case 'all':
      default:
        filterByDate = false;
        break;
    }

    end.setHours(23, 59, 59, 999);

    const logsSource = activeTab === 'audit' ? logs : activityLogs;
    const logsToExport = logsSource.filter(log => {
      if (!filterByDate) return true;
      const logDate = new Date(log.Timestamp);
      return logDate >= start && logDate <= end;
    });

    if (logsToExport.length === 0) {
      alert(`No ${activeTab === 'audit' ? 'audit' : 'activity'} logs found inside the selected date range to export.`);
      return;
    }

    const cleanData = logsToExport.map(log => ({
      Timestamp: formatTimestamp(log.Timestamp),
      User: log.ActorName,
      Email: log.ActorEmail,
      Action: log.Title,
      'Event Type': log.EventType,
      Description: log.Description,
      Target: log.TargetEntity || 'N/A'
    }));

    const dateSuffix = new Date().toISOString().slice(0, 10);
    const fileName = `${activeTab === 'audit' ? 'audit' : 'activity'}_logs_${dateSuffix}`;

    if (exportFormat === 'xlsx') {
      try {
        const worksheet = XLSX.utils.json_to_sheet(cleanData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'audit' ? 'Audit Logs' : 'Activity Logs');
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${fileName}.xlsx`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to generate Excel file:', err);
        alert('An error occurred while exporting to Excel.');
      }
    } else if (exportFormat === 'csv') {
      try {
        const headers = Object.keys(cleanData[0]).join(',');
        const rows = cleanData.map(row =>
          Object.values(row).map(val => {
            const str = String(val ?? '');
            if (str.includes(',') || str.includes('\n') || str.includes('"')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',')
        );
        const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${fileName}.csv`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to generate CSV file:', err);
      }
    } else if (exportFormat === 'json') {
      try {
        const blob = new Blob([JSON.stringify(cleanData, null, 2)], { type: 'application/json;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${fileName}.json`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to generate JSON file:', err);
      }
    }

    setIsExportModalOpen(false);
  };

  // ── Render Helpers ─────────────────────────────────────────────────────────
  const renderPagination = (
    totalFiltered: number,
    totalPages: number,
    page: number,
    startIndex: number,
    size: number
  ): React.ReactNode => {
    if (totalFiltered === 0) return null;
    return (
      <div className={styles.paginationSection}>
        <div className={styles.showingLabel}>
          Showing {Math.min(startIndex + 1, totalFiltered)}-{Math.min(startIndex + size, totalFiltered)} of {totalFiltered} entries
        </div>
        <div className={styles.rightControls}>
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            &lt;
          </button>
          <div className={styles.pageNumbers}>
            {getPageNumbers(page, totalPages).map((p, idx) => {
              if (p === '...') {
                return <span key={`ellipsis-${idx}`} className={styles.ellipsis}>...</span>;
              }
              return (
                <button
                  key={p}
                  className={`${styles.numberBtn} ${page === p ? styles.active : ''}`}
                  onClick={() => setCurrentPage(p as number)}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            &gt;
          </button>
          <div className={styles.pageSizeSelector}>
            <select
              className={styles.selectPageSize}
              value={size}
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  const renderExportModal = (): React.ReactNode => {
    if (!isExportModalOpen) return null;
    return (
      <div className={styles.modalBackdrop} onClick={() => setIsExportModalOpen(false)}>
        <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3>Export Logs</h3>
            <button className={styles.modalCloseBtn} onClick={() => setIsExportModalOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className={styles.modalBody}>
            <p className={styles.modalSubtitle}>
              Configure your export, then download a snapshot of the selected log sources.
            </p>
            {/* FORMAT */}
            <div className={styles.modalSection}>
              <div className={styles.modalSectionLabel}>FORMAT</div>
              <div className={styles.formatOptionsRow}>
                {(['xlsx', 'csv', 'json'] as const).map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    className={`${styles.formatOptionBtn} ${exportFormat === fmt ? styles.selected : ''}`}
                    onClick={() => setExportFormat(fmt)}
                  >
                    <span className={styles.radioDot}>
                      {exportFormat === fmt && <span className={styles.radioDotInner} />}
                    </span>
                    {fmt === 'xlsx' ? 'Excel (.xlsx)' : fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {/* DATE RANGE */}
            <div className={styles.modalSection}>
              <div className={styles.modalSectionLabel}>DATE RANGE</div>
              <div className={styles.selectDropdownWrapper}>
                <span className={styles.selectDropdownIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </span>
                <select
                  className={styles.modalSelect}
                  value={exportDateRange}
                  onChange={(e) => setExportDateRange(e.target.value as any)}
                >
                  {(['last30', 'last7', 'today', 'yesterday', 'all', 'custom'] as const).map(opt => (
                    <option key={opt} value={opt}>{getDateRangeDisplayLabel(opt)}</option>
                  ))}
                </select>
                <span className={styles.selectDropdownArrow}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </div>
              {exportDateRange === 'custom' && (
                <div className={styles.customDateInputsRow}>
                  <div className={styles.customDateInputGroup}>
                    <label>Start Date</label>
                    <input type="date" className={styles.modalDateInput} value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} />
                  </div>
                  <div className={styles.customDateInputGroup}>
                    <label>End Date</label>
                    <input type="date" className={styles.modalDateInput} value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button className={styles.modalCancelBtn} onClick={() => setIsExportModalOpen(false)}>Cancel</button>
            <button className={styles.modalExportBtn} onClick={handleExport}>Download</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Derived State ──────────────────────────────────────────────────────────
  const logsToFilter = activeTab === 'audit' ? logs : activityLogs;
  const isTabLoading = activeTab === 'audit' ? isLoading : isActivityLoading;
  const hasData = activeTab === 'audit' ? logs.length > 0 : activityLogs.length > 0;

  const filteredLogs = logsToFilter.filter(log => {
    const matchesSearch =
      log.ActorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.EventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.Description.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (selectedDate) {
      const logDate = new Date(log.Timestamp);
      const yyyy = logDate.getFullYear();
      const mm = String(logDate.getMonth() + 1).padStart(2, '0');
      const dd = String(logDate.getDate()).padStart(2, '0');
      matchesDate = `${yyyy}-${mm}-${dd}` === selectedDate;
    }
    return matchesSearch && matchesDate;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const timeA = new Date(a.Timestamp).getTime();
    const timeB = new Date(b.Timestamp).getTime();
    return sortAscending ? timeA - timeB : timeB - timeA;
  });

  const totalFiltered = sortedLogs.length;
  const totalPages = Math.ceil(totalFiltered / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = sortedLogs.slice(startIndex, startIndex + pageSize);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.logsContainer}>
      {/* ── Header ── */}
      <div className={styles.headerSection}>
        <div className={styles.titleInfo}>
          <h2>Audit &amp; Activity Logs</h2>
          <p className={styles.subtitle}>Review system configuration and user activity logs across the portal.</p>
        </div>
        <div className={styles.actionButtons}>
          <button
            className={styles.btnReload}
            onClick={() => activeTab === 'audit' ? loadLogs(true) : loadActivityLogs(true)}
            disabled={isTabLoading}
          >
            {isTabLoading ? (
              <>
                <span className={styles.spinner} />
                Loading...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.57-2.19" />
                </svg>
                Reload
              </>
            )}
          </button>
          <button
            className={styles.btnExport}
            onClick={() => setIsExportModalOpen(true)}
            disabled={isTabLoading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export Logs
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabRow}>
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabItem} ${activeTab === 'audit' ? styles.active : ''}`}
            onClick={() => { setActiveTab('audit'); setCurrentPage(1); }}
          >
            Audit Logs
          </button>
          <button
            className={`${styles.tabItem} ${activeTab === 'activity' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('activity');
              setCurrentPage(1);
              if (!hasLoadedActivity) {
                void loadActivityLogs(false);
              }
            }}
          >
            Activity Logs
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder={`Search ${activeTab === 'audit' ? 'audit' : 'activity'} logs...`}
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className={styles.datePickerGroup}>
          <div className={styles.dateWrapper}>
            <span className={styles.dateIcon}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>
            <input
              type="date"
              className={styles.dateInput}
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
            />
          </div>
          {selectedDate && (
            <button className={styles.btnClear} onClick={() => { setSelectedDate(''); setCurrentPage(1); }}>
              Clear Date
            </button>
          )}
        </div>
      </div>

      {/* ── Table Grid ── */}
      <div className={styles.tableCard}>
        {isTabLoading && !hasData ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <span className={styles.spinnerDark} />
            <span style={{ marginLeft: 12, color: '#666', fontWeight: 600 }}>
              Loading {activeTab === 'audit' ? 'audit' : 'activity'} logs...
            </span>
          </div>
        ) : (
          <>
            <table className={styles.logsTable}>
              <thead>
                <tr>
                  <th className={styles.sortable} onClick={() => setSortAscending(prev => !prev)} style={{ width: '180px' }}>
                    <div className={styles.headerCell}>
                      TIMESTAMP
                      <span className={styles.sortIcon} style={{ color: '#7C3AED' }}>
                        {sortAscending ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
                        )}
                      </span>
                    </div>
                  </th>
                  <th style={{ width: '220px' }}>USER</th>
                  <th>DESCRIPTION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>
                      No {activeTab === 'audit' ? 'audit' : 'activity'} logs found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map(log => (
                    <tr key={log.Id}>
                      <td className={styles.timestampCell}>{formatTimestamp(log.Timestamp)}</td>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatar} style={{ backgroundColor: getAvatarColor(log.ActorName) }}>
                            {getUserInitials(log.ActorName)}
                          </div>
                          <span className={styles.name}>{log.ActorName}</span>
                        </div>
                      </td>
                      <td className={styles.descriptionCell}>{log.Description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {renderPagination(totalFiltered, totalPages, currentPage, startIndex, pageSize)}
          </>
        )}
      </div>

      {/* ── Slide-up Toast Notification ── */}
      {showToast && (
        <div className={styles.toastContainer}>
          <span className={styles.toastCheckIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className={styles.toastMessage}>
            {activeTab === 'audit' ? 'Audit' : 'Activity'} logs reloaded
          </span>
        </div>
      )}

      {/* ── Export Configuration Modal ── */}
      {renderExportModal()}
    </div>
  );
};

export default AuditLogs;
