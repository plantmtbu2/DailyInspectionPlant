import React from 'react';
import { X, Download, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface PhotoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl?: string;
  title?: string;
  subtitle?: string;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  title = 'Dokumentasi Foto',
  subtitle,
}) => {
  if (!isOpen || !photoUrl) return null;

  const handleDownload = () => {
    try {
      const a = document.createElement('a');
      a.href = photoUrl;
      a.download = `${title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn('Download error', e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg border border-amber-500/30">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-400 leading-tight">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
              title="Download Foto"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div className="p-3 sm:p-5 flex-1 overflow-auto flex items-center justify-center bg-slate-950/80 min-h-[280px]">
          <img
            src={photoUrl}
            alt={title}
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-slate-800"
          />
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 text-center text-[11px] text-slate-400 flex items-center justify-between">
          <span>Ketuk di luar gambar atau tombol X untuk menutup</span>
          <span className="font-mono text-amber-400/90">MMS FleetCheck System</span>
        </div>
      </div>
    </div>
  );
};
