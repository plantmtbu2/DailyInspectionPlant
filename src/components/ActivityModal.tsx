import React, { useState, useEffect } from 'react';
import { AddActivityItem, CodeUnit } from '../types';
import { CodeUnitSelector } from './CodeUnitSelector';
import { PhotoUploader } from './PhotoUploader';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import { X, Wrench, Save, CheckCircle, MessageSquare, Camera } from 'lucide-react';
import { formatActivityWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';
import { formatDateDDMMYYYY, formatDateForInput } from '../utils/dateUtils';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: CodeUnit[];
  onSave: (item: AddActivityItem) => Promise<void>;
  initialCodeUnit?: string;
  itemToEdit?: AddActivityItem | null;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  units,
  onSave,
  initialCodeUnit = '',
  itemToEdit = null,
}) => {
  const [codeUnit, setCodeUnit] = useState(initialCodeUnit);
  const [deskripsiAktivitas, setDeskripsiAktivitas] = useState('');
  const [action, setAction] = useState('');
  const [status, setStatus] = useState<AddActivityItem['status']>('DONE');
  const [tanggalTemuan, setTanggalTemuan] = useState(new Date().toISOString().slice(0, 10));
  const [pic, setPic] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(itemToEdit?.photoUrl);
  const [previewPhoto, setPreviewPhoto] = useState<{
    urls: string[];
    index: number;
    title: string;
    subtitle?: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedItem, setSavedItem] = useState<AddActivityItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFormError(null);
    if (!isOpen) {
      setSavedItem(null);
      return;
    }

    if (itemToEdit) {
      setCodeUnit(itemToEdit.codeUnit || '');
      setDeskripsiAktivitas(itemToEdit.deskripsiAktivitas || '');
      setAction(itemToEdit.action || '');
      setStatus(itemToEdit.status || 'DONE');
      setTanggalTemuan(formatDateForInput(itemToEdit.tanggalTemuan));
      setPic(itemToEdit.pic || '');
      const existingPhotos = itemToEdit.photoUrls && itemToEdit.photoUrls.length > 0
        ? itemToEdit.photoUrls
        : (itemToEdit.photoUrl ? [itemToEdit.photoUrl] : []);
      setPhotoUrls(existingPhotos);
      setPhotoUrl(existingPhotos[0] || undefined);
      setSavedItem(null);
    } else if (initialCodeUnit) {
      setCodeUnit(initialCodeUnit);
      setDeskripsiAktivitas('');
      setAction('');
      setStatus('DONE');
      setTanggalTemuan(new Date().toISOString().slice(0, 10));
      setPic('');
      setPhotoUrls([]);
      setPhotoUrl(undefined);
      setSavedItem(null);
    } else {
      setCodeUnit('');
      setDeskripsiAktivitas('');
      setAction('');
      setStatus('DONE');
      setTanggalTemuan(new Date().toISOString().slice(0, 10));
      setPic('');
      setPhotoUrls([]);
      setPhotoUrl(undefined);
      setSavedItem(null);
    }
  }, [itemToEdit, initialCodeUnit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeUnit) {
      setFormError('Pilih Code Unit terlebih dahulu.');
      return;
    }
    if (!deskripsiAktivitas.trim()) {
      setFormError('Mohon isi Deskripsi Aktivitas.');
      return;
    }
    setFormError(null);

    try {
      setIsSubmitting(true);
      const formattedDate = formatDateDDMMYYYY(tanggalTemuan);
      const item: AddActivityItem = {
        id: itemToEdit ? itemToEdit.id : `ACT-${Date.now().toString().slice(-5)}`,
        codeUnit,
        deskripsiAktivitas,
        action: action || 'Inspeksi & Penyesuaian Komponen',
        status,
        tanggalTemuan: formattedDate,
        pic: pic || 'Mekanik Maintenance',
        photoUrls: photoUrls,
        photoUrl: photoUrls.length > 0 ? photoUrls[0] : undefined,
        syncedToSheets: true,
        createdAt: itemToEdit ? itemToEdit.createdAt : new Date().toISOString(),
      };

      await onSave(item);
      setSavedItem(item);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan Aktivitas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSavedItem(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {itemToEdit ? 'Edit Aktivitas Mekanik' : 'Tambah Aktivitas Mekanik'}
              </h2>
              <p className="text-xs text-slate-400">
                {itemToEdit ? `Mengubah data ${itemToEdit.id}` : 'Pencatatan tindakan servis dan perbaikan lapangan'}
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {savedItem ? (
            <div className="p-5 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Aktivitas Mekanik Berhasil Disimpan!
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  ID: <span className="font-mono text-emerald-400 font-bold">{savedItem.id}</span> • Unit: {savedItem.codeUnit}
                </p>
              </div>

              {/* Photos Gallery */}
              {((savedItem.photoUrls && savedItem.photoUrls.length > 0) || savedItem.photoUrl) && (
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-300 block mb-2">
                    Foto Dokumentasi ({savedItem.photoUrls?.length || 1} Foto):
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto">
                    {(savedItem.photoUrls || [savedItem.photoUrl!]).map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setPreviewPhoto({
                            urls: savedItem.photoUrls || [savedItem.photoUrl!],
                            index: idx,
                            title: `Aktivitas: ${savedItem.codeUnit}`,
                            subtitle: savedItem.deskripsiAktivitas,
                          })
                        }
                        className="relative group rounded-xl overflow-hidden border border-slate-700 h-20 w-24 bg-slate-950 shadow-md"
                      >
                        <img
                          src={url}
                          alt={`Foto Aktivitas ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-[10px] font-semibold space-x-1">
                          <Camera className="w-3.5 h-3.5" />
                          <span>#{idx + 1}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() =>
                    shareToWhatsApp(
                      formatActivityWhatsApp(savedItem),
                      {
                        photoUrls: savedItem.photoUrls || (savedItem.photoUrl ? [savedItem.photoUrl] : []),
                        title: `Laporan Aktivitas ${savedItem.codeUnit}`,
                      }
                    )
                  }
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Kirim via WhatsApp (+ Foto)</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : (
            <form id="activity-form" onSubmit={handleSubmit} className="space-y-3.5">
              {formError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <CodeUnitSelector
                units={units}
                selectedUnit={codeUnit}
                onSelectUnit={u => setCodeUnit(u ? u.codeUnit : '')}
                label="Code Unit Alat Berat *"
              />

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Deskripsi Aktivitas / Temuan *</label>
                <textarea
                  rows={2}
                  required
                  value={deskripsiAktivitas}
                  onChange={e => setDeskripsiAktivitas(e.target.value)}
                  placeholder="Contoh: Pengecekan getaran pin artic, flushing filter hidrolik, adjustment rem..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Action / Tindakan yang Dilakukan *</label>
                <textarea
                  rows={2}
                  required
                  value={action}
                  onChange={e => setAction(e.target.value)}
                  placeholder="Contoh: Dilakukan greasing ulang dengan grease EP-2 dan pengencangan baut flange 120 Nm..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Aktivitas</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:border-amber-400 outline-none"
                  >
                    <option value="DONE">DONE (Selesai Tuntas)</option>
                    <option value="MONITORING">MONITORING (Perlu Pantauan)</option>
                    <option value="PENDING">PENDING (Menunggu Tindak Lanjut)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={tanggalTemuan}
                    onChange={e => setTanggalTemuan(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">PIC Mekanik *</label>
                  <input
                    type="text"
                    required
                    value={pic}
                    onChange={e => setPic(e.target.value)}
                    placeholder="Nama Mekanik"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              {/* Dokumentasi Foto Aktivitas (Bisa Banyak) */}
              <PhotoUploader
                photoUrls={photoUrls}
                onChangePhotos={setPhotoUrls}
                onChange={setPhotoUrl}
                label="Foto Dokumentasi Pengerjaan / Tindakan Mekanik (Bisa Lebih Dari 1)"
                description="Ambil foto proses servis, penggantian sparepart baru, atau hasil akhir pengerjaan dari kamera / galeri"
                onPreviewFullscreen={(url, idx, all) =>
                  setPreviewPhoto({
                    urls: all || [url],
                    index: idx || 0,
                    title: `Foto Aktivitas: ${codeUnit || 'Unit'}`,
                    subtitle: deskripsiAktivitas || 'Dokumentasi Aktivitas',
                  })
                }
              />
            </form>
          )}
        </div>

        {/* Footer */}
        {!savedItem && (
          <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              form="activity-form"
              disabled={isSubmitting}
              className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-amber-500/20"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Menyimpan...'
                  : itemToEdit
                  ? 'Simpan Perubahan & Sync Sheet'
                  : 'Simpan Aktivitas & Sync Sheet'}
              </span>
            </button>
          </div>
        )}
      </div>

      {previewPhoto && (
        <PhotoPreviewModal
          isOpen={true}
          onClose={() => setPreviewPhoto(null)}
          photoUrls={previewPhoto.urls}
          initialIndex={previewPhoto.index}
          title={previewPhoto.title}
          subtitle={previewPhoto.subtitle}
        />
      )}
    </div>
  );
};
