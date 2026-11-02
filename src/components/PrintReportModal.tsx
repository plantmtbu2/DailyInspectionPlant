import React, { useRef, useState } from 'react';
import {
  BAPRecord,
  DailyCheckRigid,
  DailyCheckArtic,
  BacklogItem,
  AddActivityItem,
} from '../types';
import {
  X,
  Printer,
  FileText,
  Download,
  MessageSquare,
  Loader2,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  UserCheck,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import {
  shareToWhatsApp,
  constructWhatsAppDeepLink,
  formatSupervisorReportWhatsApp,
  formatBAPWhatsApp,
  formatDailyRigidWhatsApp,
  formatDailyArticWhatsApp,
  formatBacklogWhatsApp,
  formatActivityWhatsApp,
} from '../utils/whatsappFormatter';
import { getStoredSheetsConfig } from '../services/googleSheetsService';

type PrintableData =
  | { type: 'BAP'; data: BAPRecord }
  | { type: 'DAILY_RIGID'; data: DailyCheckRigid }
  | { type: 'DAILY_ARTIC'; data: DailyCheckArtic }
  | { type: 'BACKLOG'; data: BacklogItem }
  | { type: 'ACTIVITY'; data: AddActivityItem };

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PrintableData | null;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const printCanvasRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Supervisor & WhatsApp Deep Link state
  const SUPERVISOR_PHONE_KEY = 'plant2_supervisor_phone';
  const SUPERVISOR_NAME_KEY = 'plant2_supervisor_name';

  const defaultSupervisor = (() => {
    if (!report) return 'Foreman / Pengawas Maintenance';
    if ('divalidasiOleh' in report.data && report.data.divalidasiOleh) return report.data.divalidasiOleh;
    return 'Foreman / Pengawas Maintenance';
  })();

  const [supervisorPhone, setSupervisorPhone] = useState<string>(() => {
    try {
      return localStorage.getItem(SUPERVISOR_PHONE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [supervisorName, setSupervisorName] = useState<string>(() => {
    try {
      return localStorage.getItem(SUPERVISOR_NAME_KEY) || defaultSupervisor;
    } catch {
      return defaultSupervisor;
    }
  });

  const [showSupervisorPanel, setShowSupervisorPanel] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);

  if (!isOpen || !report) return null;

  const getReportCodeUnit = () => report.data.codeUnit || 'UNIT';

  const getReportDate = () => {
    if ('tanggal' in report.data) return report.data.tanggal;
    if ('tanggalTemuan' in report.data) return report.data.tanggalTemuan;
    return new Date().toISOString().slice(0, 10);
  };

  // Helper untuk generate objek PDF dari elemen cetak secara aman & reliable
  const createPDFInstance = async () => {
    if (!printCanvasRef.current) return null;
    const element = printCanvasRef.current;

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 10000,
        scrollX: 0,
        scrollY: 0,
      });
    } catch (err) {
      console.warn('html2canvas standard capture failed, retrying clean text render without external images:', err);
      canvas = await html2canvas(element, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: node => node.tagName === 'IMG',
        scrollX: 0,
        scrollY: 0,
      });
    }

    let imgData: string;
    try {
      imgData = canvas.toDataURL('image/jpeg', 0.95);
    } catch {
      // If tainted canvas happened despite precautions, generate clean version without images
      const cleanCanvas = await html2canvas(element, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: node => node.tagName === 'IMG',
      });
      imgData = cleanCanvas.toDataURL('image/jpeg', 0.95);
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const fileName = `LAPORAN_${report.type}_${getReportCodeUnit()}_${getReportDate()}.pdf`;
    return { pdf, fileName };
  };

  // Handler 1: Simpan PDF ke Perangkat
  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const result = await createPDFInstance();
      if (result) {
        // Multi-method download trigger for maximum browser compatibility
        try {
          const blob = result.pdf.output('blob');
          const blobUrl = URL.createObjectURL(blob);
          const downloadAnchor = document.createElement('a');
          downloadAnchor.href = blobUrl;
          downloadAnchor.download = result.fileName;
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          document.body.removeChild(downloadAnchor);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } catch {
          result.pdf.save(result.fileName);
        }
        setToastMessage(`Dokumen ${result.fileName} berhasil disimpan!`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err: any) {
      console.error('Download PDF error:', err);
      // Fallback ke native print dialog
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleUpdateSupervisorPhone = (val: string) => {
    setSupervisorPhone(val);
    try {
      localStorage.setItem(SUPERVISOR_PHONE_KEY, val);
    } catch {}
  };

  const handleUpdateSupervisorName = (val: string) => {
    setSupervisorName(val);
    try {
      localStorage.setItem(SUPERVISOR_NAME_KEY, val);
    } catch {}
  };

  const getWhatsAppMessage = () => {
    const sheetsConfig = getStoredSheetsConfig();
    const sheetUrl = sheetsConfig?.spreadsheetUrl;
    return formatSupervisorReportWhatsApp(
      report.type,
      report.data,
      supervisorName || 'Foreman / Supervisor Maintenance',
      sheetUrl
    );
  };

  const getWhatsAppDeepLink = (targetPhone?: string) => {
    const text = getWhatsAppMessage();
    const phone = targetPhone !== undefined ? targetPhone : supervisorPhone;
    return constructWhatsAppDeepLink(text, phone);
  };

  const handleCopyWhatsAppLink = async () => {
    try {
      const link = getWhatsAppDeepLink();
      await navigator.clipboard.writeText(link);
      setIsCopiedLink(true);
      setToastMessage('Link WhatsApp berhasil disalin!');
      setTimeout(() => {
        setIsCopiedLink(false);
        setToastMessage(null);
      }, 3500);
    } catch {
      setToastMessage('Gagal menyalin tautan.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Handler 2: Simpan PDF & Share via WhatsApp Deep Link
  const handleShareWhatsApp = async (targetPhone?: string) => {
    try {
      setIsSharing(true);
      const phoneToSend = targetPhone !== undefined ? targetPhone : supervisorPhone;
      const waText = getWhatsAppMessage();
      const deepLink = constructWhatsAppDeepLink(waText, phoneToSend);

      const result = await createPDFInstance();

      // Jika Web Share API dengan File PDF didukung (Android Chrome, iOS Safari)
      if (result && typeof navigator !== 'undefined' && navigator.share) {
        try {
          const blob = result.pdf.output('blob');
          const file = new File([blob], result.fileName, { type: 'application/pdf' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `Laporan ${report.type} - ${getReportCodeUnit()}`,
              text: waText,
              files: [file],
            });
            setToastMessage('Menu WhatsApp dibuka dengan file PDF terlampir!');
            setTimeout(() => setToastMessage(null), 4000);
            return;
          }
        } catch (shareErr) {
          console.warn('Native share error or dismissed:', shareErr);
        }
      }

      // Universal Fallback: Download file PDF ke perangkat dan buka WhatsApp Deep Link dengan teks memo lengkap
      if (result) {
        try {
          const blob = result.pdf.output('blob');
          const blobUrl = URL.createObjectURL(blob);
          const downloadAnchor = document.createElement('a');
          downloadAnchor.href = blobUrl;
          downloadAnchor.download = result.fileName;
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          document.body.removeChild(downloadAnchor);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } catch {
          result.pdf.save(result.fileName);
        }
      }

      // Buka deep link WhatsApp API
      const link = document.createElement('a');
      link.href = deepLink;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToastMessage('PDF tersimpan & WhatsApp API dibuka dengan laporan Supervisor!');
      setTimeout(() => setToastMessage(null), 4500);
    } catch (err: any) {
      console.error('Share WhatsApp error:', err);
      setToastMessage('Gagal membuka WhatsApp.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSharing(false);
    }
  };

  // Handler 3: Cetak Fisik via Browser
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-emerald-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 border border-emerald-400/30 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl my-auto text-slate-100 flex flex-col max-h-[95vh]">
        {/* Modal Toolbar (Hidden on print) */}
        <div className="no-print px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Preview Dokumen Laporan</h3>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                PT. Pamapersada Nusantara - Plant 2
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Tombol Simpan PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF || isSharing}
              className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
              title="Download dan simpan file PDF ke penyimpanan perangkat"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Simpan PDF</span>
                </>
              )}
            </button>

            {/* Tombol Utama: Share via WhatsApp */}
            <button
              onClick={() => handleShareWhatsApp()}
              disabled={isGeneratingPDF || isSharing}
              className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
              title="Kirim laporan dan PDF langsung ke WhatsApp Supervisor"
            >
              {isSharing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuka WA...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>Share via WhatsApp</span>
                </>
              )}
            </button>

            {/* Tombol Pengawas / Supervisor Setting Panel */}
            <button
              onClick={() => setShowSupervisorPanel(!showSupervisorPanel)}
              className={`p-2 sm:py-1.5 sm:px-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition ${
                showSupervisorPanel
                  ? 'bg-emerald-800/60 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Atur Nama & No. WA Supervisor / Pengawas tujuan"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">
                {supervisorPhone ? `WA: ${supervisorPhone}` : 'Pilih Pengawas'}
              </span>
            </button>

            {/* Tombol Cetak Fisik */}
            <button
              onClick={handlePrint}
              className="p-2 sm:py-1.5 sm:px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition"
              title="Cetak langsung menggunakan printer fisik"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Tombol Tutup */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Tutup preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Supervisor & WhatsApp Deep Link Bar */}
        {showSupervisorPanel && (
          <div className="no-print px-4 sm:px-5 py-3 bg-slate-850/90 border-b border-slate-800 animate-fadeIn text-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-slate-200 font-semibold">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Pengiriman Laporan ke Supervisor via WhatsApp API</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyWhatsAppLink}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center space-x-1 text-[11px] transition"
                  title="Salin deep link WhatsApp ke clipboard"
                >
                  {isCopiedLink ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Salin Deep Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Nama Supervisor / Pengawas:
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={e => handleUpdateSupervisorName(e.target.value)}
                  placeholder="Contoh: Bpk. Foreman Maintenance"
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  No. WhatsApp Supervisor (Opsional):
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={supervisorPhone}
                    onChange={e => handleUpdateSupervisorPhone(e.target.value)}
                    placeholder="Contoh: 08123456789 atau 62812..."
                    className="flex-1 bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => handleShareWhatsApp(supervisorPhone)}
                    disabled={isGeneratingPDF || isSharing}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow transition disabled:opacity-50 whitespace-nowrap"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Kirim</span>
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              💡 Tombol <strong className="text-emerald-400">Share via WhatsApp</strong> akan menyusun tautan mendalam (WhatsApp Deep Link) resmi berisikan ringkasan laporan & mengunduh PDF untuk dikirim langsung ke pengawas/supervisor.
            </p>
          </div>
        )}

        {/* Printable Paper Canvas (White Background for clean PDF printing) */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-850">
          <div
            ref={printCanvasRef}
            className="print-container bg-white text-slate-900 rounded-xl p-5 sm:p-8 shadow-xl max-w-3xl mx-auto border border-slate-200"
          >
            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 text-slate-900">
                  <div className="w-7 h-7 bg-amber-500 text-slate-950 font-black rounded flex items-center justify-center text-xs">
                    PAMA
                  </div>
                  <h1 className="text-base font-black tracking-tight uppercase">
                    PT.PAMAPERSADA NUSANTARA
                  </h1>
                </div>
                <p className="text-[11px] text-slate-600 font-semibold tracking-wide mt-0.5">
                  PLANT & HEAVY EQUIPMENT MAINTENANCE DIVISION
                </p>
                <p className="text-[10px] text-slate-500">
                  Mining Operations & Fleet Maintenance Support System
                </p>
              </div>

              <div className="text-right text-[10px] text-slate-600 font-mono">
                <span className="font-bold block text-slate-900 text-xs">
                  {report.type === 'BAP'
                    ? 'FORM-BAP-PAMA-01'
                    : report.type === 'DAILY_RIGID'
                    ? report.data.qaType === 'DAILY_INSPECTION'
                      ? 'FORM-DAILY-RIGID-00'
                      : report.data.qaType === 'QA7_FINAL'
                      ? 'FORM-QA7-RIGID-02'
                      : 'FORM-QA1-RIGID-01'
                    : report.type === 'DAILY_ARTIC'
                    ? report.data.qaType === 'DAILY_INSPECTION'
                      ? 'FORM-DAILY-ARTIC-00'
                      : report.data.qaType === 'QA7_FINAL'
                      ? 'FORM-QA7-ARTIC-04'
                      : 'FORM-QA1-ARTIC-03'
                    : 'FORM-LOG-PAMA-05'}
                </span>
                <span>Revisi: 02 | Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</span>
              </div>
            </div>

            {/* Title Banner */}
            <div className="bg-slate-100 border border-slate-300 rounded p-2 text-center mb-5">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">
                {report.type === 'BAP' && 'BERITA ACARA PEMERIKSAAN KERUSAKAN (BAP)'}
                {report.type === 'DAILY_RIGID' &&
                  (report.data.qaType === 'DAILY_INSPECTION'
                    ? 'DAILY INSPECTION RIGID DUMP TRUCK (19 ITEM)'
                    : report.data.qaType === 'QA7_FINAL'
                    ? '2. QA 7 FINAL INSPECTION RIGID DUMP TRUCK'
                    : '1. QA 1 PRE INSPECTION RIGID DUMP TRUCK')}
                {report.type === 'DAILY_ARTIC' &&
                  (report.data.qaType === 'DAILY_INSPECTION'
                    ? 'DAILY INSPECTION ARTICULATED DUMP TRUCK (36 ITEM)'
                    : report.data.qaType === 'QA7_FINAL'
                    ? '4. QA 7 FINAL INSPECTION ARTICULATED / GRADER'
                    : '3. QA 1 PRE INSPECTION ARTICULATED / GRADER')}
                {report.type === 'BACKLOG' && 'FORMULIR RESERVASI BACKLOG SPAREPART'}
                {report.type === 'ACTIVITY' && 'CATATAN AKTIVITAS HARIAN MEKANIK'}
              </h2>
            </div>

            {/* BAP Content */}
            {report.type === 'BAP' && (
              <div className="space-y-4 text-xs">
                {/* Meta table */}
                <table className="w-full border-collapse border border-slate-300">
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">No. BAP</td>
                      <td className="border border-slate-300 p-2 font-mono font-bold text-amber-700">{report.data.id}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">No. MO</td>
                      <td className="border border-slate-300 p-2 font-mono">{report.data.mo}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Code Unit</td>
                      <td className="border border-slate-300 p-2 font-bold font-mono">{report.data.codeUnit}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Current HM</td>
                      <td className="border border-slate-300 p-2 font-mono">{report.data.hm.toLocaleString()} Jam</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Tanggal & Jam</td>
                      <td className="border border-slate-300 p-2">{report.data.tanggal} {report.data.jam}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Lokasi Pekerjaan</td>
                      <td className="border border-slate-300 p-2">{report.data.lokasiPekerjaan}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Estimasi Pekerjaan</td>
                      <td className="border border-slate-300 p-2 font-semibold text-rose-700">{report.data.estimasiPekerjaan}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Status Unit</td>
                      <td className="border border-slate-300 p-2 font-bold">{report.data.status}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Kerusakan Description */}
                <div className="border border-slate-300 rounded p-3 bg-slate-50">
                  <span className="font-bold block text-slate-800 mb-1 uppercase text-[11px]">
                    Deskripsi Kerusakan & Gejala Kegagalan Komponen:
                  </span>
                  <p className="whitespace-pre-line text-slate-900 leading-relaxed">
                    {report.data.kerusakan}
                  </p>
                </div>

                {report.data.catatanTambahan && (
                  <div className="border border-slate-300 rounded p-3">
                    <span className="font-bold block text-slate-800 mb-1 uppercase text-[11px]">
                      Catatan Tambahan & Kebutuhan Khusus:
                    </span>
                    <p className="text-slate-700">{report.data.catatanTambahan}</p>
                  </div>
                )}

                {report.data.photoUrl && (
                  <div className="border border-slate-300 rounded p-3 bg-slate-50">
                    <span className="font-bold block text-slate-800 mb-1.5 uppercase text-[11px]">
                      Lampiran Dokumentasi Foto Kerusakan / Temuan:
                    </span>
                    <div className="flex justify-center">
                      <img
                        src={report.data.photoUrl}
                        alt="Foto Temuan Kerusakan"
                        crossOrigin="anonymous"
                        className="max-h-56 max-w-full rounded border border-slate-300 object-contain shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Daily Rigid Content */}
            {report.type === 'DAILY_RIGID' && (
              <div className="space-y-4 text-xs">
                {/* Meta */}
                <table className="w-full border-collapse border border-slate-300">
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">Code Unit</td>
                      <td className="border border-slate-300 p-2 font-bold font-mono">{report.data.codeUnit}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">EGI</td>
                      <td className="border border-slate-300 p-2">{report.data.egi}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Tanggal</td>
                      <td className="border border-slate-300 p-2">{report.data.tanggal}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Status Unit</td>
                      <td className="border border-slate-300 p-2 font-bold">{report.data.status}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Jam Kerja</td>
                      <td className="border border-slate-300 p-2">
                        {report.data.startTime} - {report.data.finishTime} ({report.data.totalJam})
                      </td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">HM Unit</td>
                      <td className="border border-slate-300 p-2 font-mono">{report.data.hmUnit.toLocaleString()} Jam</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">PIC Mekanik</td>
                      <td className="border border-slate-300 p-2">{report.data.picMekanik}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Divalidasi Oleh</td>
                      <td className="border border-slate-300 p-2 font-semibold">{report.data.divalidasiOleh}</td>
                    </tr>
                  </tbody>
                </table>

                {/* 19 Checklist Items Table */}
                <h3 className="font-bold text-slate-800 uppercase text-[11px] pt-1">
                  Hasil Pemeriksaan 19 Parameter Rigid:
                </h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {report.data.items.map(it => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between border-b border-slate-200 py-1 text-[11px]"
                    >
                      <span className="truncate pr-2">{it.name}</span>
                      <div className="flex items-center space-x-1 shrink-0">
                        {it.value && (
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded text-[10px]">
                            {it.value}
                          </span>
                        )}
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                            it.status === 'OK'
                              ? 'bg-emerald-100 text-emerald-800'
                              : it.status === 'DEFECT'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {it.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Temuan Deviasi */}
                <div className="border border-slate-300 rounded p-2.5 bg-slate-50 mt-2">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase mb-1">
                    Temuan Deviasi / ADD ACTIVITIES:
                  </span>
                  <p className="text-slate-800">{report.data.temuanDeviasi || 'Nihil'}</p>
                </div>

                {report.data.photoUrl && (
                  <div className="border border-slate-300 rounded p-3 bg-slate-50 mt-2">
                    <span className="font-bold text-slate-800 block text-[11px] uppercase mb-1.5">
                      Lampiran Dokumentasi Foto Daily Check Rigid:
                    </span>
                    <div className="flex justify-center">
                      <img
                        src={report.data.photoUrl}
                        alt="Foto Daily Check Rigid"
                        crossOrigin="anonymous"
                        className="max-h-56 max-w-full rounded border border-slate-300 object-contain shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Daily Artic Content */}
            {report.type === 'DAILY_ARTIC' && (
              <div className="space-y-4 text-xs">
                {/* Meta */}
                <table className="w-full border-collapse border border-slate-300">
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">Code Unit</td>
                      <td className="border border-slate-300 p-2 font-bold font-mono">{report.data.codeUnit}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">EGI</td>
                      <td className="border border-slate-300 p-2">{report.data.egi}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Tanggal</td>
                      <td className="border border-slate-300 p-2">{report.data.tanggal}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Status Unit</td>
                      <td className="border border-slate-300 p-2 font-bold">{report.data.status}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Jam Kerja</td>
                      <td className="border border-slate-300 p-2">
                        {report.data.startTime} - {report.data.finishTime} ({report.data.totalJam})
                      </td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">HM Unit</td>
                      <td className="border border-slate-300 p-2 font-mono">{report.data.hmUnit.toLocaleString()} Jam</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">PIC Mekanik</td>
                      <td className="border border-slate-300 p-2">{report.data.picMekanik}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Divalidasi Oleh</td>
                      <td className="border border-slate-300 p-2 font-semibold">{report.data.divalidasiOleh}</td>
                    </tr>
                  </tbody>
                </table>

                {/* 36 Checklist Items Table */}
                <h3 className="font-bold text-slate-800 uppercase text-[11px] pt-1">
                  Hasil Pemeriksaan 36 Parameter Artic / Grader:
                </h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {report.data.items.map(it => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between border-b border-slate-200 py-0.5 text-[10px]"
                    >
                      <span className="truncate pr-2">{it.name}</span>
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${
                          it.status === 'OK'
                            ? 'bg-emerald-100 text-emerald-800'
                            : it.status === 'DEFECT'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {it.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border border-slate-300 rounded p-2.5 bg-slate-50 mt-2">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase mb-1">
                    Temuan Deviasi / ADD ACTIVITIES:
                  </span>
                  <p className="text-slate-800">{report.data.temuanDeviasi || 'Nihil'}</p>
                </div>

                {report.data.photoUrl && (
                  <div className="border border-slate-300 rounded p-3 bg-slate-50 mt-2">
                    <span className="font-bold text-slate-800 block text-[11px] uppercase mb-1.5">
                      Lampiran Dokumentasi Foto Daily Check Artic (ADT):
                    </span>
                    <div className="flex justify-center">
                      <img
                        src={report.data.photoUrl}
                        alt="Foto Daily Check Artic"
                        crossOrigin="anonymous"
                        className="max-h-56 max-w-full rounded border border-slate-300 object-contain shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Backlog Content */}
            {report.type === 'BACKLOG' && (
              <div className="space-y-4 text-xs">
                <table className="w-full border-collapse border border-slate-300">
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">ID Backlog</td>
                      <td className="border border-slate-300 p-2 font-mono font-bold text-amber-700">{report.data.id}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">No. MO Backlog</td>
                      <td className="border border-slate-300 p-2 font-mono">{report.data.moBacklog}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Code Unit</td>
                      <td className="border border-slate-300 p-2 font-bold font-mono">{report.data.codeUnit}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">No. Reservasi</td>
                      <td className="border border-slate-300 p-2 font-mono">{report.data.nomorReservasi}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Status</td>
                      <td className="border border-slate-300 p-2 font-bold">{report.data.status}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Sumber Temuan</td>
                      <td className="border border-slate-300 p-2">{report.data.sumberTemuan}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Tanggal Temuan</td>
                      <td className="border border-slate-300 p-2">{report.data.tanggalTemuan}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">PIC Pelapor</td>
                      <td className="border border-slate-300 p-2 font-semibold">{report.data.pic}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Tabel Resmi Kebutuhan Sparepart */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 uppercase text-[11px]">
                      Daftar Kebutuhan Sparepart ({report.data.parts?.length || 1} Jenis Item):
                    </span>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">
                      Total: {report.data.qty} Pcs
                    </span>
                  </div>

                  <table className="w-full border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold">
                        <th className="border border-slate-300 p-2 text-center w-10">No</th>
                        <th className="border border-slate-300 p-2 text-left w-36">Part Number</th>
                        <th className="border border-slate-300 p-2 text-left">Deskripsi Komponen / Sparepart</th>
                        <th className="border border-slate-300 p-2 text-center w-20">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.data.parts && report.data.parts.length > 0 ? (
                        report.data.parts.map((p, idx) => (
                          <tr key={p.id || idx} className={idx % 2 === 1 ? 'bg-slate-50' : ''}>
                            <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-600">{idx + 1}</td>
                            <td className="border border-slate-300 p-1.5 font-mono font-bold text-slate-900">{p.partNumber || '-'}</td>
                            <td className="border border-slate-300 p-1.5 text-slate-800">{p.deskripsiPart || '-'}</td>
                            <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-amber-700">{p.qty} Pcs</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-600">1</td>
                          <td className="border border-slate-300 p-1.5 font-mono font-bold text-slate-900">{report.data.partNumber || '-'}</td>
                          <td className="border border-slate-300 p-1.5 text-slate-800">{report.data.deskripsiPart || '-'}</td>
                          <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-amber-700">{report.data.qty} Pcs</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border border-slate-300 rounded p-3 bg-slate-50">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase mb-1">
                    Deskripsi Masalah / Backlog:
                  </span>
                  <p className="text-slate-800 leading-relaxed">{report.data.deskripsiBacklog}</p>
                </div>

                {report.data.photoUrl && (
                  <div className="border border-slate-300 rounded p-3 bg-slate-50 mt-2">
                    <span className="font-bold text-slate-800 block text-[11px] uppercase mb-1.5">
                      Lampiran Dokumentasi Foto Sparepart / Backlog:
                    </span>
                    <div className="flex justify-center">
                      <img
                        src={report.data.photoUrl}
                        alt="Foto Dokumentasi Backlog"
                        crossOrigin="anonymous"
                        className="max-h-56 max-w-full rounded border border-slate-300 object-contain shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Activity Content */}
            {report.type === 'ACTIVITY' && (
              <div className="space-y-4 text-xs">
                <table className="w-full border-collapse border border-slate-300">
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">ID Aktivitas</td>
                      <td className="border border-slate-300 p-2 font-mono font-bold">{report.data.id}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">Code Unit</td>
                      <td className="border border-slate-300 p-2 font-bold font-mono">{report.data.codeUnit}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Tanggal</td>
                      <td className="border border-slate-300 p-2">{report.data.tanggalTemuan}</td>
                      <td className="border border-slate-300 p-2 font-bold bg-slate-50">Status</td>
                      <td className="border border-slate-300 p-2 font-bold">{report.data.status}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="border border-slate-300 rounded p-3 bg-slate-50">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase mb-1">
                    Deskripsi Aktivitas:
                  </span>
                  <p className="text-slate-800">{report.data.deskripsiAktivitas}</p>
                </div>

                <div className="border border-slate-300 rounded p-3">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase mb-1">
                    Tindakan Perbaikan (Action):
                  </span>
                  <p className="text-slate-800">{report.data.action}</p>
                </div>

                {report.data.photoUrl && (
                  <div className="border border-slate-300 rounded p-3 bg-slate-50 mt-2">
                    <span className="font-bold text-slate-800 block text-[11px] uppercase mb-1.5">
                      Lampiran Dokumentasi Foto Pengerjaan / Tindakan:
                    </span>
                    <div className="flex justify-center">
                      <img
                        src={report.data.photoUrl}
                        alt="Foto Dokumentasi Aktivitas"
                        crossOrigin="anonymous"
                        className="max-h-56 max-w-full rounded border border-slate-300 object-contain shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Official Signatures Block */}
            <div className="mt-8 pt-4 border-t-2 border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Dibuat Oleh:</p>
                <div className="h-16 flex items-end justify-center">
                  <span className="font-bold underline text-slate-900">
                    {'picMekanik' in report.data
                      ? report.data.picMekanik
                      : 'pic' in report.data
                      ? report.data.pic
                      : 'Mekanik Plant'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Mekanik</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Diperiksa / Divalidasi:</p>
                <div className="h-16 flex items-end justify-center">
                  <span className="font-bold underline text-slate-900">
                    {'divalidasiOleh' in report.data ? report.data.divalidasiOleh : 'Foreman Plant'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Group Leader</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Diketahui Oleh:</p>
                <div className="h-16 flex items-end justify-center">
                  <span className="font-bold underline text-slate-900">Erik/Daniel/Rismanto</span>
                </div>
                <p className="text-[10px] text-slate-500">LCE</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
