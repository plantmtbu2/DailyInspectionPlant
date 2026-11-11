import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  LogOut,
  AlertCircle,
  PlusCircle,
  Link2,
  Download,
  Upload,
  Check,
  Copy,
  Code,
  Sparkles,
  Zap,
  Globe,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import { GoogleSheetsConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  googleSignIn,
  logout,
  getAccessToken,
  getStoredUserEmail,
  isGoogleConnected,
} from '../services/firebaseAuth';
import {
  createMaintenanceSpreadsheet,
  saveStoredSheetsConfig,
  pushAllDataToGoogleSheet,
  pullAllDataFromGoogleSheet,
  ensureAllTabsExist,
  testGoogleSheetConnection,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  resetToDefaultSheetsConfig,
  DEFAULT_SHEETS_CONFIG,
} from '../services/googleSheetsService';
import {
  getCodeUnits,
  getBAPList,
  getDailyRigidList,
  getDailyArticList,
  getBacklogs,
  getActivities,
  replaceEntireDataset,
} from '../services/storageService';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetsConfig | null;
  onConfigUpdated: (newConfig: GoogleSheetsConfig | null) => void;
  onDatasetReloaded?: () => void;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdated,
  onDatasetReloaded,
}) => {
  const [activeTab, setActiveTab] = useState<'webapp' | 'link' | 'oauth'>('webapp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  // Inputs
  const [webAppInput, setWebAppInput] = useState(config?.webAppUrl || '');
  const [manualIdInput, setManualIdInput] = useState(config?.spreadsheetId || '');
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    sheetTitle?: string;
    method?: string;
  } | null>(null);

  useEffect(() => {
    if (config) {
      if (config.webAppUrl) setWebAppInput(config.webAppUrl);
      if (config.spreadsheetId) setManualIdInput(config.spreadsheetId);
    }
  }, [config]);

  const { isAdmin } = useAuth();

  if (!isOpen) return null;

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md bg-[#18181b] border border-[#fb7185]/30 rounded-lg p-6 text-[#f2efeb] text-center space-y-4 shadow-2xl">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#fb7185]/15 text-[#fb7185] mx-auto border border-[#fb7185]/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-syne font-bold text-lg uppercase tracking-tight text-[#fb7185]">
            Akses Dibatasi
          </h3>
          <p className="text-xs font-mono text-[rgba(242,239,235,0.7)] leading-relaxed">
            Fungsi sinkronisasi Google Sheet 24/7, Tarik Data, dan Kirim Data hanya dapat dikelola oleh profil Administrator.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded bg-[rgba(242,239,235,0.1)] hover:bg-[rgba(242,239,235,0.18)] text-xs font-mono font-bold uppercase transition"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // 1. Salin Kode Apps Script ke Clipboard
  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  // 1b. Salin Konfigurasi Vercel (.env)
  const handleCopyVercelEnv = () => {
    const sheetId = config?.spreadsheetId || DEFAULT_SHEETS_CONFIG.spreadsheetId;
    const webApp = config?.webAppUrl || '';
    const sheetName = config?.spreadsheetName || DEFAULT_SHEETS_CONFIG.spreadsheetName;
    const text = `# VARIABEL LINGKUNGAN VERCEL - PLANT 2 GOOGLE SHEET\nVITE_GOOGLE_SHEET_ID=${sheetId}\nVITE_GOOGLE_SHEET_WEBAPP_URL=${webApp}\nVITE_GOOGLE_SHEET_NAME=${sheetName}`;
    navigator.clipboard.writeText(text);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 3000);
  };

  // 1c. Reset ke Database Default Plant 2 (Vercel)
  const handleResetToDefault = async () => {
    try {
      setLoading(true);
      setError(null);
      const defConfig = resetToDefaultSheetsConfig();
      onConfigUpdated(defConfig);
      setSyncStatus('Mengaktifkan Database Default Plant 2 dan menyinkronkan data...');

      const pulled = await pullAllDataFromGoogleSheet();
      replaceEntireDataset(pulled);
      if (onDatasetReloaded) onDatasetReloaded();
      setSyncStatus(`Database default Plant 2 berhasil dimuat (${pulled.codeUnits.length} Unit)!`);
    } catch (e: any) {
      setSyncStatus('Database default Plant 2 diaktifkan.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Hubungkan Web App URL (Metode Paling Stabil: Selalu Terhubung 24/7 Tanpa Login Ulang)
  const handleConnectWebApp = async () => {
    if (!webAppInput.trim()) {
      setError('Masukkan URL Web App Google Apps Script.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSyncStatus('Menguji koneksi ke Google Apps Script Web App...');

      const cleanUrl = webAppInput.trim();
      const res = await fetch(`${cleanUrl}?action=ping`).catch(() => null);

      let sheetName = 'Google Spreadsheet Plant 2';
      let sheetId = config?.spreadsheetId || 'web-app-connected';

      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.sheetTitle) sheetName = json.sheetTitle;
        if (json?.spreadsheetId) sheetId = json.spreadsheetId;
      }

      const newConfig: GoogleSheetsConfig = {
        spreadsheetId: sheetId,
        spreadsheetUrl: sheetId.startsWith('http') ? sheetId : `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        spreadsheetName: sheetName,
        webAppUrl: cleanUrl,
        lastSyncedAt: new Date().toISOString(),
      };

      saveStoredSheetsConfig(newConfig);
      onConfigUpdated(newConfig);

      // Auto push current data
      setSyncStatus('Menyinkronkan data awal ke Google Sheet...');
      await pushAllDataToGoogleSheet({
        codeUnits: getCodeUnits(),
        bapList: getBAPList(),
        dailyRigidList: getDailyRigidList(),
        dailyArticList: getDailyArticList(),
        backlogs: getBacklogs(),
        activities: getActivities(),
      });

      setSyncStatus('Google Sheet BERHASIL terhubung permanen! Aktif 24/7 tanpa perlu login ulang.');
    } catch (err: any) {
      setError(`Gagal menghubungkan Web App: ${err.message}. Pastikan akses diatur ke "Anyone".`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Hubungkan via URL / ID Spreadsheet
  const handleConnectExisting = async () => {
    if (!manualIdInput.trim()) return;
    let cleanId = manualIdInput.trim();
    const match = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      cleanId = match[1];
    }

    try {
      setLoading(true);
      setError(null);
      setSyncStatus('Memeriksa link Google Sheet...');

      let sheetTitle = 'Google Spreadsheet Plant 2';
      const token = await getAccessToken();

      if (token) {
        try {
          const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.properties?.title) {
              sheetTitle = data.properties.title;
            }
            await ensureAllTabsExist(cleanId, token);
          }
        } catch (checkErr) {
          console.warn('Metadata verification warning:', checkErr);
        }
      }

      const newConfig: GoogleSheetsConfig = {
        spreadsheetId: cleanId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
        spreadsheetName: sheetTitle,
        webAppUrl: config?.webAppUrl,
        lastSyncedAt: new Date().toISOString(),
      };

      saveStoredSheetsConfig(newConfig);
      onConfigUpdated(newConfig);

      if (token) {
        setSyncStatus('Menyinkronkan data awal ke Google Sheet...');
        await pushAllDataToGoogleSheet({
          codeUnits: getCodeUnits(),
          bapList: getBAPList(),
          dailyRigidList: getDailyRigidList(),
          dailyArticList: getDailyArticList(),
          backlogs: getBacklogs(),
          activities: getActivities(),
        });
        setSyncStatus('Google Sheet berhasil ditautkan dan tersinkronisasi!');
      } else {
        setSyncStatus('Google Sheet tersimpan. Anda juga dapat memasang Web App agar tidak perlu login ulang.');
      }
    } catch (err: any) {
      console.error('Error connecting sheet:', err);
      setError(err.message || 'Gagal menghubungkan Google Sheet.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Login Akun Google
  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await googleSignIn();
      if (res?.accessToken) {
        setSyncStatus(`Berhasil masuk dengan akun Google: ${res.user.email || 'Terautentikasi'}!`);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal login dengan akun Google');
    } finally {
      setLoading(false);
    }
  };

  // 5. Buat Spreadsheet Otomatis
  const handleCreateSheet = async () => {
    try {
      setLoading(true);
      setError(null);
      setSyncStatus('Sedang membuat Google Spreadsheet baru & menyiapkan 6 tab...');
      const newConfig = await createMaintenanceSpreadsheet('FleetCheck_Plant2_Maintenance');

      await pushAllDataToGoogleSheet({
        codeUnits: getCodeUnits(),
        bapList: getBAPList(),
        dailyRigidList: getDailyRigidList(),
        dailyArticList: getDailyArticList(),
        backlogs: getBacklogs(),
        activities: getActivities(),
      });

      onConfigUpdated(newConfig);
      setSyncStatus('Spreadsheet baru berhasil dibuat dan langsung terhubung!');
    } catch (err: any) {
      setError(err.message || 'Gagal membuat Google Spreadsheet.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Uji Koneksi Live
  const handleTestConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      setTestResult(null);
      const result = await testGoogleSheetConnection();
      setTestResult(result);
      if (result.success) {
        setSyncStatus(`Koneksi aktif! ${result.message}`);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(`Gagal menguji koneksi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 7. Push Semua Data
  const handlePushAll = async () => {
    if (!config?.spreadsheetId && !config?.webAppUrl) return;
    try {
      setLoading(true);
      setError(null);
      setSyncStatus('Mengirim & memperbarui semua data aplikasi ke Google Sheet...');

      await pushAllDataToGoogleSheet({
        codeUnits: getCodeUnits(),
        bapList: getBAPList(),
        dailyRigidList: getDailyRigidList(),
        dailyArticList: getDailyArticList(),
        backlogs: getBacklogs(),
        activities: getActivities(),
      });

      setSyncStatus('Semua data berhasil terkirim dan tersimpan rapi di Google Sheet!');
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim data ke Google Sheet.');
    } finally {
      setLoading(false);
    }
  };

  // 8. Pull Semua Data
  const handlePullAll = async () => {
    if (!config?.spreadsheetId && !config?.webAppUrl) return;
    try {
      setLoading(true);
      setError(null);
      setSyncStatus('Menarik data terbaru dari Google Sheet...');

      const pulledData = await pullAllDataFromGoogleSheet();
      replaceEntireDataset(pulledData);

      if (onDatasetReloaded) {
        onDatasetReloaded();
      }

      setSyncStatus(
        `Berhasil menarik data: ${pulledData.codeUnits.length} Unit, ${pulledData.bapList.length} BAP, ${pulledData.dailyRigidList.length} Rigid, ${pulledData.dailyArticList.length} Artic, ${pulledData.backlogs.length} Backlog, ${pulledData.activities.length} Aktivitas.`
      );
    } catch (err: any) {
      setError(err.message || 'Gagal menarik data dari Google Sheet.');
    } finally {
      setLoading(false);
    }
  };

  // 9. Putuskan Sambungan
  const handleDisconnect = async () => {
    if (!window.confirm('Apakah Anda yakin ingin memutuskan tautan Google Sheet dari aplikasi ini?')) {
      return;
    }
    saveStoredSheetsConfig(null);
    onConfigUpdated(null);
    await logout();
    setTestResult(null);
    setSyncStatus('Tautan Google Sheet telah diputuskan.');
  };

  const userEmail = getStoredUserEmail();
  const hasGoogleAccount = isGoogleConnected();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#18181b] border border-[rgba(242,239,235,0.15)] rounded w-full max-w-xl overflow-hidden shadow-2xl text-[#f2efeb] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(242,239,235,0.1)] bg-[#18181b] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[rgba(250,204,21,0.1)] text-[#facc15] rounded border border-[#facc15]/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-syne font-extrabold uppercase text-[#f2efeb]">Google Sheet Plant 2</h2>
                <span className="text-[10px] font-mono bg-[#4ade80]/15 text-[#4ade80] font-bold px-2 py-0.5 rounded border border-[#4ade80]/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                  <span>24/7 AKTIF</span>
                </span>
              </div>
              <p className="text-xs font-mono text-[rgba(242,239,235,0.5)] mt-0.5">Sinkronisasi 2-Arah Otomatis Real-Time Database Tambang</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.1)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-2 text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Sync Success Message */}
          {syncStatus && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start space-x-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{syncStatus}</span>
            </div>
          )}

          {/* Status Box: Spreadsheet Terhubung */}
          {config && (
            <div className="bg-slate-850 rounded-xl p-4 border border-emerald-500/30 space-y-3 shadow-lg shadow-emerald-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-emerald-300 text-sm">
                    {config.spreadsheetName || 'Spreadsheet Plant 2'}
                  </span>
                </div>
                {config.spreadsheetUrl && (
                  <a
                    href={config.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-xs text-amber-400 hover:text-amber-300 font-semibold bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition"
                  >
                    <span>Buka Sheet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Status Mode Badge */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                {config.isDefault && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md font-medium flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Database Default Terpusat (Vercel Ready)</span>
                  </span>
                )}
                {config.webAppUrl ? (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md font-medium flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-blue-400" />
                    <span>Mode Web App: Aktif 24/7 Tanpa Login Ulang</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md font-medium flex items-center space-x-1">
                    <Globe className="w-3 h-3 text-emerald-400" />
                    <span>Mode Google OAuth: Terhubung</span>
                  </span>
                )}
                {userEmail && (
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                    Akun: {userEmail}
                  </span>
                )}
              </div>

              {/* ID & Link info */}
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 break-all">
                <span className="text-slate-500 block text-[10px] font-sans uppercase mb-0.5">Spreadsheet ID:</span>
                {config.spreadsheetId}
              </div>

              {config.lastSyncedAt && (
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Terakhir disinkronkan:</span>
                  <span className="text-slate-300 font-mono">
                    {new Date(config.lastSyncedAt).toLocaleString('id-ID')}
                  </span>
                </div>
              )}

              {/* Two-Way Sync Actions */}
              <div className="pt-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={handlePullAll}
                  disabled={loading}
                  className="py-2 px-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 transition shadow"
                >
                  <Download className={`w-3.5 h-3.5 ${loading ? 'animate-bounce' : ''}`} />
                  <span>Tarik Data (Pull)</span>
                </button>

                <button
                  onClick={handlePushAll}
                  disabled={loading}
                  className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 transition shadow"
                >
                  <Upload className={`w-3.5 h-3.5 ${loading ? 'animate-bounce' : ''}`} />
                  <span>Kirim Data (Push)</span>
                </button>

                <button
                  onClick={handleTestConnection}
                  disabled={loading}
                  className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl font-semibold flex items-center justify-center space-x-1.5 border border-slate-700 col-span-2 sm:col-span-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Uji Koneksi</span>
                </button>
              </div>

              {/* Vercel & Multi-User Global Integration Box */}
              <div className="bg-slate-900/90 rounded-xl p-3 border border-amber-500/20 space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Terhubung Otomatis di Vercel untuk Semua Pengguna</span>
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[10px]">
                  Saat dipublish ke Vercel, semua mekanik atau akun email yang membuka web ini otomatis terhubung ke database Google Sheet yang sama tanpa harus menghubungkan ulang. Database default aplikasi selalu memuat data Google Sheet ini.
                </p>
                <div className="bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/20 text-[10px] text-emerald-300">
                  <strong>Input Lengkap Tanpa Diringkas:</strong> 19 Parameter Rigid, 36 Parameter Artic, rincian suku cadang Backlog, BAP, dan Aktivitas tersimpan ke kolom masing-masing secara terperinci.
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={handleCopyVercelEnv}
                    type="button"
                    className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center space-x-1 transition active:scale-95"
                  >
                    {copiedEnv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedEnv ? 'Tersalin!' : 'Salin Variabel Lingkungan Vercel (.env)'}</span>
                  </button>
                  <button
                    onClick={handleResetToDefault}
                    disabled={loading}
                    type="button"
                    className="py-1 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-semibold flex items-center space-x-1 transition active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    <span>Gunakan Database Default Plant 2</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs for Connection Methods */}
          <div className="flex border-b border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('webapp')}
              className={`pb-2.5 px-3 flex items-center space-x-1.5 border-b-2 transition ${
                activeTab === 'webapp'
                  ? 'border-amber-400 text-amber-300 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>1. Web App (Selalu Terhubung 24/7)</span>
            </button>

            <button
              onClick={() => setActiveTab('link')}
              className={`pb-2.5 px-3 flex items-center space-x-1.5 border-b-2 transition ${
                activeTab === 'link'
                  ? 'border-amber-400 text-amber-300 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Link2 className="w-3.5 h-3.5 text-blue-400" />
              <span>2. Tautan Sheet / ID</span>
            </button>

            <button
              onClick={() => setActiveTab('oauth')}
              className={`pb-2.5 px-3 flex items-center space-x-1.5 border-b-2 transition ${
                activeTab === 'oauth'
                  ? 'border-amber-400 text-amber-300 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. Akun Google</span>
            </button>
          </div>

          {/* TAB 1: Web App Script (Rekomendasi Utama: Bebas Kedaluwarsa) */}
          {activeTab === 'webapp' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Cara Agar Google Sheet SELALU Terhubung Tanpa Login Ulang</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Dengan memasang Google Apps Script di Spreadsheet Anda, aplikasi web dapat membaca dan menyimpan data secara otomatis 24/7 dari perangkat mekanik manapun tanpa sesi token kedaluwarsa.
                </p>
              </div>

              {/* Langkah Pemasangan Singkat */}
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 space-y-2 text-[11px] text-slate-300">
                <span className="font-bold text-white block">Langkah Praktis (Hanya 1 Menit):</span>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
                  <li>
                    Klik tombol di bawah untuk <strong>Salin Kode Apps Script</strong>.
                  </li>
                  <li>
                    Buka Google Sheet Anda &gt; menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.
                  </li>
                  <li>
                    Hapus kode bawaan, tempel kode yang disalin, lalu klik ikon <strong>Simpan (Ctrl+S)</strong>.
                  </li>
                  <li>
                    Klik tombol biru <strong>Terapkan (Deploy)</strong> &gt; <strong>Penerapan Baru (New deployment)</strong>.
                    Pilih <em>Aplikasi Web (Web App)</em>, setel <em>Akses: Siapa saja (Anyone)</em>, lalu klik <strong>Terapkan</strong>.
                  </li>
                  <li>
                    Salin <strong>URL Aplikasi Web</strong> yang dihasilkan dan tempelkan pada kolom di bawah.
                  </li>
                </ol>

                <div className="pt-1">
                  <button
                    onClick={handleCopyScript}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 rounded-xl font-bold flex items-center justify-center space-x-2 transition"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">Kode Apps Script Berhasil Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Salin Kode Apps Script Lengkap</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Input Web App URL */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">
                  Tempel URL Web App Google Apps Script:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={webAppInput}
                    onChange={e => setWebAppInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-slate-850 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    onClick={handleConnectWebApp}
                    disabled={loading || !webAppInput.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shrink-0 shadow-md shadow-amber-500/15"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Tautkan 24/7</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Tautan Spreadsheet ID / URL */}
          {activeTab === 'link' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-slate-800/50 border border-slate-800 rounded-xl text-[11px] text-slate-300 leading-relaxed">
                Anda dapat langsung menautkan Google Spreadsheet yang sudah ada dengan menyalin link atau ID spreadsheet:
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">
                  URL atau Spreadsheet ID:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={manualIdInput}
                    onChange={e => setManualIdInput(e.target.value)}
                    placeholder="Contoh: 1Edi1OqWr4YJ76tPvn3KaEV8Xfkxccfk9T4UiWwDFci4"
                    className="flex-1 bg-slate-850 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-400 font-mono"
                  />
                  <button
                    onClick={handleConnectExisting}
                    disabled={loading || !manualIdInput.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shrink-0 shadow-md shadow-blue-600/15"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>Hubungkan</span>
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                Pastikan hak akses pada Google Sheet Anda diatur ke <em>&quot;Siapa saja yang memiliki link dapat melihat/mengedit&quot;</em> atau telah masuk dengan akun Google pemilik spreadsheet.
              </p>
            </div>
          )}

          {/* TAB 3: Akun Google (OAuth) & Buat Sheet Baru */}
          {activeTab === 'oauth' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                Hubungkan langsung akun Google untuk membuat spreadsheet baru secara otomatis dengan seluruh 6 tab yang siap pakai:
              </div>

              {/* Login Button */}
              <div>
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center space-x-3 transition shadow-md"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>
                    {userEmail ? `Masuk Sebagai: ${userEmail}` : 'Masuk dengan Akun Google'}
                  </span>
                </button>
              </div>

              {/* Create Sheet Button */}
              <button
                onClick={handleCreateSheet}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-600/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Buat Spreadsheet Plant 2 Baru Otomatis</span>
              </button>
            </div>
          )}

          {/* Disconnect Button (if connected) */}
          {config && (
            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1 py-1 px-2 rounded-lg hover:bg-rose-950/30 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Putuskan Sambungan Sheet</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span className="flex items-center space-x-1.5">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>Koneksi disimpan permanen di perangkat & sinkronisasi otomatis aktif</span>
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
