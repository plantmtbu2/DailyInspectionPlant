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
  Eye,
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
  onViewUnit?: (unit: CodeUnit) => void;
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
  onViewUnit,
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
      {/* Industrial Toolbar */}
      <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] text-[rgba(242,239,235,0.5)] uppercase tracking-wider">
            Category:
          </span>
          <span className="font-syne font-extrabold text-base sm:text-lg text-[#f2efeb] tracking-tight ml-2 uppercase">
            DATA MASTER CODE UNIT
          </span>
          <p className="text-xs text-[rgba(242,239,235,0.5)] font-mono mt-0.5">
            Master unit tambang yang terhubung otomatis ke BAP, Daily Check, Backlog & Aktivitas
          </p>
        </div>

        <button
          onClick={onOpenManageUnits}
          className="bg-[#facc15] hover:bg-[#fde047] text-[#111113] border-none px-4 py-2.5 rounded font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition active:scale-95 shadow-md shadow-[#facc15]/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Master Unit</span>
        </button>
      </div>

      {/* Fleet KPI Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <button
          onClick={() => setFilterType('READY')}
          className={`p-3 rounded border text-left transition ${
            filterType === 'READY'
              ? 'bg-[#4ade80]/15 border-[#4ade80] text-[#4ade80]'
              : 'bg-[#18181b] hover:bg-[#4ade80]/10 border-[rgba(242,239,235,0.1)] text-[#f2efeb]'
          }`}
        >
          <span className="text-[10px] text-[#4ade80] font-bold block uppercase tracking-wider">Ready Operasi</span>
          <span className="text-xl font-black font-syne text-[#4ade80]">{readyCount} Unit</span>
        </button>

        <button
          onClick={() => setFilterType('BREAKDOWN')}
          className={`p-3 rounded border text-left transition ${
            filterType === 'BREAKDOWN'
              ? 'bg-[#fb7185]/15 border-[#fb7185] text-[#fb7185]'
              : 'bg-[#18181b] hover:bg-[#fb7185]/10 border-[rgba(242,239,235,0.1)] text-[#f2efeb]'
          }`}
        >
          <span className="text-[10px] text-[#fb7185] font-bold block uppercase tracking-wider">Breakdown (BD)</span>
          <span className="text-xl font-black font-syne text-[#fb7185]">{breakdownCount} Unit</span>
        </button>

        <button
          onClick={() => setFilterType('MAINTENANCE')}
          className={`p-3 rounded border text-left transition ${
            filterType === 'MAINTENANCE'
              ? 'bg-[#facc15]/15 border-[#facc15] text-[#facc15]'
              : 'bg-[#18181b] hover:bg-[#facc15]/10 border-[rgba(242,239,235,0.1)] text-[#f2efeb]'
          }`}
        >
          <span className="text-[10px] text-[#facc15] font-bold block uppercase tracking-wider">Maintenance (PS)</span>
          <span className="text-xl font-black font-syne text-[#facc15]">{maintenanceCount} Unit</span>
        </button>

        <button
          onClick={() => setFilterType('ALL')}
          className={`p-3 rounded border text-left transition ${
            filterType === 'ALL'
              ? 'bg-[rgba(250,204,21,0.1)] border-[#facc15] text-[#facc15]'
              : 'bg-[#18181b] hover:bg-[rgba(242,239,235,0.05)] border-[rgba(242,239,235,0.1)] text-[#f2efeb]'
          }`}
        >
          <span className="text-[10px] text-[rgba(242,239,235,0.5)] font-bold block uppercase tracking-wider">Total Armada</span>
          <span className="text-xl font-black font-syne text-[#f2efeb]">{units.length} Unit</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-[rgba(242,239,235,0.4)] absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="FILTER CODE UNIT: Code Unit, EGI, Brand, Lokasi PIT..."
          className="w-full bg-[#18181b] border border-[rgba(242,239,235,0.15)] hover:border-[rgba(242,239,235,0.25)] rounded pl-9 pr-3 py-2 text-xs font-mono text-[#f2efeb] placeholder-[rgba(242,239,235,0.4)] focus:border-[#facc15] outline-none transition"
        />
      </div>

      {/* Code Unit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filtered.map((unit, unitIdx) => {
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
              key={`${unit.id}-${unitIdx}`}
              className="bg-[#18181b] border border-[rgba(242,239,235,0.1)] hover:border-[rgba(242,239,235,0.25)] rounded p-4 sm:p-5 space-y-3.5 transition shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h2 className="font-syne font-extrabold text-2xl tracking-tight text-[#f2efeb]">
                        {unit.codeUnit}
                      </h2>
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          unit.statusUnit === 'READY'
                            ? 'border-[#4ade80] text-[#4ade80] bg-[#4ade80]/10'
                            : unit.statusUnit === 'BREAKDOWN'
                            ? 'border-[#fb7185] text-[#fb7185] bg-[#fb7185]/10'
                            : unit.statusUnit === 'MAINTENANCE'
                            ? 'border-[#facc15] text-[#facc15] bg-[#facc15]/10'
                            : 'border-[rgba(242,239,235,0.2)] text-[rgba(242,239,235,0.6)] bg-[#111113]'
                        }`}
                      >
                        {unit.statusUnit}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[rgba(242,239,235,0.7)] mt-0.5">
                      {unit.brand} • {unit.egi}
                    </p>
                    <span className="text-[11px] text-[rgba(242,239,235,0.5)] font-mono">
                      Tipe: {unit.tipeAlat} | ID: {unit.id}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {onViewUnit && (
                      <button
                        onClick={() => onViewUnit(unit)}
                        title="Lihat Detail Armada"
                        className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-sky-500/20 border border-[rgba(242,239,235,0.1)] hover:border-sky-500/40 text-sky-400 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onEditUnit(unit)}
                      title="Edit data unit ini"
                      className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-amber-500/20 border border-[rgba(242,239,235,0.1)] hover:border-amber-500/40 text-amber-300 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteUnit(unit.id, `${unit.codeUnit} (${unit.egi})`)}
                      title="Hapus unit ini"
                      className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(242,239,235,0.06)] hover:bg-rose-500/20 border border-[rgba(242,239,235,0.1)] hover:border-rose-500/40 text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* HM & Location */}
                <div className="flex items-center justify-between text-xs text-[rgba(242,239,235,0.7)] font-mono pt-2.5 border-t border-[rgba(242,239,235,0.1)]">
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#fb7185] shrink-0" />
                    <span>PIT: <strong className="text-[#f2efeb]">{unit.lokasiPit}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Gauge className="w-3.5 h-3.5 text-[#facc15] shrink-0" />
                    <span className="font-bold text-[#facc15]">{unit.currentHm.toLocaleString()} HM</span>
                  </div>
                </div>

                {/* Foto Unit */}
                {(() => {
                  const photos = unit.photoUrls && unit.photoUrls.length > 0 ? unit.photoUrls : (unit.photoUrl ? [unit.photoUrl] : []);
                  if (photos.length === 0) return null;

                  return (
                    <div className="bg-[#111113] p-2.5 rounded border border-[rgba(242,239,235,0.1)] mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono text-[rgba(242,239,235,0.7)]">
                        <span className="font-semibold flex items-center space-x-1 text-[11px] uppercase">
                          <Camera className="w-3.5 h-3.5 text-[#facc15]" />
                          <span>Foto Armada ({photos.length} Foto)</span>
                        </span>
                        <span className="text-[10px] text-[rgba(242,239,235,0.4)]">Klik untuk melihat galeri</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {photos.map((pUrl, pIdx) => (
                          <button
                            key={`${unit.id}-photo-${pIdx}`}
                            type="button"
                            onClick={() =>
                              setPreviewPhoto({
                                urls: photos,
                                index: pIdx,
                                title: `Unit ${unit.codeUnit} - ${unit.brand} ${unit.egi}`,
                                subtitle: `Foto ${pIdx + 1} dari ${photos.length} | Lokasi PIT: ${unit.lokasiPit} | Status: ${unit.statusUnit} | ${unit.currentHm.toLocaleString()} HM`,
                              })
                            }
                            className="relative group w-16 h-14 rounded overflow-hidden border border-[rgba(242,239,235,0.15)] hover:border-[#facc15] transition"
                            title="Klik untuk melihat foto unit"
                          >
                            <img
                              src={pUrl}
                              alt={`Unit ${unit.codeUnit} #${pIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                            />
                            <span className="absolute bottom-0 right-0 bg-[#111113]/90 text-[#facc15] font-mono text-[9px] font-bold px-1 rounded-tl">
                              #{pIdx + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Connected Stats Row */}
                <div className="grid grid-cols-4 gap-1.5 pt-2.5 text-center text-xs font-mono">
                  <div className="bg-[#111113] p-1.5 rounded border border-[rgba(242,239,235,0.1)]">
                    <span className="text-[9px] text-[rgba(242,239,235,0.5)] uppercase block">Inspeksi</span>
                    <span className="font-bold text-[#f2efeb]">{stats.inspectionCount}</span>
                  </div>
                  <div className="bg-[#111113] p-1.5 rounded border border-[rgba(242,239,235,0.1)]">
                    <span className="text-[9px] text-[#fb7185] uppercase block">BAP</span>
                    <span className="font-bold text-[#fb7185]">{stats.bapCount}</span>
                  </div>
                  <div className="bg-[#111113] p-1.5 rounded border border-[rgba(242,239,235,0.1)]">
                    <span className="text-[9px] text-[#facc15] uppercase block">Backlog</span>
                    <span className="font-bold text-[#facc15]">{stats.backlogCount}</span>
                  </div>
                  <div className="bg-[#111113] p-1.5 rounded border border-[rgba(242,239,235,0.1)]">
                    <span className="text-[9px] text-[#4ade80] uppercase block">Aktivitas</span>
                    <span className="font-bold text-[#4ade80]">{stats.activityCount}</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Shortcuts connected directly to this unit */}
              <div className="pt-2.5 border-t border-[rgba(242,239,235,0.1)] grid grid-cols-2 sm:grid-cols-6 gap-1.5 text-[10px] font-mono">
                <button
                  onClick={() => (isRigid ? onOpenRigidForUnit(unit.codeUnit, 'DAILY_INSPECTION') : onOpenArticForUnit(unit.codeUnit, 'DAILY_INSPECTION'))}
                  className="py-1.5 px-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded font-bold flex items-center justify-center space-x-1 transition col-span-2 sm:col-span-1"
                  title={`Mulai Daily Inspection ${isRigid ? 'Rigid' : 'Artic'} untuk unit ini`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>+ Daily</span>
                </button>

                <button
                  onClick={() => (isRigid ? onOpenRigidForUnit(unit.codeUnit, 'QA1_PRE') : onOpenArticForUnit(unit.codeUnit, 'QA1_PRE'))}
                  className="py-1.5 px-2 bg-[rgba(250,204,21,0.1)] hover:bg-[rgba(250,204,21,0.2)] text-[#facc15] border border-[#facc15]/30 rounded font-bold flex items-center justify-center space-x-1 transition"
                  title="Mulai QA 1 Pre Inspection untuk unit ini"
                >
                  <FileCheck className="w-3.5 h-3.5 text-[#facc15]" />
                  <span>+ QA1 Pre</span>
                </button>

                <button
                  onClick={() => (isRigid ? onOpenRigidForUnit(unit.codeUnit, 'QA7_FINAL') : onOpenArticForUnit(unit.codeUnit, 'QA7_FINAL'))}
                  className="py-1.5 px-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-[#4ade80] border border-emerald-500/30 rounded font-bold flex items-center justify-center space-x-1 transition"
                  title="Mulai QA 7 Final Inspection untuk unit ini"
                >
                  <FileCheck className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>+ QA7 Fin</span>
                </button>

                <button
                  onClick={() => onOpenBacklogForUnit(unit.codeUnit)}
                  className="py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-[#facc15] border border-amber-500/30 rounded font-bold flex items-center justify-center space-x-1 transition"
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-[#facc15]" />
                  <span>+ Backlog</span>
                </button>

                <button
                  onClick={() => onOpenActivityForUnit(unit.codeUnit)}
                  className="py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#4ade80] border border-emerald-500/30 rounded font-bold flex items-center justify-center space-x-1 transition"
                >
                  <Wrench className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>+ Aktivitas</span>
                </button>

                <button
                  onClick={() => onOpenBapForUnit(unit.codeUnit)}
                  className="py-1.5 px-2 bg-[#fb7185]/10 hover:bg-[#fb7185]/20 text-[#fb7185] border border-[#fb7185]/30 rounded font-bold flex items-center justify-center space-x-1 transition"
                >
                  <FileWarning className="w-3.5 h-3.5 text-[#fb7185]" />
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
