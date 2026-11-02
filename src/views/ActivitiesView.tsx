import React, { useState } from 'react';
import { AddActivityItem } from '../types';
import {
  Wrench,
  Plus,
  Search,
  MessageSquare,
  Printer,
  Calendar,
  Edit3,
  Trash2,
  Camera,
} from 'lucide-react';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { formatActivityWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';

import { CodeUnit } from '../types';

interface ActivitiesViewProps {
  activities: AddActivityItem[];
  units?: CodeUnit[];
  onOpenCreate: () => void;
  onEditItem: (item: AddActivityItem) => void;
  onDeleteItem: (item: AddActivityItem) => void;
  onUpdateStatus: (id: string, status: AddActivityItem['status']) => void;
  onPrintPreview: (item: AddActivityItem) => void;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  activities,
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

  const availableUnits = Array.from(new Set(activities.map(a => a.codeUnit)));

  const filtered = activities.filter(item => {
    const matchesSearch =
      item.codeUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.deskripsiAktivitas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pic.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchesUnit = filterUnit === 'ALL' || item.codeUnit === filterUnit;
    return matchesSearch && matchesStatus && matchesUnit;
  });

  const getStatusBadge = (status: AddActivityItem['status']) => {
    switch (status) {
      case 'DONE':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'MONITORING':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'PENDING':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              MENU ADD ACTIVITIES MEKANIK
            </h2>
            <p className="text-xs text-slate-400">
              Pencatatan tindakan servis langsung, perbaikan lapangan, dan greasing berkala per Code Unit
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreate}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Aktivitas</span>
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
              placeholder="Cari Aktivitas (Code Unit, Deskripsi, Tindakan, PIC)..."
              className="w-full bg-slate-850 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:border-emerald-400 outline-none"
            />
          </div>

          <div className="flex space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'DONE', 'MONITORING', 'PENDING'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition border ${
                  filterStatus === st
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {st === 'ALL' ? 'Semua Status' : st}
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
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-850 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              Semua ({activities.length})
            </button>
            {availableUnits.map(u => {
              const uCount = activities.filter(a => a.codeUnit === u).length;
              return (
                <button
                  key={u}
                  onClick={() => setFilterUnit(u)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap transition border ${
                    filterUnit === u
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
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

      {/* Activities List Cards */}
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
                    {item.id}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1">
                  <span>📅 {item.tanggalTemuan}</span>
                  <span>•</span>
                  <span>PIC: <strong className="text-slate-300">{item.pic}</strong></span>
                </div>
              </div>

              {/* Actions: WA, Print, Edit, Delete */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={() => shareToWhatsApp(formatActivityWhatsApp(item))}
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
                  title="Edit aktivitas ini"
                  className="p-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl transition"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteItem(item)}
                  title="Hapus aktivitas ini"
                  className="p-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Description & Action Box */}
            <div className="space-y-2 text-xs">
              <div className="bg-slate-850/80 rounded-xl p-3 border border-slate-800/80">
                <span className="text-[10px] text-emerald-400 font-bold block uppercase mb-1">
                  Deskripsi Aktivitas / Temuan:
                </span>
                <p className="text-slate-200 leading-relaxed whitespace-pre-line">
                  {item.deskripsiAktivitas}
                </p>
              </div>

              <div className="bg-slate-850/40 rounded-xl p-3 border border-slate-800/60">
                <span className="text-[10px] text-amber-400 font-bold block uppercase mb-1">
                  Action (Tindakan Perbaikan):
                </span>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">{item.action}</p>
              </div>
            </div>

            {/* Foto Dokumentasi Aktivitas */}
            {item.photoUrl && (
              <div className="flex items-center space-x-3 bg-slate-850/60 p-2 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewPhoto({
                      url: item.photoUrl!,
                      title: `Aktivitas Mekanik: ${item.codeUnit}`,
                      subtitle: `${item.tanggalTemuan} (${item.status}) | PIC: ${item.pic}`,
                    })
                  }
                  className="relative group w-20 h-16 rounded-lg overflow-hidden border border-slate-700 shrink-0 hover:ring-2 hover:ring-emerald-400 transition"
                  title="Klik untuk memperbesar foto aktivitas"
                >
                  <img
                    src={item.photoUrl}
                    alt="Foto Aktivitas"
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[10px] font-bold text-white space-x-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Lihat</span>
                  </div>
                </button>
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 block text-[11px]">Foto Dokumentasi Aktivitas</span>
                  <span className="text-[10px] text-slate-500">Klik gambar untuk melihat foto detail pengerjaan</span>
                </div>
              </div>
            )}

            {/* Status Change Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
              <span className="text-slate-500 text-[10px]">Perbarui Status Pengerjaan:</span>
              <div className="flex items-center space-x-1">
                {(['DONE', 'MONITORING', 'PENDING'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => onUpdateStatus(item.id, st)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                      item.status === st
                        ? st === 'DONE'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : st === 'MONITORING'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">Belum ada aktivitas tercatat</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik "+ Tambah Aktivitas" untuk mencatat tindakan servis dan perbaikan mekanik.
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
