import React, { useState, useEffect, useRef } from 'react';
import {
  DailyCheckArtic,
  CodeUnit,
  ChecklistItemStatus,
} from '../types';
import { ARTIC_CHECKLIST_ITEMS } from '../constants/checklists';
import { CodeUnitSelector } from './CodeUnitSelector';
import { PhotoUploader } from './PhotoUploader';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import { getUnitStats } from '../services/storageService';
import {
  X,
  Tractor,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  Printer,
  MessageSquare,
  Plus,
  CheckCheck,
  Search,
  Camera,
} from 'lucide-react';
import { formatDailyArticWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';
import { QAType } from '../types';

interface DailyArticModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: CodeUnit[];
  onSave: (item: DailyCheckArtic) => Promise<void>;
  onPrintPreview: (item: DailyCheckArtic) => void;
  onOpenAddBacklog: (codeUnit: string) => void;
  onOpenAddActivity: (codeUnit: string) => void;
  initialCodeUnit?: string;
  itemToEdit?: DailyCheckArtic | null;
  qaType?: QAType;
}

export const DailyArticModal: React.FC<DailyArticModalProps> = ({
  isOpen,
  onClose,
  units,
  onSave,
  onPrintPreview,
  onOpenAddBacklog,
  onOpenAddActivity,
  initialCodeUnit = '',
  itemToEdit = null,
  qaType = 'QA1_PRE',
}) => {
  const [codeUnit, setCodeUnit] = useState(initialCodeUnit);
  const [egi, setEgi] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<DailyCheckArtic['status']>('RUNNING');
  const [startTime, setStartTime] = useState('07:00');
  const [finishTime, setFinishTime] = useState('08:45');
  const [totalJam, setTotalJam] = useState('1.75 Jam');
  const [hmUnit, setHmUnit] = useState<number>(0);
  const [picMekanik, setPicMekanik] = useState('');
  const [divalidasiOleh, setDivalidasiOleh] = useState('Foreman Pit Artic');

  // Checklist Items initialization (36 items)
  const [items, setItems] = useState<ChecklistItemStatus[]>(() =>
    ARTIC_CHECKLIST_ITEMS.map(def => ({
      id: def.id,
      name: def.name,
      status: 'OK',
      value: '',
      remark: '',
    }))
  );

  const [searchChecklist, setSearchChecklist] = useState('');
  const [temuanDeviasi, setTemuanDeviasi] = useState('');
  const [jumlahBacklog, setJumlahBacklog] = useState(0);
  const [jumlahAktivitas, setJumlahAktivitas] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(itemToEdit?.photoUrl);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccessRecord, setSavedSuccessRecord] = useState<DailyCheckArtic | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const prevIsOpenRef = useRef(false);

  // Auto calculate total jam
  useEffect(() => {
    if (startTime && finishTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [finH, finM] = finishTime.split(':').map(Number);
      let diffMinutes = (finH * 60 + finM) - (startH * 60 + startM);
      if (diffMinutes < 0) diffMinutes += 24 * 60;
      const hours = (diffMinutes / 60).toFixed(2);
      setTotalJam(`${hours} Jam`);
    }
  }, [startTime, finishTime]);

  // Handle edit or create ONLY when modal opens
  useEffect(() => {
    const wasClosed = !prevIsOpenRef.current;
    if (isOpen && wasClosed) {
      if (itemToEdit) {
        setCodeUnit(itemToEdit.codeUnit);
        setEgi(itemToEdit.egi);
        setTanggal(itemToEdit.tanggal);
        setStatus(itemToEdit.status);
        setStartTime(itemToEdit.startTime);
        setFinishTime(itemToEdit.finishTime);
        setTotalJam(itemToEdit.totalJam);
        setHmUnit(itemToEdit.hmUnit);
        setPicMekanik(itemToEdit.picMekanik);
        setDivalidasiOleh(itemToEdit.divalidasiOleh);
        setItems(itemToEdit.items);
        setTemuanDeviasi(itemToEdit.temuanDeviasi);
        setJumlahBacklog(itemToEdit.jumlahBacklog);
        setJumlahAktivitas(itemToEdit.jumlahAktivitas);
        setPhotoUrl(itemToEdit.photoUrl || undefined);
      } else if (initialCodeUnit) {
        setCodeUnit(initialCodeUnit);
        const allUnits = units && units.length > 0 ? units : [];
        const matched = allUnits.find(
          u => u.codeUnit.toLowerCase() === initialCodeUnit.toLowerCase()
        );
        if (matched) {
          setEgi(matched.egi);
          setHmUnit(matched.currentHm);
        }
        try {
          const stats = getUnitStats(initialCodeUnit);
          setJumlahBacklog(stats.backlogCount);
          setJumlahAktivitas(stats.activityCount);
        } catch {
          // Ignore stats error
        }
        setPhotoUrl(undefined);
      } else {
        setCodeUnit('');
        setEgi('');
        setHmUnit(0);
        setItems(
          ARTIC_CHECKLIST_ITEMS.map(def => ({
            id: def.id,
            name: def.name,
            status: 'OK',
            value: '',
            remark: '',
          }))
        );
        setTemuanDeviasi('');
        setJumlahBacklog(0);
        setJumlahAktivitas(0);
        setPhotoUrl(undefined);
      }
      setSavedSuccessRecord(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, itemToEdit, initialCodeUnit]);

  if (!isOpen) return null;

  const handleUnitSelect = (unit?: CodeUnit) => {
    if (unit) {
      setCodeUnit(unit.codeUnit);
      setEgi(unit.egi || '');
      setHmUnit(Number(unit.currentHm) || 0);
      try {
        const stats = getUnitStats(unit.codeUnit);
        setJumlahBacklog(stats.backlogCount || 0);
        setJumlahAktivitas(stats.activityCount || 0);
      } catch {
        setJumlahBacklog(0);
        setJumlahAktivitas(0);
      }
    } else {
      setCodeUnit('');
      setEgi('');
      setHmUnit(0);
      setJumlahBacklog(0);
      setJumlahAktivitas(0);
    }
  };

  const handleStatusChange = (id: string, newStatus: ChecklistItemStatus['status']) => {
    setItems(prev =>
      prev.map(it => (it.id === id ? { ...it, status: newStatus } : it))
    );
  };

  const handleSetAllOK = () => {
    setItems(prev =>
      prev.map(it => ({
        ...it,
        status: 'OK',
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeUnit) {
      setFormError('Pilih Code Unit terlebih dahulu.');
      return;
    }
    setFormError(null);

    try {
      setIsSubmitting(true);
      const activeQaType = itemToEdit?.qaType || qaType || 'DAILY_INSPECTION';
      const isDaily = activeQaType === 'DAILY_INSPECTION';
      const isFinal = activeQaType === 'QA7_FINAL';
      const prefix = isDaily ? 'DAILY-ART' : isFinal ? 'QA7-ART' : 'QA1-ART';
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const record: DailyCheckArtic = {
        id: itemToEdit ? itemToEdit.id : `${prefix}-${tanggal.replace(/-/g, '')}-${codeUnit}-${randomSuffix}`,
        qaType: activeQaType,
        codeUnit,
        egi,
        tanggal,
        status,
        startTime,
        finishTime,
        totalJam,
        hmUnit: Number(hmUnit) || 0,
        picMekanik: picMekanik || 'Mekanik Heavy Equipment',
        divalidasiOleh: divalidasiOleh || 'Foreman Maintenance',
        items,
        temuanDeviasi: temuanDeviasi || 'Nihil / Seluruh Komponen Dalam Kondisi Baik',
        jumlahBacklog,
        jumlahAktivitas,
        photoUrl: photoUrl || itemToEdit?.photoUrl,
        syncedToSheets: true,
        createdAt: itemToEdit ? itemToEdit.createdAt : new Date().toISOString(),
      };

      await onSave(record);
      setSavedSuccessRecord(record);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan Daily Check Artic');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSavedSuccessRecord(null);
    onClose();
  };

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(searchChecklist.toLowerCase())
  );

  const currentQaType = itemToEdit?.qaType || qaType || 'DAILY_INSPECTION';
  const isDaily = currentQaType === 'DAILY_INSPECTION';
  const isFinalInspection = currentQaType === 'QA7_FINAL';
  const menuTitle = isDaily
    ? 'DAILY INSPECTION ARTIC'
    : isFinalInspection
    ? '4. QA 7 FINAL INSPECTION ARTIC'
    : '3. QA 1 PRE INSPECTION ARTIC';
  const badgeLabel = isDaily ? 'DAILY CHECK (QA 7)' : isFinalInspection ? 'FINAL RELEASE' : 'PRE-OPERATIONAL';
  const badgeColor = isDaily
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    : isFinalInspection
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  const subtitleDesc = isDaily
    ? 'Pemeriksaan harian 36 parameter kelayakan unit artikulasi & grader (sesuai standar QA 7 Plant 2)'
    : isFinalInspection
    ? 'Validasi 36 parameter kelayakan unit artikulasi setelah servis/perbaikan'
    : 'Inspeksi awal 36 parameter kelayakan unit artikulasi sebelum operasi/servis';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-lg border ${
              isDaily
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : isFinalInspection
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              <Tractor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">
                  {itemToEdit ? `Edit ${menuTitle}` : menuTitle}
                </h2>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${badgeColor}`}>
                  {badgeLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {subtitleDesc}
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
          {savedSuccessRecord ? (
            <div className="p-5 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {itemToEdit ? 'Inspeksi Artic Berhasil Diperbarui!' : 'Daily Check Artic Berhasil Disimpan!'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Unit: <strong className="text-amber-400">{savedSuccessRecord.codeUnit}</strong> ({savedSuccessRecord.egi})
                </p>
                <p className="text-[11px] text-slate-400">
                  Data otomatis tercatat di Google Sheet tab DAILY_CHECK_ARTIC.
                </p>
              </div>

              {savedSuccessRecord.photoUrl && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewPhoto({
                        url: savedSuccessRecord.photoUrl!,
                        title: `Daily Check Artic - ${savedSuccessRecord.codeUnit}`,
                        subtitle: `${savedSuccessRecord.tanggal} (${savedSuccessRecord.status})`,
                      })
                    }
                    className="relative group rounded-xl overflow-hidden border border-slate-700 max-h-36 shadow-md"
                  >
                    <img
                      src={savedSuccessRecord.photoUrl}
                      alt="Foto Inspeksi ADT"
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
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => shareToWhatsApp(formatDailyArticWhatsApp(savedSuccessRecord))}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Share ke WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => onPrintPreview(savedSuccessRecord)}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-2"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Cetak / Simpan PDF</span>
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
            <form id="daily-artic-form" onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Unit Selector */}
              <CodeUnitSelector
                units={units}
                selectedCodeUnit={codeUnit}
                onChange={handleUnitSelect}
                filterType="Artic"
              />

              {/* Header Info Grid */}
              <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">EGI Unit</label>
                  <input
                    type="text"
                    readOnly
                    value={egi}
                    placeholder="Auto-fill dari Master Unit"
                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-slate-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tanggal Inspeksi *</label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={e => setTanggal(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Unit *</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-amber-400"
                  >
                    <option value="RUNNING">RUNNING (Siap Operasi)</option>
                    <option value="BREAKDOWN">BREAKDOWN (Rusak)</option>
                    <option value="SCHEDULED_SERVICE">SCHEDULED SERVICE (PS)</option>
                    <option value="STANDBY">STANDBY (Tidak Beroperasi)</option>
                  </select>
                </div>

                {/* Time & Total Jam */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Start - Finish Time *</span>
                  </label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white outline-none"
                    />
                    <span className="text-slate-500">-</span>
                    <input
                      type="time"
                      value={finishTime}
                      onChange={e => setFinishTime(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Total Jam Kerja</label>
                  <input
                    type="text"
                    readOnly
                    value={totalJam}
                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-amber-400 font-bold font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">HM Unit Saat Ini *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={hmUnit || ''}
                    onChange={e => setHmUnit(Number(e.target.value))}
                    placeholder="Contoh: 8430"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">PIC Mekanik *</label>
                  <input
                    type="text"
                    required
                    value={picMekanik}
                    onChange={e => setPicMekanik(e.target.value)}
                    placeholder="Nama Mekanik Pelaksana"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Divalidasi Oleh (Foreman / Pengawas) *</label>
                  <input
                    type="text"
                    required
                    value={divalidasiOleh}
                    onChange={e => setDivalidasiOleh(e.target.value)}
                    placeholder="Nama Pengawas / Foreman"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* 36 Checklist Items */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      DAFTAR 36 ITEM CHECKLIST ARTIC
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                      36 Parameter
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        value={searchChecklist}
                        onChange={e => setSearchChecklist(e.target.value)}
                        placeholder="Filter item..."
                        className="bg-slate-850 border border-slate-700 rounded-lg pl-8 pr-2 py-1 text-[11px] text-white w-32 focus:w-44 transition-all focus:border-amber-400 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSetAllOK}
                      className="flex items-center space-x-1 text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg hover:bg-emerald-500/20 font-semibold transition shrink-0"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Set Semua OK</span>
                    </button>
                  </div>
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredItems.map(current => (
                    <div
                      key={current.id}
                      className={`p-2 rounded-xl border transition flex items-center justify-between gap-2 ${
                        current.status === 'DEFECT'
                          ? 'bg-rose-950/25 border-rose-500/40'
                          : current.status === 'MONITOR'
                          ? 'bg-amber-950/25 border-amber-500/40'
                          : 'bg-slate-800/40 border-slate-800/80 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="font-semibold text-slate-200 text-xs flex-1 truncate">
                        {current.name}
                      </span>

                      {/* Status Toggles: OK, MONITOR, DEFECT */}
                      <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0">
                        {(['OK', 'MONITOR', 'DEFECT'] as const).map(st => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleStatusChange(current.id, st)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                              current.status === st
                                ? st === 'OK'
                                  ? 'bg-emerald-600 text-white shadow'
                                  : st === 'MONITOR'
                                  ? 'bg-amber-500 text-slate-950 shadow'
                                  : 'bg-rose-600 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Temuan Deviasi / ADD ACTIVITIES */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-slate-300 font-semibold">
                  TEMUAN DEVIASI / ADD ACTIVITIES
                </label>
                <textarea
                  rows={2}
                  value={temuanDeviasi}
                  onChange={e => setTemuanDeviasi(e.target.value)}
                  placeholder="Tuliskan temuan deviasi jika ada komponen yang aus, kendor, bocor atau memerlukan ADD ACTIVITIES..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 outline-none resize-none"
                />
              </div>

              {/* Dokumentasi Foto Pemeriksaan Articulated Dump Truck */}
              <PhotoUploader
                photoUrl={photoUrl}
                onChange={setPhotoUrl}
                label="Foto Dokumentasi Daily Check Artic (ADT)"
                description="Ambil foto artikulasi kemudi, dump body, silinder hoist, ban, atau deviasi temuan dari kamera / galeri"
                onPreviewFullscreen={url =>
                  setPreviewPhoto({
                    url,
                    title: `Foto Daily Check Artic: ${codeUnit || 'Unit'}`,
                    subtitle: `Inspeksi ${tanggal}`,
                  })
                }
              />

              {/* Interconnected Backlog & Activity Section */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-slate-200 text-xs">
                      KETERHUBUNGAN BACKLOG & AKTIVITAS ({codeUnit || 'Semua'})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Otomatis sinkron dengan Code Unit
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Jumlah Backlog</span>
                      <span className="text-base font-bold text-amber-400 font-mono">
                        {jumlahBacklog} Item
                      </span>
                    </div>
                    {codeUnit && (
                      <button
                        type="button"
                        onClick={() => onOpenAddBacklog(codeUnit)}
                        className="p-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-[10px] font-semibold flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Backlog</span>
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Jumlah Aktivitas</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        {jumlahAktivitas} Item
                      </span>
                    </div>
                    {codeUnit && (
                      <button
                        type="button"
                        onClick={() => onOpenAddActivity(codeUnit)}
                        className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-[10px] font-semibold flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Aktivitas</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!savedSuccessRecord && (
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
              form="daily-artic-form"
              disabled={isSubmitting}
              className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-amber-500/20"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Menyimpan...'
                  : itemToEdit
                  ? 'Simpan Perubahan & Sync Sheet'
                  : 'Simpan Inspeksi & Sync Sheet'}
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
