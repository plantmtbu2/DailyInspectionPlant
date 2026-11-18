import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Camera,
  Loader2,
  Link2,
} from 'lucide-react';
import {
  SavedWhatsAppGroup,
  getStoredWhatsAppGroups,
  saveWhatsAppGroups,
  getSelectedWhatsAppGroupId,
  setSelectedWhatsAppGroupId,
  normalizeWhatsAppGroupLink,
  shareToWhatsAppGroup,
  copyTextToClipboard,
} from '../utils/whatsappFormatter';
import { logCurrentUserActivity } from '../services/userActivityLogService';

interface WhatsAppGroupShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  messageText: string;
  photoUrls?: string[];
  onGeneratePdf?: () => Promise<{ blob: Blob; fileName: string } | null>;
}

export const WhatsAppGroupShareModal: React.FC<WhatsAppGroupShareModalProps> = ({
  isOpen,
  onClose,
  title,
  messageText,
  photoUrls = [],
  onGeneratePdf,
}) => {
  const [groups, setGroups] = useState<SavedWhatsAppGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupLink, setNewGroupLink] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredWhatsAppGroups();
      setGroups(stored);
      const savedSelected = getSelectedWhatsAppGroupId();
      if (savedSelected && stored.some(g => g.id === savedSelected)) {
        setSelectedGroupId(savedSelected);
      } else {
        setSelectedGroupId(stored[0]?.id || '');
      }
      setShowAddForm(stored.length === 0);
      setFormError(null);
      setStatusFeedback(null);
      setCopiedText(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validPhotos = (photoUrls || []).filter(Boolean);

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newGroupName.trim();
    const cleanLink = normalizeWhatsAppGroupLink(newGroupLink);

    if (!cleanName) {
      setFormError('Masukkan nama Group WhatsApp.');
      return;
    }
    if (!cleanLink || !cleanLink.includes('chat.whatsapp.com/')) {
      setFormError('Masukkan Link Invite Group WhatsApp yang valid (contoh: https://chat.whatsapp.com/...).');
      return;
    }

    const newItem: SavedWhatsAppGroup = {
      id: `wag-${Date.now()}`,
      name: cleanName,
      inviteLink: cleanLink,
    };
    const updated = [...groups, newItem];
    setGroups(updated);
    saveWhatsAppGroups(updated);
    setSelectedGroupId(newItem.id);
    setSelectedWhatsAppGroupId(newItem.id);
    setNewGroupName('');
    setNewGroupLink('');
    setFormError(null);
    setShowAddForm(false);
    setStatusFeedback(`Group "${cleanName}" berhasil disimpan!`);
  };

  const handleDeleteGroup = (id: string) => {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated);
    saveWhatsAppGroups(updated);
    if (selectedGroupId === id) {
      const nextId = updated[0]?.id || '';
      setSelectedGroupId(nextId);
      setSelectedWhatsAppGroupId(nextId);
    }
  };

  const handleCopyOnly = async () => {
    const ok = await copyTextToClipboard(messageText);
    if (ok) {
      setCopiedText(true);
      setStatusFeedback('Teks laporan berhasil disalin ke clipboard!');
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  const handleSendToPicker = async (includePdf: boolean) => {
    try {
      setIsBusy(true);
      let pdfBlob: Blob | undefined;
      let pdfFileName: string | undefined;

      if (includePdf && onGeneratePdf) {
        const res = await onGeneratePdf();
        if (res) {
          pdfBlob = res.blob;
          pdfFileName = res.fileName;
        }
      }

      await shareToWhatsAppGroup(messageText, {
        photoUrls: includePdf ? [] : validPhotos,
        pdfBlob,
        pdfFileName,
        title,
        onToast: msg => setStatusFeedback(msg),
      });
      logCurrentUserActivity({
        actionType: 'EXPORT_WA',
        module: 'WhatsApp',
        description: `Share laporan "${title}" ke WhatsApp (${includePdf ? 'dengan PDF' : 'teks/foto'})`,
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendToSavedGroup = async (group: SavedWhatsAppGroup, includePdf: boolean) => {
    try {
      setIsBusy(true);
      setSelectedGroupId(group.id);
      setSelectedWhatsAppGroupId(group.id);

      let pdfBlob: Blob | undefined;
      let pdfFileName: string | undefined;

      if (includePdf && onGeneratePdf) {
        const res = await onGeneratePdf();
        if (res) {
          pdfBlob = res.blob;
          pdfFileName = res.fileName;
        }
      }

      await shareToWhatsAppGroup(messageText, {
        groupInviteLink: group.inviteLink,
        groupName: group.name,
        photoUrls: includePdf ? [] : validPhotos,
        pdfBlob,
        pdfFileName,
        title,
        onToast: msg => setStatusFeedback(msg),
      });
      logCurrentUserActivity({
        actionType: 'EXPORT_WA',
        module: 'WhatsApp',
        description: `Kirim laporan "${title}" ke Group WA "${group.name}"`,
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#18181b] border border-[rgba(242,239,235,0.18)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[rgba(242,239,235,0.1)] flex items-center justify-between bg-[#111113]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-syne font-extrabold uppercase text-[#f2efeb]">
                Share ke Group WhatsApp
              </h3>
              <p className="text-[11px] font-mono text-[rgba(242,239,235,0.55)] truncate max-w-[260px] sm:max-w-xs">
                {title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(242,239,235,0.6)] hover:text-white hover:bg-[rgba(242,239,235,0.1)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-[#f2efeb]">
          {/* Attachment & Text Info Banner */}
          <div className="bg-[#111113] border border-[rgba(242,239,235,0.1)] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-[11px]">
              {validPhotos.length > 0 ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-bold">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{validPhotos.length} Foto Siap Dilampirkan</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  <span>Teks Laporan Lengkap</span>
                </span>
              )}
              {onGeneratePdf && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono font-bold">
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Siap</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyOnly}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1 text-[11px] font-semibold transition"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Salin Teks</span>
                </>
              )}
            </button>
          </div>

          {statusFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold leading-relaxed">
              {statusFeedback}
            </div>
          )}

          {/* Opsi 1: Langsung Buka Pemilih Group WhatsApp */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300 uppercase tracking-wide text-[11px]">
                1. Kirim Langsung &amp; Pilih Group di WhatsApp
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Membuka WhatsApp langsung ke daftar Group/Chat dengan teks laporan sudah terisi otomatis
              {validPhotos.length > 0 ? ' beserta lampiran foto' : ''}.
            </p>
            <div className={`grid gap-2 ${onGeneratePdf ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleSendToPicker(false)}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>
                  {validPhotos.length > 0
                    ? `Kirim ke Group WA (+ ${validPhotos.length} Foto)`
                    : 'Buka & Pilih Group WhatsApp'}
                </span>
              </button>

              {onGeneratePdf && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleSendToPicker(true)}
                  className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl font-black flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  <span>Kirim File PDF ke Group WA</span>
                </button>
              )}
            </div>
          </div>

          {/* Opsi 2: Daftar Group WhatsApp Tersimpan (Link Group Langsung) */}
          <div className="bg-[#111113] border border-[rgba(242,239,235,0.1)] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Link2 className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white uppercase tracking-wide text-[11px]">
                  2. Group WhatsApp Tersimpan (Link Grup)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setFormError(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center space-x-1 transition"
              >
                <Plus className="w-3 h-3" />
                <span>{showAddForm ? 'Tutup Form' : '+ Tambah Group'}</span>
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddGroup} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                {formError && (
                  <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-semibold">
                    {formError}
                  </div>
                )}
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">
                    Nama Group WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="Contoh: Plant 2 MTBU - Daily & Backlog"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-emerald-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">
                    Link Invite Group WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={newGroupLink}
                    onChange={e => setNewGroupLink(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-emerald-400 outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Salin dari WhatsApp: Buka Group &gt; Info Grup &gt; Undang via Tautan.
                  </span>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition"
                >
                  Simpan Link Group WhatsApp
                </button>
              </form>
            )}

            {groups.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {groups.map(group => (
                  <div
                    key={group.id}
                    className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                      selectedGroupId === group.id
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-slate-900/70 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white truncate">{group.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {group.inviteLink}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSendToSavedGroup(group, false)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center space-x-1 transition disabled:opacity-50"
                        title="Salin teks, unduh foto, & langsung buka Group WA ini"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Kirim</span>
                      </button>

                      {onGeneratePdf && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleSendToSavedGroup(group, true)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center space-x-1 transition disabled:opacity-50"
                          title="Salin teks, unduh PDF, & langsung buka Group WA ini"
                        >
                          <FileText className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Hapus group tersimpan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !showAddForm && (
                <p className="text-[11px] text-slate-500 italic">
                  Belum ada link Group WhatsApp tersimpan. Klik "+ Tambah Group" untuk menyimpan link grup agar kirim lebih cepat.
                </p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
