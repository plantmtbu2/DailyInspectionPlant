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
import {
  saveVaultPhotos,
  deleteVaultPhotos,
  hydrateItemsWithVaultPhotos,
  getVaultPhotos,
} from './photoStorageService';
import { getAppSettings } from './settingsService';

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
let isBackgroundPushActive = false;
let lastLocalMutationAt = 0;

export const markLocalMutation = () => {
  lastLocalMutationAt = Date.now();
};

export const getLastLocalMutationAt = (): number => lastLocalMutationAt;

export const isBackgroundSyncInFlight = (): boolean =>
  isBackgroundPushActive || debouncedSyncTimer !== null;

export const autoSyncToGoogleSheetIfConnected = async () => {
  if (typeof window === 'undefined') return;
  if (!getAppSettings().sync.autoSyncOnSave) return;
  const config = getStoredSheetsConfig();
  if (!config?.spreadsheetId && !config?.webAppUrl) return;

  if (debouncedSyncTimer) {
    clearTimeout(debouncedSyncTimer);
  }

  // Non-blocking background sync (350ms debounce) - ensures UI saves are instant < 5ms
  debouncedSyncTimer = setTimeout(async () => {
    debouncedSyncTimer = null;
    isBackgroundPushActive = true;
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
    } finally {
      isBackgroundPushActive = false;
    }
  }, 350);
};

const safeSetCollection = (key: string, items: any[]) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    // QuotaExceededError fallback: strip heavy inline data:image base64 from localStorage copy;
    // Backlog & Activity photos remain safely stored in IndexedDB Photo Vault.
    try {
      const lightweight = items.map((it: any) => ({
        ...it,
        photoUrl: it?.photoUrl && !String(it.photoUrl).startsWith('data:') ? it.photoUrl : undefined,
        photoUrls: Array.isArray(it?.photoUrls)
          ? it.photoUrls.filter((u: string) => u && !String(u).startsWith('data:'))
          : undefined,
      }));
      localStorage.setItem(key, JSON.stringify(lightweight));
    } catch (innerErr) {
      console.warn(`Gagal menulis ${key} ke localStorage:`, innerErr);
    }
  }
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
    safeSetCollection(STORAGE_KEYS.CODE_UNITS, deduplicateById(data.codeUnits));
  }
  if (data.bapList !== undefined) {
    safeSetCollection(STORAGE_KEYS.BAP, deduplicateById(data.bapList));
  }
  if (data.dailyRigidList !== undefined) {
    const prevRigidMap = new Map(getDailyRigidList().map(r => [r.id, r]));
    const mergedRigid = deduplicateById(data.dailyRigidList).map(r => {
      const prev = prevRigidMap.get(r.id);
      return !r.planningCategory && prev?.planningCategory
        ? { ...r, planningCategory: prev.planningCategory }
        : r;
    });
    safeSetCollection(STORAGE_KEYS.DAILY_RIGID, mergedRigid);
  }
  if (data.dailyArticList !== undefined) {
    const prevArticMap = new Map(getDailyArticList().map(a => [a.id, a]));
    const mergedArtic = deduplicateById(data.dailyArticList).map(a => {
      const prev = prevArticMap.get(a.id);
      return !a.planningCategory && prev?.planningCategory
        ? { ...a, planningCategory: prev.planningCategory }
        : a;
    });
    safeSetCollection(STORAGE_KEYS.DAILY_ARTIC, mergedArtic);
  }
  if (data.backlogs !== undefined) {
    // Ensure any locally saved backlog photos (still in localStorage/vault) are preserved even when Sheet omits >50k cells
    const existingLocalBacklogs = getBacklogs();
    for (const prev of existingLocalBacklogs) {
      const prevPhotos = prev.photoUrls && prev.photoUrls.length > 0 ? prev.photoUrls : prev.photoUrl ? [prev.photoUrl] : [];
      if (prevPhotos.length > 0 && !getVaultPhotos('BACKLOG', prev.id)) {
        void saveVaultPhotos('BACKLOG', prev.id, prevPhotos);
      }
    }
    const hydratedBacklogs = hydrateItemsWithVaultPhotos(
      'BACKLOG',
      deduplicateById(data.backlogs),
      { preserveCleared: true }
    );
    safeSetCollection(STORAGE_KEYS.BACKLOG, hydratedBacklogs);
  }
  if (data.activities !== undefined) {
    // Ensure any locally saved activity photos are preserved even when Sheet omits >50k cells
    const existingLocalActivities = getActivities();
    for (const prev of existingLocalActivities) {
      const prevPhotos = prev.photoUrls && prev.photoUrls.length > 0 ? prev.photoUrls : prev.photoUrl ? [prev.photoUrl] : [];
      if (prevPhotos.length > 0 && !getVaultPhotos('ACTIVITY', prev.id)) {
        void saveVaultPhotos('ACTIVITY', prev.id, prevPhotos);
      }
    }
    const hydratedActivities = hydrateItemsWithVaultPhotos(
      'ACTIVITY',
      deduplicateById(data.activities),
      { preserveCleared: true }
    );
    safeSetCollection(STORAGE_KEYS.ACTIVITIES, hydratedActivities);
  }
};

export const deduplicateById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (item && item.id) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
  }
  return unique;
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
    return Array.isArray(parsed) ? deduplicateById(parsed) : [];
  } catch {
    return [];
  }
};

export const saveCodeUnits = (units: CodeUnit[]) => {
  markLocalMutation();
  localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(deduplicateById(units)));
  if (getStoredSheetsConfig()) {
    syncCodeUnitsToSheet(units);
    autoSyncToGoogleSheetIfConnected();
  }
};

export const addOrUpdateCodeUnit = (unit: CodeUnit) => {
  markLocalMutation();
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
  markLocalMutation();
  const current = getCodeUnits();
  const unitToDelete = current.find(u => u.id === id);
  const updated = current.filter(u => u.id !== id);
  localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(updated));

  if (cascade && unitToDelete) {
    const targetCode = unitToDelete.codeUnit;
    const deletedBacklogs = getBacklogs().filter(b => b.codeUnit === targetCode);
    const deletedActivities = getActivities().filter(a => a.codeUnit === targetCode);
    deletedBacklogs.forEach(b => void deleteVaultPhotos('BACKLOG', b.id));
    deletedActivities.forEach(a => void deleteVaultPhotos('ACTIVITY', a.id));

    const baps = getBAPList().filter(b => b.codeUnit !== targetCode);
    const rigids = getDailyRigidList().filter(r => r.codeUnit !== targetCode);
    const artics = getDailyArticList().filter(a => a.codeUnit !== targetCode);
    const backlogs = getBacklogs().filter(b => b.codeUnit !== targetCode);
    const activities = getActivities().filter(a => a.codeUnit !== targetCode);

    safeSetCollection(STORAGE_KEYS.BAP, baps);
    safeSetCollection(STORAGE_KEYS.DAILY_RIGID, rigids);
    safeSetCollection(STORAGE_KEYS.DAILY_ARTIC, artics);
    safeSetCollection(STORAGE_KEYS.BACKLOG, backlogs);
    safeSetCollection(STORAGE_KEYS.ACTIVITIES, activities);
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
    return Array.isArray(parsed) ? deduplicateById(parsed) : [];
  } catch {
    return [];
  }
};

export const addBAPRecord = async (item: BAPRecord): Promise<BAPRecord[]> => {
  markLocalMutation();
  const list = getBAPList();
  const exists = list.some(b => b.id === item.id);
  const updated = deduplicateById(exists ? list.map(b => (b.id === item.id ? item : b)) : [item, ...list]);
  localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify(updated));

  // Update HM on Master Unit if newer
  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch && item.hm > unitMatch.currentHm) {
    unitMatch.currentHm = item.hm;
    unitMatch.statusUnit = item.status === 'COMPLETED' ? 'READY' : 'BREAKDOWN';
    localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(deduplicateById(units)));
  }

  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateBAPRecord = async (item: BAPRecord): Promise<BAPRecord[]> => {
  markLocalMutation();
  const list = getBAPList();
  const exists = list.some(b => b.id === item.id);
  const updated = deduplicateById(exists ? list.map(b => (b.id === item.id ? item : b)) : [item, ...list]);
  localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify(updated));

  // Update master unit if status changed
  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hm > unitMatch.currentHm) unitMatch.currentHm = item.hm;
    if (item.status === 'COMPLETED') unitMatch.statusUnit = 'READY';
    else if (item.status === 'OPEN') unitMatch.statusUnit = 'BREAKDOWN';
    localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(deduplicateById(units)));
  }

  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteBAPRecord = async (id: string): Promise<BAPRecord[]> => {
  markLocalMutation();
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
    return deduplicateById(parsed.map(item => ({
      ...item,
      qaType: item.qaType || (item.id.startsWith('DAILY') ? 'DAILY_INSPECTION' : item.id.startsWith('QA7') ? 'QA7_FINAL' : 'QA1_PRE'),
    })));
  } catch {
    return [];
  }
};

export const addDailyRigid = async (item: DailyCheckRigid): Promise<DailyCheckRigid[]> => {
  markLocalMutation();
  const list = getDailyRigidList();
  const normalizedItem: DailyCheckRigid = {
    ...item,
    qaType: item.qaType || 'DAILY_INSPECTION',
  };
  const exists = list.some(r => r.id === item.id);
  const updated = deduplicateById(exists ? list.map(r => (r.id === item.id ? normalizedItem : r)) : [normalizedItem, ...list]);
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
    localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(deduplicateById(units)));
  }

  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateDailyRigid = async (item: DailyCheckRigid): Promise<DailyCheckRigid[]> => {
  markLocalMutation();
  const list = getDailyRigidList();
  const normalizedItem: DailyCheckRigid = {
    ...item,
    qaType: item.qaType || 'DAILY_INSPECTION',
  };
  const exists = list.some(r => r.id === item.id);
  const updated = deduplicateById(exists ? list.map(r => (r.id === item.id ? normalizedItem : r)) : [normalizedItem, ...list]);
  localStorage.setItem(STORAGE_KEYS.DAILY_RIGID, JSON.stringify(updated));

  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hmUnit > unitMatch.currentHm) unitMatch.currentHm = item.hmUnit;
    if (item.status === 'BREAKDOWN') unitMatch.statusUnit = 'BREAKDOWN';
    else if (item.status === 'SCHEDULED_SERVICE') unitMatch.statusUnit = 'MAINTENANCE';
    else unitMatch.statusUnit = 'READY';
    localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(deduplicateById(units)));
  }

  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteDailyRigid = async (id: string): Promise<DailyCheckRigid[]> => {
  markLocalMutation();
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
    return deduplicateById(parsed.map(item => ({
      ...item,
      qaType: item.qaType || (item.id.startsWith('DAILY') ? 'DAILY_INSPECTION' : item.id.startsWith('QA7') ? 'QA7_FINAL' : 'QA1_PRE'),
    })));
  } catch {
    return [];
  }
};

export const addDailyArtic = async (item: DailyCheckArtic): Promise<DailyCheckArtic[]> => {
  markLocalMutation();
  const list = getDailyArticList();
  const normalizedItem: DailyCheckArtic = {
    ...item,
    qaType: item.qaType || 'DAILY_INSPECTION',
  };
  const exists = list.some(a => a.id === item.id);
  const updated = deduplicateById(exists ? list.map(a => (a.id === item.id ? normalizedItem : a)) : [normalizedItem, ...list]);
  localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify(updated));

  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hmUnit > unitMatch.currentHm) unitMatch.currentHm = item.hmUnit;
    unitMatch.lastInspectionDate = item.tanggal;
    if (item.status === 'BREAKDOWN') unitMatch.statusUnit = 'BREAKDOWN';
    else if (item.status === 'SCHEDULED_SERVICE') unitMatch.statusUnit = 'MAINTENANCE';
    else unitMatch.statusUnit = 'READY';
    localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(deduplicateById(units)));
  }

  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateDailyArtic = async (item: DailyCheckArtic): Promise<DailyCheckArtic[]> => {
  markLocalMutation();
  const list = getDailyArticList();
  const normalizedItem: DailyCheckArtic = {
    ...item,
    qaType: item.qaType || 'DAILY_INSPECTION',
  };
  const exists = list.some(a => a.id === item.id);
  const updated = deduplicateById(exists ? list.map(a => (a.id === item.id ? normalizedItem : a)) : [normalizedItem, ...list]);
  localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify(updated));

  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hmUnit > unitMatch.currentHm) unitMatch.currentHm = item.hmUnit;
    if (item.status === 'BREAKDOWN') unitMatch.statusUnit = 'BREAKDOWN';
    else if (item.status === 'SCHEDULED_SERVICE') unitMatch.statusUnit = 'MAINTENANCE';
    else unitMatch.statusUnit = 'READY';
    localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(deduplicateById(units)));
  }

  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteDailyArtic = async (id: string): Promise<DailyCheckArtic[]> => {
  markLocalMutation();
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
    if (!Array.isArray(parsed)) return [];
    return hydrateItemsWithVaultPhotos('BACKLOG', deduplicateById(parsed), { preserveCleared: true });
  } catch {
    return [];
  }
};

export const addBacklog = async (item: BacklogItem): Promise<BacklogItem[]> => {
  markLocalMutation();
  const normalizedPhotos = (
    item.photoUrls && item.photoUrls.length > 0
      ? item.photoUrls
      : item.photoUrl
      ? [item.photoUrl]
      : []
  ).filter(Boolean);

  await saveVaultPhotos('BACKLOG', item.id, normalizedPhotos);

  const normalizedItem: BacklogItem = {
    ...item,
    photoUrls: normalizedPhotos,
    photoUrl: normalizedPhotos.length > 0 ? normalizedPhotos[0] : undefined,
  };

  const list = getBacklogs();
  const exists = list.some(b => b.id === normalizedItem.id);
  const updated = deduplicateById(
    exists ? list.map(b => (b.id === normalizedItem.id ? normalizedItem : b)) : [normalizedItem, ...list]
  );
  safeSetCollection(STORAGE_KEYS.BACKLOG, updated);
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateBacklog = async (item: BacklogItem): Promise<BacklogItem[]> => {
  markLocalMutation();
  const normalizedPhotos = (
    item.photoUrls && item.photoUrls.length > 0
      ? item.photoUrls
      : item.photoUrl
      ? [item.photoUrl]
      : []
  ).filter(Boolean);

  await saveVaultPhotos('BACKLOG', item.id, normalizedPhotos);

  const normalizedItem: BacklogItem = {
    ...item,
    photoUrls: normalizedPhotos,
    photoUrl: normalizedPhotos.length > 0 ? normalizedPhotos[0] : undefined,
  };

  const list = getBacklogs();
  const exists = list.some(b => b.id === normalizedItem.id);
  const updated = deduplicateById(
    exists ? list.map(b => (b.id === normalizedItem.id ? normalizedItem : b)) : [normalizedItem, ...list]
  );
  safeSetCollection(STORAGE_KEYS.BACKLOG, updated);
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateBacklogStatus = (id: string, status: BacklogItem['status']): BacklogItem[] => {
  markLocalMutation();
  const list = getBacklogs();
  const updated = list.map(b => (b.id === id ? { ...b, status } : b));
  safeSetCollection(STORAGE_KEYS.BACKLOG, updated);
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteBacklog = async (id: string): Promise<BacklogItem[]> => {
  markLocalMutation();
  await deleteVaultPhotos('BACKLOG', id);
  const list = getBacklogs();
  const updated = list.filter(b => b.id !== id);
  safeSetCollection(STORAGE_KEYS.BACKLOG, updated);
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
    if (!Array.isArray(parsed)) return [];
    return hydrateItemsWithVaultPhotos('ACTIVITY', deduplicateById(parsed), { preserveCleared: true });
  } catch {
    return [];
  }
};

export const addActivity = async (item: AddActivityItem): Promise<AddActivityItem[]> => {
  markLocalMutation();
  const normalizedPhotos = (
    item.photoUrls && item.photoUrls.length > 0
      ? item.photoUrls
      : item.photoUrl
      ? [item.photoUrl]
      : []
  ).filter(Boolean);

  await saveVaultPhotos('ACTIVITY', item.id, normalizedPhotos);

  const normalizedItem: AddActivityItem = {
    ...item,
    photoUrls: normalizedPhotos,
    photoUrl: normalizedPhotos.length > 0 ? normalizedPhotos[0] : undefined,
  };

  const list = getActivities();
  const exists = list.some(a => a.id === normalizedItem.id);
  const updated = deduplicateById(
    exists ? list.map(a => (a.id === normalizedItem.id ? normalizedItem : a)) : [normalizedItem, ...list]
  );
  safeSetCollection(STORAGE_KEYS.ACTIVITIES, updated);
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateActivity = async (item: AddActivityItem): Promise<AddActivityItem[]> => {
  markLocalMutation();
  const normalizedPhotos = (
    item.photoUrls && item.photoUrls.length > 0
      ? item.photoUrls
      : item.photoUrl
      ? [item.photoUrl]
      : []
  ).filter(Boolean);

  await saveVaultPhotos('ACTIVITY', item.id, normalizedPhotos);

  const normalizedItem: AddActivityItem = {
    ...item,
    photoUrls: normalizedPhotos,
    photoUrl: normalizedPhotos.length > 0 ? normalizedPhotos[0] : undefined,
  };

  const list = getActivities();
  const exists = list.some(a => a.id === normalizedItem.id);
  const updated = deduplicateById(
    exists ? list.map(a => (a.id === normalizedItem.id ? normalizedItem : a)) : [normalizedItem, ...list]
  );
  safeSetCollection(STORAGE_KEYS.ACTIVITIES, updated);
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateActivityStatus = (id: string, status: AddActivityItem['status']): AddActivityItem[] => {
  markLocalMutation();
  const list = getActivities();
  const updated = list.map(a => (a.id === id ? { ...a, status } : a));
  safeSetCollection(STORAGE_KEYS.ACTIVITIES, updated);
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteActivity = async (id: string): Promise<AddActivityItem[]> => {
  markLocalMutation();
  await deleteVaultPhotos('ACTIVITY', id);
  const list = getActivities();
  const updated = list.filter(a => a.id !== id);
  safeSetCollection(STORAGE_KEYS.ACTIVITIES, updated);
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
