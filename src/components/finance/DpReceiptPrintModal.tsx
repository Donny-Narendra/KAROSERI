import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Receipt, CheckCircle, Download, Loader2, FileDown } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { terbilang } from '../../utils/terbilang';
import { formatCurrency } from '../../utils/invoiceExport';
import { createStyleProxy } from '../../utils/pdfExportUtils';

export interface DpReceiptData {
  spkNo: string;
  customerName: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleVin?: string;
  paymentDate?: string | Date;
  receiptNo?: string;
  totalContractEstimate: number;
  dpAmount: number;
  paymentMethod: string;
  notes?: string;
  cashierName?: string;
}

interface DpReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DpReceiptData | null;
  autoPrint?: boolean;
  isCompact?: boolean;
}

const formatDateId = (dateInput?: string | Date) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  const safeDate = isNaN(date.getTime()) ? new Date() : date;

  const yyyy = safeDate.getFullYear();
  const mm = String(safeDate.getMonth() + 1).padStart(2, '0');
  const dd = String(safeDate.getDate()).padStart(2, '0');

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = dayNames[safeDate.getDay()];
  const dayNum = safeDate.getDate();
  const monthName = monthNames[safeDate.getMonth()];
  const fullDateStr = `${dayName}, ${dayNum} ${monthName} ${yyyy}`;
  const timeStr = safeDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return {
    dateCode: `${yyyy}${mm}${dd}`,
    formattedDate: `${fullDateStr} - ${timeStr} WIB`,
    shortDate: `${dayNum} ${monthName} ${yyyy}`,
    timestamp: `${safeDate.toLocaleDateString('id-ID')} ${timeStr}`,
  };
};

export const DpReceiptPrintModal: React.FC<DpReceiptPrintModalProps> = ({
  isOpen,
  onClose,
  data,
  autoPrint = false,
  isCompact = false,
}) => {
  const [downloadingMode, setDownloadingMode] = useState<'full' | 'compact' | null>(null);
  const isDownloadingPdf = Boolean(downloadingMode);
  const isCompactMode = isCompact;

  useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  if (!isOpen || !data) return null;

  const dateDetails = formatDateId(data.paymentDate);
  const receiptNumber = data.receiptNo || `DP/${data.spkNo}/${dateDetails.dateCode}`;
  const totalContract = Number(data.totalContractEstimate || 0);
  const dpAmount = Number(data.dpAmount || 0);
  const remainingBill = Math.max(0, totalContract - dpAmount);
  const terbilangDp = terbilang(dpAmount);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async ({ isCompact: isCompactDownload = false }: { isCompact?: boolean } = {}) => {
    const element = document.getElementById('printable-dp-receipt') || document.getElementById('dp-receipt-print-area');
    if (!element) {
      console.error('Target elemen kuitansi DP tidak ditemukan di DOM');
      return;
    }

    const origWindowGetComputedStyle = typeof window !== 'undefined' ? window.getComputedStyle : null;

    try {
      setDownloadingMode(isCompactDownload ? 'compact' : 'full');
      const safeSpk = (data.spkNo || 'SPK').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = isCompactDownload
        ? `Kuitansi-DP-Ringkas-${safeSpk}.pdf`
        : `Kuitansi-DP-${safeSpk}.pdf`;

      // Intercept window.getComputedStyle in the main window during html2pdf run
      if (origWindowGetComputedStyle && typeof window !== 'undefined') {
        window.getComputedStyle = createStyleProxy(origWindowGetComputedStyle.bind(window));
      }

      const opt = {
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc: Document) => {
            const win = clonedDoc.defaultView;
            if (win) {
              win.getComputedStyle = createStyleProxy(win.getComputedStyle.bind(win));
            }
            const clonedEl = clonedDoc.getElementById('printable-dp-receipt') || clonedDoc.getElementById('dp-receipt-print-area');
            if (clonedEl) {
              clonedEl.style.boxShadow = 'none';
            }
            if (isCompactDownload) {
              clonedDoc.querySelectorAll('.row-total-kontrak, .row-sisa-tagihan').forEach(row => {
                row.remove();
              });
            }
          },
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      };

      const html2pdfWorker = ((html2pdf as any).default || html2pdf) as typeof html2pdf;
      await html2pdfWorker().set(opt).from(element).save();
    } catch (err) {
      console.error('Gagal mengunduh dokumen kuitansi DP via html2pdf:', err);
      // Fallback elegan: buka print window dialog jika canvas parsing gagal
      window.print();
    } finally {
      if (origWindowGetComputedStyle && typeof window !== 'undefined') {
        window.getComputedStyle = origWindowGetComputedStyle;
      }
      if (typeof document !== 'undefined') {
        document.querySelectorAll('.html2pdf__overlay').forEach(el => el.remove());
      }
      setDownloadingMode(null);
    }
  };

  const printRoot = typeof document !== 'undefined'
    ? (document.getElementById('print-root') || document.body)
    : null;

  if (!printRoot) return null;

  return createPortal(
    <div
      id="dp-receipt-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto print:static print:inset-auto print:z-auto print:p-0 print:m-0 print:bg-transparent print:overflow-visible print:block"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:static print:w-full print:max-w-none print:border-none print:shadow-none print:rounded-none print:bg-transparent print:overflow-visible print:m-0 print:p-0 print:block">
        
        {/* Sticky Header */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900 sticky top-0 z-10 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                Pratinjau Kuitansi Pembayaran Uang Muka (Invoice DP)
              </h3>
              <p className="text-[11px] text-slate-400">
                {receiptNumber} &bull; Dokumen Sah &bull; Siap Cetak A4
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Tombol Unduh Kuitansi Ringkas */}
            <button
              type="button"
              onClick={() => handleDownloadPdf({ isCompact: true })}
              disabled={isDownloadingPdf}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              title="Download kuitansi ringkas tanpa estimasi total kontrak & sisa tagihan"
            >
              {downloadingMode === 'compact' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{downloadingMode === 'compact' ? 'Mengunduh...' : 'Download Kuitansi Ringkas'}</span>
            </button>

            {/* Tombol Unduh PDF */}
            <button
              type="button"
              onClick={() => handleDownloadPdf({ isCompact: false })}
              disabled={isDownloadingPdf}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Unduh langsung kuitansi DP dalam format PDF"
            >
              {downloadingMode === 'full' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{downloadingMode === 'full' ? 'Mengunduh...' : 'Download PDF'}</span>
            </button>

            {/* Tombol Cetak Kuitansi */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isDownloadingPdf}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Cetak Kuitansi Pembayaran DP"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kuitansi</span>
            </button>

            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={onClose}
              disabled={isDownloadingPdf}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Tutup Pratinjau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body Kontainer Kertas */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 flex justify-center print:static print:p-0 print:overflow-visible print:max-h-none print:bg-transparent print:m-0 print:block">
          
          {/* Printable A4 Document Sheet */}
          <div 
            id="printable-dp-receipt" 
            data-id="printable-dp-receipt"
            className="dp-receipt-sheet bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] h-auto p-6 md:p-8 rounded-sm shadow-2xl text-xs flex flex-col justify-between print:w-full print:max-w-none print:min-h-0 print:h-auto print:p-0 print:shadow-none print:border-none print:rounded-none"
          >
            {/* 1. KOP & HEADER KUITANSI + TABEL + SYARAT KETENTUAN */}
            <div className="space-y-4">
              {/* Kop Surat RobelKaroseri */}
              <div className="border-b-2 border-slate-900 pb-1.5 mb-1 break-inside-avoid">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase font-display leading-none">
                      ROBELKAROSERI
                    </h1>
                    <p className="text-xs font-bold tracking-wide text-slate-800 uppercase mt-0.5">
                      PT ROBEL KAROSERI INDONESIA
                    </p>
                    <p className="text-[10px] text-slate-600 leading-snug mt-0.5">
                      Spesialisasi Pembuatan &amp; Modifikasi Karoseri Kendaraan Komersial
                    </p>
                    <p className="text-[9px] text-slate-500 leading-snug mt-0.5">
                      Kawasan Industri Karoseri Terpadu Kav. 88, Jawa Timur &bull; Telp: (031) 8988-2233 &bull; Email: finance@robelkaroseri.com
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="inline-block bg-emerald-50 border border-emerald-600 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">
                      BUKTI PEMBAYARAN RESMI
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5">Formulir: DP-KASIR-V1</span>
                  </div>
                </div>
              </div>
              <div className="border-b border-slate-900 mb-2"></div>

              {/* Judul & Nomor Kuitansi */}
              <div className="text-center my-1.5 break-inside-avoid">
                <h2 className="text-base font-bold tracking-wide text-slate-900 uppercase underline decoration-1 underline-offset-4">
                  BUKTI PENERIMAAN UANG MUKA (INVOICE DP)
                </h2>
                <div className="flex items-center justify-center gap-2 mt-0.5">
                  <span className="text-[11px] font-semibold text-slate-700">Nomor Kuitansi:</span>
                  <span className="text-[11px] font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    {receiptNumber}
                  </span>
                </div>
              </div>

              {/* Informasi Waktu & Tanggal Pembayaran */}
              <div className="flex justify-between items-center text-[10.5px] text-slate-700 bg-slate-50 border border-slate-300 rounded px-2.5 py-1 my-2 break-inside-avoid">
                <div>
                  <span className="font-semibold text-slate-600">Tanggal &amp; Waktu Pembayaran: </span>
                  <span className="font-bold text-slate-900">{dateDetails.formattedDate}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>DITERIMA / SAH</span>
                </div>
              </div>

              {/* Section 1: Data Konsumen & SPK */}
              <div className="my-2 break-inside-avoid">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-900 mb-1 flex items-center gap-1.5 border-b border-slate-300 pb-0.5">
                  <span>1. Data Konsumen &amp; Identitas Kendaraan</span>
                </div>
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="w-44 bg-slate-100 font-semibold py-1.5 px-3 border-r border-slate-300 text-slate-800">
                        Nama Pelanggan / Perusahaan
                      </td>
                      <td className="py-1.5 px-3 font-bold text-slate-900">
                        {data.customerName}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-100 font-semibold py-1.5 px-3 border-r border-slate-300 text-slate-800">
                        Nomor SPK Induk
                      </td>
                      <td className="py-1.5 px-3 font-bold font-mono text-blue-900">
                        {data.spkNo}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-100 font-semibold py-1.5 px-3 border-r border-slate-300 text-slate-800">
                        Nomor Polisi Kendaraan
                      </td>
                      <td className="py-1.5 px-3 font-bold text-slate-900">
                        <span className="inline-block bg-slate-100 border border-slate-400 px-1.5 py-0.2 rounded text-[10.5px] font-mono">
                          {data.vehiclePlate || '-'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-semibold py-1.5 px-3 border-r border-slate-300 text-slate-800">
                        Model Kendaraan / No. Rangka
                      </td>
                      <td className="py-1.5 px-3 text-slate-800">
                        {data.vehicleModel || '-'} {data.vehicleVin && data.vehicleVin !== '-' ? `(VIN: ${data.vehicleVin})` : ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 2: Rincian Pembayaran Uang Muka */}
              <div className="my-2 break-inside-avoid">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-900 mb-1 flex items-center gap-1.5 border-b border-slate-300 pb-0.5">
                  <span>2. Rincian Penerimaan Uang Muka (Down Payment)</span>
                </div>
                
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <tbody>
                    {/* Baris Total Estimasi Kontrak (Disembunyikan pada mode compact) */}
                    {!isCompactMode && (
                      <tr className="row-total-kontrak border-b border-slate-300">
                        <td className="w-56 bg-slate-100 font-semibold py-1.5 px-3 border-r border-slate-300 text-slate-800">
                          Total Estimasi Nilai Kontrak SPK
                        </td>
                        <td className="py-1.5 px-3 font-bold text-right text-slate-900">
                          {formatCurrency(totalContract)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-slate-300 bg-emerald-50">
                      <td className="bg-emerald-100 font-bold py-1.5 px-3 border-r border-slate-300 text-emerald-950">
                        Nominal Uang Muka (DP) Dibayarkan
                      </td>
                      <td className="py-1.5 px-3 font-black text-right text-sm sm:text-base text-emerald-700">
                        {formatCurrency(dpAmount)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-100 font-semibold py-1.5 px-3 border-r border-slate-300 text-slate-800">
                        Terbilang (Nominal Huruf)
                      </td>
                      <td className="py-1.5 px-3 italic font-semibold text-slate-800">
                        &ldquo;# {terbilangDp} #&rdquo;
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-100 font-semibold py-1.5 px-3 border-r border-slate-300 text-slate-800">
                        Metode Pembayaran
                      </td>
                      <td className="py-1.5 px-3 font-bold text-slate-900">
                        {data.paymentMethod || 'Transfer Bank'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-100 font-semibold py-1.5 px-3 border-r border-slate-300 text-slate-800">
                        Catatan / Referensi Bukti Transfer
                      </td>
                      <td className="py-1.5 px-3 text-slate-800 font-mono text-[10.5px]">
                        {data.notes && data.notes.trim() !== '' ? data.notes : '-'}
                      </td>
                    </tr>
                    {/* Baris Sisa Estimasi Tagihan (Disembunyikan pada mode compact) */}
                    {!isCompactMode && (
                      <tr className="row-sisa-tagihan bg-slate-50">
                        <td className="bg-slate-100 font-semibold py-1.5 px-3 border-r border-slate-300 text-slate-800">
                          Sisa Estimasi Tagihan Pelunasan
                        </td>
                        <td className="py-1.5 px-3 font-bold text-right text-rose-700">
                          {formatCurrency(remainingBill)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Syarat & Ketentuan Uang Muka (Wajib di dalam div putih) */}
              <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-700 leading-relaxed break-inside-avoid">
                <div className="font-bold text-slate-800 mb-1">Syarat &amp; Ketentuan Uang Muka (DP):</div>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Dokumen ini merupakan tanda terima sah atas pembayaran uang muka pengerjaan unit karoseri sesuai SPK <strong>{data.spkNo}</strong>.</li>
                  <li>Dengan dibayarkannya uang muka ini, status SPK dinyatakan <strong>ACTIVE</strong> dan tahapan produksi dimulai.</li>
                  <li>Sisa estimasi tagihan di atas belum memperhitungkan perubahan spesifikasi / Addendum (Change Orders) selama pengerjaan, dan wajib dilunasi saat penyelesaian unit sebelum BAST diterbitkan.</li>
                </ol>
              </div>
            </div>

            {/* Footer Tanda Tangan Kasir & Konsumen (Wajib di dalam div putih) */}
            <div className="pt-4 border-t border-slate-200 mt-auto break-inside-avoid">
              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div className="flex flex-col items-center">
                  <span className="text-slate-600 text-[11px]">Kasir Penerima Pembayaran,</span>
                  <div className="h-14"></div>
                  <span className="font-semibold border-t border-slate-400 pt-1 w-48 text-slate-900">
                    {data.cashierName || 'Kasir Keuangan Bengkel'}
                  </span>
                  <span className="text-[10px] text-slate-500">Tercatat di Sistem Finansial</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-slate-600 text-[11px]">Pihak Penyetor (Konsumen),</span>
                  <div className="h-14"></div>
                  <span className="font-semibold border-t border-slate-400 pt-1 w-48 text-slate-900">
                    {data.customerName || 'Pelanggan'}
                  </span>
                  <span className="text-[10px] text-slate-500">Nama Terang &amp; Tanda Tangan</span>
                </div>
              </div>
              <div className="mt-4 pt-2 text-[9px] text-slate-400 flex justify-between border-t border-slate-100">
                <span>* Kuitansi ini dicetak otomatis dari Sistem Kasir RobelKaroseri dan berlaku sah sebagai bukti setor asli.</span>
                <span>Tercetak: {dateDetails.timestamp}</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Embedded CSS for Exact A4 Single Page Print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }

          #printable-dp-receipt,
          #printable-dp-receipt *,
          #dp-receipt-print-area,
          #dp-receipt-print-area * {
            visibility: visible;
          }

          #printable-dp-receipt,
          #dp-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 10mm 12mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      ` }} />
    </div>,
    printRoot
  );
};
