import React, { useState, useEffect, useRef } from 'react';
import { BacklogItem, BacklogPart, CodeUnit } from '../types';
import { CodeUnitSelector } from './CodeUnitSelector';
import { PhotoUploader } from './PhotoUploader';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import {
  X,
  AlertOctagon,
  Save,
  MessageSquare,
  Package,
  CheckCircle,
  Camera,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { WhatsAppGroupShareModal } from './WhatsAppGroupShareModal';
import { formatBacklogWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';
import { formatDateDDMMYYYY, formatDateForInput } from '../utils/dateUtils';
import { getVaultPhotos, readVaultPhotosAsync } from '../services/photoStorageService';
import { getAppSettings } from '../services/settingsService';

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applyBcsPrefix = (
  currentDesc: string,
  prevCodeUnit: string,
  nextCodeUnit: string
): string => {
  const ops = getAppSettings().operations;
  if (!ops.backlogEnableAutoPrefix) {
    return currentDesc || '';
  }
  const prefixWord = (ops.backlogAutoPrefixText || 'BCS').trim().toUpperCase() || 'BCS';
  const escapedPrefix = escapeRegex(prefixWord);
  const nextCu = nextCodeUnit.trim().toUpperCase();
  const prevCu = prevCodeUnit.trim().toUpperCase();
  let body = currentDesc || '';

  if (prevCu) {
    const prevPattern = new RegExp(`^${escapedPrefix}\\s+${escapeRegex(prevCu)}\\s*`, 'i');
    if (prevPattern.test(body)) {
      body = body.replace(prevPattern, '');
    } else {
      body = body.replace(new RegExp(`^${escapedPrefix}\\s*`, 'i'), '');
    }
  } else {
    body = body.replace(new RegExp(`^${escapedPrefix}\\s*`, 'i'), '');
  }

  return nextCu ? `${prefixWord} ${nextCu} ${body}` : `${prefixWord} ${body}`;
};

interface BacklogModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: CodeUnit[];
  onSave: (item: BacklogItem) => Promise<void>;
  initialCodeUnit?: string;
  source?: BacklogItem['sumberTemuan'];
  itemToEdit?: BacklogItem | null;
}

export const BacklogModal: React.FC<BacklogModalProps> = ({
  isOpen,
  onClose,
  units,
  onSave,
  initialCodeUnit = '',
  source = 'MANUAL',
  itemToEdit = null,
}) => {
  const [codeUnit, setCodeUnit] = useState(initialCodeUnit);
  const [moBacklog, setMoBacklog] = useState('');
  const [nomorReservasi, setNomorReservasi] = useState('');
  const [deskripsiBacklog, setDeskripsiBacklog] = useState('');

  // Multi-Spareparts List State
  const [parts, setParts] = useState<BacklogPart[]>([
    { id: '1', partNumber: '', deskripsiPart: '', qty: 1 },
  ]);

  const [sumberTemuan, setSumberTemuan] = useState<BacklogItem['sumberTemuan']>(source);
  const [status, setStatus] = useState<BacklogItem['status']>('WAITING_PART');
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
  const [savedItem, setSavedItem] = useState<BacklogItem | null>(null);
  const [groupShareData, setGroupShareData] = useState<{ title: string; message: string; photoUrls: string[] } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const initializedSessionKeyRef = useRef<string | null>(null);
  const hasUserEditedPhotosRef = useRef<boolean>(false);

  useEffect(() => {
    setFormError(null);
    if (!isOpen) {
      initializedSessionKeyRef.current = null;
      setSavedItem(null);
      return;
    }

    const sessionKey = itemToEdit ? `EDIT:${itemToEdit.id}` : `NEW:${initialCodeUnit || ''}:${source || ''}`;
    if (initializedSessionKeyRef.current === sessionKey) {
      return;
    }
    initializedSessionKeyRef.current = sessionKey;
    hasUserEditedPhotosRef.current = false;

    if (itemToEdit) {
      setCodeUnit(itemToEdit.codeUnit || '');
      setMoBacklog(itemToEdit.moBacklog || '');
      setNomorReservasi(itemToEdit.nomorReservasi || '');
      setDeskripsiBacklog(itemToEdit.deskripsiBacklog || '');

      // Inisialisasi daftar parts dari item yang diedit
      if (itemToEdit.parts && itemToEdit.parts.length > 0) {
        setParts(
          itemToEdit.parts.map((p, idx) => ({
            id: p.id || `part-${idx}-${Date.now()}`,
            partNumber: p.partNumber || '',
            deskripsiPart: p.deskripsiPart || '',
            qty: p.qty || 1,
          }))
        );
      } else if (itemToEdit.partNumber) {
        setParts([
          {
            id: '1',
            partNumber: itemToEdit.partNumber,
            deskripsiPart: itemToEdit.deskripsiPart,
            qty: itemToEdit.qty || 1,
          },
        ]);
      } else {
        setParts([{ id: '1', partNumber: '', deskripsiPart: '', qty: 1 }]);
      }

      setSumberTemuan(itemToEdit.sumberTemuan || 'MANUAL');
      setStatus(itemToEdit.status || 'WAITING_PART');
      setTanggalTemuan(formatDateForInput(itemToEdit.tanggalTemuan));
      setPic(itemToEdit.pic || '');

      const directPhotos = (
        itemToEdit.photoUrls && itemToEdit.photoUrls.length > 0
          ? itemToEdit.photoUrls
          : itemToEdit.photoUrl
          ? [itemToEdit.photoUrl]
          : []
      ).filter(Boolean);
      const vaultPhotos = getVaultPhotos('BACKLOG', itemToEdit.id) || [];
      const existingPhotos = directPhotos.length > 0 ? [...directPhotos] : [...vaultPhotos];
      setPhotoUrls(existingPhotos);
      setPhotoUrl(existingPhotos[0] || undefined);

      // Async backup hydration from IndexedDB if synchronous cache wasn't populated yet
      if (existingPhotos.length === 0) {
        const targetId = itemToEdit.id;
        void readVaultPhotosAsync('BACKLOG', targetId).then(dbPhotos => {
          if (
            dbPhotos &&
            dbPhotos.length > 0 &&
            !hasUserEditedPhotosRef.current &&
            initializedSessionKeyRef.current === `EDIT:${targetId}`
          ) {
            setPhotoUrls([...dbPhotos]);
            setPhotoUrl(dbPhotos[0]);
          }
        });
      }

      setSavedItem(null);
    } else if (initialCodeUnit) {
      const ops = getAppSettings().operations;
      const prefixWord = (ops.backlogAutoPrefixText || 'BCS').trim().toUpperCase() || 'BCS';
      setCodeUnit(initialCodeUnit);
      setSumberTemuan(source || 'MANUAL');
      setMoBacklog(`MO-BL-${Math.floor(1000 + Math.random() * 9000)}`);
      setNomorReservasi('');
      setDeskripsiBacklog(
        ops.backlogEnableAutoPrefix ? `${prefixWord} ${initialCodeUnit.trim().toUpperCase()} ` : ''
      );
      setParts([{ id: '1', partNumber: '', deskripsiPart: '', qty: 1 }]);
      setStatus(ops.defaultBacklogStatus || 'WAITING_PART');
      setTanggalTemuan(new Date().toISOString().slice(0, 10));
      setPic('');
      setPhotoUrls([]);
      setPhotoUrl(undefined);
      setSavedItem(null);
    } else {
      const ops = getAppSettings().operations;
      const prefixWord = (ops.backlogAutoPrefixText || 'BCS').trim().toUpperCase() || 'BCS';
      setCodeUnit('');
      setMoBacklog(`MO-BL-${Math.floor(1000 + Math.random() * 9000)}`);
      setNomorReservasi('');
      setDeskripsiBacklog(ops.backlogEnableAutoPrefix ? `${prefixWord} ` : '');
      setParts([{ id: '1', partNumber: '', deskripsiPart: '', qty: 1 }]);
      setStatus(ops.defaultBacklogStatus || 'WAITING_PART');
      setTanggalTemuan(new Date().toISOString().slice(0, 10));
      setPic('');
      setPhotoUrls([]);
      setPhotoUrl(undefined);
      setSavedItem(null);
    }
  }, [itemToEdit, initialCodeUnit, source, isOpen]);

  // Handler Multi-Part: Tambah Part Baru
  const handleAddPart = () => {
    setParts(prev => [
      ...prev,
      {
        id: `part-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        partNumber: '',
        deskripsiPart: '',
        qty: 1,
      },
    ]);
  };

  // Handler Multi-Part: Hapus Baris Part
  const handleRemovePart = (id: string) => {
    if (parts.length <= 1) {
      // Jika tersisa 1, kosongkan isinya daripada menghapus row
      setParts([{ id: '1', partNumber: '', deskripsiPart: '', qty: 1 }]);
      return;
    }
    setParts(prev => prev.filter(p => p.id !== id));
  };

  // Handler Multi-Part: Update Nilai Input
  const handleUpdatePart = (id: string, field: keyof BacklogPart, value: any) => {
    setParts(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeUnit) {
      setFormError('Pilih Code Unit terlebih dahulu.');
      return;
    }
    const ops = getAppSettings().operations;
    const cleanCodeUnit = codeUnit.trim().toUpperCase();
    const prefixWord = (ops.backlogAutoPrefixText || 'BCS').trim().toUpperCase() || 'BCS';
    const escapedPrefix = escapeRegex(prefixWord);
    const expectedPrefix = `${prefixWord} ${cleanCodeUnit}`;
    let finalDeskripsi = deskripsiBacklog.trim();

    if (!itemToEdit && ops.backlogEnableAutoPrefix) {
      const prefixCheckRegex = new RegExp(`^${escapedPrefix}\\s+${escapeRegex(cleanCodeUnit)}(?:\\s+|$)`, 'i');
      if (!prefixCheckRegex.test(finalDeskripsi)) {
        const bodyOnly = finalDeskripsi.replace(new RegExp(`^${escapedPrefix}\\s*`, 'i'), '').trim();
        finalDeskripsi = bodyOnly ? `${expectedPrefix} ${bodyOnly}` : expectedPrefix;
      }
      const descBodyAfterPrefix = finalDeskripsi
        .replace(new RegExp(`^${escapedPrefix}\\s+${escapeRegex(cleanCodeUnit)}\\s*`, 'i'), '')
        .trim();
      if (!descBodyAfterPrefix) {
        setFormError(`Mohon lengkapi Deskripsi Backlog setelah awalan "${expectedPrefix} ".`);
        return;
      }
    } else if (!finalDeskripsi) {
      setFormError('Mohon isi Deskripsi Backlog.');
      return;
    }
    setFormError(null);

    try {
      setIsSubmitting(true);

      // Filter parts yang diisi
      const filteredParts = parts.filter(
        p => p.partNumber.trim() || p.deskripsiPart.trim()
      );

      const finalParts: BacklogPart[] =
        filteredParts.length > 0
          ? filteredParts.map(p => ({
              id: p.id,
              partNumber: p.partNumber.trim().toUpperCase(),
              deskripsiPart: p.deskripsiPart.trim(),
              qty: Number(p.qty) || 1,
            }))
          : [
              {
                id: '1',
                partNumber: 'NON-PART / REPAIR ONLY',
                deskripsiPart: 'Jasa Perbaikan / Tanpa Part',
                qty: 1,
              },
            ];

      // Kompilasi ringkasan teks untuk kompatibilitas ke Google Sheets & notifikasi
      const summaryPartNumber = finalParts.map(p => p.partNumber).join(', ');
      const summaryDeskripsiPart =
        finalParts.length === 1
          ? finalParts[0].deskripsiPart
          : finalParts.map((p, i) => `${i + 1}. ${p.deskripsiPart} (${p.partNumber} x${p.qty})`).join('; ');
      const totalQty = finalParts.reduce((acc, p) => acc + (Number(p.qty) || 1), 0);

      const formattedDate = formatDateDDMMYYYY(tanggalTemuan);
      const generatedId = itemToEdit
        ? itemToEdit.id
        : moBacklog.trim() && moBacklog.trim() !== '-'
        ? `${codeUnit}-${moBacklog.trim().replace(/\s+/g, '_')}-${Date.now().toString().slice(-4)}`
        : `${codeUnit}-AUTO-${Date.now().toString().slice(-4)}`;

      const normalizedPhotos = (
        photoUrls && photoUrls.length > 0
          ? photoUrls
          : photoUrl
          ? [photoUrl]
          : []
      ).filter(Boolean);

      const item: BacklogItem = {
        id: generatedId,
        codeUnit,
        moBacklog: moBacklog.trim() || '-',
        nomorReservasi: nomorReservasi || '-',
        deskripsiBacklog: finalDeskripsi,
        parts: finalParts,
        partNumber: summaryPartNumber,
        deskripsiPart: summaryDeskripsiPart,
        qty: totalQty,
        sumberTemuan,
        status,
        tanggalTemuan: formattedDate,
        pic: pic || 'Mekanik Maintenance',
        photoUrls: normalizedPhotos,
        photoUrl: normalizedPhotos.length > 0 ? normalizedPhotos[0] : undefined,
        syncedToSheets: true,
        createdAt: itemToEdit ? itemToEdit.createdAt : new Date().toISOString(),
      };

      await onSave(item);
      setSavedItem(item);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan Backlog');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSavedItem(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {itemToEdit ? 'Edit Data Backlog' : 'Input Data Backlog'}
              </h2>
              <p className="text-xs text-slate-400">
                {itemToEdit ? `Mengubah backlog ${itemToEdit.id}` : 'Pencatatan temuan defect & reservasi sparepart'}
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
                  {itemToEdit ? 'Backlog Berhasil Diperbarui!' : 'Backlog Berhasil Disimpan!'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  ID: <strong className="text-amber-400">{savedItem.id}</strong> | MO: {savedItem.moBacklog}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tersimpan di perangkat & otomatis disinkronkan ke Google Sheet tab BACKLOG.
                </p>
              </div>

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
                            title: `Backlog: ${savedItem.codeUnit}`,
                            subtitle: savedItem.deskripsiBacklog,
                          })
                        }
                        className="relative group rounded-xl overflow-hidden border border-slate-700 h-20 w-24 bg-slate-950 shadow-md"
                      >
                        <img
                          src={url}
                          alt={`Foto Backlog ${idx + 1}`}
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
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() =>
                    shareToWhatsApp(
                      formatBacklogWhatsApp(savedItem),
                      {
                        photoUrls: savedItem.photoUrls || (savedItem.photoUrl ? [savedItem.photoUrl] : []),
                        title: `Laporan Backlog ${savedItem.codeUnit}`,
                      }
                    )
                  }
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Kirim via WhatsApp (+ Foto)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setGroupShareData({
                      title: `Laporan Backlog ${savedItem.codeUnit}`,
                      message: formatBacklogWhatsApp(savedItem),
                      photoUrls: savedItem.photoUrls || (savedItem.photoUrl ? [savedItem.photoUrl] : []),
                    })
                  }
                  className="w-full py-2.5 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-teal-600/20 active:scale-95 transition"
                >
                  <Users className="w-4 h-4" />
                  <span>Share Group WA</span>
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
            <form id="backlog-form" onSubmit={handleSubmit} className="space-y-3.5">
              {formError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <CodeUnitSelector
                units={units}
                selectedCodeUnit={codeUnit}
                onChange={u => {
                  const nextCode = u ? u.codeUnit : '';
                  if (!itemToEdit) {
                    setDeskripsiBacklog(prev => applyBcsPrefix(prev, codeUnit, nextCode));
                  }
                  setCodeUnit(nextCode);
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">MO Backlog (Opsional, Hanya Angka)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={moBacklog}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setMoBacklog(val);
                    }}
                    placeholder="Contoh: 1178678"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nomor Reservasi Part</label>
                  <input
                    type="text"
                    value={nomorReservasi}
                    onChange={e => setNomorReservasi(e.target.value)}
                    placeholder="Contoh: 1625973"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">Deskripsi Backlog *</label>
                  {!itemToEdit && (
                    <span className="text-[10px] font-mono text-amber-400">
                      Format: BCS {codeUnit ? codeUnit.toUpperCase() : '<CODE UNIT>'} &lt;DESKRIPSI&gt;
                    </span>
                  )}
                </div>
                <textarea
                  required
                  rows={2}
                  value={deskripsiBacklog}
                  onChange={e => setDeskripsiBacklog(e.target.value)}
                  placeholder={`Contoh: BCS ${codeUnit ? codeUnit.toUpperCase() : 'DT5500'} BLADE WIPER BROKEN`}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 outline-none resize-none"
                />
              </div>

              {/* Multi-Spareparts Management Box */}
              <div className="bg-slate-850/70 border border-slate-750 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Daftar Kebutuhan Sparepart ({parts.length} Item)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Bisa diisi 1 atau lebih part number untuk pekerjaan backlog ini
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPart}
                    className="py-1 px-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-lg text-[11px] flex items-center space-x-1 transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Part</span>
                  </button>
                </div>

                {/* List of parts rows */}
                <div className="space-y-2.5">
                  {parts.map((p, index) => (
                    <div
                      key={p.id}
                      className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2 relative group"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        #{index + 1}
                      </div>

                      {/* Part Number */}
                      <div className="flex-1">
                        <label className="block text-slate-400 text-[9px] uppercase font-semibold mb-0.5 sm:hidden">
                          Part Number
                        </label>
                        <input
                          type="text"
                          value={p.partNumber}
                          onChange={e => handleUpdatePart(p.id, 'partNumber', e.target.value)}
                          placeholder="Part No (cth: 6N-6654)"
                          className="w-full bg-slate-850 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-amber-400 outline-none uppercase placeholder:text-slate-500"
                        />
                      </div>

                      {/* Deskripsi Part */}
                      <div className="flex-[2]">
                        <label className="block text-slate-400 text-[9px] uppercase font-semibold mb-0.5 sm:hidden">
                          Deskripsi Part
                        </label>
                        <input
                          type="text"
                          value={p.deskripsiPart}
                          onChange={e => handleUpdatePart(p.id, 'deskripsiPart', e.target.value)}
                          placeholder="Nama/Deskripsi Komponen (cth: V-Belt Alternator)"
                          className="w-full bg-slate-850 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-amber-400 outline-none placeholder:text-slate-500"
                        />
                      </div>

                      {/* Qty */}
                      <div className="w-24 shrink-0 flex items-center space-x-1">
                        <div className="flex-1">
                          <label className="block text-slate-400 text-[9px] uppercase font-semibold mb-0.5 sm:hidden">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={p.qty}
                            onChange={e => handleUpdatePart(p.id, 'qty', e.target.value)}
                            className="w-full bg-slate-850 border border-slate-750 rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center focus:border-amber-400 outline-none"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold pt-3 sm:pt-0">Pcs</span>
                      </div>

                      {/* Hapus Baris */}
                      {parts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePart(p.id)}
                          title="Hapus baris sparepart ini"
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                  <span>
                    Total:{' '}
                    <strong className="text-white">
                      {parts.filter(p => p.partNumber.trim() || p.deskripsiPart.trim()).length} jenis sparepart
                    </strong>
                  </span>
                  <span>
                    Total Qty:{' '}
                    <strong className="text-amber-400 font-mono">
                      {parts.reduce((sum, p) => sum + (Number(p.qty) || 0), 0)} Pcs
                    </strong>
                  </span>
                </div>
              </div>

              {/* Status & Sumber */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sumber Temuan</label>
                  <select
                    value={sumberTemuan}
                    onChange={e => setSumberTemuan(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:border-amber-400 outline-none"
                  >
                    <option value="QA1_RIGID">1. QA 1 Pre Inspection Rigid</option>
                    <option value="QA7_RIGID">2. QA 7 Final Inspection Rigid</option>
                    <option value="QA1_ARTIC">3. QA 1 Pre Inspection Artic</option>
                    <option value="QA7_ARTIC">4. QA 7 Final Inspection Artic</option>
                    <option value="DAILY_RIGID">Daily Check Rigid</option>
                    <option value="DAILY_ARTIC">Daily Check Artic</option>
                    <option value="BREAKDOWN SCHEDULE">Scm</option>
                    <option value="BREAKDOWN UNSCHEDULE">Usm/Icm</option>
                    <option value="MANUAL">Manual Finding</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Backlog</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:border-amber-400 outline-none"
                  >
                    <option value="WAITING_PART">WAITING PART (Menunggu Sparepart)</option>
                    <option value="READY_TO_INSTALL">READY TO INSTALL (Part Tersedia)</option>
                    <option value="CLOSED">CLOSED (Sudah Terpasang/Selesai)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tanggal Temuan</label>
                  <input
                    type="date"
                    value={tanggalTemuan}
                    onChange={e => setTanggalTemuan(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">PIC (Mekanik) *</label>
                <input
                  type="text"
                  required
                  value={pic}
                  onChange={e => setPic(e.target.value)}
                  placeholder="Nama PIC penemu / penanggung jawab"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400 outline-none"
                />
              </div>

              {/* Dokumentasi Foto Temuan Backlog */}
              <PhotoUploader
                photoUrl={photoUrl}
                photoUrls={photoUrls}
                onChangePhotos={next => {
                  hasUserEditedPhotosRef.current = true;
                  setPhotoUrls(next);
                }}
                onChange={nextSingle => {
                  hasUserEditedPhotosRef.current = true;
                  setPhotoUrl(nextSingle);
                }}
                label="Foto Dokumentasi Temuan Backlog / Sparepart (Bisa Lebih Dari 1)"
                description="Ambil foto komponen aus, patah, bocor, atau label part number yang dibutuhkan dari kamera / galeri"
                onPreviewFullscreen={(url, idx, all) =>
                  setPreviewPhoto({
                    urls: all || [url],
                    index: idx || 0,
                    title: `Foto Backlog: ${codeUnit || 'Unit'}`,
                    subtitle: deskripsiBacklog || 'Temuan Backlog',
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
              form="backlog-form"
              disabled={isSubmitting}
              className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-amber-500/20"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Menyimpan...'
                  : itemToEdit
                  ? 'Simpan Perubahan & Sync Sheet'
                  : 'Simpan Backlog & Sync Sheet'}
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

      <WhatsAppGroupShareModal
        isOpen={!!groupShareData}
        onClose={() => setGroupShareData(null)}
        title={groupShareData?.title || ''}
        messageText={groupShareData?.message || ''}
        photoUrls={groupShareData?.photoUrls || []}
      />
    </div>
  );
};
