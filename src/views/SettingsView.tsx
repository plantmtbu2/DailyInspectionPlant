import React, { useState, useRef } from 'react';
import {
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Layers,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Plus,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  FileSpreadsheet,
  KeyRound,
  MessageSquare,
  BarChart3,
  Wrench,
  Truck,
  Database,
  Save,
  AlertTriangle,
  Users,
  Eye,
  EyeOff,
  ClipboardCheck,
  Type,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import {
  APP_MODULE_ORDER,
  APP_FONT_OPTIONS,
  AppFontFamilyId,
  AppModuleId,
  AppSettings,
  ChecklistParameterConfig,
  getDefaultAppSettings,
} from '../services/settingsService';
import { RIGID_CHECKLIST_ITEMS, ARTIC_CHECKLIST_ITEMS } from '../constants/checklists';
import {
  CodeUnit,
  BAPRecord,
  DailyCheckRigid,
  DailyCheckArtic,
  BacklogItem,
  AddActivityItem,
  GoogleSheetsConfig,
} from '../types';
import {
  SavedWhatsAppGroup,
  getStoredWhatsAppGroups,
  saveWhatsAppGroups,
  normalizeWhatsAppGroupLink,
} from '../utils/whatsappFormatter';
import {
  replaceEntireDataset,
  getCodeUnits,
  getBAPList,
  getDailyRigidList,
  getDailyArticList,
  getBacklogs,
  getActivities,
} from '../services/storageService';
import { logCurrentUserActivity } from '../services/userActivityLogService';

type SettingsSectionTab = 'modules' | 'inspection' | 'operations' | 'reporting' | 'system';

interface SettingsViewProps {
  codeUnits: CodeUnit[];
  bapList: BAPRecord[];
  dailyRigidList: DailyCheckRigid[];
  dailyArticList: DailyCheckArtic[];
  backlogs: BacklogItem[];
  activities: AddActivityItem[];
  sheetsConfig: GoogleSheetsConfig | null;
  onOpenSheetsModal: () => void;
  onPullData: () => void;
  onPushData: () => void;
  isSyncing: boolean;
  onDatasetReloaded: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateBack?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  codeUnits,
  bapList,
  dailyRigidList,
  dailyArticList,
  backlogs,
  activities,
  sheetsConfig,
  onOpenSheetsModal,
  onPullData,
  onPushData,
  isSyncing,
  onDatasetReloaded,
  onShowToast,
  onNavigateBack,
}) => {
  const { isAdmin, changeAdminPassword, resetAdminPassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, updateModuleConfig, resetAllSettings } = useSettings();

  const [activeSection, setActiveSection] = useState<SettingsSectionTab>('modules');

  // Prefix inputs for Inspection tab
  const [rigidPrefixesText, setRigidPrefixesText] = useState(
    settings.inspection.rigidUnitPrefixes.join(', ')
  );
  const [articPrefixesText, setArticPrefixesText] = useState(
    settings.inspection.articUnitPrefixes.join(', ')
  );
  const [checklistTab, setChecklistTab] = useState<'RIGID' | 'ARTIC'>('RIGID');
  const [newParamName, setNewParamName] = useState('');
  const [newParamType, setNewParamType] = useState<'status' | 'measurement'>('status');
  const [newParamUnit, setNewParamUnit] = useState('');

  // WhatsApp Group Management in Reporting tab
  const [waGroups, setWaGroups] = useState<SavedWhatsAppGroup[]>(() => getStoredWhatsAppGroups());
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupLink, setNewGroupLink] = useState('');

  // Group Leader defaults (shared with PrintReportModal localStorage keys)
  const [glDefaultName, setGlDefaultName] = useState(() => {
    try {
      return localStorage.getItem('plant2_GroupLeader_name') || '';
    } catch {
      return '';
    }
  });
  const [glDefaultPhone, setGlDefaultPhone] = useState(() => {
    try {
      return localStorage.getItem('plant2_GroupLeader_phone') || '';
    } catch {
      return '';
    }
  });

  // Admin password change
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPassFields, setShowPassFields] = useState(false);

  // Confirm reset dialog inside Settings
  const [confirmResetModal, setConfirmResetModal] = useState<'NONE' | 'SETTINGS' | 'CHECKLIST'>('NONE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Strict Component-Level Admin Guard
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-[#18181b] border border-[#fb7185]/40 rounded-lg p-6 text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-[#fb7185]/15 border border-[#fb7185]/30 flex items-center justify-center mx-auto text-[#fb7185]">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-syne font-extrabold text-lg uppercase text-[#f2efeb]">
            AKSES DITOLAK — KHUSUS ADMIN
          </h2>
          <p className="text-xs font-mono text-[rgba(242,239,235,0.65)] leading-relaxed">
            Modul SETTINGS hanya dapat diakses oleh Administrator untuk mengatur konfigurasi seluruh modul aplikasi, hak akses pengguna, parameter checklist, dan sinkronisasi database.
          </p>
        </div>
        {onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className="px-4 py-2 rounded bg-[#facc15] hover:bg-[#fde047] text-[#111113] font-mono font-bold text-xs uppercase tracking-wider transition"
          >
            Kembali ke Modul Operasional
          </button>
        )}
      </div>
    );
  }

  const updateGeneral = (patch: Partial<AppSettings['general']>) => {
    updateSettings(prev => ({
      ...prev,
      general: { ...prev.general, ...patch },
    }));
  };

  const updateAppearance = (patch: Partial<AppSettings['appearance']>) => {
    updateSettings(prev => ({
      ...prev,
      appearance: { ...prev.appearance, ...patch },
    }));
  };

  const updateInspection = (patch: Partial<AppSettings['inspection']>) => {
    updateSettings(prev => ({
      ...prev,
      inspection: { ...prev.inspection, ...patch },
    }));
  };

  const updateOperations = (patch: Partial<AppSettings['operations']>) => {
    updateSettings(prev => ({
      ...prev,
      operations: { ...prev.operations, ...patch },
    }));
  };

  const updateDashboard = (patch: Partial<AppSettings['dashboard']>) => {
    updateSettings(prev => ({
      ...prev,
      dashboard: { ...prev.dashboard, ...patch },
    }));
  };

  const updateReporting = (patch: Partial<AppSettings['reporting']>) => {
    updateSettings(prev => ({
      ...prev,
      reporting: { ...prev.reporting, ...patch },
    }));
  };

  const updateSync = (patch: Partial<AppSettings['sync']>) => {
    updateSettings(prev => ({
      ...prev,
      sync: { ...prev.sync, ...patch },
    }));
  };

  // Module Presets
  const applyModulePreset = (preset: 'ALL_ACTIVE' | 'USER_READONLY' | 'LOCK_USER_DELETE' | 'RESET') => {
    const defaults = getDefaultAppSettings().modules;
    if (preset === 'RESET' || preset === 'ALL_ACTIVE') {
      updateSettings(prev => ({ ...prev, modules: defaults }));
      logCurrentUserActivity({
        actionType: 'SETTINGS',
        module: 'Settings',
        description:
          preset === 'RESET'
            ? 'Reset hak akses modul ke standar default'
            : 'Aktifkan penuh seluruh 11 modul aplikasi',
      });
      onShowToast(
        preset === 'RESET'
          ? 'Konfigurasi seluruh modul dikembalikan ke standar default.'
          : 'Seluruh 11 modul aplikasi diaktifkan penuh.',
        'success'
      );
      return;
    }

    if (preset === 'USER_READONLY') {
      updateSettings(prev => {
        const next = { ...prev.modules };
        for (const id of APP_MODULE_ORDER) {
          next[id] = {
            ...next[id],
            enabled: true,
            userCanCreate: false,
            userCanEdit: false,
            userCanDelete: false,
            userCanExport: true,
          };
        }
        return { ...prev, modules: next };
      });
      logCurrentUserActivity({
        actionType: 'SETTINGS',
        module: 'Settings',
        description: 'Terapkan preset Mode Read-Only User pada semua modul',
      });
      onShowToast('Mode Read-Only User aktif: User hanya dapat melihat & export data.', 'info');
      return;
    }

    if (preset === 'LOCK_USER_DELETE') {
      updateSettings(prev => {
        const next = { ...prev.modules };
        for (const id of APP_MODULE_ORDER) {
          next[id] = {
            ...next[id],
            userCanDelete: false,
          };
        }
        return { ...prev, modules: next };
      });
      logCurrentUserActivity({
        actionType: 'SETTINGS',
        module: 'Settings',
        description: 'Kunci izin Hapus Data bagi User pada semua modul',
      });
      onShowToast('Hapus Data dikunci untuk User Operasional di semua modul.', 'info');
    }
  };

  const handleSavePrefixes = () => {
    const parseList = (raw: string, fallback: string[]) => {
      const items = raw
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      return items.length > 0 ? Array.from(new Set(items)) : fallback;
    };
    const nextRigid = parseList(rigidPrefixesText, ['DT']);
    const nextArtic = parseList(articPrefixesText, ['GR', 'CP', 'WL']);
    setRigidPrefixesText(nextRigid.join(', '));
    setArticPrefixesText(nextArtic.join(', '));
    updateInspection({
      rigidUnitPrefixes: nextRigid,
      articUnitPrefixes: nextArtic,
    });
    onShowToast(
      `Filter prefix armada diperbarui (Rigid: ${nextRigid.join(', ')} | Artic: ${nextArtic.join(', ')})`,
      'success'
    );
  };

  const activeChecklistList =
    checklistTab === 'RIGID' ? settings.inspection.rigidChecklist : settings.inspection.articChecklist;

  const updateChecklistItem = (
    target: 'RIGID' | 'ARTIC',
    id: string,
    patch: Partial<ChecklistParameterConfig>
  ) => {
    const key = target === 'RIGID' ? 'rigidChecklist' : 'articChecklist';
    const current = settings.inspection[key];
    updateInspection({
      [key]: current.map(it => (it.id === id ? { ...it, ...patch } : it)),
    });
  };

  const handleAddChecklistParam = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newParamName.trim();
    if (!clean) return;
    const key = checklistTab === 'RIGID' ? 'rigidChecklist' : 'articChecklist';
    const current = settings.inspection[key];
    const nextNumber = current.length + 1;
    const formattedName = /^\d+\./.test(clean) ? clean : `${nextNumber}. ${clean}`;
    const newParam: ChecklistParameterConfig = {
      id: `${checklistTab === 'RIGID' ? 'rig' : 'art'}_custom_${Date.now()}`,
      name: formattedName,
      type: newParamType,
      unit: newParamType === 'measurement' ? newParamUnit.trim() || 'unit' : undefined,
      placeholder: newParamType === 'measurement' ? 'Masukkan hasil ukur' : undefined,
      enabled: true,
    };
    updateInspection({
      [key]: [...current, newParam],
    });
    setNewParamName('');
    setNewParamUnit('');
    onShowToast(`Parameter "${formattedName}" ditambahkan ke Checklist ${checklistTab}.`, 'success');
  };

  const handleResetChecklistToDefault = () => {
    updateInspection({
      rigidChecklist: RIGID_CHECKLIST_ITEMS.map(item => ({ ...item, enabled: true })),
      articChecklist: ARTIC_CHECKLIST_ITEMS.map(item => ({ ...item, enabled: true })),
    });
    setConfirmResetModal('NONE');
    onShowToast('Seluruh parameter checklist Rigid (19) & Artic (36) dikembalikan ke standar QA7.', 'success');
  };

  const handleAddWaGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    const link = normalizeWhatsAppGroupLink(newGroupLink);
    if (!name || !link.includes('chat.whatsapp.com/')) {
      onShowToast('Masukkan Nama Group dan Link Invite WhatsApp yang valid (https://chat.whatsapp.com/...).', 'error');
      return;
    }
    const next = [...waGroups, { id: `wag-${Date.now()}`, name, inviteLink: link }];
    setWaGroups(next);
    saveWhatsAppGroups(next);
    setNewGroupName('');
    setNewGroupLink('');
    onShowToast(`Group WA "${name}" berhasil ditambahkan!`, 'success');
  };

  const handleDeleteWaGroup = (id: string) => {
    const next = waGroups.filter(g => g.id !== id);
    setWaGroups(next);
    saveWhatsAppGroups(next);
    onShowToast('Group WhatsApp tersimpan dihapus.', 'info');
  };

  const handleSaveGroupLeaderDefaults = () => {
    try {
      localStorage.setItem('plant2_GroupLeader_name', glDefaultName.trim());
      localStorage.setItem('plant2_GroupLeader_phone', glDefaultPhone.trim());
      onShowToast('Kontak default Group Leader untuk WA & PDF disimpan!', 'success');
    } catch {
      onShowToast('Gagal menyimpan kontak Group Leader.', 'error');
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      onShowToast('Konfirmasi password baru tidak cocok.', 'error');
      return;
    }
    const res = changeAdminPassword(oldPass, newPass);
    if (res.success) {
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
      logCurrentUserActivity({
        actionType: 'SETTINGS',
        module: 'Settings',
        description: 'Ubah Password Administrator',
      });
      onShowToast('Password Administrator berhasil diperbarui!', 'success');
    } else {
      onShowToast(res.error || 'Gagal mengganti password.', 'error');
    }
  };

  const handleExportBackupJson = () => {
    try {
      const payload = {
        app: 'PLANT 2 Heavy Equipment System',
        exportedAt: new Date().toISOString(),
        version: '2.4.1',
        settings,
        data: {
          codeUnits: getCodeUnits(),
          bapList: getBAPList(),
          dailyRigidList: getDailyRigidList(),
          dailyArticList: getDailyArticList(),
          backlogs: getBacklogs(),
          activities: getActivities(),
        },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PLANT2_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast('File Backup Lengkap (.JSON) berhasil diunduh!', 'success');
    } catch (err: any) {
      onShowToast(`Gagal membuat backup JSON: ${err?.message || 'Unknown error'}`, 'error');
    }
  };

  const handleImportBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (!parsed || (!parsed.data && !parsed.settings)) {
          onShowToast('Format file backup JSON tidak valid.', 'error');
          return;
        }
        if (parsed.settings) {
          updateSettings(parsed.settings);
        }
        if (parsed.data) {
          replaceEntireDataset({
            codeUnits: Array.isArray(parsed.data.codeUnits) ? parsed.data.codeUnits : undefined,
            bapList: Array.isArray(parsed.data.bapList) ? parsed.data.bapList : undefined,
            dailyRigidList: Array.isArray(parsed.data.dailyRigidList) ? parsed.data.dailyRigidList : undefined,
            dailyArticList: Array.isArray(parsed.data.dailyArticList) ? parsed.data.dailyArticList : undefined,
            backlogs: Array.isArray(parsed.data.backlogs) ? parsed.data.backlogs : undefined,
            activities: Array.isArray(parsed.data.activities) ? parsed.data.activities : undefined,
          });
          onDatasetReloaded();
        }
        onShowToast('Backup data & pengaturan berhasil dipulihkan!', 'success');
      } catch (err: any) {
        onShowToast(`Gagal membaca file JSON: ${err?.message || 'Error'}`, 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const activeModulesCount = APP_MODULE_ORDER.filter(id => settings.modules[id]?.enabled !== false).length;
  const totalRecordsCount =
    codeUnits.length +
    dailyRigidList.length +
    dailyArticList.length +
    backlogs.length +
    activities.length +
    bapList.length;

  const sectionTabs: Array<{ id: SettingsSectionTab; label: string; icon: React.ElementType }> = [
    { id: 'modules', label: 'Kontrol Semua Modul', icon: Layers },
    { id: 'inspection', label: 'Inspeksi & Checklist', icon: ClipboardCheck },
    { id: 'operations', label: 'Backlog, Activity & BAP', icon: Wrench },
    { id: 'reporting', label: 'Dashboard, WA & PDF', icon: BarChart3 },
    { id: 'system', label: 'Tampilan, Sistem & Backup', icon: Database },
  ];

  return (
    <div className="space-y-4 pb-24 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#18181b] border border-[#facc15]/30 rounded p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#facc15]/15 text-[#facc15] border border-[#facc15]/30 text-[10px] font-mono font-bold uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ADMIN ONLY CONTROL CENTER</span>
            </span>
            <span className="text-[10px] font-mono text-[rgba(242,239,235,0.45)] uppercase">
              {activeModulesCount}/{APP_MODULE_ORDER.length} Modul Aktif
            </span>
          </div>
          <h1 className="font-syne font-extrabold text-xl sm:text-2xl text-[#f2efeb] uppercase tracking-tight flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-[#facc15]" />
            <span>SETTINGS &amp; PENGATURAN MODUL APLIKASI</span>
          </h1>
          <p className="text-xs font-mono text-[rgba(242,239,235,0.55)]">
            Pusat kendali hak akses User, visibilitas seluruh modul, parameter checklist, format otomasi, WhatsApp Group &amp; sinkronisasi sistem.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setConfirmResetModal('SETTINGS')}
            className="px-3 py-2 rounded border border-[#fb7185]/40 bg-[#fb7185]/10 hover:bg-[#fb7185]/20 text-[#fb7185] text-xs font-mono font-bold uppercase flex items-center space-x-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Pills */}
      <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {sectionTabs.map(tab => {
          const Icon = tab.icon;
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`px-3.5 py-2 rounded text-xs font-mono font-bold uppercase whitespace-nowrap flex items-center space-x-2 transition border ${
                active
                  ? 'bg-[#facc15] text-[#111113] border-[#facc15] shadow-sm'
                  : 'bg-transparent text-[rgba(242,239,235,0.65)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.06)] border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: KONTROL SEMUA MODUL                                            */}
      {/* ===================================================================== */}
      {activeSection === 'modules' && (
        <div className="space-y-4">
          {/* Global Module Behavior & Quick Presets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-syne font-bold text-sm uppercase text-[#f2efeb] flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-[#facc15]" />
                  <span>Preset Cepat Kontrol Akses User Operasional</span>
                </h2>
                <span className="text-[10px] font-mono text-[#4ade80]">ADMIN SELALU AKSES PENUH</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyModulePreset('ALL_ACTIVE')}
                  className="p-2.5 rounded bg-[#4ade80]/10 hover:bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80] text-[11px] font-mono font-bold uppercase text-left transition"
                >
                  <CheckCircle2 className="w-4 h-4 mb-1" />
                  Aktifkan Semua Modul
                </button>
                <button
                  type="button"
                  onClick={() => applyModulePreset('LOCK_USER_DELETE')}
                  className="p-2.5 rounded bg-[#facc15]/10 hover:bg-[#facc15]/20 border border-[#facc15]/30 text-[#facc15] text-[11px] font-mono font-bold uppercase text-left transition"
                >
                  <Lock className="w-4 h-4 mb-1" />
                  Kunci Hapus User
                </button>
                <button
                  type="button"
                  onClick={() => applyModulePreset('USER_READONLY')}
                  className="p-2.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[11px] font-mono font-bold uppercase text-left transition"
                >
                  <Eye className="w-4 h-4 mb-1" />
                  User Read-Only
                </button>
                <button
                  type="button"
                  onClick={() => applyModulePreset('RESET')}
                  className="p-2.5 rounded bg-[rgba(242,239,235,0.06)] hover:bg-[rgba(242,239,235,0.12)] border border-[rgba(242,239,235,0.15)] text-[#f2efeb] text-[11px] font-mono font-bold uppercase text-left transition"
                >
                  <RotateCcw className="w-4 h-4 mb-1" />
                  Default Izin
                </button>
              </div>
            </div>

            <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-3">
              <h2 className="font-syne font-bold text-sm uppercase text-[#f2efeb]">
                Navigasi &amp; Modul Awal
              </h2>
              <div className="space-y-2.5 text-xs font-mono">
                <div>
                  <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                    Modul Utama Saat Dibuka
                  </label>
                  <select
                    value={settings.general.defaultLandingTab}
                    onChange={e => updateGeneral({ defaultLandingTab: e.target.value as AppModuleId })}
                    className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-2.5 py-2 text-xs text-[#f2efeb] focus:border-[#facc15] outline-none"
                  >
                    {APP_MODULE_ORDER.map(id => (
                      <option key={id} value={id}>
                        {settings.modules[id]?.label || id}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center justify-between p-2 rounded bg-[#111113] border border-[rgba(242,239,235,0.1)] cursor-pointer">
                  <span className="text-[11px] text-[rgba(242,239,235,0.8)]">
                    Tampilkan Badge Angka di Menu
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.general.showNavBadges}
                    onChange={e => updateGeneral({ showNavBadges: e.target.checked })}
                    className="w-4 h-4 accent-[#facc15]"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* All 11 Modules Matrix */}
          <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(242,239,235,0.1)] bg-[#111113] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-syne font-bold text-sm uppercase text-[#f2efeb]">
                  Matriks Kendali 11 Modul Aplikasi
                </h2>
                <p className="text-[11px] font-mono text-[rgba(242,239,235,0.5)]">
                  Atur status aktif, nama label menu, dan hak akses Tambah / Edit / Hapus / Share untuk User Operasional pada setiap modul.
                </p>
              </div>
            </div>

            <div className="divide-y divide-[rgba(242,239,235,0.08)]">
              {APP_MODULE_ORDER.map((id, idx) => {
                const mod = settings.modules[id];
                if (!mod) return null;
                return (
                  <div
                    key={id}
                    className={`p-4 transition ${
                      mod.enabled ? 'hover:bg-[rgba(242,239,235,0.02)]' : 'bg-[#fb7185]/5'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Left: Module Identity & Custom Label */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[rgba(242,239,235,0.08)] text-[rgba(242,239,235,0.7)]">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={mod.label}
                            onChange={e => updateModuleConfig(id, { label: e.target.value })}
                            className="bg-[#111113] border border-[rgba(242,239,235,0.15)] focus:border-[#facc15] rounded px-2.5 py-1 text-xs font-syne font-bold text-[#f2efeb] outline-none w-52"
                            title="Ubah nama tampilan modul di menu"
                          />
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                              mod.enabled
                                ? 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30'
                                : 'bg-[#fb7185]/15 text-[#fb7185] border-[#fb7185]/30'
                            }`}
                          >
                            {mod.enabled ? 'AKTIF UNTUK USER' : 'TERKUNCI UNTUK USER'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[rgba(242,239,235,0.5)]">
                          {mod.description}
                        </p>
                      </div>

                      {/* Right: Enable Toggle + Granular Permissions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateModuleConfig(id, { enabled: !mod.enabled })}
                          className={`px-3 py-1.5 rounded text-[11px] font-mono font-bold uppercase flex items-center space-x-1.5 border transition ${
                            mod.enabled
                              ? 'bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/40 hover:bg-[#4ade80]/25'
                              : 'bg-[#fb7185]/15 text-[#fb7185] border-[#fb7185]/40 hover:bg-[#fb7185]/25'
                          }`}
                        >
                          {mod.enabled ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          <span>{mod.enabled ? 'Aktif' : 'Nonaktif'}</span>
                        </button>

                        <div className="flex items-center gap-1.5 bg-[#111113] p-1.5 rounded border border-[rgba(242,239,235,0.1)] text-[10px] font-mono">
                          {(
                            [
                              { field: 'userCanCreate', label: 'Tambah' },
                              { field: 'userCanEdit', label: 'Edit' },
                              { field: 'userCanDelete', label: 'Hapus' },
                              { field: 'userCanExport', label: 'WA/PDF' },
                            ] as const
                          ).map(perm => {
                            const allowed = Boolean(mod[perm.field]);
                            return (
                              <button
                                key={perm.field}
                                type="button"
                                disabled={!mod.enabled}
                                onClick={() => updateModuleConfig(id, { [perm.field]: !allowed })}
                                className={`px-2 py-1 rounded font-bold uppercase transition border disabled:opacity-35 ${
                                  allowed
                                    ? 'bg-[#facc15]/15 text-[#facc15] border-[#facc15]/40'
                                    : 'bg-transparent text-[rgba(242,239,235,0.4)] border-[rgba(242,239,235,0.1)] line-through'
                                }`}
                                title={`Izin ${perm.label} untuk User Operasional`}
                              >
                                {perm.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: INSPEKSI & CHECKLIST (RIGID & ARTIC)                           */}
      {/* ===================================================================== */}
      {activeSection === 'inspection' && (
        <div className="space-y-4">
          {/* Prefix Separation & Inspection Rules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-[#facc15]" />
                <h2 className="font-syne font-bold text-sm uppercase text-[#f2efeb]">
                  Filter Kode Unit Rigid &amp; Artic
                </h2>
              </div>
              <p className="text-[11px] font-mono text-[rgba(242,239,235,0.55)]">
                Menentukan awalan Code Unit yang muncul di Daily/QA1/QA7 Rigid vs Artic (pisahkan dengan koma).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <label className="block text-[10px] text-[#facc15] font-bold uppercase mb-1">
                    Prefix Armada Rigid (Daily/QA1/QA7 Rigid)
                  </label>
                  <input
                    type="text"
                    value={rigidPrefixesText}
                    onChange={e => setRigidPrefixesText(e.target.value)}
                    placeholder="DT"
                    className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] focus:border-[#facc15] rounded px-3 py-2 text-[#f2efeb] uppercase outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#4ade80] font-bold uppercase mb-1">
                    Prefix Armada Artic (Daily/QA1/QA7 Artic)
                  </label>
                  <input
                    type="text"
                    value={articPrefixesText}
                    onChange={e => setArticPrefixesText(e.target.value)}
                    placeholder="GR, CP, WL"
                    className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] focus:border-[#4ade80] rounded px-3 py-2 text-[#f2efeb] uppercase outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSavePrefixes}
                className="px-4 py-2 rounded bg-[#facc15] hover:bg-[#fde047] text-[#111113] font-mono font-bold text-xs uppercase flex items-center space-x-1.5 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Prefix Armada</span>
              </button>
            </div>

            <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <ClipboardCheck className="w-4 h-4 text-[#4ade80]" />
                <h2 className="font-syne font-bold text-sm uppercase text-[#f2efeb]">
                  Validasi Form Inspeksi Harian &amp; QA
                </h2>
              </div>
              <div className="space-y-2.5 text-xs font-mono">
                <label className="flex items-center justify-between p-3 rounded bg-[#111113] border border-[rgba(242,239,235,0.1)] cursor-pointer">
                  <div>
                    <div className="font-bold text-[#f2efeb]">Wajib Isi Pengawas / Group Leader</div>
                    <div className="text-[10px] text-[rgba(242,239,235,0.5)]">
                      Jika aktif, form Daily/QA1/QA7 tidak dapat disimpan tanpa nama validator/GL.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.inspection.requireValidator}
                    onChange={e => updateInspection({ requireValidator: e.target.checked })}
                    className="w-4 h-4 accent-[#facc15] ml-3"
                  />
                </label>

                <div className="p-3 rounded bg-[#111113] border border-[rgba(242,239,235,0.1)] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#f2efeb]">Reset Parameter Checklist QA 7</div>
                    <div className="text-[10px] text-[rgba(242,239,235,0.5)]">
                      Kembalikan daftar item Rigid (19) &amp; Artic (36) ke standar awal.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmResetModal('CHECKLIST')}
                    className="px-3 py-1.5 rounded bg-[#fb7185]/15 hover:bg-[#fb7185]/25 text-[#fb7185] border border-[#fb7185]/30 text-[11px] font-bold uppercase transition shrink-0"
                  >
                    Reset Checklist
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist Parameter Editor */}
          <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(242,239,235,0.1)] bg-[#111113] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-syne font-bold text-sm uppercase text-[#f2efeb]">
                  Editor Parameter Checklist ({checklistTab === 'RIGID' ? 'Rigid' : 'Artic'})
                </h2>
                <p className="text-[11px] font-mono text-[rgba(242,239,235,0.5)]">
                  Aktifkan/nonaktifkan, ubah nama parameter, atau tambah item inspeksi baru.
                </p>
              </div>
              <div className="flex items-center space-x-1.5 bg-[#18181b] p-1 rounded border border-[rgba(242,239,235,0.12)]">
                <button
                  type="button"
                  onClick={() => setChecklistTab('RIGID')}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase transition ${
                    checklistTab === 'RIGID'
                      ? 'bg-[#facc15] text-[#111113]'
                      : 'text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb]'
                  }`}
                >
                  Rigid ({settings.inspection.rigidChecklist.filter(i => i.enabled !== false).length}/
                  {settings.inspection.rigidChecklist.length})
                </button>
                <button
                  type="button"
                  onClick={() => setChecklistTab('ARTIC')}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase transition ${
                    checklistTab === 'ARTIC'
                      ? 'bg-[#4ade80] text-[#111113]'
                      : 'text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb]'
                  }`}
                >
                  Artic ({settings.inspection.articChecklist.filter(i => i.enabled !== false).length}/
                  {settings.inspection.articChecklist.length})
                </button>
              </div>
            </div>

            {/* Add New Parameter Form */}
            <form
              onSubmit={handleAddChecklistParam}
              className="p-3 bg-[rgba(242,239,235,0.03)] border-b border-[rgba(242,239,235,0.08)] flex flex-col sm:flex-row gap-2 text-xs font-mono"
            >
              <input
                type="text"
                value={newParamName}
                onChange={e => setNewParamName(e.target.value)}
                placeholder={`Tambah parameter checklist ${checklistTab} baru...`}
                className="flex-1 bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-1.5 text-[#f2efeb] focus:border-[#facc15] outline-none"
              />
              <select
                value={newParamType}
                onChange={e => setNewParamType(e.target.value as 'status' | 'measurement')}
                className="bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-2.5 py-1.5 text-[#f2efeb] outline-none"
              >
                <option value="status">Tipe: Status (OK/DEFECT/MONITOR/NA)</option>
                <option value="measurement">Tipe: Pengukuran (Nilai &amp; Satuan)</option>
              </select>
              {newParamType === 'measurement' && (
                <input
                  type="text"
                  value={newParamUnit}
                  onChange={e => setNewParamUnit(e.target.value)}
                  placeholder="Satuan (Bar, V, mm)"
                  className="w-36 bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-2.5 py-1.5 text-[#f2efeb] outline-none"
                />
              )}
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded bg-[#facc15] hover:bg-[#fde047] text-[#111113] font-bold uppercase flex items-center justify-center space-x-1 transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Item</span>
              </button>
            </form>

            {/* Checklist Rows */}
            <div className="max-h-96 overflow-y-auto divide-y divide-[rgba(242,239,235,0.06)]">
              {activeChecklistList.map(param => (
                <div
                  key={param.id}
                  className={`px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono ${
                    param.enabled === false ? 'opacity-50 bg-[#fb7185]/5' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={param.enabled !== false}
                      onChange={e => updateChecklistItem(checklistTab, param.id, { enabled: e.target.checked })}
                      className="w-4 h-4 accent-[#facc15] shrink-0"
                    />
                    <input
                      type="text"
                      value={param.name}
                      onChange={e => updateChecklistItem(checklistTab, param.id, { name: e.target.value })}
                      className="flex-1 bg-[#111113] border border-[rgba(242,239,235,0.12)] focus:border-[#facc15] rounded px-2.5 py-1 text-[#f2efeb] outline-none"
                    />
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border uppercase ${
                        param.type === 'measurement'
                          ? 'bg-[#facc15]/10 text-[#facc15] border-[#facc15]/30'
                          : 'bg-[rgba(242,239,235,0.08)] text-[rgba(242,239,235,0.6)] border-[rgba(242,239,235,0.15)]'
                      }`}
                    >
                      {param.type === 'measurement' ? `UKUR (${param.unit || '-'})` : 'STATUS'}
                    </span>
                    {param.id.includes('_custom_') && (
                      <button
                        type="button"
                        onClick={() => {
                          const key = checklistTab === 'RIGID' ? 'rigidChecklist' : 'articChecklist';
                          updateInspection({
                            [key]: settings.inspection[key].filter(p => p.id !== param.id),
                          });
                        }}
                        className="p-1 rounded text-[#fb7185] hover:bg-[#fb7185]/15"
                        title="Hapus parameter kustom"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: OPERASIONAL (BACKLOG, ADD ACTIVITY, BAP, CODE UNIT)            */}
      {/* ===================================================================== */}
      {activeSection === 'operations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Backlog Settings */}
          <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-3">
            <h2 className="font-syne font-bold text-sm uppercase text-[#facc15]">
              Pengaturan Modul Backlog
            </h2>
            <div className="space-y-3 text-xs font-mono">
              <label className="flex items-center justify-between p-2.5 rounded bg-[#111113] border border-[rgba(242,239,235,0.1)] cursor-pointer">
                <div>
                  <div className="font-bold text-[#f2efeb]">Awalan Otomatis Deskripsi Backlog</div>
                  <div className="text-[10px] text-[rgba(242,239,235,0.5)]">
                    Format otomatis: {settings.operations.backlogAutoPrefixText || 'BCS'} &lt;CODE UNIT&gt; &lt;DESKRIPSI&gt;
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.operations.backlogEnableAutoPrefix}
                  onChange={e => updateOperations({ backlogEnableAutoPrefix: e.target.checked })}
                  className="w-4 h-4 accent-[#facc15]"
                />
              </label>

              <div>
                <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                  Teks Awalan Deskripsi Backlog
                </label>
                <input
                  type="text"
                  value={settings.operations.backlogAutoPrefixText}
                  onChange={e => updateOperations({ backlogAutoPrefixText: e.target.value.toUpperCase() })}
                  disabled={!settings.operations.backlogEnableAutoPrefix}
                  placeholder="BCS"
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] focus:border-[#facc15] rounded px-3 py-2 text-[#f2efeb] uppercase outline-none disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                  Status Default Backlog Baru
                </label>
                <select
                  value={settings.operations.defaultBacklogStatus}
                  onChange={e =>
                    updateOperations({ defaultBacklogStatus: e.target.value as BacklogItem['status'] })
                  }
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
                >
                  <option value="WAITING_PART">WAITING_PART</option>
                  <option value="READY_TO_INSTALL">READY_TO_INSTALL</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Add Activity, BAP & Code Unit Defaults */}
          <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-3">
            <h2 className="font-syne font-bold text-sm uppercase text-[#4ade80]">
              Default Status Add Activity, BAP &amp; Code Unit
            </h2>
            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                  Status Default Add Activity Baru
                </label>
                <select
                  value={settings.operations.defaultActivityStatus}
                  onChange={e =>
                    updateOperations({ defaultActivityStatus: e.target.value as AddActivityItem['status'] })
                  }
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="CLOSE">CLOSE</option>
                  <option value="MONITORING">MONITORING</option>
                  <option value="MIDLIFE">MIDLIFE</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                  Status Default BAP Kerusakan Baru
                </label>
                <select
                  value={settings.operations.defaultBapStatus}
                  onChange={e =>
                    updateOperations({ defaultBapStatus: e.target.value as BAPRecord['status'] })
                  }
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="CLOSE">CLOSE</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                  Status Default Master Code Unit Baru
                </label>
                <select
                  value={settings.operations.defaultUnitStatus}
                  onChange={e =>
                    updateOperations({ defaultUnitStatus: e.target.value as CodeUnit['statusUnit'] })
                  }
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
                >
                  <option value="READY">READY</option>
                  <option value="STANDBY">STANDBY</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="BREAKDOWN">BREAKDOWN</option>
                </select>
              </div>

              <label className="flex items-center justify-between p-2.5 rounded bg-[#111113] border border-[rgba(242,239,235,0.1)] cursor-pointer">
                <span className="text-[11px] text-[#f2efeb]">Wajib Isi Nomor MO pada Form BAP</span>
                <input
                  type="checkbox"
                  checked={settings.operations.requireBapMo}
                  onChange={e => updateOperations({ requireBapMo: e.target.checked })}
                  className="w-4 h-4 accent-[#fb7185]"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: DASHBOARD, WHATSAPP & PRINT PDF                                */}
      {/* ===================================================================== */}
      {activeSection === 'reporting' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Dashboard & PDF Preferences */}
            <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-3">
              <h2 className="font-syne font-bold text-sm uppercase text-[#facc15] flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Pengaturan Dashboard &amp; Laporan PDF / WA</span>
              </h2>
              <div className="space-y-3 text-xs font-mono">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                      Periode Default Dashboard
                    </label>
                    <select
                      value={settings.dashboard.defaultPeriod}
                      onChange={e =>
                        updateDashboard({
                          defaultPeriod: e.target.value as 'HARIAN' | 'BULANAN' | 'TAHUNAN',
                        })
                      }
                      className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
                    >
                      <option value="HARIAN">HARIAN</option>
                      <option value="BULANAN">BULANAN</option>
                      <option value="TAHUNAN">TAHUNAN</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                      Target Cakupan Harian (%)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={settings.dashboard.targetDailyCoveragePct}
                      onChange={e =>
                        updateDashboard({
                          targetDailyCoveragePct: Math.max(1, Math.min(100, Number(e.target.value) || 100)),
                        })
                      }
                      className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                    Header Tambahan Pesan WhatsApp (Opsional)
                  </label>
                  <input
                    type="text"
                    value={settings.reporting.whatsappHeaderNote}
                    onChange={e => updateReporting({ whatsappHeaderNote: e.target.value })}
                    placeholder="Contoh: *SHIFT 1 / PLANT 2 MTBU*"
                    className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                    Footer / Tanda Tangan Tambahan WhatsApp
                  </label>
                  <input
                    type="text"
                    value={settings.reporting.whatsappFooterSignature}
                    onChange={e => updateReporting({ whatsappFooterSignature: e.target.value })}
                    placeholder="Contoh: _Dikirim melalui Sistem Plant 2 MTBU_"
                    className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                    Subjudul Header Cetak PDF
                  </label>
                  <input
                    type="text"
                    value={settings.reporting.pdfReportSubtitle}
                    onChange={e => updateReporting({ pdfReportSubtitle: e.target.value })}
                    className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Group Leader Contact & WhatsApp Groups Management */}
            <div className="space-y-4">
              <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-3">
                <h2 className="font-syne font-bold text-sm uppercase text-[#4ade80] flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Kontak Default Group Leader (Laporan WA &amp; PDF)</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                  <input
                    type="text"
                    value={glDefaultName}
                    onChange={e => setGlDefaultName(e.target.value)}
                    placeholder="Nama Group Leader"
                    className="bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
                  />
                  <input
                    type="text"
                    value={glDefaultPhone}
                    onChange={e => setGlDefaultPhone(e.target.value)}
                    placeholder="No. WA (Contoh: 0812...)"
                    className="bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveGroupLeaderDefaults}
                  className="px-3.5 py-2 rounded bg-[#4ade80] hover:bg-[#22c55e] text-[#111113] font-mono font-bold text-xs uppercase flex items-center space-x-1.5 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Kontak GL</span>
                </button>
              </div>

              <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-3">
                <h2 className="font-syne font-bold text-sm uppercase text-[#f2efeb] flex items-center space-x-2">
                  <Users className="w-4 h-4 text-[#facc15]" />
                  <span>Daftar Group WhatsApp Tersimpan ({waGroups.length})</span>
                </h2>

                <form onSubmit={handleAddWaGroup} className="space-y-2 text-xs font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      placeholder="Nama Group WA"
                      className="bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-2.5 py-1.5 text-[#f2efeb] outline-none"
                    />
                    <input
                      type="text"
                      value={newGroupLink}
                      onChange={e => setNewGroupLink(e.target.value)}
                      placeholder="https://chat.whatsapp.com/..."
                      className="bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-2.5 py-1.5 text-[#f2efeb] outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 rounded bg-[#facc15]/15 hover:bg-[#facc15]/25 text-[#facc15] border border-[#facc15]/30 font-bold uppercase flex items-center justify-center space-x-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Group WhatsApp</span>
                  </button>
                </form>

                {waGroups.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {waGroups.map(g => (
                      <div
                        key={g.id}
                        className="p-2 rounded bg-[#111113] border border-[rgba(242,239,235,0.1)] flex items-center justify-between gap-2 text-xs font-mono"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[#f2efeb] truncate">{g.name}</div>
                          <div className="text-[10px] text-[rgba(242,239,235,0.45)] truncate">
                            {g.inviteLink}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteWaGroup(g.id)}
                          className="p-1.5 rounded text-[#fb7185] hover:bg-[#fb7185]/15 shrink-0"
                          title="Hapus Group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] font-mono text-[rgba(242,239,235,0.45)] italic">
                    Belum ada group WhatsApp tersimpan.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: SISTEM, GOOGLE SHEET, KEAMANAN & BACKUP                        */}
      {/* ===================================================================== */}
      {activeSection === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* App Branding & Theme */}
          <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-3">
            <h2 className="font-syne font-bold text-sm uppercase text-[#f2efeb]">
              Identitas Aplikasi &amp; Tema Tampilan
            </h2>
            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                  Nama Brand Utama
                </label>
                <input
                  type="text"
                  value={settings.general.appBrandPrefix}
                  onChange={e => updateGeneral({ appBrandPrefix: e.target.value })}
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-2.5 py-1.5 text-[#f2efeb] uppercase outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                  Angka / Aksen Brand
                </label>
                <input
                  type="text"
                  value={settings.general.appBrandAccent}
                  onChange={e => updateGeneral({ appBrandAccent: e.target.value })}
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-2.5 py-1.5 text-[#facc15] font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                  Nama Site / Lokasi
                </label>
                <input
                  type="text"
                  value={settings.general.siteName}
                  onChange={e => updateGeneral({ siteName: e.target.value })}
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-2.5 py-1.5 text-[#f2efeb] uppercase outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[rgba(242,239,235,0.5)] uppercase mb-1">
                  Subjudul Sistem
                </label>
                <input
                  type="text"
                  value={settings.general.appSubtitle}
                  onChange={e => updateGeneral({ appSubtitle: e.target.value })}
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-2.5 py-1.5 text-[#f2efeb] outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs font-mono">
              <span className="text-[rgba(242,239,235,0.65)]">TEMA APLIKASI SAAT INI:</span>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`px-3 py-1.5 rounded font-bold uppercase ${
                    theme === 'dark'
                      ? 'bg-[#facc15] text-[#111113]'
                      : 'bg-[#111113] text-[rgba(242,239,235,0.6)] border border-[rgba(242,239,235,0.15)]'
                  }`}
                >
                  Gelap
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`px-3 py-1.5 rounded font-bold uppercase ${
                    theme === 'light'
                      ? 'bg-[#facc15] text-[#111113]'
                      : 'bg-[#111113] text-[rgba(242,239,235,0.6)] border border-[rgba(242,239,235,0.15)]'
                  }`}
                >
                  Terang
                </button>
              </div>
            </div>
          </div>

          {/* Font Family & Font Size Configuration */}
          {(() => {
            const activeFont =
              APP_FONT_OPTIONS.find(f => f.id === settings.appearance.fontFamily) || APP_FONT_OPTIONS[0];
            const currentSize = settings.appearance.baseFontSizePx || 16;
            const scalePct = Math.round((currentSize / 16) * 100);
            const sizePresets = [
              { label: 'Kecil', px: 14 },
              { label: 'Normal', px: 16 },
              { label: 'Besar', px: 18 },
              { label: 'Ekstra', px: 20 },
            ];

            return (
              <div className="lg:col-span-2 bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[rgba(242,239,235,0.08)]">
                  <div>
                    <h2 className="font-syne font-bold text-sm uppercase text-[#facc15] flex items-center space-x-2">
                      <Type className="w-4 h-4" />
                      <span>Pengaturan Jenis Font &amp; Ukuran Font Aplikasi</span>
                    </h2>
                    <p className="text-[11px] font-mono text-[rgba(242,239,235,0.55)] mt-0.5">
                      Ubah jenis huruf dan skala ukuran font secara real-time di seluruh modul aplikasi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateAppearance({
                        fontFamily: 'DEFAULT',
                        baseFontSizePx: 16,
                        applyFontGlobally: true,
                      });
                      onShowToast('Jenis & ukuran font dikembalikan ke standar default (16px).', 'success');
                    }}
                    className="px-2.5 py-1.5 rounded bg-[#111113] hover:bg-[rgba(242,239,235,0.08)] border border-[rgba(242,239,235,0.15)] text-[10px] font-mono font-bold uppercase text-[rgba(242,239,235,0.75)] flex items-center space-x-1.5 self-start sm:self-auto transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Font Default</span>
                  </button>
                </div>

                {/* Font Size Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-[#111113] border border-[rgba(242,239,235,0.1)] rounded p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-[#f2efeb]">
                        Ukuran Font Dasar
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#facc15]/15 border border-[#facc15]/30 text-[#facc15] text-[11px] font-mono font-bold">
                        {currentSize}px ({scalePct}%)
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {sizePresets.map(preset => {
                        const isSelected = currentSize === preset.px;
                        return (
                          <button
                            key={preset.px}
                            type="button"
                            onClick={() => updateAppearance({ baseFontSizePx: preset.px })}
                            className={`px-2 py-2 rounded border text-[11px] font-mono font-bold uppercase transition flex flex-col items-center ${
                              isSelected
                                ? 'bg-[#facc15] text-[#111113] border-[#facc15]'
                                : 'bg-[#18181b] text-[rgba(242,239,235,0.7)] border-[rgba(242,239,235,0.15)] hover:border-[#facc15]/50'
                            }`}
                          >
                            <span>{preset.label}</span>
                            <span className="text-[10px] opacity-80">{preset.px}px</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Slider & Fine Stepper */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => updateAppearance({ baseFontSizePx: Math.max(12, currentSize - 1) })}
                        disabled={currentSize <= 12}
                        className="w-8 h-8 rounded bg-[#18181b] border border-[rgba(242,239,235,0.2)] text-[#f2efeb] font-mono font-bold text-sm hover:border-[#facc15] disabled:opacity-40 transition"
                        title="Perkecil 1px"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min={12}
                        max={22}
                        step={1}
                        value={currentSize}
                        onChange={e => updateAppearance({ baseFontSizePx: Number(e.target.value) })}
                        className="flex-1 accent-[#facc15] cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => updateAppearance({ baseFontSizePx: Math.min(22, currentSize + 1) })}
                        disabled={currentSize >= 22}
                        className="w-8 h-8 rounded bg-[#18181b] border border-[rgba(242,239,235,0.2)] text-[#f2efeb] font-mono font-bold text-sm hover:border-[#facc15] disabled:opacity-40 transition"
                        title="Perbesar 1px"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-[rgba(242,239,235,0.45)]">
                      <span>12px (Padat)</span>
                      <span>16px (Standar)</span>
                      <span>22px (Maksimal)</span>
                    </div>
                  </div>

                  {/* Global Font Application & Live Preview */}
                  <div className="bg-[#111113] border border-[rgba(242,239,235,0.1)] rounded p-3.5 space-y-3 flex flex-col justify-between">
                    <label className="flex items-center justify-between gap-2 p-2.5 rounded bg-[#18181b] border border-[rgba(242,239,235,0.1)] cursor-pointer text-xs font-mono">
                      <div>
                        <div className="font-bold text-[#f2efeb]">Terapkan ke Seluruh Teks</div>
                        <div className="text-[10px] text-[rgba(242,239,235,0.5)]">
                          Sertakan judul modul &amp; label angka agar seragam mengikuti jenis font pilihan
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.appearance.applyFontGlobally !== false}
                        onChange={e => updateAppearance({ applyFontGlobally: e.target.checked })}
                        className="w-4 h-4 accent-[#facc15] shrink-0"
                      />
                    </label>

                    <div
                      className="p-3 rounded bg-[#18181b] border border-[#facc15]/25 space-y-1.5"
                      style={{
                        fontFamily: activeFont.cssStack,
                        fontSize: `${currentSize}px`,
                      }}
                    >
                      <div className="flex items-center justify-between text-[0.7em] uppercase tracking-wider text-[#facc15] font-bold">
                        <span>PRATINJAU TIPOGRAFI AKTIF</span>
                        <span>{activeFont.label}</span>
                      </div>
                      <div className="font-bold text-[#f2efeb] text-[1.05em]">
                        DT5500 • HM 14,820 • Daily Check Rigid 100%
                      </div>
                      <p className="text-[0.8em] text-[rgba(242,239,235,0.7)] leading-snug">
                        Status Unit READY • Rencana 10 Unit (8 Plan + 2 Tambahan) • Validasi Mekanik Plant 2.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Font Family Selector Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold uppercase text-[#f2efeb]">Pilih Jenis Font ({APP_FONT_OPTIONS.length} Pilihan)</span>
                    <span className="text-[11px] text-[#4ade80]">Aktif: {activeFont.label}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {APP_FONT_OPTIONS.map(fontOpt => {
                      const selected = settings.appearance.fontFamily === fontOpt.id;
                      return (
                        <button
                          key={fontOpt.id}
                          type="button"
                          onClick={() => updateAppearance({ fontFamily: fontOpt.id as AppFontFamilyId })}
                          className={`p-3 rounded border text-left transition flex flex-col justify-between gap-1.5 ${
                            selected
                              ? 'bg-[#facc15]/12 border-[#facc15] shadow-sm'
                              : 'bg-[#111113] border-[rgba(242,239,235,0.12)] hover:border-[rgba(242,239,235,0.3)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-sm font-bold truncate ${
                                selected ? 'text-[#facc15]' : 'text-[#f2efeb]'
                              }`}
                              style={{ fontFamily: fontOpt.cssStack }}
                            >
                              {fontOpt.label}
                            </span>
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[rgba(242,239,235,0.08)] text-[rgba(242,239,235,0.65)] shrink-0">
                              {fontOpt.category}
                            </span>
                          </div>
                          <div
                            className="text-xs text-[rgba(242,239,235,0.85)] py-1 border-y border-[rgba(242,239,235,0.06)] truncate"
                            style={{ fontFamily: fontOpt.cssStack }}
                          >
                            PLANT 2 • DT5500 • HM 14,820 • OK/GOOD
                          </div>
                          <p className="text-[10px] font-mono text-[rgba(242,239,235,0.5)] leading-snug">
                            {fontOpt.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Google Sheet Sync Control */}
          <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-syne font-bold text-sm uppercase text-[#4ade80] flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Sinkronisasi Google Sheet 24/7</span>
              </h2>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  sheetsConfig
                    ? 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30'
                    : 'bg-[#fb7185]/10 text-[#fb7185] border-[#fb7185]/30'
                }`}
              >
                {sheetsConfig ? 'TERHUBUNG' : 'TERPUTUS'}
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <label className="flex items-center justify-between p-2.5 rounded bg-[#111113] border border-[rgba(242,239,235,0.1)] cursor-pointer">
                <span>Auto-Sync saat Aplikasi Dibuka</span>
                <input
                  type="checkbox"
                  checked={settings.sync.autoSyncOnStartup}
                  onChange={e => updateSync({ autoSyncOnStartup: e.target.checked })}
                  className="w-4 h-4 accent-[#4ade80]"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded bg-[#111113] border border-[rgba(242,239,235,0.1)] cursor-pointer">
                <span>Auto-Kirim (Push) Setelah Simpan Data</span>
                <input
                  type="checkbox"
                  checked={settings.sync.autoSyncOnSave}
                  onChange={e => updateSync({ autoSyncOnSave: e.target.checked })}
                  className="w-4 h-4 accent-[#4ade80]"
                />
              </label>

              <div className="flex items-center justify-between p-2.5 rounded bg-[#111113] border border-[rgba(242,239,235,0.1)]">
                <span>Interval Tarik Otomatis (Polling)</span>
                <select
                  value={settings.sync.pollingIntervalSeconds}
                  onChange={e => updateSync({ pollingIntervalSeconds: Number(e.target.value) })}
                  className="bg-[#18181b] border border-[rgba(242,239,235,0.2)] rounded px-2 py-1 text-xs text-[#f2efeb] outline-none"
                >
                  <option value={0}>Nonaktif (Manual)</option>
                  <option value={15}>Setiap 15 Detik</option>
                  <option value={30}>Setiap 30 Detik</option>
                  <option value={60}>Setiap 60 Detik</option>
                  <option value={120}>Setiap 2 Menit</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-xs font-mono">
              <button
                type="button"
                onClick={onOpenSheetsModal}
                className="py-2 px-2 rounded bg-[#facc15] hover:bg-[#fde047] text-[#111113] font-bold uppercase transition"
              >
                Konfigurasi
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={onPullData}
                className="py-2 px-2 rounded bg-[#111113] hover:bg-[rgba(242,239,235,0.08)] border border-[rgba(242,239,235,0.2)] text-[#f2efeb] font-bold uppercase flex items-center justify-center space-x-1 transition disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tarik</span>
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={onPushData}
                className="py-2 px-2 rounded bg-[#111113] hover:bg-[rgba(242,239,235,0.08)] border border-[rgba(242,239,235,0.2)] text-[#4ade80] font-bold uppercase flex items-center justify-center space-x-1 transition disabled:opacity-40"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </div>
          </div>

          {/* Admin Security */}
          <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-syne font-bold text-sm uppercase text-[#facc15] flex items-center space-x-2">
                <KeyRound className="w-4 h-4" />
                <span>Keamanan &amp; Password Admin</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowPassFields(!showPassFields)}
                className="text-[11px] font-mono text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] flex items-center space-x-1"
              >
                {showPassFields ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassFields ? 'Sembunyikan' : 'Tampilkan'}</span>
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-2.5 text-xs font-mono">
              <input
                type={showPassFields ? 'text' : 'password'}
                value={oldPass}
                onChange={e => setOldPass(e.target.value)}
                placeholder="Password Admin Saat Ini"
                required
                className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type={showPassFields ? 'text' : 'password'}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Password Baru (min 4 karakter)"
                  required
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
                />
                <input
                  type={showPassFields ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="Konfirmasi Password Baru"
                  required
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] rounded px-3 py-2 text-[#f2efeb] outline-none"
                />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded bg-[#facc15] hover:bg-[#fde047] text-[#111113] font-bold uppercase transition"
                >
                  Ubah Password Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetAdminPassword();
                    onShowToast('Password Admin dikembalikan ke default (mtbu2026).', 'info');
                  }}
                  className="px-3 py-2 rounded border border-[rgba(242,239,235,0.2)] hover:bg-[rgba(242,239,235,0.08)] text-[rgba(242,239,235,0.75)] font-bold uppercase transition"
                >
                  Reset Default
                </button>
              </div>
            </form>
          </div>

          {/* Database Diagnostics & Backup/Restore */}
          <div className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded p-4 space-y-3">
            <h2 className="font-syne font-bold text-sm uppercase text-[#f2efeb] flex items-center space-x-2">
              <Database className="w-4 h-4 text-[#38bdf8]" />
              <span>Diagnostik &amp; Backup / Restore Database ({totalRecordsCount} Record)</span>
            </h2>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-[#111113] border border-[rgba(242,239,235,0.08)]">
                <span className="text-[rgba(242,239,235,0.45)] block text-[9px]">CODE UNIT</span>
                <span className="font-bold text-[#f2efeb] text-sm">{codeUnits.length}</span>
              </div>
              <div className="p-2 rounded bg-[#111113] border border-[rgba(242,239,235,0.08)]">
                <span className="text-[rgba(242,239,235,0.45)] block text-[9px]">INSPEKSI RIGID</span>
                <span className="font-bold text-[#facc15] text-sm">{dailyRigidList.length}</span>
              </div>
              <div className="p-2 rounded bg-[#111113] border border-[rgba(242,239,235,0.08)]">
                <span className="text-[rgba(242,239,235,0.45)] block text-[9px]">INSPEKSI ARTIC</span>
                <span className="font-bold text-[#4ade80] text-sm">{dailyArticList.length}</span>
              </div>
              <div className="p-2 rounded bg-[#111113] border border-[rgba(242,239,235,0.08)]">
                <span className="text-[rgba(242,239,235,0.45)] block text-[9px]">BACKLOG</span>
                <span className="font-bold text-[#facc15] text-sm">{backlogs.length}</span>
              </div>
              <div className="p-2 rounded bg-[#111113] border border-[rgba(242,239,235,0.08)]">
                <span className="text-[rgba(242,239,235,0.45)] block text-[9px]">ACTIVITIES</span>
                <span className="font-bold text-[#4ade80] text-sm">{activities.length}</span>
              </div>
              <div className="p-2 rounded bg-[#111113] border border-[rgba(242,239,235,0.08)]">
                <span className="text-[rgba(242,239,235,0.45)] block text-[9px]">BAP</span>
                <span className="font-bold text-[#fb7185] text-sm">{bapList.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs font-mono">
              <button
                type="button"
                onClick={handleExportBackupJson}
                className="py-2.5 px-3 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-bold uppercase flex items-center justify-center space-x-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Backup (.JSON)</span>
              </button>

              <label className="py-2.5 px-3 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold uppercase flex items-center justify-center space-x-2 cursor-pointer transition">
                <Upload className="w-4 h-4" />
                <span>Restore Backup (.JSON)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportBackupJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmResetModal !== 'NONE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#18181b] border border-[#fb7185]/40 rounded-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded bg-[#fb7185]/15 text-[#fb7185] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-syne font-bold text-sm uppercase text-[#f2efeb]">
                  {confirmResetModal === 'SETTINGS'
                    ? 'Reset Semua Pengaturan ke Default?'
                    : 'Reset Parameter Checklist ke Standar QA7?'}
                </h3>
                <p className="text-xs font-mono text-[rgba(242,239,235,0.65)]">
                  {confirmResetModal === 'SETTINGS'
                    ? 'Seluruh konfigurasi kontrol modul, prefix armada, status default, dan parameter akan dikembalikan ke pengaturan awal aplikasi.'
                    : 'Seluruh item checklist kustom pada Rigid dan Artic akan dikembalikan ke daftar standar 19 Rigid & 36 Artic.'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setConfirmResetModal('NONE')}
                className="flex-1 py-2 rounded border border-[rgba(242,239,235,0.2)] text-xs font-mono uppercase text-[rgba(242,239,235,0.75)] hover:bg-[rgba(242,239,235,0.06)]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmResetModal === 'SETTINGS') {
                    const next = resetAllSettings();
                    setRigidPrefixesText(next.inspection.rigidUnitPrefixes.join(', '));
                    setArticPrefixesText(next.inspection.articUnitPrefixes.join(', '));
                    setConfirmResetModal('NONE');
                    logCurrentUserActivity({
                      actionType: 'SETTINGS',
                      module: 'Settings',
                      description: 'Reset seluruh pengaturan aplikasi ke standar default',
                    });
                    onShowToast('Seluruh pengaturan aplikasi berhasil direset ke default!', 'info');
                  } else {
                    logCurrentUserActivity({
                      actionType: 'SETTINGS',
                      module: 'Settings',
                      description: 'Reset parameter checklist Rigid & Artic ke standar QA7',
                    });
                    handleResetChecklistToDefault();
                  }
                }}
                className="flex-1 py-2 rounded bg-[#fb7185] hover:bg-[#f43f5e] text-white text-xs font-mono font-bold uppercase"
              >
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
