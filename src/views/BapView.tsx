import React, { useState } from 'react';
import { BAPRecord } from '../types';
import {
  FileWarning,
  Plus,
  Search,
  MessageSquare,
  Printer,
  Clock,
  MapPin,
  FileText,
  Edit3,
  Trash2,
  Camera,
} from 'lucide-react';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { formatBAPWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';

interface BapViewProps {
  bapList: BAPRecord[];
  onOpenCreateModal: () => void;
  onEditBAP: (item: BAPRecord) => void;
  onDeleteBAP: (item: BAPRecord) => void;
  onPrintPreview: (bap: BAPRecord) => void;
}

export const BapView: React.FC<BapViewProps> = ({
  bapList,
  onOpenCreateModal,
  onEditBAP,
  onDeleteBAP,
  onPrintPreview,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  const filtered = bapList.filter(item => {
    const matchesSearch =
      item.codeUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kerusakan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.mo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.picMekanik.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <FileWarning className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                1. BAP (Berita Acara Pemeriksaan)
              </h2>
              <p className="text-xs text-slate-400">
                Pencatatan kerusakan alat berat, estimasi pekerjaan, dan MO
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat BAP Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cari BAP (Code Unit, MO, Kerusakan, PIC)..."
            className="w-full bg-slate-850 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:border-rose-400 outline-none"
          />
        </div>

        <div className="flex space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition border ${
                filterStatus === st
                  ? 'bg-rose-600/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {st === 'ALL' ? 'Semua' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Records Cards */}
      <div className="space-y-3">
        {filtered.map(bap => (
          <div
            key={bap.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 space-y-3 transition shadow-sm"
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-base font-black text-white font-mono tracking-wide">
                    {bap.codeUnit}
                  </span>
                  <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {bap.hm.toLocaleString()} HM
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      bap.status === 'OPEN'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : bap.status === 'IN_PROGRESS'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {bap.status}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1 font-mono">
                  <span>ID: {bap.id}</span>
                  <span>•</span>
                  <span>MO: {bap.mo}</span>
                </div>
              </div>

              {/* Action Buttons: WhatsApp, Print, Edit, Delete */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={() => shareToWhatsApp(formatBAPWhatsApp(bap))}
                  title="Share ke WhatsApp"
                  className="p-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 rounded-xl transition"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onPrintPreview(bap)}
                  title="Cetak PDF / Print"
                  className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl transition"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                </button>
                <button
                  onClick={() => onEditBAP(bap)}
                  title="Edit BAP ini"
                  className="p-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl transition"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteBAP(bap)}
                  title="Hapus BAP ini"
                  className="p-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Kerusakan Description & Photo Thumbnail */}
            <div className="bg-slate-850/80 rounded-xl p-3 border border-slate-800/80 text-xs text-slate-200 flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <span className="text-[10px] text-rose-400 font-bold block uppercase mb-1">
                  Kerusakan Unit:
                </span>
                <p className="line-clamp-3 leading-relaxed whitespace-pre-line">{bap.kerusakan}</p>
              </div>

              {bap.photoUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewPhoto({
                      url: bap.photoUrl!,
                      title: `BAP: ${bap.codeUnit} - Kerusakan`,
                      subtitle: `ID: ${bap.id} | MO: ${bap.mo}`,
                    })
                  }
                  className="relative group shrink-0 w-24 h-20 sm:w-28 sm:h-20 rounded-lg overflow-hidden border border-slate-700 hover:ring-2 hover:ring-rose-400 transition"
                  title="Klik untuk memperbesar foto temuan"
                >
                  <img
                    src={bap.photoUrl}
                    alt="Foto Kerusakan"
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[10px] font-bold text-white space-x-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Lihat</span>
                  </div>
                </button>
              )}
            </div>

            {/* Meta tags */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
              <div className="flex items-center space-x-1 truncate">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Est: <strong className="text-slate-300">{bap.estimasiPekerjaan}</strong></span>
              </div>
              <div className="flex items-center space-x-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{bap.lokasiPekerjaan}</span>
              </div>
              <div className="flex items-center space-x-1 truncate">
                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>PIC: <strong className="text-slate-300">{bap.picMekanik}</strong></span>
              </div>
              <div className="text-right text-[10px] text-slate-500">
                {bap.tanggal} {bap.jam}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <FileWarning className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">Belum ada data BAP</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik "+ Buat BAP Baru" untuk mencatat laporan kerusakan alat berat.
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
