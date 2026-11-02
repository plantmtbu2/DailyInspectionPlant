import {
  CodeUnit,
  BAPRecord,
  DailyCheckRigid,
  DailyCheckArtic,
  BacklogItem,
  AddActivityItem,
} from '../types';
import { INITIAL_CODE_UNITS } from '../constants/checklists';
import {
  syncBapToSheet,
  syncDailyRigidToSheet,
  syncDailyArticToSheet,
  syncBacklogToSheet,
  syncActivityToSheet,
  syncCodeUnitsToSheet,
  getStoredSheetsConfig,
  pushAllDataToGoogleSheet,
} from './googleSheetsService';

const STORAGE_KEYS = {
  CODE_UNITS: 'fleetcheck_code_units_v1',
  BAP: 'fleetcheck_bap_v1',
  DAILY_RIGID: 'fleetcheck_daily_rigid_v1',
  DAILY_ARTIC: 'fleetcheck_daily_artic_v1',
  BACKLOG: 'fleetcheck_backlog_v1',
  ACTIVITIES: 'fleetcheck_activities_v1',
  INITIALIZED: 'fleetcheck_initialized_seed_v2',
};

// Check and seed sample data only once on pristine initial run.
// Once initialized, user deletions are strictly permanent and never reseeded!
const ensureStorageInitialized = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!isInit) {
    if (localStorage.getItem(STORAGE_KEYS.CODE_UNITS) === null) {
      localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(INITIAL_CODE_UNITS));
    }
    if (localStorage.getItem(STORAGE_KEYS.BAP) === null) {
      localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify(SAMPLE_BAP));
    }
    if (localStorage.getItem(STORAGE_KEYS.DAILY_RIGID) === null) {
      localStorage.setItem(STORAGE_KEYS.DAILY_RIGID, JSON.stringify(SAMPLE_DAILY_RIGID));
    }
    if (localStorage.getItem(STORAGE_KEYS.DAILY_ARTIC) === null) {
      localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify(SAMPLE_DAILY_ARTIC));
    }
    if (localStorage.getItem(STORAGE_KEYS.BACKLOG) === null) {
      localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify(SAMPLE_BACKLOGS));
    }
    if (localStorage.getItem(STORAGE_KEYS.ACTIVITIES) === null) {
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(SAMPLE_ACTIVITIES));
    }
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }
};

// Initial sample data for mining operations
const SAMPLE_BAP: BAPRecord[] = [
  {
    id: 'BAP-202610-001',
    codeUnit: 'AD-740-02',
    hm: 9150,
    kerusakan: 'Main hydraulic pump noisy & overheating. Oli hidrolik berbusa (foaming). Silinder articulation lambat respon.',
    estimasiPekerjaan: '6 Jam',
    lokasiPekerjaan: 'Disposal Selatan Sub-3',
    mo: 'MO-8840192',
    tanggal: '2026-10-14',
    jam: '09:30',
    picMekanik: 'Budi Santoso & Aris W.',
    status: 'IN_PROGRESS',
    catatanTambahan: 'Membutuhkan penggantian filter hidrolik dan suction line O-ring.',
    photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    syncedToSheets: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'BAP-202610-002',
    codeUnit: 'HD-785-05',
    hm: 11980,
    kerusakan: 'Common rail pressure drop mendadak saat full load di tanjakan pit. Indikator warning engine menyala.',
    estimasiPekerjaan: '4 Jam',
    lokasiPekerjaan: 'Workshop Main Hauler Bay 2',
    mo: 'MO-8840215',
    tanggal: '2026-10-15',
    jam: '07:15',
    picMekanik: 'Dedi Kurniawan',
    status: 'OPEN',
    catatanTambahan: 'Cek konektor sensor rail pressure dan supply pump delivery valve.',
    photoUrl: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80',
    syncedToSheets: true,
    createdAt: new Date().toISOString(),
  },
];

const SAMPLE_BACKLOGS: BacklogItem[] = [
  {
    id: 'BL-001',
    codeUnit: 'HD-785-05',
    moBacklog: 'MO-BL-5021',
    nomorReservasi: 'RES-99014',
    deskripsiBacklog: 'Sensor Rail Pressure error code E-11, perlu ganti harness & sensor kit',
    partNumber: '6754-72-1210',
    deskripsiPart: 'Sensor Assembly Fuel Pressure',
    qty: 1,
    sumberTemuan: 'DAILY_RIGID',
    status: 'WAITING_PART',
    tanggalTemuan: '2026-10-14',
    pic: 'Dedi Kurniawan',
    photoUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'BL-002',
    codeUnit: 'RD-777D-01',
    moBacklog: 'MO-BL-5022',
    nomorReservasi: 'RES-99020',
    deskripsiBacklog: 'V-Belt AC compressor retak halus dan kendor',
    partNumber: '6N-6654',
    deskripsiPart: 'V-Belt Set Standard CAT',
    qty: 2,
    sumberTemuan: 'DAILY_RIGID',
    status: 'READY_TO_INSTALL',
    tanggalTemuan: '2026-10-15',
    pic: 'Rian Pratama',
    photoUrl: 'https://images.unsplash.com/photo-1579275542618-a1dfed5f54ba?auto=format&fit=crop&w=800&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'BL-003',
    codeUnit: 'AD-A40G-01',
    moBacklog: 'MO-BL-5023',
    nomorReservasi: 'RES-99035',
    deskripsiBacklog: 'Pin Lock Artic aus melebihi toleransi (gap > 4mm)',
    partNumber: 'VOE-11102941',
    deskripsiPart: 'Artic Bushing & Pin Kit Heavy Duty',
    qty: 1,
    sumberTemuan: 'DAILY_ARTIC',
    status: 'SCHEDULED',
    tanggalTemuan: '2026-10-13',
    pic: 'Supriyadi',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

const SAMPLE_ACTIVITIES: AddActivityItem[] = [
  {
    id: 'ACT-001',
    codeUnit: 'RD-777D-01',
    deskripsiAktivitas: 'Pembersihan saringan udara (Air Cleaner Primary & Secondary) dan cek tegangan V-Belt',
    action: 'Blowing element dengan kompresor 60 psi, re-tightening alternator belt tensioner',
    status: 'DONE',
    tanggalTemuan: '2026-10-15',
    pic: 'Rian Pratama',
    photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ACT-002',
    codeUnit: 'AD-A40G-01',
    deskripsiAktivitas: 'Greasing manual pin articulation and spider joint drive shaft',
    action: 'Injeksi grease chassis NLGI 2 sebanyak 8 stroke per nipple',
    status: 'DONE',
    tanggalTemuan: '2026-10-15',
    pic: 'Supriyadi',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ACT-003',
    codeUnit: 'HD-785-05',
    deskripsiAktivitas: 'Monitoring kebocoran pada konektor common rail & flushing filter solar',
    action: 'Inspeksi visual undercarriage dan torquing baut flens',
    status: 'MONITORING',
    tanggalTemuan: '2026-10-15',
    pic: 'Dedi Kurniawan',
    createdAt: new Date().toISOString(),
  },
];

const SAMPLE_DAILY_RIGID: DailyCheckRigid[] = [
  {
    id: 'QA1-RIG-202610-001',
    qaType: 'QA1_PRE',
    codeUnit: 'RD-777D-01',
    egi: 'CAT 777D (Off-Highway Truck)',
    tanggal: '2026-10-18',
    status: 'RUNNING',
    startTime: '06:30',
    finishTime: '07:45',
    totalJam: '1.25 Jam',
    hmUnit: 14820,
    picMekanik: 'Rian Pratama',
    divalidasiOleh: 'Foreman Pit 1 (Hendri K.)',
    items: [
      { id: 'rig_1', name: '1. Engine Oil Level', status: 'OK' },
      { id: 'rig_2', name: '2. T/M Oil Level', status: 'OK' },
      { id: 'rig_3', name: '3. Hyd Oil Level', status: 'OK' },
      { id: 'rig_4', name: '4. V-Belts', status: 'MONITOR', remark: 'V-Belt AC agak kendor, perlu re-tensioning' },
      { id: 'rig_5', name: '5. E/G Oil Leakage', status: 'OK' },
      { id: 'rig_6', name: '6. Common Rail Connector', status: 'OK' },
      { id: 'rig_7', name: '7. Injector Tube', status: 'OK' },
      { id: 'rig_8', name: '8. FM Radio', status: 'OK' },
      { id: 'rig_9', name: '9. Fatigue Warning', status: 'OK' },
      { id: 'rig_10', name: '10. Power Window', status: 'OK' },
      { id: 'rig_11', name: '11. Operator Seat', status: 'OK' },
      { id: 'rig_12', name: '12. Hand Rail', status: 'OK' },
      { id: 'rig_13', name: '13. Common Rail Press ON (kg/cm²)', status: 'OK', value: '385', unit: 'kg/cm²' },
      { id: 'rig_14', name: '14. Power Supply Voltage ON (V)', status: 'OK', value: '27.6', unit: 'V' },
      { id: 'rig_15', name: '15. Susp Pressure FL (mm/kg)', status: 'OK', value: '125 mm', unit: 'mm/kg' },
      { id: 'rig_16', name: '16. Susp Pressure FR (mm/kg)', status: 'OK', value: '122 mm', unit: 'mm/kg' },
      { id: 'rig_17', name: '17. Susp Pressure RL (mm/kg)', status: 'OK', value: '142 mm', unit: 'mm/kg' },
      { id: 'rig_18', name: '18. Susp Pressure RR (mm/kg)', status: 'OK', value: '140 mm', unit: 'mm/kg' },
      { id: 'rig_19', name: '19. Tyre Condition', status: 'OK' },
    ],
    temuanDeviasi: 'Tegangan V-Belt AC sedikit di bawah standar. Dilakukan penyesuaian tegangan belt pada form Add Activities.',
    jumlahBacklog: 1,
    jumlahAktivitas: 1,
    photoUrl: 'https://images.unsplash.com/photo-1579275542618-a1dfed5f54ba?auto=format&fit=crop&w=800&q=80',
    syncedToSheets: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'QA7-RIG-202610-002',
    qaType: 'QA7_FINAL',
    codeUnit: 'HD-785-05',
    egi: 'Komatsu HD785-7',
    tanggal: '2026-10-19',
    status: 'RUNNING',
    startTime: '13:00',
    finishTime: '14:30',
    totalJam: '1.5 Jam',
    hmUnit: 11980,
    picMekanik: 'Dedi Kurniawan',
    divalidasiOleh: 'Foreman Quality (Bambang S.)',
    items: [
      { id: 'rig_1', name: '1. Engine Oil Level', status: 'OK' },
      { id: 'rig_2', name: '2. T/M Oil Level', status: 'OK' },
      { id: 'rig_3', name: '3. Hyd Oil Level', status: 'OK' },
      { id: 'rig_4', name: '4. V-Belts', status: 'OK' },
      { id: 'rig_5', name: '5. E/G Oil Leakage', status: 'OK' },
      { id: 'rig_6', name: '6. Common Rail Connector', status: 'OK', remark: 'Telah dipasang harness & sensor baru' },
      { id: 'rig_7', name: '7. Injector Tube', status: 'OK' },
      { id: 'rig_8', name: '8. FM Radio', status: 'OK' },
      { id: 'rig_9', name: '9. Fatigue Warning', status: 'OK' },
      { id: 'rig_10', name: '10. Power Window', status: 'OK' },
      { id: 'rig_11', name: '11. Operator Seat', status: 'OK' },
      { id: 'rig_12', name: '12. Hand Rail', status: 'OK' },
      { id: 'rig_13', name: '13. Common Rail Press ON (kg/cm²)', status: 'OK', value: '410', unit: 'kg/cm²' },
      { id: 'rig_14', name: '14. Power Supply Voltage ON (V)', status: 'OK', value: '28.1', unit: 'V' },
      { id: 'rig_15', name: '15. Susp Pressure FL (mm/kg)', status: 'OK', value: '130 mm', unit: 'mm/kg' },
      { id: 'rig_16', name: '16. Susp Pressure FR (mm/kg)', status: 'OK', value: '128 mm', unit: 'mm/kg' },
      { id: 'rig_17', name: '17. Susp Pressure RL (mm/kg)', status: 'OK', value: '145 mm', unit: 'mm/kg' },
      { id: 'rig_18', name: '18. Susp Pressure RR (mm/kg)', status: 'OK', value: '145 mm', unit: 'mm/kg' },
      { id: 'rig_19', name: '19. Tyre Condition', status: 'OK' },
    ],
    temuanDeviasi: 'Final test run normal tanpa error code. Tekanan common rail stabil pada 410 kg/cm². Unit siap beroperasi penuh.',
    jumlahBacklog: 1,
    jumlahAktivitas: 1,
    photoUrl: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80',
    syncedToSheets: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'DAILY-RIG-202610-003',
    qaType: 'DAILY_INSPECTION',
    codeUnit: 'RD-777D-02',
    egi: 'CAT 777D (Off-Highway Truck)',
    tanggal: '2026-10-20',
    status: 'RUNNING',
    startTime: '07:00',
    finishTime: '08:30',
    totalJam: '1.5 Jam',
    hmUnit: 15340,
    picMekanik: 'Aris Wibowo',
    divalidasiOleh: 'Foreman Plant 2 (Hendri K.)',
    items: [
      { id: 'rig_1', name: '1. Engine Oil Level', status: 'OK' },
      { id: 'rig_2', name: '2. T/M Oil Level', status: 'OK' },
      { id: 'rig_3', name: '3. Hyd Oil Level', status: 'OK' },
      { id: 'rig_4', name: '4. V-Belts', status: 'OK' },
      { id: 'rig_5', name: '5. E/G Oil Leakage', status: 'OK' },
      { id: 'rig_6', name: '6. Common Rail Connector', status: 'OK' },
      { id: 'rig_7', name: '7. Injector Tube', status: 'OK' },
      { id: 'rig_8', name: '8. FM Radio', status: 'OK' },
      { id: 'rig_9', name: '9. Fatigue Warning', status: 'OK' },
      { id: 'rig_10', name: '10. Power Window', status: 'OK' },
      { id: 'rig_11', name: '11. Operator Seat', status: 'OK' },
      { id: 'rig_12', name: '12. Hand Rail', status: 'OK' },
      { id: 'rig_13', name: '13. Common Rail Press ON (kg/cm²)', status: 'OK', value: '405', unit: 'kg/cm²' },
      { id: 'rig_14', name: '14. Power Supply Voltage ON (V)', status: 'OK', value: '28.0', unit: 'V' },
      { id: 'rig_15', name: '15. Susp Pressure FL (mm/kg)', status: 'OK', value: '128 mm', unit: 'mm/kg' },
      { id: 'rig_16', name: '16. Susp Pressure FR (mm/kg)', status: 'OK', value: '126 mm', unit: 'mm/kg' },
      { id: 'rig_17', name: '17. Susp Pressure RL (mm/kg)', status: 'OK', value: '144 mm', unit: 'mm/kg' },
      { id: 'rig_18', name: '18. Susp Pressure RR (mm/kg)', status: 'OK', value: '142 mm', unit: 'mm/kg' },
      { id: 'rig_19', name: '19. Tyre Condition', status: 'OK' },
    ],
    temuanDeviasi: 'Hasil Daily Inspection Rigid normal. Seluruh 19 parameter kelayakan unit dalam batas standar aman rilis operasi.',
    jumlahBacklog: 0,
    jumlahAktivitas: 0,
    photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    syncedToSheets: true,
    createdAt: new Date().toISOString(),
  },
];

const SAMPLE_DAILY_ARTIC: DailyCheckArtic[] = [
  {
    id: 'QA1-ART-202610-001',
    qaType: 'QA1_PRE',
    codeUnit: 'AD-A40G-01',
    egi: 'Volvo A40G (Articulated)',
    tanggal: '2026-10-18',
    status: 'RUNNING',
    startTime: '06:45',
    finishTime: '08:15',
    totalJam: '1.5 Jam',
    hmUnit: 8430,
    picMekanik: 'Supriyadi',
    divalidasiOleh: 'Foreman Artic (Agus Tri)',
    items: [
      { id: 'art_1', name: '1. Lock Door & Handle', status: 'OK' },
      { id: 'art_2', name: '2. Wiper & Washer', status: 'OK' },
      { id: 'art_3', name: '3. Radio Komunikasi', status: 'OK' },
      { id: 'art_4', name: '4. Rotary Lamp', status: 'OK' },
      { id: 'art_5', name: '5. Work Lamp Front/Rear', status: 'OK' },
      { id: 'art_6', name: '6. LOTO / Safety Isolation', status: 'OK' },
      { id: 'art_7', name: '7. Air Pressure Indicator', status: 'OK' },
      { id: 'art_8', name: '8. Lever Hydraulic CV', status: 'OK' },
      { id: 'art_9', name: '9. Engine Oil Level', status: 'OK' },
      { id: 'art_10', name: '10. Coolant Radiator Level', status: 'OK' },
      { id: 'art_11', name: '11. V-Belt & AC Compressor', status: 'OK' },
      { id: 'art_12', name: '12. Transmission Oil Level', status: 'OK' },
      { id: 'art_13', name: '13. Hydraulic Oil Level', status: 'OK' },
      { id: 'art_14', name: '14. Hydraulic Oil Leaks', status: 'OK' },
      { id: 'art_15', name: '15. Fuel Wiggins Pressureless', status: 'OK' },
      { id: 'art_16', name: '16. Battery & Terminal', status: 'OK' },
      { id: 'art_17', name: '17. PDU Power Distribution', status: 'OK' },
      { id: 'art_18', name: '18. Spider Joint / Drive Shaft', status: 'OK' },
      { id: 'art_19', name: '19. Pin Lock Artic', status: 'MONITOR', remark: 'Ada getaran minor pada pin artic' },
      { id: 'art_20', name: '20. Artic Frame Lubrication', status: 'OK' },
      { id: 'art_21', name: '21. Grease Fitting & Auto Lube', status: 'OK' },
      { id: 'art_22', name: '22. LH Steering Cylinder', status: 'OK' },
      { id: 'art_23', name: '23. RH Steering Cylinder', status: 'OK' },
      { id: 'art_24', name: '24. LH Articulation Cylinder', status: 'OK' },
      { id: 'art_25', name: '25. RH Articulation Cylinder', status: 'OK' },
      { id: 'art_26', name: '26. Pinion & Segment Circle', status: 'NA' },
      { id: 'art_27', name: '27. Spacer & Wear Plate Circle', status: 'NA' },
      { id: 'art_28', name: '28. Circle Reverse Motor', status: 'NA' },
      { id: 'art_29', name: '29. Guide Blade & Cutting Edge', status: 'NA' },
      { id: 'art_30', name: '30. Wheel Leaning Cylinder', status: 'NA' },
      { id: 'art_31', name: '31. Blade Side Shift Cylinder', status: 'NA' },
      { id: 'art_32', name: '32. Power Tilt Cylinder', status: 'NA' },
      { id: 'art_33', name: '33. Drawbar Ball Joint Cylinder', status: 'NA' },
      { id: 'art_34', name: '34. LH Lift Cylinder', status: 'OK' },
      { id: 'art_35', name: '35. RH Lift Cylinder', status: 'OK' },
      { id: 'art_36', name: '36. Ripper / Scarifier Cylinder', status: 'NA' },
    ],
    temuanDeviasi: 'Pin Lock Artic menunjukkan gap sedikit longgar. Dibuatkan Backlog Part untuk penggantian bushing berkala.',
    jumlahBacklog: 1,
    jumlahAktivitas: 1,
    photoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
    syncedToSheets: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'QA7-ART-202610-002',
    qaType: 'QA7_FINAL',
    codeUnit: 'MG-705-01',
    egi: 'Komatsu GD705A-4',
    tanggal: '2026-10-19',
    status: 'RUNNING',
    startTime: '10:00',
    finishTime: '11:45',
    totalJam: '1.75 Jam',
    hmUnit: 13420,
    picMekanik: 'Budi Santoso',
    divalidasiOleh: 'Foreman Quality (Bambang S.)',
    items: [
      { id: 'art_1', name: '1. Lock Door & Handle', status: 'OK' },
      { id: 'art_2', name: '2. Wiper & Washer', status: 'OK' },
      { id: 'art_3', name: '3. Radio Komunikasi', status: 'OK' },
      { id: 'art_4', name: '4. Rotary Lamp', status: 'OK' },
      { id: 'art_5', name: '5. Work Lamp Front/Rear', status: 'OK' },
      { id: 'art_6', name: '6. LOTO / Safety Isolation', status: 'OK' },
      { id: 'art_7', name: '7. Air Pressure Indicator', status: 'OK' },
      { id: 'art_8', name: '8. Lever Hydraulic CV', status: 'OK' },
      { id: 'art_9', name: '9. Engine Oil Level', status: 'OK' },
      { id: 'art_10', name: '10. Coolant Radiator Level', status: 'OK' },
      { id: 'art_11', name: '11. V-Belt & AC Compressor', status: 'OK' },
      { id: 'art_12', name: '12. Transmission Oil Level', status: 'OK' },
      { id: 'art_13', name: '13. Hydraulic Oil Level', status: 'OK' },
      { id: 'art_14', name: '14. Hydraulic Oil Leaks', status: 'OK' },
      { id: 'art_15', name: '15. Fuel Wiggins Pressureless', status: 'OK' },
      { id: 'art_16', name: '16. Battery & Terminal', status: 'OK' },
      { id: 'art_17', name: '17. PDU Power Distribution', status: 'OK' },
      { id: 'art_18', name: '18. Spider Joint / Drive Shaft', status: 'OK' },
      { id: 'art_19', name: '19. Pin Lock Artic', status: 'OK' },
      { id: 'art_20', name: '20. Artic Frame Lubrication', status: 'OK' },
      { id: 'art_21', name: '21. Grease Fitting & Auto Lube', status: 'OK' },
      { id: 'art_22', name: '22. LH Steering Cylinder', status: 'OK' },
      { id: 'art_23', name: '23. RH Steering Cylinder', status: 'OK' },
      { id: 'art_24', name: '24. LH Articulation Cylinder', status: 'OK' },
      { id: 'art_25', name: '25. RH Articulation Cylinder', status: 'OK' },
      { id: 'art_26', name: '26. Pinion & Segment Circle', status: 'OK' },
      { id: 'art_27', name: '27. Spacer & Wear Plate Circle', status: 'OK' },
      { id: 'art_28', name: '28. Circle Reverse Motor', status: 'OK' },
      { id: 'art_29', name: '29. Guide Blade & Cutting Edge', status: 'OK' },
      { id: 'art_30', name: '30. Wheel Leaning Cylinder', status: 'OK' },
      { id: 'art_31', name: '31. Blade Side Shift Cylinder', status: 'OK' },
      { id: 'art_32', name: '32. Power Tilt Cylinder', status: 'OK' },
      { id: 'art_33', name: '33. Drawbar Ball Joint Cylinder', status: 'OK' },
      { id: 'art_34', name: '34. LH Lift Cylinder', status: 'OK' },
      { id: 'art_35', name: '35. RH Lift Cylinder', status: 'OK' },
      { id: 'art_36', name: '36. Ripper / Scarifier Cylinder', status: 'OK' },
    ],
    temuanDeviasi: 'Semua silinder hidrolik blade dan ripper berfungsi responsif tanpa kebocoran. Circle reverse gear halus. Unit layak rilis operasi.',
    jumlahBacklog: 0,
    jumlahAktivitas: 0,
    photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    syncedToSheets: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'DAILY-ART-202610-003',
    qaType: 'DAILY_INSPECTION',
    codeUnit: 'AD-740-02',
    egi: 'CAT 740B (Articulated)',
    tanggal: '2026-10-20',
    status: 'RUNNING',
    startTime: '07:15',
    finishTime: '08:45',
    totalJam: '1.5 Jam',
    hmUnit: 9280,
    picMekanik: 'Budi Santoso',
    divalidasiOleh: 'Foreman Artic (Agus Tri)',
    items: [
      { id: 'art_1', name: '1. Lock Door & Handle', status: 'OK' },
      { id: 'art_2', name: '2. Wiper & Washer', status: 'OK' },
      { id: 'art_3', name: '3. Radio Komunikasi', status: 'OK' },
      { id: 'art_4', name: '4. Rotary Lamp', status: 'OK' },
      { id: 'art_5', name: '5. Work Lamp Front/Rear', status: 'OK' },
      { id: 'art_6', name: '6. LOTO / Safety Isolation', status: 'OK' },
      { id: 'art_7', name: '7. Air Pressure Indicator', status: 'OK' },
      { id: 'art_8', name: '8. Lever Hydraulic CV', status: 'OK' },
      { id: 'art_9', name: '9. Engine Oil Level', status: 'OK' },
      { id: 'art_10', name: '10. Coolant Radiator Level', status: 'OK' },
      { id: 'art_11', name: '11. V-Belt & AC Compressor', status: 'OK' },
      { id: 'art_12', name: '12. Transmission Oil Level', status: 'OK' },
      { id: 'art_13', name: '13. Hydraulic Oil Level', status: 'OK' },
      { id: 'art_14', name: '14. Hydraulic Oil Leaks', status: 'OK' },
      { id: 'art_15', name: '15. Fuel Wiggins Pressureless', status: 'OK' },
      { id: 'art_16', name: '16. Battery & Terminal', status: 'OK' },
      { id: 'art_17', name: '17. PDU Power Distribution', status: 'OK' },
      { id: 'art_18', name: '18. Spider Joint / Drive Shaft', status: 'OK' },
      { id: 'art_19', name: '19. Pin Lock Artic', status: 'OK' },
      { id: 'art_20', name: '20. Artic Frame Lubrication', status: 'OK' },
      { id: 'art_21', name: '21. Grease Fitting & Auto Lube', status: 'OK' },
      { id: 'art_22', name: '22. LH Steering Cylinder', status: 'OK' },
      { id: 'art_23', name: '23. RH Steering Cylinder', status: 'OK' },
      { id: 'art_24', name: '24. LH Articulation Cylinder', status: 'OK' },
      { id: 'art_25', name: '25. RH Articulation Cylinder', status: 'OK' },
      { id: 'art_26', name: '26. Pinion & Segment Circle', status: 'NA' },
      { id: 'art_27', name: '27. Spacer & Wear Plate Circle', status: 'NA' },
      { id: 'art_28', name: '28. Circle Reverse Motor', status: 'NA' },
      { id: 'art_29', name: '29. Guide Blade & Cutting Edge', status: 'NA' },
      { id: 'art_30', name: '30. Wheel Leaning Cylinder', status: 'NA' },
      { id: 'art_31', name: '31. Blade Side Shift Cylinder', status: 'NA' },
      { id: 'art_32', name: '32. Power Tilt Cylinder', status: 'NA' },
      { id: 'art_33', name: '33. Drawbar Ball Joint Cylinder', status: 'NA' },
      { id: 'art_34', name: '34. LH Lift Cylinder', status: 'OK' },
      { id: 'art_35', name: '35. RH Lift Cylinder', status: 'OK' },
      { id: 'art_36', name: '36. Ripper / Scarifier Cylinder', status: 'NA' },
    ],
    temuanDeviasi: 'Hasil Daily Inspection Artic normal. Seluruh 36 parameter QA 7 berfungsi responsif dan unit aman rilis operasi.',
    jumlahBacklog: 0,
    jumlahAktivitas: 0,
    photoUrl: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80',
    syncedToSheets: true,
    createdAt: new Date().toISOString(),
  },
];
export const autoSyncToGoogleSheetIfConnected = async () => {
  if (!getStoredSheetsConfig()) return;
  try {
    await pushAllDataToGoogleSheet({
      codeUnits: getCodeUnits(),
      bapList: getBAPList(),
      dailyRigidList: getDailyRigidList(),
      dailyArticList: getDailyArticList(),
      backlogs: getBacklogs(),
      activities: getActivities(),
    });
  } catch (err) {
    console.warn('Auto-sync to Google Sheet failed:', err);
  }
};

// Replace entire dataset (used during pull from Google Sheet)
export const replaceEntireDataset = (data: {
  codeUnits?: CodeUnit[];
  bapList?: BAPRecord[];
  dailyRigidList?: DailyCheckRigid[];
  dailyArticList?: DailyCheckArtic[];
  backlogs?: BacklogItem[];
  activities?: AddActivityItem[];
}) => {
  if (data.codeUnits !== undefined) {
    localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(data.codeUnits));
  }
  if (data.bapList !== undefined) {
    localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify(data.bapList));
  }
  if (data.dailyRigidList !== undefined) {
    localStorage.setItem(STORAGE_KEYS.DAILY_RIGID, JSON.stringify(data.dailyRigidList));
  }
  if (data.dailyArticList !== undefined) {
    localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify(data.dailyArticList));
  }
  if (data.backlogs !== undefined) {
    localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify(data.backlogs));
  }
  if (data.activities !== undefined) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(data.activities));
  }
};

// -------------------------------------------------------------
// CODE UNITS
// -------------------------------------------------------------
export const getCodeUnits = (): CodeUnit[] => {
  ensureStorageInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CODE_UNITS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCodeUnits = (units: CodeUnit[]) => {
  localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(units));
  if (getStoredSheetsConfig()) {
    syncCodeUnitsToSheet(units);
  }
};

export const addOrUpdateCodeUnit = (unit: CodeUnit) => {
  const current = getCodeUnits();
  const existingIndex = current.findIndex(u => u.codeUnit === unit.codeUnit || u.id === unit.id);
  let updated: CodeUnit[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = unit;
  } else {
    updated = [unit, ...current];
  }
  saveCodeUnits(updated);
  return updated;
};

export const deleteCodeUnit = async (id: string, cascade = true): Promise<CodeUnit[]> => {
  const current = getCodeUnits();
  const unitToDelete = current.find(u => u.id === id);
  const updated = current.filter(u => u.id !== id);
  localStorage.setItem(STORAGE_KEYS.CODE_UNITS, JSON.stringify(updated));

  if (cascade && unitToDelete) {
    const targetCode = unitToDelete.codeUnit;
    const baps = getBAPList().filter(b => b.codeUnit !== targetCode);
    const rigids = getDailyRigidList().filter(r => r.codeUnit !== targetCode);
    const artics = getDailyArticList().filter(a => a.codeUnit !== targetCode);
    const backlogs = getBacklogs().filter(b => b.codeUnit !== targetCode);
    const activities = getActivities().filter(a => a.codeUnit !== targetCode);

    localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify(baps));
    localStorage.setItem(STORAGE_KEYS.DAILY_RIGID, JSON.stringify(rigids));
    localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify(artics));
    localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify(backlogs));
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  }

  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

// -------------------------------------------------------------
// BAP
// -------------------------------------------------------------
export const getBAPList = (): BAPRecord[] => {
  ensureStorageInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BAP);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addBAPRecord = async (item: BAPRecord): Promise<BAPRecord[]> => {
  const list = getBAPList();
  const updated = [item, ...list];
  localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify(updated));

  // Update HM on Master Unit if newer
  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch && item.hm > unitMatch.currentHm) {
    unitMatch.currentHm = item.hm;
    unitMatch.statusUnit = item.status === 'COMPLETED' ? 'READY' : 'BREAKDOWN';
    saveCodeUnits(units);
  }

  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateBAPRecord = async (item: BAPRecord): Promise<BAPRecord[]> => {
  const list = getBAPList();
  const updated = list.map(b => (b.id === item.id ? item : b));
  localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify(updated));

  // Update master unit if status changed
  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hm > unitMatch.currentHm) unitMatch.currentHm = item.hm;
    if (item.status === 'COMPLETED') unitMatch.statusUnit = 'READY';
    else if (item.status === 'OPEN') unitMatch.statusUnit = 'BREAKDOWN';
    saveCodeUnits(units);
  }

  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteBAPRecord = async (id: string): Promise<BAPRecord[]> => {
  const list = getBAPList();
  const updated = list.filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEYS.BAP, JSON.stringify(updated));
  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

// -------------------------------------------------------------
// DAILY RIGID
// -------------------------------------------------------------
export const getDailyRigidList = (): DailyCheckRigid[] => {
  ensureStorageInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_RIGID);
    if (!raw) return [];
    const parsed: DailyCheckRigid[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => ({
      ...item,
      qaType: item.qaType || (item.id.startsWith('DAILY') ? 'DAILY_INSPECTION' : item.id.startsWith('QA7') ? 'QA7_FINAL' : 'QA1_PRE'),
    }));
  } catch {
    return [];
  }
};

export const addDailyRigid = async (item: DailyCheckRigid): Promise<DailyCheckRigid[]> => {
  const list = getDailyRigidList();
  const normalizedItem: DailyCheckRigid = {
    ...item,
    qaType: item.qaType || 'DAILY_INSPECTION',
  };
  const updated = [normalizedItem, ...list];
  localStorage.setItem(STORAGE_KEYS.DAILY_RIGID, JSON.stringify(updated));

  // Update Master Unit HM & Status
  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hmUnit > unitMatch.currentHm) unitMatch.currentHm = item.hmUnit;
    unitMatch.lastInspectionDate = item.tanggal;
    if (item.status === 'BREAKDOWN') unitMatch.statusUnit = 'BREAKDOWN';
    else if (item.status === 'SCHEDULED_SERVICE') unitMatch.statusUnit = 'MAINTENANCE';
    else unitMatch.statusUnit = 'READY';
    saveCodeUnits(units);
  }

  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateDailyRigid = async (item: DailyCheckRigid): Promise<DailyCheckRigid[]> => {
  const list = getDailyRigidList();
  const normalizedItem: DailyCheckRigid = {
    ...item,
    qaType: item.qaType || 'DAILY_INSPECTION',
  };
  const updated = list.map(r => (r.id === item.id ? normalizedItem : r));
  localStorage.setItem(STORAGE_KEYS.DAILY_RIGID, JSON.stringify(updated));

  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hmUnit > unitMatch.currentHm) unitMatch.currentHm = item.hmUnit;
    if (item.status === 'BREAKDOWN') unitMatch.statusUnit = 'BREAKDOWN';
    else if (item.status === 'SCHEDULED_SERVICE') unitMatch.statusUnit = 'MAINTENANCE';
    else unitMatch.statusUnit = 'READY';
    saveCodeUnits(units);
  }

  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteDailyRigid = async (id: string): Promise<DailyCheckRigid[]> => {
  const list = getDailyRigidList();
  const updated = list.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.DAILY_RIGID, JSON.stringify(updated));
  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

// -------------------------------------------------------------
// DAILY ARTIC
// -------------------------------------------------------------
export const getDailyArticList = (): DailyCheckArtic[] => {
  ensureStorageInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_ARTIC);
    if (!raw) return [];
    const parsed: DailyCheckArtic[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => ({
      ...item,
      qaType: item.qaType || (item.id.startsWith('DAILY') ? 'DAILY_INSPECTION' : item.id.startsWith('QA7') ? 'QA7_FINAL' : 'QA1_PRE'),
    }));
  } catch {
    return [];
  }
};

export const addDailyArtic = async (item: DailyCheckArtic): Promise<DailyCheckArtic[]> => {
  const list = getDailyArticList();
  const normalizedItem: DailyCheckArtic = {
    ...item,
    qaType: item.qaType || 'DAILY_INSPECTION',
  };
  const updated = [normalizedItem, ...list];
  localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify(updated));

  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hmUnit > unitMatch.currentHm) unitMatch.currentHm = item.hmUnit;
    unitMatch.lastInspectionDate = item.tanggal;
    if (item.status === 'BREAKDOWN') unitMatch.statusUnit = 'BREAKDOWN';
    else if (item.status === 'SCHEDULED_SERVICE') unitMatch.statusUnit = 'MAINTENANCE';
    else unitMatch.statusUnit = 'READY';
    saveCodeUnits(units);
  }

  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateDailyArtic = async (item: DailyCheckArtic): Promise<DailyCheckArtic[]> => {
  const list = getDailyArticList();
  const normalizedItem: DailyCheckArtic = {
    ...item,
    qaType: item.qaType || 'DAILY_INSPECTION',
  };
  const updated = list.map(a => (a.id === item.id ? normalizedItem : a));
  localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify(updated));

  const units = getCodeUnits();
  const unitMatch = units.find(u => u.codeUnit === item.codeUnit);
  if (unitMatch) {
    if (item.hmUnit > unitMatch.currentHm) unitMatch.currentHm = item.hmUnit;
    if (item.status === 'BREAKDOWN') unitMatch.statusUnit = 'BREAKDOWN';
    else if (item.status === 'SCHEDULED_SERVICE') unitMatch.statusUnit = 'MAINTENANCE';
    else unitMatch.statusUnit = 'READY';
    saveCodeUnits(units);
  }

  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteDailyArtic = async (id: string): Promise<DailyCheckArtic[]> => {
  const list = getDailyArticList();
  const updated = list.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEYS.DAILY_ARTIC, JSON.stringify(updated));
  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

// -------------------------------------------------------------
// BACKLOG
// -------------------------------------------------------------
export const getBacklogs = (): BacklogItem[] => {
  ensureStorageInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BACKLOG);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addBacklog = async (item: BacklogItem): Promise<BacklogItem[]> => {
  const list = getBacklogs();
  const updated = [item, ...list];
  localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify(updated));
  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateBacklog = async (item: BacklogItem): Promise<BacklogItem[]> => {
  const list = getBacklogs();
  const updated = list.map(b => (b.id === item.id ? item : b));
  localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify(updated));
  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateBacklogStatus = (id: string, status: BacklogItem['status']): BacklogItem[] => {
  const list = getBacklogs();
  const updated = list.map(b => (b.id === id ? { ...b, status } : b));
  localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify(updated));
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteBacklog = async (id: string): Promise<BacklogItem[]> => {
  const list = getBacklogs();
  const updated = list.filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEYS.BACKLOG, JSON.stringify(updated));
  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

// -------------------------------------------------------------
// ACTIVITIES
// -------------------------------------------------------------
export const getActivities = (): AddActivityItem[] => {
  ensureStorageInitialized();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addActivity = async (item: AddActivityItem): Promise<AddActivityItem[]> => {
  const list = getActivities();
  const updated = [item, ...list];
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateActivity = async (item: AddActivityItem): Promise<AddActivityItem[]> => {
  const list = getActivities();
  const updated = list.map(a => (a.id === item.id ? item : a));
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const updateActivityStatus = (id: string, status: AddActivityItem['status']): AddActivityItem[] => {
  const list = getActivities();
  const updated = list.map(a => (a.id === id ? { ...a, status } : a));
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
  autoSyncToGoogleSheetIfConnected();
  return updated;
};

export const deleteActivity = async (id: string): Promise<AddActivityItem[]> => {
  const list = getActivities();
  const updated = list.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
  await autoSyncToGoogleSheetIfConnected();
  return updated;
};

/**
 * Get connected stats for a specific unit
 */
export const getUnitStats = (codeUnit: string) => {
  const backlogs = getBacklogs().filter(b => b.codeUnit === codeUnit);
  const activeBacklogs = backlogs.filter(b => b.status !== 'CLOSED');
  const activities = getActivities().filter(a => a.codeUnit === codeUnit);
  const baps = getBAPList().filter(b => b.codeUnit === codeUnit);
  const rigidInspections = getDailyRigidList().filter(r => r.codeUnit === codeUnit);
  const articInspections = getDailyArticList().filter(a => a.codeUnit === codeUnit);

  return {
    backlogCount: activeBacklogs.length,
    activityCount: activities.length,
    bapCount: baps.length,
    inspectionCount: rigidInspections.length + articInspections.length,
    recentBacklogs: activeBacklogs.slice(0, 5),
    recentActivities: activities.slice(0, 5),
  };
};
