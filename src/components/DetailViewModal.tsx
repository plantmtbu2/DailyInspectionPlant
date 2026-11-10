import React, { useState } from 'react';
import {
  X,
  Printer,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Gauge,
  User,
  ShieldCheck,
  AlertOctagon,
  Wrench,
  Package,
  Calendar,
  MapPin,
  Tag,
  Edit3,
  Eye,
  FileText,
  Truck,
  Tractor,
  FileWarning,
} from 'lucide-react';
import { BacklogItem, AddActivityItem } from '../types';
import { PhotoPreviewModal } from './PhotoPreviewModal';

interface DetailViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  data: any;
  type: 'RIGID' | 'ARTIC' | 'BAP' | 'BACKLOG' | 'ACTIVITY' | 'UNIT';
  onPrint?: () => void;
  onEdit?: () => void;
  onOpenPhotoPreview?: (urls: string[], index: number) => void;
  allBacklogs?: BacklogItem[];
  allActivities?: AddActivityItem[];
  onOpenEditBacklog?: (item: BacklogItem) => void;
  onEditBacklog?: (item: BacklogItem) => void;
  onViewBacklog?: (item: BacklogItem) => void;
}

export const DetailViewModal: React.FC<DetailViewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  data,
  type,
  onPrint,
  onEdit,
  onOpenPhotoPreview,
  allBacklogs = [],
  allActivities = [],
  onOpenEditBacklog,
  onEditBacklog,
  onViewBacklog,
}) => {
  const [previewPhoto, setPreviewPhoto] = useState<{ urls: string[]; index: number } | null>(null);

  const handleEditBacklog = onOpenEditBacklog || onEditBacklog;
  if (!isOpen || !data) return null;

  const photos: string[] =
    data.photoUrls && data.photoUrls.length > 0
      ? data.photoUrls
      : data.photoUrl
      ? [data.photoUrl]
      : [];

  const unitCode = data.codeUnit || data.id || '';
  const linkedBacklogs = unitCode
    ? allBacklogs.filter(
        b => b.codeUnit && b.codeUnit.trim().toUpperCase() === unitCode.trim().toUpperCase()
      )
    : [];

  const linkedActivities = unitCode
    ? allActivities.filter(
        a => a.codeUnit && a.codeUnit.trim().toUpperCase() === unitCode.trim().toUpperCase()
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#18181b] border border-[rgba(242,239,235,0.15)] rounded w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[rgba(242,239,235,0.1)] flex items-center justify-between bg-[#18181b] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-[rgba(250,204,21,0.1)] text-[#facc15] border border-[#facc15]/30">
              {type === 'RIGID' ? (
                <Truck className="w-5 h-5" />
              ) : type === 'ARTIC' ? (
                <Tractor className="w-5 h-5" />
              ) : type === 'BAP' ? (
                <FileWarning className="w-5 h-5" />
              ) : type === 'BACKLOG' ? (
                <AlertOctagon className="w-5 h-5" />
              ) : type === 'ACTIVITY' ? (
                <Wrench className="w-5 h-5" />
              ) : (
                <Gauge className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-syne font-extrabold uppercase text-[#f2efeb]">{title}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[rgba(250,204,21,0.1)] text-[#facc15] border border-[#facc15]/30 font-bold">
                  {data.id || data.codeUnit}
                </span>
              </div>
              {subtitle && <p className="text-xs font-mono text-[rgba(242,239,235,0.5)] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.1)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs text-[#f2efeb]">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#111113] p-3.5 rounded border border-[rgba(242,239,235,0.1)]">
            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-semibold">Code Unit</span>
              <strong className="text-white text-sm font-mono tracking-wide">{data.codeUnit || data.id || '-'}</strong>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-semibold">EGI / Brand</span>
              <span className="text-slate-200 font-semibold">{data.egi || data.brand || data.tipeAlat || '-'}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-semibold">Status</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded text-[11px] inline-block mt-0.5 border ${
                  data.status === 'RUNNING' || data.status === 'READY' || data.status === 'DONE' || data.status === 'CLOSED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : data.status === 'BREAKDOWN' || data.status === 'OPEN' || data.status === 'WAITING_PART'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {data.status || data.statusUnit || 'ACTIVE'}
              </span>
            </div>

            {(data.tanggal || data.tanggalTemuan) && (
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-semibold">Tanggal</span>
                <span className="font-mono text-slate-200">{data.tanggal || data.tanggalTemuan}</span>
              </div>
            )}

            {(data.startTime || data.jam) && (
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-semibold">Waktu / Durasi</span>
                <span className="font-mono text-slate-200">
                  {data.startTime ? `${data.startTime} - ${data.finishTime || ''} (${data.totalJam || ''})` : data.jam}
                </span>
              </div>
            )}

            {(data.hmUnit !== undefined || data.hm !== undefined || data.currentHm !== undefined) && (
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-semibold">Hour Meter (HM)</span>
                <span className="font-mono font-bold text-amber-400">
                  {Number(data.hmUnit ?? data.hm ?? data.currentHm ?? 0).toLocaleString()} HM
                </span>
              </div>
            )}

            {data.picMekanik && (
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-semibold">PIC Mekanik</span>
                <span className="text-slate-200">{data.picMekanik}</span>
              </div>
            )}

            {data.pic && (
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-semibold">PIC</span>
                <span className="text-slate-200">{data.pic}</span>
              </div>
            )}

            {data.divalidasiOleh && (
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-semibold">Divalidasi Oleh</span>
                <span className="text-slate-200">{data.divalidasiOleh}</span>
              </div>
            )}

            {data.mo && (
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-semibold">No Maintenance Order (MO)</span>
                <span className="font-mono text-amber-400 font-bold">{data.mo}</span>
              </div>
            )}

            {data.lokasiPekerjaan && (
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-semibold">Lokasi Pekerjaan</span>
                <span className="text-slate-200">{data.lokasiPekerjaan}</span>
              </div>
            )}

            {data.lokasiPit && (
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-semibold">Lokasi PIT</span>
                <span className="text-slate-200">{data.lokasiPit}</span>
              </div>
            )}
          </div>

          {/* SECTION: CHECKLIST ITEMS (RIGID / ARTIC) */}
          {(type === 'RIGID' || type === 'ARTIC') && data.items && data.items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase tracking-wider text-xs">
                  Hasil 19 / 36 Parameter Checklist ({data.items.length} Item)
                </span>
                <div className="flex items-center space-x-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                    {data.items.filter((i: any) => i.status === 'OK').length} OK
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                    {data.items.filter((i: any) => i.status === 'MONITOR').length} Monitor
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-bold">
                    {data.items.filter((i: any) => i.status === 'DEFECT').length} Defect
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1.5 bg-slate-950/60 rounded-xl border border-slate-800">
                {data.items.map((it: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
                      it.status === 'DEFECT'
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : it.status === 'MONITOR'
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] text-slate-200 block truncate">{it.name}</span>
                      {it.remark && <span className="text-[10px] text-amber-400 italic block">{it.remark}</span>}
                    </div>

                    <div className="shrink-0 flex items-center space-x-1">
                      {it.value && (
                        <span className="text-[10px] font-mono text-amber-400 bg-slate-850 px-1.5 py-0.5 rounded">
                          {it.value}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          it.status === 'OK'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : it.status === 'DEFECT'
                            ? 'bg-rose-500/20 text-rose-300'
                            : it.status === 'MONITOR'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {it.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: BACKLOG MODULE SPECIFIC CONTENT */}
          {type === 'BACKLOG' && (
            <div className="space-y-3">
              <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Deskripsi Backlog</span>
                <p className="text-white text-xs leading-relaxed">{data.deskripsiBacklog}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">MO Backlog:</span>
                    <strong className="text-amber-400 font-mono">{data.moBacklog || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nomor Reservasi:</span>
                    <strong className="text-white font-mono">{data.nomorReservasi || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Sumber Temuan:</span>
                    <span className="text-slate-300">{data.sumberTemuan || 'MANUAL'}</span>
                  </div>
                </div>
              </div>

              {/* Spareparts list */}
              {data.parts && data.parts.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    <span>Daftar Sparepart Terkait ({data.parts.length} Item)</span>
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {data.parts.map((p: any, pIdx: number) => (
                      <div
                        key={pIdx}
                        className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-amber-400">{p.partNumber}</span>
                            <span className="text-slate-300">{p.deskripsiPart}</span>
                          </div>
                        </div>
                        <span className="font-mono text-slate-200 bg-slate-800 px-2 py-0.5 rounded font-bold">
                          Qty: {p.qty} Pcs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                data.partNumber && (
                  <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800 text-xs">
                    <span className="text-slate-400 text-[10px] block uppercase font-semibold">Sparepart Utama</span>
                    <span className="font-mono font-bold text-amber-400">{data.partNumber}</span> -{' '}
                    <span className="text-slate-200">{data.deskripsiPart}</span> (Qty: {data.qty})
                  </div>
                )
              )}
            </div>
          )}

          {/* SECTION: BAP MODULE SPECIFIC CONTENT */}
          {type === 'BAP' && (
            <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div>
                <span className="text-[10px] text-rose-400 font-bold block uppercase mb-1">
                  Deskripsi Kerusakan & Gejala
                </span>
                <p className="text-white text-xs leading-relaxed whitespace-pre-line">{data.kerusakan}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-semibold">Estimasi Pekerjaan</span>
                  <span className="text-amber-400 font-semibold">{data.estimasiPekerjaan}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-semibold">Lokasi Pekerjaan</span>
                  <span className="text-slate-200">{data.lokasiPekerjaan}</span>
                </div>
              </div>

              {data.catatanTambahan && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase font-semibold">Catatan Tambahan</span>
                  <p className="text-slate-300 text-xs">{data.catatanTambahan}</p>
                </div>
              )}
            </div>
          )}

          {/* SECTION: ACTIVITY MODULE SPECIFIC CONTENT */}
          {type === 'ACTIVITY' && (
            <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold block uppercase mb-1">
                  Deskripsi Aktivitas / Temuan
                </span>
                <p className="text-white text-xs leading-relaxed whitespace-pre-line">{data.deskripsiAktivitas}</p>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] text-amber-400 font-bold block uppercase mb-1">
                  Tindakan Perbaikan (Action)
                </span>
                <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-line">{data.action}</p>
              </div>
            </div>
          )}

          {/* Temuan Deviasi (Rigid / Artic) */}
          {data.temuanDeviasi && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-300">
              <strong className="block text-[10px] uppercase text-amber-400 mb-0.5">
                Temuan Deviasi / ADD ACTIVITIES:
              </strong>
              <p className="whitespace-pre-line">{data.temuanDeviasi}</p>
            </div>
          )}

          {/* SECTION: LINKED BACKLOGS FOR RIGID, ARTIC, OR UNIT (BISA DILIHAT DAN DIUBAH) */}
          {(type === 'RIGID' || type === 'ARTIC' || type === 'UNIT') && (
            <div className="bg-slate-850/90 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertOctagon className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white text-xs">
                    Backlog Terkait Unit ({linkedBacklogs.length} Item)
                  </span>
                </div>
                <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-mono">
                  Dapat Dilihat & Diubah
                </span>
              </div>

              {linkedBacklogs.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {linkedBacklogs.map(b => (
                    <div
                      key={b.id}
                      className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold font-mono text-amber-400">{b.partNumber || b.moBacklog}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                              b.status === 'READY_TO_INSTALL'
                                ? 'bg-blue-500/20 text-blue-300'
                                : b.status === 'CLOSED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs truncate mt-0.5">{b.deskripsiBacklog}</p>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        {onViewBacklog && (
                          <button
                            type="button"
                            onClick={() => onViewBacklog(b)}
                            className="p-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                            title="Lihat Detail Backlog"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Lihat</span>
                          </button>
                        )}
                        {handleEditBacklog && (
                          <button
                            type="button"
                            onClick={() => handleEditBacklog(b)}
                            className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center space-x-1 transition"
                            title="Ubah Backlog Ini"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Ubah</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic py-1">
                  Tidak ada catatan backlog tertunda untuk unit ini.
                </p>
              )}
            </div>
          )}

          {/* Photos Gallery */}
          {photos.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Dokumentasi Foto ({photos.length} Foto) - Klik untuk memperbesar</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {photos.map((pUrl: string, pIdx: number) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => {
                      if (onOpenPhotoPreview) {
                        onOpenPhotoPreview(photos, pIdx);
                      } else {
                        setPreviewPhoto({ urls: photos, index: pIdx });
                      }
                    }}
                    className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 hover:border-amber-400 transition"
                  >
                    <img
                      src={pUrl}
                      alt={`Foto ${pIdx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                    <span className="absolute bottom-0 right-0 bg-slate-950/80 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-tl">
                      #{pIdx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[rgba(242,239,235,0.1)] bg-[#18181b] flex items-center justify-between shrink-0 font-mono text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#111113] hover:bg-[rgba(242,239,235,0.08)] text-[rgba(242,239,235,0.7)] border border-[rgba(242,239,235,0.15)] rounded uppercase font-bold transition"
          >
            Tutup
          </button>

          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="py-2 px-4 bg-[#facc15] hover:bg-[#fde047] text-[#111113] font-black rounded uppercase tracking-wider flex items-center space-x-1.5 transition shadow-md shadow-[#facc15]/20 active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Ubah Data</span>
              </button>
            )}
            {onPrint && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPrint();
                }}
                className="py-2 px-4 bg-[#111113] hover:bg-[rgba(242,239,235,0.08)] text-[#f2efeb] border border-[rgba(242,239,235,0.15)] rounded uppercase font-bold flex items-center space-x-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5 text-[#facc15]" />
                <span>Cetak PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {previewPhoto && (
        <PhotoPreviewModal
          isOpen={true}
          onClose={() => setPreviewPhoto(null)}
          photoUrl={previewPhoto.urls[previewPhoto.index]}
          photoUrls={previewPhoto.urls}
          initialIndex={previewPhoto.index}
          title={`Foto Dokumentasi: ${title}`}
          subtitle={`Foto ${previewPhoto.index + 1} dari ${previewPhoto.urls.length}`}
        />
      )}
    </div>
  );
};
