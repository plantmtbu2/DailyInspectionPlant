import React, { useState, useEffect } from 'react';
import { X, Download, Image as ImageIcon, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { downloadDataUrl } from '../utils/imageUtils';

interface PhotoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl?: string;
  photoUrls?: string[];
  initialIndex?: number;
  title?: string;
  subtitle?: string;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  photoUrls,
  initialIndex = 0,
  title = 'Dokumentasi Foto',
  subtitle,
}) => {
  const allPhotos: string[] = photoUrls && photoUrls.length > 0
    ? photoUrls
    : (photoUrl ? [photoUrl] : []);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(initialIndex, 0), Math.max(allPhotos.length - 1, 0)));
    }
  }, [isOpen, initialIndex, allPhotos.length]);

  if (!isOpen || allPhotos.length === 0) return null;

  const currentPhoto = allPhotos[currentIndex] || allPhotos[0];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % allPhotos.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const handleDownloadCurrent = () => {
    const filename = `${title.replace(/\s+/g, '_').toLowerCase()}_foto${currentIndex + 1}_${Date.now()}.jpg`;
    downloadDataUrl(currentPhoto, filename);
  };

  const handleDownloadAll = () => {
    allPhotos.forEach((photo, idx) => {
      const filename = `${title.replace(/\s+/g, '_').toLowerCase()}_foto${idx + 1}_${Date.now()}.jpg`;
      setTimeout(() => downloadDataUrl(photo, filename), idx * 250);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/92 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg border border-amber-500/30">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
                {allPhotos.length > 1 && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                    {currentIndex + 1} / {allPhotos.length}
                  </span>
                )}
              </div>
              {subtitle && <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {allPhotos.length > 1 ? (
              <button
                onClick={handleDownloadAll}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                title="Download Semua Foto"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Download Semua ({allPhotos.length})</span>
              </button>
            ) : (
              <button
                onClick={handleDownloadCurrent}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                title="Download Foto"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Image Viewport with Next/Prev navigation */}
        <div className="relative p-2 sm:p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950 min-h-[300px]">
          <img
            src={currentPhoto}
            alt={`${title} - #${currentIndex + 1}`}
            className="max-h-[68vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-slate-800 select-none"
          />

          {allPhotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full border border-slate-700 shadow-lg transition active:scale-95"
                title="Foto Sebelumnya"
              >
                <ChevronLeft className="w-6 h-6 text-amber-400" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full border border-slate-700 shadow-lg transition active:scale-95"
                title="Foto Selanjutnya"
              >
                <ChevronRight className="w-6 h-6 text-amber-400" />
              </button>
            </>
          )}
        </div>

        {/* Bottom Thumbnail Strip (if more than 1 photo) */}
        {allPhotos.length > 1 && (
          <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center space-x-2 overflow-x-auto shrink-0">
            {allPhotos.map((photo, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                  idx === currentIndex
                    ? 'border-amber-400 scale-105 shadow-md shadow-amber-500/20'
                    : 'border-slate-700 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={photo} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] text-white px-1 font-mono">
                  #{idx + 1}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 text-center text-[11px] text-slate-400 flex items-center justify-between">
          <span>Gunakan panah kiri/kanan atau klik thumbnail untuk beralih foto</span>
          <span className="font-mono text-amber-400/90">MMS FleetCheck System</span>
        </div>
      </div>
    </div>
  );
};
