import React, { useState } from 'react';
import { CodeUnit } from '../types';
import { X, Plus, Search, Truck, MapPin, Gauge, Edit3, Trash2, Check, CloudUpload, Camera } from 'lucide-react';
import { PhotoUploader } from './PhotoUploader';
import { PhotoPreviewModal } from './PhotoPreviewModal';

interface CodeUnitManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: CodeUnit[];
  onSaveUnit: (unit: CodeUnit) => void;
  onDeleteUnit: (id: string, codeUnitName: string) => void;
  onSyncToSheet: () => void;
}

export const CodeUnitManagerModal: React.FC<CodeUnitManagerModalProps> = ({
  isOpen,
  onClose,
  units,
  onSaveUnit,
  onDeleteUnit,
  onSyncToSheet,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUnit, setEditingUnit] = useState<Partial<CodeUnit> | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{
    urls: string[];
    index?: number;
    title: string;
    subtitle?: string;
  } | null>(null);

  if (!isOpen) return null;

  const filtered = units.filter(
    u =>
      u.codeUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.egi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.tipeAlat.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartNew = () => {
    setEditingUnit({
      id: `CU-${String(units.length + 1).padStart(2, '0')}`,
      codeUnit: '',
      egi: '',
      tipeAlat: 'Rigid Dump Truck',
      brand: 'Caterpillar',
      lokasiPit: 'PIT Barat',
      currentHm: 0,
      statusUnit: 'READY',
      photoUrl: undefined,
      photoUrls: [],
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit?.codeUnit || !editingUnit.egi) return;

    const finalPhotoUrls = editingUnit.photoUrls && editingUnit.photoUrls.length > 0
      ? editingUnit.photoUrls
      : (editingUnit.photoUrl ? [editingUnit.photoUrl] : undefined);

    const unitToSave: CodeUnit = {
      id: editingUnit.id || `CU-${Date.now().toString().slice(-4)}`,
      codeUnit: editingUnit.codeUnit.toUpperCase(),
      egi: editingUnit.egi,
      tipeAlat: editingUnit.tipeAlat || 'Rigid Dump Truck',
      brand: editingUnit.brand || 'Caterpillar',
      lokasiPit: editingUnit.lokasiPit || 'PIT Barat',
      currentHm: Number(editingUnit.currentHm) || 0,
      statusUnit: editingUnit.statusUnit || 'READY',
      photoUrl: finalPhotoUrls?.[0],
      photoUrls: finalPhotoUrls,
      lastInspectionDate: editingUnit.lastInspectionDate,
    };

    onSaveUnit(unitToSave);
    setEditingUnit(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Master Data Code Unit</h2>
              <p className="text-xs text-slate-400">Data utama armada tambang yang digunakan di semua form</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onSyncToSheet}
              title="Sinkronkan Master ke Google Sheet"
              className="p-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-1"
            >
              <CloudUpload className="w-4 h-4" />
              <span className="hidden sm:inline">Sync Sheet</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {editingUnit ? (
            /* Edit / Create Form */
            <form onSubmit={handleSaveForm} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {editingUnit.id ? 'Edit Unit Alat Berat' : 'Tambah Unit Baru'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Code Unit *</label>
                  <input
                    type="text"
                    required
                    value={editingUnit.codeUnit || ''}
                    onChange={e => setEditingUnit({ ...editingUnit, codeUnit: e.target.value })}
                    placeholder="Contoh: RD-777D-03"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-amber-400 outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">EGI (Equipment General Identifier) *</label>
                  <input
                    type="text"
                    required
                    value={editingUnit.egi || ''}
                    onChange={e => setEditingUnit({ ...editingUnit, egi: e.target.value })}
                    placeholder="Contoh: CAT 777D"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipe Alat</label>
                  <select
                    value={editingUnit.tipeAlat || 'Rigid Dump Truck'}
                    onChange={e => setEditingUnit({ ...editingUnit, tipeAlat: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  >
                    <option value="Rigid Dump Truck">Rigid Dump Truck</option>
                    <option value="Articulated Dump Truck">Articulated Dump Truck</option>
                    <option value="Motor Grader">Motor Grader</option>
                    <option value="Bulldozer">Bulldozer</option>
                    <option value="Excavator">Excavator</option>
                    <option value="Wheel Loader">Wheel Loader</option>
                    <option value="Support Truck">Support Truck / Water Truck</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Brand / Merk</label>
                  <input
                    type="text"
                    value={editingUnit.brand || ''}
                    onChange={e => setEditingUnit({ ...editingUnit, brand: e.target.value })}
                    placeholder="Caterpillar / Komatsu / Volvo / Scania"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Lokasi PIT</label>
                  <input
                    type="text"
                    value={editingUnit.lokasiPit || ''}
                    onChange={e => setEditingUnit({ ...editingUnit, lokasiPit: e.target.value })}
                    placeholder="Contoh: PIT Barat Bench 10"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Current Hour Meter (HM)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingUnit.currentHm ?? 0}
                    onChange={e => setEditingUnit({ ...editingUnit, currentHm: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-amber-400 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Status Unit</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['READY', 'BREAKDOWN', 'MAINTENANCE', 'STANDBY'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditingUnit({ ...editingUnit, statusUnit: st })}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${
                          editingUnit.statusUnit === st
                            ? st === 'READY'
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                              : st === 'BREAKDOWN'
                              ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                              : st === 'MAINTENANCE'
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                              : 'bg-slate-700 border-slate-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <PhotoUploader
                    photoUrl={editingUnit.photoUrl}
                    photoUrls={editingUnit.photoUrls || (editingUnit.photoUrl ? [editingUnit.photoUrl] : [])}
                    onChange={url => setEditingUnit({ ...editingUnit, photoUrl: url, photoUrls: url ? [url] : [] })}
                    onChangePhotos={urls =>
                      setEditingUnit({
                        ...editingUnit,
                        photoUrls: urls,
                        photoUrl: urls[0],
                      })
                    }
                    label="Foto Unit Alat Berat"
                    description="Ambil foto fisik unit / plat nomor dari kamera perangkat atau pilih dari galeri (bisa lebih dari 1 foto)"
                    onPreviewFullscreen={(url, idx, allUrls) =>
                      setPreviewPhoto({
                        urls: allUrls || [url],
                        index: idx ?? 0,
                        title: editingUnit.codeUnit || 'Unit Alat Berat',
                        subtitle: editingUnit.egi,
                      })
                    }
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Data Unit</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Search & Add Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Cari Code Unit, EGI, Brand, Lokasi..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  onClick={handleStartNew}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shrink-0 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Unit Baru</span>
                </button>
              </div>

              {/* Units List Cards */}
              <div className="space-y-2.5">
                {filtered.map(unit => (
                  <div
                    key={unit.id}
                    className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 rounded-xl p-3 text-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-start space-x-3">
                      {unit.photoUrls && unit.photoUrls.length > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewPhoto({
                              urls: unit.photoUrls!,
                              index: 0,
                              title: unit.codeUnit,
                              subtitle: `${unit.egi} (${unit.photoUrls!.length} Foto)`,
                            })
                          }
                          className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-700 shrink-0 group hover:ring-2 hover:ring-amber-400 transition"
                          title="Klik untuk melihat galeri foto unit"
                        >
                          <img
                            src={unit.photoUrls[0]}
                            alt={unit.codeUnit}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                          />
                          {unit.photoUrls.length > 1 && (
                            <span className="absolute bottom-0 right-0 bg-slate-900/90 text-amber-400 text-[9px] font-bold px-1 rounded-tl">
                              +{unit.photoUrls.length}
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Camera className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      ) : unit.photoUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewPhoto({
                              urls: [unit.photoUrl!],
                              index: 0,
                              title: unit.codeUnit,
                              subtitle: unit.egi,
                            })
                          }
                          className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-700 shrink-0 group hover:ring-2 hover:ring-amber-400 transition"
                          title="Klik untuk melihat foto"
                        >
                          <img
                            src={unit.photoUrl}
                            alt={unit.codeUnit}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Camera className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-500 shrink-0">
                          <Truck className="w-5 h-5 opacity-40" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-white font-mono">{unit.codeUnit}</span>
                          <span className="text-[10px] text-slate-400">• {unit.brand}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              unit.statusUnit === 'READY'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : unit.statusUnit === 'BREAKDOWN'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : unit.statusUnit === 'MAINTENANCE'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-slate-700/50 text-slate-400 border-slate-700'
                            }`}
                          >
                            {unit.statusUnit}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs">{unit.egi} ({unit.tipeAlat})</p>
                        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{unit.lokasiPit}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Gauge className="w-3 h-3 text-amber-500/70" />
                            <span className="text-slate-300 font-mono">{unit.currentHm.toLocaleString()} HM</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* EDIT & HAPUS Buttons */}
                    <div className="flex items-center justify-end space-x-1.5 shrink-0">
                      <button
                        onClick={() =>
                          setEditingUnit({
                            ...unit,
                            photoUrls:
                              unit.photoUrls && unit.photoUrls.length > 0
                                ? [...unit.photoUrls]
                                : unit.photoUrl
                                ? [unit.photoUrl]
                                : [],
                          })
                        }
                        className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 rounded-lg flex items-center space-x-1 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => onDeleteUnit(unit.id, `${unit.codeUnit} (${unit.egi})`)}
                        className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg flex items-center space-x-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center py-8 text-xs text-slate-500">
                    Tidak ada unit yang cocok dengan pencarian "{searchTerm}".
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span>Total: {units.length} Unit Terdaftar</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
          >
            Tutup
          </button>
        </div>
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
