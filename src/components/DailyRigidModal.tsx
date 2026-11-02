import React, { useState, useEffect, useRef } from 'react';
import {
  DailyCheckRigid,
  CodeUnit,
  ChecklistItemStatus,
} from '../types';
import { RIGID_CHECKLIST_ITEMS } from '../constants/checklists';
import { CodeUnitSelector } from './CodeUnitSelector';
import { PhotoUploader } from './PhotoUploader';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import { getUnitStats } from '../services/storageService';
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
} from 'lucide-react';
import { formatDailyRigidWhatsApp, shareToWhatsApp } from '../utils/whatsappFormatter';

import { QAType } from '../types';

interface DailyRigidModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: CodeUnit[];
  onSave: (item: DailyCheckRigid) => Promise<void>;
  onPrintPreview: (item: DailyCheckRigid) => void;
  onOpenAddBacklog: (codeUnit: string) => void;
  onOpenAddActivity: (codeUnit: string) => void;
  initialCodeUnit?: string;
  itemToEdit?: DailyCheckRigid | null;
  qaType?: QAType;
}

export const DailyRigidModal: React.FC<DailyRigidModalProps> = ({
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
  const [status, setStatus] = useState<DailyCheckRigid['status']>('RUNNING');
  const [startTime, setStartTime] = useState('07:00');
  const [finishTime, setFinishTime] = useState('08:30');
  const [totalJam, setTotalJam] = useState('1.5 Jam');
  const [hmUnit, setHmUnit] = useState<number>(0);
  const [picMekanik, setPicMekanik] = useState('');
  const [divalidasiOleh, setDivalidasiOleh] = useState('Foreman Pit 1');

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
  const [jumlahBacklog, setJumlahBacklog] = useState(0);
  const [jumlahAktivitas, setJumlahAktivitas] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(itemToEdit?.photoUrl);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

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

  // Initialize form ONLY when modal opens or itemToEdit changes
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
          RIGID_CHECKLIST_ITEMS.map(def => ({
            id: def.id,
            name: def.name,
            status: 'OK',
            value: def.defaultVal || '',
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

  // Direct Unit Select Handler
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
      const record: DailyCheckRigid = {
        id: itemToEdit ? itemToEdit.id : `${prefix}-${tanggal.replace(/-/g, '')}-${codeUnit}-${randomSuffix}`,
        qaType: activeQaType,
        codeUnit,
        egi: egi || 'Rigid Dump Truck',
        tanggal,
        status,
        startTime,
        finishTime,
        totalJam,
        hmUnit: Number(hmUnit) || 0,
        picMekanik: picMekanik || 'Mekanik Heavy Equipment',
        divalidasiOleh: divalidasiOleh || 'Foreman Maintenance',
        items,
        temuanDeviasi: temuanDeviasi || 'Nihil / Parameter Sesuai Standar',
        jumlahBacklog,
        jumlahAktivitas,
        photoUrl: photoUrl || itemToEdit?.photoUrl,
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
  const badgeLabel = isDaily ? 'DAILY CHECK (QA 7)' : isFinalInspection ? 'FINAL RELEASE' : 'PRE-OPERATIONAL';
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
                  {itemToEdit ? 'Inspeksi Rigid Berhasil Diperbarui!' : 'Laporan Daily Check Rigid Berhasil Disimpan!'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Unit: <strong className="text-amber-400">{savedSuccessRecord.codeUnit}</strong> ({savedSuccessRecord.egi})
                </p>
                <p className="text-[11px] text-slate-400">
                  Data otomatis tercatat di Google Sheet tab DAILY_CHECK_RIGID.
                </p>
              </div>

              {savedSuccessRecord.photoUrl && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewPhoto({
                        url: savedSuccessRecord.photoUrl!,
                        title: `Daily Check Rigid - ${savedSuccessRecord.codeUnit}`,
                        subtitle: `${savedSuccessRecord.tanggal} (${savedSuccessRecord.status})`,
                      })
                    }
                    className="relative group rounded-xl overflow-hidden border border-slate-700 max-h-36 shadow-md"
                  >
                    <img
                      src={savedSuccessRecord.photoUrl}
                      alt="Foto Inspeksi"
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
                  onClick={() => shareToWhatsApp(formatDailyRigidWhatsApp(savedSuccessRecord))}
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
            <form id="daily-rigid-form" onSubmit={handleSubmit} className="space-y-4">
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
                filterType="Rigid"
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

              {/* 19 Checklist Items Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      DAFTAR 19 ITEM CHECKLIST RIGID
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                      19 Parameter
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSetAllOK}
                    className="flex items-center space-x-1 text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg hover:bg-emerald-500/20 font-semibold transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Set Semua OK</span>
                  </button>
                </div>

                {/* Items Container */}
                <div className="space-y-2">
                  {items.map(current => {
                    const def = RIGID_CHECKLIST_ITEMS.find(d => d.id === current.id);
                    const isMeasurement = def?.type === 'measurement';

                    return (
                      <div
                        key={current.id}
                        className={`p-2.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          current.status === 'DEFECT'
                            ? 'bg-rose-950/20 border-rose-500/40'
                            : current.status === 'MONITOR'
                            ? 'bg-amber-950/20 border-amber-500/40'
                            : 'bg-slate-800/40 border-slate-800/80 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex-1">
                          <span className="font-semibold text-slate-200 block text-xs">
                            {current.name}
                          </span>
                          {isMeasurement && (
                            <span className="text-[10px] text-amber-400/80 font-medium">
                              Input Nilai Pengukuran ({def?.unit})
                            </span>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center space-x-2 shrink-0">
                          {isMeasurement ? (
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="text"
                                value={current.value || ''}
                                onChange={e => handleValueChange(current.id, e.target.value)}
                                placeholder={def?.placeholder}
                                className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:border-amber-400 outline-none"
                              />
                              <span className="text-[10px] text-slate-400 font-mono w-12 truncate">
                                {def?.unit}
                              </span>
                            </div>
                          ) : null}

                          {/* Status Toggles: OK, MONITOR, DEFECT */}
                          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                            {(['OK', 'MONITOR', 'DEFECT'] as const).map(st => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(current.id, st)}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
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

              {/* Dokumentasi Foto Pemeriksaan Rigid Dump Truck */}
              <PhotoUploader
                photoUrl={photoUrl}
                onChange={setPhotoUrl}
                label="Foto Dokumentasi Daily Check Rigid"
                description="Ambil foto fisik unit, walkaround ban, suspensi, engine bay, atau deviasi temuan dari kamera / galeri"
                onPreviewFullscreen={url =>
                  setPreviewPhoto({
                    url,
                    title: `Foto Daily Check Rigid: ${codeUnit || 'Unit'}`,
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
                      KETERHUBUNGAN BACKLOG & AKTIVITAS ({codeUnit || 'Belum Dipilih'})
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
          photoUrl={previewPhoto.url}
          title={previewPhoto.title}
          subtitle={previewPhoto.subtitle}
        />
      )}
    </div>
  );
};
