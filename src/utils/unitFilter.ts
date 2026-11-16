import { getAppSettings } from '../services/settingsService';

/**
 * Helper predicates untuk pemisahan Code Unit antara armada Rigid dan Articulated/Grader.
 * Membaca konfigurasi prefix dari modul SETTINGS (default: DT untuk Rigid; GR, CP, WL untuk Artic).
 */

export const isRigidUnitCode = (codeUnit?: string): boolean => {
  const clean = (codeUnit || '').trim().toUpperCase();
  if (!clean) return false;
  const prefixes = getAppSettings().inspection.rigidUnitPrefixes;
  const active = prefixes && prefixes.length > 0 ? prefixes : ['DT'];
  return active.some(p => {
    const pref = (p || '').trim().toUpperCase();
    return pref.length > 0 && clean.startsWith(pref);
  });
};

export const isArticUnitCode = (codeUnit?: string): boolean => {
  const clean = (codeUnit || '').trim().toUpperCase();
  if (!clean) return false;
  const prefixes = getAppSettings().inspection.articUnitPrefixes;
  const active = prefixes && prefixes.length > 0 ? prefixes : ['GR', 'CP', 'WL'];
  return active.some(p => {
    const pref = (p || '').trim().toUpperCase();
    return pref.length > 0 && clean.startsWith(pref);
  });
};
