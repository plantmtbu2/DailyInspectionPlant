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
} from 'lucide-react';
import { GoogleSheetsConfig, CodeUnit, BacklogItem, BAPRecord, DailyCheckRigid, DailyCheckArtic, AddActivityItem } from '../types';
import { ActiveTab } from './BottomNav';

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
    <header className="no-print bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & App Name */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div className="hidden md:block">
            <div className="flex items-center space-x-1.5">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                Aplikasi <span className="text-amber-400">Plant 2 MTBU</span>
              </h1>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 font-semibold px-1.5 py-0.2 rounded-full border border-amber-500/30">
                2-WAY SYNC
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Daily Check • BAP • Backlog • Aktivitas Mekanik
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-md mx-2" ref={searchRef}>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Cari unit, backlog, BAP, inspeksi, aktivitas..."
              className="w-full bg-slate-850 border border-slate-700/80 hover:border-slate-600 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-400 focus:border-amber-400 outline-none transition shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white p-0.5"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Global Search Results Dropdown */}
          {isSearchOpen && q.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-96 overflow-y-auto z-50 p-2 space-y-3 text-xs animate-fade-in">
              <div className="px-2.5 py-1 text-[11px] text-slate-400 font-semibold border-b border-slate-800 flex items-center justify-between">
                <span>Hasil Pencarian: &ldquo;{searchQuery}&rdquo;</span>
                <span className="text-amber-400 font-mono font-bold">{totalResults} Ditemukan</span>
              </div>

              {totalResults === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Tidak ditemukan data yang cocok dengan &ldquo;{searchQuery}&rdquo;.
                </div>
              )}

              {/* Units Results */}
              {matchedUnits.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-blue-400 uppercase px-2.5 flex items-center space-x-1">
                    <Layers className="w-3 h-3" />
                    <span>Master Code Unit ({matchedUnits.length})</span>
                  </div>
                  {matchedUnits.slice(0, 4).map(u => (
                    <button
                      key={u.id}
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
                  {matchedBacklogs.slice(0, 4).map(b => (
                    <button
                      key={b.id}
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
                  {matchedBap.slice(0, 4).map(item => (
                    <button
                      key={item.id}
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
                  {matchedRigid.slice(0, 3).map(item => (
                    <button
                      key={item.id}
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
                  {matchedArtic.slice(0, 3).map(item => (
                    <button
                      key={item.id}
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
                  {matchedActivities.slice(0, 3).map(item => (
                    <button
                      key={item.id}
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

        {/* Two-Way Google Sheets Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {sheetsConfig ? (
            <>
              {/* Tarik Data (Pull) */}
              <button
                onClick={onPullData}
                disabled={isSyncing}
                title="Tarik data terbaru dari Google Sheet ke aplikasi"
                className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center space-x-1 transition active:scale-95 disabled:opacity-50"
              >
                <Download className={`w-3.5 h-3.5 ${syncMode === 'pulling' ? 'animate-bounce text-blue-400' : ''}`} />
                <span className="hidden xs:inline">Tarik Data</span>
              </button>

              {/* Kirim Data (Push) */}
              <button
                onClick={onPushData}
                disabled={isSyncing}
                title="Kirim dan simpan semua data lokal ke Google Sheet"
                className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1 transition active:scale-95 disabled:opacity-50"
              >
                <Upload className={`w-3.5 h-3.5 ${syncMode === 'pushing' ? 'animate-bounce text-emerald-400' : ''}`} />
                <span className="hidden xs:inline">Kirim Data</span>
              </button>

              {/* Sheet Status Indicator */}
              <button
                onClick={onOpenSheetsModal}
                title="Google Sheet selalu terhubung dan aktif otomatis"
                className="p-1.5 sm:px-2.5 sm:py-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs flex items-center space-x-1.5 transition active:scale-95 shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold text-[11px] hidden xs:inline">
                  {syncMode === 'pulling'
                    ? 'Memuat Data...'
                    : syncMode === 'pushing'
                    ? 'Menyimpan...'
                    : sheetsConfig.webAppUrl
                    ? 'Sheet 24/7 Aktif'
                    : sheetsConfig.isDefault
                    ? 'Sheet Plant 2 (Global)'
                    : 'Sheet Terhubung'}
                </span>
                <span className="font-semibold text-[11px] xs:hidden">
                  {syncMode === 'pulling' ? 'Memuat...' : syncMode === 'pushing' ? 'Menyimpan...' : 'Sheet'}
                </span>
              </button>
            </>
          ) : (
            <button
              onClick={onOpenSheetsModal}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-lg shadow-amber-500/15"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Hubungkan Sheet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
