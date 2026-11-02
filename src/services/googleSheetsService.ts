import { getAccessToken } from './firebaseAuth';
import {
  CodeUnit,
  BAPRecord,
  DailyCheckRigid,
  DailyCheckArtic,
  BacklogItem,
  BacklogPart,
  AddActivityItem,
  GoogleSheetsConfig,
} from '../types';
import { RIGID_CHECKLIST_ITEMS, ARTIC_CHECKLIST_ITEMS } from '../constants/checklists';

const SHEETS_CONFIG_KEY = 'fleetcheck_google_sheets_config';

// -----------------------------------------------------------------------------
// VERCEL & GLOBAL CONFIGURATION FOR ALL LOGINS / EMAILS
// -----------------------------------------------------------------------------
const ENV_SHEET_ID = (import.meta.env.VITE_GOOGLE_SHEET_ID || '').trim();
const ENV_WEBAPP_URL = (import.meta.env.VITE_GOOGLE_SHEET_WEBAPP_URL || '').trim();
const ENV_SHEET_NAME = (import.meta.env.VITE_GOOGLE_SHEET_NAME || '').trim();

// Default fallback ID, WebApp URL, and Sheet Name for Plant 2 Mining Fleet maintenance database
export const DEFAULT_FALLBACK_SHEET_ID = '1Edi1OqWr4YJ76tPvn3KaEV8Xfkxccfk9T4UiWwDFci4';
export const DEFAULT_FALLBACK_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzusDZkOvVltf-h5c1BrhPIjw66IjQ-Fk41RkF1TMoINzVjFYz2XzxgjFIAnUQUwOl60Q/exec';
export const DEFAULT_FALLBACK_SHEET_NAME = 'Daily Plant MTBU';

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  spreadsheetId: ENV_SHEET_ID || DEFAULT_FALLBACK_SHEET_ID,
  spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${ENV_SHEET_ID || DEFAULT_FALLBACK_SHEET_ID}/edit`,
  spreadsheetName: ENV_SHEET_NAME || DEFAULT_FALLBACK_SHEET_NAME,
  webAppUrl: ENV_WEBAPP_URL || DEFAULT_FALLBACK_WEBAPP_URL,
  lastSyncedAt: new Date().toISOString(),
  isDefault: true,
};

export const getStoredSheetsConfig = (): GoogleSheetsConfig | null => {
  try {
    const raw = localStorage.getItem(SHEETS_CONFIG_KEY);
    if (raw) {
      if (raw === '__DISCONNECTED__') {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.spreadsheetId || parsed.webAppUrl)) {
        return {
          ...parsed,
          isDefault: false,
        };
      }
    }
    // Return default Plant 2 configuration for Vercel and all user logins/devices
    return DEFAULT_SHEETS_CONFIG;
  } catch {
    return DEFAULT_SHEETS_CONFIG;
  }
};

export const saveStoredSheetsConfig = (config: GoogleSheetsConfig | null) => {
  if (!config) {
    localStorage.setItem(SHEETS_CONFIG_KEY, '__DISCONNECTED__');
  } else {
    localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(config));
  }
};

export const resetToDefaultSheetsConfig = (): GoogleSheetsConfig => {
  localStorage.removeItem(SHEETS_CONFIG_KEY);
  return DEFAULT_SHEETS_CONFIG;
};

/**
 * GOOGLE APPS SCRIPT CONNECTOR - PLANT 2 FLEETCHECK
 * Pasang di Google Spreadsheet agar selalu terhubung 24/7 tanpa kedaluwarsa token & tanpa perlu login ulang!
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT CONNECTOR - PLANT 2 FLEETCHECK
 * CARA PASANG:
 * 1. Buka Google Sheet > Ekstensi (Extensions) > Apps Script
 * 2. Hapus seluruh isi kode bawaan, lalu Tempel (Paste) seluruh kode ini
 * 3. Klik tombol "Deploy" (Terapkan) di kanan atas > "New deployment" (Penerapan baru)
 * 4. Klik ikon gerigi (Select type) > pilih "Web app" (Aplikasi Web)
 * 5. Deskripsi: "Plant 2 FleetCheck API"
 * 6. Execute as (Jalankan sebagai): "Me" (Saya / akun Google Anda)
 * 7. Who has access (Siapa yang memiliki akses): "Anyone" (Siapa saja)
 * 8. Klik "Deploy", klik "Authorize access", lalu salin URL Web App ke Aplikasi!
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var params = {};
    if (e && e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        params = e.parameter || {};
      }
    } else if (e && e.parameter) {
      params = e.parameter;
    }

    var action = params.action || 'ping';

    if (action === 'ping') {
      return jsonResponse({
        status: 'success',
        message: 'Koneksi Google Sheet Aktif',
        sheetTitle: ss.getName(),
        spreadsheetId: ss.getId(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'pullAll') {
      var tabs = ['CODE_UNIT', 'BAP', 'DAILY_CHECK_RIGID', 'DAILY_CHECK_ARTIC', 'BACKLOG', 'ADD_ACTIVITIES'];
      var result = {};
      tabs.forEach(function(tabName) {
        var sheet = ss.getSheetByName(tabName);
        if (sheet && sheet.getLastRow() > 1) {
          result[tabName] = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
        } else {
          result[tabName] = [];
        }
      });
      return jsonResponse({ status: 'success', data: result });
    }

    if (action === 'pushAll') {
      var data = params.data || {};
      ensureAllTabs(ss);

      if (data.codeUnits) writeTab(ss, 'CODE_UNIT', data.codeUnits, 9);
      if (data.bapList) writeTab(ss, 'BAP', data.bapList, 14);
      if (data.dailyRigidList) writeTab(ss, 'DAILY_CHECK_RIGID', data.dailyRigidList, 36);
      if (data.dailyArticList) writeTab(ss, 'DAILY_CHECK_ARTIC', data.dailyArticList, 53);
      if (data.backlogs) writeTab(ss, 'BACKLOG', data.backlogs, 15);
      if (data.activities) writeTab(ss, 'ADD_ACTIVITIES', data.activities, 9);

      return jsonResponse({
        status: 'success',
        message: 'Semua inputan berhasil disinkronkan ke Google Sheet tanpa diringkas',
        timestamp: new Date().toISOString()
      });
    }

    return jsonResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function writeTab(ss, sheetName, rows, defaultCols) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), defaultCols)).clearContent();
  }
  if (rows && rows.length > 0) {
    var cols = rows[0].length || defaultCols;
    sheet.getRange(2, 1, rows.length, cols).setValues(rows);
  }
}

function ensureAllTabs(ss) {
  var rigidHeaders = [
    'ID', 'Tipe Menu / QA', 'Code Unit', 'EGI', 'Tanggal', 'Status Unit', 'Start Time', 'Finish Time', 'Total Jam', 'HM Unit', 'PIC Mekanik',
    '1. Engine Oil Level', '2. T/M Oil Level', '3. Hyd Oil Level', '4. V-Belts', '5. E/G Oil Leakage', '6. Common Rail Connector', '7. Injector Tube', '8. FM Radio', '9. Fatigue Warning', '10. Power Window', '11. Operator Seat', '12. Hand Rail', '13. Common Rail Press ON (kg/cm²)', '14. Power Supply Voltage ON (V)', '15. Susp Pressure FL (mm/kg)', '16. Susp Pressure FR (mm/kg)', '17. Susp Pressure RL (mm/kg)', '18. Susp Pressure RR (mm/kg)', '19. Tyre Condition',
    'Temuan Deviasi / ADD ACTIVITIES', 'Jumlah Backlog', 'Jumlah Aktivitas', 'Divalidasi Oleh', 'Dibuat Pada', 'Foto Temuan (URL)'
  ];

  var articHeaders = [
    'ID', 'Tipe Menu / QA', 'Code Unit', 'EGI', 'Tanggal', 'Status Unit', 'Start Time', 'Finish Time', 'Total Jam', 'HM Unit', 'PIC Mekanik',
    '1. Lock Door & Handle', '2. Wiper & Washer', '3. Radio Komunikasi', '4. Rotary Lamp', '5. Work Lamp Front/Rear', '6. LOTO / Safety Isolation', '7. Air Pressure Indicator', '8. Lever Hydraulic CV', '9. Engine Oil Level', '10. Coolant Radiator Level', '11. V-Belt & AC Compressor', '12. Transmission Oil Level', '13. Hydraulic Oil Level', '14. Hydraulic Oil Leaks', '15. Fuel Wiggins Pressureless', '16. Battery & Terminal', '17. PDU Power Distribution', '18. Spider Joint / Drive Shaft', '19. Pin Lock Artic', '20. Artic Frame Lubrication', '21. Grease Fitting & Auto Lube', '22. LH Steering Cylinder', '23. RH Steering Cylinder', '24. LH Articulation Cylinder', '25. RH Articulation Cylinder', '26. Pinion & Segment Circle', '27. Spacer & Wear Plate Circle', '28. Circle Reverse Motor', '29. Guide Blade & Cutting Edge', '30. Wheel Leaning Cylinder', '31. Blade Side Shift Cylinder', '32. Power Tilt Cylinder', '33. Drawbar Ball Joint Cylinder', '34. LH Lift Cylinder', '35. RH Lift Cylinder', '36. Ripper / Scarifier Cylinder',
    'Temuan Deviasi / ADD ACTIVITIES', 'Jumlah Backlog', 'Jumlah Aktivitas', 'Divalidasi Oleh', 'Dibuat Pada', 'Foto Temuan (URL)'
  ];

  var defs = [
    { name: 'CODE_UNIT', headers: ['ID', 'Code Unit', 'EGI', 'Tipe Alat', 'Brand', 'Lokasi PIT', 'Current HM', 'Status Unit', 'Foto Unit'] },
    { name: 'BAP', headers: ['ID', 'Code Unit', 'HM Unit', 'Deskripsi Kerusakan', 'Estimasi Pekerjaan', 'Lokasi Pekerjaan', 'MO', 'Tanggal', 'Jam', 'PIC Mekanik', 'Status', 'Catatan Tambahan', 'Dibuat Pada', 'Foto BAP'] },
    { name: 'DAILY_CHECK_RIGID', headers: rigidHeaders },
    { name: 'DAILY_CHECK_ARTIC', headers: articHeaders },
    { name: 'BACKLOG', headers: ['ID', 'Code Unit', 'MO Backlog', 'Nomor Reservasi', 'Deskripsi Backlog', 'Part Number Utama', 'Deskripsi Part Utama', 'Qty Utama', 'Rincian Semua Spareparts (Item per Item)', 'Sumber Temuan', 'Status', 'Tanggal Temuan', 'PIC', 'Dibuat Pada', 'Foto Backlog'] },
    { name: 'ADD_ACTIVITIES', headers: ['ID', 'Code Unit', 'Deskripsi Aktivitas', 'Tindakan (Action)', 'Status', 'Tanggal Temuan', 'PIC Mekanik', 'Dibuat Pada', 'Foto Aktivitas'] }
  ];

  defs.forEach(function(d) {
    var s = ss.getSheetByName(d.name);
    if (!s) {
      s = ss.insertSheet(d.name);
    }
    if (s.getLastRow() === 0 || s.getLastColumn() < d.headers.length) {
      s.getRange(1, 1, 1, d.headers.length).setValues([d.headers]).setBackground('#f3f4f6').setFontWeight('bold');
      s.setFrozenRows(1);
    }
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

/**
 * Uji konektivitas langsung ke Google Sheet (mendukung Web App, OAuth, dan GViz)
 */
export const testGoogleSheetConnection = async (): Promise<{
  success: boolean;
  message: string;
  sheetTitle?: string;
  method: 'WEB_APP' | 'OAUTH' | 'GVIZ' | 'NONE';
}> => {
  const config = getStoredSheetsConfig();
  if (!config?.spreadsheetId && !config?.webAppUrl) {
    return {
      success: false,
      message: 'Belum ada Google Sheet atau Web App URL yang ditautkan.',
      method: 'NONE',
    };
  }

  // 1. Tes Web App URL jika terkonfigurasi (Metode paling stabil, bebas kedaluwarsa)
  if (config.webAppUrl) {
    try {
      const res = await fetch(`${config.webAppUrl}?action=ping`);
      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.status === 'success' || json?.sheetTitle) {
          return {
            success: true,
            sheetTitle: json.sheetTitle || config.spreadsheetName,
            message: 'Terhubung melalui Web App Google Sheet (Aktif 24/7 tanpa kedaluwarsa token)',
            method: 'WEB_APP',
          };
        }
      }
    } catch (e: any) {
      console.warn('Ping Web App failed:', e);
    }
  }

  // 2. Tes OAuth Google Sheets API v4
  const token = await getAccessToken();
  if (token && config.spreadsheetId) {
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          sheetTitle: data.properties?.title || config.spreadsheetName,
          message: 'Terhubung melalui Akun Google Workspace (OAuth Aktif)',
          method: 'OAUTH',
        };
      }
    } catch {}
  }

  // 3. Tes GViz Link Fallback
  if (config.spreadsheetId) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/gviz/tq?tqx=out:json&sheet=CODE_UNIT`;
      const res = await fetch(gvizUrl);
      if (res.ok) {
        return {
          success: true,
          sheetTitle: config.spreadsheetName,
          message: 'Terhubung melalui Tautan Google Spreadsheet',
          method: 'GVIZ',
        };
      }
    } catch {}
  }

  return {
    success: false,
    message: 'Tidak dapat menghubungi Google Sheet. Periksa koneksi internet atau hak akses.',
    method: 'NONE',
  };
};

// -------------------------------------------------------------
// UNCONSOLIDATED (UNSUMMARIZED) COMPLETE GOOGLE SHEET HEADERS
// Semua inputan ditampilkan 100% lengkap tanpa diringkas!
// -------------------------------------------------------------
export const CODE_UNIT_SHEET_HEADERS = [
  'ID',
  'Code Unit',
  'EGI',
  'Tipe Alat',
  'Brand',
  'Lokasi PIT',
  'Current HM',
  'Status Unit',
  'Foto Unit',
];

export const BAP_SHEET_HEADERS = [
  'ID',
  'Code Unit',
  'HM Unit',
  'Deskripsi Kerusakan',
  'Estimasi Pekerjaan',
  'Lokasi Pekerjaan',
  'MO',
  'Tanggal',
  'Jam',
  'PIC Mekanik',
  'Status',
  'Catatan Tambahan',
  'Dibuat Pada',
  'Foto BAP',
];

export const RIGID_SHEET_HEADERS = [
  'ID',
  'Tipe Menu / QA',
  'Code Unit',
  'EGI',
  'Tanggal',
  'Status Unit',
  'Start Time',
  'Finish Time',
  'Total Jam',
  'HM Unit',
  'PIC Mekanik',
  ...RIGID_CHECKLIST_ITEMS.map(i => i.name),
  'Temuan Deviasi / ADD ACTIVITIES',
  'Jumlah Backlog',
  'Jumlah Aktivitas',
  'Divalidasi Oleh',
  'Dibuat Pada',
  'Foto Temuan (URL)',
];

export const ARTIC_SHEET_HEADERS = [
  'ID',
  'Tipe Menu / QA',
  'Code Unit',
  'EGI',
  'Tanggal',
  'Status Unit',
  'Start Time',
  'Finish Time',
  'Total Jam',
  'HM Unit',
  'PIC Mekanik',
  ...ARTIC_CHECKLIST_ITEMS.map(i => i.name),
  'Temuan Deviasi / ADD ACTIVITIES',
  'Jumlah Backlog',
  'Jumlah Aktivitas',
  'Divalidasi Oleh',
  'Dibuat Pada',
  'Foto Temuan (URL)',
];

export const BACKLOG_SHEET_HEADERS = [
  'ID',
  'Code Unit',
  'MO Backlog',
  'Nomor Reservasi',
  'Deskripsi Backlog',
  'Part Number Utama',
  'Deskripsi Part Utama',
  'Qty Utama',
  'Rincian Semua Spareparts (Item per Item)',
  'Sumber Temuan',
  'Status',
  'Tanggal Temuan',
  'PIC',
  'Dibuat Pada',
  'Foto Backlog',
];

export const ADD_ACTIVITIES_SHEET_HEADERS = [
  'ID',
  'Code Unit',
  'Deskripsi Aktivitas',
  'Tindakan (Action)',
  'Status',
  'Tanggal Temuan',
  'PIC Mekanik',
  'Dibuat Pada',
  'Foto Aktivitas',
];

export const buildRigidSheetRow = (r: DailyCheckRigid): (string | number)[] => {
  const qaLabel =
    r.qaType === 'QA7_FINAL'
      ? 'QA 7 FINAL INSPECTION RIGID'
      : r.qaType === 'QA1_PRE'
      ? 'QA 1 PRE INSPECTION RIGID'
      : 'DAILY INSPECTION RIGID';

  const itemValues = RIGID_CHECKLIST_ITEMS.map(def => {
    const found = (r.items || []).find(i => i.id === def.id || i.name === def.name);
    if (!found) return '-';
    if (def.type === 'measurement') {
      return found.value ? `${found.value} ${def.unit || ''}`.trim() : (found.status || 'OK');
    }
    return found.remark ? `${found.status} (${found.remark})` : found.status || 'OK';
  });

  return [
    r.id,
    qaLabel,
    r.codeUnit,
    r.egi,
    r.tanggal,
    r.status,
    r.startTime,
    r.finishTime,
    r.totalJam,
    r.hmUnit,
    r.picMekanik,
    ...itemValues,
    r.temuanDeviasi || '-',
    r.jumlahBacklog || 0,
    r.jumlahAktivitas || 0,
    r.divalidasiOleh || '-',
    r.createdAt,
    r.photoUrl || '',
  ];
};

export const buildArticSheetRow = (a: DailyCheckArtic): (string | number)[] => {
  const qaLabel =
    a.qaType === 'QA7_FINAL'
      ? 'QA 7 FINAL INSPECTION ARTIC'
      : a.qaType === 'QA1_PRE'
      ? 'QA 1 PRE INSPECTION ARTIC'
      : 'DAILY INSPECTION ARTIC';

  const itemValues = ARTIC_CHECKLIST_ITEMS.map(def => {
    const found = (a.items || []).find(i => i.id === def.id || i.name === def.name);
    if (!found) return '-';
    return found.remark ? `${found.status} (${found.remark})` : found.status || 'OK';
  });

  return [
    a.id,
    qaLabel,
    a.codeUnit,
    a.egi,
    a.tanggal,
    a.status,
    a.startTime,
    a.finishTime,
    a.totalJam,
    a.hmUnit,
    a.picMekanik,
    ...itemValues,
    a.temuanDeviasi || '-',
    a.jumlahBacklog || 0,
    a.jumlahAktivitas || 0,
    a.divalidasiOleh || '-',
    a.createdAt,
    a.photoUrl || '',
  ];
};

export const buildBacklogSheetRow = (bl: BacklogItem): (string | number)[] => {
  const mainPartNo = bl.parts && bl.parts.length > 0 ? bl.parts[0].partNumber : bl.partNumber || '';
  const mainDesc = bl.parts && bl.parts.length > 0 ? bl.parts[0].deskripsiPart : bl.deskripsiPart || '';
  const mainQty = bl.parts && bl.parts.length > 0 ? bl.parts[0].qty : bl.qty || 1;

  const detailedParts =
    bl.parts && bl.parts.length > 0
      ? bl.parts.map((p, i) => `[Part ${i + 1}] PN: ${p.partNumber} | Desc: ${p.deskripsiPart} | Qty: ${p.qty}`).join(' ; ')
      : `PN: ${bl.partNumber} | Desc: ${bl.deskripsiPart} | Qty: ${bl.qty}`;

  return [
    bl.id,
    bl.codeUnit,
    bl.moBacklog,
    bl.nomorReservasi,
    bl.deskripsiBacklog,
    mainPartNo,
    mainDesc,
    mainQty,
    detailedParts,
    bl.sumberTemuan,
    bl.status,
    bl.tanggalTemuan,
    bl.pic,
    bl.createdAt || new Date().toISOString(),
    bl.photoUrl || '',
  ];
};

export const buildBapSheetRow = (b: BAPRecord): (string | number)[] => [
  b.id,
  b.codeUnit,
  b.hm,
  b.kerusakan,
  b.estimasiPekerjaan,
  b.lokasiPekerjaan,
  b.mo,
  b.tanggal,
  b.jam,
  b.picMekanik,
  b.status,
  b.catatanTambahan || '',
  b.createdAt,
  b.photoUrl || '',
];

export const buildActivitySheetRow = (act: AddActivityItem): (string | number)[] => [
  act.id,
  act.codeUnit,
  act.deskripsiAktivitas,
  act.action,
  act.status,
  act.tanggalTemuan,
  act.pic,
  act.createdAt,
  act.photoUrl || '',
];

export const buildCodeUnitSheetRow = (u: CodeUnit): (string | number)[] => [
  u.id,
  u.codeUnit,
  u.egi,
  u.tipeAlat,
  u.brand,
  u.lokasiPit,
  u.currentHm,
  u.statusUnit,
  u.photoUrl || '',
];

/**
 * Creates a formatted Google Spreadsheet with all required tabs and column headers
 */
export const createMaintenanceSpreadsheet = async (sheetTitle = 'FleetCheck_Mining_Maintenance_DB'): Promise<GoogleSheetsConfig> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Belum login dengan akun Google. Silakan login terlebih dahulu.');
  }

  const payload = {
    properties: {
      title: `${sheetTitle}_${new Date().toISOString().slice(0, 10)}`,
    },
    sheets: [
      {
        properties: {
          title: 'CODE_UNIT',
          gridProperties: { rowCount: 150, columnCount: 12, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'BAP',
          gridProperties: { rowCount: 500, columnCount: 16, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'DAILY_CHECK_RIGID',
          gridProperties: { rowCount: 500, columnCount: 40, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'DAILY_CHECK_ARTIC',
          gridProperties: { rowCount: 500, columnCount: 60, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'BACKLOG',
          gridProperties: { rowCount: 500, columnCount: 20, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'ADD_ACTIVITIES',
          gridProperties: { rowCount: 500, columnCount: 12, frozenRowCount: 1 },
        },
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || 'Gagal membuat Google Spreadsheet baru.');
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write headers for all sheets
  await initializeSheetHeaders(spreadsheetId, token);

  const config: GoogleSheetsConfig = {
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetName: payload.properties.title,
    lastSyncedAt: new Date().toISOString(),
  };

  saveStoredSheetsConfig(config);
  return config;
};

/**
 * Initialize headers in the newly created or connected sheet
 */
export const initializeSheetHeaders = async (spreadsheetId: string, token: string) => {
  const headerData = [
    {
      range: 'CODE_UNIT!A1:I1',
      values: [CODE_UNIT_SHEET_HEADERS],
    },
    {
      range: 'BAP!A1:N1',
      values: [BAP_SHEET_HEADERS],
    },
    {
      range: 'DAILY_CHECK_RIGID!A1:AJ1',
      values: [RIGID_SHEET_HEADERS],
    },
    {
      range: 'DAILY_CHECK_ARTIC!A1:BA1',
      values: [ARTIC_SHEET_HEADERS],
    },
    {
      range: 'BACKLOG!A1:O1',
      values: [BACKLOG_SHEET_HEADERS],
    },
    {
      range: 'ADD_ACTIVITIES!A1:I1',
      values: [ADD_ACTIVITIES_SHEET_HEADERS],
    },
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: headerData,
    }),
  });
};

/**
 * Ensures that all 6 required tabs exist in the connected spreadsheet.
 * If any tab is missing, it creates the tab and initializes the header.
 */
export const ensureAllTabsExist = async (spreadsheetId: string, token: string) => {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return;
    const meta = await metaRes.json();
    const existingTitles: string[] = (meta.sheets || []).map((s: any) => s.properties?.title);

    const requiredTabs = [
      'CODE_UNIT',
      'BAP',
      'DAILY_CHECK_RIGID',
      'DAILY_CHECK_ARTIC',
      'BACKLOG',
      'ADD_ACTIVITIES',
    ];
    const missingTabs = requiredTabs.filter(t => !existingTitles.includes(t));

    if (missingTabs.length > 0) {
      const requests = missingTabs.map(title => ({
        addSheet: {
          properties: {
            title,
            gridProperties: { rowCount: 500, columnCount: 30, frozenRowCount: 1 },
          },
        },
      }));

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      await initializeSheetHeaders(spreadsheetId, token);
    }
  } catch (err) {
    console.warn('Could not verify/add missing tabs:', err);
  }
};

/**
 * Clears existing rows and writes the updated array of rows to a sheet
 * This keeps Google Sheets in 100% exact reflection of the app state (adds, edits, deletes).
 */
export const overwriteSheetRows = async (sheetName: string, rows: (string | number | boolean)[][], endCol = 'Z') => {
  const config = getStoredSheetsConfig();
  if (!config?.spreadsheetId) return false;

  try {
    const token = await getAccessToken();
    if (!token) return false;

    // 1. Clear existing data rows using batchClear with proper JSON body
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values:batchClear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ranges: [`${sheetName}!A2:${endCol}`],
        }),
      }
    ).catch(err => {
      console.warn(`Non-fatal batchClear warning on ${sheetName}:`, err);
    });

    // 2. If there are rows to write, write them starting at A2 using batchUpdate
    if (rows.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: [
              {
                range: `${sheetName}!A2`,
                values: rows,
              },
            ],
          }),
        }
      ).catch(err => {
        console.warn(`Non-fatal batchUpdate warning on ${sheetName}:`, err);
      });
    }
    return true;
  } catch (err) {
    console.error(`Error overwriting sheet ${sheetName}:`, err);
    return false;
  }
};

/**
 * Row Parsers shared between Web App and Google Sheets API / GViz
 */
const parseCodeUnitRows = (rows: any[][]): CodeUnit[] => {
  return rows
    .filter(r => r[0] && r[1])
    .map(r => ({
      id: String(r[0] || ''),
      codeUnit: String(r[1] || '').toUpperCase(),
      egi: String(r[2] || ''),
      tipeAlat: String(r[3] || 'Rigid Dump Truck'),
      brand: String(r[4] || 'Caterpillar'),
      lokasiPit: String(r[5] || 'PIT Area'),
      currentHm: Number(r[6]) || 0,
      statusUnit: (['READY', 'BREAKDOWN', 'MAINTENANCE', 'STANDBY'].includes(r[7]) ? r[7] : 'READY') as any,
      photoUrl: String(r[8] || '') || undefined,
    }));
};

const parseBapRows = (rows: any[][]): BAPRecord[] => {
  return rows
    .filter(r => r[0] && r[1])
    .map(r => ({
      id: String(r[0]),
      codeUnit: String(r[1]),
      hm: Number(r[2]) || 0,
      kerusakan: String(r[3] || ''),
      estimasiPekerjaan: String(r[4] || '4 Jam'),
      lokasiPekerjaan: String(r[5] || 'PIT Area'),
      mo: String(r[6] || ''),
      tanggal: String(r[7] || new Date().toISOString().slice(0, 10)),
      jam: String(r[8] || '08:00'),
      picMekanik: String(r[9] || ''),
      status: (['OPEN', 'IN_PROGRESS', 'COMPLETED'].includes(r[10]) ? r[10] : 'OPEN') as any,
      catatanTambahan: String(r[11] || ''),
      syncedToSheets: true,
      createdAt: String(r[12] || new Date().toISOString()),
      photoUrl: String(r[13] || '') || undefined,
    }));
};

const parseRigidRows = (rows: any[][]): DailyCheckRigid[] => {
  return rows
    .filter(r => r && r[0] && (r[1] || r[2]))
    .map(r => {
      // Check if this row is using the new unsummarized layout (>= 30 columns)
      const isUnsummarized = r.length >= 30;

      if (isUnsummarized) {
        const id = String(r[0] || '');
        const qaTypeRaw = String(r[1] || '');
        const qaType = qaTypeRaw.includes('QA 7') || id.startsWith('QA7')
          ? 'QA7_FINAL'
          : qaTypeRaw.includes('DAILY') || id.startsWith('DAILY')
          ? 'DAILY_INSPECTION'
          : 'QA1_PRE';

        const codeUnit = String(r[2] || '');
        const egi = String(r[3] || '');
        const tanggal = String(r[4] || '');
        const status = (['RUNNING', 'BREAKDOWN', 'SCHEDULED_SERVICE', 'STANDBY'].includes(r[5]) ? r[5] : 'RUNNING') as any;
        const startTime = String(r[6] || '07:00');
        const finishTime = String(r[7] || '08:30');
        const totalJam = String(r[8] || '1.5 Jam');
        const hmUnit = Number(r[9]) || 0;
        const picMekanik = String(r[10] || '');

        // Items are in columns 11 to 29 (19 items)
        const items = RIGID_CHECKLIST_ITEMS.map((def, idx) => {
          const rawVal = String(r[11 + idx] ?? 'OK');
          if (def.type === 'measurement') {
            const cleanVal = rawVal.replace(new RegExp(`\\s*${def.unit || ''}$`, 'i'), '').trim();
            return {
              id: def.id,
              name: def.name,
              status: 'OK' as const,
              value: cleanVal || rawVal,
              unit: def.unit,
            };
          }
          const isDefect = rawVal.toUpperCase().startsWith('DEFECT');
          const isMonitor = rawVal.toUpperCase().startsWith('MONITOR');
          const isNA = rawVal.toUpperCase().startsWith('NA');
          const statusVal = isDefect ? ('DEFECT' as const) : isMonitor ? ('MONITOR' as const) : isNA ? ('NA' as const) : ('OK' as const);
          const remarkMatch = rawVal.match(/\((.*?)\)/);
          return {
            id: def.id,
            name: def.name,
            status: statusVal,
            remark: remarkMatch ? remarkMatch[1] : undefined,
          };
        });

        const temuanDeviasi = String(r[30] || '');
        const jumlahBacklog = Number(r[31]) || 0;
        const jumlahAktivitas = Number(r[32]) || 0;
        const divalidasiOleh = String(r[33] || '');
        const createdAt = String(r[34] || new Date().toISOString());
        const photoUrl = String(r[35] || '') || undefined;

        return {
          id,
          qaType,
          codeUnit,
          egi,
          tanggal,
          status,
          startTime,
          finishTime,
          totalJam,
          hmUnit,
          picMekanik,
          items,
          temuanDeviasi,
          jumlahBacklog,
          jumlahAktivitas,
          divalidasiOleh,
          createdAt,
          photoUrl,
          syncedToSheets: true,
        };
      }

      // Legacy fallback (summarized rows)
      let parsedItems = RIGID_CHECKLIST_ITEMS.map(def => ({
        id: def.id,
        name: def.name,
        status: 'OK' as const,
        value: '',
      }));

      if (r[16]) {
        try {
          parsedItems = JSON.parse(r[16]);
        } catch {}
      }

      return {
        id: String(r[0]),
        qaType: (String(r[0]).startsWith('DAILY') ? 'DAILY_INSPECTION' : String(r[0]).startsWith('QA7') ? 'QA7_FINAL' : 'QA1_PRE') as any,
        codeUnit: String(r[1]),
        egi: String(r[2] || ''),
        tanggal: String(r[3] || ''),
        status: (['RUNNING', 'BREAKDOWN', 'SCHEDULED_SERVICE', 'STANDBY'].includes(r[4]) ? r[4] : 'RUNNING') as any,
        startTime: String(r[5] || '07:00'),
        finishTime: String(r[6] || '08:30'),
        totalJam: String(r[7] || '1.5 Jam'),
        hmUnit: Number(r[8]) || 0,
        picMekanik: String(r[9] || ''),
        temuanDeviasi: String(r[11] || ''),
        jumlahBacklog: Number(r[12]) || 0,
        jumlahAktivitas: Number(r[13]) || 0,
        divalidasiOleh: String(r[14] || ''),
        items: parsedItems,
        syncedToSheets: true,
        createdAt: String(r[17] || new Date().toISOString()),
        photoUrl: String(r[18] || '') || undefined,
      };
    });
};

const parseArticRows = (rows: any[][]): DailyCheckArtic[] => {
  return rows
    .filter(r => r && r[0] && (r[1] || r[2]))
    .map(r => {
      // Check if this row is using the new unsummarized layout (>= 45 columns)
      const isUnsummarized = r.length >= 45;

      if (isUnsummarized) {
        const id = String(r[0] || '');
        const qaTypeRaw = String(r[1] || '');
        const qaType = qaTypeRaw.includes('QA 7') || id.startsWith('QA7')
          ? 'QA7_FINAL'
          : qaTypeRaw.includes('DAILY') || id.startsWith('DAILY')
          ? 'DAILY_INSPECTION'
          : 'QA1_PRE';

        const codeUnit = String(r[2] || '');
        const egi = String(r[3] || '');
        const tanggal = String(r[4] || '');
        const status = (['RUNNING', 'BREAKDOWN', 'SCHEDULED_SERVICE', 'STANDBY'].includes(r[5]) ? r[5] : 'RUNNING') as any;
        const startTime = String(r[6] || '07:00');
        const finishTime = String(r[7] || '08:30');
        const totalJam = String(r[8] || '1.5 Jam');
        const hmUnit = Number(r[9]) || 0;
        const picMekanik = String(r[10] || '');

        // Items are in columns 11 to 46 (36 items)
        const items = ARTIC_CHECKLIST_ITEMS.map((def, idx) => {
          const rawVal = String(r[11 + idx] ?? 'OK');
          const isDefect = rawVal.toUpperCase().startsWith('DEFECT');
          const isMonitor = rawVal.toUpperCase().startsWith('MONITOR');
          const isNA = rawVal.toUpperCase().startsWith('NA');
          const statusVal = isDefect ? ('DEFECT' as const) : isMonitor ? ('MONITOR' as const) : isNA ? ('NA' as const) : ('OK' as const);
          const remarkMatch = rawVal.match(/\((.*?)\)/);
          return {
            id: def.id,
            name: def.name,
            status: statusVal,
            remark: remarkMatch ? remarkMatch[1] : undefined,
          };
        });

        const temuanDeviasi = String(r[47] || '');
        const jumlahBacklog = Number(r[48]) || 0;
        const jumlahAktivitas = Number(r[49]) || 0;
        const divalidasiOleh = String(r[50] || '');
        const createdAt = String(r[51] || new Date().toISOString());
        const photoUrl = String(r[52] || '') || undefined;

        return {
          id,
          qaType,
          codeUnit,
          egi,
          tanggal,
          status,
          startTime,
          finishTime,
          totalJam,
          hmUnit,
          picMekanik,
          items,
          temuanDeviasi,
          jumlahBacklog,
          jumlahAktivitas,
          divalidasiOleh,
          createdAt,
          photoUrl,
          syncedToSheets: true,
        };
      }

      // Legacy fallback
      let parsedItems = ARTIC_CHECKLIST_ITEMS.map(def => ({
        id: def.id,
        name: def.name,
        status: 'OK' as const,
        value: '',
      }));

      if (r[15]) {
        try {
          parsedItems = JSON.parse(r[15]);
        } catch {}
      }

      return {
        id: String(r[0]),
        qaType: (String(r[0]).startsWith('DAILY') ? 'DAILY_INSPECTION' : String(r[0]).startsWith('QA7') ? 'QA7_FINAL' : 'QA1_PRE') as any,
        codeUnit: String(r[1]),
        egi: String(r[2] || ''),
        tanggal: String(r[3] || ''),
        status: (['RUNNING', 'BREAKDOWN', 'SCHEDULED_SERVICE', 'STANDBY'].includes(r[4]) ? r[4] : 'RUNNING') as any,
        startTime: String(r[5] || '07:00'),
        finishTime: String(r[6] || '08:30'),
        totalJam: String(r[7] || '1.5 Jam'),
        hmUnit: Number(r[8]) || 0,
        picMekanik: String(r[9] || ''),
        temuanDeviasi: String(r[11] || ''),
        jumlahBacklog: Number(r[12]) || 0,
        jumlahAktivitas: Number(r[13]) || 0,
        divalidasiOleh: String(r[14] || ''),
        items: parsedItems,
        syncedToSheets: true,
        createdAt: String(r[16] || new Date().toISOString()),
        photoUrl: String(r[17] || '') || undefined,
      };
    });
};

const parseBacklogRows = (rows: any[][]): BacklogItem[] => {
  return rows
    .filter(r => r && r[0] && r[1])
    .map(r => {
      const isUnsummarized = r.length >= 14;

      if (isUnsummarized) {
        const id = String(r[0]);
        const codeUnit = String(r[1]);
        const moBacklog = String(r[2] || '');
        const nomorReservasi = String(r[3] || '');
        const deskripsiBacklog = String(r[4] || '');
        const mainPartNo = String(r[5] || '');
        const mainDesc = String(r[6] || '');
        const mainQty = isNaN(Number(r[7])) ? String(r[7] || 1) : Number(r[7]);
        const rawDetailedParts = String(r[8] || '');
        const sumberTemuan = (r[9] || 'MANUAL') as any;
        const status = (['WAITING_PART', 'READY_TO_INSTALL', 'SCHEDULED', 'CLOSED'].includes(r[10]) ? r[10] : 'WAITING_PART') as any;
        const tanggalTemuan = String(r[11] || new Date().toISOString().slice(0, 10));
        const pic = String(r[12] || '');
        const createdAt = String(r[13] || new Date().toISOString());
        const photoUrl = String(r[14] || '') || undefined;

        let parts: BacklogPart[] | undefined = undefined;
        if (rawDetailedParts && rawDetailedParts.includes('[Part')) {
          const partsEntries = rawDetailedParts.split(' ; ');
          parts = partsEntries.map((entry, idx) => {
            const pnMatch = entry.match(/PN:\s*([^|]+)/);
            const descMatch = entry.match(/Desc:\s*([^|]+)/);
            const qtyMatch = entry.match(/Qty:\s*(.+)/);
            return {
              id: `part-${idx}`,
              partNumber: pnMatch ? pnMatch[1].trim() : mainPartNo,
              deskripsiPart: descMatch ? descMatch[1].trim() : mainDesc,
              qty: qtyMatch ? (isNaN(Number(qtyMatch[1].trim())) ? qtyMatch[1].trim() : Number(qtyMatch[1].trim())) : 1,
            };
          });
        }

        return {
          id,
          codeUnit,
          moBacklog,
          nomorReservasi,
          deskripsiBacklog,
          partNumber: mainPartNo,
          deskripsiPart: mainDesc,
          qty: mainQty,
          parts,
          sumberTemuan,
          status,
          tanggalTemuan,
          pic,
          createdAt,
          photoUrl,
          syncedToSheets: true,
        };
      }

      // Legacy fallback
      const rawPartNo = String(r[5] || '');
      const rawDesc = String(r[6] || '');
      const rawQty = r[7] ? (isNaN(Number(r[7])) ? String(r[7]) : Number(r[7])) : 1;

      return {
        id: String(r[0]),
        codeUnit: String(r[1]),
        moBacklog: String(r[2] || ''),
        nomorReservasi: String(r[3] || ''),
        deskripsiBacklog: String(r[4] || ''),
        partNumber: rawPartNo,
        deskripsiPart: rawDesc,
        qty: rawQty,
        sumberTemuan: (r[8] || 'MANUAL') as any,
        status: (['WAITING_PART', 'READY_TO_INSTALL', 'SCHEDULED', 'CLOSED'].includes(r[9]) ? r[9] : 'WAITING_PART') as any,
        tanggalTemuan: String(r[10] || new Date().toISOString().slice(0, 10)),
        pic: String(r[11] || ''),
        syncedToSheets: true,
        createdAt: new Date().toISOString(),
        photoUrl: String(r[12] || '') || undefined,
      };
    });
};

const parseActivityRows = (rows: any[][]): AddActivityItem[] => {
  return rows
    .filter(r => r[0] && r[1])
    .map(r => ({
      id: String(r[0]),
      codeUnit: String(r[1]),
      deskripsiAktivitas: String(r[2] || ''),
      action: String(r[3] || ''),
      status: (['DONE', 'MONITORING', 'PENDING'].includes(r[4]) ? r[4] : 'DONE') as any,
      tanggalTemuan: String(r[5] || new Date().toISOString().slice(0, 10)),
      pic: String(r[6] || ''),
      syncedToSheets: true,
      createdAt: String(r[7] || new Date().toISOString()),
      photoUrl: String(r[8] || '') || undefined,
    }));
};

/**
 * PUSH (KIRIM DATA) SEMUA TAB KE GOOGLE SHEET TANPA DIRINGKAS
 * Mendukung Google Apps Script Web App (bebas kedaluwarsa 24/7) dan Google Sheets API v4
 */
export const pushAllDataToGoogleSheet = async (data: {
  codeUnits: CodeUnit[];
  bapList: BAPRecord[];
  dailyRigidList: DailyCheckRigid[];
  dailyArticList: DailyCheckArtic[];
  backlogs: BacklogItem[];
  activities: AddActivityItem[];
}): Promise<boolean> => {
  const config = getStoredSheetsConfig();
  if (!config?.spreadsheetId && !config?.webAppUrl) {
    throw new Error('Google Sheet belum dihubungkan. Silakan hubungkan link spreadsheet atau Web App URL terlebih dahulu.');
  }

  // 1. Prepare unsummarized data rows for each sheet
  const unitRows = data.codeUnits.map(buildCodeUnitSheetRow);
  const bapRows = data.bapList.map(buildBapSheetRow);
  const rigidRows = data.dailyRigidList.map(buildRigidSheetRow);
  const articRows = data.dailyArticList.map(buildArticSheetRow);
  const backlogRows = data.backlogs.map(buildBacklogSheetRow);
  const activityRows = data.activities.map(buildActivitySheetRow);

  // A. Jika Web App URL tersedia: Kirim langsung via Apps Script (Selalu Aktif 24/7 tanpa kedaluwarsa token)
  if (config.webAppUrl) {
    try {
      const res = await fetch(config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'pushAll',
          data: {
            codeUnits: unitRows,
            bapList: bapRows,
            dailyRigidList: rigidRows,
            dailyArticList: articRows,
            backlogs: backlogRows,
            activities: activityRows,
          },
        }),
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.status === 'success' || json.message) {
          const updatedConfig = { ...config, lastSyncedAt: new Date().toISOString() };
          saveStoredSheetsConfig(updatedConfig);
          return true;
        }
      }
    } catch (webAppErr) {
      console.warn('Push via Web App failed:', webAppErr);
    }
  }

  // B. Jika melalui token Google Workspace (OAuth REST API v4)
  const token = await getAccessToken();
  if (!token) {
    if (config.webAppUrl) {
      throw new Error('Gagal mengirim ke Google Apps Script Web App. Pastikan URL dan izin akses telah disetel ke "Anyone".');
    }
    throw new Error('Sesi Google telah kedaluwarsa atau belum login. Masuk kembali dengan akun Google atau pasang Web App Script agar selalu terhubung 24/7 tanpa perlu menyambung ulang.');
  }

  // Ensure all tabs exist before pushing via REST API
  await ensureAllTabsExist(config.spreadsheetId, token);

  // Clear old data rows across all sheets in ONE batch call
  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values:batchClear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ranges: [
            'CODE_UNIT!A2:Z',
            'BAP!A2:Z',
            'DAILY_CHECK_RIGID!A2:AZ',
            'DAILY_CHECK_ARTIC!A2:BZ',
            'BACKLOG!A2:AZ',
            'ADD_ACTIVITIES!A2:Z',
          ],
        }),
      }
    );
  } catch (err) {
    console.warn('Batch clear warning:', err);
  }

  // Write all rows across all sheets in ONE batch call
  const updateData = [
    { range: 'CODE_UNIT!A2', values: unitRows },
    { range: 'BAP!A2', values: bapRows },
    { range: 'DAILY_CHECK_RIGID!A2', values: rigidRows },
    { range: 'DAILY_CHECK_ARTIC!A2', values: articRows },
    { range: 'BACKLOG!A2', values: backlogRows },
    { range: 'ADD_ACTIVITIES!A2', values: activityRows },
  ].filter(item => item.values.length > 0);

  if (updateData.length > 0) {
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: updateData,
        }),
      }
    );

    if (!updateRes.ok) {
      const errJson = await updateRes.json().catch(() => ({}));
      throw new Error(errJson.error?.message || 'Gagal memperbarui data di Google Sheet.');
    }
  }

  // Update last synced timestamp
  const updatedConfig = { ...config, lastSyncedAt: new Date().toISOString() };
  saveStoredSheetsConfig(updatedConfig);
  return true;
};

/**
 * Helper to fetch a sheet tab's rows
 * Supports authenticated Google Sheets API v4 and Google Visualization API fallback
 * so that any linked Google Spreadsheet stays permanently connected and readable!
 */
const fetchSheetRows = async (spreadsheetId: string, sheetName: string, range: string, token: string | null): Promise<any[][]> => {
  // 1. Try authenticated Google Sheets API v4 if token is available
  if (token) {
    try {
      const rangeParam = encodeURIComponent(`${sheetName}!${range}`);
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${rangeParam}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.values && data.values.length > 0) {
          return data.values;
        }
      }
    } catch (err) {
      console.warn(`Fetch with token on ${sheetName} failed, falling back to public link query:`, err);
    }
  }

  // 2. Seamless Fallback: Google Visualization API (GViz).
  // Works directly with any linked spreadsheet without requiring OAuth login!
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(gvizUrl);
    if (res.ok) {
      const text = await res.text();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
        if (parsed.status === 'ok' && parsed.table?.rows) {
          return parsed.table.rows.map((row: any) =>
            (row.c || []).map((cell: any) => (cell && cell.v !== null && cell.v !== undefined ? cell.v : ''))
          );
        }
      }
    }
  } catch (gvizErr) {
    console.warn(`Could not read sheet ${sheetName} via GViz:`, gvizErr);
  }

  return [];
};

/**
 * TARIK DATA (PULL) DARI GOOGLE SPREADSHEET KE APLIKASI
 * Mendukung Web App URL (bebas token) dan Google Sheets API / GViz
 */
export const pullAllDataFromGoogleSheet = async (): Promise<{
  codeUnits: CodeUnit[];
  bapList: BAPRecord[];
  dailyRigidList: DailyCheckRigid[];
  dailyArticList: DailyCheckArtic[];
  backlogs: BacklogItem[];
  activities: AddActivityItem[];
}> => {
  const config = getStoredSheetsConfig();
  if (!config?.spreadsheetId && !config?.webAppUrl) {
    throw new Error('Google Sheet belum dihubungkan. Silakan hubungkan link spreadsheet atau Web App URL terlebih dahulu.');
  }

  // A. Tarik via Google Apps Script Web App jika URL tersedia
  if (config.webAppUrl) {
    try {
      const res = await fetch(`${config.webAppUrl}?action=pullAll`);
      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.status === 'success' && json.data) {
          const raw = json.data;
          const result = {
            codeUnits: parseCodeUnitRows(raw.CODE_UNIT || []),
            bapList: parseBapRows(raw.BAP || []),
            dailyRigidList: parseRigidRows(raw.DAILY_CHECK_RIGID || []),
            dailyArticList: parseArticRows(raw.DAILY_CHECK_ARTIC || []),
            backlogs: parseBacklogRows(raw.BACKLOG || []),
            activities: parseActivityRows(raw.ADD_ACTIVITIES || []),
          };
          saveStoredSheetsConfig({ ...config, lastSyncedAt: new Date().toISOString() });
          return result;
        }
      }
    } catch (e) {
      console.warn('Pull via Web App failed, trying fallback to spreadsheetId:', e);
    }
  }

  // B. Tarik via Google Sheets API / GViz
  const token = await getAccessToken();
  const spreadsheetId = config.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('ID Spreadsheet tidak ditemukan.');
  }

  const [unitRows, bapRows, rigidRows, articRows, backlogRows, activityRows] = await Promise.all([
    fetchSheetRows(spreadsheetId, 'CODE_UNIT', 'A2:I1000', token),
    fetchSheetRows(spreadsheetId, 'BAP', 'A2:N1000', token),
    fetchSheetRows(spreadsheetId, 'DAILY_CHECK_RIGID', 'A2:AJ1000', token),
    fetchSheetRows(spreadsheetId, 'DAILY_CHECK_ARTIC', 'A2:BA1000', token),
    fetchSheetRows(spreadsheetId, 'BACKLOG', 'A2:O1000', token),
    fetchSheetRows(spreadsheetId, 'ADD_ACTIVITIES', 'A2:I1000', token),
  ]);

  const result = {
    codeUnits: parseCodeUnitRows(unitRows),
    bapList: parseBapRows(bapRows),
    dailyRigidList: parseRigidRows(rigidRows),
    dailyArticList: parseArticRows(articRows),
    backlogs: parseBacklogRows(backlogRows),
    activities: parseActivityRows(activityRows),
  };

  saveStoredSheetsConfig({ ...config, lastSyncedAt: new Date().toISOString() });
  return result;
};

export const syncCodeUnitsToSheet = async (units: CodeUnit[]) => {
  const rows = units.map(buildCodeUnitSheetRow);
  return overwriteSheetRows('CODE_UNIT', rows, 'I');
};

export const syncBapToSheet = async (item: BAPRecord) => {
  return appendRowToSheet('BAP', buildBapSheetRow(item));
};

export const syncDailyRigidToSheet = async (item: DailyCheckRigid) => {
  return appendRowToSheet('DAILY_CHECK_RIGID', buildRigidSheetRow(item));
};

export const syncDailyArticToSheet = async (item: DailyCheckArtic) => {
  return appendRowToSheet('DAILY_CHECK_ARTIC', buildArticSheetRow(item));
};

export const syncBacklogToSheet = async (item: BacklogItem) => {
  return appendRowToSheet('BACKLOG', buildBacklogSheetRow(item));
};

export const syncActivityToSheet = async (item: AddActivityItem) => {
  return appendRowToSheet('ADD_ACTIVITIES', buildActivitySheetRow(item));
};

export const appendRowToSheet = async (sheetName: string, values: (string | number | boolean)[]) => {
  const config = getStoredSheetsConfig();
  if (!config?.spreadsheetId) return false;

  const token = await getAccessToken();
  if (!token) return false;

  try {
    const rangeParam = encodeURIComponent(`${sheetName}!A1`);
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${rangeParam}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [values],
        }),
      }
    );
    return res.ok;
  } catch (err) {
    console.error(`Error appending to sheet ${sheetName}:`, err);
    return false;
  }
};
