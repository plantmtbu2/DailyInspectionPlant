import { InspectionPlanEntry, InspectionPlanModule } from '../types';

const PLANS_STORAGE_KEY = 'plant2_inspection_plans_v1';

type PlanListener = (plans: InspectionPlanEntry[]) => void;
const listeners = new Set<PlanListener>();

export const subscribeInspectionPlans = (listener: PlanListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = (plans: InspectionPlanEntry[]) => {
  listeners.forEach(fn => {
    try {
      fn(plans);
    } catch {
      // Ignore listener errors
    }
  });
};

const normalizeUnitCodes = (codes: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of codes) {
    const clean = (raw || '').trim().toUpperCase();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out;
};

export const getInspectionPlans = (): InspectionPlanEntry[] => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p: any) => p && p.date && p.module && Array.isArray(p.plannedUnitCodes))
      .map((p: any) => ({
        id: String(p.id || `${p.date}_${p.module}`),
        date: String(p.date).slice(0, 10),
        module: p.module as InspectionPlanModule,
        plannedUnitCodes: normalizeUnitCodes(p.plannedUnitCodes),
        updatedAt: p.updatedAt || new Date().toISOString(),
      }));
  } catch {
    return [];
  }
};

const saveAllPlans = (plans: InspectionPlanEntry[]): InspectionPlanEntry[] => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
    } catch (e) {
      console.warn('Gagal menyimpan rencana inspeksi:', e);
    }
  }
  notifyListeners(plans);
  return plans;
};

export const getPlanForDateAndModule = (
  date: string,
  module: InspectionPlanModule
): string[] => {
  const cleanDate = (date || '').slice(0, 10);
  const found = getInspectionPlans().find(p => p.date === cleanDate && p.module === module);
  return found ? found.plannedUnitCodes : [];
};

export const savePlanForDateAndModule = (
  date: string,
  module: InspectionPlanModule,
  plannedUnitCodes: string[]
): InspectionPlanEntry[] => {
  const cleanDate = (date || '').slice(0, 10);
  if (!cleanDate) return getInspectionPlans();

  const normalizedCodes = normalizeUnitCodes(plannedUnitCodes);
  const current = getInspectionPlans();
  const id = `${cleanDate}_${module}`;

  if (normalizedCodes.length === 0) {
    const filtered = current.filter(p => !(p.date === cleanDate && p.module === module));
    return saveAllPlans(filtered);
  }

  const nextEntry: InspectionPlanEntry = {
    id,
    date: cleanDate,
    module,
    plannedUnitCodes: normalizedCodes,
    updatedAt: new Date().toISOString(),
  };

  const exists = current.some(p => p.date === cleanDate && p.module === module);
  const updated = exists
    ? current.map(p => (p.date === cleanDate && p.module === module ? nextEntry : p))
    : [nextEntry, ...current];

  return saveAllPlans(updated);
};

export const copyDayPlansToDate = (
  sourceDate: string,
  targetDate: string
): InspectionPlanEntry[] => {
  const src = (sourceDate || '').slice(0, 10);
  const dst = (targetDate || '').slice(0, 10);
  if (!src || !dst || src === dst) return getInspectionPlans();

  const current = getInspectionPlans();
  const sourcePlans = current.filter(p => p.date === src && p.plannedUnitCodes.length > 0);
  if (sourcePlans.length === 0) return current;

  let next = [...current];
  sourcePlans.forEach(sp => {
    const id = `${dst}_${sp.module}`;
    const entry: InspectionPlanEntry = {
      id,
      date: dst,
      module: sp.module,
      plannedUnitCodes: [...sp.plannedUnitCodes],
      updatedAt: new Date().toISOString(),
    };
    const idx = next.findIndex(p => p.date === dst && p.module === sp.module);
    if (idx >= 0) {
      next[idx] = entry;
    } else {
      next.unshift(entry);
    }
  });

  return saveAllPlans(next);
};
