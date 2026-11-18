import * as XLSX from 'xlsx';
import { ActivityLogActionType, AuthUser, UserActivityLog, UserRole } from '../types';

const ACTIVITY_LOG_STORAGE_KEY = 'plant2_user_activity_logs_v1';
const AUTH_SESSION_KEY = 'fleetcheck_auth_session';
const MAX_ACTIVITY_LOGS = 2000;

type ActivityLogListener = (logs: UserActivityLog[]) => void;
const listeners = new Set<ActivityLogListener>();

const getFormattedLocalDateTime = (dateInput?: Date) => {
  const now = dateInput || new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return {
    tanggal: `${y}-${m}-${d}`,
    jam: `${hh}:${mm}:${ss}`,
    timestamp: now.toISOString(),
  };
};

export const getUserActivityLogs = (): UserActivityLog[] => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as UserActivityLog[]).sort((a, b) => {
      const ta = new Date(a.timestamp).getTime() || 0;
      const tb = new Date(b.timestamp).getTime() || 0;
      return tb - ta;
    });
  } catch {
    return [];
  }
};

const saveLogsToStorage = (logs: UserActivityLog[]): UserActivityLog[] => {
  const trimmed = logs
    .sort((a, b) => (new Date(b.timestamp).getTime() || 0) - (new Date(a.timestamp).getTime() || 0))
    .slice(0, MAX_ACTIVITY_LOGS);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(ACTIVITY_LOG_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (err) {
      console.warn('Gagal menyimpan log aktivitas pengguna ke localStorage:', err);
    }
  }
  listeners.forEach(fn => {
    try {
      fn(trimmed);
    } catch {
      // Ignore listener errors
    }
  });
  return trimmed;
};

export const subscribeUserActivityLogs = (listener: ActivityLogListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export interface RecordUserActivityParams {
  userName: string;
  role: UserRole;
  sessionId: string;
  actionType: ActivityLogActionType;
  module: string;
  description: string;
}

export const recordUserActivity = (params: RecordUserActivityParams): UserActivityLog => {
  const dt = getFormattedLocalDateTime();
  const entry: UserActivityLog = {
    id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    userName: params.userName.trim() || (params.role === 'admin' ? 'Admin' : 'User'),
    role: params.role,
    sessionId: params.sessionId || `SES-LEGACY-${dt.tanggal}`,
    actionType: params.actionType,
    module: params.module,
    description: params.description,
    tanggal: dt.tanggal,
    jam: dt.jam,
    timestamp: dt.timestamp,
  };

  const current = getUserActivityLogs();
  saveLogsToStorage([entry, ...current]);
  return entry;
};

const getActiveAuthUserFromStorage = (): AuthUser | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed && (parsed.role === 'admin' || parsed.role === 'user')) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const logCurrentUserActivity = (params: {
  actionType: ActivityLogActionType;
  module: string;
  description: string;
}): UserActivityLog | null => {
  const active = getActiveAuthUserFromStorage();
  if (!active) return null;
  return recordUserActivity({
    userName: active.displayName || (active.role === 'admin' ? 'Admin' : 'User'),
    role: active.role,
    sessionId: active.sessionId || `SES-${active.loginTime}`,
    actionType: params.actionType,
    module: params.module,
    description: params.description,
  });
};

export const deleteUserActivityLog = (id: string): UserActivityLog[] => {
  const next = getUserActivityLogs().filter(item => item.id !== id);
  return saveLogsToStorage(next);
};

export const deleteUserActivityLogsByIds = (ids: string[]): UserActivityLog[] => {
  const idSet = new Set(ids);
  const next = getUserActivityLogs().filter(item => !idSet.has(item.id));
  return saveLogsToStorage(next);
};

export const clearAllUserActivityLogs = (): UserActivityLog[] => {
  return saveLogsToStorage([]);
};

export const ACTION_TYPE_LABELS: Record<ActivityLogActionType, string> = {
  LOGIN: 'Login Masuk',
  LOGOUT: 'Logout Keluar',
  SWITCH_PROFILE: 'Ganti Profil',
  CREATE: 'Tambah Data',
  UPDATE: 'Edit / Update Data',
  DELETE: 'Hapus Data',
  EXPORT_WA: 'Share WhatsApp',
  EXPORT_PDF: 'Cetak / PDF',
  SYNC_PULL: 'Tarik Data Sheet',
  SYNC_PUSH: 'Kirim Data Sheet',
  SETTINGS: 'Pengaturan Sistem',
  PLAN_UPDATE: 'Atur Rencana Unit',
};

export interface LoginSessionSummary {
  sessionId: string;
  userName: string;
  role: UserRole;
  loginDate: string;
  loginTime: string;
  lastActivityDate: string;
  lastActivityTime: string;
  logoutTime?: string;
  totalActions: number;
  activities: UserActivityLog[];
}

export const groupLogsBySession = (logs: UserActivityLog[]): LoginSessionSummary[] => {
  const map = new Map<string, UserActivityLog[]>();

  logs.forEach(log => {
    const key = log.sessionId || `NO-SES-${log.userName}-${log.tanggal}`;
    const list = map.get(key) || [];
    list.push(log);
    map.set(key, list);
  });

  const summaries: LoginSessionSummary[] = [];

  map.forEach((items, sessionId) => {
    // Sort chronological ascending inside session
    const asc = [...items].sort(
      (a, b) => (new Date(a.timestamp).getTime() || 0) - (new Date(b.timestamp).getTime() || 0)
    );
    const loginEntry = asc.find(i => i.actionType === 'LOGIN') || asc[0];
    const logoutEntry = [...asc].reverse().find(i => i.actionType === 'LOGOUT');
    const lastEntry = asc[asc.length - 1];
    const firstEntry = asc[0];

    summaries.push({
      sessionId,
      userName: loginEntry.userName,
      role: loginEntry.role,
      loginDate: firstEntry.tanggal,
      loginTime: firstEntry.jam,
      lastActivityDate: lastEntry.tanggal,
      lastActivityTime: lastEntry.jam,
      logoutTime: logoutEntry ? `${logoutEntry.tanggal} ${logoutEntry.jam}` : undefined,
      totalActions: asc.length,
      activities: asc,
    });
  });

  // Sort sessions newest first by login/first timestamp
  return summaries.sort((a, b) => {
    const ta = new Date(a.activities[a.activities.length - 1]?.timestamp || 0).getTime() || 0;
    const tb = new Date(b.activities[b.activities.length - 1]?.timestamp || 0).getTime() || 0;
    return tb - ta;
  });
};

export const exportUserActivityLogsToExcel = (
  logs: UserActivityLog[],
  filterNote?: string
): string => {
  const sortedAsc = [...logs].sort(
    (a, b) => (new Date(b.timestamp).getTime() || 0) - (new Date(a.timestamp).getTime() || 0)
  );

  const detailRows = sortedAsc.map((item, idx) => ({
    No: idx + 1,
    Tanggal: item.tanggal,
    Jam: item.jam,
    'Nama Pengguna': item.userName,
    Mode: item.role === 'admin' ? 'ADMIN' : 'USER',
    'Jenis Aktivitas': ACTION_TYPE_LABELS[item.actionType] || item.actionType,
    Modul: item.module,
    'Detail Aktivitas': item.description,
    'ID Sesi Login': item.sessionId,
  }));

  const sessionSummaries = groupLogsBySession(sortedAsc);
  const sessionRows = sessionSummaries.map((ses, idx) => ({
    No: idx + 1,
    'Nama Pengguna': ses.userName,
    Mode: ses.role === 'admin' ? 'ADMIN' : 'USER',
    'Tanggal Login': ses.loginDate,
    'Jam Login': ses.loginTime,
    'Aktivitas Terakhir': `${ses.lastActivityDate} ${ses.lastActivityTime}`,
    'Status Logout': ses.logoutTime || 'Masih Aktif / Belum Logout',
    'Jumlah Aktivitas': ses.totalActions,
    'Daftar Aktivitas Saat Login': ses.activities
      .map(act => `[${act.tanggal} ${act.jam}] ${act.module}: ${act.description}`)
      .join(' | '),
  }));

  const wb = XLSX.utils.book_new();

  const wsDetail = XLSX.utils.json_to_sheet(
    detailRows.length > 0
      ? detailRows
      : [
          {
            No: '-',
            Tanggal: '-',
            Jam: '-',
            'Nama Pengguna': 'Tidak ada data',
            Mode: '-',
            'Jenis Aktivitas': '-',
            Modul: '-',
            'Detail Aktivitas': filterNote || 'Belum ada riwayat tercatat',
            'ID Sesi Login': '-',
          },
        ]
  );

  wsDetail['!cols'] = [
    { wch: 5 },
    { wch: 13 },
    { wch: 11 },
    { wch: 24 },
    { wch: 10 },
    { wch: 20 },
    { wch: 20 },
    { wch: 52 },
    { wch: 24 },
  ];

  const wsSessions = XLSX.utils.json_to_sheet(
    sessionRows.length > 0
      ? sessionRows
      : [
          {
            No: '-',
            'Nama Pengguna': 'Tidak ada sesi',
            Mode: '-',
            'Tanggal Login': '-',
            'Jam Login': '-',
            'Aktivitas Terakhir': '-',
            'Status Logout': '-',
            'Jumlah Aktivitas': 0,
            'Daftar Aktivitas Saat Login': '-',
          },
        ]
  );

  wsSessions['!cols'] = [
    { wch: 5 },
    { wch: 24 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 26 },
    { wch: 16 },
    { wch: 70 },
  ];

  XLSX.utils.book_append_sheet(wb, wsDetail, 'Log Aktivitas');
  XLSX.utils.book_append_sheet(wb, wsSessions, 'Ringkasan Sesi Login');

  const today = getFormattedLocalDateTime().tanggal;
  const fileName = `Monitoring_Login_Aktivitas_MTBU_${today}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
};
