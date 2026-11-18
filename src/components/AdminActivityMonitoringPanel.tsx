import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  User,
  Download,
  Trash2,
  RotateCcw,
  Search,
  Clock,
  Calendar,
  ListChecks,
  Layers,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckSquare,
  Square,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserActivityLog, ActivityLogActionType } from '../types';
import {
  ACTION_TYPE_LABELS,
  clearAllUserActivityLogs,
  deleteUserActivityLog,
  deleteUserActivityLogsByIds,
  exportUserActivityLogsToExcel,
  getUserActivityLogs,
  groupLogsBySession,
  subscribeUserActivityLogs,
} from '../services/userActivityLogService';

interface AdminActivityMonitoringPanelProps {
  dashboardDate: string;
}

type LogViewMode = 'SESSIONS' | 'TABLE';
type RoleFilter = 'ALL' | 'admin' | 'user';
type ActionFilter = 'ALL' | 'AUTH' | 'DATA' | 'EXPORT_SYNC' | 'SETTINGS';
type DateScope = 'ALL' | 'TODAY' | 'DASHBOARD_DATE';

const getActionBadgeClass = (type: ActivityLogActionType): string => {
  switch (type) {
    case 'LOGIN':
      return 'bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/30';
    case 'LOGOUT':
    case 'SWITCH_PROFILE':
      return 'bg-[#facc15]/15 text-[#facc15] border-[#facc15]/30';
    case 'CREATE':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'UPDATE':
    case 'PLAN_UPDATE':
      return 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30';
    case 'DELETE':
      return 'bg-[#fb7185]/15 text-[#fb7185] border-[#fb7185]/30';
    case 'EXPORT_WA':
    case 'EXPORT_PDF':
    case 'SYNC_PULL':
    case 'SYNC_PUSH':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    default:
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }
};

export const AdminActivityMonitoringPanel: React.FC<AdminActivityMonitoringPanelProps> = ({
  dashboardDate,
}) => {
  const { isAdmin } = useAuth();

  const [logs, setLogs] = useState<UserActivityLog[]>(() => getUserActivityLogs());
  const [viewMode, setViewMode] = useState<LogViewMode>('SESSIONS');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('ALL');
  const [dateScope, setDateScope] = useState<DateScope>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<
    | null
    | { mode: 'SINGLE'; id: string; label: string }
    | { mode: 'SELECTED'; count: number }
    | { mode: 'FILTERED'; count: number }
    | { mode: 'RESET_ALL'; count: number }
  >(null);

  useEffect(() => {
    setLogs(getUserActivityLogs());
    return subscribeUserActivityLogs(updated => {
      setLogs(updated);
    });
  }, []);

  const todayIso = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter(item => {
      if (roleFilter !== 'ALL' && item.role !== roleFilter) return false;

      if (dateScope === 'TODAY' && item.tanggal !== todayIso) return false;
      if (dateScope === 'DASHBOARD_DATE' && item.tanggal !== dashboardDate) return false;

      if (actionFilter === 'AUTH') {
        if (!['LOGIN', 'LOGOUT', 'SWITCH_PROFILE'].includes(item.actionType)) return false;
      } else if (actionFilter === 'DATA') {
        if (!['CREATE', 'UPDATE', 'DELETE', 'PLAN_UPDATE'].includes(item.actionType)) return false;
      } else if (actionFilter === 'EXPORT_SYNC') {
        if (!['EXPORT_WA', 'EXPORT_PDF', 'SYNC_PULL', 'SYNC_PUSH'].includes(item.actionType))
          return false;
      } else if (actionFilter === 'SETTINGS') {
        if (item.actionType !== 'SETTINGS') return false;
      }

      if (q) {
        const hay = `${item.userName} ${item.role} ${item.module} ${item.description} ${item.tanggal} ${item.jam}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, roleFilter, actionFilter, dateScope, searchQuery, todayIso, dashboardDate]);

  const sessionSummaries = useMemo(() => groupLogsBySession(filteredLogs), [filteredLogs]);
  const allSessions = useMemo(() => groupLogsBySession(logs), [logs]);

  const adminLoginCount = useMemo(
    () => allSessions.filter(s => s.role === 'admin').length,
    [allSessions]
  );
  const userLoginCount = useMemo(
    () => allSessions.filter(s => s.role === 'user').length,
    [allSessions]
  );
  const latestLogin = useMemo(
    () => logs.find(l => l.actionType === 'LOGIN') || logs[0] || null,
    [logs]
  );

  // Strict Admin-Only Guard: User role can never view or access this panel
  if (!isAdmin) return null;

  const showTempFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(prev => (prev === msg ? null : prev));
    }, 3500);
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredLogs.map(l => l.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...filteredIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !(prev[sessionId] ?? true),
    }));
  };

  const handleDownloadExcel = () => {
    const fileName = exportUserActivityLogsToExcel(
      filteredLogs,
      searchQuery || roleFilter !== 'ALL' || actionFilter !== 'ALL' || dateScope !== 'ALL'
        ? 'Filter aktif diterapkan'
        : 'Seluruh data log aplikasi web'
    );
    showTempFeedback(`File Excel berhasil diunduh: ${fileName}`);
  };

  const executeConfirmedDelete = () => {
    if (!confirmDialog) return;

    if (confirmDialog.mode === 'SINGLE') {
      deleteUserActivityLog(confirmDialog.id);
      setSelectedIds(prev => prev.filter(id => id !== confirmDialog.id));
      showTempFeedback('1 baris log aktivitas berhasil dihapus dari web aplikasi.');
    } else if (confirmDialog.mode === 'SELECTED') {
      deleteUserActivityLogsByIds(selectedIds);
      const deletedCount = selectedIds.length;
      setSelectedIds([]);
      showTempFeedback(`${deletedCount} data log terpilih berhasil dihapus dari web aplikasi.`);
    } else if (confirmDialog.mode === 'FILTERED') {
      const ids = filteredLogs.map(l => l.id);
      deleteUserActivityLogsByIds(ids);
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
      showTempFeedback(`${ids.length} data log sesuai filter berhasil dihapus.`);
    } else if (confirmDialog.mode === 'RESET_ALL') {
      clearAllUserActivityLogs();
      setSelectedIds([]);
      showTempFeedback('Seluruh log monitoring login & aktivitas berhasil di-reset.');
    }
    setConfirmDialog(null);
  };

  return (
    <div className="bg-[#18181b] border border-[#facc15]/30 rounded p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[rgba(242,239,235,0.1)] pb-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#facc15]/15 border border-[#facc15]/35 text-[#facc15] text-[10px] font-mono font-bold uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>KHUSUS ADMIN</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] uppercase font-bold">
              Lokal Web App • Terpisah dari Sync Google Sheet
            </span>
          </div>
          <h2 className="font-syne font-extrabold text-sm sm:text-base uppercase text-[#f2efeb] flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#facc15]" />
            <span>6. Monitoring Login &amp; Aktivitas User / Admin</span>
          </h2>
          <p className="text-[11px] font-mono text-[rgba(242,239,235,0.55)]">
            Rekaman setiap sesi login Admin maupun User lengkap dengan aktivitas, tanggal, dan jamnya. Penghapusan atau reset tidak memengaruhi data Google Spreadsheet.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase flex items-center space-x-1.5 transition active:scale-95 shadow-sm"
            title="Unduh rekaman login & aktivitas dalam format Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Excel ({filteredLogs.length})</span>
          </button>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setConfirmDialog({ mode: 'SELECTED', count: selectedIds.length })
              }
              className="px-3 py-2 rounded bg-[#fb7185]/15 hover:bg-[#fb7185]/25 border border-[#fb7185]/40 text-[#fb7185] text-xs font-mono font-bold uppercase flex items-center space-x-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih ({selectedIds.length})</span>
            </button>
          )}

          {filteredLogs.length > 0 && filteredLogs.length < logs.length && (
            <button
              type="button"
              onClick={() =>
                setConfirmDialog({ mode: 'FILTERED', count: filteredLogs.length })
              }
              className="px-2.5 py-2 rounded bg-[#111113] hover:bg-[#fb7185]/15 border border-[rgba(242,239,235,0.15)] hover:border-[#fb7185]/40 text-[#fb7185] text-[11px] font-mono font-bold uppercase flex items-center space-x-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Filter</span>
            </button>
          )}

          {logs.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setConfirmDialog({ mode: 'RESET_ALL', count: logs.length })
              }
              className="px-3 py-2 rounded bg-[#fb7185] hover:bg-[#f43f5e] text-white text-xs font-mono font-bold uppercase flex items-center space-x-1.5 transition active:scale-95"
              title="Reset semua riwayat monitoring login web"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className="p-2.5 rounded bg-[#4ade80]/15 border border-[#4ade80]/40 text-[#4ade80] text-xs font-mono font-bold flex items-center justify-between">
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3 rounded bg-[#111113] border border-[rgba(242,239,235,0.08)]">
          <div className="text-[10px] font-mono text-[rgba(242,239,235,0.5)] uppercase">
            Total Sesi Login
          </div>
          <div className="text-xl font-syne font-extrabold text-[#facc15] mt-0.5">
            {allSessions.length} <span className="text-xs font-mono font-normal text-[rgba(242,239,235,0.6)]">Sesi</span>
          </div>
          <div className="text-[10px] font-mono text-[rgba(242,239,235,0.5)] mt-0.5">
            Admin: <strong className="text-[#facc15]">{adminLoginCount}</strong> • User:{' '}
            <strong className="text-[#38bdf8]">{userLoginCount}</strong>
          </div>
        </div>

        <div className="p-3 rounded bg-[#111113] border border-[rgba(242,239,235,0.08)]">
          <div className="text-[10px] font-mono text-[rgba(242,239,235,0.5)] uppercase">
            Total Aktivitas Tercatat
          </div>
          <div className="text-xl font-syne font-extrabold text-[#4ade80] mt-0.5">
            {logs.length} <span className="text-xs font-mono font-normal text-[rgba(242,239,235,0.6)]">Log</span>
          </div>
          <div className="text-[10px] font-mono text-[rgba(242,239,235,0.5)] mt-0.5">
            Ditampilkan sesuai filter: <strong>{filteredLogs.length}</strong>
          </div>
        </div>

        <div className="sm:col-span-2 p-3 rounded bg-[#111113] border border-[rgba(242,239,235,0.08)] flex flex-col justify-between">
          <div className="text-[10px] font-mono text-[rgba(242,239,235,0.5)] uppercase">
            Login / Aktivitas Terakhir
          </div>
          {latestLogin ? (
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    latestLogin.role === 'admin'
                      ? 'bg-[#facc15]/15 text-[#facc15] border-[#facc15]/35'
                      : 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/35'
                  }`}
                >
                  {latestLogin.role.toUpperCase()}
                </span>
                <span className="font-syne font-bold text-sm text-[#f2efeb] truncate">
                  {latestLogin.userName}
                </span>
              </div>
              <div className="text-[11px] font-mono text-[rgba(242,239,235,0.7)] flex items-center space-x-2">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-[#facc15]" />
                  <span>{latestLogin.tanggal}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-[#4ade80]" />
                  <span>{latestLogin.jam}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs font-mono text-[rgba(242,239,235,0.4)] mt-1">
              Belum ada aktivitas login tercatat.
            </div>
          )}
        </div>
      </div>

      {/* Filters & View Mode Switch */}
      <div className="bg-[#111113] border border-[rgba(242,239,235,0.08)] rounded p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[rgba(242,239,235,0.45)] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama User/Admin, unit, modul, aktivitas..."
              className="w-full bg-[#18181b] border border-[rgba(242,239,235,0.15)] rounded pl-8 pr-3 py-1.5 text-xs font-mono text-[#f2efeb] placeholder-[rgba(242,239,235,0.4)] outline-none focus:border-[#facc15]"
            />
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as RoleFilter)}
            className="bg-[#18181b] border border-[rgba(242,239,235,0.15)] rounded px-2.5 py-1.5 text-xs font-mono text-[#f2efeb] outline-none focus:border-[#facc15]"
          >
            <option value="ALL">Semua Mode (Admin &amp; User)</option>
            <option value="admin">Mode Admin</option>
            <option value="user">Mode User</option>
          </select>

          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value as ActionFilter)}
            className="bg-[#18181b] border border-[rgba(242,239,235,0.15)] rounded px-2.5 py-1.5 text-xs font-mono text-[#f2efeb] outline-none focus:border-[#facc15]"
          >
            <option value="ALL">Semua Jenis Aktivitas</option>
            <option value="AUTH">Login / Logout / Ganti Profil</option>
            <option value="DATA">Input / Edit / Hapus Data</option>
            <option value="EXPORT_SYNC">Export PDF / WA / Sync</option>
            <option value="SETTINGS">Pengaturan Settings</option>
          </select>

          <select
            value={dateScope}
            onChange={e => setDateScope(e.target.value as DateScope)}
            className="bg-[#18181b] border border-[rgba(242,239,235,0.15)] rounded px-2.5 py-1.5 text-xs font-mono text-[#f2efeb] outline-none focus:border-[#facc15]"
          >
            <option value="ALL">Semua Tanggal</option>
            <option value="TODAY">Hari Ini ({todayIso})</option>
            <option value="DASHBOARD_DATE">Tanggal Dashboard ({dashboardDate})</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-[#18181b] border border-[rgba(242,239,235,0.15)] rounded p-0.5 text-[11px] font-mono shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('SESSIONS')}
            className={`px-2.5 py-1 rounded font-bold uppercase flex items-center space-x-1 transition ${
              viewMode === 'SESSIONS'
                ? 'bg-[#facc15] text-[#111113]'
                : 'text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Per Sesi Login ({sessionSummaries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TABLE')}
            className={`px-2.5 py-1 rounded font-bold uppercase flex items-center space-x-1 transition ${
              viewMode === 'TABLE'
                ? 'bg-[#facc15] text-[#111113]'
                : 'text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb]'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>Log Detail ({filteredLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {filteredLogs.length === 0 ? (
        <div className="py-10 text-center bg-[#111113] rounded border border-[rgba(242,239,235,0.08)] space-y-1">
          <p className="font-syne font-bold text-sm text-[#f2efeb]">
            Belum ada data log login / aktivitas yang cocok
          </p>
          <p className="text-[11px] font-mono text-[rgba(242,239,235,0.5)]">
            Setiap User atau Admin yang login dan beraktivitas di web aplikasi akan tercatat otomatis di sini.
          </p>
        </div>
      ) : viewMode === 'SESSIONS' ? (
        <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
          {sessionSummaries.map(ses => {
            const isExpanded = expandedSessions[ses.sessionId] ?? true;
            return (
              <div
                key={ses.sessionId}
                className="bg-[#111113] border border-[rgba(242,239,235,0.1)] rounded overflow-hidden"
              >
                {/* Session Header */}
                <button
                  type="button"
                  onClick={() => toggleSessionExpand(ses.sessionId)}
                  className="w-full px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-[rgba(242,239,235,0.04)] transition"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#facc15] shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[rgba(242,239,235,0.5)] shrink-0" />
                    )}
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                        ses.role === 'admin'
                          ? 'bg-[#facc15]/15 text-[#facc15]'
                          : 'bg-[#38bdf8]/15 text-[#38bdf8]'
                      }`}
                    >
                      {ses.role === 'admin' ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-syne font-bold text-sm text-[#f2efeb] truncate">
                          {ses.userName}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border ${
                            ses.role === 'admin'
                              ? 'bg-[#facc15]/15 text-[#facc15] border-[#facc15]/30'
                              : 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30'
                          }`}
                        >
                          {ses.role === 'admin' ? 'ADMIN' : 'USER'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[rgba(242,239,235,0.06)] text-[rgba(242,239,235,0.7)]">
                          {ses.totalActions} Aktivitas
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-[rgba(242,239,235,0.5)] mt-0.5">
                        Login: <strong className="text-[#f2efeb]">{ses.loginDate}</strong> pukul{' '}
                        <strong className="text-[#4ade80]">{ses.loginTime}</strong>
                        {ses.logoutTime
                          ? ` • Logout: ${ses.logoutTime}`
                          : ` • Terakhir aktif: ${ses.lastActivityDate} ${ses.lastActivityTime}`}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Session Activity Timeline */}
                {isExpanded && (
                  <div className="border-t border-[rgba(242,239,235,0.08)] divide-y divide-[rgba(242,239,235,0.06)] bg-[#18181b]/40">
                    {ses.activities.map(act => (
                      <div
                        key={act.id}
                        className="px-3.5 py-2 flex items-start sm:items-center justify-between gap-2 text-xs font-mono hover:bg-[rgba(242,239,235,0.03)]"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 min-w-0">
                          <span className="text-[10px] text-[rgba(242,239,235,0.55)] shrink-0">
                            {act.tanggal} • <strong className="text-[#f2efeb]">{act.jam}</strong>
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase w-fit shrink-0 ${getActionBadgeClass(
                              act.actionType
                            )}`}
                          >
                            {ACTION_TYPE_LABELS[act.actionType] || act.actionType}
                          </span>
                          <span className="text-[10px] font-bold text-[#facc15] shrink-0">
                            [{act.module}]
                          </span>
                          <span className="text-[11px] text-[rgba(242,239,235,0.85)] break-words">
                            {act.description}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDialog({
                              mode: 'SINGLE',
                              id: act.id,
                              label: `${act.userName} - ${act.description}`,
                            })
                          }
                          className="p-1 rounded text-[rgba(242,239,235,0.45)] hover:text-[#fb7185] hover:bg-[#fb7185]/10 shrink-0 transition"
                          title="Hapus log ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[540px] border border-[rgba(242,239,235,0.1)] rounded">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead className="sticky top-0 bg-[#111113] border-b border-[rgba(242,239,235,0.12)] text-[10px] uppercase text-[rgba(242,239,235,0.65)] z-10">
              <tr>
                <th className="py-2.5 px-2.5 w-8">
                  <button
                    type="button"
                    onClick={toggleSelectAllFiltered}
                    className="text-[#facc15] flex items-center justify-center"
                    title="Pilih Semua"
                  >
                    {filteredLogs.length > 0 &&
                    filteredLogs.every(l => selectedIds.includes(l.id)) ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-2.5">Tanggal &amp; Jam</th>
                <th className="py-2.5 px-2.5">Nama</th>
                <th className="py-2.5 px-2.5">Mode</th>
                <th className="py-2.5 px-2.5">Aksi</th>
                <th className="py-2.5 px-2.5">Modul</th>
                <th className="py-2.5 px-2.5">Detail Aktivitas</th>
                <th className="py-2.5 px-2.5 text-right">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(242,239,235,0.06)]">
              {filteredLogs.map(log => {
                const checked = selectedIds.includes(log.id);
                return (
                  <tr
                    key={log.id}
                    className={`hover:bg-[rgba(242,239,235,0.03)] ${
                      checked ? 'bg-[#facc15]/8' : ''
                    }`}
                  >
                    <td className="py-2 px-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(log.id)}
                        className="text-[#facc15] flex items-center justify-center"
                      >
                        {checked ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-[rgba(242,239,235,0.4)]" />
                        )}
                      </button>
                    </td>
                    <td className="py-2 px-2.5 whitespace-nowrap">
                      <div className="font-bold text-[#f2efeb]">{log.tanggal}</div>
                      <div className="text-[10px] text-[#4ade80]">{log.jam}</div>
                    </td>
                    <td className="py-2 px-2.5 font-bold text-[#f2efeb] whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-2 px-2.5 whitespace-nowrap">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                          log.role === 'admin'
                            ? 'bg-[#facc15]/15 text-[#facc15] border-[#facc15]/30'
                            : 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30'
                        }`}
                      >
                        {log.role === 'admin' ? 'ADMIN' : 'USER'}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 whitespace-nowrap">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${getActionBadgeClass(
                          log.actionType
                        )}`}
                      >
                        {ACTION_TYPE_LABELS[log.actionType] || log.actionType}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-[#facc15] font-bold whitespace-nowrap">
                      {log.module}
                    </td>
                    <td className="py-2 px-2.5 text-[rgba(242,239,235,0.85)] min-w-[240px]">
                      {log.description}
                    </td>
                    <td className="py-2 px-2.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDialog({
                            mode: 'SINGLE',
                            id: log.id,
                            label: `${log.userName} (${log.tanggal} ${log.jam})`,
                          })
                        }
                        className="p-1.5 rounded text-[#fb7185] hover:bg-[#fb7185]/15 transition"
                        title="Hapus baris ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal for Delete / Reset (No window.confirm) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#18181b] border border-[#fb7185]/40 rounded-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-full bg-[#fb7185]/15 text-[#fb7185] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-syne font-bold text-sm uppercase text-[#f2efeb]">
                  {confirmDialog.mode === 'RESET_ALL'
                    ? 'Reset Seluruh Log Monitoring?'
                    : 'Hapus Data Monitoring Login?'}
                </h3>
                <p className="text-xs font-mono text-[rgba(242,239,235,0.75)] leading-relaxed">
                  {confirmDialog.mode === 'SINGLE' && (
                    <>
                      Anda akan menghapus 1 catatan aktivitas: <strong className="text-[#f2efeb]">{confirmDialog.label}</strong>.
                    </>
                  )}
                  {confirmDialog.mode === 'SELECTED' && (
                    <>
                      Anda akan menghapus <strong className="text-[#fb7185]">{confirmDialog.count}</strong> catatan log aktivitas yang dipilih.
                    </>
                  )}
                  {confirmDialog.mode === 'FILTERED' && (
                    <>
                      Anda akan menghapus <strong className="text-[#fb7185]">{confirmDialog.count}</strong> catatan log aktivitas yang sedang tampil sesuai filter.
                    </>
                  )}
                  {confirmDialog.mode === 'RESET_ALL' && (
                    <>
                      Seluruh <strong className="text-[#fb7185]">{confirmDialog.count}</strong> riwayat monitoring login &amp; aktivitas di web aplikasi ini akan dikosongkan.
                    </>
                  )}
                </p>
                <div className="p-2 rounded bg-[#4ade80]/10 border border-[#4ade80]/30 text-[10px] font-mono text-[#4ade80]">
                  Aman: Data pada Google Spreadsheet (Tarik / Kirim Data) tidak akan terpengaruh atau terhapus.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-2 rounded border border-[rgba(242,239,235,0.2)] text-xs font-mono font-bold uppercase text-[rgba(242,239,235,0.75)] hover:bg-[rgba(242,239,235,0.08)]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeConfirmedDelete}
                className="px-4 py-2 rounded bg-[#fb7185] hover:bg-[#f43f5e] text-white text-xs font-mono font-bold uppercase"
              >
                {confirmDialog.mode === 'RESET_ALL' ? 'Ya, Reset Semua' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
