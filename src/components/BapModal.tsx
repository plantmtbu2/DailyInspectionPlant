import React, { useState, useEffect, useRef } from 'react';
import { BAPRecord, CodeUnit } from '../types';
import { CodeUnitSelector } from './CodeUnitSelector';
import { X, FileWarning, Save, MessageSquare, Printer, CheckCircle, Camera } from 'lucide-react';
import { PhotoUploader } from './PhotoUploader';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import { formatBAPWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';

interface BapModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: CodeUnit[];
  onSaveBAP: (item: BAPRecord) => Promise<void>;
  onPrintPreview: (bap: BAPRecord) => void;
  initialCodeUnit?: string;
  itemToEdit?: BAPRecord | null;
}

export const BapModal: React.FC<BapModalProps> = ({
  isOpen,
  onClose,
  units,
  onSaveBAP,
  onPrintPreview,
  initialCodeUnit = '',
  itemToEdit = null,
}) => {
  const [codeUnit, setCodeUnit] = useState(initialCodeUnit);
  const [hm, setHm] = useState<number>(0);
  const [kerusakan, setKerusakan] = useState('');
  const [estimasiPekerjaan, setEstimasiPekerjaan] = useState('');
  const [lokasiPekerjaan, setLokasiPekerjaan] = useState('');
  const [mo, setMo] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [jam, setJam] = useState(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':'));
  const [picMekanik, setPicMekanik] = useState('');
  const [status, setStatus] = useState<'OPEN' | 'IN_PROGRESS' | 'COMPLETED'>('OPEN');
  const [catatanTambahan, setCatatanTambahan] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(itemToEdit?.photoUrl);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccessRecord, setSavedSuccessRecord] = useState<BAPRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    setFormError(null);
    const wasClosed = !prevIsOpenRef.current;
    if (isOpen && wasClosed) {
      if (itemToEdit) {
        setCodeUnit(itemToEdit.codeUnit);
        setHm(itemToEdit.hm);
        setKerusakan(itemToEdit.kerusakan);
        setEstimasiPekerjaan(itemToEdit.estimasiPekerjaan);
        setLokasiPekerjaan(itemToEdit.lokasiPekerjaan);
        setMo(itemToEdit.mo);
        setTanggal(itemToEdit.tanggal);
        setJam(itemToEdit.jam);
        setPicMekanik(itemToEdit.picMekanik);
        setStatus(itemToEdit.status);
        setCatatanTambahan(itemToEdit.catatanTambahan || '');
        setPhotoUrl(itemToEdit.photoUrl || undefined);
      } else if (initialCodeUnit) {
        setCodeUnit(initialCodeUnit);
        const matched = units.find(
          u => u.codeUnit.toLowerCase() === initialCodeUnit.toLowerCase()
        );
        if (matched) {
          setHm(matched.currentHm);
          setLokasiPekerjaan(matched.lokasiPit);
        }
        setPhotoUrl(undefined);
      } else {
        setCodeUnit('');
        setHm(0);
        setKerusakan('');
        setEstimasiPekerjaan('');
        setLokasiPekerjaan('');
        setMo('');
        setCatatanTambahan('');
        setPhotoUrl(undefined);
      }
      setSavedSuccessRecord(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, itemToEdit, initialCodeUnit, units]);

  if (!isOpen) return null;

  const handleUnitChange = (unit?: CodeUnit) => {
    if (unit) {
      setCodeUnit(unit.codeUnit);
      setHm(unit.currentHm);
      setLokasiPekerjaan(unit.lokasiPit);
    } else {
      setCodeUnit('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeUnit) {
      setFormError('Pilih Code Unit terlebih dahulu.');
      return;
    }
    if (!kerusakan.trim()) {
      setFormError('Mohon isi deskripsi kerusakan.');
      return;
    }
    setFormError(null);

    try {
      setIsSubmitting(true);
      const recordToSave: BAPRecord = {
        id: itemToEdit ? itemToEdit.id : `BAP-${tanggal.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        codeUnit,
        hm: Number(hm) || 0,
        kerusakan,
        estimasiPekerjaan: estimasiPekerjaan || 'TBD',
        lokasiPekerjaan: lokasiPekerjaan || 'PIT Area',
        mo: mo || `MO-${Date.now().toString().slice(-6)}`,
        tanggal,
        jam,
        picMekanik: picMekanik || 'Mekanik On-Duty',
        status,
        catatanTambahan,
        photoUrl: photoUrl || itemToEdit?.photoUrl,
        syncedToSheets: true,
        createdAt: itemToEdit ? itemToEdit.createdAt : new Date().toISOString(),
      };

      await onSaveBAP(recordToSave);
      setSavedSuccessRecord(recordToSave);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan BAP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSavedSuccessRecord(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
              <FileWarning className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {itemToEdit ? 'Edit BAP Kerusakan' : 'Form BAP Kerusakan'}
              </h2>
              <p className="text-xs text-slate-400">
                {itemToEdit ? `Mengubah data untuk ${itemToEdit.id}` : 'Berita Acara Pemeriksaan & Kerusakan Alat Berat'}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetForm}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {savedSuccessRecord ? (
            <div className="p-5 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {itemToEdit ? 'BAP Berhasil Diperbarui!' : 'BAP Berhasil Disimpan!'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Nomor BAP: <strong className="text-amber-400">{savedSuccessRecord.id}</strong> ({savedSuccessRecord.codeUnit})
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tersimpan di perangkat & otomatis disinkronkan ke Google Sheet tab BAP.
                </p>
              </div>

              {savedSuccessRecord.photoUrl && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewPhoto({
                        url: savedSuccessRecord.photoUrl!,
                        title: `Foto BAP - ${savedSuccessRecord.codeUnit}`,
                        subtitle: savedSuccessRecord.id,
                      })
                    }
                    className="relative group rounded-xl overflow-hidden border border-slate-700 max-h-36 shadow-md"
                  >
                    <img
                      src={savedSuccessRecord.photoUrl}
                      alt="Foto BAP"
                      className="max-h-36 object-contain group-hover:scale-105 transition"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs font-semibold space-x-1">
                      <Camera className="w-4 h-4" />
                      <span>Lihat Foto</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Action Buttons: WhatsApp & Print */}
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => shareToWhatsApp(formatBAPWhatsApp(savedSuccessRecord))}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Kirim via WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => onPrintPreview(savedSuccessRecord)}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-2"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Print Dokumen PDF</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Selesai / Tutup
                </button>
              </div>
            </div>
          ) : (
            <form id="bap-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* 1. Code Unit Picker */}
              <CodeUnitSelector
                units={units}
                selectedCodeUnit={codeUnit}
                onChange={handleUnitChange}
              />

              {/* 2. HM & MO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    2. HM (HOUR METER) UNIT *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={hm || ''}
                    onChange={e => setHm(Number(e.target.value))}
                    placeholder="Contoh: 14850"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    6. NO. MO (MAINTENANCE ORDER) *
                  </label>
                  <input
                    type="text"
                    required
                    value={mo}
                    onChange={e => setMo(e.target.value)}
                    placeholder="Contoh: MO-8840192"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono focus:border-amber-400 outline-none uppercase"
                  />
                </div>
              </div>

              {/* 3. Kerusakan */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  3. DESKRIPSI KERUSAKAN *
                </label>
                <textarea
                  required
                  rows={3}
                  value={kerusakan}
                  onChange={e => setKerusakan(e.target.value)}
                  placeholder="Jelaskan detail gejala kerusakan, komponen yang bermasalah, indikator warning, atau suara abnormal..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 outline-none resize-none"
                />
              </div>

              {/* 4. Estimasi Pekerjaan & 5. Lokasi Pekerjaan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    4. ESTIMASI PEKERJAAN *
                  </label>
                  <input
                    type="text"
                    required
                    value={estimasiPekerjaan}
                    onChange={e => setEstimasiPekerjaan(e.target.value)}
                    placeholder="Contoh: 4 Jam / 1 Hari"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    5. LOKASI PEKERJAAN *
                  </label>
                  <input
                    type="text"
                    required
                    value={lokasiPekerjaan}
                    onChange={e => setLokasiPekerjaan(e.target.value)}
                    placeholder="Contoh: Disposal Selatan / Workshop Bay 2"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              {/* PIC Mekanik, Tanggal, Jam & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    PIC Mekanik *
                  </label>
                  <input
                    type="text"
                    required
                    value={picMekanik}
                    onChange={e => setPicMekanik(e.target.value)}
                    placeholder="Nama Mekanik"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Tanggal & Jam
                  </label>
                  <div className="flex space-x-1">
                    <input
                      type="date"
                      value={tanggal}
                      onChange={e => setTanggal(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2.5 text-white focus:border-amber-400 outline-none"
                    />
                    <input
                      type="time"
                      value={jam}
                      onChange={e => setJam(e.target.value)}
                      className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2.5 text-white focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Status BAP
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-amber-400 outline-none"
                  >
                    <option value="OPEN">OPEN (Menunggu Tindakan)</option>
                    <option value="IN_PROGRESS">IN PROGRESS (Sedang Dikerjakan)</option>
                    <option value="COMPLETED">COMPLETED (Selesai Perbaikan)</option>
                  </select>
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Catatan Tambahan (Kebutuhan Part / Special Tools)
                </label>
                <input
                  type="text"
                  value={catatanTambahan}
                  onChange={e => setCatatanTambahan(e.target.value)}
                  placeholder="Opsional: Kebutuhan crane truck, lube truck, oli hidrolik..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400 outline-none"
                />
              </div>

              {/* Dokumentasi Foto BAP Kerusakan */}
              <PhotoUploader
                photoUrl={photoUrl}
                onChange={setPhotoUrl}
                label="Foto Dokumentasi Kerusakan / Temuan BAP"
                description="Ambil foto komponen rusak, indikator panel, kebocoran, atau kondisi fisik unit dari kamera atau galeri"
                onPreviewFullscreen={url =>
                  setPreviewPhoto({
                    url,
                    title: `Foto BAP: ${codeUnit || 'Unit'}`,
                    subtitle: kerusakan || 'Kerusakan Unit',
                  })
                }
              />
            </form>
          )}
        </div>

        {/* Footer */}
        {!savedSuccessRecord && (
          <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              form="bap-form"
              disabled={isSubmitting}
              className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-amber-500/20"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Menyimpan...'
                  : itemToEdit
                  ? 'Simpan Perubahan & Sync Sheet'
                  : 'Simpan BAP & Sync Sheet'}
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
