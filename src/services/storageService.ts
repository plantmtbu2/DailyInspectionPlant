import {
  CodeUnit,
  BAPRecord,
  DailyCheckRigid,
  DailyCheckArtic,
  BacklogItem,
  AddActivityItem,
} from '../types';
import {
  syncBapToSheet,
  syncDailyRigidToSheet,
  syncDailyArticToSheet,
  syncBacklogToSheet,
  syncActivityToSheet,
  syncCodeUnitsToSheet,
  getStoredSheetsConfig,
  pushAllDataToGoogleSheet,
} from './googleSheetsService';

const STORAGE_KEYS = {
  CODE_UNITS: 'fleetcheck_code_units_v1',
  BAP: 'fleetcheck_bap_v1',
  DAILY_RIGID: 'fleetcheck_daily_rigid_v1',
  DAILY_ARTIC: 'fleetcheck_daily_artic_v1',
  BACKLOG: 'fleetcheck_backlog_v1',
  ACTIVITIES: 'fleetcheck_activities_v1',
  INITIALIZED: 'fleetcheck_initialized_clean_v4',
  SAMPLE_PURGED: 'fleetcheck_sample_purged_v4',
};

// Ensure all sample/mock data from previous versions is permanently purged
// and storage is initialized cleanly with empty datasets for actual operational input
const ensureStorageInitialized = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;

  // 1. One-time purge of any residual initial sample mining data from localStorage
  const isPurged = localStorage.getItem(STORAGE_KEYS.SAMPLE_PURGED);
  if (!isPurged) {
    const sampleIds = new Set([
      'CU-01', 'CU-02', 'CU-03', 'CU-04', 'CU-05', 'CU-06', 'CU-07',
      'BAP-202610-001', 'BAP-202610-002',
      'BL-001', 'BL-002', 'BL-003',
      'ACT-001', 'ACT-002', 'ACT-003',
      'QA1-RIG-202610-001', 'QA7-RIG-202610-002', 'DAILY-RIG-202610-003',
      'QA1-ART-202610-001', 'QA7-ART-202610-002', 'DAILY-ART-202610-003',
    ]);

    const cleanCollection = (key: string) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((item: any) => !sampleIds.has(item.id));
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      } catch {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    cleanCollection(STORAGE_KEYS.CODE_UNITS);
    cleanCollection(STORAGE_KEYS.BAP);
    cleanCollection(STORAGE_KEYS.DAILY_RIGID);
    cleanCollection(STORAGE_KEYS.DAILY_ARTIC);
    cleanCollection(STORAGE_KEYS.BACKLOG);
    cleanCollection(STORAGE_KEYS.ACTIVITIES);

    localStorage.setItem(STORAGE_KEYS.SAMPLE_PURGED, 'true');
  }

  // 2. Initialize keys as empty arrays if null
  if (localStorage.getItem(STORAGE_KEYS.CODE_UNITS) === null) {
    localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify([]));
  }
  if (localStorage.getItem(STORAGE_KEYS.BAP) === null) {
    localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify([]));
  }
  if (localStorage.getItem(STORAGE_KEYS.DAILY_RIGID) === null) {
    localStorage.setItem(STORAGE_KEYS.DAILY_RIGID, JSON.stringify([]));
  }
  if (localStorage.getItem(STORAGE_KEYS.DAILY_ARTIC) === null) {
    localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify([]));
  }
  if (localStorage.getItem(STORAGE_KEYS.BACKLOG) === null) {
    localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify([]));
  }
  if (localStorage.getItem(STORAGE_KEYS.ACTIVITIES) === null) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([]));
  }
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
};

let debouncedSyncTimer: ReturnType<typeof setTimeout> | null = null;

export const autoSyncToGoogleSheetIfConnected = async () => {
  if (typeof window === 'undefined') return;
  const config = getStoredSheetsConfig();
  if (!config?.spreadsheetId && !config?.webAppUrl) return;

  if (debouncedSyncTimer) {
    clearTimeout(debouncedSyncTimer);
  }

  // Non-blocking background sync (350ms debounce) - ensures UI saves are instant < 5ms
  debouncedSyncTimer = setTimeout(async () => {
    try {
      await pushAllDataToGoogleSheet({
        codeUnits: getCodeUnits(),
        bapList: getBAPList(),
        dailyRigidList: getDailyRigidList(),
        dailyArticList: getDailyArticList(),
        backlogs: getBacklogs(),
        activities: getActivities(),
      });
    } catch (err) {
      console.warn('Background auto-sync notification:', err);
    }
  }, 350);
};

// Replace entire dataset (used during pull from Google Sheet)
export const replaceEntireDataset = (data: {
  codeUnits?: CodeUnit[];
  bapList?: BAPRecord[];
  dailyRigidList?: DailyCheckRigid[];
  dailyArticList?: DailyCheckArtic[];
  backlogs?: BacklogItem[];
  activities?: AddActivityItem[];
}) => {
  if (data.codeUnits !== undefined) {
    localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(data.codeUnits));
  }
  if (data.bapList !== undefined) {
    localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify(data.bapList));
  }
  if (data.dailyRigidList !== undefined) {
    localStorage.setItem(STORAGE_KEYS.DAILY_RIGID, JSON.stringify(data.dailyRigidList));
  }
  if (data.dailyArticList !== undefined) {
    localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify(data.dailyArticList));
  }
  if (data.backlogs !== undefined) {
    localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify(data.backlogs));
  }
  if (data.activities !== undefined) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(data.activities));
  }
};

// -------------------------------------------------------------
// CODE UNITS
// -------------------------------------------------------------
export const getCodeUnits = (): CodeUnit[] => {
  ensureStorageInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CODE_UNITS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCodeUnits = (units: CodeUnit[]) => {
  localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(units));
  if (getStoredSheetsConfig()) {
    syncCodeUnitsToSheet(units);
  }
};

export const addOrUpdateCodeUnit = (unit: CodeUnit) => {
  const current = getCodeUnits();
  const existingIndex = current.findIndex(u => u.codeUnit === unit.codeUnit || u.id === unit.id);
  let updated: CodeUnit[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = unit;
  } else {
    updated = [unit, ...current];
  }
  saveCodeUnits(updated);
  return updated;
};

export const deleteCodeUnit = async (id: string, cascade = true): Promise<CodeUnit[]> => {
  const current = getCodeUnits();
  const unitToDelete = current.find(u => u.id === id);
  const updated = current.filter(u => u.id !== id);
  localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(updated));

  if (cascade && unitToDelete) {
    const targetCode = unitToDelete.codeUnit;
    const baps = getBAPList().filter(b => b.codeUnit !== targetCode);
    const rigids = getDailyRigidList().filter(r => r.codeUnit !== targetCode);
    const artics = getDailyArticList().filter(a => a.codeUnit !== targetCode);
    const backlogs = getBacklogs().filter(b => b.codeUnit !== targetCode);
    const activities = getActivities().filter(a => a.codeUnit !== targetCode);

    localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify(baps));
    localStorage.setItem(STORAGE_KEYS.DAILY_RIGID, JSON.stringify(rigids));
    localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify(artics));
    localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify(backlogs));
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  }

  autoSyncToGoogleSheetIfConnected();
  return updated;
};

// -------------------------------------------------------------
// BAP
// -------------------------------------------------------------
export const getBAPList = (): BAPRecord[] => {
  ensureStorageInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BAP);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addBAPRecord = async (item: BAPRecord): Promise<BAPRecord[]> => {
  const list = getBAPList();
  const updated = [item, ...list];
  localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify(updated));

  // Update HM on Master Unit if newer
  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch && item.hm > unitMatch.currentHm) {
    unitMatch.currentHm = item.hm;
    unitMatch.statusUnit = item.status === 'COMPLETED' ? 'READY' : 'BREAKDOWN';
    saveCodeUnits(units);
  }

  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateBAPRecord = async (item: BAPRecord): Promise<BAPRecord[]> => {
  const list = getBAPList();
  const exists = list.some(b => b.id === item.id);
  const updated = exists ? list.map(b => (b.id === item.id ? item : b)) : [item, ...list];
  localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify(updated));

  // Update master unit if status changed
  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hm > unitMatch.currentHm) unitMatch.currentHm = item.hm;
    if (item.status === 'COMPLETED') unitMatch.statusUnit = 'READY';
    else if (item.status === 'OPEN') unitMatch.statusUnit = 'BREAKDOWN';
    saveCodeUnits(units);
  }

  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteBAPRecord = async (id: string): Promise<BAPRecord[]> => {
  const list = getBAPList();
  const updated = list.filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify(updated));
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

// -------------------------------------------------------------
// DAILY RIGID
// -------------------------------------------------------------
export const getDailyRigidList = (): DailyCheckRigid[] => {
  ensureStorageInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_RIGID);
    if (!raw) return [];
    const parsed: DailyCheckRigid[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => ({
      ...item,
      qaType: item.qaType || (item.id.startsWith('DAILY') ? 'DAILY_INSPECTION' : item.id.startsWith('QA7') ? 'QA7_FINAL' : 'QA1_PRE'),
    }));
  } catch {
    return [];
  }
};

export const addDailyRigid = async (item: DailyCheckRigid): Promise<DailyCheckRigid[]> => {
  const list = getDailyRigidList();
  const normalizedItem: DailyCheckRigid = {
    ...item,
    qaType: item.qaType || 'DAILY_INSPECTION',
  };
  const updated = [normalizedItem, ...list];
  localStorage.setItem(STORAGE_KEYS.DAILY_RIGID, JSON.stringify(updated));

  // Update Master Unit HM & Status
  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hmUnit > unitMatch.currentHm) unitMatch.currentHm = item.hmUnit;
    unitMatch.lastInspectionDate = item.tanggal;
    if (item.status === 'BREAKDOWN') unitMatch.statusUnit = 'BREAKDOWN';
    else if (item.status === 'SCHEDULED_SERVICE') unitMatch.statusUnit = 'MAINTENANCE';
    else unitMatch.statusUnit = 'READY';
    saveCodeUnits(units);
  }

  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateDailyRigid = async (item: DailyCheckRigid): Promise<DailyCheckRigid[]> => {
  const list = getDailyRigidList();
  const normalizedItem: DailyCheckRigid = {
    ...item,
    qaType: item.qaType || 'DAILY_INSPECTION',
  };
  const exists = list.some(r => r.id === item.id);
  const updated = exists ? list.map(r => (r.id === item.id ? normalizedItem : r)) : [normalizedItem, ...list];
  localStorage.setItem(STORAGE_KEYS.DAILY_RIGID, JSON.stringify(updated));

  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hmUnit > unitMatch.currentHm) unitMatch.currentHm = item.hmUnit;
    if (item.status === 'BREAKDOWN') unitMatch.statusUnit = 'BREAKDOWN';
    else if (item.status === 'SCHEDULED_SERVICE') unitMatch.statusUnit = 'MAINTENANCE';
    else unitMatch.statusUnit = 'READY';
    saveCodeUnits(units);
  }

  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteDailyRigid = async (id: string): Promise<DailyCheckRigid[]> => {
  const list = getDailyRigidList();
  const updated = list.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.DAILY_RIGID, JSON.stringify(updated));
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

// -------------------------------------------------------------
// DAILY ARTIC
// -------------------------------------------------------------
export const getDailyArticList = (): DailyCheckArtic[] => {
  ensureStorageInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_ARTIC);
    if (!raw) return [];
    const parsed: DailyCheckArtic[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => ({
      ...item,
      qaType: item.qaType || (item.id.startsWith('DAILY') ? 'DAILY_INSPECTION' : item.id.startsWith('QA7') ? 'QA7_FINAL' : 'QA1_PRE'),
    }));
  } catch {
    return [];
  }
};

export const addDailyArtic = async (item: DailyCheckArtic): Promise<DailyCheckArtic[]> => {
  const list = getDailyArticList();
  const normalizedItem: DailyCheckArtic = {
    ...item,
    qaType: item.qaType || 'DAILY_INSPECTION',
  };
  const updated = [normalizedItem, ...list];
  localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify(updated));

  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hmUnit > unitMatch.currentHm) unitMatch.currentHm = item.hmUnit;
    unitMatch.lastInspectionDate = item.tanggal;
    if (item.status === 'BREAKDOWN') unitMatch.statusUnit = 'BREAKDOWN';
    else if (item.status === 'SCHEDULED_SERVICE') unitMatch.statusUnit = 'MAINTENANCE';
    else unitMatch.statusUnit = 'READY';
    saveCodeUnits(units);
  }

  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateDailyArtic = async (item: DailyCheckArtic): Promise<DailyCheckArtic[]> => {
  const list = getDailyArticList();
  const normalizedItem: DailyCheckArtic = {
    ...item,
    qaType: item.qaType || 'DAILY_INSPECTION',
  };
  const exists = list.some(a => a.id === item.id);
  const updated = exists ? list.map(a => (a.id === item.id ? normalizedItem : a)) : [normalizedItem, ...list];
  localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify(updated));

  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hmUnit > unitMatch.currentHm) unitMatch.currentHm = item.hmUnit;
    if (item.status === 'BREAKDOWN') unitMatch.statusUnit = 'BREAKDOWN';
    else if (item.status === 'SCHEDULED_SERVICE') unitMatch.statusUnit = 'MAINTENANCE';
    else unitMatch.statusUnit = 'READY';
    saveCodeUnits(units);
  }

  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteDailyArtic = async (id: string): Promise<DailyCheckArtic[]> => {
  const list = getDailyArticList();
  const updated = list.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify(updated));
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

// -------------------------------------------------------------
// BACKLOG
// -------------------------------------------------------------
export const getBacklogs = (): BacklogItem[] => {
  ensureStorageInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BACKLOG);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addBacklog = async (item: BacklogItem): Promise<BacklogItem[]> => {
  const list = getBacklogs();
  const updated = [item, ...list];
  localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify(updated));
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateBacklog = async (item: BacklogItem): Promise<BacklogItem[]> => {
  const list = getBacklogs();
  const exists = list.some(b => b.id === item.id);
  const updated = exists ? list.map(b => (b.id === item.id ? item : b)) : [item, ...list];
  localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify(updated));
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateBacklogStatus = (id: string, status: BacklogItem['status']): BacklogItem[] => {
  const list = getBacklogs();
  const updated = list.map(b => (b.id === id ? { ...b, status } : b));
  localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify(updated));
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteBacklog = async (id: string): Promise<BacklogItem[]> => {
  const list = getBacklogs();
  const updated = list.filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify(updated));
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

// -------------------------------------------------------------
// ACTIVITIES
// -------------------------------------------------------------
export const getActivities = (): AddActivityItem[] => {
  ensureStorageInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addActivity = async (item: AddActivityItem): Promise<AddActivityItem[]> => {
  const list = getActivities();
  const updated = [item, ...list];
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateActivity = async (item: AddActivityItem): Promise<AddActivityItem[]> => {
  const list = getActivities();
  const exists = list.some(a => a.id === item.id);
  const updated = exists ? list.map(a => (a.id === item.id ? item : a)) : [item, ...list];
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateActivityStatus = (id: string, status: AddActivityItem['status']): AddActivityItem[] => {
  const list = getActivities();
  const updated = list.map(a => (a.id === id ? { ...a, status } : a));
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteActivity = async (id: string): Promise<AddActivityItem[]> => {
  const list = getActivities();
  const updated = list.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

/**
 * Get connected stats for a specific unit
 */
export const getUnitStats = (codeUnit: string) => {
  const backlogs = getBacklogs().filter(b => b.codeUnit === codeUnit);
  const activeBacklogs = backlogs.filter(b => b.status !== 'CLOSED');
  const activities = getActivities().filter(a => a.codeUnit === codeUnit);
  const baps = getBAPList().filter(b => b.codeUnit === codeUnit);
  const rigidInspections = getDailyRigidList().filter(r => r.codeUnit === codeUnit);
  const articInspections = getDailyArticList().filter(a => a.codeUnit === codeUnit);

  return {
    backlogCount: activeBacklogs.length,
    activityCount: activities.length,
    bapCount: baps.length,
    inspectionCount: rigidInspections.length + articInspections.length,
    recentBacklogs: activeBacklogs.slice(0, 5),
    recentActivities: activities.slice(0, 5),
  };
};
