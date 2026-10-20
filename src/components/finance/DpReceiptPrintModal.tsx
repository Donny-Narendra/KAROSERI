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
    const element = document.getElementById('printable-dp-receipt') || document.getElementById('dp-receipt-print-area');
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
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 md:p-6 overflow-hidden print:static print:inset-auto print:z-auto print:p-0 print:m-0 print:bg-transparent print:overflow-visible print:block"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden print:static print:w-full print:max-w-none print:border-none print:shadow-none print:rounded-none print:bg-transparent print:overflow-visible print:m-0 print:p-0 print:block">
        
        {/* Sticky Header: Judul modal & Tombol Aksi */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight text-white">
                Pratinjau Kuitansi Pembayaran Uang Muka (Invoice DP)
              </h2>
              <p className="text-xs text-slate-400">
                {receiptNumber} &bull; Dokumen Sah &bull; Siap Cetak A4
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
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
              className="no-print p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950/60 flex justify-center print:static print:p-0 print:overflow-visible print:max-h-none print:bg-transparent print:m-0 print:block">
          
          {/* Printable A4 Document Sheet */}
          <div
            id="printable-dp-receipt"
            data-id="printable-dp-receipt"
            className="dp-receipt-sheet bg-white text-slate-900 w-full max-w-[210mm] p-6 md:p-8 rounded-sm shadow-md text-xs leading-relaxed flex flex-col justify-between print:w-full print:max-w-none print:min-h-0 print:h-auto print:p-0 print:shadow-none print:border-none print:rounded-none"
          >
            <div>
              {/* Kop Surat RobelKaroseri */}
              <div className="border-b-2 border-black pb-1.5 mb-1 break-inside-avoid">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-black uppercase font-display leading-none">
                      ROBELKAROSERI
                    </h1>
                    <p className="text-xs font-bold tracking-wide text-gray-800 uppercase mt-0.5">
                      PT ROBEL KAROSERI INDONESIA
                    </p>
                    <p className="text-[10px] text-gray-600 leading-snug mt-0.5">
                      Spesialisasi Pembuatan &amp; Modifikasi Karoseri Kendaraan Komersial
                    </p>
                    <p className="text-[9px] text-gray-500 leading-snug mt-0.5">
                      Kawasan Industri Karoseri Terpadu Kav. 88, Jawa Timur &bull; Telp: (031) 8988-2233 &bull; Email: finance@robelkaroseri.com
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="inline-block bg-emerald-50 border border-emerald-600 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">
                      BUKTI PEMBAYARAN RESMI
                    </span>
                    <span className="text-[9px] text-gray-500 mt-0.5">Formulir: DP-KASIR-V1</span>
                  </div>
                </div>
              </div>
              <div className="border-b border-black mb-2"></div>

              {/* Judul & Nomor Kuitansi */}
              <div className="text-center my-1.5 break-inside-avoid">
                <h2 className="text-base font-bold tracking-wide text-black uppercase underline decoration-1 underline-offset-4">
                  BUKTI PENERIMAAN UANG MUKA (INVOICE DP)
                </h2>
                <div className="flex items-center justify-center gap-2 mt-0.5">
                  <span className="text-[11px] font-semibold text-gray-700">Nomor Kuitansi:</span>
                  <span className="text-[11px] font-bold font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                    {receiptNumber}
                  </span>
                </div>
              </div>

              {/* Informasi Waktu & Tanggal Pembayaran */}
              <div className="flex justify-between items-center text-[10.5px] text-gray-700 bg-gray-50 border border-gray-300 rounded px-2.5 py-1 my-2 break-inside-avoid">
                <div>
                  <span className="font-semibold text-gray-600">Tanggal &amp; Waktu Pembayaran: </span>
                  <span className="font-bold text-gray-900">{dateDetails.formattedDate}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>DITERIMA / SAH</span>
                </div>
              </div>

              {/* Section 1: Data Konsumen & SPK */}
              <div className="my-2 break-inside-avoid">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-900 mb-1 flex items-center gap-1.5 border-b border-gray-300 pb-0.5">
                  <span>1. Data Konsumen &amp; Identitas Kendaraan</span>
                </div>
                <table className="w-full border-collapse border border-gray-300 text-[11px]">
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="w-44 bg-gray-100 font-semibold py-1.5 px-2.5 border-r border-gray-300 text-gray-800">
                        Nama Pelanggan / Perusahaan
                      </td>
                      <td className="py-1.5 px-2.5 font-bold text-gray-900">
                        {data.customerName}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="bg-gray-100 font-semibold py-1.5 px-2.5 border-r border-gray-300 text-gray-800">
                        Nomor SPK Induk
                      </td>
                      <td className="py-1.5 px-2.5 font-bold font-mono text-primary-900">
                        {data.spkNo}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="bg-gray-100 font-semibold py-1.5 px-2.5 border-r border-gray-300 text-gray-800">
                        Nomor Polisi Kendaraan
                      </td>
                      <td className="py-1.5 px-2.5 font-bold text-gray-900">
                        <span className="inline-block bg-gray-100 border border-gray-400 px-1.5 py-0.2 rounded text-[10.5px] font-mono">
                          {data.vehiclePlate || '-'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-gray-100 font-semibold py-1.5 px-2.5 border-r border-gray-300 text-gray-800">
                        Model Kendaraan / No. Rangka
                      </td>
                      <td className="py-1.5 px-2.5 text-gray-800">
                        {data.vehicleModel || '-'} {data.vehicleVin && data.vehicleVin !== '-' ? `(VIN: ${data.vehicleVin})` : ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 2: Rincian Pembayaran Uang Muka */}
              <div className="my-2 break-inside-avoid">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-900 mb-1 flex items-center gap-1.5 border-b border-gray-300 pb-0.5">
                  <span>2. Rincian Penerimaan Uang Muka (Down Payment)</span>
                </div>
                
                <table className="w-full border-collapse border border-gray-300 text-[11px]">
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="w-56 bg-gray-100 font-semibold py-1.5 px-2.5 border-r border-gray-300 text-gray-800">
                        Total Estimasi Nilai Kontrak SPK
                      </td>
                      <td className="py-1.5 px-2.5 font-bold text-right text-gray-900">
                        {formatCurrency(totalContract)}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300 bg-emerald-50/70">
                      <td className="bg-emerald-100/70 font-bold py-1.5 px-2.5 border-r border-gray-300 text-emerald-950">
                        Nominal Uang Muka (DP) Dibayarkan
                      </td>
                      <td className="py-1.5 px-2.5 font-black text-right text-sm sm:text-base text-emerald-700">
                        {formatCurrency(dpAmount)}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="bg-gray-100 font-semibold py-1.5 px-2.5 border-r border-gray-300 text-gray-800">
                        Terbilang (Nominal Huruf)
                      </td>
                      <td className="py-1.5 px-2.5 italic font-semibold text-gray-800">
                        &ldquo;# {terbilangDp} #&rdquo;
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="bg-gray-100 font-semibold py-1.5 px-2.5 border-r border-gray-300 text-gray-800">
                        Metode Pembayaran
                      </td>
                      <td className="py-1.5 px-2.5 font-bold text-gray-900">
                        {data.paymentMethod || 'Transfer Bank'}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="bg-gray-100 font-semibold py-1.5 px-2.5 border-r border-gray-300 text-gray-800">
                        Catatan / Referensi Bukti Transfer
                      </td>
                      <td className="py-1.5 px-2.5 text-gray-800 font-mono text-[10.5px]">
                        {data.notes && data.notes.trim() !== '' ? data.notes : '-'}
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="bg-gray-100 font-semibold py-1.5 px-2.5 border-r border-gray-300 text-gray-800">
                        Sisa Estimasi Tagihan Pelunasan
                      </td>
                      <td className="py-1.5 px-2.5 font-bold text-right text-rose-700">
                        {formatCurrency(remainingBill)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Syarat & Ketentuan Uang Muka */}
              <div className="my-2.5 p-2.5 bg-gray-50 border border-gray-300 rounded text-[10px] text-gray-700 leading-tight break-inside-avoid">
                <span className="font-bold text-gray-900 block mb-0.5">Syarat &amp; Ketentuan Uang Muka (DP):</span>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Dokumen ini merupakan tanda terima sah atas pembayaran uang muka pengerjaan unit karoseri sesuai SPK <strong>{data.spkNo}</strong>.</li>
                  <li>Dengan dibayarkannya uang muka ini, status SPK dinyatakan <strong>ACTIVE</strong> dan tahapan produksi dimulai.</li>
                  <li>Sisa estimasi tagihan di atas belum memperhitungkan perubahan spesifikasi / Addendum (Change Orders) selama pengerjaan, dan wajib dilunasi saat penyelesaian unit sebelum BAST diterbitkan.</li>
                </ol>
              </div>

              {/* Kolom Pengesahan Tanda Tangan */}
              <div className="my-2.5 pt-0.5 break-inside-avoid">
                <div className="grid grid-cols-2 gap-6 text-center text-[10.5px]">
                  
                  {/* Kolom 1: Kasir Penerima */}
                  <div className="flex flex-col justify-between h-14 border border-dashed border-gray-300 p-1.5 rounded">
                    <div>
                      <p className="font-semibold text-gray-700 text-[10px] leading-none">Kasir Penerima Pembayaran,</p>
                      <p className="font-bold text-gray-900 text-[10.5px] leading-tight mt-0.5">PT Robel Karoseri Indonesia</p>
                    </div>
                    <div>
                      <div className="w-32 mx-auto border-b border-gray-800 mb-0.5"></div>
                      <p className="text-[9.5px] text-gray-700 font-medium leading-none">
                        {data.cashierName || 'Kasir Keuangan Bengkel'}
                      </p>
                      <p className="text-[8.5px] text-gray-500 leading-none mt-0.5">Tercatat di Sistem Finansial</p>
                    </div>
                  </div>

                  {/* Kolom 2: Penyetor / Konsumen */}
                  <div className="flex flex-col justify-between h-14 border border-dashed border-gray-300 p-1.5 rounded">
                    <div>
                      <p className="font-semibold text-gray-700 text-[10px] leading-none">Pihak Penyetor (Konsumen),</p>
                      <p className="font-bold text-gray-900 text-[10.5px] leading-tight mt-0.5 truncate px-1">{data.customerName}</p>
                    </div>
                    <div>
                      <div className="w-32 mx-auto border-b border-gray-800 mb-0.5"></div>
                      <p className="text-[9.5px] text-gray-700 font-medium leading-none">Nama Terang &amp; Tanda Tangan</p>
                      <p className="text-[8.5px] text-gray-500 leading-none mt-0.5">Pelanggan / Kuasa Pembayaran</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Catatan Kaki Legal */}
            <div className="pt-1.5 border-t border-gray-300 text-[8.5px] text-gray-500 flex justify-between items-center mt-2 break-inside-avoid">
              <span>* Kuitansi ini dicetak otomatis dari Sistem Kasir RobelKaroseri dan berlaku sah sebagai bukti setor asli.</span>
              <span className="font-mono">Tercetak: {dateDetails.timestamp}</span>
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
            margin: 0 !important;
            padding: 12mm 15mm !important;
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
