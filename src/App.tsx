import React, { useState, useEffect, useCallback } from 'react';
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
} from './services/storageService';
import {
  getStoredSheetsConfig,
  pushAllDataToGoogleSheet,
  pullAllDataFromGoogleSheet,
} from './services/googleSheetsService';
import { initAuth } from './services/firebaseAuth';

// Components
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

// Views
import { DashboardDailyView } from './views/DashboardDailyView';
import { BapView } from './views/BapView';
import { DailyRigidView } from './views/DailyRigidView';
import { DailyArticView } from './views/DailyArticView';
import { BacklogView } from './views/BacklogView';
import { ActivitiesView } from './views/ActivitiesView';
import { UnitsView } from './views/UnitsView';

// Icons for Quick Top Nav Bar
import { Zap, ShieldCheck, Tractor, AlertOctagon, Wrench, FileWarning, Layers, Truck, ClipboardCheck, BarChart3 } from 'lucide-react';

export default function App() {
  // Navigation: default to DAILY INSPECTION RIGID
  const [activeTab, setActiveTab] = useState<ActiveTab>('daily-rigid');

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

  // -------------------------------------------------------------
  // INITIAL STARTUP: SYNC DATABASE DEFAULT FROM CONNECTED GOOGLE SHEET
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    // 1. Load initial local storage data first
    reloadLocalState();

    // 2. Automatically sync and load default database directly from connected Google Sheet
    const syncDefaultDatabaseFromSheet = async () => {
      const cfg = getStoredSheetsConfig();
      if (!cfg || (!cfg.spreadsheetId && !cfg.webAppUrl)) {
        return;
      }

      try {
        setIsSyncing(true);
        setSyncMode('pulling');
        const pulled = await pullAllDataFromGoogleSheet();
        if (!isMounted) return;

        const hasRemoteData = (
          pulled.codeUnits.length > 0 ||
          pulled.bapList.length > 0 ||
          pulled.dailyRigidList.length > 0 ||
          pulled.dailyArticList.length > 0 ||
          pulled.backlogs.length > 0 ||
          pulled.activities.length > 0
        );

        if (hasRemoteData) {
          // Replace local database with Google Sheets data (Requirement 2: Database default adalah data dari Google sheets yang terhubung)
          replaceEntireDataset(pulled);
          setCodeUnits(pulled.codeUnits);
          setBapList(pulled.bapList);
          setDailyRigidList(pulled.dailyRigidList);
          setDailyArticList(pulled.dailyArticList);
          setBacklogs(pulled.backlogs);
          setActivities(pulled.activities);
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

    syncDefaultDatabaseFromSheet();

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
    if (!sheetsConfig?.spreadsheetId && !sheetsConfig?.webAppUrl) {
      setIsSheetsModalOpen(true);
      return;
    }
    try {
      setIsSyncing(true);
      setSyncMode('pushing');
      await pushAllDataToGoogleSheet({
        codeUnits: getCodeUnits(),
        bapList: getBAPList(),
        dailyRigidList: getDailyRigidList(),
        dailyArticList: getDailyArticList(),
        backlogs: getBacklogs(),
        activities: getActivities(),
      });
      reloadLocalState();
      showToast('Semua data lokal berhasil dikirim & tersimpan di Google Sheet!', 'success');
    } catch (err: any) {
      showToast(`Gagal mengirim data ke Google Sheet: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
      setSyncMode('idle');
    }
  };

  // Periodic 2-way sync polling
  useEffect(() => {
    if (!sheetsConfig?.spreadsheetId && !sheetsConfig?.webAppUrl) return;

    const interval = setInterval(async () => {
      if (document.visibilityState === 'visible' && !isSyncing) {
        try {
          const pulled = await pullAllDataFromGoogleSheet();
          replaceEntireDataset(pulled);
          reloadLocalState();
        } catch {
          // Silent background sync
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [sheetsConfig?.spreadsheetId, sheetsConfig?.webAppUrl, isSyncing, reloadLocalState]);

  // -------------------------------------------------------------
  // AUTOMATIC BACKGROUND SYNC TO GOOGLE SHEET
  // -------------------------------------------------------------
  const triggerBackgroundPush = useCallback(async () => {
    const config = getStoredSheetsConfig();
    if (!config?.spreadsheetId && !config?.webAppUrl) return;
    try {
      await pushAllDataToGoogleSheet({
        codeUnits: getCodeUnits(),
        bapList: getBAPList(),
        dailyRigidList: getDailyRigidList(),
        dailyArticList: getDailyArticList(),
        backlogs: getBacklogs(),
        activities: getActivities(),
      });
      setSheetsConfig(getStoredSheetsConfig());
    } catch (err) {
      console.warn('Background auto-sync notification:', err);
    }
  }, []);

  // -------------------------------------------------------------
  // CRUD HANDLERS (SEALU DISINKRONKAN DENGAN GOOGLE SHEET)
  // -------------------------------------------------------------

  // Master Unit Handlers
  const handleSaveUnit = (unit: CodeUnit) => {
    const updated = addOrUpdateCodeUnit(unit);
    setCodeUnits([...updated]);
    triggerBackgroundPush();
  };

  const handleDeleteUnit = (id: string, name: string) => {
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
        showToast(`Unit ${name} dan semua riwayat terkait berhasil dihapus secara permanen!`, 'info');
        triggerBackgroundPush();
      },
    });
  };

  // BAP Handlers
  const handleSaveBAP = async (item: BAPRecord) => {
    if (editingBapItem) {
      const updated = await updateBAPRecord(item);
      setBapList([...updated]);
    } else {
      const updated = await addBAPRecord(item);
      setBapList([...updated]);
    }
    setCodeUnits(getCodeUnits());
    setEditingBapItem(null);
    triggerBackgroundPush();
  };

  const handleDeleteBAP = (item: BAPRecord) => {
    setDeleteDialog({
      isOpen: true,
      title: 'Hapus Permanen Laporan BAP?',
      message: 'Apakah Anda yakin ingin menghapus Berita Acara Pemeriksaan (BAP) ini secara permanen dari database lokal dan Google Sheet?',
      itemName: `${item.id} - ${item.codeUnit} (${item.mo})`,
      onConfirm: async () => {
        const updated = await deleteBAPRecord(item.id);
        setBapList([...updated]);
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        showToast(`BAP ${item.id} (${item.codeUnit}) berhasil dihapus secara permanen!`, 'info');
        triggerBackgroundPush();
      },
    });
  };

  // Daily Rigid Handlers
  const handleSaveDailyRigid = async (item: DailyCheckRigid) => {
    if (editingRigidItem) {
      const updated = await updateDailyRigid(item);
      setDailyRigidList([...updated]);
    } else {
      const updated = await addDailyRigid(item);
      setDailyRigidList([...updated]);
    }
    setCodeUnits(getCodeUnits());
    setEditingRigidItem(null);
    triggerBackgroundPush();
  };

  const handleDeleteDailyRigid = (item: DailyCheckRigid) => {
    const titleText = item.qaType === 'QA7_FINAL' ? 'Hapus Permanen QA 7 Final Rigid?' : item.qaType === 'DAILY_INSPECTION' ? 'Hapus Permanen Daily Rigid?' : 'Hapus Permanen QA 1 Pre Rigid?';
    setDeleteDialog({
      isOpen: true,
      title: titleText,
      message: `Data hasil inspeksi harian unit ${item.codeUnit} tanggal ${item.tanggal} akan dihapus secara permanen dari sistem dan Google Sheet.`,
      itemName: `${item.id} - ${item.codeUnit} (${item.tanggal})`,
      onConfirm: async () => {
        const updated = await deleteDailyRigid(item.id);
        setDailyRigidList([...updated]);
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        showToast(`Inspeksi Rigid ${item.id} berhasil dihapus secara permanen!`, 'info');
        triggerBackgroundPush();
      },
    });
  };

  // Daily Artic Handlers
  const handleSaveDailyArtic = async (item: DailyCheckArtic) => {
    if (editingArticItem) {
      const updated = await updateDailyArtic(item);
      setDailyArticList([...updated]);
    } else {
      const updated = await addDailyArtic(item);
      setDailyArticList([...updated]);
    }
    setCodeUnits(getCodeUnits());
    setEditingArticItem(null);
    triggerBackgroundPush();
  };

  const handleDeleteDailyArtic = (item: DailyCheckArtic) => {
    const titleText = item.qaType === 'QA7_FINAL' ? 'Hapus Permanen QA 7 Final Artic?' : item.qaType === 'DAILY_INSPECTION' ? 'Hapus Permanen Daily Artic?' : 'Hapus Permanen QA 1 Pre Artic?';
    setDeleteDialog({
      isOpen: true,
      title: titleText,
      message: `Data hasil inspeksi harian unit ${item.codeUnit} tanggal ${item.tanggal} akan dihapus secara permanen dari sistem dan Google Sheet.`,
      itemName: `${item.id} - ${item.codeUnit} (${item.tanggal})`,
      onConfirm: async () => {
        const updated = await deleteDailyArtic(item.id);
        setDailyArticList([...updated]);
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        showToast(`Inspeksi Artic ${item.id} berhasil dihapus secara permanen!`, 'info');
        triggerBackgroundPush();
      },
    });
  };

  // Backlog Handlers
  const handleSaveBacklog = async (item: BacklogItem) => {
    if (editingBacklogItem) {
      const updated = await updateBacklog(item);
      setBacklogs([...updated]);
    } else {
      const updated = await addBacklog(item);
      setBacklogs([...updated]);
    }
    setEditingBacklogItem(null);
    triggerBackgroundPush();
  };

  const handleUpdateBacklogStatus = (id: string, status: BacklogItem['status']) => {
    const updated = updateBacklogStatus(id, status);
    setBacklogs([...updated]);
    triggerBackgroundPush();
  };

  const handleDeleteBacklog = (item: BacklogItem) => {
    setDeleteDialog({
      isOpen: true,
      title: 'Hapus Permanen Data Backlog?',
      message: `Apakah Anda yakin ingin menghapus data backlog sparepart ${item.partNumber} unit ${item.codeUnit} secara permanen?`,
      itemName: `${item.id} - ${item.codeUnit} (Part: ${item.partNumber})`,
      onConfirm: async () => {
        const updated = await deleteBacklog(item.id);
        setBacklogs([...updated]);
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        showToast(`Backlog ${item.id} (${item.partNumber}) berhasil dihapus secara permanen!`, 'info');
        triggerBackgroundPush();
      },
    });
  };

  // Activity Handlers
  const handleSaveActivity = async (item: AddActivityItem) => {
    if (editingActivityItem) {
      const updated = await updateActivity(item);
      setActivities([...updated]);
    } else {
      const updated = await addActivity(item);
      setActivities([...updated]);
    }
    setEditingActivityItem(null);
    triggerBackgroundPush();
  };

  const handleUpdateActivityStatus = (id: string, status: AddActivityItem['status']) => {
    const updated = updateActivityStatus(id, status);
    setActivities([...updated]);
    triggerBackgroundPush();
  };

  const handleDeleteActivity = (item: AddActivityItem) => {
    setDeleteDialog({
      isOpen: true,
      title: 'Hapus Permanen Aktivitas Mekanik?',
      message: `Apakah Anda yakin ingin menghapus catatan aktivitas unit ${item.codeUnit} ini secara permanen dari sistem dan Google Sheet?`,
      itemName: `${item.id} - ${item.codeUnit} (${item.deskripsiAktivitas.slice(0, 30)}...)`,
      onConfirm: async () => {
        const updated = await deleteActivity(item.id);
        setActivities([...updated]);
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        showToast(`Aktivitas ${item.id} berhasil dihapus secara permanen!`, 'info');
        triggerBackgroundPush();
      },
    });
  };

  // Detail View Handlers for all modules
  const handleViewDailyRigid = (item: DailyCheckRigid) => {
    const qaTitle =
      item.qaType === 'DAILY_INSPECTION'
        ? 'Daily Inspection Rigid'
        : item.qaType === 'QA7_FINAL'
        ? 'QA 7 Final Inspection Rigid'
        : 'QA 1 Pre Inspection Rigid';
    setDetailViewItem({
      isOpen: true,
      type: 'RIGID',
      title: `${qaTitle} - ${item.codeUnit}`,
      subtitle: `ID: ${item.id} | Tanggal: ${item.tanggal} | Waktu: ${item.startTime || '-'} - ${item.finishTime || '-'} | GL: ${item.divalidasiOleh || '-'}`,
      data: item,
      onEdit: () => {
        setDetailViewItem(null);
        setEditingRigidItem(item);
        setSelectedUnitForRigid(item.codeUnit);
        setRigidModalQaType(item.qaType || 'DAILY_INSPECTION');
        setIsRigidModalOpen(true);
      },
      onPrint: () => {
        setDetailViewItem(null);
        setPrintableReport({ type: 'DAILY_RIGID', data: item });
      },
    });
  };

  const handleViewDailyArtic = (item: DailyCheckArtic) => {
    const qaTitle =
      item.qaType === 'DAILY_INSPECTION'
        ? 'Daily Inspection Artic'
        : item.qaType === 'QA7_FINAL'
        ? 'QA 7 Final Inspection Artic'
        : 'QA 1 Pre Inspection Artic';
    setDetailViewItem({
      isOpen: true,
      type: 'ARTIC',
      title: `${qaTitle} - ${item.codeUnit}`,
      subtitle: `ID: ${item.id} | Tanggal: ${item.tanggal} | Waktu: ${item.startTime || '-'} - ${item.finishTime || '-'} | GL: ${item.divalidasiOleh || '-'}`,
      data: item,
      onEdit: () => {
        setDetailViewItem(null);
        setEditingArticItem(item);
        setSelectedUnitForArtic(item.codeUnit);
        setArticModalQaType(item.qaType || 'DAILY_INSPECTION');
        setIsArticModalOpen(true);
      },
      onPrint: () => {
        setDetailViewItem(null);
        setPrintableReport({ type: 'DAILY_ARTIC', data: item });
      },
    });
  };

  const handleViewBacklog = (item: BacklogItem) => {
    setDetailViewItem({
      isOpen: true,
      type: 'BACKLOG',
      title: `Detail Backlog: ${item.codeUnit}`,
      subtitle: `MO: ${item.moBacklog || '-'} | Status: ${item.status} | PIC: ${item.pic} | Tanggal: ${item.tanggalTemuan}`,
      data: item,
      onEdit: () => {
        setDetailViewItem(null);
        setEditingBacklogItem(item);
        setSelectedUnitForBacklog(item.codeUnit);
        setIsBacklogModalOpen(true);
      },
      onPrint: () => {
        setDetailViewItem(null);
        setPrintableReport({ type: 'BACKLOG', data: item });
      },
    });
  };

  const handleViewBAP = (item: BAPRecord) => {
    setDetailViewItem({
      isOpen: true,
      type: 'BAP',
      title: `Berita Acara Kerusakan: ${item.codeUnit}`,
      subtitle: `Nomor BAP: ${item.id} | MO: ${item.mo || '-'} | Lokasi: ${item.lokasiPekerjaan || '-'} | Status: ${item.status}`,
      data: item,
      onEdit: () => {
        setDetailViewItem(null);
        setEditingBapItem(item);
        setSelectedUnitForBap(item.codeUnit);
        setIsBapModalOpen(true);
      },
      onPrint: () => {
        setDetailViewItem(null);
        setPrintableReport({ type: 'BAP', data: item });
      },
    });
  };

  const handleViewActivity = (item: AddActivityItem) => {
    setDetailViewItem({
      isOpen: true,
      type: 'ACTIVITY',
      title: `Detail Aktivitas Mekanik: ${item.codeUnit}`,
      subtitle: `ID: ${item.id} | Tanggal: ${item.tanggalTemuan} | Status: ${item.status} | PIC: ${item.pic}`,
      data: item,
      onEdit: () => {
        setDetailViewItem(null);
        setEditingActivityItem(item);
        setSelectedUnitForActivity(item.codeUnit);
        setIsActivityModalOpen(true);
      },
      onPrint: () => {
        setDetailViewItem(null);
        setPrintableReport({ type: 'ACTIVITY', data: item });
      },
    });
  };

  const handleViewUnit = (unit: CodeUnit) => {
    setDetailViewItem({
      isOpen: true,
      type: 'UNIT',
      title: `Profil Armada: ${unit.codeUnit}`,
      subtitle: `${unit.brand} ${unit.egi} | PIT: ${unit.lokasiPit} | Status: ${unit.statusUnit} | ${unit.currentHm.toLocaleString()} HM`,
      data: unit,
      onEdit: () => {
        setDetailViewItem(null);
        setIsUnitsManagerModalOpen(true);
      },
    });
  };

  // Counts for badges
  const openBapCount = bapList.filter(b => b.status === 'OPEN').length;
  const activeBacklogCount = backlogs.filter(b => b.status !== 'CLOSED').length;
  const dailyRigidCount = dailyRigidList.filter(i => (i.qaType || 'DAILY_INSPECTION') === 'DAILY_INSPECTION').length;
  const dailyArticCount = dailyArticList.filter(i => (i.qaType || 'DAILY_INSPECTION') === 'DAILY_INSPECTION').length;
  const qa1RigidCount = dailyRigidList.filter(i => (i.qaType || 'QA1_PRE') === 'QA1_PRE').length;
  const qa7RigidCount = dailyRigidList.filter(i => i.qaType === 'QA7_FINAL').length;
  const qa1ArticCount = dailyArticList.filter(i => (i.qaType || 'QA1_PRE') === 'QA1_PRE').length;
  const qa7ArticCount = dailyArticList.filter(i => i.qaType === 'QA7_FINAL').length;

  return (
    <div className="min-h-screen bg-[var(--bg,#111113)] text-[var(--ink,#f2efeb)] flex flex-col lg:grid lg:grid-cols-[280px_1fr] font-sans selection:bg-[#facc15] selection:text-[#111113]">
      {/* Desktop Sidebar Navigation (Variation 2) */}
      <Sidebar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
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
          onNavigateToTab={tab => setActiveTab(tab)}
        />

        {/* Mobile Quick-Switch Bar (hidden on desktop because sidebar is active) */}
        <div className="lg:hidden no-print bg-[#18181b] border-b border-[rgba(242,239,235,0.1)] sticky top-[53px] z-20 shadow-sm">
          <div className="w-full px-2 py-1.5 flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
          {/* MENU UTAMA: DASHBOARD PENCAPAIAN */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap flex items-center space-x-1.5 transition border ${
              activeTab === 'dashboard'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/25 ring-2 ring-amber-400/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-amber-400 border-amber-500/30'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>DASHBOARD</span>
          </button>

          {/* MENU UTAMA: DAILY INSPECTION RIGID */}
          <button
            onClick={() => setActiveTab('daily-rigid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap flex items-center space-x-1.5 transition border ${
              activeTab === 'daily-rigid'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-amber-400 border-amber-500/30'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>DAILY RIGID</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'daily-rigid' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {dailyRigidCount}
            </span>
          </button>

          {/* MENU UTAMA: DAILY INSPECTION ARTIC */}
          <button
            onClick={() => setActiveTab('daily-artic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap flex items-center space-x-1.5 transition border ${
              activeTab === 'daily-artic'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <Tractor className="w-3.5 h-3.5" />
            <span>DAILY ARTIC</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'daily-artic' ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {dailyArticCount}
            </span>
          </button>

          <div className="h-4 w-px bg-slate-700/60 mx-1 shrink-0" />

          {/* 1. QA 1 PRE RIGID */}
          <button
            onClick={() => setActiveTab('qa1-rigid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'qa1-rigid'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>1. QA 1 PRE RIGID</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'qa1-rigid' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
            }`}>
              {qa1RigidCount}
            </span>
          </button>

          {/* 2. QA 7 FINAL RIGID */}
          <button
            onClick={() => setActiveTab('qa7-rigid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'qa7-rigid'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>2. QA 7 FINAL RIGID</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'qa7-rigid' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
            }`}>
              {qa7RigidCount}
            </span>
          </button>

          {/* 3. QA 1 PRE ARTIC */}
          <button
            onClick={() => setActiveTab('qa1-artic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'qa1-artic'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Tractor className="w-3.5 h-3.5" />
            <span>3. QA 1 PRE ARTIC</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'qa1-artic' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
            }`}>
              {qa1ArticCount}
            </span>
          </button>

          {/* 4. QA 7 FINAL ARTIC */}
          <button
            onClick={() => setActiveTab('qa7-artic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'qa7-artic'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>4. QA 7 FINAL ARTIC</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'qa7-artic' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
            }`}>
              {qa7ArticCount}
            </span>
          </button>

          {/* BACKLOG */}
          <button
            onClick={() => setActiveTab('backlog')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'backlog'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>BACKLOG</span>
            {activeBacklogCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                {activeBacklogCount}
              </span>
            )}
          </button>

          {/* ACTIVITIES */}
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'activities'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>ADD ACTIVITIES</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'activities' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
            }`}>
              {activities.length}
            </span>
          </button>

          {/* BAP */}
          <button
            onClick={() => setActiveTab('bap')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'bap'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <FileWarning className="w-3.5 h-3.5" />
            <span>BAP</span>
            {openBapCount > 0 && (
              <span className="bg-rose-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                {openBapCount}
              </span>
            )}
          </button>

          {/* CODE UNIT */}
          <button
            onClick={() => setActiveTab('units')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition ${
              activeTab === 'units'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>CODE UNIT ({codeUnits.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto p-3 sm:p-5 ${activeTab === 'dashboard' ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {/* DASHBOARD PENCAPAIAN DAILY (HARIAN, BULANAN, TAHUNAN) */}
        {activeTab === 'dashboard' && (
          <DashboardDailyView
            dailyRigidList={dailyRigidList}
            dailyArticList={dailyArticList}
            codeUnits={codeUnits}
            backlogs={backlogs}
            activities={activities}
            onOpenRigidForUnit={(cu, qaType) => {
              setSelectedUnitForRigid(cu);
              setEditingRigidItem(null);
              setRigidModalQaType(qaType || 'DAILY_INSPECTION');
              setIsRigidModalOpen(true);
            }}
            onOpenArticForUnit={(cu, qaType) => {
              setSelectedUnitForArtic(cu);
              setEditingArticItem(null);
              setArticModalQaType(qaType || 'DAILY_INSPECTION');
              setIsArticModalOpen(true);
            }}
            onNavigateToTab={tab => setActiveTab(tab as ActiveTab)}
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
              if (t === 'DAILY_INSPECTION') setActiveTab('daily-rigid');
              else if (t === 'QA1_PRE') setActiveTab('qa1-rigid');
              else if (t === 'QA7_FINAL') setActiveTab('qa7-rigid');
            }}
            onOpenCreate={type => {
              setSelectedUnitForRigid('');
              setEditingRigidItem(null);
              setRigidModalQaType(type || 'DAILY_INSPECTION');
              setIsRigidModalOpen(true);
            }}
            onViewItem={handleViewDailyRigid}
            onEditItem={item => {
              setEditingRigidItem(item);
              setSelectedUnitForRigid(item.codeUnit);
              setRigidModalQaType(item.qaType || 'DAILY_INSPECTION');
              setIsRigidModalOpen(true);
            }}
            onDeleteItem={handleDeleteDailyRigid}
            onPrintPreview={item => setPrintableReport({ type: 'DAILY_RIGID', data: item })}
            onOpenAddBacklog={cu => {
              setSelectedUnitForBacklog(cu);
              setBacklogSource('DAILY_RIGID');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenAddActivity={cu => {
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewBacklog={handleViewBacklog}
            onEditBacklog={item => {
              setEditingBacklogItem(item);
              setSelectedUnitForBacklog(item.codeUnit);
              setIsBacklogModalOpen(true);
            }}
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
              if (t === 'DAILY_INSPECTION') setActiveTab('daily-artic');
              else if (t === 'QA1_PRE') setActiveTab('qa1-artic');
              else if (t === 'QA7_FINAL') setActiveTab('qa7-artic');
            }}
            onOpenCreate={type => {
              setSelectedUnitForArtic('');
              setEditingArticItem(null);
              setArticModalQaType(type || 'DAILY_INSPECTION');
              setIsArticModalOpen(true);
            }}
            onViewItem={handleViewDailyArtic}
            onEditItem={item => {
              setEditingArticItem(item);
              setSelectedUnitForArtic(item.codeUnit);
              setArticModalQaType(item.qaType || 'DAILY_INSPECTION');
              setIsArticModalOpen(true);
            }}
            onDeleteItem={handleDeleteDailyArtic}
            onPrintPreview={item => setPrintableReport({ type: 'DAILY_ARTIC', data: item })}
            onOpenAddBacklog={cu => {
              setSelectedUnitForBacklog(cu);
              setBacklogSource('DAILY_ARTIC');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenAddActivity={cu => {
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewBacklog={handleViewBacklog}
            onEditBacklog={item => {
              setEditingBacklogItem(item);
              setSelectedUnitForBacklog(item.codeUnit);
              setIsBacklogModalOpen(true);
            }}
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
              if (t === 'DAILY_INSPECTION') setActiveTab('daily-rigid');
              else if (t === 'QA7_FINAL') setActiveTab('qa7-rigid');
              else if (t === 'QA1_PRE') setActiveTab('qa1-rigid');
            }}
            onOpenCreate={type => {
              setSelectedUnitForRigid('');
              setEditingRigidItem(null);
              setRigidModalQaType(type || 'QA1_PRE');
              setIsRigidModalOpen(true);
            }}
            onViewItem={handleViewDailyRigid}
            onEditItem={item => {
              setEditingRigidItem(item);
              setSelectedUnitForRigid(item.codeUnit);
              setRigidModalQaType(item.qaType || 'QA1_PRE');
              setIsRigidModalOpen(true);
            }}
            onDeleteItem={handleDeleteDailyRigid}
            onPrintPreview={item => setPrintableReport({ type: 'DAILY_RIGID', data: item })}
            onOpenAddBacklog={cu => {
              setSelectedUnitForBacklog(cu);
              setBacklogSource('QA1_RIGID');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenAddActivity={cu => {
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewBacklog={handleViewBacklog}
            onEditBacklog={item => {
              setEditingBacklogItem(item);
              setSelectedUnitForBacklog(item.codeUnit);
              setIsBacklogModalOpen(true);
            }}
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
              if (t === 'DAILY_INSPECTION') setActiveTab('daily-rigid');
              else if (t === 'QA1_PRE') setActiveTab('qa1-rigid');
              else if (t === 'QA7_FINAL') setActiveTab('qa7-rigid');
            }}
            onOpenCreate={type => {
              setSelectedUnitForRigid('');
              setEditingRigidItem(null);
              setRigidModalQaType(type || 'QA7_FINAL');
              setIsRigidModalOpen(true);
            }}
            onViewItem={handleViewDailyRigid}
            onEditItem={item => {
              setEditingRigidItem(item);
              setSelectedUnitForRigid(item.codeUnit);
              setRigidModalQaType(item.qaType || 'QA7_FINAL');
              setIsRigidModalOpen(true);
            }}
            onDeleteItem={handleDeleteDailyRigid}
            onPrintPreview={item => setPrintableReport({ type: 'DAILY_RIGID', data: item })}
            onOpenAddBacklog={cu => {
              setSelectedUnitForBacklog(cu);
              setBacklogSource('QA7_RIGID');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenAddActivity={cu => {
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewBacklog={handleViewBacklog}
            onEditBacklog={item => {
              setEditingBacklogItem(item);
              setSelectedUnitForBacklog(item.codeUnit);
              setIsBacklogModalOpen(true);
            }}
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
              if (t === 'DAILY_INSPECTION') setActiveTab('daily-artic');
              else if (t === 'QA7_FINAL') setActiveTab('qa7-artic');
              else if (t === 'QA1_PRE') setActiveTab('qa1-artic');
            }}
            onOpenCreate={type => {
              setSelectedUnitForArtic('');
              setEditingArticItem(null);
              setArticModalQaType(type || 'QA1_PRE');
              setIsArticModalOpen(true);
            }}
            onViewItem={handleViewDailyArtic}
            onEditItem={item => {
              setEditingArticItem(item);
              setSelectedUnitForArtic(item.codeUnit);
              setArticModalQaType(item.qaType || 'QA1_PRE');
              setIsArticModalOpen(true);
            }}
            onDeleteItem={handleDeleteDailyArtic}
            onPrintPreview={item => setPrintableReport({ type: 'DAILY_ARTIC', data: item })}
            onOpenAddBacklog={cu => {
              setSelectedUnitForBacklog(cu);
              setBacklogSource('QA1_ARTIC');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenAddActivity={cu => {
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewBacklog={handleViewBacklog}
            onEditBacklog={item => {
              setEditingBacklogItem(item);
              setSelectedUnitForBacklog(item.codeUnit);
              setIsBacklogModalOpen(true);
            }}
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
              if (t === 'DAILY_INSPECTION') setActiveTab('daily-artic');
              else if (t === 'QA1_PRE') setActiveTab('qa1-artic');
              else if (t === 'QA7_FINAL') setActiveTab('qa7-artic');
            }}
            onOpenCreate={type => {
              setSelectedUnitForArtic('');
              setEditingArticItem(null);
              setArticModalQaType(type || 'QA7_FINAL');
              setIsArticModalOpen(true);
            }}
            onViewItem={handleViewDailyArtic}
            onEditItem={item => {
              setEditingArticItem(item);
              setSelectedUnitForArtic(item.codeUnit);
              setArticModalQaType(item.qaType || 'QA7_FINAL');
              setIsArticModalOpen(true);
            }}
            onDeleteItem={handleDeleteDailyArtic}
            onPrintPreview={item => setPrintableReport({ type: 'DAILY_ARTIC', data: item })}
            onOpenAddBacklog={cu => {
              setSelectedUnitForBacklog(cu);
              setBacklogSource('QA7_ARTIC');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenAddActivity={cu => {
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewBacklog={handleViewBacklog}
            onEditBacklog={item => {
              setEditingBacklogItem(item);
              setSelectedUnitForBacklog(item.codeUnit);
              setIsBacklogModalOpen(true);
            }}
          />
        )}

        {/* MENU BACKLOG (CONNECTED TO CODE UNIT) */}
        {activeTab === 'backlog' && (
          <BacklogView
            backlogs={backlogs}
            units={codeUnits}
            onOpenCreate={() => {
              setSelectedUnitForBacklog('');
              setBacklogSource('MANUAL');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onViewItem={handleViewBacklog}
            onEditItem={item => {
              setEditingBacklogItem(item);
              setSelectedUnitForBacklog(item.codeUnit);
              setIsBacklogModalOpen(true);
            }}
            onDeleteItem={handleDeleteBacklog}
            onUpdateStatus={handleUpdateBacklogStatus}
            onPrintPreview={item => setPrintableReport({ type: 'BACKLOG', data: item })}
          />
        )}

        {/* MENU ADD ACTIVITIES MEKANIK (CONNECTED TO CODE UNIT) */}
        {activeTab === 'activities' && (
          <ActivitiesView
            activities={activities}
            units={codeUnits}
            onOpenCreate={() => {
              setSelectedUnitForActivity('');
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
            onViewItem={handleViewActivity}
            onEditItem={item => {
              setEditingActivityItem(item);
              setSelectedUnitForActivity(item.codeUnit);
              setIsActivityModalOpen(true);
            }}
            onDeleteItem={handleDeleteActivity}
            onUpdateStatus={handleUpdateActivityStatus}
            onPrintPreview={item => setPrintableReport({ type: 'ACTIVITY', data: item })}
          />
        )}

        {/* BAP */}
        {activeTab === 'bap' && (
          <BapView
            bapList={bapList}
            onOpenCreateModal={() => {
              setSelectedUnitForBap('');
              setEditingBapItem(null);
              setIsBapModalOpen(true);
            }}
            onViewBAP={handleViewBAP}
            onEditBAP={item => {
              setEditingBapItem(item);
              setSelectedUnitForBap(item.codeUnit);
              setIsBapModalOpen(true);
            }}
            onDeleteBAP={handleDeleteBAP}
            onPrintPreview={bap => setPrintableReport({ type: 'BAP', data: bap })}
          />
        )}

        {/* MASTER CODE UNIT */}
        {activeTab === 'units' && (
          <UnitsView
            units={codeUnits}
            onOpenManageUnits={() => setIsUnitsManagerModalOpen(true)}
            onViewUnit={handleViewUnit}
            onEditUnit={() => setIsUnitsManagerModalOpen(true)}
            onDeleteUnit={handleDeleteUnit}
            onOpenBapForUnit={cu => {
              setSelectedUnitForBap(cu);
              setEditingBapItem(null);
              setIsBapModalOpen(true);
            }}
            onOpenRigidForUnit={(cu, qaType) => {
              setSelectedUnitForRigid(cu);
              setEditingRigidItem(null);
              setRigidModalQaType(qaType || 'QA1_PRE');
              setIsRigidModalOpen(true);
            }}
            onOpenArticForUnit={(cu, qaType) => {
              setSelectedUnitForArtic(cu);
              setEditingArticItem(null);
              setArticModalQaType(qaType || 'QA1_PRE');
              setIsArticModalOpen(true);
            }}
            onOpenBacklogForUnit={cu => {
              setSelectedUnitForBacklog(cu);
              setBacklogSource('MANUAL');
              setEditingBacklogItem(null);
              setIsBacklogModalOpen(true);
            }}
            onOpenActivityForUnit={cu => {
              setSelectedUnitForActivity(cu);
              setEditingActivityItem(null);
              setIsActivityModalOpen(true);
            }}
          />
        )}
      </main>
      </div>

      {/* Android Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
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
        onSave={handleSaveDailyRigid}
        onPrintPreview={item => setPrintableReport({ type: 'DAILY_RIGID', data: item })}
        onOpenAddBacklog={cu => {
          setSelectedUnitForBacklog(cu);
          setBacklogSource(rigidModalQaType === 'DAILY_INSPECTION' ? 'DAILY_RIGID' : rigidModalQaType === 'QA7_FINAL' ? 'QA7_RIGID' : 'QA1_RIGID');
          setEditingBacklogItem(null);
          setIsBacklogModalOpen(true);
        }}
        onOpenEditBacklog={item => {
          setEditingBacklogItem(item);
          setSelectedUnitForBacklog(item.codeUnit);
          setIsBacklogModalOpen(true);
        }}
        onOpenViewBacklog={item => {
          handleViewBacklog(item);
        }}
        onOpenAddActivity={cu => {
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
        onSave={handleSaveDailyArtic}
        onPrintPreview={item => setPrintableReport({ type: 'DAILY_ARTIC', data: item })}
        onOpenAddBacklog={cu => {
          setSelectedUnitForBacklog(cu);
          setBacklogSource(articModalQaType === 'DAILY_INSPECTION' ? 'DAILY_ARTIC' : articModalQaType === 'QA7_FINAL' ? 'QA7_ARTIC' : 'QA1_ARTIC');
          setEditingBacklogItem(null);
          setIsBacklogModalOpen(true);
        }}
        onOpenEditBacklog={item => {
          setEditingBacklogItem(item);
          setSelectedUnitForBacklog(item.codeUnit);
          setIsBacklogModalOpen(true);
        }}
        onOpenViewBacklog={item => {
          handleViewBacklog(item);
        }}
        onOpenAddActivity={cu => {
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
        onPrintPreview={bap => setPrintableReport({ type: 'BAP', data: bap })}
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
        onOpenEditBacklog={(item: BacklogItem) => {
          setEditingBacklogItem(item);
          setSelectedUnitForBacklog(item.codeUnit);
          setIsBacklogModalOpen(true);
        }}
      />
    </div>
  );
}
