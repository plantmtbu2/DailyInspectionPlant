import React, { useState, useEffect, useRef } from 'react';
import {
  DailyCheckRigid,
  CodeUnit,
  ChecklistItemStatus,
  BacklogItem,
  AddActivityItem,
  QAType,
} from '../types';
import { RIGID_CHECKLIST_ITEMS } from '../constants/checklists';
import { CodeUnitSelector } from './CodeUnitSelector';
import { PhotoUploader } from './PhotoUploader';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import { getBacklogs, getActivities } from '../services/storageService';
import {
  X,
  Truck,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  Printer,
  MessageSquare,
  Plus,
  CheckCheck,
  Camera,
  Link,
  Wrench,
  AlertOctagon,
  ExternalLink,
  Eye,
  Edit3,
} from 'lucide-react';
import { formatDailyRigidWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';
import { formatDateDDMMYYYY, formatTimeHHMM, formatDateForInput } from '../utils/dateUtils';

interface DailyRigidModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: CodeUnit[];
  onSave: (item: DailyCheckRigid) => Promise<void>;
  onPrintPreview: (item: DailyCheckRigid) => void;
  onOpenAddBacklog: (codeUnit: string) => void;
  onOpenEditBacklog?: (item: BacklogItem) => void;
  onOpenViewBacklog?: (item: BacklogItem) => void;
  onOpenAddActivity: (codeUnit: string) => void;
  initialCodeUnit?: string;
  itemToEdit?: DailyCheckRigid | null;
  qaType?: QAType;
  backlogs?: BacklogItem[];
  activities?: AddActivityItem[];
}

export const DailyRigidModal: React.FC<DailyRigidModalProps> = ({
  isOpen,
  onClose,
  units,
  onSave,
  onPrintPreview,
  onOpenAddBacklog,
  onOpenEditBacklog,
  onOpenViewBacklog,
  onOpenAddActivity,
  initialCodeUnit = '',
  itemToEdit = null,
  qaType = 'QA1_PRE',
  backlogs,
  activities,
}) => {
  const [codeUnit, setCodeUnit] = useState(initialCodeUnit);
  const [egi, setEgi] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<DailyCheckRigid['status']>('RUNNING');
  const [startTime, setStartTime] = useState('');
  const [finishTime, setFinishTime] = useState('');
  const [totalJam, setTotalJam] = useState('');
  const [hmUnit, setHmUnit] = useState<number>(0);
  const [picMekanik, setPicMekanik] = useState('');
  const [divalidasiOleh, setDivalidasiOleh] = useState('Group Leader');

  // Checklist Items initialization
  const [items, setItems] = useState<ChecklistItemStatus[]>(() =>
    RIGID_CHECKLIST_ITEMS.map(def => ({
      id: def.id,
      name: def.name,
      status: 'OK',
      value: def.defaultVal || '',
      remark: '',
    }))
  );

  const [temuanDeviasi, setTemuanDeviasi] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<{
    urls: string[];
    index: number;
    title: string;
    subtitle?: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccessRecord, setSavedSuccessRecord] = useState<DailyCheckRigid | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const prevIsOpenRef = useRef(false);

  // Auto calculate total jam
  useEffect(() => {
    if (startTime && finishTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [finH, finM] = finishTime.split(':').map(Number);
      let diffMinutes = (finH * 60 + finM) - (startH * 60 + startM);
      if (diffMinutes < 0) diffMinutes += 24 * 60;
      const hours = (diffMinutes / 60).toFixed(1);
      setTotalJam(`${hours} Jam`);
    }
  }, [startTime, finishTime]);

  // Compute live linked backlogs & activities for the currently selected code unit
  const allBacklogs = backlogs || getBacklogs();
  const allActivities = activities || getActivities();

  const activeUnitBacklogs = codeUnit
    ? allBacklogs.filter(
        b => b.codeUnit && b.codeUnit.trim().toLowerCase() === codeUnit.trim().toLowerCase() && b.status !== 'CLOSED'
      )
    : [];

  const unitActivities = codeUnit
    ? allActivities.filter(
        a => a.codeUnit && a.codeUnit.trim().toLowerCase() === codeUnit.trim().toLowerCase()
      )
    : [];

  // Initialize and populate form whenever modal opens or itemToEdit updates
  useEffect(() => {
    if (!isOpen) {
      setSavedSuccessRecord(null);
      setFormError(null);
      return;
    }

    if (itemToEdit) {
      // Edit Mode: Populate all previously saved / updated fields with 100% fidelity
      setCodeUnit(itemToEdit.codeUnit || '');
      setEgi(itemToEdit.egi || '');
      // Format date for HTML <input type="date"> (YYYY-MM-DD)
      setTanggal(formatDateForInput(itemToEdit.tanggal));
      setStatus(itemToEdit.status || 'RUNNING');
      setStartTime(itemToEdit.startTime || '');
      setFinishTime(itemToEdit.finishTime || '');
      setTotalJam(itemToEdit.totalJam || '');
      setHmUnit(Number(itemToEdit.hmUnit) || 0);
      setPicMekanik(itemToEdit.picMekanik || '');
      setDivalidasiOleh(itemToEdit.divalidasiOleh || 'Group Leader');
      
      // Deep clone checklist items to prevent stale reference mutations
      if (itemToEdit.items && itemToEdit.items.length > 0) {
        setItems(itemToEdit.items.map(it => ({ ...it })));
      } else {
        setItems(
          RIGID_CHECKLIST_ITEMS.map(def => ({
            id: def.id,
            name: def.name,
            status: 'OK',
            value: def.defaultVal || '',
            remark: '',
          }))
        );
      }

      setTemuanDeviasi(itemToEdit.temuanDeviasi || '');

      const existingPhotos = itemToEdit.photoUrls && itemToEdit.photoUrls.length > 0
        ? itemToEdit.photoUrls
        : (itemToEdit.photoUrl ? [itemToEdit.photoUrl] : []);
      setPhotoUrls(existingPhotos);
    } else if (initialCodeUnit) {
      // Create Mode with selected unit
      setCodeUnit(initialCodeUnit);
      const allUnits = units && units.length > 0 ? units : [];
      const matched = allUnits.find(
        u => u.codeUnit.toLowerCase() === initialCodeUnit.toLowerCase()
      );
      if (matched) {
        setEgi(matched.egi || '');
        setHmUnit(Number(matched.currentHm) || 0);
      }
      setTanggal(new Date().toISOString().slice(0, 10));
      setStatus('RUNNING');
      setStartTime('');
      setFinishTime('');
      setTotalJam('');
      setPicMekanik('');
      setDivalidasiOleh('Group Leader');
      setItems(
        RIGID_CHECKLIST_ITEMS.map(def => ({
          id: def.id,
          name: def.name,
          status: 'OK',
          value: def.defaultVal || '',
          remark: '',
        }))
      );
      setTemuanDeviasi('');
      setPhotoUrls([]);
    } else {
      // Create Mode default empty
      setCodeUnit('');
      setEgi('');
      setHmUnit(0);
      setTanggal(new Date().toISOString().slice(0, 10));
      setStatus('RUNNING');
      setStartTime('');
      setFinishTime('');
      setTotalJam('');
      setPicMekanik('');
      setDivalidasiOleh('Group Leader');
      setItems(
        RIGID_CHECKLIST_ITEMS.map(def => ({
          id: def.id,
          name: def.name,
          status: 'OK',
          value: def.defaultVal || '',
          remark: '',
        }))
      );
      setTemuanDeviasi('');
      setPhotoUrls([]);
    }
    setSavedSuccessRecord(null);
    setFormError(null);
  }, [isOpen, itemToEdit, initialCodeUnit, units]);

  if (!isOpen) return null;

  // Direct Unit Select Handler
  const handleUnitSelect = (unit?: CodeUnit) => {
    if (unit) {
      setCodeUnit(unit.codeUnit);
      setEgi(unit.egi || '');
      setHmUnit(Number(unit.currentHm) || 0);
    } else {
      setCodeUnit('');
      setEgi('');
      setHmUnit(0);
    }
  };

  const handleStatusChange = (id: string, newStatus: ChecklistItemStatus['status']) => {
    setItems(prev =>
      prev.map(it => (it.id === id ? { ...it, status: newStatus } : it))
    );
  };

  const handleValueChange = (id: string, value: string) => {
    setItems(prev =>
      prev.map(it => (it.id === id ? { ...it, value } : it))
    );
  };

  const handleSetAllOK = () => {
    setItems(prev =>
      prev.map(it => ({
        ...it,
        status: 'OK',
        remark: '',
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeUnit) {
      setFormError('Mohon pilih Code Unit terlebih dahulu.');
      return;
    }
    setFormError(null);

    try {
      setIsSubmitting(true);
      const activeQaType = itemToEdit?.qaType || qaType || 'DAILY_INSPECTION';
      const isDaily = activeQaType === 'DAILY_INSPECTION';
      const isFinal = activeQaType === 'QA7_FINAL';
      const prefix = isDaily ? 'DAILY-RIG' : isFinal ? 'QA7-RIG' : 'QA1-RIG';
      const randomSuffix = Math.floor(100 + Math.random() * 900);

      const formattedDate = formatDateDDMMYYYY(tanggal);
      const formattedStartTime = formatTimeHHMM(startTime);
      const formattedFinishTime = formatTimeHHMM(finishTime);
      const record: DailyCheckRigid = {
        id: itemToEdit ? itemToEdit.id : `${codeUnit}-${formattedDate}`,
        qaType: activeQaType,
        codeUnit,
        egi: egi || 'Rigid Dump Truck',
        tanggal: formattedDate,
        status,
        startTime: formattedStartTime,
        finishTime: formattedFinishTime,
        totalJam,
        hmUnit: Number(hmUnit) || 0,
        picMekanik: picMekanik || 'Mekanik Heavy Equipment',
        divalidasiOleh: divalidasiOleh || 'Group Leader',
        items,
        temuanDeviasi: temuanDeviasi || 'Nihil / Parameter Sesuai Standar',
        jumlahBacklog: activeUnitBacklogs.length,
        jumlahAktivitas: unitActivities.length,
        photoUrls: photoUrls,
        photoUrl: photoUrls.length > 0 ? photoUrls[0] : undefined,
        syncedToSheets: true,
        createdAt: itemToEdit ? itemToEdit.createdAt : new Date().toISOString(),
      };

      await onSave(record);
      setSavedSuccessRecord(record);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan Daily Check Rigid');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSavedSuccessRecord(null);
    onClose();
  };

  const currentQaType = itemToEdit?.qaType || qaType || 'DAILY_INSPECTION';
  const isDaily = currentQaType === 'DAILY_INSPECTION';
  const isFinalInspection = currentQaType === 'QA7_FINAL';
  const menuTitle = isDaily
    ? 'DAILY INSPECTION RIGID'
    : isFinalInspection
    ? '2. QA 7 FINAL INSPECTION RIGID'
    : '1. QA 1 PRE INSPECTION RIGID';
  const badgeLabel = isDaily ? 'DAILY CHECK' : isFinalInspection ? 'FINAL RELEASE' : 'PRE-OPERATIONAL';
  const badgeColor = isDaily
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    : isFinalInspection
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  const subtitleDesc = isDaily
    ? 'Pemeriksaan harian 19 parameter kelayakan unit rigid (sesuai standar QA 7 Plant 2)'
    : isFinalInspection
    ? 'Validasi 19 parameter kelayakan unit rigid setelah servis/perbaikan'
    : 'Inspeksi awal 19 parameter kelayakan unit rigid sebelum operasi/servis';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-lg border ${
              isDaily
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : isFinalInspection
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              <Truck className="w-5 h-5" />
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
                  Inspeksi Rigid Berhasil Disimpan & Tersinkron!
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  ID: <span className="font-mono text-amber-400 font-bold">{savedSuccessRecord.id}</span> • Unit: {savedSuccessRecord.codeUnit}
                </p>
                <div className="inline-flex items-center space-x-2 mt-2 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700 text-[11px] text-slate-300">
                  <span>Backlog Terkait: <strong className="text-amber-400 font-mono">{savedSuccessRecord.jumlahBacklog}</strong></span>
                  <span>•</span>
                  <span>Aktivitas Terkait: <strong className="text-emerald-400 font-mono">{savedSuccessRecord.jumlahAktivitas}</strong></span>
                </div>
              </div>

              {/* Photos Preview if available */}
              {((savedSuccessRecord.photoUrls && savedSuccessRecord.photoUrls.length > 0) || savedSuccessRecord.photoUrl) && (
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-300 block mb-2">
                    Foto Dokumentasi Terlampir ({savedSuccessRecord.photoUrls?.length || 1} Foto):
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
                    {(savedSuccessRecord.photoUrls || [savedSuccessRecord.photoUrl!]).map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setPreviewPhoto({
                            urls: savedSuccessRecord.photoUrls || [savedSuccessRecord.photoUrl!],
                            index: idx,
                            title: `Inspeksi Rigid - ${savedSuccessRecord.codeUnit}`,
                            subtitle: `${savedSuccessRecord.tanggal} (${savedSuccessRecord.status})`,
                          })
                        }
                        className="relative group rounded-xl overflow-hidden border border-slate-700 h-24 w-28 bg-slate-950 shadow-md"
                      >
                        <img
                          src={url}
                          alt={`Foto Inspeksi ${idx + 1}`}
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
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() =>
                    shareToWhatsApp(
                      formatDailyRigidWhatsApp(savedSuccessRecord),
                      {
                        photoUrls: savedSuccessRecord.photoUrls || (savedSuccessRecord.photoUrl ? [savedSuccessRecord.photoUrl] : []),
                        title: `Laporan ${savedSuccessRecord.codeUnit} - ${savedSuccessRecord.qaType || 'Rigid'}`,
                      }
                    )
                  }
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Share WhatsApp (+ Foto)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onPrintPreview(savedSuccessRecord)}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 active:scale-95 transition"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Cetak / Simpan PDF</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Tutup & Kembali
                </button>
              </div>
            </div>
          ) : (
            <form id="daily-rigid-form" onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Metadata Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-850/80 p-3.5 rounded-xl border border-slate-800">
                {/* Code Unit Selector */}
                <div className="sm:col-span-2">
                  <CodeUnitSelector
                    units={units}
                    selectedUnit={codeUnit}
                    onSelectUnit={handleUnitSelect}
                    label="Code Unit Rigid Dump Truck *"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">EGI Unit</label>
                  <input
                    type="text"
                    value={egi}
                    onChange={e => setEgi(e.target.value)}
                    placeholder="Contoh: HD785-7, 777D"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tanggal Inspeksi *</label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={e => setTanggal(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Status Kesiapan Unit *</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-amber-400 font-medium"
                  >
                    <option value="RUNNING">RUNNING (Siap Operasi)</option>
                    <option value="BREAKDOWN">BREAKDOWN (Rusak / Stop)</option>
                    <option value="SCHEDULED_SERVICE">SCHEDULED SERVICE (Jadwal PM)</option>
                    <option value="STANDBY">STANDBY (Tersedia Non-Aktif)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Finish Time</label>
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
                    placeholder="Contoh: 14820"
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
                  <label className="block text-slate-300 font-semibold mb-1">Divalidasi Oleh (Group Leader / Pengawas) *</label>
                  <input
                    type="text"
                    required
                    value={divalidasiOleh}
                    onChange={e => setDivalidasiOleh(e.target.value)}
                    placeholder="Nama Pengawas / Group Leader"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* 19 Checklist Items Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      19 Item Checklist Inspeksi Rigid
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                      19 Item Standar Plant 2
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSetAllOK}
                    className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Set Semua OK</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {items.map(it => {
                    const def = RIGID_CHECKLIST_ITEMS.find(d => d.id === it.id);
                    const isMeasurement = def?.type === 'measurement';

                    return (
                      <div
                        key={it.id}
                        className={`p-3 rounded-xl border transition ${
                          it.status === 'DEFECT'
                            ? 'bg-rose-950/20 border-rose-500/40'
                            : it.status === 'MONITOR'
                            ? 'bg-amber-950/20 border-amber-500/40'
                            : 'bg-slate-850/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-200 text-xs flex-1">
                            {it.name}
                          </span>

                          <div className="flex items-center space-x-1 shrink-0">
                            {(['OK', 'DEFECT', 'MONITOR', 'NA'] as const).map(st => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(it.id, st)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider transition ${
                                  it.status === st
                                    ? st === 'OK'
                                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                      : st === 'DEFECT'
                                      ? 'bg-rose-500 text-white shadow-sm'
                                      : st === 'MONITOR'
                                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                                      : 'bg-slate-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Additional measurement / remark input if needed */}
                        <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {isMeasurement ? (
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                                <span>Nilai Ukur:</span>
                                {def?.unit && <span className="font-mono text-amber-400">{def.unit}</span>}
                              </div>
                              <input
                                type="text"
                                value={it.value || ''}
                                onChange={e => handleValueChange(it.id, e.target.value)}
                                placeholder={def?.placeholder || 'Masukkan hasil ukur'}
                                className="w-full bg-slate-900 border border-slate-750 rounded px-2 py-1 text-[11px] text-amber-300 font-mono outline-none focus:border-amber-400"
                              />
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500 italic flex items-center">
                              Pemeriksaan visual & fungsi operasional
                            </div>
                          )}

                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Catatan / Keterangan:</span>
                            <input
                              type="text"
                              value={it.remark || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setItems(prev =>
                                  prev.map(item => (item.id === it.id ? { ...item, remark: val } : item))
                                );
                              }}
                              placeholder="Keterangan temuan (opsional)"
                              className="w-full bg-slate-900 border border-slate-750 rounded px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-slate-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                  placeholder="Tuliskan temuan deviasi jika ada item yang DEFECT/MONITOR, atau rencana tindakan perbaikan..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-amber-400 outline-none resize-none"
                />
              </div>

              {/* SECTION: FOTO DOKUMENTASI (BISA LEBIH DARI 1) */}
              <PhotoUploader
                photoUrls={photoUrls}
                onChangePhotos={setPhotoUrls}
                label="Foto Dokumentasi Daily Check Rigid (Bisa Lebih Dari 1)"
                description="Ambil foto fisik unit, walkaround ban, suspensi, engine bay, atau deviasi temuan dari kamera / galeri"
                onPreviewFullscreen={(url, idx, all) =>
                  setPreviewPhoto({
                    urls: all || [url],
                    index: idx || 0,
                    title: `Foto ${menuTitle} - ${codeUnit || 'Unit'}`,
                    subtitle: `Inspeksi ${tanggal} (${status})`,
                  })
                }
              />

              {/* SECTION: KETERHUBUNGAN OTOMATIS KE BACKLOG & AKTIVITAS UNIT */}
              <div className="bg-slate-850/90 border border-amber-500/30 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Link className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-slate-200 text-xs">
                      STATUS TERHUBUNG OTOMATIS: UNIT {codeUnit || '(PILIH UNIT TERLEBIH DAHULU)'}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Auto-Linked
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Backlogs box */}
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] font-bold text-slate-300">Backlog Unit Aktif</span>
                      </div>
                      <span className="text-xs font-bold text-amber-400 font-mono bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                        {activeUnitBacklogs.length} Item
                      </span>
                    </div>

                    {activeUnitBacklogs.length > 0 ? (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {activeUnitBacklogs.map(b => (
                          <div key={b.id} className="p-1.5 bg-slate-950/70 border border-slate-800 rounded text-[10px] flex items-center justify-between gap-1">
                            <div className="min-w-0 pr-1 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-200">{b.partNumber || b.moBacklog}</span>
                                <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-mono">
                                  {b.status}
                                </span>
                              </div>
                              <p className="text-slate-400 truncate mt-0.5">{b.deskripsiBacklog}</p>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0">
                              {onOpenViewBacklog && (
                                <button
                                  type="button"
                                  onClick={() => onOpenViewBacklog(b)}
                                  className="px-2 py-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded text-[10px] font-semibold flex items-center space-x-1 transition"
                                  title="Lihat Detail Backlog"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Lihat</span>
                                </button>
                              )}
                              {onOpenEditBacklog && (
                                <button
                                  type="button"
                                  onClick={() => onOpenEditBacklog(b)}
                                  className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold flex items-center space-x-1 transition"
                                  title="Ubah Data Backlog"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Ubah</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic py-1">
                        Tidak ada backlog aktif yang tertunda untuk unit ini.
                      </p>
                    )}

                    {codeUnit && (
                      <button
                        type="button"
                        onClick={() => onOpenAddBacklog(codeUnit)}
                        className="w-full py-1.5 px-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-[10px] font-semibold flex items-center justify-center space-x-1 transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Tambah Backlog Unit Ini</span>
                      </button>
                    )}
                  </div>

                  {/* Activities box */}
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px] font-bold text-slate-300">Aktivitas Terkait Unit</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 font-mono bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                        {unitActivities.length} Catatan
                      </span>
                    </div>

                    {unitActivities.length > 0 ? (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {unitActivities.slice(0, 4).map(a => (
                          <div key={a.id} className="p-1.5 bg-slate-950/70 border border-slate-800 rounded text-[10px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-200">{a.tanggalTemuan}</span>
                              <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                                {a.status}
                              </span>
                            </div>
                            <p className="text-slate-400 truncate mt-0.5">{a.deskripsiAktivitas}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic py-1">
                        Belum ada catatan aktivitas mekanik untuk unit ini.
                      </p>
                    )}

                    {codeUnit && (
                      <button
                        type="button"
                        onClick={() => onOpenAddActivity(codeUnit)}
                        className="w-full py-1.5 px-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-semibold flex items-center justify-center space-x-1 transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Catat Aktivitas Unit Ini</span>
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
              form="daily-rigid-form"
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
          photoUrls={previewPhoto.urls}
          initialIndex={previewPhoto.index}
          title={previewPhoto.title}
          subtitle={previewPhoto.subtitle}
        />
      )}
    </div>
  );
};
