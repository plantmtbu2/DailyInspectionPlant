import React, { useState, useEffect } from 'react';
import { AddActivityItem, CodeUnit } from '../types';
import { CodeUnitSelector } from './CodeUnitSelector';
import { PhotoUploader } from './PhotoUploader';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import {
  X,
  Wrench,
  Save,
  MessageSquare,
  CheckCircle,
  Camera,
} from 'lucide-react';
import { formatActivityWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';

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
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(itemToEdit?.photoUrl);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedItem, setSavedItem] = useState<AddActivityItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFormError(null);
    if (itemToEdit) {
      setCodeUnit(itemToEdit.codeUnit);
      setDeskripsiAktivitas(itemToEdit.deskripsiAktivitas);
      setAction(itemToEdit.action);
      setStatus(itemToEdit.status);
      setTanggalTemuan(itemToEdit.tanggalTemuan);
      setPic(itemToEdit.pic);
      setPhotoUrl(itemToEdit.photoUrl || undefined);
      setSavedItem(null);
    } else if (initialCodeUnit) {
      setCodeUnit(initialCodeUnit);
      setPhotoUrl(undefined);
      setSavedItem(null);
    } else {
      setCodeUnit('');
      setDeskripsiAktivitas('');
      setAction('');
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
      const item: AddActivityItem = {
        id: itemToEdit ? itemToEdit.id : `ACT-${Date.now().toString().slice(-5)}`,
        codeUnit,
        deskripsiAktivitas,
        action: action || 'Inspeksi & Penyesuaian Komponen',
        status,
        tanggalTemuan,
        pic: pic || 'Mekanik Maintenance',
        photoUrl: photoUrl || itemToEdit?.photoUrl,
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
                  {itemToEdit ? 'Aktivitas Berhasil Diperbarui!' : 'Aktivitas Berhasil Dicatat!'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  ID: <strong className="text-emerald-400">{savedItem.id}</strong> ({savedItem.codeUnit})
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tersimpan di perangkat & otomatis masuk ke Google Sheet tab ADD_ACTIVITIES.
                </p>
              </div>

              {savedItem.photoUrl && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewPhoto({
                        url: savedItem.photoUrl!,
                        title: `Aktivitas: ${savedItem.codeUnit}`,
                        subtitle: savedItem.deskripsiAktivitas,
                      })
                    }
                    className="relative group rounded-xl overflow-hidden border border-slate-700 max-h-36 shadow-md"
                  >
                    <img
                      src={savedItem.photoUrl}
                      alt="Foto Aktivitas"
                      className="max-h-36 object-contain group-hover:scale-105 transition"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs font-semibold space-x-1">
                      <Camera className="w-4 h-4" />
                      <span>Lihat Foto</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => shareToWhatsApp(formatActivityWhatsApp(savedItem))}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Kirim via WhatsApp</span>
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
                selectedCodeUnit={codeUnit}
                onChange={u => setCodeUnit(u ? u.codeUnit : '')}
              />

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Deskripsi Aktivitas *</label>
                <textarea
                  required
                  rows={2}
                  value={deskripsiAktivitas}
                  onChange={e => setDeskripsiAktivitas(e.target.value)}
                  placeholder="Contoh: Pembersihan filter udara, penggantian O-ring saluran hidrolik, bleeding angin rem..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Action (Tindakan yang Dilakukan) *</label>
                <textarea
                  required
                  rows={2}
                  value={action}
                  onChange={e => setAction(e.target.value)}
                  placeholder="Contoh: Melakukan flushing oli, penggantian seal kit baru, running test selama 15 menit..."
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
                    <option value="DONE">DONE (Selesai Dikerjakan)</option>
                    <option value="MONITORING">MONITORING (Dalam Pantauan)</option>
                    <option value="PENDING">PENDING (Menunggu Eksekusi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tanggal Temuan / Pengerjaan</label>
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

              {/* Dokumentasi Foto Aktivitas */}
              <PhotoUploader
                photoUrl={photoUrl}
                onChange={setPhotoUrl}
                label="Foto Dokumentasi Pengerjaan / Tindakan Mekanik"
                description="Ambil foto proses servis, penggantian sparepart baru, atau hasil akhir pengerjaan dari kamera / galeri"
                onPreviewFullscreen={url =>
                  setPreviewPhoto({
                    url,
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
          photoUrl={previewPhoto.url}
          title={previewPhoto.title}
          subtitle={previewPhoto.subtitle}
        />
      )}
    </div>
  );
};
