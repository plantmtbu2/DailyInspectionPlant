import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Truck,
  Tractor,
  CheckCircle2,
  Plus,
  Search,
  Copy,
  Trash2,
  Save,
  Info,
} from 'lucide-react';
import { CodeUnit, InspectionPlanModule } from '../types';
import { isRigidUnitCode, isArticUnitCode } from '../utils/unitFilter';
import {
  getInspectionPlans,
  getPlanForDateAndModule,
  savePlanForDateAndModule,
  copyDayPlansToDate,
} from '../services/inspectionPlanService';
import { logCurrentUserActivity } from '../services/userActivityLogService';

interface InspectionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  codeUnits: CodeUnit[];
  initialDate: string;
  initialModule?: InspectionPlanModule;
}

const PLAN_MODULES: Array<{
  id: InspectionPlanModule;
  label: string;
  shortLabel: string;
  fleet: 'RIGID' | 'ARTIC';
}> = [
  { id: 'DAILY_RIGID', label: 'Daily Check Rigid (DT)', shortLabel: 'Daily Rigid', fleet: 'RIGID' },
  { id: 'DAILY_ARTIC', label: 'Daily Check Artic (GR/CP/WL)', shortLabel: 'Daily Artic', fleet: 'ARTIC' },
  { id: 'QA1_RIGID', label: 'QA 1 Pre Rigid (DT)', shortLabel: 'QA 1 Rigid', fleet: 'RIGID' },
  { id: 'QA7_RIGID', label: 'QA 7 Final Rigid (DT)', shortLabel: 'QA 7 Rigid', fleet: 'RIGID' },
  { id: 'QA1_ARTIC', label: 'QA 1 Pre Artic (GR/CP/WL)', shortLabel: 'QA 1 Artic', fleet: 'ARTIC' },
  { id: 'QA7_ARTIC', label: 'QA 7 Final Artic (GR/CP/WL)', shortLabel: 'QA 7 Artic', fleet: 'ARTIC' },
];

export const InspectionPlanModal: React.FC<InspectionPlanModalProps> = ({
  isOpen,
  onClose,
  codeUnits,
  initialDate,
  initialModule = 'DAILY_RIGID',
}) => {
  const [planDate, setPlanDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [activeModule, setActiveModule] = useState<InspectionPlanModule>(initialModule);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [searchUnit, setSearchUnit] = useState('');
  const [customUnitInput, setCustomUnitInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setPlanDate(initialDate || new Date().toISOString().slice(0, 10));
    setActiveModule(initialModule || 'DAILY_RIGID');
  }, [isOpen, initialDate, initialModule]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedUnits(getPlanForDateAndModule(planDate, activeModule));
  }, [isOpen, planDate, activeModule, refreshTick]);

  const currentModuleMeta =
    PLAN_MODULES.find(m => m.id === activeModule) || PLAN_MODULES[0];

  const fleetUnits = useMemo(() => {
    const filtered = codeUnits.filter(u =>
      currentModuleMeta.fleet === 'RIGID'
        ? isRigidUnitCode(u.codeUnit)
        : isArticUnitCode(u.codeUnit)
    );
    return filtered.sort((a, b) => a.codeUnit.localeCompare(b.codeUnit));
  }, [codeUnits, currentModuleMeta.fleet]);

  const filteredFleetUnits = useMemo(() => {
    const q = searchUnit.trim().toLowerCase();
    if (!q) return fleetUnits;
    return fleetUnits.filter(
      u =>
        u.codeUnit.toLowerCase().includes(q) ||
        u.egi.toLowerCase().includes(q) ||
        u.lokasiPit.toLowerCase().includes(q)
    );
  }, [fleetUnits, searchUnit]);

  const dateModuleCounts = useMemo(() => {
    const all = getInspectionPlans().filter(p => p.date === planDate);
    const map = new Map<InspectionPlanModule, number>();
    all.forEach(p => map.set(p.module, p.plannedUnitCodes.length));
    return map;
  }, [planDate, refreshTick, selectedUnits]);

  if (!isOpen) return null;

  const showNotice = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const toggleUnit = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    const isRemoving = selectedUnits.includes(clean);
    const next = isRemoving
      ? selectedUnits.filter(u => u !== clean)
      : [...selectedUnits, clean];
    setSelectedUnits(next);
    savePlanForDateAndModule(planDate, activeModule, next);
    logCurrentUserActivity({
      actionType: 'PLAN_UPDATE',
      module: 'Rencana Unit',
      description: `${isRemoving ? 'Hapus' : 'Tambah'} unit ${clean} pada rencana ${currentModuleMeta.shortLabel} tanggal ${planDate} (Total: ${next.length} unit)`,
    });
    setRefreshTick(t => t + 1);
  };

  const handleSelectAll = () => {
    const allCodes = Array.from(
      new Set([
        ...selectedUnits,
        ...fleetUnits.map(u => u.codeUnit.trim().toUpperCase()),
      ])
    );
    setSelectedUnits(allCodes);
    savePlanForDateAndModule(planDate, activeModule, allCodes);
    logCurrentUserActivity({
      actionType: 'PLAN_UPDATE',
      module: 'Rencana Unit',
      description: `Pilih semua (${allCodes.length} unit) untuk rencana ${currentModuleMeta.shortLabel} tanggal ${planDate}`,
    });
    setRefreshTick(t => t + 1);
    showNotice(`${allCodes.length} unit ditambahkan ke rencana ${currentModuleMeta.shortLabel}.`);
  };

  const handleClearModule = () => {
    setSelectedUnits([]);
    savePlanForDateAndModule(planDate, activeModule, []);
    logCurrentUserActivity({
      actionType: 'PLAN_UPDATE',
      module: 'Rencana Unit',
      description: `Kosongkan rencana ${currentModuleMeta.shortLabel} tanggal ${planDate}`,
    });
    setRefreshTick(t => t + 1);
    showNotice(`Rencana ${currentModuleMeta.shortLabel} tanggal ${planDate} dikosongkan.`);
  };

  const handleAddCustomUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customUnitInput.trim().toUpperCase();
    if (!clean) return;
    if (!selectedUnits.includes(clean)) {
      const next = [...selectedUnits, clean];
      setSelectedUnits(next);
      savePlanForDateAndModule(planDate, activeModule, next);
      logCurrentUserActivity({
        actionType: 'PLAN_UPDATE',
        module: 'Rencana Unit',
        description: `Tambah unit manual ${clean} ke rencana ${currentModuleMeta.shortLabel} tanggal ${planDate}`,
      });
      setRefreshTick(t => t + 1);
    }
    setCustomUnitInput('');
  };

  const handleCopyFromPreviousDay = () => {
    const d = new Date(planDate);
    d.setDate(d.getDate() - 1);
    const prevIso = d.toISOString().slice(0, 10);
    const prevPlans = getInspectionPlans().filter(p => p.date === prevIso && p.plannedUnitCodes.length > 0);
    if (prevPlans.length === 0) {
      showNotice(`Tidak ada rencana tersimpan pada tanggal ${prevIso}.`);
      return;
    }
    copyDayPlansToDate(prevIso, planDate);
    logCurrentUserActivity({
      actionType: 'PLAN_UPDATE',
      module: 'Rencana Unit',
      description: `Salin rencana unit dari ${prevIso} ke tanggal ${planDate}`,
    });
    setRefreshTick(t => t + 1);
    showNotice(`Rencana dari ${prevIso} berhasil disalin ke ${planDate}.`);
  };

  const extraPlannedCodes = selectedUnits.filter(
    code => !fleetUnits.some(u => u.codeUnit.trim().toUpperCase() === code)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#18181b] border border-[rgba(242,239,235,0.15)] rounded-lg w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-[#f2efeb]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[rgba(242,239,235,0.1)] bg-[#111113] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-[#facc15]/15 text-[#facc15] border border-[#facc15]/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-syne font-extrabold text-sm sm:text-base uppercase text-[#f2efeb]">
                Atur Rencana Unit (Planning Inspeksi)
              </h2>
              <p className="text-[11px] font-mono text-[rgba(242,239,235,0.55)]">
                Tentukan unit yang direncanakan per tanggal untuk perhitungan Pencapaian Dashboard
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.08)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {toastMsg && (
            <div className="p-2.5 rounded bg-[#4ade80]/15 border border-[#4ade80]/40 text-[#4ade80] text-xs font-mono font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* Info formula */}
          <div className="p-3 rounded bg-[rgba(56,189,248,0.08)] border border-[#38bdf8]/25 text-[11px] font-mono text-[rgba(242,239,235,0.85)] flex items-start space-x-2">
            <Info className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />
            <span>
              Unit yang dipilih pada tanggal ini dihitung sebagai <strong className="text-[#facc15]">Direncanakan (Plan)</strong>. Unit lain yang diinspeksi di luar daftar rencana dihitung sebagai <strong className="text-[#38bdf8]">Tidak Direncanakan (Tambahan)</strong>. Pencapaian hanya terhitung jika <strong className="text-[#4ade80]">HM Unit terisi (&gt; 0)</strong>.
            </span>
          </div>

          {/* Date Picker & Copy Prev Day */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#111113] p-3 rounded border border-[rgba(242,239,235,0.1)]">
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-mono font-bold text-[rgba(242,239,235,0.7)] uppercase">
                Tanggal Rencana:
              </span>
              <input
                type="date"
                value={planDate}
                onChange={e => setPlanDate(e.target.value)}
                className="bg-[#18181b] border border-[rgba(242,239,235,0.2)] rounded px-2.5 py-1.5 text-xs font-mono font-bold text-[#facc15] outline-none focus:border-[#facc15]"
              />
            </div>

            <button
              type="button"
              onClick={handleCopyFromPreviousDay}
              className="px-3 py-1.5 rounded bg-[rgba(242,239,235,0.06)] hover:bg-[rgba(242,239,235,0.12)] border border-[rgba(242,239,235,0.15)] text-xs font-mono font-bold text-[#f2efeb] flex items-center justify-center space-x-1.5 transition"
            >
              <Copy className="w-3.5 h-3.5 text-[#facc15]" />
              <span>Salin Rencana Hari Sebelumnya</span>
            </button>
          </div>

          {/* 6 Module Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {PLAN_MODULES.map(mod => {
              const isActive = activeModule === mod.id;
              const count = dateModuleCounts.get(mod.id) || 0;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveModule(mod.id)}
                  className={`p-2 rounded text-left border transition flex items-center justify-between ${
                    isActive
                      ? 'bg-[#facc15] text-[#111113] border-[#facc15]'
                      : 'bg-[#111113] text-[#f2efeb] border-[rgba(242,239,235,0.12)] hover:border-[rgba(242,239,235,0.3)]'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 min-w-0">
                    {mod.fleet === 'RIGID' ? (
                      <Truck className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Tractor className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="text-[11px] font-mono font-bold truncate">
                      {mod.shortLabel}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ml-1 ${
                      isActive
                        ? 'bg-[#111113]/20 text-[#111113]'
                        : count > 0
                        ? 'bg-[#4ade80]/15 text-[#4ade80]'
                        : 'bg-white/5 text-[rgba(242,239,235,0.4)]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Bulk Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-[rgba(242,239,235,0.45)] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchUnit}
                onChange={e => setSearchUnit(e.target.value)}
                placeholder={`Cari unit ${currentModuleMeta.fleet === 'RIGID' ? 'DT' : 'GR/CP/WL'}...`}
                className="w-full bg-[#111113] border border-[rgba(242,239,235,0.15)] rounded pl-8 pr-3 py-1.5 text-xs font-mono text-[#f2efeb] outline-none focus:border-[#facc15]"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 rounded bg-[#4ade80]/15 hover:bg-[#4ade80]/25 text-[#4ade80] border border-[#4ade80]/30 font-bold"
              >
                Pilih Semua ({fleetUnits.length})
              </button>
              <button
                type="button"
                onClick={handleClearModule}
                className="px-2.5 py-1.5 rounded bg-[#fb7185]/15 hover:bg-[#fb7185]/25 text-[#fb7185] border border-[#fb7185]/30 font-bold flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            </div>
          </div>

          {/* Custom Code Unit Add */}
          <form onSubmit={handleAddCustomUnit} className="flex items-center space-x-2">
            <input
              type="text"
              value={customUnitInput}
              onChange={e => setCustomUnitInput(e.target.value)}
              placeholder={
                currentModuleMeta.fleet === 'RIGID'
                  ? 'Tambah manual Code Unit (mis. DT5501)...'
                  : 'Tambah manual Code Unit (mis. GR102)...'
              }
              className="flex-1 bg-[#111113] border border-[rgba(242,239,235,0.15)] rounded px-3 py-1.5 text-xs font-mono uppercase text-[#f2efeb] outline-none focus:border-[#facc15]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-[#facc15] hover:bg-[#fde047] text-[#111113] text-xs font-mono font-bold uppercase flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </form>

          {/* Extra Custom Units */}
          {extraPlannedCodes.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-[rgba(242,239,235,0.5)] uppercase">
                Unit Kustom Direncanakan:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {extraPlannedCodes.map(code => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleUnit(code)}
                    className="px-2.5 py-1 rounded bg-[#facc15]/15 border border-[#facc15]/40 text-[#facc15] text-xs font-mono font-bold flex items-center space-x-1.5"
                  >
                    <span>{code}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Unit Grid Checkboxes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
            {filteredFleetUnits.map((u, idx) => {
              const code = u.codeUnit.trim().toUpperCase();
              const isSelected = selectedUnits.includes(code);
              return (
                <button
                  key={`${u.id}-${code}-${idx}`}
                  type="button"
                  onClick={() => toggleUnit(code)}
                  className={`p-2 rounded border text-left transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#4ade80]/15 border-[#4ade80] text-[#f2efeb]'
                      : 'bg-[#111113] border-[rgba(242,239,235,0.1)] text-[rgba(242,239,235,0.7)] hover:border-[rgba(242,239,235,0.3)]'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-xs block truncate">
                      {code}
                    </span>
                    <span className="font-mono text-[10px] text-[rgba(242,239,235,0.45)] block truncate">
                      {u.egi}
                    </span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-[#4ade80] border-[#4ade80] text-[#111113]'
                        : 'border-[rgba(242,239,235,0.25)]'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                </button>
              );
            })}
            {filteredFleetUnits.length === 0 && (
              <div className="col-span-full py-6 text-center text-xs font-mono text-[rgba(242,239,235,0.45)]">
                Tidak ada unit master {currentModuleMeta.fleet === 'RIGID' ? 'DT' : 'GR/CP/WL'} yang sesuai. Gunakan input manual di atas.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-[rgba(242,239,235,0.1)] bg-[#111113] flex items-center justify-between">
          <span className="text-xs font-mono text-[rgba(242,239,235,0.7)]">
            Terpilih pada <strong className="text-[#facc15]">{currentModuleMeta.shortLabel}</strong>:{' '}
            <strong className="text-[#4ade80]">{selectedUnits.length} Unit</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#facc15] hover:bg-[#fde047] text-[#111113] text-xs font-mono font-black uppercase flex items-center space-x-1.5 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Selesai &amp; Terapkan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
