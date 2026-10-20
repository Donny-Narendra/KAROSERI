import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Receipt, CheckCircle, Download, Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { terbilang } from '../../utils/terbilang';
import { formatCurrency } from '../../utils/invoiceExport';

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
}) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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

  const handleDownloadPdf = async () => {
    const element = document.getElementById('dp-receipt-print-area');
    if (!element) {
      console.error('Target elemen kuitansi DP tidak ditemukan di DOM');
      return;
    }

    try {
      setIsDownloadingPdf(true);
      const safeSpk = data.spkNo.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Kuitansi-DP-${safeSpk}.pdf`;

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      };

      const html2pdfWorker = ((html2pdf as any).default || html2pdf) as typeof html2pdf;
      await html2pdfWorker().set(opt).from(element).save();
    } catch (err) {
      console.error('Gagal mengunduh dokumen kuitansi DP:', err);
    } finally {
      if (typeof document !== 'undefined') {
        document.querySelectorAll('.html2pdf__overlay').forEach(el => el.remove());
      }
      setIsDownloadingPdf(false);
    }
  };

  const printRoot = typeof document !== 'undefined'
    ? (document.getElementById('print-root') || document.body)
    : null;

  if (!printRoot) return null;

  return createPortal(
    <div
      id="dp-receipt-modal-backdrop"
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto print:static print:inset-auto print:z-auto print:p-0 print:m-0 print:bg-transparent print:overflow-visible print:block"
    >
      <div className="relative w-full max-w-4xl bg-surface border border-surface-border rounded-xl shadow-2xl flex flex-col my-auto overflow-hidden print:static print:w-full print:max-w-none print:border-none print:shadow-none print:rounded-none print:bg-transparent print:overflow-visible print:m-0 print:p-0 print:block">
        
        {/* Modal Toolbar (Screen Only) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 bg-surface-hover/80 border-b border-surface-border text-text">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">
                Pratinjau Kuitansi Pembayaran Uang Muka (Invoice DP)
              </h2>
              <p className="text-xs text-text-muted">
                {receiptNumber} &bull; Dokumen Sah &bull; Siap Cetak A4
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            {/* Tombol Unduh PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="no-print px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-md shadow-emerald-900/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Unduh langsung kuitansi DP dalam format PDF"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloadingPdf ? 'Mengunduh...' : 'Download PDF'}</span>
            </button>

            {/* Tombol Cetak Kuitansi */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isDownloadingPdf}
              className="no-print px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-hover/90 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-md shadow-primary/25 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Cetak Kuitansi Pembayaran DP"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kuitansi</span>
            </button>

            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={onClose}
              disabled={isDownloadingPdf}
              className="no-print p-2 text-text-muted hover:text-text hover:bg-surface-active rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container for Preview on Screen */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto max-h-[82vh] bg-surface/50 print:static print:p-0 print:overflow-visible print:max-h-none print:bg-transparent print:m-0 print:block flex justify-center">
          
          {/* Printable A4 Document Sheet */}
          <div
            id="dp-receipt-print-area"
            data-id="printable-dp-receipt"
            className="dp-receipt-sheet w-full max-w-[210mm] bg-white text-gray-900 p-8 sm:p-10 shadow-lg border border-gray-200 rounded-sm font-sans flex flex-col justify-between print:w-full print:max-w-none print:min-h-0 print:h-auto print:p-0 print:shadow-none print:border-none print:rounded-none"
          >
            <div>
              {/* Kop Surat RobelKaroseri */}
              <div className="border-b-2 border-black pb-2 mb-1 break-inside-avoid">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black uppercase font-display leading-none">
                      ROBELKAROSERI
                    </h1>
                    <p className="text-xs sm:text-sm font-bold tracking-wide text-gray-800 uppercase mt-0.5">
                      PT ROBEL KAROSERI INDONESIA
                    </p>
                    <p className="text-[10.5px] text-gray-600 leading-snug mt-0.5">
                      Spesialisasi Pembuatan &amp; Modifikasi Karoseri Kendaraan Komersial
                    </p>
                    <p className="text-[9.5px] text-gray-500 leading-snug mt-0.5">
                      Kawasan Industri Karoseri Terpadu Kav. 88, Jawa Timur &bull; Telp: (031) 8988-2233 &bull; Email: finance@robelkaroseri.com
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="inline-block bg-emerald-50 border border-emerald-600 text-emerald-800 px-2 py-0.5 rounded text-[9.5px] font-bold tracking-wider uppercase">
                      BUKTI PEMBAYARAN RESMI
                    </span>
                    <span className="text-[9.5px] text-gray-500 mt-1">Formulir: DP-KASIR-V1</span>
                  </div>
                </div>
              </div>
              <div className="border-b border-black mb-3"></div>

              {/* Judul & Nomor Kuitansi */}
              <div className="text-center my-2 break-inside-avoid">
                <h2 className="text-base sm:text-lg font-bold tracking-wide text-black uppercase underline decoration-1 underline-offset-4">
                  BUKTI PENERIMAAN UANG MUKA (INVOICE DP)
                </h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-gray-700">Nomor Kuitansi:</span>
                  <span className="text-xs font-bold font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                    {receiptNumber}
                  </span>
                </div>
              </div>

              {/* Informasi Waktu & Tanggal Pembayaran */}
              <div className="flex justify-between items-center text-[11px] text-gray-700 bg-gray-50 border border-gray-300 rounded px-3 py-1.5 my-3 break-inside-avoid">
                <div>
                  <span className="font-semibold text-gray-600">Tanggal &amp; Waktu Pembayaran: </span>
                  <span className="font-bold text-gray-900">{dateDetails.formattedDate}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>DITERIMA / SAH</span>
                </div>
              </div>

              {/* Section 1: Data Konsumen & SPK */}
              <div className="my-3 break-inside-avoid">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-900 mb-1 flex items-center gap-1.5 border-b border-gray-300 pb-1">
                  <span>1. Data Konsumen &amp; Identitas Kendaraan</span>
                </div>
                <table className="w-full border-collapse border border-gray-300 text-[11px]">
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="w-44 bg-gray-100 font-semibold px-3 py-1.5 border-r border-gray-300 text-gray-800">
                        Nama Pelanggan / Perusahaan
                      </td>
                      <td className="px-3 py-1.5 font-bold text-gray-900">
                        {data.customerName}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="bg-gray-100 font-semibold px-3 py-1.5 border-r border-gray-300 text-gray-800">
                        Nomor SPK Induk
                      </td>
                      <td className="px-3 py-1.5 font-bold font-mono text-primary-900">
                        {data.spkNo}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="bg-gray-100 font-semibold px-3 py-1.5 border-r border-gray-300 text-gray-800">
                        Nomor Polisi Kendaraan
                      </td>
                      <td className="px-3 py-1.5 font-bold text-gray-900">
                        <span className="inline-block bg-gray-100 border border-gray-400 px-2 py-0.5 rounded text-[10.5px] font-mono">
                          {data.vehiclePlate || '-'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-gray-100 font-semibold px-3 py-1.5 border-r border-gray-300 text-gray-800">
                        Model Kendaraan / No. Rangka
                      </td>
                      <td className="px-3 py-1.5 text-gray-800">
                        {data.vehicleModel || '-'} {data.vehicleVin && data.vehicleVin !== '-' ? `(VIN: ${data.vehicleVin})` : ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 2: Rincian Pembayaran Uang Muka */}
              <div className="my-3 break-inside-avoid">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-900 mb-1 flex items-center gap-1.5 border-b border-gray-300 pb-1">
                  <span>2. Rincian Penerimaan Uang Muka (Down Payment)</span>
                </div>
                
                <table className="w-full border-collapse border border-gray-300 text-[11.5px]">
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="w-56 bg-gray-100 font-semibold px-3 py-1.5 border-r border-gray-300 text-gray-800">
                        Total Estimasi Nilai Kontrak SPK
                      </td>
                      <td className="px-3 py-1.5 font-bold text-right text-gray-900">
                        {formatCurrency(totalContract)}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300 bg-emerald-50/70">
                      <td className="bg-emerald-100/70 font-bold px-3 py-2 border-r border-gray-300 text-emerald-950">
                        Nominal Uang Muka (DP) Dibayarkan
                      </td>
                      <td className="px-3 py-2 font-black text-right text-base text-emerald-700">
                        {formatCurrency(dpAmount)}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="bg-gray-100 font-semibold px-3 py-1.5 border-r border-gray-300 text-gray-800">
                        Terbilang (Nominal Huruf)
                      </td>
                      <td className="px-3 py-1.5 italic font-semibold text-gray-800">
                        &ldquo;# {terbilangDp} #&rdquo;
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="bg-gray-100 font-semibold px-3 py-1.5 border-r border-gray-300 text-gray-800">
                        Metode Pembayaran
                      </td>
                      <td className="px-3 py-1.5 font-bold text-gray-900">
                        {data.paymentMethod || 'Transfer Bank'}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="bg-gray-100 font-semibold px-3 py-1.5 border-r border-gray-300 text-gray-800">
                        Catatan / Referensi Bukti Transfer
                      </td>
                      <td className="px-3 py-1.5 text-gray-800 font-mono text-[11px]">
                        {data.notes && data.notes.trim() !== '' ? data.notes : '-'}
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="bg-gray-100 font-semibold px-3 py-1.5 border-r border-gray-300 text-gray-800">
                        Sisa Estimasi Tagihan Pelunasan
                      </td>
                      <td className="px-3 py-1.5 font-bold text-right text-rose-700">
                        {formatCurrency(remainingBill)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Syarat & Ketentuan Uang Muka */}
              <div className="my-3 p-2.5 bg-gray-50 border border-gray-300 rounded text-[10px] text-gray-700 leading-relaxed break-inside-avoid">
                <span className="font-bold text-gray-900 block mb-0.5">Syarat &amp; Ketentuan Uang Muka (DP):</span>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Dokumen ini merupakan tanda terima sah atas pembayaran uang muka pengerjaan unit karoseri sesuai SPK <strong>{data.spkNo}</strong>.</li>
                  <li>Dengan dibayarkannya uang muka ini, status SPK dinyatakan <strong>ACTIVE</strong> dan tahapan produksi dimulai.</li>
                  <li>Sisa estimasi tagihan di atas belum memperhitungkan perubahan spesifikasi / Addendum (Change Orders) selama pengerjaan, dan wajib dilunasi saat penyelesaian unit sebelum BAST diterbitkan.</li>
                </ol>
              </div>

              {/* Kolom Pengesahan Tanda Tangan */}
              <div className="my-4 pt-1 break-inside-avoid">
                <div className="grid grid-cols-2 gap-8 text-center text-[11px]">
                  
                  {/* Kolom 1: Kasir Penerima */}
                  <div className="flex flex-col justify-between h-28 border border-dashed border-gray-300 p-2.5 rounded">
                    <div>
                      <p className="font-semibold text-gray-700 text-[10.5px]">Kasir Penerima Pembayaran,</p>
                      <p className="font-bold text-gray-900 text-[11px]">PT Robel Karoseri Indonesia</p>
                    </div>
                    <div>
                      <div className="w-36 mx-auto border-b border-gray-800 mb-1"></div>
                      <p className="text-[10px] text-gray-700 font-medium">
                        {data.cashierName || 'Kasir Keuangan Bengkel'}
                      </p>
                      <p className="text-[9px] text-gray-500">Tercatat di Sistem Finansial</p>
                    </div>
                  </div>

                  {/* Kolom 2: Penyetor / Konsumen */}
                  <div className="flex flex-col justify-between h-28 border border-dashed border-gray-300 p-2.5 rounded">
                    <div>
                      <p className="font-semibold text-gray-700 text-[10.5px]">Pihak Penyetor (Konsumen),</p>
                      <p className="font-bold text-gray-900 text-[11px] truncate px-2">{data.customerName}</p>
                    </div>
                    <div>
                      <div className="w-36 mx-auto border-b border-gray-800 mb-1"></div>
                      <p className="text-[10px] text-gray-700 font-medium">Nama Terang &amp; Tanda Tangan</p>
                      <p className="text-[9px] text-gray-500">Pelanggan / Kuasa Pembayaran</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Catatan Kaki Legal */}
            <div className="pt-2 border-t border-gray-300 text-[9px] text-gray-500 flex justify-between items-center mt-3 break-inside-avoid">
              <span>* Kuitansi ini dicetak otomatis dari Sistem Kasir RobelKaroseri dan berlaku sah sebagai bukti setor asli.</span>
              <span className="font-mono">Tercetak: {dateDetails.timestamp}</span>
            </div>

          </div>
        </div>

      </div>

      {/* Embedded CSS for Exact A4 Print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body > *:not(#print-root) {
            display: none !important;
          }

          .no-print {
            display: none !important;
          }

          #print-root {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }

          #dp-receipt-modal-backdrop,
          #dp-receipt-modal-backdrop > div,
          #dp-receipt-modal-backdrop > div > div {
            display: block !important;
            position: static !important;
            inset: auto !important;
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            overflow: visible !important;
          }

          #dp-receipt-print-area,
          [data-id="printable-dp-receipt"] {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 8mm 12mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          #dp-receipt-print-area *,
          [data-id="printable-dp-receipt"] * {
            visibility: visible !important;
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
