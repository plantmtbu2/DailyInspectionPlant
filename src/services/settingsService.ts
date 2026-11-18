import {
  RIGID_CHECKLIST_ITEMS,
  ARTIC_CHECKLIST_ITEMS,
  ChecklistDefinition,
} from '../constants/checklists';
import { AddActivityItem, BacklogItem, BAPRecord, CodeUnit } from '../types';

export type AppModuleId =
  | 'dashboard'
  | 'daily-rigid'
  | 'daily-artic'
  | 'qa1-rigid'
  | 'qa7-rigid'
  | 'qa1-artic'
  | 'qa7-artic'
  | 'backlog'
  | 'activities'
  | 'bap'
  | 'units';

export interface ModuleControlConfig {
  id: AppModuleId;
  label: string;
  description: string;
  enabled: boolean;
  userCanCreate: boolean;
  userCanEdit: boolean;
  userCanDelete: boolean;
  userCanExport: boolean;
}

export interface ChecklistParameterConfig extends ChecklistDefinition {
  enabled: boolean;
}

export type AppFontFamilyId =
  | 'DEFAULT'
  | 'INTER'
  | 'PLUS_JAKARTA'
  | 'ROBOTO'
  | 'POPPINS'
  | 'IBM_PLEX'
  | 'SPACE_GROTESK'
  | 'JETBRAINS_MONO'
  | 'SYSTEM';

export interface FontOptionInfo {
  id: AppFontFamilyId;
  label: string;
  category: string;
  cssStack: string;
  description: string;
}

export const APP_FONT_OPTIONS: FontOptionInfo[] = [
  {
    id: 'DEFAULT',
    label: 'Default Sistem (Syne + Inter + Mono)',
    category: 'Default',
    cssStack: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    description: 'Kombinasi standar aplikasi (Syne judul, Inter teks, JetBrains Mono angka)',
  },
  {
    id: 'INTER',
    label: 'Inter',
    category: 'Sans-Serif Modern',
    cssStack: "'Inter', sans-serif",
    description: 'Sangat rapi, tajam, dan nyaman dibaca di layar HP maupun desktop',
  },
  {
    id: 'PLUS_JAKARTA',
    label: 'Plus Jakarta Sans',
    category: 'Geometric UI',
    cssStack: "'Plus Jakarta Sans', sans-serif",
    description: 'Bersih, modern, dan proporsional untuk dashboard & tabel operasional',
  },
  {
    id: 'ROBOTO',
    label: 'Roboto',
    category: 'Industrial / Android',
    cssStack: "'Roboto', sans-serif",
    description: 'Font standar industrial Android yang lugas dan familiar',
  },
  {
    id: 'POPPINS',
    label: 'Poppins',
    category: 'Geometric Rounded',
    cssStack: "'Poppins', sans-serif",
    description: 'Karakter huruf bulat yang tegas, ramah mata, dan jelas dibaca',
  },
  {
    id: 'IBM_PLEX',
    label: 'IBM Plex Sans',
    category: 'Enterprise Engineering',
    cssStack: "'IBM Plex Sans', sans-serif",
    description: 'Font teknis enterprise dengan keterbacaan angka dan kode yang tinggi',
  },
  {
    id: 'SPACE_GROTESK',
    label: 'Space Grotesk',
    category: 'Technical Display',
    cssStack: "'Space Grotesk', sans-serif",
    description: 'Nuansa teknik & alat berat yang tegas dan khas',
  },
  {
    id: 'JETBRAINS_MONO',
    label: 'JetBrains Mono',
    category: 'Monospace',
    cssStack: "'JetBrains Mono', monospace",
    description: 'Lebar karakter seragam — ideal untuk pembacaan kode unit & HM',
  },
  {
    id: 'SYSTEM',
    label: 'System UI (Bawaan Perangkat)',
    category: 'Native OS',
    cssStack: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    description: 'Mengikuti font sistem operasi Android / Windows / iOS',
  },
];

export interface AppSettings {
  modules: Record<AppModuleId, ModuleControlConfig>;
  general: {
    appBrandPrefix: string;
    appBrandAccent: string;
    appSubtitle: string;
    siteName: string;
    companyName: string;
    defaultLandingTab: AppModuleId;
    showNavBadges: boolean;
  };
  appearance: {
    fontFamily: AppFontFamilyId;
    baseFontSizePx: number;
    applyFontGlobally: boolean;
  };
  inspection: {
    rigidUnitPrefixes: string[];
    articUnitPrefixes: string[];
    requireValidator: boolean;
    rigidChecklist: ChecklistParameterConfig[];
    articChecklist: ChecklistParameterConfig[];
  };
  operations: {
    backlogEnableAutoPrefix: boolean;
    backlogAutoPrefixText: string;
    defaultBacklogStatus: BacklogItem['status'];
    defaultActivityStatus: AddActivityItem['status'];
    defaultBapStatus: BAPRecord['status'];
    defaultUnitStatus: CodeUnit['statusUnit'];
    requireBapMo: boolean;
  };
  dashboard: {
    defaultPeriod: 'HARIAN' | 'BULANAN' | 'TAHUNAN';
    targetDailyCoveragePct: number;
  };
  reporting: {
    whatsappHeaderNote: string;
    whatsappFooterSignature: string;
    pdfReportSubtitle: string;
  };
  sync: {
    autoSyncOnStartup: boolean;
    autoSyncOnSave: boolean;
    pollingIntervalSeconds: number;
  };
  updatedAt?: string;
}

const SETTINGS_STORAGE_KEY = 'fleetcheck_app_settings_v1';

export const APP_MODULE_ORDER: AppModuleId[] = [
  'dashboard',
  'daily-rigid',
  'daily-artic',
  'qa1-rigid',
  'qa7-rigid',
  'qa1-artic',
  'qa7-artic',
  'backlog',
  'activities',
  'bap',
  'units',
];

export const buildDefaultModulesConfig = (): Record<AppModuleId, ModuleControlConfig> => ({
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard Pencapaian',
    description: 'Monitoring pencapaian Daily, QA 1/QA 7, BAP, Backlog, Add Activity & Rangkuman Unit',
    enabled: true,
    userCanCreate: true,
    userCanEdit: true,
    userCanDelete: true,
    userCanExport: true,
  },
  'daily-rigid': {
    id: 'daily-rigid',
    label: 'Daily Rigid',
    description: 'Inspeksi harian 19 parameter unit Rigid Dump Truck',
    enabled: true,
    userCanCreate: true,
    userCanEdit: true,
    userCanDelete: true,
    userCanExport: true,
  },
  'daily-artic': {
    id: 'daily-artic',
    label: 'Daily Artic',
    description: 'Inspeksi harian 36 parameter unit Articulated, Grader, Compactor & Loader',
    enabled: true,
    userCanCreate: true,
    userCanEdit: true,
    userCanDelete: true,
    userCanExport: true,
  },
  'qa1-rigid': {
    id: 'qa1-rigid',
    label: 'QA 1 Pre Rigid',
    description: 'QA 1 Pre Inspection sebelum servis/shift unit Rigid',
    enabled: true,
    userCanCreate: true,
    userCanEdit: true,
    userCanDelete: true,
    userCanExport: true,
  },
  'qa7-rigid': {
    id: 'qa7-rigid',
    label: 'QA 7 Final Rigid',
    description: 'QA 7 Final Validation setelah servis/rilis operasi unit Rigid',
    enabled: true,
    userCanCreate: true,
    userCanEdit: true,
    userCanDelete: true,
    userCanExport: true,
  },
  'qa1-artic': {
    id: 'qa1-artic',
    label: 'QA 1 Pre Artic',
    description: 'QA 1 Pre Inspection sebelum servis/shift unit Articulated & Support',
    enabled: true,
    userCanCreate: true,
    userCanEdit: true,
    userCanDelete: true,
    userCanExport: true,
  },
  'qa7-artic': {
    id: 'qa7-artic',
    label: 'QA 7 Final Artic',
    description: 'QA 7 Final Validation setelah servis/rilis operasi unit Articulated & Support',
    enabled: true,
    userCanCreate: true,
    userCanEdit: true,
    userCanDelete: true,
    userCanExport: true,
  },
  backlog: {
    id: 'backlog',
    label: 'Backlog',
    description: 'Pengelolaan temuan sparepart rusak, reservasi part & progress instalasi',
    enabled: true,
    userCanCreate: true,
    userCanEdit: true,
    userCanDelete: true,
    userCanExport: true,
  },
  activities: {
    id: 'activities',
    label: 'Activities',
    description: 'Pencatatan aktivitas servis langsung & tindakan perbaikan mekanik',
    enabled: true,
    userCanCreate: true,
    userCanEdit: true,
    userCanDelete: true,
    userCanExport: true,
  },
  bap: {
    id: 'bap',
    label: 'BAP',
    description: 'Berita Acara Pemeriksaan / Kerusakan alat berat & MO pekerjaan',
    enabled: true,
    userCanCreate: true,
    userCanEdit: true,
    userCanDelete: true,
    userCanExport: true,
  },
  units: {
    id: 'units',
    label: 'Code Unit',
    description: 'Database master Code Unit, HM, EGI, lokasi PIT & status kesiapan unit',
    enabled: true,
    userCanCreate: true,
    userCanEdit: true,
    userCanDelete: true,
    userCanExport: true,
  },
});

export const getDefaultAppSettings = (): AppSettings => ({
  modules: buildDefaultModulesConfig(),
  general: {
    appBrandPrefix: 'PLANT',
    appBrandAccent: '2',
    appSubtitle: 'Heavy Equipment Systems',
    siteName: 'MTBU SITE',
    companyName: 'PT PAMAPERSADA NUSANTARA',
    defaultLandingTab: 'daily-rigid',
    showNavBadges: true,
  },
  appearance: {
    fontFamily: 'DEFAULT',
    baseFontSizePx: 16,
    applyFontGlobally: true,
  },
  inspection: {
    rigidUnitPrefixes: ['DT'],
    articUnitPrefixes: ['GR', 'CP', 'WL'],
    requireValidator: false,
    rigidChecklist: RIGID_CHECKLIST_ITEMS.map(item => ({ ...item, enabled: true })),
    articChecklist: ARTIC_CHECKLIST_ITEMS.map(item => ({ ...item, enabled: true })),
  },
  operations: {
    backlogEnableAutoPrefix: true,
    backlogAutoPrefixText: 'BCS',
    defaultBacklogStatus: 'WAITING_PART',
    defaultActivityStatus: 'DONE',
    defaultBapStatus: 'OPEN',
    defaultUnitStatus: 'READY',
    requireBapMo: false,
  },
  dashboard: {
    defaultPeriod: 'HARIAN',
    targetDailyCoveragePct: 100,
  },
  reporting: {
    whatsappHeaderNote: '',
    whatsappFooterSignature: '',
    pdfReportSubtitle: 'PLANT 2 • SITE MTBU • HEAVY EQUIPMENT MAINTENANCE SYSTEM',
  },
  sync: {
    autoSyncOnStartup: true,
    autoSyncOnSave: true,
    pollingIntervalSeconds: 30,
  },
});

const mergeWithDefaults = (raw: Partial<AppSettings> | null | undefined): AppSettings => {
  const defaults = getDefaultAppSettings();
  if (!raw || typeof raw !== 'object') return defaults;

  const mergedModules = { ...defaults.modules };
  if (raw.modules && typeof raw.modules === 'object') {
    for (const id of APP_MODULE_ORDER) {
      if (raw.modules[id]) {
        mergedModules[id] = {
          ...defaults.modules[id],
          ...raw.modules[id],
          id,
        };
      }
    }
  }

  return {
    modules: mergedModules,
    general: { ...defaults.general, ...(raw.general || {}) },
    appearance: {
      ...defaults.appearance,
      ...(raw.appearance || {}),
      baseFontSizePx: Math.max(12, Math.min(22, Number(raw.appearance?.baseFontSizePx) || defaults.appearance.baseFontSizePx)),
    },
    inspection: {
      ...defaults.inspection,
      ...(raw.inspection || {}),
      rigidUnitPrefixes:
        Array.isArray(raw.inspection?.rigidUnitPrefixes) && raw.inspection.rigidUnitPrefixes.length > 0
          ? raw.inspection.rigidUnitPrefixes
          : defaults.inspection.rigidUnitPrefixes,
      articUnitPrefixes:
        Array.isArray(raw.inspection?.articUnitPrefixes) && raw.inspection.articUnitPrefixes.length > 0
          ? raw.inspection.articUnitPrefixes
          : defaults.inspection.articUnitPrefixes,
      rigidChecklist:
        Array.isArray(raw.inspection?.rigidChecklist) && raw.inspection.rigidChecklist.length > 0
          ? raw.inspection.rigidChecklist
          : defaults.inspection.rigidChecklist,
      articChecklist:
        Array.isArray(raw.inspection?.articChecklist) && raw.inspection.articChecklist.length > 0
          ? raw.inspection.articChecklist
          : defaults.inspection.articChecklist,
    },
    operations: { ...defaults.operations, ...(raw.operations || {}) },
    dashboard: { ...defaults.dashboard, ...(raw.dashboard || {}) },
    reporting: { ...defaults.reporting, ...(raw.reporting || {}) },
    sync: { ...defaults.sync, ...(raw.sync || {}) },
    updatedAt: raw.updatedAt,
  };
};

type SettingsListener = (settings: AppSettings) => void;
const listeners = new Set<SettingsListener>();

export const subscribeAppSettings = (listener: SettingsListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = (settings: AppSettings) => {
  listeners.forEach(fn => {
    try {
      fn(settings);
    } catch {
      // Ignore listener error
    }
  });
};

export const getAppSettings = (): AppSettings => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return getDefaultAppSettings();
  }
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return getDefaultAppSettings();
    const parsed = JSON.parse(raw);
    return mergeWithDefaults(parsed);
  } catch {
    return getDefaultAppSettings();
  }
};

export const applyAppearanceToDocument = (appearance?: AppSettings['appearance']) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const defaults = getDefaultAppSettings().appearance;
  const cfg = appearance || defaults;

  const px = Math.max(12, Math.min(22, Number(cfg.baseFontSizePx) || defaults.baseFontSizePx));
  root.style.fontSize = `${px}px`;

  const foundFont = APP_FONT_OPTIONS.find(f => f.id === cfg.fontFamily) || APP_FONT_OPTIONS[0];
  root.style.setProperty('--app-font-sans', foundFont.cssStack);

  if (cfg.fontFamily !== 'DEFAULT' && cfg.applyFontGlobally !== false) {
    root.style.setProperty('--app-font-display', foundFont.cssStack);
    root.style.setProperty('--app-font-mono', foundFont.cssStack);
  } else {
    root.style.setProperty('--app-font-display', "'Syne', sans-serif");
    root.style.setProperty('--app-font-mono', "'JetBrains Mono', monospace");
  }
};

export const saveAppSettings = (nextSettings: AppSettings): AppSettings => {
  const normalized = mergeWithDefaults({
    ...nextSettings,
    updatedAt: new Date().toISOString(),
  });
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    } catch (e) {
      console.warn('Gagal menyimpan pengaturan ke localStorage:', e);
    }
  }
  applyAppearanceToDocument(normalized.appearance);
  notifyListeners(normalized);
  return normalized;
};

export const resetAppSettings = (): AppSettings => {
  const defaults = getDefaultAppSettings();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  applyAppearanceToDocument(defaults.appearance);
  notifyListeners(defaults);
  return defaults;
};

export const getActiveRigidChecklistItems = (): ChecklistDefinition[] => {
  const list = getAppSettings().inspection.rigidChecklist || [];
  const enabled = list.filter(i => i.enabled !== false);
  return enabled.length > 0 ? enabled : RIGID_CHECKLIST_ITEMS;
};

export const getActiveArticChecklistItems = (): ChecklistDefinition[] => {
  const list = getAppSettings().inspection.articChecklist || [];
  const enabled = list.filter(i => i.enabled !== false);
  return enabled.length > 0 ? enabled : ARTIC_CHECKLIST_ITEMS;
};
