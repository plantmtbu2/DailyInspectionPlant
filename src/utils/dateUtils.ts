export const formatDateDDMMYYYY = (dateStr?: string): string => {
  if (!dateStr) {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return dateStr;
};

export const formatTimeHHMM = (timeStr?: string): string => {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  if (/^\d{2}:\d{2}$/.test(clean)) return clean;
  if (/^\d{2}:\d{2}:\d{2}$/.test(clean)) return clean.slice(0, 5);
  return clean;
};

/**
 * Normalizes any date string (including DD/MM/YYYY) to YYYY-MM-DD for HTML <input type="date">
 */
export const formatDateForInput = (dateStr?: string): string => {
  if (!dateStr) {
    return new Date().toISOString().slice(0, 10);
  }
  const clean = dateStr.trim();
  // If DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  // If ISO string or other format
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().slice(0, 10);
};
