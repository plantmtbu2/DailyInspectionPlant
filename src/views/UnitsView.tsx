import React, { useState } from 'react';
import { CodeUnit, QAType } from '../types';
import { getUnitStats } from '../services/storageService';
import {
  Layers,
  Search,
  Plus,
  MapPin,
  Gauge,
  AlertOctagon,
  Wrench,
  FileWarning,
  FileCheck,
  ClipboardCheck,
  Edit3,
  Trash2,
  Camera,
} from 'lucide-react';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';

interface UnitsViewProps {
  units: CodeUnit[];
  onOpenManageUnits: () => void;
  onEditUnit: (unit: CodeUnit) => void;
  onDeleteUnit: (id: string, name: string) => void;
  onOpenBapForUnit: (codeUnit: string) => void;
  onOpenRigidForUnit: (codeUnit: string, qaType?: QAType) => void;
  onOpenArticForUnit: (codeUnit: string, qaType?: QAType) => void;
  onOpenBacklogForUnit: (codeUnit: string) => void;
  onOpenActivityForUnit: (codeUnit: string) => void;
}

export const UnitsView: React.FC<UnitsViewProps> = ({
  units,
  onOpenManageUnits,
  onEditUnit,
  onDeleteUnit,
  onOpenBapForUnit,
  onOpenRigidForUnit,
  onOpenArticForUnit,
  onOpenBacklogForUnit,
  onOpenActivityForUnit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [previewPhoto, setPreviewPhoto] = useState<{
    urls: string[];
    index?: number;
    title: string;
    subtitle?: string;
  } | null>(null);

  const readyCount = units.filter(u => u.statusUnit === 'READY').length;
  const breakdownCount = units.filter(u => u.statusUnit === 'BREAKDOWN').length;
  const maintenanceCount = units.filter(u => u.statusUnit === 'MAINTENANCE').length;

  const filtered = units.filter(u => {
    const matchesSearch =
      u.codeUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.egi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lokasiPit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.tipeAlat.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === 'ALL' ||
      (filterType === 'READY' && u.statusUnit === 'READY') ||
      (filterType === 'BREAKDOWN' && u.statusUnit === 'BREAKDOWN') ||
      (filterType === 'MAINTENANCE' && u.statusUnit === 'MAINTENANCE');

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              DATA UTAMA CODE UNIT
            </h2>
            <p className="text-xs text-slate-400">
              Master unit tambang yang terhubung otomatis ke BAP, Daily Check, Backlog & Aktivitas
            </p>
          </div>
        </div>

        <button
          onClick={onOpenManageUnits}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Master Unit</span>
        </button>
      </div>

      {/* Fleet KPI Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <button
          onClick={() => setFilterType('READY')}
          className="p-3 bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-left transition"
        >
          <span className="text-[10px] text-emerald-400 font-semibold block uppercase">Ready Operasi</span>
          <span className="text-xl font-black text-emerald-300 font-mono">{readyCount} Unit</span>
        </button>

        <button
          onClick={() => setFilterType('BREAKDOWN')}
          className="p-3 bg-rose-950/20 hover:bg-rose-950/30 border border-rose-500/30 rounded-xl text-left transition"
        >
          <span className="text-[10px] text-rose-400 font-semibold block uppercase">Breakdown (BD)</span>
          <span className="text-xl font-black text-rose-300 font-mono">{breakdownCount} Unit</span>
        </button>

        <button
          onClick={() => setFilterType('MAINTENANCE')}
          className="p-3 bg-amber-950/20 hover:bg-amber-950/30 border border-amber-500/30 rounded-xl text-left transition"
        >
          <span className="text-[10px] text-amber-400 font-semibold block uppercase">Maintenance (PS)</span>
          <span className="text-xl font-black text-amber-300 font-mono">{maintenanceCount} Unit</span>
        </button>

        <button
          onClick={() => setFilterType('ALL')}
          className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-left transition"
        >
          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Armada</span>
          <span className="text-xl font-black text-white font-mono">{units.length} Unit</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Cari Unit (Code Unit, EGI, Brand, Lokasi PIT)..."
          className="w-full bg-slate-850 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:border-amber-400 outline-none"
        />
      </div>

      {/* Code Unit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filtered.map(unit => {
          const stats = getUnitStats(unit.codeUnit);
          const isRigid =
            unit.tipeAlat.toLowerCase().includes('rigid') ||
            unit.codeUnit.toUpperCase().startsWith('RD') ||
            unit.codeUnit.toUpperCase().startsWith('HD') ||
            unit.codeUnit.toUpperCase().startsWith('DT') ||
            unit.egi.includes('777') ||
            unit.egi.includes('785');

          return (
            <div
              key={unit.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 space-y-3.5 transition shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-black text-white font-mono tracking-wide">
                        {unit.codeUnit}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          unit.statusUnit === 'READY'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : unit.statusUnit === 'BREAKDOWN'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : unit.statusUnit === 'MAINTENANCE'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-700 text-slate-400 border-slate-600'
                        }`}
                      >
                        {unit.statusUnit}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      {unit.brand} • {unit.egi}
                    </p>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Tipe: {unit.tipeAlat} | ID: {unit.id}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => onEditUnit(unit)}
                      title="Edit data unit ini"
                      className="p-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteUnit(unit.id, `${unit.codeUnit} (${unit.egi})`)}
                      title="Hapus unit ini"
                      className="p-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* HM & Location */}
                <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>PIT: <strong>{unit.lokasiPit}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Gauge className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-mono font-bold text-amber-400">{unit.currentHm.toLocaleString()} HM</span>
                  </div>
                </div>

                {/* Foto Unit jika ada (Bisa lebih dari 1 foto) */}
                {(() => {
                  const photos = unit.photoUrls && unit.photoUrls.length > 0 ? unit.photoUrls : (unit.photoUrl ? [unit.photoUrl] : []);
                  if (photos.length === 0) return null;

                  return (
                    <div className="bg-slate-850/60 p-2 rounded-xl border border-slate-800 mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span className="font-semibold flex items-center space-x-1">
                          <Camera className="w-3.5 h-3.5 text-amber-400" />
                          <span>Foto Armada ({photos.length} Foto)</span>
                        </span>
                        <span className="text-[10px] text-slate-500">Klik untuk melihat galeri</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {photos.map((pUrl, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() =>
                              setPreviewPhoto({
                                urls: photos,
                                index: pIdx,
                                title: `Unit ${unit.codeUnit} - ${unit.brand} ${unit.egi}`,
                                subtitle: `Foto ${pIdx + 1} dari ${photos.length} | Lokasi PIT: ${unit.lokasiPit} | Status: ${unit.statusUnit} | ${unit.currentHm.toLocaleString()} HM`,
                              })
                            }
                            className="relative group w-16 h-14 rounded-lg overflow-hidden border border-slate-700 hover:ring-2 hover:ring-amber-400 transition"
                            title="Klik untuk melihat foto unit"
                          >
                            <img
                              src={pUrl}
                              alt={`Unit ${unit.codeUnit} #${pIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                            />
                            <span className="absolute bottom-0 right-0 bg-slate-950/80 text-amber-400 text-[9px] font-bold px-1 rounded-tl">
                              #{pIdx + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Connected Stats Row */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 text-center text-xs">
                  <div className="bg-slate-850 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">Inspeksi</span>
                    <span className="font-mono font-bold text-white">{stats.inspectionCount}</span>
                  </div>
                  <div className="bg-slate-850 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-rose-400 block">BAP</span>
                    <span className="font-mono font-bold text-rose-300">{stats.bapCount}</span>
                  </div>
                  <div className="bg-slate-850 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-amber-400 block">Backlog</span>
                    <span className="font-mono font-bold text-amber-300">{stats.backlogCount}</span>
                  </div>
                  <div className="bg-slate-850 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-emerald-400 block">Aktivitas</span>
                    <span className="font-mono font-bold text-emerald-300">{stats.activityCount}</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Shortcuts connected directly to this unit */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-6 gap-1.5 text-[11px]">
                <button
                  onClick={() => (isRigid ? onOpenRigidForUnit(unit.codeUnit, 'DAILY_INSPECTION') : onOpenArticForUnit(unit.codeUnit, 'DAILY_INSPECTION'))}
                  className="py-1.5 px-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg font-bold flex items-center justify-center space-x-1 transition col-span-2 sm:col-span-1"
                  title={`Mulai Daily Inspection ${isRigid ? 'Rigid' : 'Artic'} (QA 7) untuk unit ini`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>+ Daily {isRigid ? 'Rigid' : 'Artic'}</span>
                </button>

                <button
                  onClick={() => (isRigid ? onOpenRigidForUnit(unit.codeUnit, 'QA1_PRE') : onOpenArticForUnit(unit.codeUnit, 'QA1_PRE'))}
                  className="py-1.5 px-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg font-semibold flex items-center justify-center space-x-1 transition"
                  title="Mulai QA 1 Pre Inspection untuk unit ini"
                >
                  <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ QA 1 Pre</span>
                </button>

                <button
                  onClick={() => (isRigid ? onOpenRigidForUnit(unit.codeUnit, 'QA7_FINAL') : onOpenArticForUnit(unit.codeUnit, 'QA7_FINAL'))}
                  className="py-1.5 px-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg font-semibold flex items-center justify-center space-x-1 transition"
                  title="Mulai QA 7 Final Inspection untuk unit ini"
                >
                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ QA 7 Final</span>
                </button>

                <button
                  onClick={() => onOpenBacklogForUnit(unit.codeUnit)}
                  className="py-1.5 px-2 bg-amber-950/30 hover:bg-amber-950/50 text-amber-300 border border-amber-500/30 rounded-lg font-semibold flex items-center justify-center space-x-1 transition"
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Backlog</span>
                </button>

                <button
                  onClick={() => onOpenActivityForUnit(unit.codeUnit)}
                  className="py-1.5 px-2 bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 rounded-lg font-semibold flex items-center justify-center space-x-1 transition"
                >
                  <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Aktivitas</span>
                </button>

                <button
                  onClick={() => onOpenBapForUnit(unit.codeUnit)}
                  className="py-1.5 px-2 bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 border border-rose-500/30 rounded-lg font-semibold flex items-center justify-center space-x-1 transition"
                >
                  <FileWarning className="w-3.5 h-3.5 text-rose-400" />
                  <span>+ BAP</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {previewPhoto && (
        <PhotoPreviewModal
          isOpen={true}
          onClose={() => setPreviewPhoto(null)}
          photoUrl={previewPhoto.urls[previewPhoto.index || 0]}
          photoUrls={previewPhoto.urls}
          initialIndex={previewPhoto.index || 0}
          title={previewPhoto.title}
          subtitle={previewPhoto.subtitle}
        />
      )}
    </div>
  );
};
