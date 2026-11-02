import React, { useState } from 'react';
import { DailyCheckRigid, QAType } from '../types';
import {
  Truck,
  Plus,
  Search,
  MessageSquare,
  Printer,
  Clock,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit3,
  Trash2,
  Camera,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { formatDailyRigidWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';

interface DailyRigidViewProps {
  list: DailyCheckRigid[];
  activeQaType: QAType | 'ALL';
  onChangeQaType?: (type: QAType | 'ALL') => void;
  onOpenCreate: (type?: QAType) => void;
  onEditItem: (item: DailyCheckRigid) => void;
  onDeleteItem: (item: DailyCheckRigid) => void;
  onPrintPreview: (item: DailyCheckRigid) => void;
  onOpenAddBacklog?: (codeUnit: string) => void;
  onOpenAddActivity?: (codeUnit: string) => void;
}

export const DailyRigidView: React.FC<DailyRigidViewProps> = ({
  list,
  activeQaType,
  onChangeQaType,
  onOpenCreate,
  onEditItem,
  onDeleteItem,
  onPrintPreview,
  onOpenAddBacklog,
  onOpenAddActivity,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  const isDaily = activeQaType === 'DAILY_INSPECTION';
  const isFinal = activeQaType === 'QA7_FINAL';
  const isPre = activeQaType === 'QA1_PRE';
  const isAll = activeQaType === 'ALL';

  const dailyCount = list.filter(i => i.qaType === 'DAILY_INSPECTION').length;
  const qa1Count = list.filter(i => (i.qaType || 'QA1_PRE') === 'QA1_PRE').length;
  const qa7Count = list.filter(i => i.qaType === 'QA7_FINAL').length;

  const currentList = list.filter(item => {
    if (activeQaType === 'ALL') return true;
    const itemQaType = item.qaType || 'QA1_PRE';
    return itemQaType === activeQaType;
  });

  const filtered = currentList.filter(
    item =>
      item.codeUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.egi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.picMekanik.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const viewTitle = isDaily
    ? 'DAILY INSPECTION RIGID'
    : isFinal
    ? '2. QA 7 FINAL INSPECTION RIGID'
    : isAll
    ? 'SEMUA INSPEKSI RIGID DUMP TRUCK'
    : '1. QA 1 PRE INSPECTION RIGID';

  const viewSubtitle = isDaily
    ? 'Inspeksi harian 19 parameter kelayakan unit Rigid Dump Truck (Standar QA 7 Plant 2)'
    : isFinal
    ? 'Validasi akhir 19 parameter kelayakan unit Rigid Dump Truck setelah servis & rilis operasi'
    : isAll
    ? 'Daftar seluruh riwayat inspeksi harian dan QA unit Rigid Dump Truck'
    : 'Inspeksi awal 19 parameter kelayakan unit Rigid Dump Truck sebelum shift operasi / servis';

  const viewBadge = isDaily
    ? 'DAILY INSPECTION'
    : isFinal
    ? 'FINAL QUALITY VALIDATION'
    : isAll
    ? 'ALL INSPECTIONS'
    : 'PRE-OPERATIONAL CHECK';

  const createButtonLabel = isDaily
    ? '+ Buat Daily Inspection Rigid'
    : isFinal
    ? '+ Form QA 7 Final Rigid'
    : '+ Form QA 1 Pre Rigid';

  return (
    <div className="space-y-4 pb-20">
      {/* Sub-toggle selector between Daily, QA 1 Pre, QA 7 Final, and All */}
      <div className="bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-1.5">
        {/* DAILY INSPECTION RIGID */}
        <button
          onClick={() => onChangeQaType && onChangeQaType('DAILY_INSPECTION')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
            isDaily
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>DAILY RIGID</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            isDaily ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
          }`}>
            {dailyCount}
          </span>
        </button>

        {/* 1. QA 1 PRE RIGID */}
        <button
          onClick={() => onChangeQaType && onChangeQaType('QA1_PRE')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
            isPre
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>1. QA 1 PRE</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            isPre ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
          }`}>
            {qa1Count}
          </span>
        </button>

        {/* 2. QA 7 FINAL RIGID */}
        <button
          onClick={() => onChangeQaType && onChangeQaType('QA7_FINAL')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
            isFinal
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>2. QA 7 FINAL</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            isFinal ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
          }`}>
            {qa7Count}
          </span>
        </button>

        {/* SEMUA */}
        <button
          onClick={() => onChangeQaType && onChangeQaType('ALL')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
            isAll
              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>SEMUA ({list.length})</span>
        </button>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className={`p-2.5 rounded-xl border ${
            isDaily
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : isFinal
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                {viewTitle}
              </h2>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                isDaily
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : isFinal
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {viewBadge}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {viewSubtitle}
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenCreate(isAll ? 'DAILY_INSPECTION' : activeQaType)}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition active:scale-95 shadow-lg ${
            isDaily
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              : isFinal
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{createButtonLabel}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Cari Inspeksi Rigid (Code Unit, EGI, PIC, Tanggal, ID)..."
          className="w-full bg-slate-850 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:border-amber-400 outline-none"
        />
      </div>

      {/* Inspection List Cards */}
      <div className="space-y-3">
        {filtered.map(item => {
          const defects = item.items.filter(i => i.status === 'DEFECT');
          const monitors = item.items.filter(i => i.status === 'MONITOR');
          const okCount = item.items.filter(i => i.status === 'OK').length;
          const measurements = item.items.filter(i => i.value && i.value.trim() !== '');

          return (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 space-y-3 transition shadow-sm"
            >
              {/* Header Info */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-black text-white font-mono">{item.codeUnit}</span>
                    <span className="text-xs text-slate-400">• {item.egi}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.status === 'RUNNING'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : item.status === 'BREAKDOWN'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      item.qaType === 'DAILY_INSPECTION'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : item.qaType === 'QA7_FINAL'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}>
                      {item.qaType === 'DAILY_INSPECTION' ? 'DAILY RIGID' : item.qaType === 'QA7_FINAL' ? 'QA 7 FINAL' : 'QA 1 PRE'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1">
                    <span>📅 {item.tanggal}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{item.startTime} - {item.finishTime} ({item.totalJam})</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Gauge className="w-3 h-3 text-amber-400" />
                      <span className="font-mono text-slate-300">{item.hmUnit.toLocaleString()} HM</span>
                    </span>
                  </div>
                </div>

                {/* Actions: WA, Print, Edit, Delete */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={() => shareToWhatsApp(formatDailyRigidWhatsApp(item))}
                    title="Share ke WhatsApp"
                    className="p-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 rounded-xl transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onPrintPreview(item)}
                    title="Cetak PDF / Print Form QA Rigid"
                    className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl transition"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                  </button>
                  <button
                    onClick={() => onEditItem(item)}
                    title="Edit inspeksi ini"
                    className="p-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteItem(item)}
                    title="Hapus inspeksi ini"
                    className="p-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 rounded-xl transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 19-Items Status Summary Badges */}
              <div className="bg-slate-850 rounded-xl p-3 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold text-[11px]">19 Parameter Checklist:</span>
                  <div className="flex items-center space-x-2 text-[11px] font-bold">
                    <span className="flex items-center space-x-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{okCount} OK</span>
                    </span>
                    {monitors.length > 0 && (
                      <span className="flex items-center space-x-1 text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{monitors.length} Monitor</span>
                      </span>
                    )}
                    {defects.length > 0 && (
                      <span className="flex items-center space-x-1 text-rose-400">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{defects.length} Defect</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Measurements pills */}
                {measurements.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800">
                    {measurements.map(m => (
                      <span
                        key={m.id}
                        className="text-[10px] bg-slate-900 border border-slate-750 px-2 py-0.5 rounded text-slate-300 font-mono"
                      >
                        {m.name.split('.')[1] || m.name}: <strong className="text-amber-400">{m.value}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Temuan Deviasi */}
              {item.temuanDeviasi && item.temuanDeviasi !== 'Nihil / Parameter Sesuai Standar' && (
                <div className="text-xs bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5 text-amber-300">
                  <span className="font-bold block text-[10px] uppercase text-amber-400 mb-0.5">
                    Temuan Deviasi / ADD ACTIVITIES:
                  </span>
                  <p>{item.temuanDeviasi}</p>
                </div>
              )}

              {/* Foto Dokumentasi Inspeksi Unit */}
              {item.photoUrl && (
                <div className="flex items-center space-x-3 bg-slate-850/60 p-2 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewPhoto({
                        url: item.photoUrl!,
                        title: `${item.qaType === 'QA7_FINAL' ? 'QA 7 Final Rigid' : 'QA 1 Pre Rigid'} - ${item.codeUnit}`,
                        subtitle: `${item.tanggal} (${item.status}) | HM: ${item.hmUnit}`,
                      })
                    }
                    className="relative group w-20 h-16 rounded-lg overflow-hidden border border-slate-700 shrink-0 hover:ring-2 hover:ring-amber-400 transition"
                  >
                    <img
                      src={item.photoUrl}
                      alt="Foto Inspeksi"
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[10px] font-bold text-white space-x-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Lihat</span>
                    </div>
                  </button>
                  <div className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-300 block text-[11px]">Foto Dokumentasi Terlampir</span>
                    <span className="text-[10px] text-slate-500">Klik gambar untuk melihat detail fisik inspeksi</span>
                  </div>
                </div>
              )}

              {/* Bottom Footer Meta & Interconnected Backlog/Activity Links */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>PIC: <strong className="text-slate-200">{item.picMekanik}</strong></span>
                  <span>Foreman: <strong className="text-slate-200">{item.divalidasiOleh}</strong></span>
                </div>
                <div className="flex items-center space-x-2 text-[10px]">
                  <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-semibold font-mono">
                    Backlog: {item.jumlahBacklog}
                  </span>
                  <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold font-mono">
                    Aktivitas: {item.jumlahAktivitas}
                  </span>
                  {onOpenAddBacklog && (
                    <button
                      onClick={() => onOpenAddBacklog(item.codeUnit)}
                      className="text-amber-400 hover:text-amber-300 underline font-semibold"
                    >
                      +BL
                    </button>
                  )}
                  {onOpenAddActivity && (
                    <button
                      onClick={() => onOpenAddActivity(item.codeUnit)}
                      className="text-emerald-400 hover:text-emerald-300 underline font-semibold"
                    >
                      +ACT
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <Truck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">
              Belum ada data {isFinal ? 'QA 7 Final Inspection Rigid' : 'QA 1 Pre Inspection Rigid'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik "{isFinal ? '+ Form QA 7 Final Rigid' : '+ Form QA 1 Pre Rigid'}" untuk memulai pengisian 19 parameter.
            </p>
          </div>
        )}
      </div>

      {previewPhoto && (
        <PhotoPreviewModal
          isOpen={true}
          onClose={() => setPreviewPhoto(null)}
          photoUrl={previewPhoto.url}
          title={previewPhoto.title}
          subtitle={previewPhoto.subtitle}
        />
      )}
    </div>
  );
};
