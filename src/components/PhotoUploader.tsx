import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Maximize2, Loader2, CheckCircle2, Plus } from 'lucide-react';
import { compressMultipleImages, formatFileSize } from '../utils/imageUtils';

interface PhotoUploaderProps {
  photoUrl?: string;
  photoUrls?: string[];
  onChange?: (photoUrl: string | undefined) => void;
  onChangePhotos?: (photoUrls: string[]) => void;
  label?: string;
  description?: string;
  maxPhotos?: number;
  onPreviewFullscreen?: (url: string, index?: number, allUrls?: string[]) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photoUrl,
  photoUrls,
  onChange,
  onChangePhotos,
  label = 'Dokumentasi Foto',
  description = 'Ambil foto kamera HP langsung atau unggah dari galeri (bisa lebih dari 1 foto)',
  maxPhotos = 10,
  onPreviewFullscreen,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Normalize to array of photos
  const currentPhotos: string[] = photoUrls && photoUrls.length > 0
    ? photoUrls
    : (photoUrl ? [photoUrl] : []);

  const updatePhotos = (newPhotos: string[]) => {
    if (onChangePhotos) {
      onChangePhotos(newPhotos);
    }
    if (onChange) {
      onChange(newPhotos.length > 0 ? newPhotos[0] : undefined);
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setIsProcessing(true);
      setProcessingError(null);

      const compressedArray = await compressMultipleImages(files, 960, 960, 0.78);
      if (compressedArray.length === 0) {
        setProcessingError('Tidak ada file gambar valid yang dapat diproses.');
        return;
      }

      const combined = [...currentPhotos, ...compressedArray].slice(0, maxPhotos);
      updatePhotos(combined);
    } catch (err: any) {
      console.error('Image compression error:', err);
      setProcessingError(err.message || 'Gagal memproses file foto.');
    } finally {
      setIsProcessing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const updated = currentPhotos.filter((_, idx) => idx !== indexToRemove);
    updatePhotos(updated);
    setProcessingError(null);
  };

  const handleClearAllPhotos = () => {
    updatePhotos([]);
    setProcessingError(null);
  };

  return (
    <div className="space-y-2.5 bg-slate-850/80 border border-slate-800 rounded-xl p-3">
      {/* Hidden file inputs */}
      {/* 1. Direct camera capture for mobile (rear camera) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={e => handleFilesSelected(e.target.files)}
        className="hidden"
      />
      {/* 2. Gallery / File browser (supports multiple files) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={e => handleFilesSelected(e.target.files)}
        className="hidden"
      />

      {/* Label and Hint */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
          <Camera className="w-3.5 h-3.5 text-amber-400" />
          <span>{label}</span>
        </label>
        {currentPhotos.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-emerald-400 flex items-center space-x-1 font-mono font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>{currentPhotos.length} Foto Terlampir</span>
            </span>
            <button
              type="button"
              onClick={handleClearAllPhotos}
              className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline"
            >
              Hapus Semua
            </button>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-400">{description}</p>

      {/* Processing Loader */}
      {isProcessing && (
        <div className="p-3 bg-slate-900/90 border border-amber-500/30 rounded-xl flex items-center justify-center space-x-2 text-xs text-amber-300 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Mengompres & memproses foto optimal...</span>
        </div>
      )}

      {/* Processing Error Message */}
      {processingError && (
        <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] text-rose-300">
          {processingError}
        </div>
      )}

      {/* Photo Grid when Photos Exist */}
      {currentPhotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
          {currentPhotos.map((url, idx) => (
            <div
              key={idx}
              className="relative group bg-slate-900 border border-slate-750 rounded-xl overflow-hidden shadow-sm flex flex-col"
            >
              <div
                className="relative aspect-4/3 bg-slate-950 overflow-hidden cursor-pointer"
                onClick={() => onPreviewFullscreen && onPreviewFullscreen(url, idx, currentPhotos)}
                title="Klik untuk melihat fullscreen"
              >
                <img
                  src={url}
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                  <Maximize2 className="w-5 h-5 drop-shadow" />
                </div>
                {/* Badge Number */}
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-xs rounded text-[9px] font-mono text-amber-400 font-bold border border-white/10">
                  #{idx + 1}
                </div>
              </div>

              {/* Action bar under thumbnail */}
              <div className="p-1.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[9px] font-mono text-slate-400">
                  {formatFileSize(url)}
                </span>
                <div className="flex items-center space-x-1">
                  {onPreviewFullscreen && (
                    <button
                      type="button"
                      onClick={() => onPreviewFullscreen(url, idx, currentPhotos)}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition"
                      title="Lihat Penuh"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="p-1 hover:bg-rose-500/20 rounded text-slate-400 hover:text-rose-400 transition"
                    title="Hapus Foto Ini"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add More Slot if under limit */}
          {currentPhotos.length < maxPhotos && (
            <div className="aspect-4/3 border-2 border-dashed border-slate-700/80 hover:border-amber-500/50 rounded-xl flex flex-col items-center justify-center p-2 text-center transition bg-slate-900/40 hover:bg-slate-900/70">
              <span className="text-[10px] font-bold text-slate-300 mb-1.5 flex items-center space-x-1">
                <Plus className="w-3 h-3 text-amber-400" />
                <span>Tambah Foto</span>
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-[10px] font-semibold flex items-center space-x-1"
                  title="Foto Kamera Baru"
                >
                  <Camera className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="p-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold flex items-center space-x-1"
                  title="Pilih dari Galeri"
                >
                  <ImageIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* When No Photos Yet: Big Clear Buttons */}
      {currentPhotos.length === 0 && !isProcessing && (
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 active:scale-98 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>Kamera HP (Langsung)</span>
          </button>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 active:scale-98 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition"
          >
            <ImageIcon className="w-4 h-4 text-slate-400" />
            <span>Pilih Galeri (Bisa Banyak)</span>
          </button>
        </div>
      )}
    </div>
  );
};
