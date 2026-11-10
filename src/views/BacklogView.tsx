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
  Eye,
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
  onViewItem?: (item: BacklogItem) => void;
}

export const BacklogView: React.FC<BacklogViewProps> = ({
  backlogs,
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
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'READY_TO_INSTALL':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'SCHEDULED':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'CLOSED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
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
            4. MENU BACKLOG MEKANIK
          </span>
          <p className="text-xs text-[rgba(242,239,235,0.5)] font-mono mt-0.5">
            Pengelolaan temuan komponen rusak, nomor reservasi part, dan status instalasi
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="bg-[#facc15] hover:bg-[#fde047] text-[#111113] border-none px-4 py-2.5 rounded font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition active:scale-95 shadow-md shadow-[#facc15]/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Backlog</span>
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
              placeholder="FILTER BACKLOG: Unit, Part No, MO, Deskripsi, PIC..."
              className="w-full bg-[#18181b] border border-[rgba(242,239,235,0.15)] hover:border-[rgba(242,239,235,0.25)] rounded pl-9 pr-3 py-2 text-xs font-mono text-[#f2efeb] placeholder-[rgba(242,239,235,0.4)] focus:border-[#facc15] outline-none transition"
            />
          </div>

          <div className="flex space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'WAITING_PART', 'READY_TO_INSTALL', 'SCHEDULED', 'CLOSED'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded text-[11px] font-mono font-bold uppercase whitespace-nowrap transition border ${
                  filterStatus === st
                    ? 'bg-[rgba(250,204,21,0.1)] text-[#facc15] border-[#facc15]'
                    : 'bg-[#18181b] text-[rgba(242,239,235,0.6)] border-[rgba(242,239,235,0.1)] hover:border-[rgba(242,239,235,0.25)]'
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
              Semua ({backlogs.length})
            </button>
            {availableUnits.map(u => {
              const uCount = backlogs.filter(b => b.codeUnit === u).length;
              return (
                <button
                  key={`bl-unit-${u}`}
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

      {/* Backlog Items List */}
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
                    MO: {item.moBacklog || '-'}
                  </span>
                  <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(item.status)}`}>
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-[rgba(242,239,235,0.5)] mt-1 font-mono">
                  <span>ID: {item.id}</span>
                  {item.nomorReservasi && item.nomorReservasi !== '-' && (
                    <>
                      <span>•</span>
                      <span className="text-[#facc15] font-bold">Res: {item.nomorReservasi}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>Sumber: {item.sumberTemuan}</span>
                </div>
              </div>

              {/* Actions: View, WA, Print, Edit, Delete */}
              <div className="flex items-center space-x-1.5 shrink-0">
                {onViewItem && (
                  <button
                    onClick={() => onViewItem(item)}
                    title="Lihat Detail Backlog"
                    className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-sky-500/20 border border-[rgba(242,239,235,0.1)] hover:border-sky-500/40 text-sky-400 transition"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    const allPhotos = item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls : (item.photoUrl ? [item.photoUrl] : []);
                    shareToWhatsApp(formatBacklogWhatsApp(item), {
                      photoUrls: allPhotos,
                      title: `Backlog ${item.id} - ${item.codeUnit}`,
                    });
                  }}
                  title="Share ke WhatsApp (Disertai Foto Part/Temuan)"
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
                  title="Edit backlog ini"
                  className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-amber-500/20 border border-[rgba(242,239,235,0.1)] hover:border-amber-500/40 text-amber-300 transition"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteItem(item)}
                  title="Hapus backlog ini"
                  className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-rose-500/20 border border-[rgba(242,239,235,0.1)] hover:border-rose-500/40 text-rose-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Backlog Description */}
            <div className="bg-[#111113] rounded p-3 border border-[rgba(242,239,235,0.1)] text-xs text-[#f2efeb]">
              <span className="font-mono text-[10px] text-[#facc15] font-bold block uppercase tracking-wider mb-1">
                Deskripsi Backlog:
              </span>
              <p className="leading-relaxed whitespace-pre-line">{item.deskripsiBacklog}</p>
            </div>

            {/* Sparepart Info Card */}
            {item.parts && item.parts.length > 0 ? (
              <div className="bg-[#111113] border border-[rgba(242,239,235,0.1)] rounded p-3 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-[rgba(242,239,235,0.1)] pb-1.5">
                  <div className="flex items-center space-x-1.5 text-[#facc15] font-mono font-bold text-[11px] uppercase tracking-wider">
                    <Package className="w-3.5 h-3.5" />
                    <span>Daftar Sparepart Dibutuhkan ({item.parts.length} Jenis)</span>
                  </div>
                  <span className="text-[10px] bg-[rgba(250,204,21,0.1)] text-[#facc15] font-mono font-bold px-2 py-0.5 rounded border border-[#facc15]/30">
                    Total: {item.parts.reduce((sum, p) => sum + (Number(p.qty) || 0), 0)} Pcs
                  </span>
                </div>

                <div className="space-y-1.5">
                  {item.parts.map((p, pIdx) => (
                    <div
                      key={`${item.id}-part-${p.id || pIdx}`}
                      className="flex items-center justify-between gap-2 p-2 bg-[#18181b] border border-[rgba(242,239,235,0.1)] rounded"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-5 h-5 rounded bg-[rgba(242,239,235,0.1)] text-[#facc15] text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                          {pIdx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-[#f2efeb] text-xs block truncate">
                            {p.partNumber || '-'}
                          </span>
                          <span className="text-[11px] text-[rgba(242,239,235,0.7)] truncate block">
                            {p.deskripsiPart || 'Tanpa deskripsi'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-[#facc15] text-xs">
                          {p.qty} Pcs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#111113] border border-[rgba(242,239,235,0.1)] rounded p-2.5 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-[#facc15] shrink-0" />
                  <div>
                    <span className="font-mono text-[10px] text-[rgba(242,239,235,0.5)] block uppercase">Part Number:</span>
                    <span className="font-mono font-bold text-[#f2efeb]">{item.partNumber}</span>
                  </div>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-[rgba(242,239,235,0.5)] block uppercase">Deskripsi Part:</span>
                  <span className="text-[rgba(242,239,235,0.8)] truncate block">{item.deskripsiPart}</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-[rgba(242,239,235,0.5)] block uppercase">Qty Dibutuhkan:</span>
                  <span className="font-mono font-bold text-[#facc15]">{item.qty} Pcs</span>
                </div>
              </div>
            )}

            {/* Foto Temuan Backlog */}
            {(() => {
              const photos = item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls : (item.photoUrl ? [item.photoUrl] : []);
              if (photos.length === 0) return null;

              return (
                <div className="bg-[#111113] p-2.5 rounded border border-[rgba(242,239,235,0.1)] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-[rgba(242,239,235,0.8)] font-mono font-bold text-[11px] uppercase">
                      <Camera className="w-3.5 h-3.5 text-[#facc15]" />
                      <span>Foto Dokumentasi Backlog ({photos.length} Foto)</span>
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
                            title: `Backlog: ${item.codeUnit} - ${item.moBacklog || 'Temuan Part'}`,
                            subtitle: `Foto ${pIdx + 1} dari ${photos.length} | ${item.partNumber} (${item.deskripsiPart})`,
                          })
                        }
                        className="relative group w-16 h-16 sm:w-20 sm:h-20 rounded overflow-hidden border border-[rgba(242,239,235,0.15)] hover:border-[#facc15] transition"
                        title="Klik untuk melihat foto"
                      >
                        <img
                          src={pUrl}
                          alt={`Backlog ${pIdx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                        />
                        <span className="absolute bottom-0 right-0 bg-[#111113]/90 text-[#facc15] font-mono text-[9px] font-bold px-1 rounded-tl">
                          #{pIdx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Bottom: PIC, Tanggal & Inline Status Changer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[rgba(242,239,235,0.1)] text-xs text-[rgba(242,239,235,0.5)] font-mono">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-[rgba(242,239,235,0.4)]" />
                  <span>{item.tanggalTemuan}</span>
                </span>
                <span>PIC: <strong className="text-[#f2efeb]">{item.pic}</strong></span>
              </div>

              {/* Status Update Quick Select */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-[rgba(242,239,235,0.5)] uppercase">Ubah Status:</span>
                <select
                  value={item.status}
                  onChange={e => onUpdateStatus(item.id, e.target.value as any)}
                  className="bg-[#111113] border border-[rgba(242,239,235,0.2)] text-[#f2efeb] text-[10px] font-mono font-bold rounded px-2 py-1 outline-none focus:border-[#facc15]"
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
          <div className="text-center py-12 bg-[#18181b] rounded border border-[rgba(242,239,235,0.1)]">
            <AlertOctagon className="w-10 h-10 text-[rgba(242,239,235,0.3)] mx-auto mb-2" />
            <p className="text-sm font-syne font-bold text-[#f2efeb]">Belum ada item Backlog</p>
            <p className="text-xs font-mono text-[rgba(242,239,235,0.5)] mt-0.5">
              Klik "+ Tambah Backlog" untuk mencatat kebutuhan sparepart dan tindak lanjut perbaikan.
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
