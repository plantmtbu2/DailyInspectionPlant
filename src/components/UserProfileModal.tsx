import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  User,
  LogOut,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowRightLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, isAdmin, logout, switchProfile, changeAdminPassword } = useAuth();

  const [mode, setMode] = useState<'view' | 'switch-admin' | 'change-password'>('view');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  if (!isOpen || !currentUser) return null;

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleSwitchToAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const res = switchProfile('admin', adminPasswordInput);
    if (res.success) {
      setStatusMsg({ type: 'success', text: 'Berhasil beralih ke profil Administrator!' });
      setTimeout(() => {
        setMode('view');
        setAdminPasswordInput('');
        onClose();
      }, 700);
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Password salah.' });
    }
  };

  const handleSwitchToUser = () => {
    switchProfile('user', undefined, 'User Operasional');
    setStatusMsg({ type: 'success', text: 'Beralih ke profil User Operasional.' });
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }
    const res = changeAdminPassword(oldPassword, newPassword);
    if (res.success) {
      setStatusMsg({ type: 'success', text: 'Password Admin berhasil diperbarui!' });
      setTimeout(() => {
        setMode('view');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1000);
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Gagal mengubah password.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#18181b] border border-[rgba(242,239,235,0.15)] rounded-lg shadow-2xl overflow-hidden text-[#f2efeb]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[rgba(242,239,235,0.1)] flex items-center justify-between bg-[#111113]">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded ${isAdmin ? 'bg-[#facc15]/15 text-[#facc15]' : 'bg-[#38bdf8]/15 text-[#38bdf8]'}`}>
              {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-syne font-bold text-sm tracking-tight uppercase">
                PROFIL PENGGUNA
              </h3>
              <p className="text-[10px] font-mono text-[rgba(242,239,235,0.5)] uppercase">
                {isAdmin ? 'ADMINISTRATOR PLANT 2' : 'USER OPERASIONAL'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[rgba(242,239,235,0.5)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.08)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded text-xs font-mono flex items-start space-x-2 ${
                statusMsg.type === 'success'
                  ? 'bg-[#4ade80]/15 border border-[#4ade80]/30 text-[#4ade80]'
                  : 'bg-[#fb7185]/15 border border-[#fb7185]/30 text-[#fb7185]'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* VIEW MODE */}
          {mode === 'view' && (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-4 rounded bg-[#111113] border border-[rgba(242,239,235,0.08)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[rgba(242,239,235,0.5)] uppercase">STATUS SESI:</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                      isAdmin
                        ? 'bg-[#facc15]/10 text-[#facc15] border-[#facc15]/30'
                        : 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/30'
                    }`}
                  >
                    {isAdmin ? 'AKSES PENUH (ADMIN)' : 'AKSES TERBATAS (USER)'}
                  </span>
                </div>

                <div>
                  <div className="text-base font-syne font-bold text-[#f2efeb]">
                    {currentUser.displayName}
                  </div>
                  <div className="text-[11px] font-mono text-[rgba(242,239,235,0.5)]">
                    Username: @{currentUser.username}
                  </div>
                </div>

                <div className="pt-2 border-t border-[rgba(242,239,235,0.08)] text-[10px] font-mono text-[rgba(242,239,235,0.5)] flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[rgba(242,239,235,0.4)]" />
                    <span>Masuk:</span>
                  </span>
                  <span>{new Date(currentUser.loginTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                </div>
              </div>

              {/* Hak Akses Details */}
              <div className="p-3 rounded bg-[rgba(242,239,235,0.04)] border border-[rgba(242,239,235,0.08)] text-xs font-mono space-y-2">
                <div className="text-[11px] font-bold text-[rgba(242,239,235,0.7)] uppercase">
                  Daftar Izin & Hak Akses:
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-[#4ade80]">
                    <span>• Inspeksi Daily Rigid & Artic (QA 1 & QA 7)</span>
                    <span className="text-[9px] font-bold">AKTIF</span>
                  </div>
                  <div className="flex items-center justify-between text-[#4ade80]">
                    <span>• Input Backlog, Aktivitas & BAP</span>
                    <span className="text-[9px] font-bold">AKTIF</span>
                  </div>
                  <div className="flex items-center justify-between text-[#4ade80]">
                    <span>• Dashboard Pencapaian & Export WhatsApp/Print</span>
                    <span className="text-[9px] font-bold">AKTIF</span>
                  </div>
                  <div className={`flex items-center justify-between ${isAdmin ? 'text-[#4ade80]' : 'text-[rgba(242,239,235,0.35)]'}`}>
                    <span>• Tarik & Kirim Data Google Sheet</span>
                    <span className="text-[9px] font-bold">{isAdmin ? 'AKTIF' : 'TERKUNCI'}</span>
                  </div>
                  <div className={`flex items-center justify-between ${isAdmin ? 'text-[#4ade80]' : 'text-[rgba(242,239,235,0.35)]'}`}>
                    <span>• Status & Konfigurasi Sheet 24/7</span>
                    <span className="text-[9px] font-bold">{isAdmin ? 'AKTIF' : 'TERKUNCI'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 space-y-2">
                {!isAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusMsg(null);
                      setMode('switch-admin');
                    }}
                    className="w-full py-2 px-3 rounded bg-[#facc15]/15 hover:bg-[#facc15]/25 text-[#facc15] border border-[#facc15]/30 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Beralih ke Profil Admin</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleSwitchToUser}
                      className="py-2 px-2.5 rounded bg-[rgba(242,239,235,0.06)] hover:bg-[rgba(242,239,235,0.12)] text-[rgba(242,239,235,0.8)] border border-[rgba(242,239,235,0.15)] text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Tes Mode User</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusMsg(null);
                        setMode('change-password');
                      }}
                      className="py-2 px-2.5 rounded bg-[rgba(242,239,235,0.06)] hover:bg-[rgba(242,239,235,0.12)] text-[rgba(242,239,235,0.8)] border border-[rgba(242,239,235,0.15)] text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Ganti Password</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2 px-3 rounded bg-[#fb7185]/15 hover:bg-[#fb7185]/25 text-[#fb7185] border border-[#fb7185]/30 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out (Keluar)</span>
                </button>
              </div>
            </div>
          )}

          {/* SWITCH TO ADMIN MODE */}
          {mode === 'switch-admin' && (
            <form onSubmit={handleSwitchToAdmin} className="space-y-4">
              <div className="p-3 rounded bg-[rgba(250,204,21,0.08)] border border-[#facc15]/30 text-xs font-mono space-y-1">
                <span className="font-bold text-[#facc15] uppercase">Otorisasi Administrator</span>
                <p className="text-[11px] text-[rgba(242,239,235,0.7)]">
                  Masukkan password admin untuk membuka seluruh hak akses termasuk sinkronisasi Sheet 24/7.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase text-[rgba(242,239,235,0.7)]">
                  Password Admin
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[rgba(242,239,235,0.4)] absolute left-3 top-2.5" />
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    value={adminPasswordInput}
                    onChange={e => setAdminPasswordInput(e.target.value)}
                    placeholder="Masukkan password admin..."
                    autoFocus
                    required
                    className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] focus:border-[#facc15] rounded pl-9 pr-10 py-2 text-xs font-mono text-[#f2efeb] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3 top-2.5 text-[rgba(242,239,235,0.5)]"
                  >
                    {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('view');
                    setStatusMsg(null);
                  }}
                  className="flex-1 py-2 rounded border border-[rgba(242,239,235,0.2)] text-xs font-mono uppercase text-[rgba(242,239,235,0.7)] hover:bg-[rgba(242,239,235,0.06)]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded bg-[#facc15] hover:bg-[#fde047] text-[#111113] text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verifikasi</span>
                </button>
              </div>
            </form>
          )}

          {/* CHANGE ADMIN PASSWORD MODE */}
          {mode === 'change-password' && (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase text-[rgba(242,239,235,0.7)]">
                  Password Lama
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Password admin saat ini"
                  required
                  autoFocus
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] focus:border-[#facc15] rounded px-3 py-2 text-xs font-mono text-[#f2efeb] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase text-[rgba(242,239,235,0.7)]">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  required
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] focus:border-[#facc15] rounded px-3 py-2 text-xs font-mono text-[#f2efeb] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase text-[rgba(242,239,235,0.7)]">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  required
                  className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] focus:border-[#facc15] rounded px-3 py-2 text-xs font-mono text-[#f2efeb] outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('view');
                    setStatusMsg(null);
                  }}
                  className="flex-1 py-2 rounded border border-[rgba(242,239,235,0.2)] text-xs font-mono uppercase text-[rgba(242,239,235,0.7)] hover:bg-[rgba(242,239,235,0.06)]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded bg-[#facc15] hover:bg-[#fde047] text-[#111113] text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
