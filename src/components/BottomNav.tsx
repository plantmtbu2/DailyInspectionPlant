import React from 'react';
import {
  FileWarning,
  Truck,
  Tractor,
  AlertOctagon,
  Wrench,
  Layers,
  Zap,
  ShieldCheck,
} from 'lucide-react';

export type ActiveTab =
  | 'daily-rigid'
  | 'daily-artic'
  | 'qa1-rigid'
  | 'qa7-rigid'
  | 'qa1-artic'
  | 'qa7-artic'
  | 'backlog'
  | 'activities'
  | 'bap'
  | 'units';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  openBapCount: number;
  activeBacklogCount: number;
  dailyRigidCount?: number;
  dailyArticCount?: number;
  qa1RigidCount?: number;
  qa7RigidCount?: number;
  qa1ArticCount?: number;
  qa7ArticCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  openBapCount,
  activeBacklogCount,
  dailyRigidCount,
  dailyArticCount,
}) => {
  const navItems = [
    {
      id: 'daily-rigid' as ActiveTab,
      label: 'Daily Rigid',
      shortLabel: 'Daily Rigid',
      icon: Truck,
      badge: dailyRigidCount && dailyRigidCount > 0 ? dailyRigidCount : null,
      highlightColor: 'text-amber-400',
      activeIndicator: 'bg-amber-400',
    },
    {
      id: 'daily-artic' as ActiveTab,
      label: 'Daily Artic',
      shortLabel: 'Daily Artic',
      icon: Tractor,
      badge: dailyArticCount && dailyArticCount > 0 ? dailyArticCount : null,
      highlightColor: 'text-emerald-400',
      activeIndicator: 'bg-emerald-400',
    },
    {
      id: 'qa1-rigid' as ActiveTab,
      label: '1. QA 1 Rigid',
      shortLabel: 'QA 1 Rigid',
      icon: Zap,
      badge: null,
      highlightColor: 'text-amber-400',
      activeIndicator: 'bg-amber-400',
    },
    {
      id: 'qa7-rigid' as ActiveTab,
      label: '2. QA 7 Rigid',
      shortLabel: 'QA 7 Rigid',
      icon: ShieldCheck,
      badge: null,
      highlightColor: 'text-emerald-400',
      activeIndicator: 'bg-emerald-400',
    },
    {
      id: 'qa1-artic' as ActiveTab,
      label: '3. QA 1 Artic',
      shortLabel: 'QA 1 Artic',
      icon: Tractor,
      badge: null,
      highlightColor: 'text-amber-400',
      activeIndicator: 'bg-amber-400',
    },
    {
      id: 'qa7-artic' as ActiveTab,
      label: '4. QA 7 Artic',
      shortLabel: 'QA 7 Artic',
      icon: ShieldCheck,
      badge: null,
      highlightColor: 'text-emerald-400',
      activeIndicator: 'bg-emerald-400',
    },
    {
      id: 'backlog' as ActiveTab,
      label: 'Backlog',
      shortLabel: 'Backlog',
      icon: AlertOctagon,
      badge: activeBacklogCount > 0 ? activeBacklogCount : null,
      badgeColor: 'bg-amber-500',
      highlightColor: 'text-amber-400',
      activeIndicator: 'bg-amber-400',
    },
    {
      id: 'activities' as ActiveTab,
      label: 'Activities',
      shortLabel: 'Aktivitas',
      icon: Wrench,
      badge: null,
      highlightColor: 'text-emerald-400',
      activeIndicator: 'bg-emerald-400',
    },
    {
      id: 'bap' as ActiveTab,
      label: 'BAP',
      shortLabel: 'BAP',
      icon: FileWarning,
      badge: openBapCount > 0 ? openBapCount : null,
      badgeColor: 'bg-rose-500',
      highlightColor: 'text-rose-400',
      activeIndicator: 'bg-rose-400',
    },
    {
      id: 'units' as ActiveTab,
      label: 'Code Unit',
      shortLabel: 'Unit',
      icon: Layers,
      badge: null,
      highlightColor: 'text-blue-400',
      activeIndicator: 'bg-blue-400',
    },
  ];

  return (
    <nav className="no-print fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 safe-bottom">
      <div className="max-w-7xl mx-auto px-1 sm:px-3">
        <div className="flex items-center justify-between overflow-x-auto py-1 scrollbar-none gap-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`relative flex flex-col items-center justify-center flex-1 min-w-[58px] sm:min-w-[70px] py-1.5 px-1 rounded-xl transition-all duration-150 ${
                  isActive
                    ? `${item.highlightColor} font-bold bg-slate-900/60`
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <span className={`absolute -top-1 w-6 sm:w-8 h-1 ${item.activeIndicator} rounded-full`} />
                )}
                <div className="relative">
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {item.badge !== null && (
                    <span
                      className={`absolute -top-1 -right-2 min-w-3.5 h-3.5 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center ${
                        item.badgeColor || 'bg-amber-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] sm:text-[11px] mt-1 tracking-tight truncate max-w-[72px] text-center">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
