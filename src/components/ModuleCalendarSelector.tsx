import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export interface CalendarRecordEntry {
  dateRaw?: string;
  createdAt?: string;
  codeUnit?: string;
  hasAlert?: boolean;
}

interface ModuleCalendarSelectorProps {
  records: CalendarRecordEntry[];
  selectedDate: string | null;
  onSelectDate: (isoDate: string | null) => void;
  moduleTitle: string;
  itemLabel?: string;
  accentTheme?: 'amber' | 'emerald' | 'rose';
}

const MONTH_NAMES_ID = [
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

const WEEKDAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export const normalizeRecordDateToIso = (dateRaw?: string, fallbackCreatedAt?: string): string | null => {
  const tryParse = (raw?: string): string | null => {
    if (!raw || typeof raw !== 'string') return null;
    const clean = raw.trim();
    if (!clean) return null;

    // YYYY-MM-DD or YYYY-MM-DDTHH:mm...
    const ymdMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymdMatch) {
      const y = parseInt(ymdMatch[1], 10);
      const m = parseInt(ymdMatch[2], 10);
      const d = parseInt(ymdMatch[3], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }

    // DD/MM/YYYY or MM/DD/YYYY
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
          return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }
    }

    // DD-MM-YYYY
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length >= 3 && parts[0].length <= 2) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2].slice(0, 4), 10);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }
    }

    return null;
  };

  return tryParse(dateRaw) || tryParse(fallbackCreatedAt);
};

export const formatIsoDateIndonesian = (isoDate: string): string => {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12) return isoDate;
  return `${String(d).padStart(2, '0')} ${MONTH_NAMES_ID[m - 1]} ${y}`;
};

export const ModuleCalendarSelector: React.FC<ModuleCalendarSelectorProps> = ({
  records,
  selectedDate,
  onSelectDate,
  moduleTitle,
  itemLabel = 'Unit',
  accentTheme = 'amber',
}) => {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(
    () =>
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate()
      ).padStart(2, '0')}`,
    [today]
  );

  const [viewMonth, setViewMonth] = useState<number>(() => today.getMonth() + 1);
  const [viewYear, setViewYear] = useState<number>(() => today.getFullYear());
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState<boolean>(false);

  // Aggregate counts, unique units, and alert flags by ISO date
  const dateSummaryMap = useMemo(() => {
    const map = new Map<
      string,
      { count: number; units: Set<string>; hasAlert: boolean }
    >();
    records.forEach(rec => {
      const iso = normalizeRecordDateToIso(rec.dateRaw, rec.createdAt);
      if (!iso) return;
      const cur = map.get(iso) || { count: 0, units: new Set<string>(), hasAlert: false };
      cur.count += 1;
      if (rec.codeUnit) cur.units.add(rec.codeUnit.trim().toUpperCase());
      if (rec.hasAlert) cur.hasAlert = true;
      map.set(iso, cur);
    });
    return map;
  }, [records]);

  const monthStats = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth).padStart(2, '0')}-`;
    let totalRecordsInMonth = 0;
    let activeDaysInMonth = 0;
    const recentDates: Array<{ iso: string; count: number; units: string[] }> = [];

    dateSummaryMap.forEach((val, iso) => {
      if (iso.startsWith(prefix)) {
        totalRecordsInMonth += val.count;
        activeDaysInMonth += 1;
        recentDates.push({ iso, count: val.count, units: Array.from(val.units) });
      }
    });

    recentDates.sort((a, b) => b.iso.localeCompare(a.iso));
    return { totalRecordsInMonth, activeDaysInMonth, recentDates };
  }, [dateSummaryMap, viewMonth, viewYear]);

  // Build calendar cells (Monday-first grid)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth - 1, 1);
    const totalDays = new Date(viewYear, viewMonth, 0).getDate();
    // JS getDay(): 0 = Sun, 1 = Mon ... 6 = Sat -> convert to Mon=0 .. Sun=6
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, iso: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const iso = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, iso });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, iso: null });
    }
    return cells;
  }, [viewMonth, viewYear]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleJumpToday = () => {
    setViewMonth(today.getMonth() + 1);
    setViewYear(today.getFullYear());
    onSelectDate(todayIso);
  };

  const accentClasses =
    accentTheme === 'emerald'
      ? {
          border: 'border-[#4ade80]',
          text: 'text-[#4ade80]',
          bgSoft: 'bg-[#4ade80]/15',
          badgeSolid: 'bg-[#4ade80] text-[#111113]',
          ring: 'ring-[#4ade80]/40',
        }
      : accentTheme === 'rose'
      ? {
          border: 'border-[#fb7185]',
          text: 'text-[#fb7185]',
          bgSoft: 'bg-[#fb7185]/15',
          badgeSolid: 'bg-[#fb7185] text-white',
          ring: 'ring-[#fb7185]/40',
        }
      : {
          border: 'border-[#facc15]',
          text: 'text-[#facc15]',
          bgSoft: 'bg-[#facc15]/15',
          badgeSolid: 'bg-[#facc15] text-[#111113]',
          ring: 'ring-[#facc15]/40',
        };

  const selectedSummary = selectedDate ? dateSummaryMap.get(selectedDate) : null;

  return (
    <div className="bg-[#18181b] border border-[rgba(242,239,235,0.12)] rounded p-3.5 sm:p-4 space-y-3 shadow-sm">
      {/* Header Rule Awal / Active Date Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[rgba(242,239,235,0.08)]">
        <div className="flex items-start sm:items-center space-x-2.5">
          <div className={`p-2 rounded border ${accentClasses.bgSoft} ${accentClasses.border} ${accentClasses.text} shrink-0`}>
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-syne font-extrabold text-xs sm:text-sm text-[#f2efeb] uppercase tracking-tight">
                {moduleTitle}
              </h3>
              {selectedDate ? (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${accentClasses.badgeSolid}`}>
                  Tanggal Dipilih: {formatIsoDateIndonesian(selectedDate)}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[rgba(250,204,21,0.12)] text-[#facc15] border border-[#facc15]/30">
                  Rule Awal: Pilih Tanggal
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-[rgba(242,239,235,0.55)] mt-0.5">
              {selectedDate
                ? `${selectedSummary ? `${selectedSummary.count} data (${selectedSummary.units.size} unit)` : '0 data'} ditemukan pada tanggal ini.`
                : `Klik tanggal pada kalender di bawah untuk menampilkan daftar ${itemLabel.toLowerCase()} yang dilakukan pada tanggal tersebut.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {selectedDate && (
            <>
              <button
                type="button"
                onClick={() => setIsCalendarCollapsed(c => !c)}
                className="px-2.5 py-1.5 rounded border border-[rgba(242,239,235,0.15)] bg-[rgba(242,239,235,0.05)] hover:bg-[rgba(242,239,235,0.1)] text-[#f2efeb] text-[10px] font-mono font-bold uppercase flex items-center space-x-1 transition"
              >
                {isCalendarCollapsed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{isCalendarCollapsed ? 'Buka Kalender' : 'Tutup Kalender'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCalendarCollapsed(false);
                  onSelectDate(null);
                }}
                className="px-2.5 py-1.5 rounded border border-[#fb7185]/40 bg-[#fb7185]/10 hover:bg-[#fb7185]/20 text-[#fb7185] text-[10px] font-mono font-bold uppercase flex items-center space-x-1 transition"
                title="Kembali ke tampilan awal kalender saja"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Kembali ke Kalender</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Calendar Body */}
      {(!selectedDate || !isCalendarCollapsed) && (
        <div className="space-y-3">
          {/* Month Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded border border-[rgba(242,239,235,0.15)] bg-[#111113] hover:bg-[rgba(242,239,235,0.08)] text-[#f2efeb] transition"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-1 rounded bg-[#111113] border border-[rgba(242,239,235,0.12)] font-syne font-extrabold text-xs sm:text-sm text-[#f2efeb] min-w-[155px] text-center uppercase">
                {MONTH_NAMES_ID[viewMonth - 1]} {viewYear}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded border border-[rgba(242,239,235,0.15)] bg-[#111113] hover:bg-[rgba(242,239,235,0.08)] text-[#f2efeb] transition"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-2 text-[10px] font-mono">
              <span className="px-2 py-1 rounded bg-[#111113] border border-[rgba(242,239,235,0.1)] text-[rgba(242,239,235,0.65)]">
                Bulan Ini: <strong className={accentClasses.text}>{monthStats.totalRecordsInMonth} Data</strong> •{' '}
                <strong className="text-[#f2efeb]">{monthStats.activeDaysInMonth} Hari Aktif</strong>
              </span>
              <button
                type="button"
                onClick={handleJumpToday}
                className={`px-2.5 py-1 rounded border font-bold uppercase transition ${accentClasses.border} ${accentClasses.bgSoft} ${accentClasses.text} hover:opacity-85`}
              >
                Hari Ini
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
            {WEEKDAYS_ID.map(dayName => (
              <div
                key={dayName}
                className="py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[rgba(242,239,235,0.5)]"
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarCells.map((cell, idx) => {
              if (!cell.day || !cell.iso) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-12 sm:h-16 rounded bg-[#111113]/40 border border-[rgba(242,239,235,0.04)]"
                  />
                );
              }

              const summary = dateSummaryMap.get(cell.iso);
              const count = summary?.count || 0;
              const unitCount = summary?.units.size || 0;
              const hasData = count > 0;
              const isToday = cell.iso === todayIso;
              const isSelected = cell.iso === selectedDate;
              const unitPreview = summary ? Array.from(summary.units).slice(0, 2).join(', ') : '';

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    onSelectDate(cell.iso);
                  }}
                  title={
                    hasData
                      ? `${formatIsoDateIndonesian(cell.iso)}: ${count} data (${unitCount} unit: ${Array.from(
                          summary?.units || []
                        ).join(', ')})`
                      : `${formatIsoDateIndonesian(cell.iso)}: Belum ada data`
                  }
                  className={`relative h-12 sm:h-16 p-1 sm:p-1.5 rounded border text-left flex flex-col justify-between transition active:scale-95 ${
                    isSelected
                      ? `${accentClasses.bgSoft} ${accentClasses.border} ring-2 ${accentClasses.ring}`
                      : hasData
                      ? 'bg-[#111113] border-[rgba(242,239,235,0.22)] hover:border-[#facc15]/70'
                      : 'bg-[#111113]/70 border-[rgba(242,239,235,0.08)] hover:border-[rgba(242,239,235,0.22)]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`font-mono text-[11px] sm:text-xs font-bold leading-none ${
                        isSelected
                          ? accentClasses.text
                          : isToday
                          ? 'text-[#38bdf8] underline'
                          : hasData
                          ? 'text-[#f2efeb]'
                          : 'text-[rgba(242,239,235,0.45)]'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {isToday && (
                      <span className="hidden sm:inline text-[8px] font-mono font-bold uppercase px-1 rounded bg-[#38bdf8]/15 text-[#38bdf8]">
                        Today
                      </span>
                    )}
                    {summary?.hasAlert && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#fb7185] shrink-0"
                        title="Ada temuan Defect / Status Open"
                      />
                    )}
                  </div>

                  {hasData ? (
                    <div className="w-full space-y-0.5">
                      <div
                        className={`inline-flex items-center space-x-1 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold leading-none ${
                          isSelected ? accentClasses.badgeSolid : 'bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30'
                        }`}
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 hidden sm:inline shrink-0" />
                        <span>
                          {count} {itemLabel}
                        </span>
                      </div>
                      {unitPreview && (
                        <div className="hidden md:block text-[8px] font-mono text-[rgba(242,239,235,0.55)] truncate">
                          {unitPreview}
                          {(summary?.units.size || 0) > 2 ? '…' : ''}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[8px] font-mono text-[rgba(242,239,235,0.22)] hidden sm:block">
                      —
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Month Active Dates Strip */}
          {monthStats.recentDates.length > 0 && (
            <div className="pt-2 border-t border-[rgba(242,239,235,0.08)] flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase text-[rgba(242,239,235,0.5)] mr-1">
                Tanggal Terisi ({MONTH_NAMES_ID[viewMonth - 1]}):
              </span>
              {monthStats.recentDates.slice(0, 8).map(d => (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => onSelectDate(d.iso)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                    selectedDate === d.iso
                      ? `${accentClasses.badgeSolid} border-transparent`
                      : 'bg-[#111113] border-[rgba(242,239,235,0.15)] text-[#f2efeb] hover:border-[#facc15]'
                  }`}
                >
                  {d.iso.slice(8, 10)} {MONTH_NAMES_ID[viewMonth - 1].slice(0, 3)} ({d.count})
                </button>
              ))}
            </div>
          )}

          {records.length === 0 && (
            <div className="flex items-center space-x-2 text-[11px] font-mono text-[rgba(242,239,235,0.5)] bg-[#111113] px-3 py-2 rounded border border-[rgba(242,239,235,0.08)]">
              <AlertCircle className="w-3.5 h-3.5 text-[#facc15] shrink-0" />
              <span>Belum ada data tersimpan pada modul ini. Klik tombol "+ Buat" di atas untuk menambahkan data baru.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
