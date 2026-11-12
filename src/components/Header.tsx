import React, { useState, useRef, useEffect } from 'react';
import {
  Truck,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  X,
  Layers,
  AlertOctagon,
  Wrench,
  FileWarning,
  ClipboardCheck,
  Tractor,
  Sun,
  Moon,
  ShieldCheck,
  User,
  LogOut,
} from 'lucide-react';
import { GoogleSheetsConfig, CodeUnit, BacklogItem, BAPRecord, DailyCheckRigid, DailyCheckArtic, AddActivityItem } from '../types';
import { ActiveTab } from './BottomNav';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { UserProfileModal } from './UserProfileModal';

interface HeaderProps {
  sheetsConfig: GoogleSheetsConfig | null;
  isSyncing: boolean;
  syncMode?: 'idle' | 'pulling' | 'pushing';
  onOpenSheetsModal: () => void;
  onPullData: () => void;
  onPushData: () => void;
  codeUnits?: CodeUnit[];
  backlogs?: BacklogItem[];
  bapList?: BAPRecord[];
  dailyRigidList?: DailyCheckRigid[];
  dailyArticList?: DailyCheckArtic[];
  activities?: AddActivityItem[];
  onNavigateToTab?: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  sheetsConfig,
  isSyncing,
  syncMode = 'idle',
  onOpenSheetsModal,
  onPullData,
  onPushData,
  codeUnits = [],
  backlogs = [],
  bapList = [],
  dailyRigidList = [],
  dailyArticList = [],
  activities = [],
  onNavigateToTab,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, isAdmin } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const q = searchQuery.trim().toLowerCase();

  // Filter results across datasets if query exists
  const matchedUnits = q
    ? codeUnits.filter(
        u =>
          u.codeUnit.toLowerCase().includes(q) ||
          u.egi.toLowerCase().includes(q) ||
          u.brand.toLowerCase().includes(q) ||
          u.lokasiPit.toLowerCase().includes(q)
      )
    : [];

  const matchedBacklogs = q
    ? backlogs.filter(
        b =>
          b.codeUnit.toLowerCase().includes(q) ||
          b.moBacklog.toLowerCase().includes(q) ||
          b.deskripsiBacklog.toLowerCase().includes(q) ||
          b.partNumber.toLowerCase().includes(q) ||
          b.pic.toLowerCase().includes(q)
      )
    : [];

  const matchedBap = q
    ? bapList.filter(
        item =>
          item.codeUnit.toLowerCase().includes(q) ||
          item.mo.toLowerCase().includes(q) ||
          item.kerusakan.toLowerCase().includes(q) ||
          item.picMekanik.toLowerCase().includes(q)
      )
    : [];

  const matchedRigid = q
    ? dailyRigidList.filter(
        item =>
          item.codeUnit.toLowerCase().includes(q) ||
          item.egi.toLowerCase().includes(q) ||
          item.picMekanik.toLowerCase().includes(q)
      )
    : [];

  const matchedArtic = q
    ? dailyArticList.filter(
        item =>
          item.codeUnit.toLowerCase().includes(q) ||
          item.egi.toLowerCase().includes(q) ||
          item.picMekanik.toLowerCase().includes(q)
      )
    : [];

  const matchedActivities = q
    ? activities.filter(
        item =>
          item.codeUnit.toLowerCase().includes(q) ||
          item.deskripsiAktivitas.toLowerCase().includes(q) ||
          item.action.toLowerCase().includes(q) ||
          item.pic.toLowerCase().includes(q)
      )
    : [];

  const totalResults =
    matchedUnits.length +
    matchedBacklogs.length +
    matchedBap.length +
    matchedRigid.length +
    matchedArtic.length +
    matchedActivities.length;

  const handleSelectResult = (tab: ActiveTab) => {
    if (onNavigateToTab) {
      onNavigateToTab(tab);
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className="no-print bg-[#111113] text-[#f2efeb] sticky top-0 z-30 border-b border-[rgba(242,239,235,0.1)]">
      <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Brand - Visible on mobile/tablet when sidebar is hidden */}
        <div className="flex items-center space-x-2.5 shrink-0 lg:hidden">
          <div className="w-8 h-8 rounded bg-[#18181b] p-1 border border-[rgba(242,239,235,0.15)] flex items-center justify-center shrink-0">
            <img
              src="/assets/aistudio/PAMA_SMALL_4167d1d0.png"
              alt="PAMA Logo"
              className="max-h-full max-w-full object-contain"
              onError={e => {
                (e.target as HTMLImageElement).src = 'assets/aistudio/PAMA_SMALL_4167d1d0.png';
              }}
            />
          </div>
          <div>
            <h1 className="font-syne font-extrabold text-sm tracking-tight text-[#f2efeb] uppercase leading-none">
              PLANT<span className="text-[#facc15]">2</span>
            </h1>
            <p className="text-[9px] font-mono tracking-wider text-[rgba(242,239,235,0.4)] uppercase">
              Heavy Equipment Systems
            </p>
          </div>
        </div>

        {/* Global Search Bar (Industrial Systematic) */}
        <div className="relative flex-1 max-w-[420px]" ref={searchRef}>
          <div className="relative">
            <Search className="w-4 h-4 text-[rgba(242,239,235,0.4)] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="QUERY DATABASE: Unit, PIC, ID, Activity..."
              className="w-full bg-[#18181b] border border-[rgba(242,239,235,0.15)] hover:border-[rgba(242,239,235,0.25)] rounded pl-9 pr-8 py-2 text-xs font-mono text-[#f2efeb] placeholder-[rgba(242,239,235,0.4)] focus:border-[#facc15] outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 top-2 text-[rgba(242,239,235,0.5)] hover:text-[#f2efeb] p-0.5"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Global Search Results Dropdown */}
          {isSearchOpen && q.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-[#18181b] border border-[rgba(242,239,235,0.15)] rounded-md shadow-2xl max-h-96 overflow-y-auto z-50 p-2.5 space-y-3 text-xs animate-fade-in">
              <div className="px-2.5 py-1 text-[11px] font-mono text-[rgba(242,239,235,0.5)] border-b border-[rgba(242,239,235,0.08)] flex items-center justify-between">
                <span>QUERY: &ldquo;{searchQuery}&rdquo;</span>
                <span className="text-[#facc15] font-mono font-bold">{totalResults} MATCHED</span>
              </div>

              {totalResults === 0 && (
                <div className="text-center py-6 text-[rgba(242,239,235,0.4)] font-mono text-xs">
                  NO MATCH FOUND FOR &ldquo;{searchQuery}&rdquo;.
                </div>
              )}

              {/* Units Results */}
              {matchedUnits.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-blue-400 uppercase px-2.5 flex items-center space-x-1">
                    <Layers className="w-3 h-3" />
                    <span>Master Code Unit ({matchedUnits.length})</span>
                  </div>
                  {matchedUnits.slice(0, 4).map((u, idx) => (
                    <button
                      key={`search-unit-${u.id}-${idx}`}
                      onClick={() => handleSelectResult('units')}
                      className="w-full text-left px-2.5 py-2 hover:bg-slate-800/80 rounded-xl flex items-center justify-between transition group"
                    >
                      <div>
                        <span className="font-mono font-bold text-white group-hover:text-amber-400">
                          {u.codeUnit}
                        </span>
                        <span className="text-slate-400 text-[11px] ml-2">
                          {u.brand} • {u.egi} ({u.lokasiPit})
                        </span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        u.statusUnit === 'READY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {u.statusUnit}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Backlog Results */}
              {matchedBacklogs.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-amber-400 uppercase px-2.5 flex items-center space-x-1">
                    <AlertOctagon className="w-3 h-3" />
                    <span>Backlog Sparepart ({matchedBacklogs.length})</span>
                  </div>
                  {matchedBacklogs.slice(0, 4).map((b, idx) => (
                    <button
                      key={`search-bl-${b.id}-${idx}`}
                      onClick={() => handleSelectResult('backlog')}
                      className="w-full text-left px-2.5 py-2 hover:bg-slate-800/80 rounded-xl flex items-center justify-between transition group"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-mono font-bold text-white group-hover:text-amber-400">
                          {b.codeUnit}
                        </span>
                        <span className="text-slate-300 text-[11px] ml-2 truncate block sm:inline">
                          MO: {b.moBacklog} • {b.deskripsiBacklog}
                        </span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-500/20 text-amber-300 shrink-0">
                        {b.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* BAP Results */}
              {matchedBap.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-rose-400 uppercase px-2.5 flex items-center space-x-1">
                    <FileWarning className="w-3 h-3" />
                    <span>BAP Kerusakan ({matchedBap.length})</span>
                  </div>
                  {matchedBap.slice(0, 4).map((item, idx) => (
                    <button
                      key={`search-bap-${item.id}-${idx}`}
                      onClick={() => handleSelectResult('bap')}
                      className="w-full text-left px-2.5 py-2 hover:bg-slate-800/80 rounded-xl flex items-center justify-between transition group"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-mono font-bold text-white group-hover:text-amber-400">
                          {item.codeUnit}
                        </span>
                        <span className="text-slate-300 text-[11px] ml-2 truncate block sm:inline">
                          MO: {item.mo} • {item.kerusakan}
                        </span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-rose-500/20 text-rose-400 shrink-0">
                        {item.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Daily / QA Rigid Results */}
              {matchedRigid.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-blue-400 uppercase px-2.5 flex items-center space-x-1">
                    <Truck className="w-3 h-3" />
                    <span>Inspeksi Rigid ({matchedRigid.length})</span>
                  </div>
                  {matchedRigid.slice(0, 3).map((item, idx) => (
                    <button
                      key={`search-rig-${item.id}-${idx}`}
                      onClick={() => handleSelectResult(item.qaType === 'QA7_FINAL' ? 'qa7-rigid' : item.qaType === 'DAILY_INSPECTION' ? 'daily-rigid' : 'qa1-rigid')}
                      className="w-full text-left px-2.5 py-2 hover:bg-slate-800/80 rounded-xl flex items-center justify-between transition group"
                    >
                      <div>
                        <span className="font-mono font-bold text-white group-hover:text-amber-400">
                          {item.codeUnit}
                        </span>
                        <span className="text-slate-400 text-[11px] ml-2">
                          {item.tanggal} • {item.qaType === 'QA7_FINAL' ? 'QA 7' : item.qaType === 'DAILY_INSPECTION' ? 'Daily' : 'QA 1'} • PIC: {item.picMekanik}
                        </span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-500/20 text-blue-300">
                        {item.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Daily / QA Artic Results */}
              {matchedArtic.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase px-2.5 flex items-center space-x-1">
                    <Tractor className="w-3 h-3" />
                    <span>Inspeksi Artic / Grader ({matchedArtic.length})</span>
                  </div>
                  {matchedArtic.slice(0, 3).map((item, idx) => (
                    <button
                      key={`search-art-${item.id}-${idx}`}
                      onClick={() => handleSelectResult(item.qaType === 'QA7_FINAL' ? 'qa7-artic' : item.qaType === 'DAILY_INSPECTION' ? 'daily-artic' : 'qa1-artic')}
                      className="w-full text-left px-2.5 py-2 hover:bg-slate-800/80 rounded-xl flex items-center justify-between transition group"
                    >
                      <div>
                        <span className="font-mono font-bold text-white group-hover:text-amber-400">
                          {item.codeUnit}
                        </span>
                        <span className="text-slate-400 text-[11px] ml-2">
                          {item.tanggal} • {item.qaType === 'QA7_FINAL' ? 'QA 7' : item.qaType === 'DAILY_INSPECTION' ? 'Daily' : 'QA 1'} • PIC: {item.picMekanik}
                        </span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-300">
                        {item.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Activities Results */}
              {matchedActivities.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase px-2.5 flex items-center space-x-1">
                    <Wrench className="w-3 h-3" />
                    <span>Aktivitas Mekanik ({matchedActivities.length})</span>
                  </div>
                  {matchedActivities.slice(0, 3).map((item, idx) => (
                    <button
                      key={`search-act-${item.id}-${idx}`}
                      onClick={() => handleSelectResult('activities')}
                      className="w-full text-left px-2.5 py-2 hover:bg-slate-800/80 rounded-xl flex items-center justify-between transition group"
                    >
                      <div>
                        <span className="font-mono font-bold text-white group-hover:text-amber-400">
                          {item.codeUnit}
                        </span>
                        <span className="text-slate-300 text-[11px] ml-2">
                          {item.deskripsiAktivitas} (PIC: {item.pic})
                        </span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-300">
                        {item.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls Section (Industrial Systematic) */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Two-Way Google Sheets Controls (KHUSUS PROFIL ADMIN - User Dilarang/Disembunyikan) */}
          {isAdmin && (
            <>
              {sheetsConfig ? (
                <>
                  {/* Tarik Data (Pull) */}
                  <button
                    onClick={onPullData}
                    disabled={isSyncing}
                    title="Tarik data terbaru dari Google Sheet ke aplikasi"
                    className="px-3 py-1.5 rounded border border-[rgba(242,239,235,0.15)] bg-transparent hover:bg-[rgba(242,239,235,0.08)] text-[#f2efeb] text-xs font-mono uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-40"
                  >
                    <Download className={`w-3.5 h-3.5 ${syncMode === 'pulling' ? 'animate-bounce text-[#facc15]' : 'text-[rgba(242,239,235,0.6)]'}`} />
                    <span className="hidden sm:inline">Tarik Data</span>
                  </button>

                  {/* Kirim Data (Push) */}
                  <button
                    onClick={onPushData}
                    disabled={isSyncing}
                    title="Kirim dan simpan semua data lokal ke Google Sheet"
                    className="px-3 py-1.5 rounded border border-[rgba(242,239,235,0.15)] bg-transparent hover:bg-[rgba(242,239,235,0.08)] text-[#f2efeb] text-xs font-mono uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-40"
                  >
                    <Upload className={`w-3.5 h-3.5 ${syncMode === 'pushing' ? 'animate-bounce text-[#4ade80]' : 'text-[rgba(242,239,235,0.6)]'}`} />
                    <span className="hidden sm:inline">Kirim Data</span>
                  </button>

                  {/* Sheet Status Indicator */}
                  <button
                    onClick={onOpenSheetsModal}
                    title="Google Sheet selalu terhubung dan aktif otomatis"
                    className="px-3 py-1.5 rounded border border-[#4ade80] text-[#4ade80] bg-[#4ade80]/5 hover:bg-[#4ade80]/15 text-xs font-mono uppercase tracking-wider flex items-center space-x-2 transition active:scale-95"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse shrink-0" />
                    <span className="font-semibold text-xs hidden sm:inline">
                      {syncMode === 'pulling'
                        ? 'Memuat...'
                        : syncMode === 'pushing'
                        ? 'Menyimpan...'
                        : 'Sheet 24/7 Aktif'}
                    </span>
                    <span className="font-semibold text-xs sm:hidden">
                      {syncMode === 'pulling' ? 'Memuat' : syncMode === 'pushing' ? 'Simpan' : 'Live'}
                    </span>
                  </button>
                </>
              ) : (
                <button
                  onClick={onOpenSheetsModal}
                  className="px-3.5 py-1.5 rounded bg-[#facc15] hover:bg-[#fde047] text-[#111113] text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95 shadow-md shadow-[#facc15]/20"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Hubungkan Sheet</span>
                </button>
              )}
            </>
          )}

          {/* Theme Toggle (Light / Dark Mode) */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Beralih ke Tema Terang (Light Mode)' : 'Beralih ke Tema Gelap (Dark Mode)'}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded border border-[rgba(242,239,235,0.15)] bg-transparent hover:bg-[rgba(242,239,235,0.08)] text-[#f2efeb] text-xs font-mono uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[#facc15]" />
                <span className="hidden sm:inline font-bold text-[10px]">Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#facc15]" />
                <span className="hidden sm:inline font-bold text-[10px]">Gelap</span>
              </>
            )}
          </button>

          {/* User Profile Button */}
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            title="Kelola Profil Pengguna & Hak Akses"
            className={`px-2.5 py-1.5 rounded border text-xs font-mono uppercase font-bold flex items-center space-x-1.5 transition active:scale-95 ${
              isAdmin
                ? 'border-[#facc15]/40 bg-[#facc15]/10 hover:bg-[#facc15]/20 text-[#facc15]'
                : 'border-[#38bdf8]/40 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 text-[#38bdf8]'
            }`}
          >
            {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline font-mono text-[11px]">
              {isAdmin ? 'ADMIN' : currentUser?.displayName || 'USER'}
            </span>
          </button>
        </div>
      </div>

      {/* User Profile & Session Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </header>
  );
};
