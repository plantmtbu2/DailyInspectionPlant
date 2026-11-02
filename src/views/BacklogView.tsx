import React, { useState } from 'react';
import { BacklogItem } from '../types';
import {
  AlertOctagon,
  Plus,
  Search,
  MessageSquare,
  Printer,
  Package,
  Calendar,
  Edit3,
  Trash2,
  Camera,
} from 'lucide-react';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { formatBacklogWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';

import { CodeUnit } from '../types';

interface BacklogViewProps {
  backlogs: BacklogItem[];
  units?: CodeUnit[];
  onOpenCreate: () => void;
  onEditItem: (item: BacklogItem) => void;
  onDeleteItem: (item: BacklogItem) => void;
  onUpdateStatus: (id: string, status: BacklogItem['status']) => void;
  onPrintPreview: (item: BacklogItem) => void;
}

export const BacklogView: React.FC<BacklogViewProps> = ({
  backlogs,
  units = [],
  onOpenCreate,
  onEditItem,
  onDeleteItem,
  onUpdateStatus,
  onPrintPreview,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterUnit, setFilterUnit] = useState<string>('ALL');
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  const availableUnits = Array.from(new Set(backlogs.map(b => b.codeUnit)));

  const filtered = backlogs.filter(item => {
    const matchesSearch =
      item.codeUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.moBacklog.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.deskripsiBacklog.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.deskripsiPart.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pic.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchesUnit = filterUnit === 'ALL' || item.codeUnit === filterUnit;
    return matchesSearch && matchesStatus && matchesUnit;
  });

  const getStatusBadge = (status: BacklogItem['status']) => {
    switch (status) {
      case 'WAITING_PART':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'READY_TO_INSTALL':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'SCHEDULED':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'CLOSED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              4. MENU BACKLOG
            </h2>
            <p className="text-xs text-slate-400">
              Pengelolaan temuan komponen rusak, nomor reservasi part, dan status instalasi
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreate}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Backlog</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari Backlog (Unit, Part No, MO, PIC)..."
              className="w-full bg-slate-850 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:border-amber-400 outline-none"
            />
          </div>

          <div className="flex space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'WAITING_PART', 'READY_TO_INSTALL', 'SCHEDULED', 'CLOSED'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition border ${
                  filterStatus === st
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {st === 'ALL'
                  ? 'Semua Status'
                  : st === 'WAITING_PART'
                  ? 'Waiting Part'
                  : st === 'READY_TO_INSTALL'
                  ? 'Ready'
                  : st === 'SCHEDULED'
                  ? 'Scheduled'
                  : 'Closed'}
              </button>
            ))}
          </div>
        </div>

        {/* Filter per Code Unit (Connected to Code Unit) */}
        {availableUnits.length > 0 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold shrink-0">Unit:</span>
            <button
              onClick={() => setFilterUnit('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap transition border ${
                filterUnit === 'ALL'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-slate-850 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              Semua ({backlogs.length})
            </button>
            {availableUnits.map(u => {
              const uCount = backlogs.filter(b => b.codeUnit === u).length;
              return (
                <button
                  key={u}
                  onClick={() => setFilterUnit(u)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap transition border ${
                    filterUnit === u
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-850 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {u} ({uCount})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Backlog Items List */}
      <div className="space-y-3">
        {filtered.map(item => (
          <div
            key={item.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 space-y-3 transition shadow-sm"
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-base font-black text-white font-mono">{item.codeUnit}</span>
                  <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {item.moBacklog}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(item.status)}`}>
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1 font-mono">
                  <span>ID: {item.id}</span>
                  {item.nomorReservasi && item.nomorReservasi !== '-' && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400 font-semibold">Res: {item.nomorReservasi}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>Sumber: {item.sumberTemuan}</span>
                </div>
              </div>

              {/* Actions: WA, Print, Edit, Delete */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={() => shareToWhatsApp(formatBacklogWhatsApp(item))}
                  title="Share ke WhatsApp"
                  className="p-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 rounded-xl transition"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onPrintPreview(item)}
                  title="Cetak PDF / Print"
                  className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl transition"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                </button>
                <button
                  onClick={() => onEditItem(item)}
                  title="Edit backlog ini"
                  className="p-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl transition"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteItem(item)}
                  title="Hapus backlog ini"
                  className="p-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Backlog Description */}
            <div className="bg-slate-850/80 rounded-xl p-3 border border-slate-800/80 text-xs text-slate-200">
              <span className="text-[10px] text-amber-400 font-bold block uppercase mb-1">
                Deskripsi Backlog:
              </span>
              <p className="leading-relaxed whitespace-pre-line">{item.deskripsiBacklog}</p>
            </div>

            {/* Sparepart Info Card (Mendukung 1 atau Banyak Sparepart) */}
            {item.parts && item.parts.length > 0 ? (
              <div className="bg-slate-850/60 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-[11px] uppercase">
                    <Package className="w-3.5 h-3.5" />
                    <span>Daftar Sparepart Dibutuhkan ({item.parts.length} Jenis)</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/20 font-mono">
                    Total: {item.parts.reduce((sum, p) => sum + (Number(p.qty) || 0), 0)} Pcs
                  </span>
                </div>

                <div className="space-y-1.5">
                  {item.parts.map((p, pIdx) => (
                    <div
                      key={p.id || pIdx}
                      className="flex items-center justify-between gap-2 p-2 bg-slate-900/80 border border-slate-800/80 rounded-lg"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {pIdx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-white text-xs block truncate">
                            {p.partNumber || '-'}
                          </span>
                          <span className="text-[11px] text-slate-300 truncate block">
                            {p.deskripsiPart || 'Tanpa deskripsi'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-amber-400 text-xs">
                          {p.qty} Pcs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-850/40 border border-slate-850 rounded-xl p-2.5 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Part Number:</span>
                    <span className="font-mono font-bold text-white">{item.partNumber}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Deskripsi Part:</span>
                  <span className="text-slate-300 truncate block">{item.deskripsiPart}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Qty Dibutuhkan:</span>
                  <span className="font-mono font-bold text-amber-400">{item.qty} Pcs</span>
                </div>
              </div>
            )}

            {/* Foto Temuan Backlog */}
            {item.photoUrl && (
              <div className="flex items-center space-x-3 bg-slate-850/60 p-2 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewPhoto({
                      url: item.photoUrl!,
                      title: `Backlog: ${item.codeUnit} - ${item.moBacklog || 'Temuan Part'}`,
                      subtitle: `${item.partNumber} (${item.deskripsiPart})`,
                    })
                  }
                  className="relative group w-20 h-16 rounded-lg overflow-hidden border border-slate-700 shrink-0 hover:ring-2 hover:ring-amber-400 transition"
                  title="Klik untuk memperbesar foto part"
                >
                  <img
                    src={item.photoUrl}
                    alt="Foto Backlog"
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[10px] font-bold text-white space-x-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Lihat</span>
                  </div>
                </button>
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 block text-[11px]">Foto Dokumentasi Backlog</span>
                  <span className="text-[10px] text-slate-500">Klik gambar untuk melihat foto detail part/komponen</span>
                </div>
              </div>
            )}

            {/* Bottom: PIC, Tanggal & Inline Status Changer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item.tanggalTemuan}</span>
                </span>
                <span>PIC: <strong className="text-slate-300">{item.pic}</strong></span>
              </div>

              {/* Status Update Quick Select */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-slate-500">Ubah Status:</span>
                <select
                  value={item.status}
                  onChange={e => onUpdateStatus(item.id, e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 text-white text-[10px] rounded-lg px-2 py-1 font-semibold outline-none focus:border-amber-400"
                >
                  <option value="WAITING_PART">WAITING PART</option>
                  <option value="READY_TO_INSTALL">READY TO INSTALL</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <AlertOctagon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">Belum ada item Backlog</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik "+ Tambah Backlog" untuk mencatat kebutuhan sparepart dan tindak lanjut perbaikan.
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
