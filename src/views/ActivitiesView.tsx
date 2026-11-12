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
  Eye,
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
  onViewItem?: (item: AddActivityItem) => void;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  activities,
  units = [],
  onOpenCreate,
  onEditItem,
  onDeleteItem,
  onUpdateStatus,
  onPrintPreview,
  onViewItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterUnit, setFilterUnit] = useState<string>('ALL');
  const [previewPhoto, setPreviewPhoto] = useState<{
    urls: string[];
    index?: number;
    title: string;
    subtitle?: string;
  } | null>(null);

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
        return 'bg-emerald-500/10 text-[#4ade80] border-emerald-500/30';
      case 'MONITORING':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'PENDING':
        return 'bg-amber-500/10 text-[#facc15] border-amber-500/30';
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Industrial Toolbar */}
      <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] text-[rgba(242,239,235,0.5)] uppercase tracking-wider">
            Category:
          </span>
          <span className="font-syne font-extrabold text-base sm:text-lg text-[#f2efeb] tracking-tight ml-2 uppercase">
            AKTIVITAS & SERVIS MEKANIK
          </span>
          <p className="text-xs text-[rgba(242,239,235,0.5)] font-mono mt-0.5">
            Pencatatan tindakan servis langsung, perbaikan lapangan, dan greasing berkala per Code Unit
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="bg-[#4ade80] hover:bg-[#22c55e] text-[#111113] border-none px-4 py-2.5 rounded font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition active:scale-95 shadow-md shadow-[#4ade80]/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Aktivitas</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[rgba(242,239,235,0.4)] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="FILTER AKTIVITAS: Code Unit, Deskripsi, Tindakan, PIC..."
              className="w-full bg-[#18181b] border border-[rgba(242,239,235,0.15)] hover:border-[rgba(242,239,235,0.25)] rounded pl-9 pr-3 py-2 text-xs font-mono text-[#f2efeb] placeholder-[rgba(242,239,235,0.4)] focus:border-[#4ade80] outline-none transition"
            />
          </div>

          <div className="flex space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'DONE', 'MONITORING', 'PENDING'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded text-[11px] font-mono font-bold uppercase whitespace-nowrap transition border ${
                  filterStatus === st
                    ? 'bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]'
                    : 'bg-[#18181b] text-[rgba(242,239,235,0.6)] border-[rgba(242,239,235,0.1)] hover:border-[rgba(242,239,235,0.25)]'
                }`}
              >
                {st === 'ALL' ? 'Semua Status' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Filter per Code Unit */}
        {availableUnits.length > 0 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-[rgba(242,239,235,0.5)] font-mono uppercase shrink-0">Unit:</span>
            <button
              onClick={() => setFilterUnit('ALL')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold whitespace-nowrap transition border ${
                filterUnit === 'ALL'
                  ? 'bg-[rgba(250,204,21,0.1)] text-[#facc15] border-[#facc15]'
                  : 'bg-[#18181b] text-[rgba(242,239,235,0.6)] border-[rgba(242,239,235,0.1)] hover:border-[rgba(242,239,235,0.25)]'
              }`}
            >
              Semua ({activities.length})
            </button>
            {availableUnits.map(u => {
              const uCount = activities.filter(a => a.codeUnit === u).length;
              return (
                <button
                  key={`act-unit-${u}`}
                  onClick={() => setFilterUnit(u)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold whitespace-nowrap transition border ${
                    filterUnit === u
                      ? 'bg-[rgba(250,204,21,0.1)] text-[#facc15] border-[#facc15]'
                      : 'bg-[#18181b] text-[rgba(242,239,235,0.6)] border-[rgba(242,239,235,0.1)] hover:border-[rgba(242,239,235,0.25)]'
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
      <div className="space-y-3.5">
        {filtered.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] hover:border-[rgba(242,239,235,0.25)] rounded p-4 sm:p-5 space-y-3.5 transition shadow-sm"
          >
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="font-syne font-extrabold text-2xl tracking-tight text-[#f2efeb]">
                    {item.codeUnit}
                  </h2>
                  <span className="font-mono text-xs text-[#facc15] bg-[#facc15]/10 px-2 py-0.5 rounded border border-[#facc15]/30">
                    ID: {item.id}
                  </span>
                  <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-[rgba(242,239,235,0.5)] mt-1 font-mono">
                  <span>📅 {item.tanggalTemuan}</span>
                  <span>•</span>
                  <span>PIC: <strong className="text-[#f2efeb]">{item.pic}</strong></span>
                </div>
              </div>

              {/* Actions: View, WA, Print, Edit, Delete */}
              <div className="flex items-center space-x-1.5 shrink-0">
                {onViewItem && (
                  <button
                    onClick={() => onViewItem(item)}
                    title="Lihat Detail Aktivitas"
                    className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-sky-500/20 border border-[rgba(242,239,235,0.1)] hover:border-sky-500/40 text-sky-400 transition"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    const allPhotos = item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls : (item.photoUrl ? [item.photoUrl] : []);
                    shareToWhatsApp(formatActivityWhatsApp(item), {
                      photoUrls: allPhotos,
                      title: `Aktivitas ${item.id} - ${item.codeUnit}`,
                    });
                  }}
                  title="Share ke WhatsApp (Disertai Foto Aktivitas)"
                  className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-emerald-500/20 border border-[rgba(242,239,235,0.1)] hover:border-emerald-500/40 text-emerald-400 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onPrintPreview(item)}
                  title="Cetak PDF / Print"
                  className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-[#facc15]/20 border border-[rgba(242,239,235,0.1)] hover:border-[#facc15]/40 text-[#facc15] transition"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEditItem(item)}
                  title="Edit aktivitas ini"
                  className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-amber-500/20 border border-[rgba(242,239,235,0.1)] hover:border-amber-500/40 text-amber-300 transition"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteItem(item)}
                  title="Hapus aktivitas ini"
                  className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-rose-500/20 border border-[rgba(242,239,235,0.1)] hover:border-rose-500/40 text-rose-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Description & Action Box */}
            <div className="space-y-2 text-xs">
              <div className="bg-[#111113] rounded p-3.5 border border-[rgba(242,239,235,0.1)]">
                <span className="font-mono text-[10px] text-[#4ade80] font-bold block uppercase tracking-wider mb-1">
                  Deskripsi Aktivitas / Temuan:
                </span>
                <p className="text-[#f2efeb] leading-relaxed whitespace-pre-line">
                  {item.deskripsiAktivitas}
                </p>
              </div>

              <div className="bg-[#111113] rounded p-3.5 border border-[rgba(242,239,235,0.1)]">
                <span className="font-mono text-[10px] text-[#facc15] font-bold block uppercase tracking-wider mb-1">
                  Action (Tindakan Perbaikan):
                </span>
                <p className="text-[rgba(242,239,235,0.8)] leading-relaxed whitespace-pre-line">{item.action}</p>
              </div>
            </div>

            {/* Foto Dokumentasi Aktivitas */}
            {(() => {
              const photos = item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls : (item.photoUrl ? [item.photoUrl] : []);
              if (photos.length === 0) return null;

              return (
                <div className="bg-[#111113] p-2.5 rounded border border-[rgba(242,239,235,0.1)] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-[rgba(242,239,235,0.8)] font-mono font-bold text-[11px] uppercase">
                      <Camera className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span>Foto Dokumentasi Aktivitas ({photos.length} Foto)</span>
                    </div>
                    <span className="text-[10px] font-mono text-[rgba(242,239,235,0.4)]">Klik untuk melihat galeri</span>
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
                            title: `Aktivitas Mekanik: ${item.codeUnit}`,
                            subtitle: `Foto ${pIdx + 1} dari ${photos.length} | ${item.tanggalTemuan} (${item.status}) | PIC: ${item.pic}`,
                          })
                        }
                        className="relative group w-16 h-16 sm:w-20 sm:h-20 rounded overflow-hidden border border-[rgba(242,239,235,0.15)] hover:border-[#4ade80] transition"
                        title="Klik untuk melihat foto aktivitas"
                      >
                        <img
                          src={pUrl}
                          alt={`Aktivitas ${pIdx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                        />
                        <span className="absolute bottom-0 right-0 bg-[#111113]/90 text-[#4ade80] font-mono text-[9px] font-bold px-1 rounded-tl">
                          #{pIdx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Status Change Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-[rgba(242,239,235,0.1)] text-xs font-mono">
              <span className="text-[rgba(242,239,235,0.5)] text-[10px] uppercase">Perbarui Status:</span>
              <div className="flex items-center space-x-1.5">
                {(['DONE', 'MONITORING', 'PENDING'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => onUpdateStatus(item.id, st)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border transition ${
                      item.status === st
                        ? st === 'DONE'
                          ? 'bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]'
                          : st === 'MONITORING'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500'
                          : 'bg-[#facc15]/20 text-[#facc15] border-[#facc15]'
                        : 'bg-[#111113] text-[rgba(242,239,235,0.5)] border-[rgba(242,239,235,0.15)] hover:text-[#f2efeb]'
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
          <div className="text-center py-12 bg-[#18181b] rounded border border-[rgba(242,239,235,0.1)]">
            <Wrench className="w-10 h-10 text-[rgba(242,239,235,0.3)] mx-auto mb-2" />
            <p className="text-sm font-syne font-bold text-[#f2efeb]">Belum ada aktivitas tercatat</p>
            <p className="text-xs font-mono text-[rgba(242,239,235,0.5)] mt-0.5">
              Klik "+ Tambah Aktivitas" untuk mencatat tindakan servis dan perbaikan mekanik.
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
