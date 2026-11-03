import React, { useState, useEffect, useRef } from 'react';
import { BAPRecord, CodeUnit } from '../types';
import { CodeUnitSelector } from './CodeUnitSelector';
import { PhotoUploader } from './PhotoUploader';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import { X, FileWarning, Save, CheckCircle, MessageSquare, Printer, Camera } from 'lucide-react';
import { formatBAPWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';

interface BapModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: CodeUnit[];
  onSaveBAP: (record: BAPRecord) => Promise<void>;
  onPrintPreview: (record: BAPRecord) => void;
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
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(itemToEdit?.photoUrl);
  const [previewPhoto, setPreviewPhoto] = useState<{
    urls: string[];
    index: number;
    title: string;
    subtitle?: string;
  } | null>(null);

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

        const existingPhotos = itemToEdit.photoUrls && itemToEdit.photoUrls.length > 0
          ? itemToEdit.photoUrls
          : (itemToEdit.photoUrl ? [itemToEdit.photoUrl] : []);
        setPhotoUrls(existingPhotos);
        setPhotoUrl(existingPhotos[0] || undefined);
      } else if (initialCodeUnit) {
        setCodeUnit(initialCodeUnit);
        const matched = units.find(
          u => u.codeUnit.toLowerCase() === initialCodeUnit.toLowerCase()
        );
        if (matched) {
          setHm(matched.currentHm);
          setLokasiPekerjaan(matched.lokasiPit);
        }
        setPhotoUrls([]);
        setPhotoUrl(undefined);
      } else {
        setCodeUnit('');
        setHm(0);
        setKerusakan('');
        setEstimasiPekerjaan('');
        setLokasiPekerjaan('');
        setMo('');
        setCatatanTambahan('');
        setPhotoUrls([]);
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
      setLokasiPekerjaan(unit.lokasiPit || 'PIT Area');
    } else {
      setCodeUnit('');
      setHm(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeUnit) {
      setFormError('Mohon pilih Code Unit terlebih dahulu.');
      return;
    }
    if (!kerusakan.trim()) {
      setFormError('Deskripsi kerusakan wajib diisi.');
      return;
    }
    setFormError(null);

    try {
      setIsSubmitting(true);
      const recordToSave: BAPRecord = {
        id: itemToEdit ? itemToEdit.id : `BAP-${tanggal.replace(/-/g, '').slice(0, 6)}-${Math.floor(100 + Math.random() * 900)}`,
        codeUnit,
        hm: Number(hm) || 0,
        kerusakan,
        estimasiPekerjaan: estimasiPekerjaan || 'Dalam Analisis',
        lokasiPekerjaan: lokasiPekerjaan || 'Workshop Main',
        mo: mo || `MO-${Date.now().toString().slice(-6)}`,
        tanggal,
        jam,
        picMekanik: picMekanik || 'Mekanik Maintenance',
        status,
        catatanTambahan,
        photoUrls: photoUrls,
        photoUrl: photoUrls.length > 0 ? photoUrls[0] : undefined,
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

              {/* Photos Gallery */}
              {((savedSuccessRecord.photoUrls && savedSuccessRecord.photoUrls.length > 0) || savedSuccessRecord.photoUrl) && (
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-300 block mb-2">
                    Foto Dokumentasi ({savedSuccessRecord.photoUrls?.length || 1} Foto):
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto">
                    {(savedSuccessRecord.photoUrls || [savedSuccessRecord.photoUrl!]).map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setPreviewPhoto({
                            urls: savedSuccessRecord.photoUrls || [savedSuccessRecord.photoUrl!],
                            index: idx,
                            title: `Foto BAP - ${savedSuccessRecord.codeUnit}`,
                            subtitle: savedSuccessRecord.id,
                          })
                        }
                        className="relative group rounded-xl overflow-hidden border border-slate-700 h-20 w-24 bg-slate-950 shadow-md"
                      >
                        <img
                          src={url}
                          alt={`Foto BAP ${idx + 1}`}
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

              {/* Action Buttons: WhatsApp & Print */}
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    shareToWhatsApp(
                      formatBAPWhatsApp(savedSuccessRecord),
                      {
                        photoUrls: savedSuccessRecord.photoUrls || (savedSuccessRecord.photoUrl ? [savedSuccessRecord.photoUrl] : []),
                        title: `Laporan BAP ${savedSuccessRecord.codeUnit}`,
                      }
                    )
                  }
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Kirim via WhatsApp (+ Foto)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onPrintPreview(savedSuccessRecord)}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 active:scale-95 transition"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Print Dokumen PDF</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Tutup Form
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

              {/* Code Unit Selector */}
              <div>
                <CodeUnitSelector
                  units={units}
                  selectedUnit={codeUnit}
                  onSelectUnit={handleUnitChange}
                  label="Code Unit Alat Berat *"
                />
              </div>

              {/* Grid Baris 1: HM & Lokasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Hour Meter (HM) Terakhir *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={hm || ''}
                    onChange={e => setHm(Number(e.target.value))}
                    placeholder="Contoh: 12450"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Lokasi Pekerjaan / PIT *
                  </label>
                  <input
                    type="text"
                    required
                    value={lokasiPekerjaan}
                    onChange={e => setLokasiPekerjaan(e.target.value)}
                    placeholder="Contoh: PIT Barat Sub-4, Workshop Bay 2"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              {/* Deskripsi Kerusakan */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Deskripsi Kerusakan & Gejala *
                </label>
                <textarea
                  required
                  rows={3}
                  value={kerusakan}
                  onChange={e => setKerusakan(e.target.value)}
                  placeholder="Jelaskan secara detail komponen yang rusak, suara/kebocoran, dan kode error jika ada..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 outline-none resize-none"
                />
              </div>

              {/* Estimasi & No MO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Estimasi Waktu Pekerjaan *
                  </label>
                  <input
                    type="text"
                    required
                    value={estimasiPekerjaan}
                    onChange={e => setEstimasiPekerjaan(e.target.value)}
                    placeholder="Contoh: 4 Jam / 1 Shift / 2 Hari"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nomor MO (Maintenance Order)
                  </label>
                  <input
                    type="text"
                    value={mo}
                    onChange={e => setMo(e.target.value)}
                    placeholder="Contoh: MO-883019"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              {/* Tanggal, Jam, Mekanik, Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={e => setTanggal(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jam</label>
                  <input
                    type="time"
                    value={jam}
                    onChange={e => setJam(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">PIC Mekanik *</label>
                  <input
                    type="text"
                    required
                    value={picMekanik}
                    onChange={e => setPicMekanik(e.target.value)}
                    placeholder="Nama Mekanik"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Unit</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white focus:border-amber-400 outline-none"
                  >
                    <option value="OPEN">OPEN (Menunggu)</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
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

              {/* Dokumentasi Foto BAP Kerusakan (Bisa Lebih Dari 1) */}
              <PhotoUploader
                photoUrls={photoUrls}
                onChangePhotos={setPhotoUrls}
                onChange={setPhotoUrl}
                label="Foto Dokumentasi Kerusakan / Temuan BAP (Bisa Lebih Dari 1)"
                description="Ambil foto komponen rusak, indikator panel, kebocoran, atau kondisi fisik unit dari kamera atau galeri"
                onPreviewFullscreen={(url, idx, all) =>
                  setPreviewPhoto({
                    urls: all || [url],
                    index: idx || 0,
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
          photoUrls={previewPhoto.urls}
          initialIndex={previewPhoto.index}
          title={previewPhoto.title}
          subtitle={previewPhoto.subtitle}
        />
      )}
    </div>
  );
};
