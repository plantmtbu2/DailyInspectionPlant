import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CodeUnit,
  BAPRecord,
  DailyCheckRigid,
  DailyCheckArtic,
  BacklogItem,
  AddActivityItem,
  GoogleSheetsConfig,
  QAType,
} from './types';
import {
  getCodeUnits,
  addOrUpdateCodeUnit,
  deleteCodeUnit,
  getBAPList,
  addBAPRecord,
  updateBAPRecord,
  deleteBAPRecord,
  getDailyRigidList,
  addDailyRigid,
  updateDailyRigid,
  deleteDailyRigid,
  getDailyArticList,
  addDailyArtic,
  updateDailyArtic,
  deleteDailyArtic,
  getBacklogs,
  addBacklog,
  updateBacklog,
  updateBacklogStatus,
  deleteBacklog,
  getActivities,
  addActivity,
  updateActivity,
  updateActivityStatus,
  deleteActivity,
  replaceEntireDataset,
  getUnitStats,
  autoSyncToGoogleSheetIfConnected,
  getLastLocalMutationAt,
  isBackgroundSyncInFlight,
} from './services/storageService';
import {
  getStoredSheetsConfig,
  pushAllDataToGoogleSheet,
  pullAllDataFromGoogleSheet,
} from './services/googleSheetsService';
import { initAuth } from './services/firebaseAuth';
import { initPhotoVault } from './services/photoStorageService';
import { isRigidUnitCode, isArticUnitCode } from './utils/unitFilter';
import { logCurrentUserActivity } from './services/userActivityLogService';

// Components
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomNav, ActiveTab } from './components/BottomNav';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { CodeUnitManagerModal } from './components/CodeUnitManagerModal';
import { BapModal } from './components/BapModal';
import { DailyRigidModal } from './components/DailyRigidModal';
import { DailyArticModal } from './components/DailyArticModal';
import { BacklogModal } from './components/BacklogModal';
import { ActivityModal } from './components/ActivityModal';
import { PrintReportModal } from './components/PrintReportModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { DetailViewModal } from './components/DetailViewModal';
import { useAuth } from './context/AuthContext';
import { useSettings } from './context/SettingsContext';
import { AppModuleId, getAppSettings } from './services/settingsService';

// Views
import { DashboardDailyView } from './views/DashboardDailyView';
import { BapView } from './views/BapView';
import { DailyRigidView } from './views/DailyRigidView';
import { DailyArticView } from './views/DailyArticView';
import { BacklogView } from './views/BacklogView';
import { ActivitiesView } from './views/ActivitiesView';
import { UnitsView } from './views/UnitsView';
import { SettingsView } from './views/SettingsView';

// Icons for Quick Top Nav Bar
import { Zap, ShieldCheck, Tractor, AlertOctagon, Wrench, FileWarning, Layers, Truck, BarChart3, Sliders } from 'lucide-react';

export default function App() {
  const { isAdmin, isAuthenticated } = useAuth();
  const { settings, canAccessModule, getModulePermission, getFirstAccessibleModule } = useSettings();

  // Navigation: initialized from Settings defaultLandingTab
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => getFirstAccessibleModule(isAdmin));

  // Core Data Lists - initialized synchronously from localStorage
  const [codeUnits, setCodeUnits] = useState<CodeUnit[]>(() => getCodeUnits());
  const [bapList, setBapList] = useState<BAPRecord[]>(() => getBAPList());
  const [dailyRigidList, setDailyRigidList] = useState<DailyCheckRigid[]>(() => getDailyRigidList());
  const [dailyArticList, setDailyArticList] = useState<DailyCheckArtic[]>(() => getDailyArticList());
  const [backlogs, setBacklogs] = useState<BacklogItem[]>(() => getBacklogs());
  const [activities, setActivities] = useState<AddActivityItem[]>(() => getActivities());

  // Google Sheets Config & 2-Way Syncing
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(() => getStoredSheetsConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMode, setSyncMode] = useState<'idle' | 'pulling' | 'pushing'>('idle');
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Modals & Editing states
  // 1. BAP
  const [isBapModalOpen, setIsBapModalOpen] = useState(false);
  const [selectedUnitForBap, setSelectedUnitForBap] = useState<string>('');
  const [editingBapItem, setEditingBapItem] = useState<BAPRecord | null>(null);

  // 2. Rigid (QA 1 & QA 7)
  const [isRigidModalOpen, setIsRigidModalOpen] = useState(false);
  const [selectedUnitForRigid, setSelectedUnitForRigid] = useState<string>('');
  const [editingRigidItem, setEditingRigidItem] = useState<DailyCheckRigid | null>(null);
  const [rigidModalQaType, setRigidModalQaType] = useState<QAType>('QA1_PRE');

  // 3. Artic (QA 1 & QA 7)
  const [isArticModalOpen, setIsArticModalOpen] = useState(false);
  const [selectedUnitForArtic, setSelectedUnitForArtic] = useState<string>('');
  const [editingArticItem, setEditingArticItem] = useState<DailyCheckArtic | null>(null);
  const [articModalQaType, setArticModalQaType] = useState<QAType>('QA1_PRE');

  // 4. Backlog
  const [isBacklogModalOpen, setIsBacklogModalOpen] = useState(false);
  const [selectedUnitForBacklog, setSelectedUnitForBacklog] = useState<string>('');
  const [backlogSource, setBacklogSource] = useState<BacklogItem['sumberTemuan']>('MANUAL');
  const [editingBacklogItem, setEditingBacklogItem] = useState<BacklogItem | null>(null);

  // 5. Activity
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedUnitForActivity, setSelectedUnitForActivity] = useState<string>('');
  const [editingActivityItem, setEditingActivityItem] = useState<AddActivityItem | null>(null);

  // 6. Units
  const [isUnitsManagerModalOpen, setIsUnitsManagerModalOpen] = useState(false);

  // 7. Delete Confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    onConfirm: async () => {},
  });

  // PDF Printing Report
  const [printableReport, setPrintableReport] = useState<any | null>(null);

  // Detail View Modal State
  const [detailViewItem, setDetailViewItem] = useState<{
    isOpen: boolean;
    type: 'RIGID' | 'ARTIC' | 'BAP' | 'BACKLOG' | 'ACTIVITY' | 'UNIT';
    title: string;
    subtitle?: string;
    data: any;
    onEdit?: () => void;
    onPrint?: () => void;
  } | null>(null);

  // Toast Notification state
  const [toastNotification, setToastNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastNotification({ message, type });
    setTimeout(() => {
      setToastNotification(prev => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Load Initial Data on Mount & Google Sheets Default Database
  const reloadLocalState = useCallback(() => {
    setCodeUnits(getCodeUnits());
    setBapList(getBAPList());
    setDailyRigidList(getDailyRigidList());
    setDailyArticList(getDailyArticList());
    setBacklogs(getBacklogs());
    setActivities(getActivities());
    setSheetsConfig(getStoredSheetsConfig());
  }, []);

  // Track whether any form/edit modal is open or sync is active to prevent background polling from wiping active edits
  const isAnyModalOpen =
    isBapModalOpen ||
    isRigidModalOpen ||
    isArticModalOpen ||
    isBacklogModalOpen ||
    isActivityModalOpen ||
    isUnitsManagerModalOpen ||
    isSheetsModalOpen;
  const isAnyModalOpenRef = useRef(isAnyModalOpen);
  isAnyModalOpenRef.current = isAnyModalOpen;
  const isSyncingRef = useRef(isSyncing);
  isSyncingRef.current = isSyncing;

  // -------------------------------------------------------------
  // INITIAL STARTUP: SYNC DATABASE DEFAULT FROM CONNECTED GOOGLE SHEET
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    // 1. Load initial local storage data first, then hydrate Photo Vault (IndexedDB)
    reloadLocalState();

    // 2. Automatically sync and load default database directly from connected Google Sheet AFTER Photo Vault finishes initializing
    const syncDefaultDatabaseFromSheet = async () => {
      const cfg = getStoredSheetsConfig();
      if (!cfg || (!cfg.spreadsheetId && !cfg.webAppUrl)) {
        return;
      }

      const syncStartedAt = Date.now();
      try {
        setIsSyncing(true);
        setSyncMode('pulling');
        const pulled = await pullAllDataFromGoogleSheet();
        if (!isMounted) return;
        // Abort overwriting local state if user already opened a modal or made local edits while fetching
        if (
          isAnyModalOpenRef.current ||
          isBackgroundSyncInFlight() ||
          getLastLocalMutationAt() > syncStartedAt
        ) {
          return;
        }

        const hasRemoteData = (
          pulled.codeUnits.length > 0 ||
          pulled.bapList.length > 0 ||
          pulled.dailyRigidList.length > 0 ||
          pulled.dailyArticList.length > 0 ||
          pulled.backlogs.length > 0 ||
          pulled.activities.length > 0
        );

        if (hasRemoteData) {
          // Replace local database with Google Sheets data (preserving Photo Vault photos)
          replaceEntireDataset(pulled);
          reloadLocalState();
          showToast(`Database Google Sheet terhubung (${pulled.codeUnits.length} Unit terdaftar)`, 'success');
        }
      } catch (err: any) {
        console.warn('Initial Google Sheet sync notice:', err);
      } finally {
        if (isMounted) {
          setIsSyncing(false);
          setSyncMode('idle');
        }
      }
    };

    const initializeAppData = async () => {
      await initPhotoVault();
      if (!isMounted) return;
      reloadLocalState();
      if (getAppSettings().sync.autoSyncOnStartup) {
        await syncDefaultDatabaseFromSheet();
      }
    };

    void initializeAppData();

    const unsubscribe = initAuth(() => {
      setSheetsConfig(getStoredSheetsConfig());
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [reloadLocalState, showToast]);

  // -------------------------------------------------------------
  // TWO-WAY SYNC: PULL (TARIK DATA) & PUSH (KIRIM DATA)
  // -------------------------------------------------------------
  const handlePullData = async () => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Administrator yang dapat menarik data dari Google Sheet.', 'error');
      return;
    }
    if (!sheetsConfig?.spreadsheetId && !sheetsConfig?.webAppUrl) {
      setIsSheetsModalOpen(true);
      return;
    }
    try {
      setIsSyncing(true);
      setSyncMode('pulling');
      const pulled = await pullAllDataFromGoogleSheet();
      replaceEntireDataset(pulled);
      reloadLocalState();
      logCurrentUserActivity({
        actionType: 'SYNC_PULL',
        module: 'Google Sheet',
        description: `Tarik data dari Google Sheet (${pulled.codeUnits.length} Unit, ${pulled.bapList.length} BAP, ${pulled.dailyRigidList.length} Rigid, ${pulled.dailyArticList.length} Artic, ${pulled.backlogs.length} Backlog, ${pulled.activities.length} Activity)`,
      });
      showToast(
        `Berhasil menarik data dari Google Sheet: ${pulled.codeUnits.length} Unit, ${pulled.bapList.length} BAP, ${pulled.dailyRigidList.length} Rigid, ${pulled.dailyArticList.length} Artic, ${pulled.backlogs.length} Backlog`,
        'success'
      );
    } catch (err: any) {
      showToast(`Gagal menarik data dari Google Sheet: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
      setSyncMode('idle');
    }
  };

  const handlePushData = async () => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Administrator yang dapat mengirim data ke Google Sheet.', 'error');
      return;
    }
    if (!sheetsConfig?.spreadsheetId && !sheetsConfig?.webAppUrl) {
      setIsSheetsModalOpen(true);
      return;
    }
    try {
      setIsSyncing(true);
      setSyncMode('pushing');
      const snapshot = {
        codeUnits: getCodeUnits(),
        bapList: getBAPList(),
        dailyRigidList: getDailyRigidList(),
        dailyArticList: getDailyArticList(),
        backlogs: getBacklogs(),
        activities: getActivities(),
      };
      await pushAllDataToGoogleSheet(snapshot);
      reloadLocalState();
      logCurrentUserActivity({
        actionType: 'SYNC_PUSH',
        module: 'Google Sheet',
        description: `Kirim semua data lokal ke Google Sheet (${snapshot.codeUnits.length} Unit, ${snapshot.dailyRigidList.length} Rigid, ${snapshot.dailyArticList.length} Artic, ${snapshot.backlogs.length} Backlog)`,
      });
      showToast('Semua data lokal berhasil dikirim & tersimpan di Google Sheet!', 'success');
    } catch (err: any) {
      showToast(`Gagal mengirim data ke Google Sheet: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
      setSyncMode('idle');
    }
  };

  // Guard activeTab when user role changes or Admin disables a module
  useEffect(() => {
    if (!canAccessModule(activeTab, isAdmin)) {
      setActiveTab(getFirstAccessibleModule(isAdmin));
    }
  }, [activeTab, isAdmin, canAccessModule, getFirstAccessibleModule]);

  const navigateToTabSafely = useCallback(
    (tab: ActiveTab) => {
      if (tab === 'settings' && !isAdmin) {
        showToast('Akses ditolak: Modul SETTINGS hanya dapat diakses oleh ADMIN.', 'error');
        return;
      }
      if (!canAccessModule(tab, isAdmin)) {
        showToast('Modul ini sedang dinonaktifkan untuk User oleh Administrator.', 'error');
        return;
      }
      setActiveTab(tab);
    },
    [isAdmin, canAccessModule, showToast]
  );

  // Periodic 2-way sync polling (respecting Settings pollingIntervalSeconds)
  useEffect(() => {
    const intervalSec = settings.sync.pollingIntervalSeconds;
    if (!intervalSec || intervalSec <= 0) return;
    if (!sheetsConfig?.spreadsheetId && !sheetsConfig?.webAppUrl) return;

    const interval = setInterval(async () => {
      if (
        document.visibilityState !== 'visible' ||
        isSyncingRef.current ||
        isAnyModalOpenRef.current ||
        isBackgroundSyncInFlight() ||
        Date.now() - getLastLocalMutationAt() < 60000
      ) {
        return;
      }

      const pullStartedAt = Date.now();
      try {
        const pulled = await pullAllDataFromGoogleSheet();
        // Double-check after async pull so in-progress modal edits or recent saves are never overwritten
        if (
          isAnyModalOpenRef.current ||
          isBackgroundSyncInFlight() ||
          getLastLocalMutationAt() > pullStartedAt ||
          Date.now() - getLastLocalMutationAt() < 60000
        ) {
          return;
        }
        replaceEntireDataset(pulled);
        reloadLocalState();
      } catch {
        // Silent background sync
      }
    }, Math.max(10, intervalSec) * 1000);

    return () => clearInterval(interval);
  }, [sheetsConfig?.spreadsheetId, sheetsConfig?.webAppUrl, settings.sync.pollingIntervalSeconds, reloadLocalState]);

  // -------------------------------------------------------------
  // AUTOMATIC BACKGROUND SYNC TO GOOGLE SHEET (DEBOUNCED & NON-BLOCKING)
  // -------------------------------------------------------------
  const triggerBackgroundPush = useCallback(() => {
    autoSyncToGoogleSheetIfConnected();
  }, []);

  const checkPermission = useCallback(
    (moduleId: AppModuleId, action: 'create' | 'edit' | 'delete' | 'export'): boolean => {
      const perm = getModulePermission(moduleId, isAdmin);
      const allowed =
        action === 'create'
          ? perm.canCreate
          : action === 'edit'
          ? perm.canEdit
          : action === 'delete'
          ? perm.canDelete
          : perm.canExport;
      if (!allowed) {
        const actionLabel =
          action === 'create'
            ? 'Tambah'
            : action === 'edit'
            ? 'Edit'
            : action === 'delete'
            ? 'Hapus'
            : 'Cetak PDF / Share WA';
        showToast(
          `Izin ${actionLabel} pada modul "${perm.label}" dikunci oleh Administrator melalui SETTINGS.`,
          'error'
        );
      }
      return allowed;
    },
    [getModulePermission, isAdmin, showToast]
  );

  const handleOpenPrintableReport = useCallback(
    (
      moduleId: AppModuleId,
      reportData:
        | { type: 'BAP'; data: BAPRecord }
        | { type: 'DAILY_RIGID'; data: DailyCheckRigid }
        | { type: 'DAILY_ARTIC'; data: DailyCheckArtic }
        | { type: 'BACKLOG'; data: BacklogItem }
        | { type: 'ACTIVITY'; data: AddActivityItem }
    ) => {
      if (!checkPermission(moduleId, 'export')) return;
      logCurrentUserActivity({
        actionType: 'EXPORT_PDF',
        module: reportData.type,
        description: `Buka Cetak / Simpan PDF ${reportData.type} unit ${reportData.data.codeUnit} (${reportData.data.id})`,
      });
      setPrintableReport(reportData);
    },
    [checkPermission]
  );

  // -------------------------------------------------------------
  // CRUD HANDLERS (SEALU DISINKRONKAN DENGAN GOOGLE SHEET)
  // -------------------------------------------------------------

  // Master Unit Handlers
  const handleSaveUnit = (unit: CodeUnit) => {
    const isEdit = codeUnits.some(u => u.id === unit.id);
    const updated = addOrUpdateCodeUnit(unit);
    setCodeUnits([...updated]);
    logCurrentUserActivity({
      actionType: isEdit ? 'UPDATE' : 'CREATE',
      module: 'Code Unit',
      description: `${isEdit ? 'Edit' : 'Tambah'} Master Unit ${unit.codeUnit} (${unit.brand} ${unit.egi}, HM ${unit.currentHm}, Status: ${unit.statusUnit})`,
    });
    triggerBackgroundPush();
  };

  const handleDeleteUnit = (id: string, name: string) => {
    if (!checkPermission('units', 'delete')) return;
    const stats = getUnitStats(name);
    const relatedDesc =
      stats.inspectionCount + stats.bapCount + stats.backlogCount + stats.activityCount > 0
        ? ` Unit ini memiliki ${stats.inspectionCount} riwayat inspeksi QA, ${stats.bapCount} BAP, ${stats.backlogCount} backlog, dan ${stats.activityCount} aktivitas. Seluruh data terkait juga akan dihapus secara permanen!`
        : '';

    setDeleteDialog({
      isOpen: true,
      title: 'Hapus Permanen Data Master Unit?',
      message: `Apakah Anda yakin ingin menghapus Master Unit ${name}?${relatedDesc}`,
      itemName: `${name} (ID: ${id})`,
      onConfirm: async () => {
        const updated = await deleteCodeUnit(id, true);
        setCodeUnits([...updated]);
        setBapList(getBAPList());
        setDailyRigidList(getDailyRigidList());
        setDailyArticList(getDailyArticList());
        setBacklogs(getBacklogs());
        setActivities(getActivities());
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        logCurrentUserActivity({
          actionType: 'DELETE',
          module: 'Code Unit',
          description: `Hapus permanen Master Unit ${name} (ID: ${id}) beserta riwayat terkait`,
        });
        showToast(`Unit ${name} dan semua riwayat terkait berhasil dihapus secara permanen!`, 'info');
        triggerBackgroundPush();
      },
    });
  };

  // BAP Handlers
  const handleSaveBAP = async (item: BAPRecord) => {
    const isEdit = !!editingBapItem;
    if (editingBapItem) {
      const updated = await updateBAPRecord(item);
      setBapList([...updated]);
    } else {
      const updated = await addBAPRecord(item);
      setBapList([...updated]);
    }
    setCodeUnits(getCodeUnits());
    setEditingBapItem(item);
    logCurrentUserActivity({
      actionType: isEdit ? 'UPDATE' : 'CREATE',
      module: 'BAP',
      description: `${isEdit ? 'Edit' : 'Input'} BAP ${item.id} unit ${item.codeUnit} (MO: ${item.mo || '-'}, Status: ${item.status})`,
    });
    triggerBackgroundPush();
  };

  const handleDeleteBAP = (item: BAPRecord) => {
    if (!checkPermission('bap', 'delete')) return;
    setDeleteDialog({
      isOpen: true,
      title: 'Hapus Permanen Laporan BAP?',
      message: 'Apakah Anda yakin ingin menghapus Berita Acara Pemeriksaan (BAP) ini secara permanen dari database lokal dan Google Sheet?',
      itemName: `${item.id} - ${item.codeUnit} (${item.mo})`,
      onConfirm: async () => {
        const updated = await deleteBAPRecord(item.id);
        setBapList([...updated]);
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        logCurrentUserActivity({
          actionType: 'DELETE',
          module: 'BAP',
          description: `Hapus permanen BAP ${item.id} unit ${item.codeUnit}`,
        });
        showToast(`BAP ${item.id} (${item.codeUnit}) berhasil dihapus secara permanen!`, 'info');
        triggerBackgroundPush();
      },
    });
  };

  // Daily Rigid Handlers
  const handleSaveDailyRigid = async (item: DailyCheckRigid) => {
    const isEdit = !!editingRigidItem;
    if (editingRigidItem) {
      const updated = await updateDailyRigid(item);
      setDailyRigidList([...updated]);
    } else {
      const updated = await addDailyRigid(item);
      setDailyRigidList([...updated]);
    }
    setCodeUnits(getCodeUnits());
    setEditingRigidItem(item);
    const modName =
      item.qaType === 'QA7_FINAL'
        ? 'QA 7 Final Rigid'
        : item.qaType === 'QA1_PRE'
        ? 'QA 1 Pre Rigid'
        : 'Daily Rigid';
    logCurrentUserActivity({
      actionType: isEdit ? 'UPDATE' : 'CREATE',
      module: modName,
      description: `${isEdit ? 'Edit' : 'Input'} ${modName} unit ${item.codeUnit} (Tanggal: ${item.tanggal}, HM: ${item.hmUnit}, Status: ${item.status})`,
    });
    triggerBackgroundPush();
  };

  const handleDeleteDailyRigid = (item: DailyCheckRigid) => {
    const modId: AppModuleId =
      item.qaType === 'QA7_FINAL'
        ? 'qa7-rigid'
        : item.qaType === 'QA1_PRE'
        ? 'qa1-rigid'
        : 'daily-rigid';
    if (!checkPermission(modId, 'delete')) return;
    const titleText = item.qaType === 'QA7_FINAL' ? 'Hapus Permanen QA 7 Final Rigid?' : item.qaType === 'DAILY_INSPECTION' ? 'Hapus Permanen Daily Rigid?' : 'Hapus Permanen QA 1 Pre Rigid?';
    const modName =
      item.qaType === 'QA7_FINAL'
        ? 'QA 7 Final Rigid'
        : item.qaType === 'QA1_PRE'
        ? 'QA 1 Pre Rigid'
        : 'Daily Rigid';
    setDeleteDialog({
      isOpen: true,
      title: titleText,
      message: `Data hasil inspeksi harian unit ${item.codeUnit} tanggal ${item.tanggal} akan dihapus secara permanen dari sistem dan Google Sheet.`,
      itemName: `${item.id} - ${item.codeUnit} (${item.tanggal})`,
      onConfirm: async () => {
        const updated = await deleteDailyRigid(item.id);
        setDailyRigidList([...updated]);
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        logCurrentUserActivity({
          actionType: 'DELETE',
          module: modName,
          description: `Hapus ${modName} ${item.id} unit ${item.codeUnit} (${item.tanggal})`,
        });
        showToast(`Inspeksi Rigid ${item.id} berhasil dihapus secara permanen!`, 'info');
        triggerBackgroundPush();
      },
    });
  };

  // Daily Artic Handlers
  const handleSaveDailyArtic = async (item: DailyCheckArtic) => {
    const isEdit = !!editingArticItem;
    if (editingArticItem) {
      const updated = await updateDailyArtic(item);
      setDailyArticList([...updated]);
    } else {
      const updated = await addDailyArtic(item);
      setDailyArticList([...updated]);
    }
    setCodeUnits(getCodeUnits());
    setEditingArticItem(item);
    const modName =
      item.qaType === 'QA7_FINAL'
        ? 'QA 7 Final Artic'
        : item.qaType === 'QA1_PRE'
        ? 'QA 1 Pre Artic'
        : 'Daily Artic';
    logCurrentUserActivity({
      actionType: isEdit ? 'UPDATE' : 'CREATE',
      module: modName,
      description: `${isEdit ? 'Edit' : 'Input'} ${modName} unit ${item.codeUnit} (Tanggal: ${item.tanggal}, HM: ${item.hmUnit}, Status: ${item.status})`,
    });
    triggerBackgroundPush();
  };

  const handleDeleteDailyArtic = (item: DailyCheckArtic) => {
    const modId: AppModuleId =
      item.qaType === 'QA7_FINAL'
        ? 'qa7-artic'
        : item.qaType === 'QA1_PRE'
        ? 'qa1-artic'
        : 'daily-artic';
    if (!checkPermission(modId, 'delete')) return;
    const titleText = item.qaType === 'QA7_FINAL' ? 'Hapus Permanen QA 7 Final Artic?' : item.qaType === 'DAILY_INSPECTION' ? 'Hapus Permanen Daily Artic?' : 'Hapus Permanen QA 1 Pre Artic?';
    const modName =
      item.qaType === 'QA7_FINAL'
        ? 'QA 7 Final Artic'
        : item.qaType === 'QA1_PRE'
        ? 'QA 1 Pre Artic'
        : 'Daily Artic';
    setDeleteDialog({
      isOpen: true,
      title: titleText,
      message: `Data hasil inspeksi harian unit ${item.codeUnit} tanggal ${item.tanggal} akan dihapus secara permanen dari sistem dan Google Sheet.`,
      itemName: `${item.id} - ${item.codeUnit} (${item.tanggal})`,
      onConfirm: async () => {
        const updated = await deleteDailyArtic(item.id);
        setDailyArticList([...updated]);
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        logCurrentUserActivity({
          actionType: 'DELETE',
          module: modName,
          description: `Hapus ${modName} ${item.id} unit ${item.codeUnit} (${item.tanggal})`,
        });
        showToast(`Inspeksi Artic ${item.id} berhasil dihapus secara permanen!`, 'info');
        triggerBackgroundPush();
      },
    });
  };

  // Backlog Handlers
  const handleSaveBacklog = async (item: BacklogItem) => {
    const isEdit = !!editingBacklogItem;
    if (editingBacklogItem) {
      const updated = await updateBacklog(item);
      setBacklogs([...updated]);
    } else {
      const updated = await addBacklog(item);
      setBacklogs([...updated]);
    }
    setEditingBacklogItem(item);
    logCurrentUserActivity({
      actionType: isEdit ? 'UPDATE' : 'CREATE',
      module: 'Backlog',
      description: `${isEdit ? 'Edit' : 'Input'} Backlog ${item.id} unit ${item.codeUnit} (${item.deskripsiBacklog || item.partNumber}, Status: ${item.status})`,
    });
    triggerBackgroundPush();
  };

  const handleUpdateBacklogStatus = (id: string, status: BacklogItem['status']) => {
    if (!checkPermission('backlog', 'edit')) return;
    const updated = updateBacklogStatus(id, status);
    setBacklogs([...updated]);
    logCurrentUserActivity({
      actionType: 'UPDATE',
      module: 'Backlog',
      description: `Ubah status Backlog ${id} menjadi ${status}`,
    });
    triggerBackgroundPush();
  };

  const handleDeleteBacklog = (item: BacklogItem) => {
    if (!checkPermission('backlog', 'delete')) return;
    setDeleteDialog({
      isOpen: true,
      title: 'Hapus Permanen Data Backlog?',
      message: `Apakah Anda yakin ingin menghapus data backlog sparepart ${item.partNumber} unit ${item.codeUnit} secara permanen?`,
      itemName: `${item.id} - ${item.codeUnit} (Part: ${item.partNumber})`,
      onConfirm: async () => {
        const updated = await deleteBacklog(item.id);
        setBacklogs([...updated]);
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        logCurrentUserActivity({
          actionType: 'DELETE',
          module: 'Backlog',
          description: `Hapus permanen Backlog ${item.id} unit ${item.codeUnit} (${item.partNumber})`,
        });
        showToast(`Backlog ${item.id} (${item.partNumber}) berhasil dihapus secara permanen!`, 'info');
        triggerBackgroundPush();
      },
    });
  };

  // Activity Handlers
  const handleSaveActivity = async (item: AddActivityItem) => {
    const isEdit = !!editingActivityItem;
    if (editingActivityItem) {
      const updated = await updateActivity(item);
      setActivities([...updated]);
    } else {
      const updated = await addActivity(item);
      setActivities([...updated]);
    }
    setEditingActivityItem(item);
    logCurrentUserActivity({
      actionType: isEdit ? 'UPDATE' : 'CREATE',
      module: 'Add Activity',
      description: `${isEdit ? 'Edit' : 'Input'} Activity ${item.id} unit ${item.codeUnit} (${item.deskripsiAktivitas}, Status: ${item.status})`,
    });
    triggerBackgroundPush();
  };

  const handleUpdateActivityStatus = (id: string, status: AddActivityItem['status']) => {
    if (!checkPermission('activities', 'edit')) return;
    const updated = updateActivityStatus(id, status);
    setActivities([...updated]);
    logCurrentUserActivity({
      actionType: 'UPDATE',
      module: 'Add Activity',
      description: `Ubah status Activity ${id} menjadi ${status}`,
    });
    triggerBackgroundPush();
  };

  const handleDeleteActivity = (item: AddActivityItem) => {
    if (!checkPermission('activities', 'delete')) return;
    setDeleteDialog({
      isOpen: true,
      title: 'Hapus Permanen Aktivitas Mekanik?',
      message: `Apakah Anda yakin ingin menghapus catatan aktivitas unit ${item.codeUnit} ini secara permanen dari sistem dan Google Sheet?`,
      itemName: `${item.id} - ${item.codeUnit} (${item.deskripsiAktivitas.slice(0, 30)}...)`,
      onConfirm: async () => {
        const updated = await deleteActivity(item.id);
        setActivities([...updated]);
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        logCurrentUserActivity({
          actionType: 'DELETE',
          module: 'Add Activity',
          description: `Hapus permanen Activity ${item.id} unit ${item.codeUnit}`,
        });
        showToast(`Aktivitas ${item.id} berhasil dihapus secara permanen!`, 'info');
        triggerBackgroundPush();
      },
    });
  };

  // Open Edit Modals with guaranteed freshest updated data from current state
  const handleOpenEditDailyRigid = (item: DailyCheckRigid) => {
    const modId: AppModuleId =
      item.qaType === 'QA7_FINAL'
        ? 'qa7-rigid'
        : item.qaType === 'QA1_PRE'
        ? 'qa1-rigid'
        : 'daily-rigid';
    if (!checkPermission(modId, 'edit')) return;
    const latest = dailyRigidList.find(r => r.id === item.id) || item;
    setEditingRigidItem(latest);
    setSelectedUnitForRigid(latest.codeUnit);
    setRigidModalQaType(latest.qaType || 'DAILY_INSPECTION');
    setIsRigidModalOpen(true);
  };

  const handleOpenEditDailyArtic = (item: DailyCheckArtic) => {
    const modId: AppModuleId =
      item.qaType === 'QA7_FINAL'
        ? 'qa7-artic'
        : item.qaType === 'QA1_PRE'
        ? 'qa1-artic'
        : 'daily-artic';
    if (!checkPermission(modId, 'edit')) return;
    const latest = dailyArticList.find(a => a.id === item.id) || item;
    setEditingArticItem(latest);
    setSelectedUnitForArtic(latest.codeUnit);
    setArticModalQaType(latest.qaType || 'DAILY_INSPECTION');
    setIsArticModalOpen(true);
  };

  const handleOpenEditBacklog = (item: BacklogItem) => {
    if (!checkPermission('backlog', 'edit')) return;
    const latest =
      getBacklogs().find(b => b.id === item.id) ||
      backlogs.find(b => b.id === item.id) ||
      item;
    setEditingBacklogItem(latest);
    setSelectedUnitForBacklog(latest.codeUnit);
    setIsBacklogModalOpen(true);
  };

  const handleOpenEditBAP = (item: BAPRecord) => {
    if (!checkPermission('bap', 'edit')) return;
    const latest = bapList.find(b => b.id === item.id) || item;
    setEditingBapItem(latest);
    setSelectedUnitForBap(latest.codeUnit);
    setIsBapModalOpen(true);
  };

  const handleOpenEditActivity = (item: AddActivityItem) => {
    if (!checkPermission('activities', 'edit')) return;
    const latest =
      getActivities().find(a => a.id === item.id) ||
      activities.find(a => a.id === item.id) ||
      item;
    setEditingActivityItem(latest);
    setSelectedUnitForActivity(latest.codeUnit);
    setIsActivityModalOpen(true);
  };

  // Detail View Handlers for all modules
  const handleViewDailyRigid = (item: DailyCheckRigid) => {
    const currentItem = dailyRigidList.find(r => r.id === item.id) || item;
    const qaTitle =
      currentItem.qaType === 'DAILY_INSPECTION'
        ? 'Daily Inspection Rigid'
        : currentItem.qaType === 'QA7_FINAL'
        ? 'QA 7 Final Inspection Rigid'
        : 'QA 1 Pre Inspection Rigid';
    setDetailViewItem({
      isOpen: true,
      type: 'RIGID',
      title: `${qaTitle} - ${currentItem.codeUnit}`,
      subtitle: `ID: ${currentItem.id} | Tanggal: ${currentItem.tanggal} | Waktu: ${currentItem.startTime || '-'} - ${currentItem.finishTime || '-'} | GL: ${currentItem.divalidasiOleh || '-'}`,
      data: currentItem,
      onEdit: () => {
        setDetailViewItem(null);
        handleOpenEditDailyRigid(currentItem);
      },
      onPrint: () => {
        setDetailViewItem(null);
        setPrintableReport({ type: 'DAILY_RIGID', data: currentItem });
      },
    });
  };

  const handleViewDailyArtic = (item: DailyCheckArtic) => {
    const currentItem = dailyArticList.find(a => a.id === item.id) || item;
    const qaTitle =
      currentItem.qaType === 'DAILY_INSPECTION'
        ? 'Daily Inspection Artic'
        : currentItem.qaType === 'QA7_FINAL'
        ? 'QA 7 Final Inspection Artic'
        : 'QA 1 Pre Inspection Artic';
    setDetailViewItem({
      isOpen: true,
      type: 'ARTIC',
      title: `${qaTitle} - ${currentItem.codeUnit}`,
      subtitle: `ID: ${currentItem.id} | Tanggal: ${currentItem.tanggal} | Waktu: ${currentItem.startTime || '-'} - ${currentItem.finishTime || '-'} | GL: ${currentItem.divalidasiOleh || '-'}`,
      data: currentItem,
      onEdit: () => {
        setDetailViewItem(null);
        handleOpenEditDailyArtic(currentItem);
      },
      onPrint: () => {
        setDetailViewItem(null);
        setPrintableReport({ type: 'DAILY_ARTIC', data: currentItem });
      },
    });
  };

  const handleViewBacklog = (item: BacklogItem) => {
    const currentItem = backlogs.find(b => b.id === item.id) || item;
    setDetailViewItem({
      isOpen: true,
      type: 'BACKLOG',
      title: `Detail Backlog: ${currentItem.codeUnit}`,
      subtitle: `MO: ${currentItem.moBacklog || '-'} | Status: ${currentItem.status} | PIC: ${currentItem.pic} | Tanggal: ${currentItem.tanggalTemuan}`,
      data: currentItem,
      onEdit: () => {
        setDetailViewItem(null);
        handleOpenEditBacklog(currentItem);
      },
      onPrint: () => {
        setDetailViewItem(null);
        setPrintableReport({ type: 'BACKLOG', data: currentItem });
      },
    });
  };

  const handleViewBAP = (item: BAPRecord) => {
    const currentItem = bapList.find(b => b.id === item.id) || item;
    setDetailViewItem({
      isOpen: true,
      type: 'BAP',
      title: `Berita Acara Kerusakan: ${currentItem.codeUnit}`,
      subtitle: `Nomor BAP: ${currentItem.id} | MO: ${currentItem.mo || '-'} | Lokasi: ${currentItem.lokasiPekerjaan || '-'} | Status: ${currentItem.status}`,
      data: currentItem,
      onEdit: () => {
        setDetailViewItem(null);
        handleOpenEditBAP(currentItem);
      },
      onPrint: () => {
        setDetailViewItem(null);
        setPrintableReport({ type: 'BAP', data: currentItem });
      },
    });
  };

  const handleViewActivity = (item: AddActivityItem) => {
    const currentItem = activities.find(a => a.id === item.id) || item;
    setDetailViewItem({
      isOpen: true,
      type: 'ACTIVITY',
      title: `Detail Aktivitas Mekanik: ${currentItem.codeUnit}`,
      subtitle: `ID: ${currentItem.id} | Tanggal: ${currentItem.tanggalTemuan} | Status: ${currentItem.status} | PIC: ${currentItem.pic}`,
      data: currentItem,
      onEdit: () => {
        setDetailViewItem(null);
        handleOpenEditActivity(currentItem);
      },
      onPrint: () => {
        setDetailViewItem(null);
        setPrintableReport({ type: 'ACTIVITY', data: currentItem });
      },
    });
  };

  const handleViewUnit = (unit: CodeUnit) => {
    const currentUnit = codeUnits.find(u => u.id === unit.id || u.codeUnit === unit.codeUnit) || unit;
    setDetailViewItem({
      isOpen: true,
      type: 'UNIT',
      title: `Profil Armada: ${currentUnit.codeUnit}`,
      subtitle: `${currentUnit.brand} ${currentUnit.egi} | PIT: ${currentUnit.lokasiPit} | Status: ${currentUnit.statusUnit} | ${currentUnit.currentHm.toLocaleString()} HM`,
      data: currentUnit,
      onEdit: () => {
        setDetailViewItem(null);
        setIsUnitsManagerModalOpen(true);
      },
    });
  };

  // Counts for badges
  const openBapCount = bapList.filter(b => b.status === 'OPEN').length;
  const activeBacklogCount = backlogs.filter(b => b.status !== 'CLOSED').length;
  const rigidOnlyInspections = dailyRigidList.filter(i => isRigidUnitCode(i.codeUnit));
  const articOnlyInspections = dailyArticList.filter(i => isArticUnitCode(i.codeUnit));
  const dailyRigidCount = rigidOnlyInspections.filter(i => (i.qaType || 'DAILY_INSPECTION') === 'DAILY_INSPECTION').length;
  const dailyArticCount = articOnlyInspections.filter(i => (i.qaType || 'DAILY_INSPECTION') === 'DAILY_INSPECTION').length;
  const qa1RigidCount = rigidOnlyInspections.filter(i => (i.qaType || 'QA1_PRE') === 'QA1_PRE').length;
  const qa7RigidCount = rigidOnlyInspections.filter(i => i.qaType === 'QA7_FINAL').length;
  const qa1ArticCount = articOnlyInspections.filter(i => (i.qaType || 'QA1_PRE') === 'QA1_PRE').length;
  const qa7ArticCount = articOnlyInspections.filter(i => i.qaType === 'QA7_FINAL').length;

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg,#111113)] text-[var(--ink,#f2efeb)] flex flex-col lg:grid lg:grid-cols-[280px_1fr] font-sans selection:bg-[#facc15] selection:text-[#111113]">
      {/* Desktop Sidebar Navigation (Variation 2) */}
      <Sidebar
        activeTab={activeTab}
        onChangeTab={navigateToTabSafely}
        dailyRigidCount={dailyRigidCount}
        dailyArticCount={dailyArticCount}
        qa1RigidCount={qa1RigidCount}
        qa7RigidCount={qa7RigidCount}
        qa1ArticCount={qa1ArticCount}
        qa7ArticCount={qa7ArticCount}
        activeBacklogCount={activeBacklogCount}
        activitiesCount={activities.length}
        openBapCount={openBapCount}
        codeUnitsCount={codeUnits.length}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Global In-App Toast Notification */}
        {toastNotification && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-60 px-4 py-2 rounded text-xs font-mono font-semibold shadow-2xl flex items-center space-x-2 border transition max-w-lg ${
              toastNotification.type === 'error'
                ? 'bg-[#18181b] border-[#fb7185] text-[#fb7185]'
                : toastNotification.type === 'info'
                ? 'bg-[#18181b] border-[#38bdf8] text-[#38bdf8]'
                : 'bg-[#18181b] border-[#4ade80] text-[#4ade80]'
            }`}
          >
            <span>{toastNotification.message}</span>
          </div>
        )}

        {/* Top Header with 2-Way Sync Controls */}
        <Header
          sheetsConfig={sheetsConfig}
          isSyncing={isSyncing}
          syncMode={syncMode}
          onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
          onPullData={handlePullData}
          onPushData={handlePushData}
          codeUnits={codeUnits}
          backlogs={backlogs}
          bapList={bapList}
          dailyRigidList={dailyRigidList}
          dailyArticList={dailyArticList}
          activities={activities}
          onNavigateToTab={navigateToTabSafely}
        />

        {/* Mobile Quick-Switch Bar (hidden on desktop because sidebar is active) */}
        <div className="lg:hidden no-print bg-[#18181b] border-b border-[rgba(242,239,235,0.1)] sticky top-[53px] z-20 shadow-sm">
          <div className="w-full px-2 py-1.5 flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
          {/* MENU UTAMA: DASHBOARD PENCAPAIAN */}
          {canAccessModule('dashboard', isAdmin) && (
            <button
              onClick={() => navigateToTabSafely('dashboard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap flex items-center space-x-1.5 transition border ${
                activeTab === 'dashboard'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/25 ring-2 ring-amber-400/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-amber-400 border-amber-500/30'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{settings.modules.dashboard?.label || 'DASHBOARD'}</span>
            </button>
          )}

          {/* MENU UTAMA: DAILY INSPECTION RIGID */}
          {canAccessModule('daily-rigid', isAdmin) && (
            <button
              onClick={() => navigateToTabSafely('daily-rigid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap flex items-center space-x-1.5 transition border ${
                activeTab === 'daily-rigid'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-amber-400 border-amber-500/30'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{settings.modules['daily-rigid']?.label || 'DAILY RIGID'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'daily-rigid' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {dailyRigidCount}
              </span>
            </button>
          )}

          {/* MENU UTAMA: DAILY INSPECTION ARTIC */}
          {canAccessModule('daily-artic', isAdmin) && (
            <button
              onClick={() => navigateToTabSafely('daily-artic')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap flex items-center space-x-1.5 transition border ${
                activeTab === 'daily-artic'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-emerald-400 border-emerald-500/30'
              }`}
            >
              <Tractor className="w-3.5 h-3.5" />
              <span>{settings.modules['daily-artic']?.label || 'DAILY ARTIC'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'daily-artic' ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {dailyArticCount}
              </span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-700/60 mx-1 shrink-0" />

          {/* 1. QA 1 PRE RIGID */}
          {canAccessModule('qa1-rigid', isAdmin) && (
            <button
              onClick={() => navigateToTabSafely('qa1-rigid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
                activeTab === 'qa1-rigid'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>1. {settings.modules['qa1-rigid']?.label || 'QA 1 PRE RIGID'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'qa1-rigid' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}>
                {qa1RigidCount}
              </span>
            </button>
          )}

          {/* 2. QA 7 FINAL RIGID */}
          {canAccessModule('qa7-rigid', isAdmin) && (
            <button
              onClick={() => navigateToTabSafely('qa7-rigid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
                activeTab === 'qa7-rigid'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>2. {settings.modules['qa7-rigid']?.label || 'QA 7 FINAL RIGID'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'qa7-rigid' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}>
                {qa7RigidCount}
              </span>
            </button>
          )}

          {/* 3. QA 1 PRE ARTIC */}
          {canAccessModule('qa1-artic', isAdmin) && (
            <button
              onClick={() => navigateToTabSafely('qa1-artic')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
                activeTab === 'qa1-artic'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Tractor className="w-3.5 h-3.5" />
              <span>3. {settings.modules['qa1-artic']?.label || 'QA 1 PRE ARTIC'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'qa1-artic' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}>
                {qa1ArticCount}
              </span>
            </button>
          )}

          {/* 4. QA 7 FINAL ARTIC */}
          {canAccessModule('qa7-artic', isAdmin) && (
            <button
              onClick={() => navigateToTabSafely('qa7-artic')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
                activeTab === 'qa7-artic'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>4. {settings.modules['qa7-artic']?.label || 'QA 7 FINAL ARTIC'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'qa7-artic' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}>
                {qa7ArticCount}
              </span>
            </button>
          )}

          {/* BACKLOG */}
          {canAccessModule('backlog', isAdmin) && (
            <button
              onClick={() => navigateToTabSafely('backlog')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
                activeTab === 'backlog'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>{settings.modules.backlog?.label || 'BACKLOG'}</span>
              {activeBacklogCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {activeBacklogCount}
                </span>
              )}
            </button>
          )}

          {/* ACTIVITIES */}
          {canAccessModule('activities', isAdmin) && (
            <button
              onClick={() => navigateToTabSafely('activities')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
                activeTab === 'activities'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{settings.modules.activities?.label || 'ADD ACTIVITIES'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'activities' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}>
                {activities.length}
              </span>
            </button>
          )}

          {/* BAP */}
          {canAccessModule('bap', isAdmin) && (
            <button
              onClick={() => navigateToTabSafely('bap')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
                activeTab === 'bap'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileWarning className="w-3.5 h-3.5" />
              <span>{settings.modules.bap?.label || 'BAP'}</span>
              {openBapCount > 0 && (
                <span className="bg-rose-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {openBapCount}
                </span>
              )}
            </button>
          )}

          {/* CODE UNIT */}
          {canAccessModule('units', isAdmin) && (
            <button
              onClick={() => navigateToTabSafely('units')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
                activeTab === 'units'
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{settings.modules.units?.label || 'CODE UNIT'} ({codeUnits.length})</span>
            </button>
          )}

          {/* ADMIN-ONLY SETTINGS TAB IN MOBILE BAR */}
          {isAdmin && (
            <button
              onClick={() => navigateToTabSafely('settings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap flex items-center space-x-1.5 transition border ${
                activeTab === 'settings'
                  ? 'bg-[#facc15] text-[#111113] border-[#facc15] shadow-md shadow-[#facc15]/25'
                  : 'bg-[#facc15]/10 hover:bg-[#facc15]/20 text-[#facc15] border-[#facc15]/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>SETTINGS (ADMIN)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto p-3 sm:p-5 ${activeTab === 'dashboard' || activeTab === 'settings' ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {/* DASHBOARD PENCAPAIAN DAILY (HARIAN, BULANAN, TAHUNAN) */}
        {activeTab === 'dashboard' && (
          <DashboardDailyView
            dailyRigidList={dailyRigidList}
            dailyArticList={dailyArticList}
            codeUnits={codeUnits}
            bapList={bapList}
            backlogs={backlogs}
            activities={activities}
            onOpenRigidForUnit={(cu, qaType) => {
              const targetQa = qaType || 'DAILY_INSPECTION';
              const modId: AppModuleId =
                targetQa === 'QA7_FINAL' ? 'qa7-rigid' : targetQa === 'QA1_PRE' ? 'qa1-rigid' : 'daily-rigid';
              if (!checkPermission(modId, 'create')) return;
              setSelectedUnitForRigid(cu);
              setEditingRigidItem(null);
              setRigidModalQaType(targetQa);
              setIsRigidModalOpen(true);
            }}
            onOpenArticForUnit={(cu, qaType) => {
              const targetQa = qaType || 'DAILY_INSPECTION';
              const modId: AppModuleId =
                targetQa === 'QA7_FINAL' ? 'qa7-artic' : targetQa === 'QA1_PRE' ? 'qa1-artic' : 'daily-artic';
              if (!checkPermission(modId, 'create')) return;
              setSelectedUnitForArtic(cu);
              setEditingArticItem(null);
              setArticModalQaType(targetQa);
              setIsArticModalOpen(true);
            }}
            onNavigateToTab={tab => navigateToTabSafely(tab as ActiveTab)}
          />
        )}

        {/* MENU UTAMA 1: DAILY INSPECTION RIGID (Isinya sama dengan QA 7) */}
        {activeTab === 'daily-rigid' && (
          <DailyRigidView
            list={dailyRigidList}
            backlogs={backlogs}
            activities={activities}
            activeQaType="DAILY_INSPECTION"
            onChangeQaType={t => {
              if (t === 'DAILY_INSPECTION') navigateToTabSafely('daily-rigid');
              else if (t === 'QA1_PRE') navigateToTabSafely('qa1-rigid');
              else if (t === 'QA7_FINAL') navigateToTabSafely('qa7-rigid');
            }}
            onOpenCreate={type => {
              const targetQa = type || 'DAILY_INSPECTION';
              const modId: AppModuleId =
                targetQa === 'QA7_FINAL' ? 'qa7-rigid' : targetQa === 'QA1_PRE' ? 'qa1-rigid' : 'daily-rigid';
              if (!checkPermission(modId, 'create')) return;
              setSelectedUnitForRigid('');
              setEditingRigidItem(null);
              setRigidModalQaType(targetQa);
              setIsRigidModalOpen(true);
            }}
            onViewItem={handleViewDailyRigid}
            onEditItem={handleOpenEditDailyRigid}
            onDeleteItem={handleDeleteDailyRigid}
            onPrintPreview={item => handleOpenPrintableReport('daily-rigid', { type: 'DAILY_RIGID', data: item })}
            onOpenAddBacklog={cu => {
              if (!checkPermission('backlog', 'create')) return;
              setSelectedUnitForBacklog(cu);
              setBacklogSource('DAILY_RIGID');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenAddActivity={cu => {
              if (!checkPermission('activities', 'create')) return;
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewBacklog={handleViewBacklog}
            onEditBacklog={handleOpenEditBacklog}
          />
        )}

        {/* MENU UTAMA 2: DAILY INSPECTION ARTIC (Isinya sama dengan QA 7) */}
        {activeTab === 'daily-artic' && (
          <DailyArticView
            list={dailyArticList}
            backlogs={backlogs}
            activities={activities}
            activeQaType="DAILY_INSPECTION"
            onChangeQaType={t => {
              if (t === 'DAILY_INSPECTION') navigateToTabSafely('daily-artic');
              else if (t === 'QA1_PRE') navigateToTabSafely('qa1-artic');
              else if (t === 'QA7_FINAL') navigateToTabSafely('qa7-artic');
            }}
            onOpenCreate={type => {
              const targetQa = type || 'DAILY_INSPECTION';
              const modId: AppModuleId =
                targetQa === 'QA7_FINAL' ? 'qa7-artic' : targetQa === 'QA1_PRE' ? 'qa1-artic' : 'daily-artic';
              if (!checkPermission(modId, 'create')) return;
              setSelectedUnitForArtic('');
              setEditingArticItem(null);
              setArticModalQaType(targetQa);
              setIsArticModalOpen(true);
            }}
            onViewItem={handleViewDailyArtic}
            onEditItem={handleOpenEditDailyArtic}
            onDeleteItem={handleDeleteDailyArtic}
            onPrintPreview={item => handleOpenPrintableReport('daily-artic', { type: 'DAILY_ARTIC', data: item })}
            onOpenAddBacklog={cu => {
              if (!checkPermission('backlog', 'create')) return;
              setSelectedUnitForBacklog(cu);
              setBacklogSource('DAILY_ARTIC');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenAddActivity={cu => {
              if (!checkPermission('activities', 'create')) return;
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewBacklog={handleViewBacklog}
            onEditBacklog={handleOpenEditBacklog}
          />
        )}

        {/* MENU 1: QA 1 PRE INSPECTION RIGID */}
        {activeTab === 'qa1-rigid' && (
          <DailyRigidView
            list={dailyRigidList}
            backlogs={backlogs}
            activities={activities}
            activeQaType="QA1_PRE"
            onChangeQaType={t => {
              if (t === 'DAILY_INSPECTION') navigateToTabSafely('daily-rigid');
              else if (t === 'QA7_FINAL') navigateToTabSafely('qa7-rigid');
              else if (t === 'QA1_PRE') navigateToTabSafely('qa1-rigid');
            }}
            onOpenCreate={type => {
              const targetQa = type || 'QA1_PRE';
              const modId: AppModuleId =
                targetQa === 'QA7_FINAL' ? 'qa7-rigid' : targetQa === 'DAILY_INSPECTION' ? 'daily-rigid' : 'qa1-rigid';
              if (!checkPermission(modId, 'create')) return;
              setSelectedUnitForRigid('');
              setEditingRigidItem(null);
              setRigidModalQaType(targetQa);
              setIsRigidModalOpen(true);
            }}
            onViewItem={handleViewDailyRigid}
            onEditItem={handleOpenEditDailyRigid}
            onDeleteItem={handleDeleteDailyRigid}
            onPrintPreview={item => handleOpenPrintableReport('qa1-rigid', { type: 'DAILY_RIGID', data: item })}
            onOpenAddBacklog={cu => {
              if (!checkPermission('backlog', 'create')) return;
              setSelectedUnitForBacklog(cu);
              setBacklogSource('QA1_RIGID');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenAddActivity={cu => {
              if (!checkPermission('activities', 'create')) return;
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewBacklog={handleViewBacklog}
            onEditBacklog={handleOpenEditBacklog}
          />
        )}

        {/* MENU 2: QA 7 FINAL INSPECTION RIGID */}
        {activeTab === 'qa7-rigid' && (
          <DailyRigidView
            list={dailyRigidList}
            backlogs={backlogs}
            activities={activities}
            activeQaType="QA7_FINAL"
            onChangeQaType={t => {
              if (t === 'DAILY_INSPECTION') navigateToTabSafely('daily-rigid');
              else if (t === 'QA1_PRE') navigateToTabSafely('qa1-rigid');
              else if (t === 'QA7_FINAL') navigateToTabSafely('qa7-rigid');
            }}
            onOpenCreate={type => {
              const targetQa = type || 'QA7_FINAL';
              const modId: AppModuleId =
                targetQa === 'QA1_PRE' ? 'qa1-rigid' : targetQa === 'DAILY_INSPECTION' ? 'daily-rigid' : 'qa7-rigid';
              if (!checkPermission(modId, 'create')) return;
              setSelectedUnitForRigid('');
              setEditingRigidItem(null);
              setRigidModalQaType(targetQa);
              setIsRigidModalOpen(true);
            }}
            onViewItem={handleViewDailyRigid}
            onEditItem={handleOpenEditDailyRigid}
            onDeleteItem={handleDeleteDailyRigid}
            onPrintPreview={item => handleOpenPrintableReport('qa7-rigid', { type: 'DAILY_RIGID', data: item })}
            onOpenAddBacklog={cu => {
              if (!checkPermission('backlog', 'create')) return;
              setSelectedUnitForBacklog(cu);
              setBacklogSource('QA7_RIGID');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenAddActivity={cu => {
              if (!checkPermission('activities', 'create')) return;
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewBacklog={handleViewBacklog}
            onEditBacklog={handleOpenEditBacklog}
          />
        )}

        {/* MENU 3: QA 1 PRE INSPECTION ARTIC */}
        {activeTab === 'qa1-artic' && (
          <DailyArticView
            list={dailyArticList}
            backlogs={backlogs}
            activities={activities}
            activeQaType="QA1_PRE"
            onChangeQaType={t => {
              if (t === 'DAILY_INSPECTION') navigateToTabSafely('daily-artic');
              else if (t === 'QA7_FINAL') navigateToTabSafely('qa7-artic');
              else if (t === 'QA1_PRE') navigateToTabSafely('qa1-artic');
            }}
            onOpenCreate={type => {
              const targetQa = type || 'QA1_PRE';
              const modId: AppModuleId =
                targetQa === 'QA7_FINAL' ? 'qa7-artic' : targetQa === 'DAILY_INSPECTION' ? 'daily-artic' : 'qa1-artic';
              if (!checkPermission(modId, 'create')) return;
              setSelectedUnitForArtic('');
              setEditingArticItem(null);
              setArticModalQaType(targetQa);
              setIsArticModalOpen(true);
            }}
            onViewItem={handleViewDailyArtic}
            onEditItem={handleOpenEditDailyArtic}
            onDeleteItem={handleDeleteDailyArtic}
            onPrintPreview={item => handleOpenPrintableReport('qa1-artic', { type: 'DAILY_ARTIC', data: item })}
            onOpenAddBacklog={cu => {
              if (!checkPermission('backlog', 'create')) return;
              setSelectedUnitForBacklog(cu);
              setBacklogSource('QA1_ARTIC');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenAddActivity={cu => {
              if (!checkPermission('activities', 'create')) return;
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewBacklog={handleViewBacklog}
            onEditBacklog={handleOpenEditBacklog}
          />
        )}

        {/* MENU 4: QA 7 FINAL INSPECTION ARTIC */}
        {activeTab === 'qa7-artic' && (
          <DailyArticView
            list={dailyArticList}
            backlogs={backlogs}
            activities={activities}
            activeQaType="QA7_FINAL"
            onChangeQaType={t => {
              if (t === 'DAILY_INSPECTION') navigateToTabSafely('daily-artic');
              else if (t === 'QA1_PRE') navigateToTabSafely('qa1-artic');
              else if (t === 'QA7_FINAL') navigateToTabSafely('qa7-artic');
            }}
            onOpenCreate={type => {
              const targetQa = type || 'QA7_FINAL';
              const modId: AppModuleId =
                targetQa === 'QA1_PRE' ? 'qa1-artic' : targetQa === 'DAILY_INSPECTION' ? 'daily-artic' : 'qa7-artic';
              if (!checkPermission(modId, 'create')) return;
              setSelectedUnitForArtic('');
              setEditingArticItem(null);
              setArticModalQaType(targetQa);
              setIsArticModalOpen(true);
            }}
            onViewItem={handleViewDailyArtic}
            onEditItem={handleOpenEditDailyArtic}
            onDeleteItem={handleDeleteDailyArtic}
            onPrintPreview={item => handleOpenPrintableReport('qa7-artic', { type: 'DAILY_ARTIC', data: item })}
            onOpenAddBacklog={cu => {
              if (!checkPermission('backlog', 'create')) return;
              setSelectedUnitForBacklog(cu);
              setBacklogSource('QA7_ARTIC');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenAddActivity={cu => {
              if (!checkPermission('activities', 'create')) return;
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewBacklog={handleViewBacklog}
            onEditBacklog={handleOpenEditBacklog}
          />
        )}

        {/* MENU BACKLOG (CONNECTED TO CODE UNIT) */}
        {activeTab === 'backlog' && (
          <BacklogView
            backlogs={backlogs}
            units={codeUnits}
            onOpenCreate={() => {
              if (!checkPermission('backlog', 'create')) return;
              setSelectedUnitForBacklog('');
              setBacklogSource('MANUAL');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onViewItem={handleViewBacklog}
            onEditItem={handleOpenEditBacklog}
            onDeleteItem={handleDeleteBacklog}
            onUpdateStatus={handleUpdateBacklogStatus}
            onPrintPreview={item => handleOpenPrintableReport('backlog', { type: 'BACKLOG', data: item })}
          />
        )}

        {/* MENU ADD ACTIVITIES MEKANIK (CONNECTED TO CODE UNIT) */}
        {activeTab === 'activities' && (
          <ActivitiesView
            activities={activities}
            units={codeUnits}
            onOpenCreate={() => {
              if (!checkPermission('activities', 'create')) return;
              setSelectedUnitForActivity('');
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewItem={handleViewActivity}
            onEditItem={handleOpenEditActivity}
            onDeleteItem={handleDeleteActivity}
            onUpdateStatus={handleUpdateActivityStatus}
            onPrintPreview={item => handleOpenPrintableReport('activities', { type: 'ACTIVITY', data: item })}
          />
        )}

        {/* BAP */}
        {activeTab === 'bap' && (
          <BapView
            bapList={bapList}
            onOpenCreateModal={() => {
              if (!checkPermission('bap', 'create')) return;
              setSelectedUnitForBap('');
              setEditingBapItem(null);
              setIsBapModalOpen(true);
            }}
            onViewBAP={handleViewBAP}
            onEditBAP={handleOpenEditBAP}
            onDeleteBAP={handleDeleteBAP}
            onPrintPreview={bap => handleOpenPrintableReport('bap', { type: 'BAP', data: bap })}
          />
        )}

        {/* MASTER CODE UNIT */}
        {activeTab === 'units' && (
          <UnitsView
            units={codeUnits}
            onOpenManageUnits={() => {
              if (!checkPermission('units', 'create')) return;
              setIsUnitsManagerModalOpen(true);
            }}
            onViewUnit={handleViewUnit}
            onEditUnit={() => {
              if (!checkPermission('units', 'edit')) return;
              setIsUnitsManagerModalOpen(true);
            }}
            onDeleteUnit={handleDeleteUnit}
            onOpenBapForUnit={cu => {
              if (!checkPermission('bap', 'create')) return;
              setSelectedUnitForBap(cu);
              setEditingBapItem(null);
              setIsBapModalOpen(true);
            }}
            onOpenRigidForUnit={(cu, qaType) => {
              const targetQa = qaType || 'QA1_PRE';
              const modId: AppModuleId =
                targetQa === 'QA7_FINAL' ? 'qa7-rigid' : targetQa === 'DAILY_INSPECTION' ? 'daily-rigid' : 'qa1-rigid';
              if (!checkPermission(modId, 'create')) return;
              setSelectedUnitForRigid(cu);
              setEditingRigidItem(null);
              setRigidModalQaType(targetQa);
              setIsRigidModalOpen(true);
            }}
            onOpenArticForUnit={(cu, qaType) => {
              const targetQa = qaType || 'QA1_PRE';
              const modId: AppModuleId =
                targetQa === 'QA7_FINAL' ? 'qa7-artic' : targetQa === 'DAILY_INSPECTION' ? 'daily-artic' : 'qa1-artic';
              if (!checkPermission(modId, 'create')) return;
              setSelectedUnitForArtic(cu);
              setEditingArticItem(null);
              setArticModalQaType(targetQa);
              setIsArticModalOpen(true);
            }}
            onOpenBacklogForUnit={cu => {
              if (!checkPermission('backlog', 'create')) return;
              setSelectedUnitForBacklog(cu);
              setBacklogSource('MANUAL');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenActivityForUnit={cu => {
              if (!checkPermission('activities', 'create')) return;
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
          />
        )}

        {/* MODUL SETTINGS (KHUSUS ADMIN) */}
        {activeTab === 'settings' && (
          <SettingsView
            codeUnits={codeUnits}
            bapList={bapList}
            dailyRigidList={dailyRigidList}
            dailyArticList={dailyArticList}
            backlogs={backlogs}
            activities={activities}
            sheetsConfig={sheetsConfig}
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
            onPullData={handlePullData}
            onPushData={handlePushData}
            isSyncing={isSyncing}
            onDatasetReloaded={reloadLocalState}
            onShowToast={showToast}
            onNavigateBack={() => navigateToTabSafely(getFirstAccessibleModule(isAdmin))}
          />
        )}
      </main>
      </div>

      {/* Android Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={navigateToTabSafely}
        openBapCount={openBapCount}
        activeBacklogCount={activeBacklogCount}
        dailyRigidCount={dailyRigidCount}
        dailyArticCount={dailyArticCount}
        qa1RigidCount={qa1RigidCount}
        qa7RigidCount={qa7RigidCount}
        qa1ArticCount={qa1ArticCount}
        qa7ArticCount={qa7ArticCount}
      />

      {/* -------------------- MODALS -------------------- */}

      {/* 1. Modal QA Rigid (Daily Inspection, QA 1 Pre & QA 7 Final) */}
      <DailyRigidModal
        isOpen={isRigidModalOpen}
        onClose={() => {
          setIsRigidModalOpen(false);
          setEditingRigidItem(null);
        }}
        units={codeUnits}
        initialCodeUnit={selectedUnitForRigid}
        itemToEdit={editingRigidItem}
        qaType={rigidModalQaType}
        backlogs={backlogs}
        activities={activities}
        onSave={handleSaveDailyRigid}
        onPrintPreview={item => {
          const modId: AppModuleId =
            item.qaType === 'QA7_FINAL' ? 'qa7-rigid' : item.qaType === 'QA1_PRE' ? 'qa1-rigid' : 'daily-rigid';
          handleOpenPrintableReport(modId, { type: 'DAILY_RIGID', data: item });
        }}
        onOpenAddBacklog={cu => {
          if (!checkPermission('backlog', 'create')) return;
          setSelectedUnitForBacklog(cu);
          setBacklogSource(rigidModalQaType === 'DAILY_INSPECTION' ? 'DAILY_RIGID' : rigidModalQaType === 'QA7_FINAL' ? 'QA7_RIGID' : 'QA1_RIGID');
          setEditingBacklogItem(null);
          setIsBacklogModalOpen(true);
        }}
        onOpenEditBacklog={handleOpenEditBacklog}
        onOpenViewBacklog={item => {
          handleViewBacklog(item);
        }}
        onOpenAddActivity={cu => {
          if (!checkPermission('activities', 'create')) return;
          setSelectedUnitForActivity(cu);
          setEditingActivityItem(null);
          setIsActivityModalOpen(true);
        }}
      />

      {/* 2. Modal QA Artic (Daily Inspection, QA 1 Pre & QA 7 Final) */}
      <DailyArticModal
        isOpen={isArticModalOpen}
        onClose={() => {
          setIsArticModalOpen(false);
          setEditingArticItem(null);
        }}
        units={codeUnits}
        initialCodeUnit={selectedUnitForArtic}
        itemToEdit={editingArticItem}
        qaType={articModalQaType}
        backlogs={backlogs}
        activities={activities}
        onSave={handleSaveDailyArtic}
        onPrintPreview={item => {
          const modId: AppModuleId =
            item.qaType === 'QA7_FINAL' ? 'qa7-artic' : item.qaType === 'QA1_PRE' ? 'qa1-artic' : 'daily-artic';
          handleOpenPrintableReport(modId, { type: 'DAILY_ARTIC', data: item });
        }}
        onOpenAddBacklog={cu => {
          if (!checkPermission('backlog', 'create')) return;
          setSelectedUnitForBacklog(cu);
          setBacklogSource(articModalQaType === 'DAILY_INSPECTION' ? 'DAILY_ARTIC' : articModalQaType === 'QA7_FINAL' ? 'QA7_ARTIC' : 'QA1_ARTIC');
          setEditingBacklogItem(null);
          setIsBacklogModalOpen(true);
        }}
        onOpenEditBacklog={handleOpenEditBacklog}
        onOpenViewBacklog={item => {
          handleViewBacklog(item);
        }}
        onOpenAddActivity={cu => {
          if (!checkPermission('activities', 'create')) return;
          setSelectedUnitForActivity(cu);
          setEditingActivityItem(null);
          setIsActivityModalOpen(true);
        }}
      />

      {/* 3. Modal Backlog */}
      <BacklogModal
        isOpen={isBacklogModalOpen}
        onClose={() => {
          setIsBacklogModalOpen(false);
          setEditingBacklogItem(null);
        }}
        units={codeUnits}
        initialCodeUnit={selectedUnitForBacklog}
        source={backlogSource}
        itemToEdit={editingBacklogItem}
        onSave={handleSaveBacklog}
      />

      {/* 4. Modal Add Activity */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => {
          setIsActivityModalOpen(false);
          setEditingActivityItem(null);
        }}
        units={codeUnits}
        initialCodeUnit={selectedUnitForActivity}
        itemToEdit={editingActivityItem}
        onSave={handleSaveActivity}
      />

      {/* 5. Modal BAP */}
      <BapModal
        isOpen={isBapModalOpen}
        onClose={() => {
          setIsBapModalOpen(false);
          setEditingBapItem(null);
        }}
        units={codeUnits}
        initialCodeUnit={selectedUnitForBap}
        itemToEdit={editingBapItem}
        onSaveBAP={handleSaveBAP}
        onPrintPreview={bap => handleOpenPrintableReport('bap', { type: 'BAP', data: bap })}
      />

      {/* 6. Modal Master Code Unit */}
      <CodeUnitManagerModal
        isOpen={isUnitsManagerModalOpen}
        onClose={() => setIsUnitsManagerModalOpen(false)}
        units={codeUnits}
        onSaveUnit={handleSaveUnit}
        onDeleteUnit={handleDeleteUnit}
        onSyncToSheet={handlePushData}
      />

      {/* 7. Modal Google Sheet Configuration & 2-Way Sync */}
      <GoogleSheetModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        config={sheetsConfig}
        onConfigUpdated={(cfg: GoogleSheetsConfig | null) => {
          setSheetsConfig(cfg);
          if (cfg) showToast('Google Sheet berhasil terhubung!', 'success');
        }}
        onDatasetReloaded={reloadLocalState}
      />

      {/* 8. Modal Print / Download PDF Report */}
      <PrintReportModal
        isOpen={!!printableReport}
        onClose={() => setPrintableReport(null)}
        report={printableReport}
        allBacklogs={backlogs}
        allActivities={activities}
      />

      {/* 9. Modal Konfirmasi Hapus */}
      <ConfirmDeleteModal
        isOpen={deleteDialog.isOpen}
        onCancel={() => setDeleteDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteDialog.onConfirm}
        title={deleteDialog.title}
        message={deleteDialog.message}
        itemName={deleteDialog.itemName}
      />

      {/* 10. Modal Lihat Detail Semua Modul */}
      <DetailViewModal
        isOpen={!!detailViewItem?.isOpen}
        onClose={() => setDetailViewItem(null)}
        type={detailViewItem?.type || 'RIGID'}
        title={detailViewItem?.title || ''}
        subtitle={detailViewItem?.subtitle}
        data={detailViewItem?.data}
        allBacklogs={backlogs}
        allActivities={activities}
        onEdit={detailViewItem?.onEdit}
        onPrint={detailViewItem?.onPrint}
        onViewBacklog={handleViewBacklog}
        onOpenEditBacklog={handleOpenEditBacklog}
      />
    </div>
  );
}
