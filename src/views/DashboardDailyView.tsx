import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Truck,
  Tractor,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Printer,
  Wrench,
  AlertOctagon,
  XCircle,
  FileCheck,
  FileWarning,
  Search,
  Users,
  Zap,
  ShieldCheck,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { WhatsAppGroupShareModal } from '../components/WhatsAppGroupShareModal';
import {
  DailyCheckRigid,
  DailyCheckArtic,
  CodeUnit,
  BAPRecord,
  BacklogItem,
  AddActivityItem,
  QAType,
} from '../types';
import {
  shareToWhatsApp,
  formatDashboardAchievementWhatsApp,
  DashboardAchievementSummary,
} from '../utils/whatsappFormatter';
import { isRigidUnitCode, isArticUnitCode } from '../utils/unitFilter';
import { getAppSettings } from '../services/settingsService';

interface DashboardDailyViewProps {
  dailyRigidList: DailyCheckRigid[];
  dailyArticList: DailyCheckArtic[];
  codeUnits: CodeUnit[];
  bapList?: BAPRecord[];
  backlogs?: BacklogItem[];
  activities?: AddActivityItem[];
  onOpenRigidForUnit?: (codeUnit: string, qaType?: QAType) => void;
  onOpenArticForUnit?: (codeUnit: string, qaType?: QAType) => void;
  onNavigateToTab?: (tab: string) => void;
}

type PeriodType = 'HARIAN' | 'BULANAN' | 'TAHUNAN';
type ChartModule = 'INSPECTIONS' | 'BAP' | 'BACKLOG' | 'ACTIVITY';
type TableStatusFilter = 'ALL' | 'DAILY_DONE' | 'DAILY_PENDING' | 'QA_DONE' | 'HAS_ISSUE';

interface ParsedDateParts {
  day: number;
  month: number;
  year: number;
  iso: string;
}

function parseDateParts(dateStr?: string, fallbackIso?: string): ParsedDateParts | null {
  const tryParse = (raw?: string): ParsedDateParts | null => {
    if (!raw || typeof raw !== 'string') return null;
    const clean = raw.trim();
    if (!clean) return null;

    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length === 3) {
        let d = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        const yRaw = parseInt(parts[2], 10);
        const y = yRaw < 100 ? 2000 + yRaw : yRaw;
        if (m > 12 && d <= 12) {
          const tmp = d;
          d = m;
          m = tmp;
        }
        if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          return {
            day: d,
            month: m,
            year: y,
            iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          };
        }
      }
    }

    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length >= 3) {
        if (parts[0].length === 4) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2].slice(0, 2), 10);
          if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return {
              day: d,
              month: m,
              year: y,
              iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            };
          }
        } else {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const y = parseInt(parts[2].slice(0, 4), 10);
          if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return {
              day: d,
              month: m,
              year: y,
              iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            };
          }
        }
      }
    }
    return null;
  };

  return tryParse(dateStr) || tryParse(fallbackIso);
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const matchesSelectedPeriod = (
  p: ParsedDateParts | null,
  periodType: PeriodType,
  selectedDate: string,
  selectedMonth: number,
  selectedYear: number
): boolean => {
  if (!p) return false;
  if (periodType === 'HARIAN') {
    const target = parseDateParts(selectedDate);
    if (!target) return false;
    return p.day === target.day && p.month === target.month && p.year === target.year;
  }
  if (periodType === 'BULANAN') {
    return p.month === selectedMonth && p.year === selectedYear;
  }
  return p.year === selectedYear;
};

const extractHour = (timeStr?: string, createdAt?: string): number | null => {
  if (timeStr && /^\d{1,2}:/.test(timeStr.trim())) {
    const h = parseInt(timeStr.trim().split(':')[0], 10);
    if (!isNaN(h) && h >= 0 && h <= 23) return h;
  }
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) return d.getHours();
  }
  return null;
};

export const DashboardDailyView: React.FC<DashboardDailyViewProps> = ({
  dailyRigidList,
  dailyArticList,
  codeUnits,
  bapList = [],
  backlogs = [],
  activities = [],
  onOpenRigidForUnit,
  onOpenArticForUnit,
  onNavigateToTab,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => today.toISOString().slice(0, 10), [today]);

  // Timeframe state: HARIAN | BULANAN | TAHUNAN
  const [periodType, setPeriodType] = useState<PeriodType>(
    () => getAppSettings().dashboard.defaultPeriod || 'HARIAN'
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  // Fleet & Table filters
  const [fleetTypeFilter, setFleetTypeFilter] = useState<'ALL' | 'RIGID' | 'ARTIC'>('ALL');
  const [chartModule, setChartModule] = useState<ChartModule>('INSPECTIONS');
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState<TableStatusFilter>('ALL');
  const [groupShareText, setGroupShareText] = useState<string | null>(null);

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

  const handlePrevYear = () => setSelectedYear(y => y - 1);
  const handleNextYear = () => setSelectedYear(y => y + 1);

  // Fleet unit classification matching active menu rules (Rigid = DT, Artic = GR/CP/WL)
  const unitMatchesFleetFilter = (codeUnit?: string): boolean => {
    if (fleetTypeFilter === 'RIGID') return isRigidUnitCode(codeUnit);
    if (fleetTypeFilter === 'ARTIC') return isArticUnitCode(codeUnit);
    return true;
  };

  const rigidMasterUnits = useMemo(
    () => codeUnits.filter(u => isRigidUnitCode(u.codeUnit)),
    [codeUnits]
  );

  const articMasterUnits = useMemo(
    () => codeUnits.filter(u => isArticUnitCode(u.codeUnit)),
    [codeUnits]
  );

  const filteredCodeUnits = useMemo(
    () => codeUnits.filter(u => unitMatchesFleetFilter(u.codeUnit)),
    [codeUnits, fleetTypeFilter]
  );

  // Normalize & combine Rigid (DT) and Artic (GR/CP/WL) inspections with qaType & parsed date
  const combinedInspections = useMemo(() => {
    const rigids = dailyRigidList
      .filter(r => isRigidUnitCode(r.codeUnit))
      .map(r => ({
        ...r,
        qaTypeNormalized: (r.qaType || 'QA1_PRE') as QAType,
        fleetType: 'RIGID' as const,
        dateParts: parseDateParts(r.tanggal, r.createdAt),
      }));

    const artics = dailyArticList
      .filter(a => isArticUnitCode(a.codeUnit))
      .map(a => ({
        ...a,
        qaTypeNormalized: (a.qaType || 'QA1_PRE') as QAType,
        fleetType: 'ARTIC' as const,
        dateParts: parseDateParts(a.tanggal, a.createdAt),
      }));

    return [...rigids, ...artics];
  }, [dailyRigidList, dailyArticList]);

  // Period-filtered inspections
  const periodInspections = useMemo(() => {
    return combinedInspections.filter(item => {
      if (fleetTypeFilter === 'RIGID' && item.fleetType !== 'RIGID') return false;
      if (fleetTypeFilter === 'ARTIC' && item.fleetType !== 'ARTIC') return false;
      return matchesSelectedPeriod(
        item.dateParts,
        periodType,
        selectedDate,
        selectedMonth,
        selectedYear
      );
    });
  }, [combinedInspections, fleetTypeFilter, periodType, selectedDate, selectedMonth, selectedYear]);

  // Split by Category: Daily Check vs QA 1 Pre vs QA 7 Final
  const dailyCheckInspections = useMemo(
    () => periodInspections.filter(i => i.qaTypeNormalized === 'DAILY_INSPECTION'),
    [periodInspections]
  );
  const qa1Inspections = useMemo(
    () => periodInspections.filter(i => i.qaTypeNormalized === 'QA1_PRE'),
    [periodInspections]
  );
  const qa7Inspections = useMemo(
    () => periodInspections.filter(i => i.qaTypeNormalized === 'QA7_FINAL'),
    [periodInspections]
  );

  const dailyRigidInspections = useMemo(
    () => dailyCheckInspections.filter(i => i.fleetType === 'RIGID'),
    [dailyCheckInspections]
  );
  const dailyArticInspections = useMemo(
    () => dailyCheckInspections.filter(i => i.fleetType === 'ARTIC'),
    [dailyCheckInspections]
  );

  const qa1RigidInspections = useMemo(
    () => qa1Inspections.filter(i => i.fleetType === 'RIGID'),
    [qa1Inspections]
  );
  const qa1ArticInspections = useMemo(
    () => qa1Inspections.filter(i => i.fleetType === 'ARTIC'),
    [qa1Inspections]
  );

  const qa7RigidInspections = useMemo(
    () => qa7Inspections.filter(i => i.fleetType === 'RIGID'),
    [qa7Inspections]
  );
  const qa7ArticInspections = useMemo(
    () => qa7Inspections.filter(i => i.fleetType === 'ARTIC'),
    [qa7Inspections]
  );

  // Unique unit coverage for Daily Check, QA 1, QA 7
  const uniqueDailyRigidUnits = useMemo(
    () => new Set(dailyRigidInspections.map(i => i.codeUnit.trim().toUpperCase())),
    [dailyRigidInspections]
  );
  const uniqueDailyArticUnits = useMemo(
    () => new Set(dailyArticInspections.map(i => i.codeUnit.trim().toUpperCase())),
    [dailyArticInspections]
  );
  const uniqueQa1RigidUnits = useMemo(
    () => new Set(qa1RigidInspections.map(i => i.codeUnit.trim().toUpperCase())),
    [qa1RigidInspections]
  );
  const uniqueQa1ArticUnits = useMemo(
    () => new Set(qa1ArticInspections.map(i => i.codeUnit.trim().toUpperCase())),
    [qa1ArticInspections]
  );
  const uniqueQa7RigidUnits = useMemo(
    () => new Set(qa7RigidInspections.map(i => i.codeUnit.trim().toUpperCase())),
    [qa7RigidInspections]
  );
  const uniqueQa7ArticUnits = useMemo(
    () => new Set(qa7ArticInspections.map(i => i.codeUnit.trim().toUpperCase())),
    [qa7ArticInspections]
  );

  // Overall Daily Check target & achievement
  const dailyTargetUnits = useMemo(() => {
    if (fleetTypeFilter === 'RIGID') return rigidMasterUnits;
    if (fleetTypeFilter === 'ARTIC') return articMasterUnits;
    const merged = [...rigidMasterUnits, ...articMasterUnits];
    return merged.length > 0 ? merged : filteredCodeUnits;
  }, [fleetTypeFilter, rigidMasterUnits, articMasterUnits, filteredCodeUnits]);

  const dailyInspectedUnitKeys = useMemo(() => {
    const s = new Set<string>();
    dailyCheckInspections.forEach(i => s.add(i.codeUnit.trim().toUpperCase()));
    return s;
  }, [dailyCheckInspections]);

  const dailyCoveredTargetCount = useMemo(
    () => dailyTargetUnits.filter(u => dailyInspectedUnitKeys.has(u.codeUnit.trim().toUpperCase())).length,
    [dailyTargetUnits, dailyInspectedUnitKeys]
  );

  const dailyAchievementRate =
    dailyTargetUnits.length > 0
      ? Math.min(100, (dailyCoveredTargetCount / dailyTargetUnits.length) * 100)
      : 0;

  const dailyRigidRate =
    rigidMasterUnits.length > 0
      ? Math.min(100, (uniqueDailyRigidUnits.size / rigidMasterUnits.length) * 100)
      : 0;

  const dailyArticRate =
    articMasterUnits.length > 0
      ? Math.min(100, (uniqueDailyArticUnits.size / articMasterUnits.length) * 100)
      : 0;

  // Map any inspection (Daily / QA1 / QA7) per unit for status summary
  const inspectedUnitsMap = useMemo(() => {
    const map = new Map<string, (typeof periodInspections)[0]>();
    periodInspections.forEach(item => {
      const key = item.codeUnit.trim().toUpperCase();
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
    return map;
  }, [periodInspections]);

  const uniqueAnyInspectedCount = inspectedUnitsMap.size;
  const uninspectedDailyUnits = useMemo(
    () => dailyTargetUnits.filter(u => !dailyInspectedUnitKeys.has(u.codeUnit.trim().toUpperCase())),
    [dailyTargetUnits, dailyInspectedUnitKeys]
  );

  // Period-filtered BAP
  const parsedBaps = useMemo(
    () =>
      bapList
        .filter(b => unitMatchesFleetFilter(b.codeUnit))
        .map(b => ({ ...b, dateParts: parseDateParts(b.tanggal, b.createdAt) })),
    [bapList, fleetTypeFilter]
  );

  const periodBaps = useMemo(
    () =>
      parsedBaps.filter(b =>
        matchesSelectedPeriod(b.dateParts, periodType, selectedDate, selectedMonth, selectedYear)
      ),
    [parsedBaps, periodType, selectedDate, selectedMonth, selectedYear]
  );

  const bapStats = useMemo(() => {
    const open = periodBaps.filter(b => b.status === 'OPEN').length;
    const inProgress = periodBaps.filter(b => b.status === 'IN_PROGRESS').length;
    const completed = periodBaps.filter(b => b.status === 'COMPLETED').length;
    const total = periodBaps.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, open, inProgress, completed, completionRate };
  }, [periodBaps]);

  // Period-filtered Backlog
  const parsedBacklogs = useMemo(
    () =>
      backlogs
        .filter(b => unitMatchesFleetFilter(b.codeUnit))
        .map(b => ({ ...b, dateParts: parseDateParts(b.tanggalTemuan, b.createdAt) })),
    [backlogs, fleetTypeFilter]
  );

  const periodBacklogs = useMemo(
    () =>
      parsedBacklogs.filter(b =>
        matchesSelectedPeriod(b.dateParts, periodType, selectedDate, selectedMonth, selectedYear)
      ),
    [parsedBacklogs, periodType, selectedDate, selectedMonth, selectedYear]
  );

  const backlogStats = useMemo(() => {
    const waiting = periodBacklogs.filter(b => b.status === 'WAITING_PART').length;
    const ready = periodBacklogs.filter(b => b.status === 'READY_TO_INSTALL').length;
    const scheduled = periodBacklogs.filter(b => b.status === 'SCHEDULED').length;
    const closed = periodBacklogs.filter(b => b.status === 'CLOSED').length;
    const total = periodBacklogs.length;
    const closedRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    return { total, waiting, ready, scheduled, closed, closedRate };
  }, [periodBacklogs]);

  // Period-filtered Add Activity
  const parsedActivities = useMemo(
    () =>
      activities
        .filter(a => unitMatchesFleetFilter(a.codeUnit))
        .map(a => ({ ...a, dateParts: parseDateParts(a.tanggalTemuan, a.createdAt) })),
    [activities, fleetTypeFilter]
  );

  const periodActivities = useMemo(
    () =>
      parsedActivities.filter(a =>
        matchesSelectedPeriod(a.dateParts, periodType, selectedDate, selectedMonth, selectedYear)
      ),
    [parsedActivities, periodType, selectedDate, selectedMonth, selectedYear]
  );

  const activityStats = useMemo(() => {
    const done = periodActivities.filter(a => a.status === 'DONE').length;
    const closed = periodActivities.filter(a => a.status === 'CLOSED').length;
    const monitoring = periodActivities.filter(a => a.status === 'MONITORING').length;
    const pending = periodActivities.filter(a => a.status === 'PENDING').length;
    const total = periodActivities.length;
    const finishedCount = done + closed;
    const finishRate = total > 0 ? Math.round((finishedCount / total) * 100) : 0;
    return { total, done, closed, monitoring, pending, finishedCount, finishRate };
  }, [periodActivities]);

  // Unit readiness & checklist defects in period
  const latestUnitInspectionMap = useMemo(() => {
    const map = new Map<string, (typeof periodInspections)[0]>();
    periodInspections.forEach(item => {
      const key = item.codeUnit.trim().toUpperCase();
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
    return map;
  }, [periodInspections]);

  const runningUnitsCount = useMemo(
    () =>
      Array.from(latestUnitInspectionMap.values()).filter(i => i.status === 'RUNNING').length,
    [latestUnitInspectionMap]
  );
  const breakdownUnitsCount = useMemo(
    () =>
      Array.from(latestUnitInspectionMap.values()).filter(i => i.status === 'BREAKDOWN').length,
    [latestUnitInspectionMap]
  );
  const standbyUnitsCount = useMemo(
    () =>
      Array.from(latestUnitInspectionMap.values()).filter(
        i => i.status === 'STANDBY' || i.status === 'SCHEDULED_SERVICE'
      ).length,
    [latestUnitInspectionMap]
  );

  const rigidInspectionsCount = periodInspections.filter(i => i.fleetType === 'RIGID').length;
  const articInspectionsCount = periodInspections.filter(i => i.fleetType === 'ARTIC').length;

  const totalDefectsCount = useMemo(() => {
    return periodInspections.reduce((total, insp) => {
      const defects = (insp.items || []).filter(item => item.status === 'DEFECT').length;
      return total + defects;
    }, 0);
  }, [periodInspections]);

  // Period label
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

  // Chart Stats across Harian / Bulanan / Tahunan for selected ChartModule
  const chartDataPoints = useMemo(() => {
    if (periodType === 'HARIAN') {
      const slots = [
        { label: '00-06', range: [0, 6] },
        { label: '06-08', range: [6, 8] },
        { label: '08-10', range: [8, 10] },
        { label: '10-12', range: [10, 12] },
        { label: '12-14', range: [12, 14] },
        { label: '14-16', range: [14, 16] },
        { label: '16-18', range: [16, 18] },
        { label: '18-24', range: [18, 24] },
      ];

      return slots.map(slot => {
        const inRange = (h: number | null) =>
          h !== null && h >= slot.range[0] && h < slot.range[1];

        if (chartModule === 'BAP') {
          const matches = periodBaps.filter(b => inRange(extractHour(b.jam, b.createdAt)));
          return {
            key: slot.label,
            label: slot.label,
            count: matches.length,
            tooltip: `${slot.label}: ${matches.length} BAP`,
            isCurrent: false,
          };
        }
        if (chartModule === 'BACKLOG') {
          const matches = periodBacklogs.filter(b => inRange(extractHour(undefined, b.createdAt)));
          return {
            key: slot.label,
            label: slot.label,
            count: matches.length,
            tooltip: `${slot.label}: ${matches.length} Backlog`,
            isCurrent: false,
          };
        }
        if (chartModule === 'ACTIVITY') {
          const matches = periodActivities.filter(a => inRange(extractHour(undefined, a.createdAt)));
          return {
            key: slot.label,
            label: slot.label,
            count: matches.length,
            tooltip: `${slot.label}: ${matches.length} Activity`,
            isCurrent: false,
          };
        }

        const matches = periodInspections.filter(item =>
          inRange(extractHour(item.startTime || item.finishTime, item.createdAt))
        );
        const dailyC = matches.filter(m => m.qaTypeNormalized === 'DAILY_INSPECTION').length;
        const qaC = matches.filter(m => m.qaTypeNormalized !== 'DAILY_INSPECTION').length;
        return {
          key: slot.label,
          label: slot.label,
          count: matches.length,
          tooltip: `${slot.label}: ${matches.length} Form (Daily: ${dailyC}, QA1/QA7: ${qaC})`,
          isCurrent: false,
        };
      });
    }

    if (periodType === 'BULANAN') {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const points: Array<{
        key: string;
        label: string;
        count: number;
        tooltip: string;
        isCurrent: boolean;
      }> = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const isCurrentDay =
          today.getDate() === d &&
          today.getMonth() + 1 === selectedMonth &&
          today.getFullYear() === selectedYear;

        if (chartModule === 'BAP') {
          const c = periodBaps.filter(b => b.dateParts?.day === d).length;
          points.push({
            key: `day-${d}`,
            label: String(d),
            count: c,
            tooltip: `Tgl ${d} ${MONTH_NAMES[selectedMonth - 1]}: ${c} BAP`,
            isCurrent: isCurrentDay,
          });
        } else if (chartModule === 'BACKLOG') {
          const c = periodBacklogs.filter(b => b.dateParts?.day === d).length;
          points.push({
            key: `day-${d}`,
            label: String(d),
            count: c,
            tooltip: `Tgl ${d} ${MONTH_NAMES[selectedMonth - 1]}: ${c} Backlog`,
            isCurrent: isCurrentDay,
          });
        } else if (chartModule === 'ACTIVITY') {
          const c = periodActivities.filter(a => a.dateParts?.day === d).length;
          points.push({
            key: `day-${d}`,
            label: String(d),
            count: c,
            tooltip: `Tgl ${d} ${MONTH_NAMES[selectedMonth - 1]}: ${c} Activity`,
            isCurrent: isCurrentDay,
          });
        } else {
          const matches = periodInspections.filter(i => i.dateParts?.day === d);
          const dailyC = matches.filter(m => m.qaTypeNormalized === 'DAILY_INSPECTION').length;
          const qa1C = matches.filter(m => m.qaTypeNormalized === 'QA1_PRE').length;
          const qa7C = matches.filter(m => m.qaTypeNormalized === 'QA7_FINAL').length;
          points.push({
            key: `day-${d}`,
            label: String(d),
            count: matches.length,
            tooltip: `Tgl ${d}: ${matches.length} Form (Daily: ${dailyC}, QA1: ${qa1C}, QA7: ${qa7C})`,
            isCurrent: isCurrentDay,
          });
        }
      }
      return points;
    }

    // TAHUNAN (12 Months)
    return MONTH_NAMES.map((mName, idx) => {
      const m = idx + 1;
      const isCurrentMonth =
        today.getMonth() + 1 === m && today.getFullYear() === selectedYear;

      const matchMonth = (p: ParsedDateParts | null) =>
        p && p.year === selectedYear && p.month === m;

      if (chartModule === 'BAP') {
        const c = parsedBaps.filter(b => matchMonth(b.dateParts)).length;
        return {
          key: `m-${m}`,
          label: mName.slice(0, 3),
          count: c,
          tooltip: `${mName} ${selectedYear}: ${c} BAP`,
          isCurrent: isCurrentMonth,
        };
      }
      if (chartModule === 'BACKLOG') {
        const c = parsedBacklogs.filter(b => matchMonth(b.dateParts)).length;
        return {
          key: `m-${m}`,
          label: mName.slice(0, 3),
          count: c,
          tooltip: `${mName} ${selectedYear}: ${c} Backlog`,
          isCurrent: isCurrentMonth,
        };
      }
      if (chartModule === 'ACTIVITY') {
        const c = parsedActivities.filter(a => matchMonth(a.dateParts)).length;
        return {
          key: `m-${m}`,
          label: mName.slice(0, 3),
          count: c,
          tooltip: `${mName} ${selectedYear}: ${c} Activity`,
          isCurrent: isCurrentMonth,
        };
      }

      const matches = combinedInspections.filter(i => {
        if (fleetTypeFilter === 'RIGID' && i.fleetType !== 'RIGID') return false;
        if (fleetTypeFilter === 'ARTIC' && i.fleetType !== 'ARTIC') return false;
        return matchMonth(i.dateParts);
      });
      const dailyC = matches.filter(x => x.qaTypeNormalized === 'DAILY_INSPECTION').length;
      const qa1C = matches.filter(x => x.qaTypeNormalized === 'QA1_PRE').length;
      const qa7C = matches.filter(x => x.qaTypeNormalized === 'QA7_FINAL').length;
      return {
        key: `m-${m}`,
        label: mName.slice(0, 3),
        count: matches.length,
        tooltip: `${mName} ${selectedYear}: ${matches.length} Form (Daily: ${dailyC}, QA1: ${qa1C}, QA7: ${qa7C})`,
        isCurrent: isCurrentMonth,
      };
    });
  }, [
    periodType,
    chartModule,
    selectedMonth,
    selectedYear,
    today,
    periodBaps,
    periodBacklogs,
    periodActivities,
    periodInspections,
    parsedBaps,
    parsedBacklogs,
    parsedActivities,
    combinedInspections,
    fleetTypeFilter,
  ]);

  // Rangkuman Monitoring Status Inspeksi Unit (per-unit matrix for the selected period)
  const unitMonitoringRows = useMemo(() => {
    return filteredCodeUnits
      .map(unit => {
        const key = unit.codeUnit.trim().toUpperCase();
        const unitInspections = periodInspections.filter(
          i => i.codeUnit.trim().toUpperCase() === key
        );
        const dailyList = unitInspections.filter(i => i.qaTypeNormalized === 'DAILY_INSPECTION');
        const qa1List = unitInspections.filter(i => i.qaTypeNormalized === 'QA1_PRE');
        const qa7List = unitInspections.filter(i => i.qaTypeNormalized === 'QA7_FINAL');
        const unitBaps = periodBaps.filter(b => b.codeUnit.trim().toUpperCase() === key);
        const unitBacklogs = periodBacklogs.filter(b => b.codeUnit.trim().toUpperCase() === key);
        const unitActivities = periodActivities.filter(a => a.codeUnit.trim().toUpperCase() === key);

        const latestInsp = dailyList[0] || qa7List[0] || qa1List[0] || null;
        const hasOpenBap = unitBaps.some(b => b.status !== 'COMPLETED');
        const openBacklogCount = unitBacklogs.filter(b => b.status !== 'CLOSED').length;
        const fleetCategory = isRigidUnitCode(unit.codeUnit)
          ? 'RIGID (DT)'
          : isArticUnitCode(unit.codeUnit)
          ? 'ARTIC (GR/CP/WL)'
          : unit.tipeAlat || 'LAINNYA';

        return {
          unit,
          fleetCategory,
          dailyCount: dailyList.length,
          qa1Count: qa1List.length,
          qa7Count: qa7List.length,
          bapCount: unitBaps.length,
          hasOpenBap,
          backlogCount: unitBacklogs.length,
          openBacklogCount,
          activityCount: unitActivities.length,
          latestInspection: latestInsp,
          hasDaily: dailyList.length > 0,
          hasQa: qa1List.length > 0 || qa7List.length > 0,
          hasIssue:
            hasOpenBap ||
            openBacklogCount > 0 ||
            latestInsp?.status === 'BREAKDOWN',
        };
      })
      .filter(row => {
        const q = tableSearch.trim().toLowerCase();
        const matchesSearch =
          !q ||
          row.unit.codeUnit.toLowerCase().includes(q) ||
          row.unit.egi.toLowerCase().includes(q) ||
          row.unit.tipeAlat.toLowerCase().includes(q) ||
          (row.latestInspection?.picMekanik || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;

        if (tableStatusFilter === 'DAILY_DONE') return row.hasDaily;
        if (tableStatusFilter === 'DAILY_PENDING') return !row.hasDaily;
        if (tableStatusFilter === 'QA_DONE') return row.hasQa;
        if (tableStatusFilter === 'HAS_ISSUE') return row.hasIssue;
        return true;
      });
  }, [
    filteredCodeUnits,
    periodInspections,
    periodBaps,
    periodBacklogs,
    periodActivities,
    tableSearch,
    tableStatusFilter,
  ]);

  // Unit Inspection Summary Strip counts
  const unitSummaryStrip = useMemo(() => {
    const total = filteredCodeUnits.length;
    let dailyDone = 0;
    let qa1Done = 0;
    let qa7Done = 0;
    let bapUnits = 0;
    let backlogUnits = 0;
    let activityUnits = 0;

    filteredCodeUnits.forEach(u => {
      const key = u.codeUnit.trim().toUpperCase();
      if (periodInspections.some(i => i.codeUnit.trim().toUpperCase() === key && i.qaTypeNormalized === 'DAILY_INSPECTION')) dailyDone++;
      if (periodInspections.some(i => i.codeUnit.trim().toUpperCase() === key && i.qaTypeNormalized === 'QA1_PRE')) qa1Done++;
      if (periodInspections.some(i => i.codeUnit.trim().toUpperCase() === key && i.qaTypeNormalized === 'QA7_FINAL')) qa7Done++;
      if (periodBaps.some(b => b.codeUnit.trim().toUpperCase() === key)) bapUnits++;
      if (periodBacklogs.some(b => b.codeUnit.trim().toUpperCase() === key)) backlogUnits++;
      if (periodActivities.some(a => a.codeUnit.trim().toUpperCase() === key)) activityUnits++;
    });

    return {
      total,
      dailyDone,
      dailyPending: Math.max(0, total - dailyDone),
      qa1Done,
      qa7Done,
      bapUnits,
      backlogUnits,
      activityUnits,
    };
  }, [filteredCodeUnits, periodInspections, periodBaps, periodBacklogs, periodActivities]);

  // Mechanics Leaderboard (Inspections + Activities in period)
  const mechanicLeaderboard = useMemo(() => {
    const counter = new Map<string, { inspections: number; activities: number; defects: number }>();
    periodInspections.forEach(item => {
      const pic = (item.picMekanik || 'Mekanik').trim();
      const cur = counter.get(pic) || { inspections: 0, activities: 0, defects: 0 };
      const defectCount = (item.items || []).filter(i => i.status === 'DEFECT').length;
      counter.set(pic, {
        inspections: cur.inspections + 1,
        activities: cur.activities,
        defects: cur.defects + defectCount,
      });
    });
    periodActivities.forEach(act => {
      const pic = (act.pic || 'Mekanik').trim();
      const cur = counter.get(pic) || { inspections: 0, activities: 0, defects: 0 };
      counter.set(pic, {
        ...cur,
        activities: cur.activities + 1,
      });
    });
    return Array.from(counter.entries())
      .map(([name, data]) => ({ name, ...data, totalScore: data.inspections + data.activities }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5);
  }, [periodInspections, periodActivities]);

  // Build WhatsApp Summary Payload
  const buildWhatsAppSummary = (): DashboardAchievementSummary => ({
    periodType,
    periodLabel,
    totalUnits: dailyTargetUnits.length,
    inspectedUnitsCount: dailyCoveredTargetCount,
    uninspectedUnitsCount: uninspectedDailyUnits.length,
    totalInspections: periodInspections.length,
    achievementRate: dailyAchievementRate,
    rigidCount: rigidInspectionsCount,
    articCount: articInspectionsCount,
    dailyRigidCount: dailyRigidInspections.length,
    dailyArticCount: dailyArticInspections.length,
    qa1RigidCount: qa1RigidInspections.length,
    qa1ArticCount: qa1ArticInspections.length,
    qa7RigidCount: qa7RigidInspections.length,
    qa7ArticCount: qa7ArticInspections.length,
    bapTotal: bapStats.total,
    bapOpen: bapStats.open,
    bapInProgress: bapStats.inProgress,
    bapCompleted: bapStats.completed,
    backlogTotal: backlogStats.total,
    backlogWaiting: backlogStats.waiting,
    backlogReady: backlogStats.ready,
    backlogScheduled: backlogStats.scheduled,
    backlogClosed: backlogStats.closed,
    activityTotal: activityStats.total,
    activityDone: activityStats.done,
    activityClosed: activityStats.closed,
    activityMonitoring: activityStats.monitoring,
    activityPending: activityStats.pending,
    runningCount: runningUnitsCount,
    breakdownCount: breakdownUnitsCount,
    standbyCount: standbyUnitsCount,
    defectItemsCount: totalDefectsCount,
    backlogCount: backlogStats.total,
    activityCount: activityStats.total,
    uninspectedUnitCodes: uninspectedDailyUnits.map(u => u.codeUnit),
  });

  const handleShareWhatsApp = () => {
    const text = formatDashboardAchievementWhatsApp(buildWhatsAppSummary());
    shareToWhatsApp(text, {
      title: `Dashboard Pencapaian ${periodType} - Plant 2 MTBU`,
    });
  };

  const handleOpenGroupShare = () => {
    setGroupShareText(formatDashboardAchievementWhatsApp(buildWhatsAppSummary()));
  };

  const handleStartInspection = (unit: CodeUnit, qaType: QAType = 'DAILY_INSPECTION') => {
    const isRigid =
      isRigidUnitCode(unit.codeUnit) ||
      (!isArticUnitCode(unit.codeUnit) &&
        (unit.tipeAlat.toLowerCase().includes('rigid') ||
          unit.egi.includes('777') ||
          unit.egi.includes('785')));

    if (isRigid && onOpenRigidForUnit) {
      onOpenRigidForUnit(unit.codeUnit, qaType);
    } else if (!isRigid && onOpenArticForUnit) {
      onOpenArticForUnit(unit.codeUnit, qaType);
    }
  };

  const chartActiveTotal = chartDataPoints.reduce((sum, pt) => sum + pt.count, 0);
  const maxChartCount = Math.max(...chartDataPoints.map(pt => pt.count), 1);

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header & Action Controls */}
      <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[10px] text-[rgba(242,239,235,0.5)] uppercase tracking-wider">
              Category:
            </span>
            <span className="font-syne font-extrabold text-base sm:text-lg text-[#f2efeb] tracking-tight uppercase">
              DASHBOARD PENCAPAIAN &amp; MONITORING PLANT 2
            </span>
          </div>
          <p className="text-xs text-[rgba(242,239,235,0.5)] font-mono mt-0.5">
            Daily Check, QA 1 &amp; QA 7 (Rigid DT &amp; Artic GR/CP/WL), BAP, Backlog, Add Activity &amp; Status Unit • {periodLabel}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2 rounded bg-[#4ade80] hover:bg-[#22c55e] text-[#111113] text-xs font-mono font-black uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95 shadow-md shadow-[#4ade80]/20"
            title="Kirim ringkasan capaian ke WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Share WA</span>
          </button>

          <button
            onClick={handleOpenGroupShare}
            className="px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-black uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95 shadow-md shadow-emerald-600/20"
            title="Share langsung ke Group WhatsApp"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Group WA</span>
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

      {/* Control Bar: Harian / Bulanan / Tahunan Toggle + Date Pickers + Fleet Filter */}
      <div className="bg-[#18181b] p-3 rounded border border-[rgba(242,239,235,0.1)] flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                {f === 'ALL' ? 'Semua' : f === 'RIGID' ? 'Rigid (DT)' : 'Artic (GR/CP/WL)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 1 & 2: DAILY CHECK vs QA 1 & QA 7 (RIGID DT & ARTIC GR/CP/WL) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* 1. DAILY CHECK PENCAPAIAN */}
        <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] space-y-3">
          <div className="flex items-center justify-between border-b border-[rgba(242,239,235,0.08)] pb-2.5">
            <div className="flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-[#facc15]" />
              <div>
                <h3 className="font-syne font-extrabold text-sm uppercase text-[#f2efeb]">
                  1. Pencapaian Daily Check (Rigid &amp; Artic)
                </h3>
                <span className="text-[10px] font-mono text-[rgba(242,239,235,0.45)]">
                  Periode {periodType} • {periodLabel}
                </span>
              </div>
            </div>
            <span
              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                dailyAchievementRate >= 85
                  ? 'bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/30'
                  : dailyAchievementRate >= 60
                  ? 'bg-[#facc15]/15 text-[#facc15] border-[#facc15]/30'
                  : 'bg-[#fb7185]/15 text-[#fb7185] border-[#fb7185]/30'
              }`}
            >
              {dailyAchievementRate.toFixed(1)}% ({dailyCoveredTargetCount}/{dailyTargetUnits.length} Unit)
            </span>
          </div>

          <div className="w-full h-2 rounded bg-[#111113] overflow-hidden border border-[rgba(242,239,235,0.1)]">
            <div
              className={`h-full transition-all duration-500 ${
                dailyAchievementRate >= 85
                  ? 'bg-[#4ade80]'
                  : dailyAchievementRate >= 60
                  ? 'bg-[#facc15]'
                  : 'bg-[#fb7185]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, dailyAchievementRate))}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Daily Rigid (DT) */}
            <div className="bg-[#111113] p-3 rounded border border-[rgba(242,239,235,0.08)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-xs font-mono font-bold text-[#facc15]">
                  <Truck className="w-3.5 h-3.5" />
                  <span>DAILY RIGID (DT)</span>
                </span>
                <span className="text-[10px] font-mono text-[rgba(242,239,235,0.6)]">
                  {dailyRigidRate.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-syne font-extrabold text-2xl text-[#f2efeb]">
                  {dailyRigidInspections.length}
                  <span className="text-[11px] font-mono font-normal text-[rgba(242,239,235,0.5)] ml-1">Form</span>
                </span>
                <span className="text-[11px] font-mono text-[#facc15]">
                  {uniqueDailyRigidUnits.size}/{rigidMasterUnits.length} Unit DT
                </span>
              </div>
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('daily-rigid')}
                  className="w-full py-1 px-2 rounded bg-[rgba(250,204,21,0.08)] hover:bg-[rgba(250,204,21,0.18)] text-[#facc15] text-[10px] font-mono font-bold uppercase flex items-center justify-between transition"
                >
                  <span>Buka Daily Rigid</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Daily Artic (GR, CP, WL) */}
            <div className="bg-[#111113] p-3 rounded border border-[rgba(242,239,235,0.08)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-xs font-mono font-bold text-[#4ade80]">
                  <Tractor className="w-3.5 h-3.5" />
                  <span>DAILY ARTIC (GR/CP/WL)</span>
                </span>
                <span className="text-[10px] font-mono text-[rgba(242,239,235,0.6)]">
                  {dailyArticRate.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-syne font-extrabold text-2xl text-[#f2efeb]">
                  {dailyArticInspections.length}
                  <span className="text-[11px] font-mono font-normal text-[rgba(242,239,235,0.5)] ml-1">Form</span>
                </span>
                <span className="text-[11px] font-mono text-[#4ade80]">
                  {uniqueDailyArticUnits.size}/{articMasterUnits.length} Unit
                </span>
              </div>
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('daily-artic')}
                  className="w-full py-1 px-2 rounded bg-[rgba(74,222,128,0.08)] hover:bg-[rgba(74,222,128,0.18)] text-[#4ade80] text-[10px] font-mono font-bold uppercase flex items-center justify-between transition"
                >
                  <span>Buka Daily Artic</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. QA 1 PRE & QA 7 FINAL (RIGID DT & ARTIC GR/CP/WL) */}
        <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] space-y-3">
          <div className="flex items-center justify-between border-b border-[rgba(242,239,235,0.08)] pb-2.5">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#4ade80]" />
              <div>
                <h3 className="font-syne font-extrabold text-sm uppercase text-[#f2efeb]">
                  2. QA 1 Pre &amp; QA 7 Final (Rigid &amp; Artic)
                </h3>
                <span className="text-[10px] font-mono text-[rgba(242,239,235,0.45)]">
                  Periode {periodType} • {periodLabel}
                </span>
              </div>
            </div>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30">
              Total {qa1Inspections.length + qa7Inspections.length} Form QA
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* QA 1 PRE */}
            <div className="bg-[#111113] p-3 rounded border border-[rgba(242,239,235,0.08)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-xs font-mono font-bold text-[#facc15]">
                  <Zap className="w-3.5 h-3.5" />
                  <span>QA 1 PRE INSPECTION</span>
                </span>
                <span className="text-xs font-syne font-extrabold text-[#f2efeb]">
                  {qa1Inspections.length}
                </span>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex items-center justify-between text-[rgba(242,239,235,0.75)]">
                  <span>• Rigid (DT):</span>
                  <strong className="text-[#facc15]">
                    {qa1RigidInspections.length} Form ({uniqueQa1RigidUnits.size} Unit)
                  </strong>
                </div>
                <div className="flex items-center justify-between text-[rgba(242,239,235,0.75)]">
                  <span>• Artic (GR/CP/WL):</span>
                  <strong className="text-[#4ade80]">
                    {qa1ArticInspections.length} Form ({uniqueQa1ArticUnits.size} Unit)
                  </strong>
                </div>
              </div>
              {onNavigateToTab && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('qa1-rigid')}
                    className="py-1 px-2 rounded bg-[rgba(250,204,21,0.08)] hover:bg-[rgba(250,204,21,0.18)] text-[#facc15] text-[10px] font-mono font-bold uppercase text-center transition"
                  >
                    QA1 Rigid
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('qa1-artic')}
                    className="py-1 px-2 rounded bg-[rgba(74,222,128,0.08)] hover:bg-[rgba(74,222,128,0.18)] text-[#4ade80] text-[10px] font-mono font-bold uppercase text-center transition"
                  >
                    QA1 Artic
                  </button>
                </div>
              )}
            </div>

            {/* QA 7 FINAL */}
            <div className="bg-[#111113] p-3 rounded border border-[rgba(242,239,235,0.08)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-xs font-mono font-bold text-[#4ade80]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>QA 7 FINAL INSPECTION</span>
                </span>
                <span className="text-xs font-syne font-extrabold text-[#f2efeb]">
                  {qa7Inspections.length}
                </span>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex items-center justify-between text-[rgba(242,239,235,0.75)]">
                  <span>• Rigid (DT):</span>
                  <strong className="text-[#facc15]">
                    {qa7RigidInspections.length} Form ({uniqueQa7RigidUnits.size} Unit)
                  </strong>
                </div>
                <div className="flex items-center justify-between text-[rgba(242,239,235,0.75)]">
                  <span>• Artic (GR/CP/WL):</span>
                  <strong className="text-[#4ade80]">
                    {qa7ArticInspections.length} Form ({uniqueQa7ArticUnits.size} Unit)
                  </strong>
                </div>
              </div>
              {onNavigateToTab && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('qa7-rigid')}
                    className="py-1 px-2 rounded bg-[rgba(250,204,21,0.08)] hover:bg-[rgba(250,204,21,0.18)] text-[#facc15] text-[10px] font-mono font-bold uppercase text-center transition"
                  >
                    QA7 Rigid
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('qa7-artic')}
                    className="py-1 px-2 rounded bg-[rgba(74,222,128,0.08)] hover:bg-[rgba(74,222,128,0.18)] text-[#4ade80] text-[10px] font-mono font-bold uppercase text-center transition"
                  >
                    QA7 Artic
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3, 4, 5: MONITORING BAP, BACKLOG & ADD ACTIVITY (HARIAN, BULANAN, TAHUNAN) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* 3. MONITORING BAP */}
        <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[rgba(242,239,235,0.08)] pb-2.5">
              <div className="flex items-center space-x-2">
                <FileWarning className="w-4 h-4 text-[#fb7185]" />
                <div>
                  <h3 className="font-syne font-extrabold text-sm uppercase text-[#f2efeb]">
                    3. Monitoring BAP
                  </h3>
                  <span className="text-[10px] font-mono text-[rgba(242,239,235,0.45)]">
                    {periodType} • {periodLabel}
                  </span>
                </div>
              </div>
              <span className="font-syne font-extrabold text-2xl text-[#fb7185]">
                {bapStats.total}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
              <div className="bg-[#111113] p-2 rounded border border-[#fb7185]/30">
                <span className="text-[#fb7185] font-bold block text-sm">{bapStats.open}</span>
                <span className="text-[rgba(242,239,235,0.5)]">OPEN</span>
              </div>
              <div className="bg-[#111113] p-2 rounded border border-[#facc15]/30">
                <span className="text-[#facc15] font-bold block text-sm">{bapStats.inProgress}</span>
                <span className="text-[rgba(242,239,235,0.5)]">PROGRES</span>
              </div>
              <div className="bg-[#111113] p-2 rounded border border-[#4ade80]/30">
                <span className="text-[#4ade80] font-bold block text-sm">{bapStats.completed}</span>
                <span className="text-[rgba(242,239,235,0.5)]">SELESAI</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-[rgba(242,239,235,0.6)]">
                <span>Penyelesaian BAP</span>
                <strong className="text-[#4ade80]">{bapStats.completionRate}%</strong>
              </div>
              <div className="w-full h-1.5 rounded bg-[#111113] overflow-hidden">
                <div
                  className="h-full bg-[#4ade80] transition-all duration-300"
                  style={{ width: `${bapStats.completionRate}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
              {periodBaps.slice(0, 4).map((b, idx) => (
                <div
                  key={`${b.id}-${idx}`}
                  className="p-2 rounded bg-[#111113] border border-[rgba(242,239,235,0.06)] text-[11px] font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#f2efeb]">{b.codeUnit}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        b.status === 'COMPLETED'
                          ? 'bg-[#4ade80]/15 text-[#4ade80]'
                          : b.status === 'IN_PROGRESS'
                          ? 'bg-[#facc15]/15 text-[#facc15]'
                          : 'bg-[#fb7185]/15 text-[#fb7185]'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-[rgba(242,239,235,0.65)] truncate mt-0.5">
                    {b.kerusakan}
                  </p>
                  <div className="text-[9px] text-[rgba(242,239,235,0.4)] flex justify-between mt-0.5">
                    <span>PIC: {b.picMekanik || '-'}</span>
                    <span>{b.tanggal}</span>
                  </div>
                </div>
              ))}
              {periodBaps.length === 0 && (
                <p className="text-center py-4 text-[11px] font-mono text-[rgba(242,239,235,0.4)]">
                  Tidak ada data BAP pada periode ini.
                </p>
              )}
            </div>
          </div>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('bap')}
              className="w-full py-1.5 px-3 rounded bg-[#fb7185]/10 hover:bg-[#fb7185]/20 border border-[#fb7185]/30 text-[#fb7185] text-[10px] font-mono font-bold uppercase flex items-center justify-between transition"
            >
              <span>Kelola Modul BAP</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 4. MONITORING BACKLOG */}
        <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[rgba(242,239,235,0.08)] pb-2.5">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="w-4 h-4 text-[#facc15]" />
                <div>
                  <h3 className="font-syne font-extrabold text-sm uppercase text-[#f2efeb]">
                    4. Monitoring Backlog
                  </h3>
                  <span className="text-[10px] font-mono text-[rgba(242,239,235,0.45)]">
                    {periodType} • {periodLabel}
                  </span>
                </div>
              </div>
              <span className="font-syne font-extrabold text-2xl text-[#facc15]">
                {backlogStats.total}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 text-center font-mono text-[9px]">
              <div className="bg-[#111113] p-1.5 rounded border border-[#facc15]/30">
                <span className="text-[#facc15] font-bold block text-sm">{backlogStats.waiting}</span>
                <span className="text-[rgba(242,239,235,0.5)]">WAIT</span>
              </div>
              <div className="bg-[#111113] p-1.5 rounded border border-[#38bdf8]/30">
                <span className="text-[#38bdf8] font-bold block text-sm">{backlogStats.ready}</span>
                <span className="text-[rgba(242,239,235,0.5)]">READY</span>
              </div>
              <div className="bg-[#111113] p-1.5 rounded border border-purple-400/30">
                <span className="text-purple-400 font-bold block text-sm">{backlogStats.scheduled}</span>
                <span className="text-[rgba(242,239,235,0.5)]">SCHED</span>
              </div>
              <div className="bg-[#111113] p-1.5 rounded border border-[#4ade80]/30">
                <span className="text-[#4ade80] font-bold block text-sm">{backlogStats.closed}</span>
                <span className="text-[rgba(242,239,235,0.5)]">CLOSED</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-[rgba(242,239,235,0.6)]">
                <span>Backlog Closed Rate</span>
                <strong className="text-[#4ade80]">{backlogStats.closedRate}%</strong>
              </div>
              <div className="w-full h-1.5 rounded bg-[#111113] overflow-hidden">
                <div
                  className="h-full bg-[#facc15] transition-all duration-300"
                  style={{ width: `${backlogStats.closedRate}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
              {periodBacklogs.slice(0, 4).map((bl, idx) => (
                <div
                  key={`${bl.id}-${idx}`}
                  className="p-2 rounded bg-[#111113] border border-[rgba(242,239,235,0.06)] text-[11px] font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#f2efeb]">{bl.codeUnit}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        bl.status === 'CLOSED'
                          ? 'bg-[#4ade80]/15 text-[#4ade80]'
                          : bl.status === 'READY_TO_INSTALL'
                          ? 'bg-[#38bdf8]/15 text-[#38bdf8]'
                          : bl.status === 'SCHEDULED'
                          ? 'bg-purple-500/15 text-purple-300'
                          : 'bg-[#facc15]/15 text-[#facc15]'
                      }`}
                    >
                      {bl.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-[rgba(242,239,235,0.65)] truncate mt-0.5">
                    {bl.deskripsiBacklog}
                  </p>
                  <div className="text-[9px] text-[rgba(242,239,235,0.4)] flex justify-between mt-0.5">
                    <span className="truncate pr-2">PN: {bl.partNumber || '-'}</span>
                    <span>{bl.tanggalTemuan}</span>
                  </div>
                </div>
              ))}
              {periodBacklogs.length === 0 && (
                <p className="text-center py-4 text-[11px] font-mono text-[rgba(242,239,235,0.4)]">
                  Tidak ada backlog tercatat pada periode ini.
                </p>
              )}
            </div>
          </div>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('backlog')}
              className="w-full py-1.5 px-3 rounded bg-[#facc15]/10 hover:bg-[#facc15]/20 border border-[#facc15]/30 text-[#facc15] text-[10px] font-mono font-bold uppercase flex items-center justify-between transition"
            >
              <span>Kelola Modul Backlog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 5. MONITORING ADD ACTIVITY */}
        <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[rgba(242,239,235,0.08)] pb-2.5">
              <div className="flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-[#4ade80]" />
                <div>
                  <h3 className="font-syne font-extrabold text-sm uppercase text-[#f2efeb]">
                    5. Monitoring Add Activity
                  </h3>
                  <span className="text-[10px] font-mono text-[rgba(242,239,235,0.45)]">
                    {periodType} • {periodLabel}
                  </span>
                </div>
              </div>
              <span className="font-syne font-extrabold text-2xl text-[#4ade80]">
                {activityStats.total}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
              <div className="bg-[#111113] p-2 rounded border border-[#4ade80]/30">
                <span className="text-[#4ade80] font-bold block text-sm">
                  {activityStats.finishedCount}
                </span>
                <span className="text-[rgba(242,239,235,0.5)]">DONE/CLS</span>
              </div>
              <div className="bg-[#111113] p-2 rounded border border-[#38bdf8]/30">
                <span className="text-[#38bdf8] font-bold block text-sm">
                  {activityStats.monitoring}
                </span>
                <span className="text-[rgba(242,239,235,0.5)]">MONITOR</span>
              </div>
              <div className="bg-[#111113] p-2 rounded border border-[#facc15]/30">
                <span className="text-[#facc15] font-bold block text-sm">
                  {activityStats.pending}
                </span>
                <span className="text-[rgba(242,239,235,0.5)]">PENDING</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-[rgba(242,239,235,0.6)]">
                <span>Tingkat Penyelesaian Aktivitas</span>
                <strong className="text-[#4ade80]">{activityStats.finishRate}%</strong>
              </div>
              <div className="w-full h-1.5 rounded bg-[#111113] overflow-hidden">
                <div
                  className="h-full bg-[#4ade80] transition-all duration-300"
                  style={{ width: `${activityStats.finishRate}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
              {periodActivities.slice(0, 4).map((act, idx) => (
                <div
                  key={`${act.id}-${idx}`}
                  className="p-2 rounded bg-[#111113] border border-[rgba(242,239,235,0.06)] text-[11px] font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#f2efeb]">{act.codeUnit}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        act.status === 'DONE' || act.status === 'CLOSED'
                          ? 'bg-[#4ade80]/15 text-[#4ade80]'
                          : act.status === 'MONITORING'
                          ? 'bg-[#38bdf8]/15 text-[#38bdf8]'
                          : 'bg-[#facc15]/15 text-[#facc15]'
                      }`}
                    >
                      {act.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-[rgba(242,239,235,0.65)] truncate mt-0.5">
                    {act.deskripsiAktivitas}
                  </p>
                  <div className="text-[9px] text-[rgba(242,239,235,0.4)] flex justify-between mt-0.5">
                    <span>PIC: {act.pic || '-'}</span>
                    <span>{act.tanggalTemuan}</span>
                  </div>
                </div>
              ))}
              {periodActivities.length === 0 && (
                <p className="text-center py-4 text-[11px] font-mono text-[rgba(242,239,235,0.4)]">
                  Tidak ada Add Activity pada periode ini.
                </p>
              )}
            </div>
          </div>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('activities')}
              className="w-full py-1.5 px-3 rounded bg-[#4ade80]/10 hover:bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80] text-[10px] font-mono font-bold uppercase flex items-center justify-between transition"
            >
              <span>Kelola Modul Add Activity</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* VISUAL TREND CHART SECTION (HARIAN / BULANAN / TAHUNAN FOR ALL MODULES) */}
      <div className="bg-[#18181b] p-4 sm:p-5 rounded border border-[rgba(242,239,235,0.1)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[rgba(242,239,235,0.08)] pb-2.5">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-[#facc15]" />
            <h3 className="font-syne font-extrabold text-sm uppercase text-[#f2efeb]">
              {periodType === 'HARIAN' && `Distribusi Jam Pelaksanaan (${periodLabel})`}
              {periodType === 'BULANAN' && `Tren Harian Bulan ${periodLabel}`}
              {periodType === 'TAHUNAN' && `Tren Bulanan Tahun ${selectedYear}`}
            </h3>
          </div>

          <div className="flex items-center flex-wrap gap-1.5">
            <div className="flex items-center space-x-1 bg-[#111113] p-0.5 rounded border border-[rgba(242,239,235,0.1)] text-[10px] font-mono">
              {([
                { id: 'INSPECTIONS', label: 'Daily + QA1/QA7' },
                { id: 'BAP', label: 'BAP' },
                { id: 'BACKLOG', label: 'Backlog' },
                { id: 'ACTIVITY', label: 'Add Activity' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setChartModule(tab.id)}
                  className={`px-2 py-1 rounded font-bold uppercase transition ${
                    chartModule === tab.id
                      ? 'bg-[#facc15] text-[#111113]'
                      : 'text-[rgba(242,239,235,0.55)] hover:text-[#f2efeb]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] font-mono text-[rgba(242,239,235,0.45)] uppercase">
              Total: {chartActiveTotal}
            </span>
          </div>
        </div>

        <div className="pt-2 overflow-x-auto">
          <div className={periodType === 'BULANAN' ? 'min-w-[640px]' : 'w-full'}>
            <div className="flex items-end gap-1.5 h-36 pt-5 pb-1">
              {chartDataPoints.map(pt => {
                const heightPercent =
                  pt.count > 0 ? Math.max(14, (pt.count / maxChartCount) * 100) : 5;
                const barColor =
                  chartModule === 'BAP'
                    ? pt.isCurrent
                      ? 'bg-[#4ade80]'
                      : 'bg-[#fb7185] hover:bg-[#fda4af]'
                    : chartModule === 'ACTIVITY'
                    ? pt.isCurrent
                      ? 'bg-[#facc15]'
                      : 'bg-[#4ade80] hover:bg-[#86efac]'
                    : pt.isCurrent
                    ? 'bg-[#4ade80] ring-1 ring-[#4ade80]'
                    : 'bg-[#facc15] hover:bg-[#fde047]';

                return (
                  <div
                    key={pt.key}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-[14px]"
                    title={pt.tooltip}
                  >
                    <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-7 bg-[#111113] border border-[#facc15] text-[#facc15] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap z-20 transition">
                      {pt.tooltip}
                    </div>
                    {pt.count > 0 && periodType !== 'BULANAN' && (
                      <span className="text-[9px] font-mono font-bold text-[#f2efeb] mb-1">
                        {pt.count}
                      </span>
                    )}
                    <div
                      className={`w-full rounded transition-all duration-200 ${
                        pt.count > 0
                          ? barColor
                          : 'bg-[#111113] border border-[rgba(242,239,235,0.06)]'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span
                      className={`text-[9px] font-mono mt-1 ${
                        pt.isCurrent
                          ? 'text-[#4ade80] font-bold'
                          : 'text-[rgba(242,239,235,0.45)]'
                      }`}
                    >
                      {pt.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: RANGKUMAN MONITORING STATUS INSPEKSI UNIT */}
      <div className="bg-[#18181b] p-4 sm:p-5 rounded border border-[rgba(242,239,235,0.1)] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(242,239,235,0.08)] pb-3">
          <div>
            <h3 className="font-syne font-extrabold text-sm sm:text-base uppercase text-[#f2efeb]">
              6. Rangkuman Monitoring Status Inspeksi Unit ({filteredCodeUnits.length} Unit)
            </h3>
            <p className="text-xs text-[rgba(242,239,235,0.5)] font-mono mt-0.5">
              Status terpadu Daily Check, QA 1 Pre, QA 7 Final, BAP, Backlog &amp; Add Activity per Code Unit ({periodLabel})
            </p>
          </div>

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

            <div className="flex items-center flex-wrap gap-1 bg-[#111113] p-0.5 rounded border border-[rgba(242,239,235,0.1)] text-xs font-mono">
              {([
                { id: 'ALL', label: `Semua (${unitSummaryStrip.total})` },
                { id: 'DAILY_DONE', label: `Sudah Daily (${unitSummaryStrip.dailyDone})` },
                { id: 'DAILY_PENDING', label: `Belum Daily (${unitSummaryStrip.dailyPending})` },
                { id: 'QA_DONE', label: `Sudah QA1/QA7` },
                { id: 'HAS_ISSUE', label: `Ada BAP/BL/BD` },
              ] as const).map(st => (
                <button
                  key={st.id}
                  onClick={() => setTableStatusFilter(st.id)}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition ${
                    tableStatusFilter === st.id
                      ? 'bg-[#18181b] text-[#facc15] border border-[#facc15]/30'
                      : 'text-[rgba(242,239,235,0.5)] hover:text-[#f2efeb]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Compact Status Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-mono">
          <div className="bg-[#111113] p-2.5 rounded border border-[rgba(242,239,235,0.08)]">
            <span className="text-[10px] text-[rgba(242,239,235,0.5)] block">SUDAH DAILY</span>
            <strong className="text-sm text-[#4ade80]">
              {unitSummaryStrip.dailyDone}/{unitSummaryStrip.total} Unit
            </strong>
          </div>
          <div className="bg-[#111113] p-2.5 rounded border border-[rgba(242,239,235,0.08)]">
            <span className="text-[10px] text-[rgba(242,239,235,0.5)] block">BELUM DAILY</span>
            <strong className="text-sm text-[#fb7185]">{unitSummaryStrip.dailyPending} Unit</strong>
          </div>
          <div className="bg-[#111113] p-2.5 rounded border border-[rgba(242,239,235,0.08)]">
            <span className="text-[10px] text-[rgba(242,239,235,0.5)] block">UNIT QA 1 PRE</span>
            <strong className="text-sm text-[#facc15]">{unitSummaryStrip.qa1Done} Unit</strong>
          </div>
          <div className="bg-[#111113] p-2.5 rounded border border-[rgba(242,239,235,0.08)]">
            <span className="text-[10px] text-[rgba(242,239,235,0.5)] block">UNIT QA 7 FINAL</span>
            <strong className="text-sm text-[#38bdf8]">{unitSummaryStrip.qa7Done} Unit</strong>
          </div>
          <div className="bg-[#111113] p-2.5 rounded border border-[rgba(242,239,235,0.08)]">
            <span className="text-[10px] text-[rgba(242,239,235,0.5)] block">READY / RUNNING</span>
            <strong className="text-sm text-[#4ade80]">{runningUnitsCount} Unit</strong>
          </div>
          <div className="bg-[#111113] p-2.5 rounded border border-[rgba(242,239,235,0.08)]">
            <span className="text-[10px] text-[rgba(242,239,235,0.5)] block">BREAKDOWN / STBY</span>
            <strong className="text-sm text-[#fb7185]">
              {breakdownUnitsCount} BD / {standbyUnitsCount} STBY
            </strong>
          </div>
        </div>

        {/* Unified Unit Inspection Status Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[rgba(242,239,235,0.1)] text-[10px] uppercase text-[rgba(242,239,235,0.5)]">
                <th className="py-2.5 px-2.5">Code Unit</th>
                <th className="py-2.5 px-2.5">Armada &amp; EGI</th>
                <th className="py-2.5 px-2.5">Daily Check</th>
                <th className="py-2.5 px-2.5">QA 1 / QA 7</th>
                <th className="py-2.5 px-2.5">BAP / BL / ACT</th>
                <th className="py-2.5 px-2.5">Kondisi Unit</th>
                <th className="py-2.5 px-2.5">PIC / Waktu</th>
                <th className="py-2.5 px-2.5 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(242,239,235,0.06)]">
              {unitMonitoringRows.map((row, rIdx) => (
                <tr
                  key={`${row.unit.id}-${row.unit.codeUnit}-${rIdx}`}
                  className="hover:bg-[rgba(242,239,235,0.02)] transition"
                >
                  <td className="py-2.5 px-2.5 font-bold text-[#f2efeb]">
                    <span className="font-syne font-extrabold text-sm">{row.unit.codeUnit}</span>
                    <span className="text-[10px] text-[rgba(242,239,235,0.4)] block">
                      PIT: {row.unit.lokasiPit}
                    </span>
                  </td>

                  <td className="py-2.5 px-2.5 text-[rgba(242,239,235,0.75)]">
                    <span className="font-bold text-[#f2efeb]">
                      {row.unit.brand} {row.unit.egi}
                    </span>
                    <span className="text-[10px] text-[#facc15]/80 block">{row.fleetCategory}</span>
                  </td>

                  <td className="py-2.5 px-2.5">
                    {row.hasDaily ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>SUDAH ({row.dailyCount})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#fb7185]/15 text-[#fb7185] border border-[#fb7185]/30">
                        <XCircle className="w-3 h-3" />
                        <span>BELUM</span>
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-2.5">
                    <div className="flex flex-col gap-1 text-[10px]">
                      <span className={row.qa1Count > 0 ? 'text-[#facc15] font-bold' : 'text-[rgba(242,239,235,0.35)]'}>
                        QA1: {row.qa1Count > 0 ? `✓ ${row.qa1Count}x` : '-'}
                      </span>
                      <span className={row.qa7Count > 0 ? 'text-[#38bdf8] font-bold' : 'text-[rgba(242,239,235,0.35)]'}>
                        QA7: {row.qa7Count > 0 ? `✓ ${row.qa7Count}x` : '-'}
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 px-2.5">
                    <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                      <span
                        className={`px-1.5 py-0.5 rounded border ${
                          row.bapCount > 0
                            ? 'bg-[#fb7185]/15 text-[#fb7185] border-[#fb7185]/30'
                            : 'bg-[#111113] text-[rgba(242,239,235,0.35)] border-[rgba(242,239,235,0.08)]'
                        }`}
                      >
                        BAP:{row.bapCount}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border ${
                          row.backlogCount > 0
                            ? 'bg-[#facc15]/15 text-[#facc15] border-[#facc15]/30'
                            : 'bg-[#111113] text-[rgba(242,239,235,0.35)] border-[rgba(242,239,235,0.08)]'
                        }`}
                      >
                        BL:{row.backlogCount}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border ${
                          row.activityCount > 0
                            ? 'bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/30'
                            : 'bg-[#111113] text-[rgba(242,239,235,0.35)] border-[rgba(242,239,235,0.08)]'
                        }`}
                      >
                        ACT:{row.activityCount}
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 px-2.5">
                    {row.latestInspection ? (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          row.latestInspection.status === 'RUNNING'
                            ? 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30'
                            : row.latestInspection.status === 'BREAKDOWN'
                            ? 'bg-[#fb7185]/10 text-[#fb7185] border-[#fb7185]/30'
                            : 'bg-[#facc15]/10 text-[#facc15] border-[#facc15]/30'
                        }`}
                      >
                        {row.latestInspection.status}
                      </span>
                    ) : (
                      <span className="text-[rgba(242,239,235,0.4)] text-[10px]">
                        {row.unit.statusUnit}
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-2.5 text-[rgba(242,239,235,0.7)]">
                    <span className="block truncate max-w-[120px]">
                      {row.latestInspection?.picMekanik || '-'}
                    </span>
                    <span className="text-[10px] text-[rgba(242,239,235,0.45)] flex items-center space-x-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>
                        {row.latestInspection
                          ? `${row.latestInspection.startTime || '-'} - ${row.latestInspection.finishTime || '-'}`
                          : '-'}
                      </span>
                    </span>
                  </td>

                  <td className="py-2.5 px-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleStartInspection(row.unit, 'DAILY_INSPECTION')}
                        className="px-2 py-1 rounded bg-[#facc15] hover:bg-[#fde047] text-[#111113] text-[10px] font-mono font-black uppercase transition active:scale-95"
                        title="Input Daily Check"
                      >
                        +Daily
                      </button>
                      <button
                        onClick={() => handleStartInspection(row.unit, 'QA1_PRE')}
                        className="px-1.5 py-1 rounded bg-[#111113] hover:bg-[rgba(250,204,21,0.15)] border border-[#facc15]/40 text-[#facc15] text-[10px] font-mono font-bold uppercase transition"
                        title="Input QA 1 Pre"
                      >
                        QA1
                      </button>
                      <button
                        onClick={() => handleStartInspection(row.unit, 'QA7_FINAL')}
                        className="px-1.5 py-1 rounded bg-[#111113] hover:bg-[rgba(74,222,128,0.15)] border border-[#4ade80]/40 text-[#4ade80] text-[10px] font-mono font-bold uppercase transition"
                        title="Input QA 7 Final"
                      >
                        QA7
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {unitMonitoringRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[rgba(242,239,235,0.4)] font-mono text-xs">
                    Tidak ada data unit yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Leaderboard & Quality Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
                      {m.inspections} Inspeksi • {m.activities} Activity • {m.defects} Defect
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-[#4ade80]">{m.totalScore}</span>
                  <span className="text-[10px] font-mono text-[rgba(242,239,235,0.4)] block uppercase">
                    Total Poin
                  </span>
                </div>
              </div>
            ))}

            {mechanicLeaderboard.length === 0 && (
              <div className="text-center py-6 text-xs text-[rgba(242,239,235,0.4)] font-mono">
                Belum ada aktivitas mekanik tercatat pada periode ini.
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#18181b] p-4 rounded border border-[rgba(242,239,235,0.1)] space-y-3">
          <div className="flex items-center justify-between border-b border-[rgba(242,239,235,0.08)] pb-2">
            <span className="font-syne font-extrabold text-sm uppercase text-[#f2efeb]">
              Ringkasan Kesiapan &amp; Mutu Kelayakan
            </span>
            <span className="text-[10px] font-mono text-[#4ade80]">Plant 2 Systematic</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-[#111113] border border-[rgba(242,239,235,0.06)] flex items-center justify-between">
              <span className="text-[rgba(242,239,235,0.7)]">Physical Availability (Unit Running):</span>
              <span className="font-bold text-sm text-[#4ade80]">
                {dailyTargetUnits.length > 0
                  ? ((runningUnitsCount / dailyTargetUnits.length) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#111113] border border-[rgba(242,239,235,0.06)] flex items-center justify-between">
              <span className="text-[rgba(242,239,235,0.7)]">Temuan Defect Checklist ({periodType}):</span>
              <span className="font-bold text-sm text-[#fb7185]">{totalDefectsCount} Item</span>
            </div>

            <div className="p-2.5 rounded bg-[#111113] border border-[rgba(242,239,235,0.06)] flex items-center justify-between">
              <span className="text-[rgba(242,239,235,0.7)]">Total Form Diinspeksi ({periodType}):</span>
              <span className="font-bold text-sm text-[#facc15]">
                {periodInspections.length} Form ({uniqueAnyInspectedCount} Unit Unik)
              </span>
            </div>

            <div className="p-2 rounded bg-[rgba(250,204,21,0.06)] border border-[#facc15]/20 text-[11px] text-[rgba(242,239,235,0.8)] mt-2">
              <span className="font-bold text-[#facc15] block uppercase mb-0.5">Catatan Operasional:</span>
              <span>
                Pantau seluruh unit berstatus <strong className="text-[#fb7185]">BELUM DAILY</strong>, BAP Open, dan Backlog aktif pada periode <strong className="text-[#facc15]">{periodLabel}</strong> untuk menjaga kesiapan armada Plant 2 MTBU.
              </span>
            </div>
          </div>
        </div>
      </div>

      <WhatsAppGroupShareModal
        isOpen={!!groupShareText}
        onClose={() => setGroupShareText(null)}
        title={`Dashboard Pencapaian ${periodType} (${periodLabel})`}
        messageText={groupShareText || ''}
      />
    </div>
  );
};
