/**
 * Helper predicates untuk pemisahan Code Unit antara armada Rigid dan Articulated/Grader.
 * - Rigid (Daily Rigid, QA 1 Pre Rigid, QA 7 Final Rigid): hanya unit berawalan DT
 * - Artic (Daily Artic, QA 1 Pre Artic, QA 7 Final Artic): hanya unit berawalan GR, CP, atau WL
 */

export const isRigidUnitCode = (codeUnit?: string): boolean => {
  const clean = (codeUnit || '').trim().toUpperCase();
  return clean.startsWith('DT');
};

export const isArticUnitCode = (codeUnit?: string): boolean => {
  const clean = (codeUnit || '').trim().toUpperCase();
  return (
    clean.startsWith('GR') ||
    clean.startsWith('CP') ||
    clean.startsWith('WL')
  );
};
