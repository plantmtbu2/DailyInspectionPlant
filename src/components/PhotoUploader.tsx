import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Maximize2, Loader2, CheckCircle2 } from 'lucide-react';
import { compressImage, formatFileSize } from '../utils/imageUtils';

interface PhotoUploaderProps {
  photoUrl?: string;
  onChange: (photoUrl: string | undefined) => void;
  label?: string;
  description?: string;
  onPreviewFullscreen?: (url: string) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photoUrl,
  onChange,
  label = 'Dokumentasi Foto',
  description = 'Ambil foto langsung dengan kamera atau unggah dari galeri perangkat',
  onPreviewFullscreen,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      setIsProcessing(true);
      setProcessingError(null);
      const compressedDataUrl = await compressImage(file, 960, 960, 0.78);
      onChange(compressedDataUrl);
    } catch (err: any) {
      console.error('Image compression error:', err);
      setProcessingError(err.message || 'Gagal memproses file foto.');
    } finally {
      setIsProcessing(false);
      // Reset input value so same photo can be re-selected if desired
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    onChange(undefined);
    setProcessingError(null);
  };

  return (
    <div className="space-y-2 bg-slate-850/80 border border-slate-800 rounded-xl p-3">
      {/* Hidden file inputs */}
      {/* 1. Direct camera capture for mobile (rear camera) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      {/* 2. Gallery / File browser */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Label and Hint */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
          <Camera className="w-3.5 h-3.5 text-amber-400" />
          <span>{label}</span>
        </label>
        {photoUrl && (
          <span className="text-[10px] text-emerald-400 flex items-center space-x-1 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            <span>Tersedia ({formatFileSize(photoUrl)})</span>
          </span>
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

      {/* When Photo is Available */}
      {photoUrl && !isProcessing ? (
        <div className="relative group bg-slate-900 border border-slate-700/80 rounded-xl p-2 flex flex-col sm:flex-row items-center gap-3">
          {/* Thumbnail preview */}
          <div
            className="relative w-full sm:w-28 h-28 bg-slate-950 rounded-lg overflow-hidden shrink-0 border border-slate-800 cursor-pointer shadow"
            onClick={() => onPreviewFullscreen && onPreviewFullscreen(photoUrl)}
            title="Klik untuk melihat foto lebih besar"
          >
            <img
              src={photoUrl}
              alt="Foto Dokumentasi"
              className="w-full h-full object-cover transition group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
              <Maximize2 className="w-5 h-5 drop-shadow" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex-1 w-full space-y-2">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white block">Foto Dokumentasi Terlampir</span>
              <span className="text-[10px] text-slate-400">
                Ukuran terkompresi: {formatFileSize(photoUrl)} (ringan & cepat dimuat)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {onPreviewFullscreen && (
                <button
                  type="button"
                  onClick={() => onPreviewFullscreen(photoUrl)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-medium flex items-center space-x-1 transition"
                >
                  <Maximize2 className="w-3 h-3 text-amber-400" />
                  <span>Lihat Full</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition"
              >
                <Camera className="w-3 h-3" />
                <span>Foto Ulang</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-medium flex items-center space-x-1 transition"
              >
                <ImageIcon className="w-3 h-3" />
                <span>Ganti File</span>
              </button>

              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 rounded-lg text-[11px] font-medium flex items-center space-x-1 transition ml-auto"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      ) : !isProcessing ? (
        /* When No Photo: Big Clear Buttons */
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
            <span>Pilih dari Galeri</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};
