import React, { useState, useMemo } from 'react';
import { CodeUnit } from '../types';
import { getCodeUnits } from '../services/storageService';
import {
  Truck,
  Plus,
  MapPin,
  Gauge,
  PenTool,
  RotateCcw,
  Search,
} from 'lucide-react';

interface CodeUnitSelectorProps {
  units?: CodeUnit[];
  selectedCodeUnit?: string;
  selectedUnit?: string;
  onChange?: (unit: CodeUnit | undefined) => void;
  onSelectUnit?: (unit: CodeUnit | undefined) => void;
  onAddNewUnit?: () => void;
  filterType?: string; // e.g. "Rigid", "Artic"
  label?: string;
}

export const CodeUnitSelector: React.FC<CodeUnitSelectorProps> = ({
  units,
  selectedCodeUnit,
  selectedUnit,
  onChange,
  onSelectUnit,
  onAddNewUnit,
  filterType,
  label,
}) => {
  const activeSelectedCode = selectedCodeUnit !== undefined ? selectedCodeUnit : (selectedUnit !== undefined ? selectedUnit : '');
  const triggerChange = (u: CodeUnit | undefined) => {
    if (onChange) onChange(u);
    if (onSelectUnit) onSelectUnit(u);
  };

  // Ensure we ALWAYS have unit data available even if parent passed empty array
  const allUnits = useMemo(() => {
    if (units && units.length > 0) return units;
    return getCodeUnits();
  }, [units]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualEgi, setManualEgi] = useState('');

  // Find currently selected unit (case-insensitive & trimmed)
  const currentUnit = useMemo(() => {
    if (!activeSelectedCode) return undefined;
    const clean = activeSelectedCode.trim().toLowerCase();
    return allUnits.find(u => u.codeUnit.trim().toLowerCase() === clean);
  }, [allUnits, activeSelectedCode]);

  // Filtered units if search term is typed
  const displayedUnits = useMemo(() => {
    if (!searchTerm.trim()) return allUnits;
    const q = searchTerm.toLowerCase().trim();
    return allUnits.filter(
      u =>
        u.codeUnit.toLowerCase().includes(q) ||
        u.egi.toLowerCase().includes(q) ||
        u.brand.toLowerCase().includes(q) ||
        u.lokasiPit.toLowerCase().includes(q)
    );
  }, [allUnits, searchTerm]);

  const handleClearSelection = () => {
    setIsManualMode(false);
    setManualCode('');
    setManualEgi('');
    triggerChange(undefined);
  };

  const handleApplyManual = () => {
    if (!manualCode.trim()) return;
    const code = manualCode.trim().toUpperCase();
    const fallbackUnit: CodeUnit = {
      id: `CU-CUSTOM-${Date.now().toString().slice(-4)}`,
      codeUnit: code,
      egi: manualEgi.trim() || `${code} (${filterType || 'Unit Operasional'})`,
      tipeAlat: filterType === 'Rigid' ? 'Rigid Dump Truck' : (filterType || 'Heavy Equipment'),
      brand: 'Heavy Equipment',
      lokasiPit: 'PIT Area',
      currentHm: 0,
      statusUnit: 'READY',
    };
    triggerChange(fallbackUnit);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value.trim();
    if (!val) {
      triggerChange(undefined);
      return;
    }
    const found = allUnits.find(
      u => u.codeUnit.trim().toLowerCase() === val.toLowerCase()
    );
    if (found) {
      triggerChange(found);
    } else {
      triggerChange({
        id: `CU-CUSTOM-${Date.now().toString().slice(-4)}`,
        codeUnit: val,
        egi: val,
        tipeAlat: filterType === 'Rigid' ? 'Rigid Dump Truck' : (filterType || 'Heavy Equipment'),
        brand: 'Heavy Equipment',
        lokasiPit: 'PIT Area',
        currentHm: 0,
        statusUnit: 'READY',
      });
    }
  };

  const getStatusColor = (status: CodeUnit['statusUnit']) => {
    switch (status) {
      case 'READY':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'BREAKDOWN':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'MAINTENANCE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const activeCode = currentUnit ? currentUnit.codeUnit : selectedCodeUnit;

  return (
    <div className="space-y-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3.5 shadow-sm">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg border border-amber-500/30">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <label className="text-xs font-bold text-white uppercase tracking-wider block">
              {label || 'PILIH CODE UNIT (MASTER DATA) *'}
            </label>
            <span className="text-[10px] text-slate-400 block">
              Pilih unit alat berat dari daftar master data
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setIsManualMode(!isManualMode)}
            className={`text-[11px] px-2 py-1 rounded-lg border transition flex items-center space-x-1 ${
              isManualMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <PenTool className="w-3 h-3" />
            <span>Ketik Manual</span>
          </button>

          {onAddNewUnit && (
            <button
              type="button"
              onClick={onAddNewUnit}
              className="text-[11px] px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 rounded-lg font-semibold flex items-center space-x-1 transition"
            >
              <Plus className="w-3 h-3" />
              <span>+ Master</span>
            </button>
          )}
        </div>
      </div>

      {/* MANUAL MODE INPUT */}
      {isManualMode ? (
        <div className="bg-slate-850 border border-amber-500/30 rounded-xl p-3 space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
            <span>Input Code Unit Baru / Manual:</span>
            <button
              type="button"
              onClick={() => setIsManualMode(false)}
              className="text-[11px] text-slate-400 hover:text-white"
            >
              Batalkan
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase())}
              placeholder="Contoh: RD-777D-03 atau HD-785-06"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase focus:border-amber-400 outline-none"
            />
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={manualEgi}
                onChange={e => setManualEgi(e.target.value)}
                placeholder="EGI Unit (Opsional, contoh: CAT 777D)"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
              />
              <button
                type="button"
                onClick={handleApplyManual}
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg shrink-0 transition"
              >
                Pilih
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Quick Search filter bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari Code Unit, EGI, atau Brand..."
              className="w-full bg-slate-850 border border-slate-700 rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:border-amber-400 outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-[10px] text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Standard Dropdown Select */}
          <div className="relative">
            <select
              value={activeCode}
              onChange={handleSelectChange}
              style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
              className="w-full bg-slate-800 border-2 border-slate-700 hover:border-slate-600 focus:border-amber-400 rounded-xl px-3 py-2.5 text-xs text-white font-medium focus:outline-none transition cursor-pointer shadow-sm"
            >
              <option value="" style={{ backgroundColor: '#0f172a', color: '#94a3b8' }}>
                -- Pilih Code Unit Alat Berat --
              </option>

              {/* If there's an active custom/manual code not in master list, show it */}
              {activeCode && !currentUnit && (
                <option
                  value={activeCode}
                  style={{ backgroundColor: '#0f172a', color: '#f59e0b' }}
                >
                  ★ {activeCode} (Unit Terpilih)
                </option>
              )}

              {displayedUnits.map((unit, unitIdx) => (
                <option
                  key={`${unit.id}-${unitIdx}`}
                  value={unit.codeUnit}
                  style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                  className="bg-slate-900 text-white py-1.5"
                >
                  {unit.codeUnit} | {unit.brand} - {unit.egi} ({unit.lokasiPit}) [{unit.currentHm.toLocaleString()} HM - {unit.statusUnit}]
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* SELECTED UNIT DETAILS PREVIEW CARD */}
      {currentUnit ? (
        <div className="bg-slate-800/90 border border-amber-500/40 rounded-xl p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-fade-in shadow-inner">
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Unit Terpilih:</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="font-mono font-black text-amber-400 text-sm">{currentUnit.codeUnit}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${getStatusColor(currentUnit.statusUnit)}`}>
                {currentUnit.statusUnit}
              </span>
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">EGI & Tipe:</span>
            <span className="font-bold text-white truncate block mt-0.5">{currentUnit.egi}</span>
            <span className="text-[10px] text-slate-400 truncate block">{currentUnit.brand} ({currentUnit.tipeAlat})</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 flex items-center space-x-1 font-semibold uppercase">
              <MapPin className="w-3 h-3 text-rose-400" />
              <span>Lokasi PIT:</span>
            </span>
            <span className="text-slate-200 font-medium truncate block mt-0.5">{currentUnit.lokasiPit}</span>
          </div>
          <div className="flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-slate-400 flex items-center space-x-1 font-semibold uppercase">
                <Gauge className="w-3 h-3 text-amber-400" />
                <span>HM Unit:</span>
              </span>
              <span className="font-bold text-amber-400 font-mono text-xs mt-0.5 block">
                {currentUnit.currentHm.toLocaleString()} HM
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center space-x-1 self-start mt-1 font-semibold"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Ganti Unit</span>
            </button>
          </div>
        </div>
      ) : activeCode ? (
        <div className="bg-slate-800/90 border border-amber-500/40 rounded-xl p-3 text-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Unit Terpilih (Manual):</span>
            <span className="font-mono font-bold text-amber-400 text-sm">{activeCode}</span>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
          >
            Ganti Unit
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-amber-400/80 italic flex items-center space-x-1">
          <span>⚠️ Silakan pilih salah satu Code Unit dari dropdown di atas untuk melanjutkan pengisian form.</span>
        </p>
      )}
    </div>
  );
};
