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
  BarChart3,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
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
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      icon: BarChart3,
      badge: null,
      highlightColor: 'text-[#facc15]',
      activeIndicator: 'bg-[#facc15]',
    },
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
    <nav className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111113]/95 backdrop-blur-md border-t border-[rgba(242,239,235,0.1)] safe-bottom">
      <div className="w-full px-1 sm:px-3">
        <div className="flex items-center justify-between overflow-x-auto py-1 scrollbar-none gap-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`relative flex flex-col items-center justify-center flex-1 min-w-[56px] sm:min-w-[68px] py-1.5 px-1 rounded transition-all duration-150 ${
                  isActive
                    ? 'text-[#facc15] font-bold bg-[rgba(250,204,21,0.08)]'
                    : 'text-[rgba(242,239,235,0.5)] hover:text-[#f2efeb]'
                }`}
              >
                {isActive && (
                  <span className="absolute -top-1 w-6 sm:w-8 h-0.5 bg-[#facc15]" />
                )}
                <div className="relative">
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'scale-110 text-[#facc15]' : ''}`} />
                  {item.badge !== null && (
                    <span
                      className={`absolute -top-1 -right-2 min-w-3.5 h-3.5 px-1 rounded text-[9px] font-mono font-bold flex items-center justify-center ${
                        item.id === 'backlog'
                          ? 'bg-[#fb7185] text-[#111113]'
                          : 'bg-[#facc15] text-[#111113]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono mt-1 tracking-tight truncate max-w-[70px] text-center uppercase">
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
