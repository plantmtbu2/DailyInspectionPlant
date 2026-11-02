import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  message,
  itemName,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 text-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-1">
                PENGHAPUSAN PERMANEN
              </div>
              <h3 className="font-bold text-base text-white">{title}</h3>
              <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div className="bg-slate-850/80 rounded-xl p-3.5 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>{message}</p>
          {itemName && (
            <div className="font-mono font-bold text-amber-400 bg-slate-900/90 p-2.5 rounded-lg border border-slate-750 truncate text-[11px]">
              {itemName}
            </div>
          )}
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-lg p-2.5 text-[11px] text-rose-300 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-rose-200">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Sifat Penghapusan: Permanen (Total Purge)
            </p>
            <p className="text-rose-300/80">
              Semua data yang dihapus bersifat permanen. Data ini akan dihapus dari database lokal dan disinkronkan ke Google Sheet tanpa dapat dipulihkan kembali.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Menghapus Permanen...' : 'Ya, Hapus Permanen'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
