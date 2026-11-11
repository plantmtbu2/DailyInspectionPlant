import React from 'react';
import {
  Truck,
  Tractor,
  Zap,
  ShieldCheck,
  AlertOctagon,
  Wrench,
  FileWarning,
  Layers,
  Sun,
  Moon,
  BarChart3,
  User,
  LogOut,
} from 'lucide-react';
import { ActiveTab } from './BottomNav';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  dailyRigidCount: number;
  dailyArticCount: number;
  qa1RigidCount: number;
  qa7RigidCount: number;
  qa1ArticCount: number;
  qa7ArticCount: number;
  activeBacklogCount: number;
  activitiesCount: number;
  openBapCount: number;
  codeUnitsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onChangeTab,
  dailyRigidCount,
  dailyArticCount,
  qa1RigidCount,
  qa7RigidCount,
  qa1ArticCount,
  qa7ArticCount,
  activeBacklogCount,
  activitiesCount,
  openBapCount,
  codeUnitsCount,
}) => {
  const { theme, setTheme } = useTheme();
  const { currentUser, isAdmin, logout } = useAuth();

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    isWarning?: boolean;
    isAccent?: boolean;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard Pencapaian',
      icon: BarChart3,
    },
    {
      id: 'daily-rigid',
      label: 'Daily Rigid',
      icon: Truck,
      badge: dailyRigidCount,
    },
    {
      id: 'daily-artic',
      label: 'Daily Artic',
      icon: Tractor,
      badge: dailyArticCount,
    },
    {
      id: 'qa1-rigid',
      label: 'QA 1 Pre Rigid',
      icon: Zap,
      badge: qa1RigidCount,
    },
    {
      id: 'qa7-rigid',
      label: 'QA 7 Final Rigid',
      icon: ShieldCheck,
      badge: qa7RigidCount,
    },
    {
      id: 'qa1-artic',
      label: 'QA 1 Pre Artic',
      icon: Tractor,
      badge: qa1ArticCount,
    },
    {
      id: 'qa7-artic',
      label: 'QA 7 Final Artic',
      icon: ShieldCheck,
      badge: qa7ArticCount,
    },
    {
      id: 'backlog',
      label: 'Backlog',
      icon: AlertOctagon,
      badge: activeBacklogCount,
      isWarning: true,
    },
    {
      id: 'activities',
      label: 'Activities',
      icon: Wrench,
      badge: activitiesCount,
    },
    {
      id: 'bap',
      label: 'BAP',
      icon: FileWarning,
      badge: openBapCount,
      isAccent: true,
    },
    {
      id: 'units',
      label: 'Code Unit',
      icon: Layers,
      badge: codeUnitsCount,
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[280px] shrink-0 h-screen sticky top-0 bg-gradient-to-b from-[#18181b] to-[#111113] border-r border-[rgba(242,239,235,0.1)] p-5 select-none z-30">
      {/* Brand Section */}
      <div className="mb-7 pb-4 border-b border-[rgba(242,239,235,0.08)]">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded bg-[#18181b] p-1 border border-[rgba(242,239,235,0.15)] flex items-center justify-center shrink-0">
            <img
              src="/assets/aistudio/PAMA_SMALL_4167d1d0.png"
              alt="PAMA Logo"
              className="max-h-full max-w-full object-contain"
              onError={e => {
                // fallback if asset path is relative to public
                (e.target as HTMLImageElement).src = 'assets/aistudio/PAMA_SMALL_4167d1d0.png';
              }}
            />
          </div>
          <div>
            <h1 className="font-syne font-extrabold text-xl tracking-tight text-[#f2efeb] uppercase leading-none">
              PLANT<span className="text-[#facc15]">2</span>
            </h1>
            <p className="text-[10px] font-mono tracking-wider text-[rgba(242,239,235,0.5)] uppercase mt-1">
              Heavy Equipment Systems
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-[rgba(242,239,235,0.4)] pt-1">
          <span>MTBU SITE</span>
          <span className="flex items-center space-x-1 text-[#4ade80]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            <span>SYSTEM ACTIVE</span>
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded text-xs font-semibold uppercase tracking-wider transition border text-left ${
                isActive
                  ? 'bg-[rgba(250,204,21,0.1)] border-[#facc15] text-[#facc15] shadow-sm'
                  : 'text-[rgba(242,239,235,0.65)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.06)] border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#facc15]' : 'text-[rgba(242,239,235,0.5)]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    item.isWarning
                      ? 'bg-[#fb7185] text-[#111113]'
                      : item.isAccent
                      ? 'bg-[#fb7185]/20 text-[#fb7185] border border-[#fb7185]/30'
                      : isActive
                      ? 'bg-[#facc15] text-[#111113]'
                      : 'bg-[rgba(242,239,235,0.1)] text-[#f2efeb]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active User Card & Logout (Profil Admin & User) */}
      {currentUser && (
        <div className="pt-2.5 pb-2 border-t border-[rgba(242,239,235,0.08)] mt-auto">
          <div className="p-2.5 rounded bg-[rgba(242,239,235,0.04)] border border-[rgba(242,239,235,0.08)] flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0 pr-1">
              <div
                className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                  isAdmin ? 'bg-[#facc15]/20 text-[#facc15]' : 'bg-[#38bdf8]/20 text-[#38bdf8]'
                }`}
              >
                {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold font-syne truncate leading-tight text-[#f2efeb]">
                  {currentUser.displayName}
                </div>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                      isAdmin ? 'text-[#facc15]' : 'text-[#38bdf8]'
                    }`}
                  >
                    {isAdmin ? 'ADMIN (AKSES PENUH)' : 'USER OPERASIONAL'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Keluar (Log Out)"
              className="p-1.5 rounded hover:bg-[#fb7185]/20 text-[rgba(242,239,235,0.45)] hover:text-[#fb7185] transition shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Theme Switcher (Light / Dark Mode) */}
      <div className="pt-2 pb-1 border-t border-[rgba(242,239,235,0.08)]">
        <div className="p-2 rounded bg-[rgba(242,239,235,0.04)] border border-[rgba(242,239,235,0.1)] flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[rgba(242,239,235,0.6)] flex items-center space-x-1.5">
            {theme === 'dark' ? <Moon className="w-3 h-3 text-[#facc15]" /> : <Sun className="w-3 h-3 text-[#facc15]" />}
            <span>TEMA:</span>
          </span>
          <div className="flex items-center space-x-1 bg-[rgba(242,239,235,0.08)] p-0.5 rounded border border-[rgba(242,239,235,0.1)]">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase flex items-center space-x-1 transition ${
                theme === 'dark'
                  ? 'bg-[#facc15] text-[#111113] shadow-sm'
                  : 'text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb]'
              }`}
              title="Aktifkan Tema Gelap (Dark Mode)"
            >
              <Moon className="w-2.5 h-2.5" />
              <span>Gelap</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase flex items-center space-x-1 transition ${
                theme === 'light'
                  ? 'bg-[#facc15] text-[#111113] shadow-sm'
                  : 'text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb]'
              }`}
              title="Aktifkan Tema Terang (Light Mode)"
            >
              <Sun className="w-2.5 h-2.5" />
              <span>Terang</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-[rgba(242,239,235,0.35)] uppercase tracking-wider">
        <span>VERSION 2.4.1</span>
        <span>BUILD 24/7</span>
      </div>
    </aside>
  );
};
