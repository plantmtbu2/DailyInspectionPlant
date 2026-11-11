import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserRole } from '../types';

interface LoginScreenProps {
  onSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [operatorName, setOperatorName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const res = login('admin', adminPassword);
      setIsLoading(false);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'Password salah.');
      }
    }, 200);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const res = login('user', undefined, operatorName);
      setIsLoading(false);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'Gagal masuk.');
      }
    }, 150);
  };

  return (
    <div className="min-h-screen w-full bg-[#111113] text-[#f2efeb] flex flex-col justify-between selection:bg-[#facc15] selection:text-[#111113] relative overflow-hidden">
      {/* Top Bar with Brand & Theme Toggle */}
      <div className="w-full px-6 py-4 flex items-center justify-between border-b border-[rgba(242,239,235,0.08)] bg-[#18181b]/60 backdrop-blur z-20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded bg-[#18181b] p-1 border border-[rgba(242,239,235,0.15)] flex items-center justify-center shrink-0">
            <img
              src="/assets/aistudio/PAMA_SMALL_4167d1d0.png"
              alt="PAMA Logo"
              className="max-h-full max-w-full object-contain"
              onError={e => {
                (e.target as HTMLImageElement).src = 'assets/aistudio/PAMA_SMALL_4167d1d0.png';
              }}
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-syne font-extrabold text-sm tracking-tight text-[#f2efeb] uppercase">
                PLANT<span className="text-[#facc15]">2</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[rgba(250,204,21,0.15)] text-[#facc15] border border-[rgba(250,204,21,0.3)]">
                SITE MTBU
              </span>
            </div>
            <p className="text-[9px] font-mono tracking-wider text-[rgba(242,239,235,0.4)] uppercase">
              PT PAMAPERSADA NUSANTARA
            </p>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Ganti ke Tema Terang' : 'Ganti ke Tema Gelap'}
          className="px-3 py-1.5 rounded border border-[rgba(242,239,235,0.15)] bg-[#18181b] hover:bg-[rgba(242,239,235,0.08)] text-[#f2efeb] text-xs font-mono uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#facc15]" />
              <span className="text-[11px] font-bold">Terang</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#facc15]" />
              <span className="text-[11px] font-bold">Gelap</span>
            </>
          )}
        </button>
      </div>

      {/* Main Login Box */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md bg-[#18181b] border border-[rgba(242,239,235,0.15)] rounded-lg shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Header & Title */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(250,204,21,0.1)] border border-[#facc15]/30 text-[#facc15] mb-2 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="font-syne font-extrabold text-2xl uppercase tracking-tight text-[#f2efeb]">
              AUTENTIKASI SISTEM
            </h2>
            <p className="text-xs font-mono text-[rgba(242,239,235,0.6)]">
              Pilih Profil Pengguna untuk Mengakses Aplikasi Plant 2
            </p>
          </div>

          {/* Profile Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#111113] rounded border border-[rgba(242,239,235,0.1)] font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('admin');
                setErrorMessage('');
              }}
              className={`py-2 px-3 rounded flex items-center justify-center space-x-2 font-bold uppercase transition ${
                selectedRole === 'admin'
                  ? 'bg-[#facc15] text-[#111113] shadow-md'
                  : 'text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.05)]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>PROFIL ADMIN</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('user');
                setErrorMessage('');
              }}
              className={`py-2 px-3 rounded flex items-center justify-center space-x-2 font-bold uppercase transition ${
                selectedRole === 'user'
                  ? 'bg-[#38bdf8] text-[#111113] shadow-md'
                  : 'text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.05)]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>PROFIL USER</span>
            </button>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3 rounded bg-[#fb7185]/15 border border-[#fb7185]/40 text-[#fb7185] text-xs font-mono flex items-start space-x-2 animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: ADMIN FORM */}
          {selectedRole === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[rgba(242,239,235,0.8)]">
                  Password Admin
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[rgba(242,239,235,0.4)] absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={e => {
                      setAdminPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Masukkan password admin..."
                    autoFocus
                    required
                    className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] focus:border-[#facc15] rounded pl-9 pr-10 py-2.5 text-xs font-mono text-[#f2efeb] placeholder-[rgba(242,239,235,0.35)] outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[rgba(242,239,235,0.5)] hover:text-[#f2efeb]"
                    title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded bg-[#facc15] hover:bg-[#fde047] text-[#111113] text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition active:scale-[0.98] shadow-lg shadow-[#facc15]/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>MEMVERIFIKASI...</span>
                ) : (
                  <>
                    <span>MASUK SEBAGAI ADMIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: USER FORM */}
          {selectedRole === 'user' && (
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[rgba(242,239,235,0.8)]">
                  Nama Mekanik / Teknisi <span className="text-[rgba(242,239,235,0.4)] text-[10px]">(Opsional)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[rgba(242,239,235,0.4)] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={operatorName}
                    onChange={e => setOperatorName(e.target.value)}
                    placeholder="Contoh: Mekanik Shift 1 / Budi..."
                    autoFocus
                    className="w-full bg-[#111113] border border-[rgba(242,239,235,0.2)] focus:border-[#38bdf8] rounded pl-9 pr-3 py-2.5 text-xs font-mono text-[#f2efeb] placeholder-[rgba(242,239,235,0.35)] outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#111113] text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition active:scale-[0.98] shadow-lg shadow-[#38bdf8]/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>MEMPROSES...</span>
                ) : (
                  <>
                    <span>MASUK SEBAGAI USER</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="w-full py-3 px-6 text-center border-t border-[rgba(242,239,235,0.08)] text-[10px] font-mono text-[rgba(242,239,235,0.35)] uppercase tracking-wider bg-[#18181b]/40">
        PLANT 2 HEAVY EQUIPMENT SYSTEM • PT PAMAPERSADA NUSANTARA SITE MTBU • 2026
      </footer>
    </div>
  );
};
