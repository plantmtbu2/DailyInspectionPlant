import { InspectionPlanEntry, InspectionPlanModule, PlanningCategory, QAType } from '../types';

export type DashboardPeriodType = 'HARIAN' | 'BULANAN' | 'TAHUNAN';

export interface ParsedDateInfo {
  day: number;
  month: number;
  year: number;
  iso: string;
}

export interface NormalizedInspectionForCalc {
  id: string;
  codeUnit: string;
  qaTypeNormalized: QAType;
  fleetType: 'RIGID' | 'ARTIC';
  hmUnit: number;
  planningCategory?: PlanningCategory;
  dateParts: ParsedDateInfo | null;
}

export interface ModuleAchievementResult {
  module: InspectionPlanModule;
  plannedCount: number;
  plannedRealizedCount: number;
  unplannedRealizedCount: number;
  totalRealizedCount: number;
  achievementPct: number;
  planCompliancePct: number;
  pendingPlannedUnits: string[];
  unplannedUnitCodes: string[];
  totalValidFormsCount: number;
  excludedZeroHmCount: number;
  hasExplicitPlan: boolean;
}

export const MODULE_TO_QA_AND_FLEET: Record<
  InspectionPlanModule,
  { qaType: QAType; fleet: 'RIGID' | 'ARTIC'; label: string }
> = {
  DAILY_RIGID: { qaType: 'DAILY_INSPECTION', fleet: 'RIGID', label: 'Daily Check Rigid (DT)' },
  DAILY_ARTIC: { qaType: 'DAILY_INSPECTION', fleet: 'ARTIC', label: 'Daily Check Artic (GR/CP/WL)' },
  QA1_RIGID: { qaType: 'QA1_PRE', fleet: 'RIGID', label: 'QA 1 Pre Rigid (DT)' },
  QA7_RIGID: { qaType: 'QA7_FINAL', fleet: 'RIGID', label: 'QA 7 Final Rigid (DT)' },
  QA1_ARTIC: { qaType: 'QA1_PRE', fleet: 'ARTIC', label: 'QA 1 Pre Artic (GR/CP/WL)' },
  QA7_ARTIC: { qaType: 'QA7_FINAL', fleet: 'ARTIC', label: 'QA 7 Final Artic (GR/CP/WL)' },
};

export const parseIsoDateParts = (isoStr?: string): ParsedDateInfo | null => {
  if (!isoStr || typeof isoStr !== 'string') return null;
  const clean = isoStr.trim().slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return {
    day,
    month,
    year,
    iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
};

const matchesDateInPeriod = (
  p: ParsedDateInfo | null,
  periodType: DashboardPeriodType,
  selectedDate: string,
  selectedMonth: number,
  selectedYear: number
): boolean => {
  if (!p) return false;
  if (periodType === 'HARIAN') {
    const target = parseIsoDateParts(selectedDate);
    return !!target && p.iso === target.iso;
  }
  if (periodType === 'BULANAN') {
    return p.month === selectedMonth && p.year === selectedYear;
  }
  return p.year === selectedYear;
};

/**
 * Menghitung pencapaian untuk 1 modul (Daily Rigid/Artic, QA 1 Rigid/Artic, QA 7 Rigid/Artic):
 * - Hanya menghitung realisasi JIKA HM Unit terisi (`Number(hmUnit) > 0`).
 * - HARIAN: mencocokkan unit Direncanakan vs Tidak Direncanakan (Tambahan) pada TANGGAL YANG SAMA.
 * - BULANAN: mencocokkan unit Direncanakan vs Tidak Direncanakan (Tambahan) pada BULAN & TAHUN YANG SAMA.
 * - TAHUNAN: mencocokkan unit Direncanakan vs Tidak Direncanakan (Tambahan) pada TAHUN YANG SAMA.
 */
export const calculateModuleAchievement = (
  module: InspectionPlanModule,
  allInspections: NormalizedInspectionForCalc[],
  allPlans: InspectionPlanEntry[],
  periodType: DashboardPeriodType,
  selectedDate: string,
  selectedMonth: number,
  selectedYear: number
): ModuleAchievementResult => {
  const meta = MODULE_TO_QA_AND_FLEET[module];

  // Filter inspections belonging to this module & selected period
  const moduleInspections = allInspections.filter(
    i =>
      i.fleetType === meta.fleet &&
      i.qaTypeNormalized === meta.qaType &&
      matchesDateInPeriod(i.dateParts, periodType, selectedDate, selectedMonth, selectedYear)
  );

  // Filter plans belonging to this module & selected period
  const modulePlans = allPlans.filter(p => {
    if (p.module !== module) return false;
    return matchesDateInPeriod(
      parseIsoDateParts(p.date),
      periodType,
      selectedDate,
      selectedMonth,
      selectedYear
    );
  });

  const excludedZeroHmCount = moduleInspections.filter(i => !(Number(i.hmUnit) > 0)).length;
  const validHmInspections = moduleInspections.filter(i => Number(i.hmUnit) > 0);

  // Collect all distinct dates present in either plans or inspections for this period
  const allDates = new Set<string>();
  const plansByDate = new Map<string, Set<string>>();
  modulePlans.forEach(p => {
    const iso = p.date.slice(0, 10);
    allDates.add(iso);
    const set = plansByDate.get(iso) || new Set<string>();
    p.plannedUnitCodes.forEach(cu => {
      const clean = cu.trim().toUpperCase();
      if (clean) set.add(clean);
    });
    plansByDate.set(iso, set);
  });

  const allInspByDate = new Map<string, NormalizedInspectionForCalc[]>();
  moduleInspections.forEach(i => {
    const iso = i.dateParts?.iso;
    if (!iso) return;
    allDates.add(iso);
    const arr = allInspByDate.get(iso) || [];
    arr.push(i);
    allInspByDate.set(iso, arr);
  });

  const hasExplicitPlan = Array.from(plansByDate.values()).some(s => s.size > 0);

  // HARIAN: strict same-date matching (deduplicated per codeUnit on that date)
  if (periodType === 'HARIAN') {
    const targetIso = parseIsoDateParts(selectedDate)?.iso || selectedDate;
    const explicitPlanUnits = plansByDate.get(targetIso) || new Set<string>();
    const dayAllInspections = allInspByDate.get(targetIso) || [];
    const dayValidInspections = dayAllInspections.filter(i => Number(i.hmUnit) > 0);

    const plannedUnits = new Set<string>();
    const plannedRealizedUnits = new Set<string>();
    const unplannedUnits = new Set<string>();

    if (explicitPlanUnits.size > 0) {
      explicitPlanUnits.forEach(u => plannedUnits.add(u));

      // Group valid (HM > 0) inspections by unit on this same date
      const validByUnit = new Map<string, NormalizedInspectionForCalc[]>();
      dayValidInspections.forEach(i => {
        const u = i.codeUnit.trim().toUpperCase();
        if (!u) return;
        const arr = validByUnit.get(u) || [];
        arr.push(i);
        validByUnit.set(u, arr);
      });

      validByUnit.forEach((records, u) => {
        const hasPlannedRecord = records.some(r => r.planningCategory !== 'UNPLANNED');
        if (plannedUnits.has(u) && hasPlannedRecord) {
          plannedRealizedUnits.add(u);
        } else {
          unplannedUnits.add(u);
        }
      });
    } else {
      // No manual plan set for this date: use form planningCategory (default PLANNED)
      dayAllInspections.forEach(i => {
        const u = i.codeUnit.trim().toUpperCase();
        if (!u) return;
        if (i.planningCategory !== 'UNPLANNED') {
          plannedUnits.add(u);
        }
      });

      dayValidInspections.forEach(i => {
        const u = i.codeUnit.trim().toUpperCase();
        if (!u) return;
        if (i.planningCategory === 'UNPLANNED') {
          unplannedUnits.add(u);
        } else {
          plannedRealizedUnits.add(u);
        }
      });
    }

    const plannedCount = plannedUnits.size;
    const plannedRealizedCount = plannedRealizedUnits.size;
    const unplannedRealizedCount = unplannedUnits.size;
    const totalRealizedCount = plannedRealizedCount + unplannedRealizedCount;
    const pendingPlannedUnits = Array.from(plannedUnits).filter(u => !plannedRealizedUnits.has(u));

    const achievementPct =
      plannedCount > 0
        ? (totalRealizedCount / plannedCount) * 100
        : totalRealizedCount > 0
        ? 100
        : 0;
    const planCompliancePct =
      plannedCount > 0 ? (plannedRealizedCount / plannedCount) * 100 : 0;

    return {
      module,
      plannedCount,
      plannedRealizedCount,
      unplannedRealizedCount,
      totalRealizedCount,
      achievementPct,
      planCompliancePct,
      pendingPlannedUnits,
      unplannedUnitCodes: Array.from(unplannedUnits),
      totalValidFormsCount: validHmInspections.length,
      excludedZeroHmCount,
      hasExplicitPlan: explicitPlanUnits.size > 0,
    };
  }

  // BULANAN (bulan sama) & TAHUNAN (tahun sama):
  // Accumulate planned unit occurrences across dates in the same month/year,
  // and match realized units (HM > 0, dedup per date+unit) in that same month/year.
  const plannedCountByUnit = new Map<string, number>();
  allDates.forEach(dateIso => {
    const explicitOnDay = plansByDate.get(dateIso);
    if (explicitOnDay && explicitOnDay.size > 0) {
      explicitOnDay.forEach(u => {
        plannedCountByUnit.set(u, (plannedCountByUnit.get(u) || 0) + 1);
      });
    } else {
      const dayInsps = allInspByDate.get(dateIso) || [];
      const dayPlannedUnits = new Set<string>();
      dayInsps.forEach(i => {
        const u = i.codeUnit.trim().toUpperCase();
        if (u && i.planningCategory !== 'UNPLANNED') {
          dayPlannedUnits.add(u);
        }
      });
      dayPlannedUnits.forEach(u => {
        plannedCountByUnit.set(u, (plannedCountByUnit.get(u) || 0) + 1);
      });
    }
  });

  // Deduplicate valid HM>0 realizations per (dateIso, codeUnit) so multiple clicks on same day don't double-count
  const validUnitDaysMap = new Map<string, { codeUnit: string; date: string; hasPlannedStyle: boolean }>();
  validHmInspections.forEach(i => {
    const iso = i.dateParts?.iso;
    const u = i.codeUnit.trim().toUpperCase();
    if (!iso || !u) return;
    const key = `${iso}__${u}`;
    const existing = validUnitDaysMap.get(key);
    const isPlannedStyle = i.planningCategory !== 'UNPLANNED';
    if (!existing) {
      validUnitDaysMap.set(key, { codeUnit: u, date: iso, hasPlannedStyle: isPlannedStyle });
    } else if (isPlannedStyle) {
      existing.hasPlannedStyle = true;
    }
  });

  const eligiblePlannedByUnit = new Map<string, number>();
  let explicitUnplannedCount = 0;
  const unplannedUnitsList = new Set<string>();

  validUnitDaysMap.forEach(entry => {
    if (entry.hasPlannedStyle) {
      eligiblePlannedByUnit.set(
        entry.codeUnit,
        (eligiblePlannedByUnit.get(entry.codeUnit) || 0) + 1
      );
    } else {
      explicitUnplannedCount += 1;
      unplannedUnitsList.add(entry.codeUnit);
    }
  });

  let plannedCount = 0;
  let plannedRealizedCount = 0;
  let unplannedRealizedCount = explicitUnplannedCount;
  const pendingPlannedUnits: string[] = [];

  const allUnitsSeen = new Set<string>([
    ...plannedCountByUnit.keys(),
    ...eligiblePlannedByUnit.keys(),
  ]);

  allUnitsSeen.forEach(u => {
    const pSlots = plannedCountByUnit.get(u) || 0;
    const aSlots = eligiblePlannedByUnit.get(u) || 0;
    plannedCount += pSlots;
    const matched = Math.min(pSlots, aSlots);
    const extra = Math.max(0, aSlots - pSlots);
    plannedRealizedCount += matched;
    unplannedRealizedCount += extra;
    if (extra > 0) unplannedUnitsList.add(u);
    if (aSlots < pSlots) pendingPlannedUnits.push(u);
  });

  const totalRealizedCount = plannedRealizedCount + unplannedRealizedCount;
  const achievementPct =
    plannedCount > 0
      ? (totalRealizedCount / plannedCount) * 100
      : totalRealizedCount > 0
      ? 100
      : 0;
  const planCompliancePct =
    plannedCount > 0 ? (plannedRealizedCount / plannedCount) * 100 : 0;

  return {
    module,
    plannedCount,
    plannedRealizedCount,
    unplannedRealizedCount,
    totalRealizedCount,
    achievementPct,
    planCompliancePct,
    pendingPlannedUnits,
    unplannedUnitCodes: Array.from(unplannedUnitsList),
    totalValidFormsCount: validHmInspections.length,
    excludedZeroHmCount,
    hasExplicitPlan,
  };
};

export const combineAchievementResults = (
  items: ModuleAchievementResult[]
): Omit<ModuleAchievementResult, 'module' | 'pendingPlannedUnits' | 'unplannedUnitCodes'> => {
  const plannedCount = items.reduce((s, x) => s + x.plannedCount, 0);
  const plannedRealizedCount = items.reduce((s, x) => s + x.plannedRealizedCount, 0);
  const unplannedRealizedCount = items.reduce((s, x) => s + x.unplannedRealizedCount, 0);
  const totalRealizedCount = plannedRealizedCount + unplannedRealizedCount;
  const totalValidFormsCount = items.reduce((s, x) => s + x.totalValidFormsCount, 0);
  const excludedZeroHmCount = items.reduce((s, x) => s + x.excludedZeroHmCount, 0);
  const hasExplicitPlan = items.some(x => x.hasExplicitPlan);

  const achievementPct =
    plannedCount > 0
      ? (totalRealizedCount / plannedCount) * 100
      : totalRealizedCount > 0
      ? 100
      : 0;
  const planCompliancePct =
    plannedCount > 0 ? (plannedRealizedCount / plannedCount) * 100 : 0;

  return {
    plannedCount,
    plannedRealizedCount,
    unplannedRealizedCount,
    totalRealizedCount,
    achievementPct,
    planCompliancePct,
    totalValidFormsCount,
    excludedZeroHmCount,
    hasExplicitPlan,
  };
};
