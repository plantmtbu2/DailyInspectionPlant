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
  Eye,
} from 'lucide-react';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { formatBAPWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';

interface BapViewProps {
  bapList: BAPRecord[];
  onOpenCreateModal: () => void;
  onEditBAP: (item: BAPRecord) => void;
  onDeleteBAP: (item: BAPRecord) => void;
  onPrintPreview: (bap: BAPRecord) => void;
  onViewBAP?: (item: BAPRecord) => void;
}

export const BapView: React.FC<BapViewProps> = ({
  bapList,
  onOpenCreateModal,
  onEditBAP,
  onDeleteBAP,
  onPrintPreview,
  onViewBAP,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [previewPhoto, setPreviewPhoto] = useState<{
    urls: string[];
    index?: number;
    title: string;
    subtitle?: string;
  } | null>(null);

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
      <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] text-[rgba(242,239,235,0.5)] uppercase tracking-wider">
            Category:
          </span>
          <span className="font-syne font-extrabold text-base sm:text-lg text-[#f2efeb] tracking-tight ml-2 uppercase">
            1. BERITA ACARA KERUSAKAN (BAP)
          </span>
          <p className="text-xs text-[rgba(242,239,235,0.5)] font-mono mt-0.5">
            Pencatatan kerusakan alat berat, estimasi pekerjaan, dan MO
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="bg-[#fb7185] hover:bg-[#f43f5e] text-white border-none px-4 py-2.5 rounded font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition active:scale-95 shadow-md shadow-[#fb7185]/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat BAP Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[rgba(242,239,235,0.4)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="FILTER BAP: Code Unit, MO, Kerusakan, PIC..."
            className="w-full bg-[#18181b] border border-[rgba(242,239,235,0.15)] hover:border-[rgba(242,239,235,0.25)] rounded pl-9 pr-3 py-2 text-xs font-mono text-[#f2efeb] placeholder-[rgba(242,239,235,0.4)] focus:border-[#fb7185] outline-none transition"
          />
        </div>

        <div className="flex space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded text-[11px] font-mono font-bold uppercase whitespace-nowrap transition border ${
                filterStatus === st
                  ? 'bg-[#fb7185]/20 text-[#fb7185] border-[#fb7185]'
                  : 'bg-[#18181b] text-[rgba(242,239,235,0.6)] border-[rgba(242,239,235,0.1)] hover:border-[rgba(242,239,235,0.25)]'
              }`}
            >
              {st === 'ALL' ? 'Semua Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Records Cards */}
      <div className="space-y-3.5">
        {filtered.map((bap, index) => (
          <div
            key={`${bap.id}-${index}`}
            className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] hover:border-[rgba(242,239,235,0.25)] rounded p-4 sm:p-5 space-y-3.5 transition shadow-sm border-l-[3px] border-[#fb7185]"
          >
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="font-syne font-extrabold text-2xl tracking-tight text-[#f2efeb]">
                    {bap.codeUnit}
                  </h2>
                  <span className="font-mono text-xs text-[#facc15] bg-[#facc15]/10 px-2 py-0.5 rounded border border-[#facc15]/30">
                    {bap.hm.toLocaleString()} HM
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      bap.status === 'OPEN'
                        ? 'border-[#fb7185] text-[#fb7185] bg-[#fb7185]/10'
                        : bap.status === 'IN_PROGRESS'
                        ? 'border-[#facc15] text-[#facc15] bg-[#facc15]/10'
                        : 'border-[#4ade80] text-[#4ade80] bg-[#4ade80]/10'
                    }`}
                  >
                    {bap.status}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-[rgba(242,239,235,0.5)] mt-1 font-mono">
                  <span>ID: {bap.id}</span>
                  <span>•</span>
                  <span>MO: {bap.mo}</span>
                </div>
              </div>

              {/* Action Buttons: View, WhatsApp, Print, Edit, Delete */}
              <div className="flex items-center space-x-1.5 shrink-0">
                {onViewBAP && (
                  <button
                    onClick={() => onViewBAP(bap)}
                    title="Lihat Detail BAP"
                    className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-sky-500/20 border border-[rgba(242,239,235,0.1)] hover:border-sky-500/40 text-sky-400 transition"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    const allPhotos = bap.photoUrls && bap.photoUrls.length > 0 ? bap.photoUrls : (bap.photoUrl ? [bap.photoUrl] : []);
                    shareToWhatsApp(formatBAPWhatsApp(bap), {
                      photoUrls: allPhotos,
                      title: `BAP ${bap.id} - ${bap.codeUnit}`,
                    });
                  }}
                  title="Share ke WhatsApp (Disertai Foto Kerusakan)"
                  className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-emerald-500/20 border border-[rgba(242,239,235,0.1)] hover:border-emerald-500/40 text-emerald-400 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onPrintPreview(bap)}
                  title="Cetak PDF / Print"
                  className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-[#facc15]/20 border border-[rgba(242,239,235,0.1)] hover:border-[#facc15]/40 text-[#facc15] transition"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEditBAP(bap)}
                  title="Edit BAP ini"
                  className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-amber-500/20 border border-[rgba(242,239,235,0.1)] hover:border-amber-500/40 text-amber-300 transition"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteBAP(bap)}
                  title="Hapus BAP ini"
                  className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-rose-500/20 border border-[rgba(242,239,235,0.1)] hover:border-rose-500/40 text-rose-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Kerusakan Description & Photo Thumbnail Gallery */}
            <div className="bg-[#111113] rounded p-3.5 border border-[rgba(242,239,235,0.1)] text-xs text-[#f2efeb] flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <span className="font-mono text-[10px] text-[#fb7185] font-bold block uppercase tracking-wider mb-1">
                  Kerusakan Unit:
                </span>
                <p className="line-clamp-3 leading-relaxed whitespace-pre-line">{bap.kerusakan}</p>
              </div>

              {(() => {
                const photos = bap.photoUrls && bap.photoUrls.length > 0 ? bap.photoUrls : (bap.photoUrl ? [bap.photoUrl] : []);
                if (photos.length === 0) return null;

                return (
                  <div className="flex flex-wrap sm:flex-nowrap gap-1.5 shrink-0">
                    {photos.map((pUrl, pIdx) => (
                      <button
                        key={`${bap.id}-photo-${pIdx}`}
                        type="button"
                        onClick={() =>
                          setPreviewPhoto({
                            urls: photos,
                            index: pIdx,
                            title: `BAP: ${bap.codeUnit} - Kerusakan`,
                            subtitle: `Foto ${pIdx + 1} dari ${photos.length} | ID: ${bap.id} | MO: ${bap.mo}`,
                          })
                        }
                        className="relative group w-20 h-16 sm:w-20 sm:h-20 rounded overflow-hidden border border-[rgba(242,239,235,0.15)] hover:border-[#fb7185] transition"
                        title="Klik untuk memperbesar foto temuan kerusakan"
                      >
                        <img
                          src={pUrl}
                          alt={`Kerusakan ${pIdx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                        />
                        <span className="absolute bottom-0 right-0 bg-[#111113]/90 text-[#fb7185] font-mono text-[9px] font-bold px-1 rounded-tl">
                          #{pIdx + 1}
                        </span>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[10px] font-bold text-white space-x-1">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Meta tags */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-[rgba(242,239,235,0.6)] pt-2 border-t border-[rgba(242,239,235,0.1)]">
              <div className="flex items-center space-x-1 truncate">
                <Clock className="w-3.5 h-3.5 text-[rgba(242,239,235,0.4)] shrink-0" />
                <span>Est: <strong className="text-[#f2efeb]">{bap.estimasiPekerjaan}</strong></span>
              </div>
              <div className="flex items-center space-x-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-[rgba(242,239,235,0.4)] shrink-0" />
                <span className="truncate">{bap.lokasiPekerjaan}</span>
              </div>
              <div className="flex items-center space-x-1 truncate">
                <FileText className="w-3.5 h-3.5 text-[rgba(242,239,235,0.4)] shrink-0" />
                <span>PIC: <strong className="text-[#f2efeb]">{bap.picMekanik}</strong></span>
              </div>
              <div className="text-right text-[11px] text-[rgba(242,239,235,0.5)]">
                {bap.tanggal} {bap.jam}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-[#18181b] rounded border border-[rgba(242,239,235,0.1)]">
            <FileWarning className="w-10 h-10 text-[rgba(242,239,235,0.3)] mx-auto mb-2" />
            <p className="text-sm font-syne font-bold text-[#f2efeb]">Belum ada data BAP</p>
            <p className="text-xs font-mono text-[rgba(242,239,235,0.5)] mt-0.5">
              Klik "+ Buat BAP Baru" untuk mencatat laporan kerusakan alat berat.
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
