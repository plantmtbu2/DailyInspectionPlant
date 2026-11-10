import React, { useState } from 'react';
import { DailyCheckRigid, QAType, BacklogItem, AddActivityItem } from '../types';
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
  ListTodo,
  Wrench,
  Eye,
} from 'lucide-react';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { formatDailyRigidWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';

interface DailyRigidViewProps {
  list: DailyCheckRigid[];
  activeQaType: QAType | 'ALL';
  onChangeQaType?: (type: QAType | 'ALL') => void;
  onOpenCreate: (type?: QAType) => void;
  onViewItem?: (item: DailyCheckRigid) => void;
  onEditItem: (item: DailyCheckRigid) => void;
  onDeleteItem: (item: DailyCheckRigid) => void;
  onPrintPreview: (item: DailyCheckRigid) => void;
  onOpenAddBacklog?: (codeUnit: string) => void;
  onOpenAddActivity?: (codeUnit: string) => void;
  backlogs?: BacklogItem[];
  activities?: AddActivityItem[];
  onViewBacklog?: (item: BacklogItem) => void;
  onEditBacklog?: (item: BacklogItem) => void;
}

export const DailyRigidView: React.FC<DailyRigidViewProps> = ({
  list,
  activeQaType,
  onChangeQaType,
  onOpenCreate,
  onViewItem,
  onEditItem,
  onDeleteItem,
  onPrintPreview,
  onOpenAddBacklog,
  onOpenAddActivity,
  backlogs = [],
  activities = [],
  onViewBacklog,
  onEditBacklog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<{
    urls: string[];
    index?: number;
    title: string;
    subtitle?: string;
  } | null>(null);

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
    ? 'FINAL QUALITY VALIDATION (QA7)'
    : isAll
    ? 'ALL INSPECTIONS'
    : 'PRE-MAINTENANCE CHECK (QA1)';

  const createButtonLabel = isDaily
    ? '+ Buat Daily Inspection Rigid'
    : isFinal
    ? '+ Form QA 7 Final Rigid'
    : '+ Form QA 1 Pre Rigid';

  return (
    <div className="space-y-4 pb-20">
      {/* Sub-toggle selector between Daily, QA 1 Pre, QA 7 Final, and All */}
      <div className="bg-[#18181b] p-1.5 rounded border border-[rgba(242,239,235,0.1)] flex flex-wrap items-center gap-1.5">
        {/* DAILY INSPECTION RIGID */}
        <button
          onClick={() => onChangeQaType && onChangeQaType('DAILY_INSPECTION')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition ${
            isDaily
              ? 'bg-[rgba(250,204,21,0.1)] border border-[#facc15] text-[#facc15]'
              : 'text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.05)] border border-transparent'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>DAILY RIGID</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            isDaily ? 'bg-[#facc15] text-[#111113]' : 'bg-[rgba(242,239,235,0.1)] text-[#f2efeb]'
          }`}>
            {dailyCount}
          </span>
        </button>

        {/* 1. QA 1 PRE RIGID */}
        <button
          onClick={() => onChangeQaType && onChangeQaType('QA1_PRE')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition ${
            isPre
              ? 'bg-[rgba(250,204,21,0.1)] border border-[#facc15] text-[#facc15]'
              : 'text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.05)] border border-transparent'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>1. QA 1 PRE</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            isPre ? 'bg-[#facc15] text-[#111113]' : 'bg-[rgba(242,239,235,0.1)] text-[#f2efeb]'
          }`}>
            {qa1Count}
          </span>
        </button>

        {/* 2. QA 7 FINAL RIGID */}
        <button
          onClick={() => onChangeQaType && onChangeQaType('QA7_FINAL')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition ${
            isFinal
              ? 'bg-[#4ade80]/10 border border-[#4ade80] text-[#4ade80]'
              : 'text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.05)] border border-transparent'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>2. QA 7 FINAL</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            isFinal ? 'bg-[#4ade80] text-[#111113]' : 'bg-[rgba(242,239,235,0.1)] text-[#f2efeb]'
          }`}>
            {qa7Count}
          </span>
        </button>

        {/* SEMUA */}
        <button
          onClick={() => onChangeQaType && onChangeQaType('ALL')}
          className={`py-2 px-3 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition ${
            isAll
              ? 'bg-[rgba(242,239,235,0.15)] border border-[#f2efeb] text-[#f2efeb]'
              : 'text-[rgba(242,239,235,0.5)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.05)] border border-transparent'
          }`}
        >
          <span>SEMUA ({list.length})</span>
        </button>
      </div>

      {/* Variation 2 Industrial Toolbar */}
      <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] text-[rgba(242,239,235,0.5)] uppercase tracking-wider">
            Category:
          </span>
          <span className="font-syne font-extrabold text-base sm:text-lg text-[#f2efeb] tracking-tight ml-2 uppercase">
            {viewTitle}
          </span>
          <p className="text-xs text-[rgba(242,239,235,0.5)] font-mono mt-0.5">
            {viewSubtitle}
          </p>
        </div>

        <button
          onClick={() => onOpenCreate(isAll ? 'DAILY_INSPECTION' : activeQaType)}
          className="bg-[#facc15] hover:bg-[#fde047] text-[#111113] border-none px-4 py-2.5 rounded font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition active:scale-95 shadow-md shadow-[#facc15]/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{createButtonLabel}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-[rgba(242,239,235,0.4)] absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="FILTER INSPEKSI RIGID: Unit, EGI, PIC, Tanggal, ID..."
          className="w-full bg-[#18181b] border border-[rgba(242,239,235,0.15)] hover:border-[rgba(242,239,235,0.25)] rounded pl-9 pr-3 py-2 text-xs font-mono text-[#f2efeb] placeholder-[rgba(242,239,235,0.4)] focus:border-[#facc15] outline-none transition"
        />
      </div>

      {/* Inspection List Cards */}
      <div className="space-y-4">
        {filtered.map((item, index) => {
          const defects = item.items.filter(i => i.status === 'DEFECT');
          const monitors = item.items.filter(i => i.status === 'MONITOR');
          const okCount = item.items.filter(i => i.status === 'OK').length;
          const measurements = item.items.filter(i => i.value && i.value.trim() !== '');

          return (
            <div
              key={`${item.id}-${index}`}
              className={`bg-[#18181b] border border-[rgba(242,239,235,0.1)] hover:border-[rgba(242,239,235,0.25)] rounded p-4 sm:p-5 space-y-3.5 transition shadow-sm ${
                defects.length > 0 ? 'border-l-[3px] border-[#fb7185]' : ''
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="unit-info">
                  <div className="flex items-center space-x-2.5">
                    <h2 className="font-syne font-extrabold text-2xl tracking-tight text-[#f2efeb]">
                      {item.codeUnit}
                    </h2>
                    <span className="font-mono text-xs text-[rgba(242,239,235,0.5)]">
                      {item.egi}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.status === 'RUNNING'
                          ? 'border-[#4ade80] text-[#4ade80] bg-[#4ade80]/10'
                          : item.status === 'BREAKDOWN'
                          ? 'border-[#fb7185] text-[#fb7185] bg-[#fb7185]/10'
                          : 'border-[#facc15] text-[#facc15] bg-[#facc15]/10'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-[rgba(242,239,235,0.6)] uppercase tracking-wider mt-1.5">
                    <span>PIC: <strong className="text-[#f2efeb]">{item.picMekanik}</strong></span>
                    <span>•</span>
                    <span>GL: <strong className="text-[#f2efeb]">{item.divalidasiOleh || '-'}</strong></span>
                    <span>•</span>
                    <span>HM: <strong className="text-[#facc15]">{item.hmUnit.toLocaleString()}</strong></span>
                    <span>•</span>
                    <span>{item.tanggal}</span>
                  </div>
                </div>

                {/* Actions Bar (Variation 2 Square Industrial Buttons) */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  {onViewItem && (
                    <button
                      onClick={() => onViewItem(item)}
                      title="Lihat Detail (V)"
                      className="w-8 h-8 flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-[rgba(242,239,235,0.15)] border border-[rgba(242,239,235,0.1)] text-[#f2efeb] rounded transition"
                    >
                      <Eye className="w-4 h-4 text-[#38bdf8]" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const allPhotos = item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls : (item.photoUrl ? [item.photoUrl] : []);
                      shareToWhatsApp(formatDailyRigidWhatsApp(item), {
                        photoUrls: allPhotos,
                        title: `${item.qaType === 'QA7_FINAL' ? 'QA 7 Final Rigid' : item.qaType === 'DAILY_INSPECTION' ? 'Daily Rigid' : 'QA 1 Pre Rigid'} - ${item.codeUnit}`,
                      });
                    }}
                    title="WhatsApp (W)"
                    className="w-8 h-8 flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-[rgba(242,239,235,0.15)] border border-[rgba(242,239,235,0.1)] text-[#4ade80] rounded transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onPrintPreview(item)}
                    title="Cetak PDF (P)"
                    className="w-8 h-8 flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-[rgba(242,239,235,0.15)] border border-[rgba(242,239,235,0.1)] text-[#facc15] rounded transition"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditItem(item)}
                    title="Edit Data (E)"
                    className="w-8 h-8 flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-[rgba(242,239,235,0.15)] border border-[rgba(242,239,235,0.1)] text-[#facc15] rounded transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteItem(item)}
                    title="Hapus (X)"
                    className="w-8 h-8 flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-[#fb7185]/20 border border-[rgba(242,239,235,0.1)] hover:border-[#fb7185]/40 text-[#fb7185] rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Systematic Parameter Grid (Variation 2) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 py-2 border-t border-[rgba(242,239,235,0.08)] text-xs text-[rgba(242,239,235,0.6)] font-mono">
                {item.items.slice(0, 6).map((chk) => (
                  <div key={chk.id} className="truncate">
                    <span className="text-[rgba(242,239,235,0.5)]">{chk.name.replace(/^\d+\.\s*/, '')}: </span>
                    <strong className={chk.status === 'OK' ? 'text-[#4ade80]' : chk.status === 'DEFECT' ? 'text-[#fb7185]' : 'text-[#facc15]'}>
                      {chk.status}
                    </strong>
                  </div>
                ))}
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
                        key={`${item.id}-${m.id}`}
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

              {/* Foto Dokumentasi Inspeksi Unit (Bisa lebih dari 1 foto) */}
              {(() => {
                const photos = item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls : (item.photoUrl ? [item.photoUrl] : []);
                if (photos.length === 0) return null;

                return (
                  <div className="bg-slate-850/60 p-2.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-300 font-semibold text-[11px]">
                        <Camera className="w-3.5 h-3.5 text-amber-400" />
                        <span>Dokumentasi Foto Inspeksi ({photos.length} Foto)</span>
                      </div>
                      <span className="text-[10px] text-slate-500">Klik untuk melihat galeri</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {photos.map((pUrl, pIdx) => (
                        <button
                          key={`${item.id}-photo-${pIdx}`}
                          type="button"
                          onClick={() =>
                            setPreviewPhoto({
                              urls: photos,
                              index: pIdx,
                              title: `${item.qaType === 'QA7_FINAL' ? 'QA 7 Final Rigid' : item.qaType === 'DAILY_INSPECTION' ? 'Daily Rigid' : 'QA 1 Pre Rigid'} - ${item.codeUnit}`,
                              subtitle: `Foto ${pIdx + 1} dari ${photos.length} | ${item.tanggal} (${item.status})`,
                            })
                          }
                          className="relative group w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-slate-700 hover:ring-2 hover:ring-amber-400 transition"
                        >
                          <img
                            src={pUrl}
                            alt={`Foto ${pIdx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                          />
                          <span className="absolute bottom-0 right-0 bg-slate-950/80 text-amber-400 text-[9px] font-bold px-1 rounded-tl">
                            #{pIdx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Live Connected Backlogs & Activities Panel */}
              {(() => {
                const unitBacklogs = backlogs.filter(
                  b => b.codeUnit.toUpperCase() === item.codeUnit.toUpperCase() && b.status !== 'CLOSED'
                );
                const unitActs = activities.filter(
                  a => a.codeUnit.toUpperCase() === item.codeUnit.toUpperCase()
                );

                if (unitBacklogs.length === 0 && unitActs.length === 0) return null;

                return (
                  <div className="bg-black/30 p-3 border-l-[3px] border-[#facc15] rounded-r space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold uppercase text-[#facc15]">
                        Connected Backlogs ({unitBacklogs.length})
                      </span>
                      <span className="text-[10px] text-[rgba(242,239,235,0.5)]">
                        {unitActs.length} ACTIVITIES
                      </span>
                    </div>

                    {unitBacklogs.length > 0 && (
                      <div className="space-y-1">
                        {unitBacklogs.map((b, bIdx) => (
                          <div
                            key={`${item.id}-bl-${b.id}-${bIdx}`}
                            className="flex items-center justify-between text-xs py-1 border-b border-[rgba(242,239,235,0.06)] last:border-none"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-mono text-[#facc15] font-bold">[{b.status}]</span>{' '}
                              <span className="text-[rgba(242,239,235,0.85)] truncate">{b.deskripsiBacklog}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 shrink-0">
                              {b.partNumber && b.partNumber !== '-' && (
                                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[rgba(242,239,235,0.08)] text-[#f2efeb] rounded">
                                  {b.partNumber}
                                </span>
                              )}
                              {onViewBacklog && (
                                <button
                                  type="button"
                                  onClick={() => onViewBacklog(b)}
                                  className="w-6 h-6 flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-[rgba(242,239,235,0.15)] border border-[rgba(242,239,235,0.1)] text-[#38bdf8] rounded"
                                  title="Lihat Detail Backlog"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              )}
                              {onEditBacklog && (
                                <button
                                  type="button"
                                  onClick={() => onEditBacklog(b)}
                                  className="w-6 h-6 flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-[rgba(242,239,235,0.15)] border border-[rgba(242,239,235,0.1)] text-[#facc15] rounded"
                                  title="Edit Backlog"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {unitActs.length > 0 && (
                      <div className="pt-1.5 border-t border-[rgba(242,239,235,0.06)] flex items-center justify-between text-[11px] font-mono text-[rgba(242,239,235,0.6)]">
                        <span>LATEST ACTIVITY: {unitActs[0].deskripsiAktivitas}</span>
                        <span className="text-[#4ade80]">({unitActs[0].status})</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Bottom Footer Meta & Interconnected Backlog/Activity Links */}
              {(() => {
                const liveBacklogs = backlogs.filter(
                  b => b.codeUnit.toUpperCase() === item.codeUnit.toUpperCase() && b.status !== 'CLOSED'
                );
                const liveActivities = activities.filter(
                  a => a.codeUnit.toUpperCase() === item.codeUnit.toUpperCase()
                );
                const countBL = liveBacklogs.length > 0 ? liveBacklogs.length : item.jumlahBacklog;
                const countAct = liveActivities.length > 0 ? liveActivities.length : item.jumlahAktivitas;

                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>PIC: <strong className="text-slate-200">{item.picMekanik}</strong></span>
                      <span>Group Leader: <strong className="text-slate-200">{item.divalidasiOleh}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px]">
                      <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-semibold font-mono">
                        Backlog: {countBL}
                      </span>
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold font-mono">
                        Aktivitas: {countAct}
                      </span>
                      {onOpenAddBacklog && (
                        <button
                          onClick={() => onOpenAddBacklog(item.codeUnit)}
                          className="text-amber-400 hover:text-amber-300 underline font-semibold"
                          title="Tambah Backlog untuk Unit Ini"
                        >
                          +BL
                        </button>
                      )}
                      {onOpenAddActivity && (
                        <button
                          onClick={() => onOpenAddActivity(item.codeUnit)}
                          className="text-emerald-400 hover:text-emerald-300 underline font-semibold"
                          title="Tambah Aktivitas untuk Unit Ini"
                        >
                          +ACT
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
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
          photoUrl={previewPhoto.urls[previewPhoto.index || 0]}
          photoUrls={previewPhoto.urls}
          initialIndex={previewPhoto.index || 0}
          title={previewPhoto.title}
          subtitle={previewPhoto.subtitle}
        />
      )}
    </div>
  );
};
