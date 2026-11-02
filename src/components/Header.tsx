import React from 'react';
import {
  Truck,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { GoogleSheetsConfig } from '../types';

interface HeaderProps {
  sheetsConfig: GoogleSheetsConfig | null;
  isSyncing: boolean;
  syncMode?: 'idle' | 'pulling' | 'pushing';
  onOpenSheetsModal: () => void;
  onPullData: () => void;
  onPushData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sheetsConfig,
  isSyncing,
  syncMode = 'idle',
  onOpenSheetsModal,
  onPullData,
  onPushData,
}) => {
  return (
    <header className="no-print bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between">
        {/* Brand & App Name */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                Aplikasi <span className="text-amber-400">Plant 2</span>
              </h1>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 font-semibold px-1.5 py-0.2 rounded-full border border-amber-500/30">
                2-WAY SYNC
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Daily Check Rigid & Artic • BAP • Backlog • Aktivitas Mekanik
            </p>
          </div>
        </div>

        {/* Two-Way Google Sheets Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
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
