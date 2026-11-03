export interface CodeUnit {
  id: string;
  codeUnit: string;
  egi: string;
  tipeAlat: string; // e.g. "Rigid Dump Truck", "Articulated Dump Truck", "Motor Grader", "Excavator"
  brand: string; // e.g. "Caterpillar", "Komatsu", "Volvo"
  lokasiPit: string; // e.g. "PIT Barat", "PIT Timur", "Disposal 2", "Workshop Main"
  currentHm: number;
  statusUnit: 'READY' | 'BREAKDOWN' | 'MAINTENANCE' | 'STANDBY';
  lastInspectionDate?: string;
  photoUrl?: string; // Foto unit alat berat (primary / single)
  photoUrls?: string[]; // Foto unit alat berat (multi foto)
}

export interface BAPRecord {
  id: string;
  codeUnit: string;
  hm: number;
  kerusakan: string;
  estimasiPekerjaan: string; // e.g. "4 Jam" / "1 Hari"
  lokasiPekerjaan: string;
  mo: string; // Maintenance Order / Work Order
  tanggal: string; // YYYY-MM-DD
  jam: string;
  picMekanik: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  catatanTambahan?: string;
  syncedToSheets?: boolean;
  photoUrl?: string; // Foto kerusakan / bukti fisik BAP (primary / single)
  photoUrls?: string[]; // Foto kerusakan / bukti fisik BAP (multi foto)
  createdAt: string;
}

export interface ChecklistItemStatus {
  id: string;
  name: string;
  status: 'OK' | 'DEFECT' | 'MONITOR' | 'NA';
  value?: string; // For pressure/voltage/mm
  unit?: string;
  remark?: string;
}

export type QAType = 'DAILY_INSPECTION' | 'QA1_PRE' | 'QA7_FINAL';

export interface DailyCheckRigid {
  id: string;
  qaType?: QAType; // 'QA1_PRE' (QA 1 PRE INSPECTION) or 'QA7_FINAL' (QA 7 FINAL INSPECTION)
  codeUnit: string;
  egi: string;
  tanggal: string;
  status: 'RUNNING' | 'BREAKDOWN' | 'SCHEDULED_SERVICE' | 'STANDBY';
  startTime: string; // HH:mm
  finishTime: string; // HH:mm
  totalJam: string; // Calculated hours e.g. "1.5 Jam"
  hmUnit: number;
  picMekanik: string;
  divalidasiOleh: string; // Foreman / Pengawas
  // 19 Items
  items: ChecklistItemStatus[];
  temuanDeviasi: string; // Temuan Deviasi / ADD ACTIVITIES
  jumlahBacklog: number;
  jumlahAktivitas: number;
  photoUrl?: string; // Foto temuan deviasi / inspeksi unit rigid (primary / single)
  photoUrls?: string[]; // Foto temuan deviasi / inspeksi unit rigid (multi foto)
  syncedToSheets?: boolean;
  createdAt: string;
}

export interface DailyCheckArtic {
  id: string;
  qaType?: QAType; // 'QA1_PRE' (QA 1 PRE INSPECTION) or 'QA7_FINAL' (QA 7 FINAL INSPECTION)
  codeUnit: string;
  egi: string;
  tanggal: string;
  status: 'RUNNING' | 'BREAKDOWN' | 'SCHEDULED_SERVICE' | 'STANDBY';
  startTime: string;
  finishTime: string;
  totalJam: string;
  hmUnit: number;
  picMekanik: string;
  divalidasiOleh: string;
  // 36 Items
  items: ChecklistItemStatus[];
  temuanDeviasi: string;
  jumlahBacklog: number;
  jumlahAktivitas: number;
  photoUrl?: string; // Foto temuan deviasi / inspeksi unit artic (primary / single)
  photoUrls?: string[]; // Foto temuan deviasi / inspeksi unit artic (multi foto)
  syncedToSheets?: boolean;
  createdAt: string;
}

export interface BacklogPart {
  id: string;
  partNumber: string;
  deskripsiPart: string;
  qty: number | string;
}

export interface BacklogItem {
  id: string;
  codeUnit: string;
  moBacklog: string;
  nomorReservasi: string;
  deskripsiBacklog: string;
  parts?: BacklogPart[]; // Mendukung lebih dari 1 sparepart per backlog
  partNumber: string; // Ringkasan part number atau part utama
  deskripsiPart: string; // Ringkasan deskripsi part
  qty: number | string; // Total kuantitas
  sumberTemuan: 'QA1_RIGID' | 'QA7_RIGID' | 'QA1_ARTIC' | 'QA7_ARTIC' | 'DAILY_RIGID' | 'DAILY_ARTIC' | 'PERIODIC_INSPECTION' | 'BREAKDOWN' | 'MANUAL';
  status: 'WAITING_PART' | 'READY_TO_INSTALL' | 'SCHEDULED' | 'CLOSED';
  tanggalTemuan: string;
  pic: string;
  relatedInspectionId?: string;
  photoUrl?: string; // Foto komponen / kerusakan backlog (primary / single)
  photoUrls?: string[]; // Foto komponen / kerusakan backlog (multi foto)
  syncedToSheets?: boolean;
  createdAt: string;
}

export interface AddActivityItem {
  id: string;
  codeUnit: string;
  deskripsiAktivitas: string;
  action: string; // Tindakan perbaikan yang dilakukan
  status: 'PENDING' | 'DONE' | 'MONITORING';
  tanggalTemuan: string;
  pic: string;
  relatedInspectionId?: string;
  photoUrl?: string; // Foto hasil pekerjaan / progres aktivitas mekanik (primary / single)
  photoUrls?: string[]; // Foto hasil pekerjaan / progres aktivitas mekanik (multi foto)
  syncedToSheets?: boolean;
  createdAt: string;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetName: string;
  lastSyncedAt?: string;
  webAppUrl?: string; // Optional Google Apps Script webhook
  isDefault?: boolean; // True if using central default configuration
}
