import {
  BAPRecord,
  DailyCheckRigid,
  DailyCheckArtic,
  BacklogItem,
  AddActivityItem,
} from '../types';

/**
 * Normalizes phone numbers to international WhatsApp format (e.g., 0812... -> 62812...)
 */
export const normalizeWhatsAppPhone = (phone: string): string => {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }
  return clean;
};

/**
 * Constructs a deep link using the official WhatsApp API
 */
export const constructWhatsAppDeepLink = (text: string, phone = ''): string => {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  return cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
};

export const shareToWhatsApp = (text: string, phone = '') => {
  const url = constructWhatsAppDeepLink(text, phone);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Formats a pre-filled summary message addressed directly to a supervisor
 */
export const formatSupervisorReportWhatsApp = (
  type: 'BAP' | 'DAILY_RIGID' | 'DAILY_ARTIC' | 'BACKLOG' | 'ACTIVITY',
  data: any,
  supervisorName = 'Bapak/Ibu Supervisor',
  sheetUrl?: string
): string => {
  let body = '';
  if (type === 'BAP') body = formatBAPWhatsApp(data);
  else if (type === 'DAILY_RIGID') body = formatDailyRigidWhatsApp(data);
  else if (type === 'DAILY_ARTIC') body = formatDailyArticWhatsApp(data);
  else if (type === 'BACKLOG') body = formatBacklogWhatsApp(data);
  else if (type === 'ACTIVITY') body = formatActivityWhatsApp(data);

  const header = `*Yth. ${supervisorName}*\nMohon izin mengirimkan laporan inspeksi & perawatan unit alat berat:\n\n`;
  const sheetFooter = sheetUrl ? `\n\n📊 *Live Google Sheets:* ${sheetUrl}` : '';

  return `${header}${body}${sheetFooter}`;
};

export const formatBAPWhatsApp = (bap: BAPRecord): string => {
  return `🚨 *BERITA ACARA PEMERIKSAAN (BAP)* 🚨
*FLEET MAINTENANCE LOG*
---------------------------------------
📋 *No. BAP:* ${bap.id}
🚛 *Code Unit:* ${bap.codeUnit}
⏱️ *Hour Meter (HM):* ${bap.hm.toLocaleString()} Jam
🛠️ *No. MO:* ${bap.mo}
📍 *Lokasi:* ${bap.lokasiPekerjaan}
📅 *Waktu:* ${bap.tanggal} ${bap.jam}
👷 *PIC Mekanik:* ${bap.picMekanik}
📌 *Status:* ${bap.status}

⚠️ *DESKRIPSI KERUSAKAN:*
${bap.kerusakan}

⏳ *ESTIMASI PEKERJAAN:*
${bap.estimasiPekerjaan}
${bap.catatanTambahan ? `\n📝 *Catatan Tambahan:*\n${bap.catatanTambahan}` : ''}
---------------------------------------
_Aplikasi Plant 2 - PT. Pamapersada Nusantara_`;
};

export const formatDailyRigidWhatsApp = (item: DailyCheckRigid): string => {
  const isDaily = item.qaType === 'DAILY_INSPECTION';
  const isFinal = item.qaType === 'QA7_FINAL';
  const qaTitle = isDaily
    ? 'DAILY INSPECTION RIGID'
    : isFinal
    ? '2. QA 7 FINAL INSPECTION RIGID'
    : '1. QA 1 PRE INSPECTION RIGID';
  const defects = item.items.filter(i => i.status === 'DEFECT');
  const monitors = item.items.filter(i => i.status === 'MONITOR');
  const measurements = item.items.filter(i => i.value && i.value.trim() !== '');

  let measurementText = '';
  if (measurements.length > 0) {
    measurementText = `\n📊 *DATA PENGUKURAN TEKANAN & VOLT:*
${measurements.map(m => `• ${m.name}: *${m.value} ${m.unit || ''}*`).join('\n')}`;
  }

  let deviationText = '';
  if (defects.length > 0) {
    deviationText = `\n❌ *TEMUAN DEFECT/RUSAK (${defects.length}):*
${defects.map(d => `• ${d.name}${d.remark ? ` (${d.remark})` : ''}`).join('\n')}`;
  }

  if (monitors.length > 0) {
    deviationText += `\n⚠️ *MONITOR/PERHATIAN (${monitors.length}):*
${monitors.map(m => `• ${m.name}${m.remark ? ` (${m.remark})` : ''}`).join('\n')}`;
  }

  return `📋 *LAPORAN ${qaTitle}* 🚛
---------------------------------------
🚛 *Code Unit:* ${item.codeUnit}
🔖 *EGI:* ${item.egi}
📅 *Tanggal:* ${item.tanggal}
⚡ *Status Unit:* ${item.status}
⏱️ *HM Unit:* ${item.hmUnit.toLocaleString()} Jam
⏰ *Waktu Inspeksi:* ${item.startTime} - ${item.finishTime} (${item.totalJam})
👷 *PIC Mekanik:* ${item.picMekanik}
✅ *Divalidasi Oleh:* ${item.divalidasiOleh}
${measurementText}
${deviationText}

🔍 *TEMUAN DEVIASI / ADD ACTIVITIES:*
${item.temuanDeviasi || 'Nihil / Semua item dalam toleransi'}

📊 *LINKED STATUS:*
• Jumlah Backlog Terkait: *${item.jumlahBacklog}*
• Jumlah Aktivitas Terkait: *${item.jumlahAktivitas}*
---------------------------------------
_Aplikasi Plant 2 - PT. Pamapersada Nusantara_`;
};

export const formatDailyArticWhatsApp = (item: DailyCheckArtic): string => {
  const isDaily = item.qaType === 'DAILY_INSPECTION';
  const isFinal = item.qaType === 'QA7_FINAL';
  const qaTitle = isDaily
    ? 'DAILY INSPECTION ARTIC'
    : isFinal
    ? '4. QA 7 FINAL INSPECTION ARTIC'
    : '3. QA 1 PRE INSPECTION ARTIC';
  const defects = item.items.filter(i => i.status === 'DEFECT');
  const monitors = item.items.filter(i => i.status === 'MONITOR');

  let deviationText = '';
  if (defects.length > 0) {
    deviationText = `\n❌ *TEMUAN DEFECT (${defects.length}):*
${defects.map(d => `• ${d.name}${d.remark ? ` (${d.remark})` : ''}`).join('\n')}`;
  }
  if (monitors.length > 0) {
    deviationText += `\n⚠️ *MONITOR/PERHATIAN (${monitors.length}):*
${monitors.map(m => `• ${m.name}${m.remark ? ` (${m.remark})` : ''}`).join('\n')}`;
  }

  return `🚜 *LAPORAN ${qaTitle}* 🚜
---------------------------------------
🚜 *Code Unit:* ${item.codeUnit}
🔖 *EGI:* ${item.egi}
📅 *Tanggal:* ${item.tanggal}
⚡ *Status Unit:* ${item.status}
⏱️ *HM Unit:* ${item.hmUnit.toLocaleString()} Jam
⏰ *Waktu Inspeksi:* ${item.startTime} - ${item.finishTime} (${item.totalJam})
👷 *PIC Mekanik:* ${item.picMekanik}
✅ *Divalidasi Oleh:* ${item.divalidasiOleh}
${deviationText}

🔍 *TEMUAN DEVIASI / ADD ACTIVITIES:*
${item.temuanDeviasi || 'Nihil / Semua item dalam kondisi baik'}

📊 *LINKED STATUS:*
• Jumlah Backlog: *${item.jumlahBacklog}*
• Jumlah Aktivitas: *${item.jumlahAktivitas}*
---------------------------------------
_Aplikasi Plant 2 - PT. Pamapersada Nusantara_`;
};

export const formatBacklogWhatsApp = (bl: BacklogItem): string => {
  let partsText = '';
  if (bl.parts && bl.parts.length > 0) {
    const totalQty = bl.parts.reduce((sum, p) => sum + (Number(p.qty) || 0), 0);
    partsText = `📦 *DAFTAR KEBUTUHAN SPAREPART (${bl.parts.length} Item, Total ${totalQty} Pcs):*\n` +
      bl.parts
        .map(
          (p, i) =>
            `${i + 1}. *[${p.partNumber || '-'}]* ${p.deskripsiPart || '-'} (Qty: *${p.qty} Pcs*)`
        )
        .join('\n');
  } else {
    partsText = `📦 *Kebutuhan Sparepart:*
• Part No: *${bl.partNumber}*
• Part Name: *${bl.deskripsiPart}*
• Qty: *${bl.qty} Pcs*`;
  }

  return `⚠️ *LAPORAN BACKLOG ALAT BERAT* ⚠️
---------------------------------------
🚛 *Code Unit:* ${bl.codeUnit}
📝 *ID Backlog:* ${bl.id}
🛠️ *MO Backlog:* ${bl.moBacklog}
🎫 *No. Reservasi:* ${bl.nomorReservasi || '-'}
📅 *Tanggal Temuan:* ${bl.tanggalTemuan}
👷 *PIC Pelapor:* ${bl.pic}
🔍 *Sumber Temuan:* ${bl.sumberTemuan}
📌 *Status:* ${bl.status}

📋 *Deskripsi Temuan / Kerusakan:*
${bl.deskripsiBacklog}

${partsText}
---------------------------------------
_Aplikasi Plant 2 - PT. Pamapersada Nusantara_`;
};

export const formatActivityWhatsApp = (act: AddActivityItem): string => {
  return `🔧 *LAPORAN AKTIVITAS MEKANIK* 🔧
---------------------------------------
🚛 *Code Unit:* ${act.codeUnit}
🆔 *ID Aktivitas:* ${act.id}
📅 *Tanggal:* ${act.tanggalTemuan}
👷 *PIC Mekanik:* ${act.pic}
📌 *Status:* ${act.status}

📝 *Deskripsi Aktivitas:*
${act.deskripsiAktivitas}

⚡ *Action (Tindakan):*
${act.action}
---------------------------------------
_Aplikasi Plant 2 - PT. Pamapersada Nusantara_`;
};
