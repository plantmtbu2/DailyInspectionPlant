import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  CalendarDays,
  TrendingUp,
  Truck,
  Tractor,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Printer,
  Wrench,
  AlertOctagon,
  Layers,
  ArrowUpRight,
  Check,
  XCircle,
  FileCheck,
  Search,
  Filter,
} from 'lucide-react';
import {
  DailyCheckRigid,
  DailyCheckArtic,
  CodeUnit,
  BacklogItem,
  AddActivityItem,
  QAType,
} from '../types';
import {
  shareToWhatsApp,
  formatDashboardAchievementWhatsApp,
  DashboardAchievementSummary,
} from '../utils/whatsappFormatter';

interface DashboardDailyViewProps {
  dailyRigidList: DailyCheckRigid[];
  dailyArticList: DailyCheckArtic[];
  codeUnits: CodeUnit[];
  backlogs?: BacklogItem[];
  activities?: AddActivityItem[];
  onOpenRigidForUnit?: (codeUnit: string, qaType?: QAType) => void;
  onOpenArticForUnit?: (codeUnit: string, qaType?: QAType) => void;
  onNavigateToTab?: (tab: string) => void;
}

type PeriodType = 'HARIAN' | 'BULANAN' | 'TAHUNAN';

// Helper to normalize and parse dates across formats DD/MM/YYYY and YYYY-MM-DD
function parseDateParts(dateStr: string): { day: number; month: number; year: number; iso: string } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return {
          day: d,
          month: m,
          year: y < 100 ? 2000 + y : y,
          iso: `${y < 100 ? 2000 + y : y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        };
      }
    }
  }
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length >= 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2].slice(0, 2), 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return {
          day: d,
          month: m,
          year: y,
          iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        };
      }
    }
  }
  return null;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const DashboardDailyView: React.FC<DashboardDailyViewProps> = ({
  dailyRigidList,
  dailyArticList,
  codeUnits,
  backlogs = [],
  activities = [],
  onOpenRigidForUnit,
  onOpenArticForUnit,
  onNavigateToTab,
}) => {
  // Current Date Default
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => today.toISOString().slice(0, 10), [today]);

  // Period state: HARIAN | BULANAN | TAHUNAN
  const [periodType, setPeriodType] = useState<PeriodType>('HARIAN');

  // Filters for each period
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1 - 12
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  // Fleet Filter
  const [fleetTypeFilter, setFleetTypeFilter] = useState<'ALL' | 'RIGID' | 'ARTIC'>('ALL');
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState<'ALL' | 'INSPECTED' | 'UNINSPECTED'>('ALL');

  // Date Navigators
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handlePrevYear = () => {
    setSelectedYear(y => y - 1);
  };

  const handleNextYear = () => {
    setSelectedYear(y => y + 1);
  };

  // Combine Inspections
  const combinedInspections = useMemo(() => {
    const rigids = dailyRigidList.map(r => ({
      ...r,
      fleetType: 'RIGID' as const,
      inspectionDateParts: parseDateParts(r.tanggal),
    }));
    const artics = dailyArticList.map(a => ({
      ...a,
      fleetType: 'ARTIC' as const,
      inspectionDateParts: parseDateParts(a.tanggal),
    }));
    return [...rigids, ...artics];
  }, [dailyRigidList, dailyArticList]);

  // Filter Code Units by fleetType
  const filteredCodeUnits = useMemo(() => {
    return codeUnits.filter(u => {
      const isRigid =
        u.tipeAlat.toLowerCase().includes('rigid') ||
        u.codeUnit.toUpperCase().startsWith('RD') ||
        u.codeUnit.toUpperCase().startsWith('HD') ||
        u.codeUnit.toUpperCase().startsWith('DT') ||
        u.egi.includes('777') ||
        u.egi.includes('785');
      if (fleetTypeFilter === 'RIGID') return isRigid;
      if (fleetTypeFilter === 'ARTIC') return !isRigid;
      return true;
    });
  }, [codeUnits, fleetTypeFilter]);

  // Filter inspections matching the period
  const periodInspections = useMemo(() => {
    return combinedInspections.filter(item => {
      if (fleetTypeFilter === 'RIGID' && item.fleetType !== 'RIGID') return false;
      if (fleetTypeFilter === 'ARTIC' && item.fleetType !== 'ARTIC') return false;

      const p = item.inspectionDateParts;
      if (!p) return false;

      if (periodType === 'HARIAN') {
        const target = parseDateParts(selectedDate);
        if (!target) return false;
        return p.day === target.day && p.month === target.month && p.year === target.year;
      }

      if (periodType === 'BULANAN') {
        return p.month === selectedMonth && p.year === selectedYear;
      }

      if (periodType === 'TAHUNAN') {
        return p.year === selectedYear;
      }

      return false;
    });
  }, [combinedInspections, fleetTypeFilter, periodType, selectedDate, selectedMonth, selectedYear]);

  // Target and Achievement Computations
  const totalTargetUnits = filteredCodeUnits.length;

  // Map unique units inspected in this period
  const inspectedUnitsMap = useMemo(() => {
    const map = new Map<string, typeof periodInspections[0]>();
    periodInspections.forEach(item => {
      const key = item.codeUnit.trim().toUpperCase();
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
    return map;
  }, [periodInspections]);

  const uniqueInspectedCount = inspectedUnitsMap.size;
  const uninspectedUnitsList = useMemo(() => {
    return filteredCodeUnits.filter(u => !inspectedUnitsMap.has(u.codeUnit.trim().toUpperCase()));
  }, [filteredCodeUnits, inspectedUnitsMap]);

  // Achievement Rate
  const achievementRate = totalTargetUnits > 0
    ? Math.min(100, (uniqueInspectedCount / totalTargetUnits) * 100)
    : 0;

  // Status breakdown of inspected units
  const runningUnitsCount = periodInspections.filter(i => i.status === 'RUNNING').length;
  const breakdownUnitsCount = periodInspections.filter(i => i.status === 'BREAKDOWN').length;
  const standbyUnitsCount = periodInspections.filter(
    i => i.status === 'STANDBY' || i.status === 'SCHEDULED_SERVICE'
  ).length;

  const rigidInspectionsCount = periodInspections.filter(i => i.fleetType === 'RIGID').length;
  const articInspectionsCount = periodInspections.filter(i => i.fleetType === 'ARTIC').length;

  // Total defect items count
  const totalDefectsCount = useMemo(() => {
    return periodInspections.reduce((total, insp) => {
      const defects = (insp.items || []).filter(item => item.status === 'DEFECT').length;
      return total + defects;
    }, 0);
  }, [periodInspections]);

  // Count connected backlogs and activities in this period
  const connectedBacklogsCount = useMemo(() => {
    const inspectedUnitSet = new Set(Array.from(inspectedUnitsMap.keys()));
    return backlogs.filter(b => inspectedUnitSet.has(b.codeUnit.trim().toUpperCase())).length;
  }, [backlogs, inspectedUnitsMap]);

  const connectedActivitiesCount = useMemo(() => {
    const inspectedUnitSet = new Set(Array.from(inspectedUnitsMap.keys()));
    return activities.filter(a => inspectedUnitSet.has(a.codeUnit.trim().toUpperCase())).length;
  }, [activities, inspectedUnitsMap]);

  // Period label for headers & share
  const periodLabel = useMemo(() => {
    if (periodType === 'HARIAN') {
      const p = parseDateParts(selectedDate);
      if (p) {
        return `${String(p.day).padStart(2, '0')} ${MONTH_NAMES[p.month - 1]} ${p.year}`;
      }
      return selectedDate;
    }
    if (periodType === 'BULANAN') {
      return `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
    }
    return `Tahun ${selectedYear}`;
  }, [periodType, selectedDate, selectedMonth, selectedYear]);

  // Monthly daily distribution (Day 1 - 31) for Monthly Bar Chart
  const monthlyDailyStats = useMemo(() => {
    if (periodType !== 'BULANAN') return [];
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const stats: Array<{ day: number; count: number; rigid: number; artic: number }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const matches = periodInspections.filter(i => i.inspectionDateParts?.day === d);
      const rigid = matches.filter(i => i.fleetType === 'RIGID').length;
      const artic = matches.filter(i => i.fleetType === 'ARTIC').length;
      stats.push({ day: d, count: matches.length, rigid, artic });
    }
    return stats;
  }, [periodType, periodInspections, selectedMonth, selectedYear]);

  // Yearly monthly distribution (Month 1 - 12) for Yearly Bar Chart
  const yearlyMonthlyStats = useMemo(() => {
    if (periodType !== 'TAHUNAN') return [];
    const stats: Array<{ monthIndex: number; monthName: string; count: number; rigid: number; artic: number }> = [];

    for (let m = 1; m <= 12; m++) {
      const matches = combinedInspections.filter(i => {
        const p = i.inspectionDateParts;
        return p && p.year === selectedYear && p.month === m;
      });
      const rigid = matches.filter(i => i.fleetType === 'RIGID').length;
      const artic = matches.filter(i => i.fleetType === 'ARTIC').length;
      stats.push({
        monthIndex: m,
        monthName: MONTH_NAMES[m - 1].slice(0, 3),
        count: matches.length,
        rigid,
        artic,
      });
    }
    return stats;
  }, [periodType, combinedInspections, selectedYear]);

  // Hourly distribution for Daily chart
  const dailyHourlyStats = useMemo(() => {
    if (periodType !== 'HARIAN') return [];
    const slots = [
      { label: '06-08', range: [6, 8] },
      { label: '08-10', range: [8, 10] },
      { label: '10-12', range: [10, 12] },
      { label: '12-14', range: [12, 14] },
      { label: '14-16', range: [14, 16] },
      { label: '16-18', range: [16, 18] },
      { label: '18-20', range: [18, 20] },
      { label: '20-22', range: [20, 22] },
    ];
    return slots.map(slot => {
      const count = periodInspections.filter(item => {
        const time = item.startTime || item.finishTime || '';
        const hour = parseInt(time.slice(0, 2), 10);
        return !isNaN(hour) && hour >= slot.range[0] && hour < slot.range[1];
      }).length;
      return { label: slot.label, count };
    });
  }, [periodType, periodInspections]);

  // Table rows combining all fleet units with their inspection status in this period
  const fleetTableRows = useMemo(() => {
    return filteredCodeUnits.map(unit => {
      const key = unit.codeUnit.trim().toUpperCase();
      const inspection = inspectedUnitsMap.get(key) || null;
      const isInspected = Boolean(inspection);

      return {
        unit,
        isInspected,
        inspection,
      };
    }).filter(row => {
      const q = tableSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        row.unit.codeUnit.toLowerCase().includes(q) ||
        row.unit.egi.toLowerCase().includes(q) ||
        row.unit.tipeAlat.toLowerCase().includes(q) ||
        (row.inspection?.picMekanik || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (tableStatusFilter === 'INSPECTED') return row.isInspected;
      if (tableStatusFilter === 'UNINSPECTED') return !row.isInspected;
      return true;
    });
  }, [filteredCodeUnits, inspectedUnitsMap, tableSearch, tableStatusFilter]);

  // Mechanics Leaderboard
  const mechanicLeaderboard = useMemo(() => {
    const counter = new Map<string, { count: number; defects: number }>();
    periodInspections.forEach(item => {
      const pic = (item.picMekanik || 'Mekanik').trim();
      const cur = counter.get(pic) || { count: 0, defects: 0 };
      const defectCount = (item.items || []).filter(i => i.status === 'DEFECT').length;
      counter.set(pic, { count: cur.count + 1, defects: cur.defects + defectCount });
    });
    return Array.from(counter.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [periodInspections]);

  // WhatsApp Share Handler
  const handleShareWhatsApp = () => {
    const summary: DashboardAchievementSummary = {
      periodType,
      periodLabel,
      totalUnits: totalTargetUnits,
      inspectedUnitsCount: uniqueInspectedCount,
      uninspectedUnitsCount: uninspectedUnitsList.length,
      totalInspections: periodInspections.length,
      achievementRate,
      rigidCount: rigidInspectionsCount,
      articCount: articInspectionsCount,
      runningCount: runningUnitsCount,
      breakdownCount: breakdownUnitsCount,
      standbyCount: standbyUnitsCount,
      defectItemsCount: totalDefectsCount,
      backlogCount: connectedBacklogsCount,
      activityCount: connectedActivitiesCount,
      uninspectedUnitCodes: uninspectedUnitsList.map(u => u.codeUnit),
    };

    const text = formatDashboardAchievementWhatsApp(summary);
    shareToWhatsApp(text, {
      title: `Laporan Pencapaian Daily ${periodType} - Plant 2 MTBU`,
    });
  };

  // Quick action: start inspection for an uninspected unit
  const handleStartInspection = (unit: CodeUnit) => {
    const isRigid =
      unit.tipeAlat.toLowerCase().includes('rigid') ||
      unit.codeUnit.toUpperCase().startsWith('RD') ||
      unit.codeUnit.toUpperCase().startsWith('HD') ||
      unit.codeUnit.toUpperCase().startsWith('DT') ||
      unit.egi.includes('777') ||
      unit.egi.includes('785');

    if (isRigid && onOpenRigidForUnit) {
      onOpenRigidForUnit(unit.codeUnit, 'DAILY_INSPECTION');
    } else if (!isRigid && onOpenArticForUnit) {
      onOpenArticForUnit(unit.codeUnit, 'DAILY_INSPECTION');
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header & Period Selector (Industrial Systematic) */}
      <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[10px] text-[rgba(242,239,235,0.5)] uppercase tracking-wider">
              Category:
            </span>
            <span className="font-syne font-extrabold text-base sm:text-lg text-[#f2efeb] tracking-tight uppercase">
              DASHBOARD PENCAPAIAN DAILY INSPEKSI
            </span>
          </div>
          <p className="text-xs text-[rgba(242,239,235,0.5)] font-mono mt-0.5">
            Monitoring target vs realisasi kelayakan armada alat berat Plant 2 MTBU • PT. Pamapersada Nusantara
          </p>
        </div>

        {/* Action Buttons: WhatsApp & Print */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2 rounded bg-[#4ade80] hover:bg-[#22c55e] text-[#111113] text-xs font-mono font-black uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95 shadow-md shadow-[#4ade80]/20"
            title="Kirim ringkasan capaian ke WhatsApp Group Leader"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Share WA</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded bg-[#111113] hover:bg-[rgba(242,239,235,0.06)] text-[#f2efeb] border border-[rgba(242,239,235,0.15)] text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition"
            title="Cetak Ringkasan Dashboard / Simpan PDF"
          >
            <Printer className="w-3.5 h-3.5 text-[#facc15]" />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Timeframe Toggle & Period Date Picker */}
      <div className="bg-[#18181b] p-3 rounded border border-[rgba(242,239,235,0.1)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Period Selector Tabs */}
        <div className="flex items-center space-x-1.5 bg-[#111113] p-1 rounded border border-[rgba(242,239,235,0.1)]">
          {(['HARIAN', 'BULANAN', 'TAHUNAN'] as const).map(pt => (
            <button
              key={pt}
              onClick={() => setPeriodType(pt)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition ${
                periodType === pt
                  ? 'bg-[#facc15] text-[#111113] shadow-sm'
                  : 'text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb]'
              }`}
            >
              {pt === 'HARIAN' ? '📅 Harian' : pt === 'BULANAN' ? '📆 Bulanan' : '📈 Tahunan'}
            </button>
          ))}
        </div>

        {/* Date / Month / Year Specific Controller */}
        <div className="flex items-center flex-wrap gap-2">
          {periodType === 'HARIAN' && (
            <div className="flex items-center space-x-1 bg-[#111113] p-1 rounded border border-[rgba(242,239,235,0.1)]">
              <button
                onClick={handlePrevDay}
                className="w-7 h-7 rounded flex items-center justify-center text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.08)] transition"
                title="Hari sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-mono text-[#f2efeb] px-2 py-0.5 outline-none"
              />
              <button
                onClick={handleNextDay}
                className="w-7 h-7 rounded flex items-center justify-center text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.08)] transition"
                title="Hari berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDate(todayIso)}
                className="px-2 py-1 rounded text-[10px] font-mono font-bold uppercase bg-[rgba(250,204,21,0.1)] text-[#facc15] hover:bg-[rgba(250,204,21,0.2)] ml-1"
              >
                Hari Ini
              </button>
            </div>
          )}

          {periodType === 'BULANAN' && (
            <div className="flex items-center space-x-1.5 bg-[#111113] p-1 rounded border border-[rgba(242,239,235,0.1)]">
              <button
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded flex items-center justify-center text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.08)] transition"
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-mono font-bold text-[#f2efeb] px-1.5 py-0.5 outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1} className="bg-[#18181b] text-white">
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-mono font-bold text-[#f2efeb] px-1.5 py-0.5 outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y} className="bg-[#18181b] text-white">
                    {y}
                  </option>
                ))}
              </select>
              <button
                onClick={handleNextMonth}
                className="w-7 h-7 rounded flex items-center justify-center text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.08)] transition"
                title="Bulan berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedMonth(today.getMonth() + 1);
                  setSelectedYear(today.getFullYear());
                }}
                className="px-2 py-1 rounded text-[10px] font-mono font-bold uppercase bg-[rgba(250,204,21,0.1)] text-[#facc15] hover:bg-[rgba(250,204,21,0.2)] ml-1"
              >
                Bulan Ini
              </button>
            </div>
          )}

          {periodType === 'TAHUNAN' && (
            <div className="flex items-center space-x-1.5 bg-[#111113] p-1 rounded border border-[rgba(242,239,235,0.1)]">
              <button
                onClick={handlePrevYear}
                className="w-7 h-7 rounded flex items-center justify-center text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.08)] transition"
                title="Tahun sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-syne font-extrabold text-sm text-[#facc15] px-2">
                TAHUN {selectedYear}
              </span>
              <button
                onClick={handleNextYear}
                className="w-7 h-7 rounded flex items-center justify-center text-[rgba(242,239,235,0.6)] hover:text-[#f2efeb] hover:bg-[rgba(242,239,235,0.08)] transition"
                title="Tahun berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedYear(today.getFullYear())}
                className="px-2 py-1 rounded text-[10px] font-mono font-bold uppercase bg-[rgba(250,204,21,0.1)] text-[#facc15] hover:bg-[rgba(250,204,21,0.2)] ml-1"
              >
                Tahun Ini
              </button>
            </div>
          )}

          {/* Fleet Filter */}
          <div className="flex items-center space-x-1 bg-[#111113] p-1 rounded border border-[rgba(242,239,235,0.1)] text-xs font-mono">
            <span className="text-[10px] text-[rgba(242,239,235,0.4)] px-1 uppercase">Armada:</span>
            {(['ALL', 'RIGID', 'ARTIC'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFleetTypeFilter(f)}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition ${
                  fleetTypeFilter === f
                    ? 'bg-[#18181b] text-[#facc15] border border-[#facc15]/30'
                    : 'text-[rgba(242,239,235,0.5)] hover:text-[#f2efeb]'
                }`}
              >
                {f === 'ALL' ? 'Semua' : f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Achievement Rate */}
        <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[rgba(242,239,235,0.5)]">
              Tingkat Pencapaian
            </span>
            <span
              className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border ${
                achievementRate >= 85
                  ? 'bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/30'
                  : achievementRate >= 60
                  ? 'bg-[#facc15]/15 text-[#facc15] border-[#facc15]/30'
                  : 'bg-[#fb7185]/15 text-[#fb7185] border-[#fb7185]/30'
              }`}
            >
              {achievementRate >= 85 ? 'TARGET TERCAPAI' : achievementRate >= 60 ? 'ON PROGRESS' : 'PERLU PERHATIAN'}
            </span>
          </div>

          <div className="my-2 flex items-baseline space-x-2">
            <span className="font-syne font-extrabold text-3xl sm:text-4xl text-[#facc15]">
              {achievementRate.toFixed(1)}%
            </span>
            <span className="font-mono text-xs text-[rgba(242,239,235,0.6)]">
              ({uniqueInspectedCount}/{totalTargetUnits} Unit)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-2 rounded bg-[#111113] overflow-hidden border border-[rgba(242,239,235,0.1)]">
              <div
                className={`h-full transition-all duration-500 ${
                  achievementRate >= 85 ? 'bg-[#4ade80]' : achievementRate >= 60 ? 'bg-[#facc15]' : 'bg-[#fb7185]'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, achievementRate))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-[rgba(242,239,235,0.4)]">
              <span>0%</span>
              <span>Target: 100% Armada</span>
            </div>
          </div>
        </div>

        {/* 2. Total Volume Inspeksi */}
        <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[rgba(242,239,235,0.5)]">
              Volume Inspeksi Selesai
            </span>
            <FileCheck className="w-4 h-4 text-[#4ade80]" />
          </div>

          <div className="my-2">
            <span className="font-syne font-extrabold text-3xl sm:text-4xl text-[#f2efeb]">
              {periodInspections.length}
            </span>
            <span className="font-mono text-xs text-[rgba(242,239,235,0.5)] ml-1.5 uppercase">
              Form QA/Daily
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-[rgba(242,239,235,0.08)]">
            <div className="flex items-center space-x-1.5">
              <Truck className="w-3.5 h-3.5 text-[#facc15]" />
              <span className="text-[11px] text-[rgba(242,239,235,0.7)]">Rigid: <strong>{rigidInspectionsCount}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Tractor className="w-3.5 h-3.5 text-[#4ade80]" />
              <span className="text-[11px] text-[rgba(242,239,235,0.7)]">Artic: <strong>{articInspectionsCount}</strong></span>
            </div>
          </div>
        </div>

        {/* 3. Status Armada Pasca Inspeksi */}
        <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[rgba(242,239,235,0.5)]">
              Kondisi Kelayakan Unit
            </span>
            <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
          </div>

          <div className="my-2 flex items-baseline space-x-2">
            <span className="font-syne font-extrabold text-3xl sm:text-4xl text-[#4ade80]">
              {runningUnitsCount}
            </span>
            <span className="font-mono text-xs text-[rgba(242,239,235,0.5)] uppercase">
              Ready / Running ({periodInspections.length > 0 ? Math.round((runningUnitsCount / periodInspections.length) * 100) : 0}%)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-[rgba(242,239,235,0.08)]">
            <span className="text-[11px] text-[#fb7185]">BD: <strong>{breakdownUnitsCount} Unit</strong></span>
            <span className="text-[11px] text-[#facc15]">Standby: <strong>{standbyUnitsCount} Unit</strong></span>
          </div>
        </div>

        {/* 4. Temuan Deviasi & Backlog */}
        <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[rgba(242,239,235,0.5)]">
              Kualitas & Temuan Deviasi
            </span>
            <AlertOctagon className="w-4 h-4 text-[#fb7185]" />
          </div>

          <div className="my-2 flex items-baseline space-x-2">
            <span className="font-syne font-extrabold text-3xl sm:text-4xl text-[#fb7185]">
              {totalDefectsCount}
            </span>
            <span className="font-mono text-xs text-[rgba(242,239,235,0.5)] uppercase">
              Temuan Defect
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-[rgba(242,239,235,0.08)]">
            <span className="text-[11px] text-[#facc15] truncate">Backlog: <strong>{connectedBacklogsCount} Part</strong></span>
            <span className="text-[11px] text-[#4ade80] truncate">Servis: <strong>{connectedActivitiesCount} Act</strong></span>
          </div>
        </div>
      </div>

      {/* Visual Chart Section: Harian / Bulanan / Tahunan */}
      <div className="bg-[#18181b] p-4 sm:p-5 rounded border border-[rgba(242,239,235,0.1)] space-y-3">
        <div className="flex items-center justify-between border-b border-[rgba(242,239,235,0.08)] pb-2.5">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-[#facc15]" />
            <h3 className="font-syne font-extrabold text-sm uppercase text-[#f2efeb]">
              {periodType === 'HARIAN' && `Distribusi Jam Pelaksanaan Inspeksi (${periodLabel})`}
              {periodType === 'BULANAN' && `Tren Volume Inspeksi Harian Bulan ${periodLabel}`}
              {periodType === 'TAHUNAN' && `Perbandingan Akumulasi Inspeksi 12 Bulan Tahun ${selectedYear}`}
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[rgba(242,239,235,0.4)] uppercase">
            Total {periodInspections.length} Inspeksi Selesai
          </span>
        </div>

        {/* 1. Harian Hourly Distribution Chart */}
        {periodType === 'HARIAN' && (
          <div className="pt-2">
            {dailyHourlyStats.every(s => s.count === 0) ? (
              <div className="text-center py-8 text-[rgba(242,239,235,0.4)] font-mono text-xs">
                Belum ada rekaman inspeksi tercatat pada tanggal {periodLabel}.
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2">
                {dailyHourlyStats.map((slot, idx) => {
                  const maxSlot = Math.max(...dailyHourlyStats.map(s => s.count), 1);
                  const heightPercent = Math.max(12, (slot.count / maxSlot) * 100);

                  return (
                    <div key={slot.label} className="flex flex-col items-center space-y-1.5">
                      <span className="text-[10px] font-mono font-bold text-[#facc15]">{slot.count}</span>
                      <div className="w-full h-24 bg-[#111113] rounded flex items-end p-1 border border-[rgba(242,239,235,0.06)]">
                        <div
                          className="w-full rounded bg-gradient-to-t from-[#facc15] to-[#fde047] transition-all duration-300"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[rgba(242,239,235,0.5)]">
                        {slot.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. Bulanan Daily Bars (Day 1 - 31) */}
        {periodType === 'BULANAN' && (
          <div className="pt-2 overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-31 gap-1.5 h-32 items-end pt-4 pb-1">
                {monthlyDailyStats.map(dayStat => {
                  const maxDay = Math.max(...monthlyDailyStats.map(s => s.count), 1);
                  const heightPercent = dayStat.count > 0 ? Math.max(15, (dayStat.count / maxDay) * 100) : 4;
                  const isCurrentDay = today.getDate() === dayStat.day && today.getMonth() + 1 === selectedMonth && today.getFullYear() === selectedYear;

                  return (
                    <div
                      key={`day-${dayStat.day}`}
                      className="flex flex-col items-center justify-end h-full group relative"
                      title={`Tgl ${dayStat.day} ${MONTH_NAMES[selectedMonth - 1]}: ${dayStat.count} Unit (Rigid: ${dayStat.rigid}, Artic: ${dayStat.artic})`}
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 bg-[#111113] border border-[#facc15] text-[#facc15] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap z-20 transition">
                        {dayStat.count} Unit
                      </div>

                      <div
                        className={`w-full rounded transition-all duration-200 ${
                          dayStat.count > 0
                            ? isCurrentDay
                              ? 'bg-[#4ade80] ring-1 ring-[#4ade80]'
                              : 'bg-[#facc15] hover:bg-[#fde047]'
                            : 'bg-[#111113] border border-[rgba(242,239,235,0.06)]'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className={`text-[9px] font-mono mt-1 ${isCurrentDay ? 'text-[#4ade80] font-bold' : 'text-[rgba(242,239,235,0.4)]'}`}>
                        {dayStat.day}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-[rgba(242,239,235,0.4)] pt-2 border-t border-[rgba(242,239,235,0.06)]">
                <span>Tanggal 1 s/d {monthlyDailyStats.length} {MONTH_NAMES[selectedMonth - 1]}</span>
                <span className="flex items-center space-x-2">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded bg-[#facc15]" />
                    <span>Realisasi Harian</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded bg-[#4ade80]" />
                    <span>Hari Ini</span>
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Tahunan 12 Months Bars */}
        {periodType === 'TAHUNAN' && (
          <div className="pt-2">
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 h-36 items-end pt-4">
              {yearlyMonthlyStats.map(monthStat => {
                const maxMonth = Math.max(...yearlyMonthlyStats.map(s => s.count), 1);
                const heightPercent = monthStat.count > 0 ? Math.max(14, (monthStat.count / maxMonth) * 100) : 4;
                const isCurrentMonth = today.getMonth() + 1 === monthStat.monthIndex && today.getFullYear() === selectedYear;

                return (
                  <div
                    key={`m-${monthStat.monthIndex}`}
                    className="flex flex-col items-center justify-end h-full group relative"
                    title={`${monthStat.monthName} ${selectedYear}: ${monthStat.count} Inspeksi (Rigid: ${monthStat.rigid}, Artic: ${monthStat.artic})`}
                  >
                    <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 bg-[#111113] border border-[#facc15] text-[#facc15] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap z-20 transition">
                      {monthStat.count} Unit
                    </div>

                    <div
                      className={`w-full rounded transition-all duration-200 ${
                        monthStat.count > 0
                          ? isCurrentMonth
                            ? 'bg-[#4ade80] ring-1 ring-[#4ade80]'
                            : 'bg-[#facc15] hover:bg-[#fde047]'
                          : 'bg-[#111113] border border-[rgba(242,239,235,0.06)]'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className={`text-[10px] font-mono mt-1 ${isCurrentMonth ? 'text-[#4ade80] font-bold' : 'text-[rgba(242,239,235,0.5)]'}`}>
                      {monthStat.monthName}
                    </span>
                    <span className="text-[9px] font-mono text-[rgba(242,239,235,0.3)]">
                      {monthStat.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Fleet Coverage Matrix (Cakupan Armada Yang Sudah & Belum Diinspeksi) */}
      <div className="bg-[#18181b] p-4 sm:p-5 rounded border border-[rgba(242,239,235,0.1)] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(242,239,235,0.08)] pb-3">
          <div>
            <h3 className="font-syne font-extrabold text-sm sm:text-base uppercase text-[#f2efeb]">
              Cakupan Armada & Status Inspeksi ({filteredCodeUnits.length} Unit Terdaftar)
            </h3>
            <p className="text-xs text-[rgba(242,239,235,0.5)] font-mono mt-0.5">
              Daftar unit yang telah dan belum menyelesaikan inspeksi harian periode {periodLabel}
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[rgba(242,239,235,0.4)] absolute left-2.5 top-2" />
              <input
                type="text"
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                placeholder="Cari Code Unit, EGI, PIC..."
                className="bg-[#111113] border border-[rgba(242,239,235,0.15)] rounded pl-8 pr-2.5 py-1 text-xs font-mono text-[#f2efeb] placeholder-[rgba(242,239,235,0.4)] outline-none focus:border-[#facc15] w-44"
              />
            </div>

            <div className="flex items-center space-x-1 bg-[#111113] p-0.5 rounded border border-[rgba(242,239,235,0.1)] text-xs font-mono">
              {(['ALL', 'INSPECTED', 'UNINSPECTED'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setTableStatusFilter(st)}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition ${
                    tableStatusFilter === st
                      ? 'bg-[#18181b] text-[#facc15] border border-[#facc15]/30'
                      : 'text-[rgba(242,239,235,0.5)] hover:text-[#f2efeb]'
                  }`}
                >
                  {st === 'ALL'
                    ? `Semua (${filteredCodeUnits.length})`
                    : st === 'INSPECTED'
                    ? `Sudah (${uniqueInspectedCount})`
                    : `Belum (${uninspectedUnitsList.length})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[rgba(242,239,235,0.1)] text-[10px] uppercase text-[rgba(242,239,235,0.5)]">
                <th className="py-2.5 px-3">Code Unit</th>
                <th className="py-2.5 px-3">EGI & Tipe Alat</th>
                <th className="py-2.5 px-3">Status Inspeksi</th>
                <th className="py-2.5 px-3">Kondisi Fisik</th>
                <th className="py-2.5 px-3">PIC Mekanik</th>
                <th className="py-2.5 px-3">Waktu Inspeksi</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(242,239,235,0.06)]">
              {fleetTableRows.map((row, rIdx) => {
                return (
                  <tr
                    key={`${row.unit.id}-${row.unit.codeUnit}-${rIdx}`}
                    className="hover:bg-[rgba(242,239,235,0.02)] transition"
                  >
                    <td className="py-2.5 px-3 font-bold text-[#f2efeb]">
                      <span className="font-syne font-extrabold text-sm">{row.unit.codeUnit}</span>
                      <span className="text-[10px] text-[rgba(242,239,235,0.4)] block font-mono">
                        PIT: {row.unit.lokasiPit}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-[rgba(242,239,235,0.7)]">
                      <span className="font-bold text-[#f2efeb]">{row.unit.brand} {row.unit.egi}</span>
                      <span className="text-[10px] text-[rgba(242,239,235,0.4)] block">
                        {row.unit.tipeAlat}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      {row.isInspected ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SUDAH DIINSPEKSI</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#fb7185]/15 text-[#fb7185] border border-[#fb7185]/30">
                          <XCircle className="w-3 h-3" />
                          <span>BELUM DIINSPEKSI</span>
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {row.isInspected ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            row.inspection?.status === 'RUNNING'
                              ? 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30'
                              : row.inspection?.status === 'BREAKDOWN'
                              ? 'bg-[#fb7185]/10 text-[#fb7185] border-[#fb7185]/30'
                              : 'bg-[#facc15]/10 text-[#facc15] border-[#facc15]/30'
                          }`}
                        >
                          {row.inspection?.status || 'RUNNING'}
                        </span>
                      ) : (
                        <span className="text-[rgba(242,239,235,0.4)] text-[11px]">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-[rgba(242,239,235,0.8)]">
                      {row.inspection?.picMekanik || '-'}
                    </td>

                    <td className="py-2.5 px-3 text-[rgba(242,239,235,0.6)]">
                      {row.inspection ? (
                        <span>
                          {row.inspection.startTime || '-'} - {row.inspection.finishTime || '-'}
                          {row.inspection.totalJam && ` (${row.inspection.totalJam})`}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {!row.isInspected ? (
                        <button
                          onClick={() => handleStartInspection(row.unit)}
                          className="px-2.5 py-1 rounded bg-[#facc15] hover:bg-[#fde047] text-[#111113] text-[10px] font-mono font-black uppercase tracking-wider transition active:scale-95 inline-flex items-center space-x-1"
                          title="Buka form inspeksi harian untuk unit ini"
                        >
                          <span>+ Inspeksi</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#4ade80] font-bold">Lengkap</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {fleetTableRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[rgba(242,239,235,0.4)] font-mono text-xs">
                    Tidak ada data armada yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Leaderboard & Supervisor Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Top Mechanics Leaderboard */}
        <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] space-y-3">
          <div className="flex items-center justify-between border-b border-[rgba(242,239,235,0.08)] pb-2">
            <span className="font-syne font-extrabold text-sm uppercase text-[#f2efeb]">
              Leaderboard PIC Mekanik Teraktif
            </span>
            <span className="text-[10px] font-mono text-[#facc15]">Periode {periodLabel}</span>
          </div>

          <div className="space-y-2">
            {mechanicLeaderboard.map((m, idx) => (
              <div
                key={m.name}
                className="flex items-center justify-between p-2 rounded bg-[#111113] border border-[rgba(242,239,235,0.06)]"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded bg-[rgba(250,204,21,0.1)] text-[#facc15] font-mono font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-xs text-[#f2efeb] block">{m.name}</span>
                    <span className="text-[10px] font-mono text-[rgba(242,239,235,0.5)]">
                      {m.defects} Temuan Deviasi
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-[#4ade80]">{m.count}</span>
                  <span className="text-[10px] font-mono text-[rgba(242,239,235,0.4)] block uppercase">Unit Selesai</span>
                </div>
              </div>
            ))}

            {mechanicLeaderboard.length === 0 && (
              <div className="text-center py-6 text-xs text-[rgba(242,239,235,0.4)] font-mono">
                Belum ada data pengerjaan mekanik pada periode ini.
              </div>
            )}
          </div>
        </div>

        {/* Operational Quality Insights */}
        <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] space-y-3">
          <div className="flex items-center justify-between border-b border-[rgba(242,239,235,0.08)] pb-2">
            <span className="font-syne font-extrabold text-sm uppercase text-[#f2efeb]">
              Ringkasan Kesiapan & Mutu Kelayakan
            </span>
            <span className="text-[10px] font-mono text-[#4ade80]">Plant 2 Systematic</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-[#111113] border border-[rgba(242,239,235,0.06)] flex items-center justify-between">
              <span className="text-[rgba(242,239,235,0.7)]">Tingkat Ketersediaan Fisik (PA Est.):</span>
              <span className="font-bold text-sm text-[#4ade80]">
                {totalTargetUnits > 0 ? ((runningUnitsCount / totalTargetUnits) * 100).toFixed(1) : 0}%
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#111113] border border-[rgba(242,239,235,0.06)] flex items-center justify-between">
              <span className="text-[rgba(242,239,235,0.7)]">Rata-rata Defect per Unit Inspeksi:</span>
              <span className="font-bold text-sm text-[#facc15]">
                {uniqueInspectedCount > 0 ? (totalDefectsCount / uniqueInspectedCount).toFixed(1) : '0.0'} Defect
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#111113] border border-[rgba(242,239,235,0.06)] flex items-center justify-between">
              <span className="text-[rgba(242,239,235,0.7)]">Rasio Konversi Backlog Sparepart:</span>
              <span className="font-bold text-sm text-[#fb7185]">
                {totalDefectsCount > 0 ? Math.round((connectedBacklogsCount / totalDefectsCount) * 100) : 0}%
              </span>
            </div>

            <div className="p-2 rounded bg-[rgba(250,204,21,0.06)] border border-[#facc15]/20 text-[11px] text-[rgba(242,239,235,0.8)] mt-2">
              <span className="font-bold text-[#facc15] block uppercase mb-0.5">Catatan Operasional:</span>
              <span>
                Pastikan seluruh armada bertanda <strong className="text-[#fb7185]">BELUM DIINSPEKSI</strong> diselesaikan sebelum awal pergantian shift untuk memenuhi kepatuhan standar keselamatan tambang PT. Pamapersada Nusantara.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
