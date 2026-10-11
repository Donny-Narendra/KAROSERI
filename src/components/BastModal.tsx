import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, CheckCircle, ShieldCheck, FileCheck, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface BastSpkData {
  id?: string;
  spk_no?: string;
  dbId?: string;
  customer_name?: string;
  customerName?: string;
  vehicle_plate?: string;
  vehiclePlate?: string;
  vehicle_vin?: string;
  vehicleVin?: string;
  vin?: string;
  vehicle_engine?: string;
  vehicleEngine?: string;
  status?: string;
  qc_status?: string;
  qcStatus?: string;
  payment_status?: string;
  paymentStatus?: string;
  created_at?: string;
}

interface BastModalProps {
  isOpen: boolean;
  onClose: () => void;
  spk: BastSpkData | null;
  autoPrint?: boolean;
}

const formatBastDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const dayName = dayNames[date.getDay()];
  const dayNum = date.getDate();
  const monthName = monthNames[date.getMonth()];
  const dateStr = `${dayName}, ${dayNum} ${monthName} ${y}`;
  const timeStr = `${date.toLocaleDateString('id-ID')} ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  return {
    dateFormatted: dateStr,
    timestampStr: timeStr,
    year: y,
    month: m
  };
};

export const BastModal: React.FC<BastModalProps> = ({
  isOpen,
  onClose,
  spk,
  autoPrint = false,
}) => {
  const [dateInfo] = useState(() => formatBastDate(new Date()));
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  if (!isOpen || !spk) return null;

  const { dateFormatted, timestampStr, year, month } = dateInfo;

  const spkNo = spk.spk_no || spk.id || 'SPK-9846';
  const customerName = spk.customer_name || spk.customerName || 'PT WARA-WIRI';
  const vehiclePlate = spk.vehicle_plate || spk.vehiclePlate || 'B 1234 WWR';
  const vehicleVin = spk.vehicle_vin || spk.vehicleVin || spk.vin || 'MHFC1234567890';
  const vehicleEngine = spk.vehicle_engine || spk.vehicleEngine || 'ENG-987654321';
  const bastNumber = `BAST/${spkNo}/${year}/${month}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('printable-bast');
    if (!element) return;

    try {
      setIsDownloadingPdf(true);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png', 1.0);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfPageWidth = 210;
      const pdfPageHeight = 297;
      const contentHeight = (canvas.height * pdfPageWidth) / canvas.width;

      if (contentHeight > pdfPageHeight) {
        const scaleRatio = pdfPageHeight / contentHeight;
        const scaledWidth = pdfPageWidth * scaleRatio;
        const offsetX = (pdfPageWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'PNG', offsetX, 0, scaledWidth, pdfPageHeight, undefined, 'FAST');
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfPageWidth, contentHeight, undefined, 'FAST');
      }

      const safeSpkNo = spkNo.replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`BAST-${safeSpkNo}.pdf`);
    } catch (err) {
      console.error('Gagal mengunduh dokumen BAST sebagai PDF:', err);
      alert('Terjadi kesalahan saat memproses unduhan PDF. Silakan gunakan opsi Cetak Dokumen.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const printRoot = typeof document !== 'undefined'
    ? (document.getElementById('print-root') || document.body)
    : null;

  if (!printRoot) return null;

  return createPortal(
    <div 
      id="bast-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto print:static print:inset-auto print:z-auto print:p-0 print:m-0 print:bg-transparent print:overflow-visible print:block"
    >
      <div className="relative w-full max-w-4xl bg-surface border border-surface-border rounded-xl shadow-2xl flex flex-col my-auto overflow-hidden print:static print:w-full print:max-w-none print:border-none print:shadow-none print:rounded-none print:bg-transparent print:overflow-visible print:m-0 print:p-0 print:block">
        
        {/* Modal Toolbar (Screen Only) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 bg-surface-hover/80 border-b border-surface-border text-text">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">
                Pratinjau Berita Acara Serah Terima (BAST)
              </h2>
              <p className="text-xs text-text-muted">
                {bastNumber} &bull; Siap Cetak A4 &bull; Unit Siap Serah Terima
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            {/* Tombol 1: Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="no-print px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-md shadow-emerald-900/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Unduh langsung dokumen BAST dalam format file .pdf"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloadingPdf ? 'Mengunduh...' : 'Download PDF'}</span>
            </button>

            {/* Tombol 2: Cetak Dokumen */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isDownloadingPdf}
              className="no-print px-3.5 py-2 bg-primary hover:bg-primary-hover active:bg-primary-hover/90 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-md shadow-primary/25 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Buka dialog print browser untuk mencetak fisik atau simpan PDF standar"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen</span>
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
            id="printable-bast" 
            className="bast-document-sheet w-full max-w-[210mm] min-h-[290mm] bg-white text-gray-900 p-8 sm:p-10 shadow-lg border border-gray-200 rounded-sm font-sans flex flex-col justify-between print:w-full print:max-w-none print:min-h-0 print:h-auto print:p-0 print:shadow-none print:border-none print:rounded-none"
          >
            <div>
              {/* Kop Surat RobelKaroseri */}
              <div className="border-b-2 border-black pb-1.5 mb-0.5 break-inside-avoid">
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
                      Kawasan Industri Karoseri Terpadu Kav. 88, Jawa Timur &bull; Telp: (031) 8988-2233 &bull; Email: admin@robelkaroseri.com
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="inline-block border border-gray-800 text-gray-900 px-2 py-0.5 rounded text-[9.5px] font-bold tracking-wider uppercase">
                      DOKUMEN RESMI
                    </span>
                    <span className="text-[9.5px] text-gray-500 mt-1">Formulir: BAST-KAR-V2</span>
                  </div>
                </div>
              </div>
              <div className="border-b border-black mb-2"></div>

              {/* Judul & Nomor Surat */}
              <div className="text-center my-2 break-inside-avoid">
                <h2 className="text-base sm:text-lg font-bold tracking-wide text-black uppercase underline decoration-1 underline-offset-4">
                  BERITA ACARA SERAH TERIMA KENDARAAN (BAST)
                </h2>
                <p className="text-xs font-semibold text-gray-700 tracking-wider mt-0.5">
                  Nomor: <span className="font-mono text-gray-900">{bastNumber}</span>
                </p>
              </div>

              {/* Paragraf Pembuka / Pernyataan Serah Terima */}
              <div className="text-[11px] text-gray-800 leading-relaxed text-justify mb-2.5 break-inside-avoid">
                <p>
                  Pada hari ini, <strong>{dateFormatted}</strong>, bertempat di workshop RobelKaroseri, telah dilaksanakan serah terima fisik unit kendaraan dan dokumen pendukung oleh dan antara pihak-pihak di bawah ini:
                </p>
                <div className="my-1.5 pl-2.5 space-y-0.5 text-[10.5px]">
                  <div className="grid grid-cols-[130px_10px_1fr]">
                    <span className="font-semibold text-gray-700">1. Pihak Pertama</span>
                    <span>:</span>
                    <span className="font-bold text-gray-900">RobelKaroseri (Divisi Kasir / Operasional Penyerahan)</span>
                  </div>
                  <div className="grid grid-cols-[130px_10px_1fr]">
                    <span className="font-semibold text-gray-700">2. Pihak Kedua</span>
                    <span>:</span>
                    <span className="font-bold text-gray-900">{customerName} (Pemilik / Kuasa Pemilik Kendaraan)</span>
                  </div>
                </div>
                <p>
                  Pihak Pertama telah menyelesaikan seluruh pengerjaan karoseri/modifikasi kendaraan sesuai dengan Surat Perintah Kerja (SPK) nomor <strong>{spkNo}</strong>, dan dengan ini menyerahkan 1 (satu) unit kendaraan tersebut kepada Pihak Kedua dalam kondisi baik, lengkap, laik jalan, dan telah memenuhi standar spesifikasi yang disepakati.
                </p>
              </div>

              {/* Tabel Spesifikasi Kendaraan */}
              <div className="my-2.5 break-inside-avoid">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-900 mb-1 flex items-center gap-1.5">
                  <span>A. Spesifikasi &amp; Identitas Kendaraan</span>
                </div>
                <table className="w-full border-collapse border border-gray-800 text-[11px]">
                  <tbody>
                    <tr className="border-b border-gray-800">
                      <td className="w-40 bg-gray-100 font-semibold px-2.5 py-1 border-r border-gray-800 text-gray-800">
                        Nomor SPK Induk
                      </td>
                      <td className="px-2.5 py-1 font-bold font-mono text-gray-900">
                        {spkNo}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="bg-gray-100 font-semibold px-2.5 py-1 border-r border-gray-800 text-gray-800">
                        Nama Pelanggan / Perusahaan
                      </td>
                      <td className="px-2.5 py-1 font-bold text-gray-900">
                        {customerName}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="bg-gray-100 font-semibold px-2.5 py-1 border-r border-gray-800 text-gray-800">
                        Nomor Polisi Kendaraan
                      </td>
                      <td className="px-2.5 py-1 font-bold text-gray-900">
                        <span className="inline-block bg-gray-100 border border-gray-400 px-1.5 py-0.2 rounded text-[10.5px] font-mono">
                          {vehiclePlate}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="bg-gray-100 font-semibold px-2.5 py-1 border-r border-gray-800 text-gray-800">
                        Nomor Rangka (VIN)
                      </td>
                      <td className="px-2.5 py-1 font-mono text-gray-900">
                        {vehicleVin}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="bg-gray-100 font-semibold px-2.5 py-1 border-r border-gray-800 text-gray-800">
                        Nomor Mesin
                      </td>
                      <td className="px-2.5 py-1 font-mono text-gray-900">
                        {vehicleEngine}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-gray-100 font-semibold px-2.5 py-1 border-r border-gray-800 text-gray-800">
                        Tanggal Penyerahan Unit
                      </td>
                      <td className="px-2.5 py-1 text-gray-900">
                        {dateFormatted}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status Pengujian & Keuangan */}
              <div className="my-2.5 break-inside-avoid">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-900 mb-1 flex items-center gap-1.5">
                  <span>B. Pernyataan Kelayakan &amp; Administrasi Keuangan</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-[10.5px]">
                  
                  {/* Box QC */}
                  <div className="border border-gray-800 rounded p-2 bg-gray-50/60">
                    <div className="flex items-center justify-between pb-1 border-b border-gray-300">
                      <span className="font-bold text-gray-900 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-700" />
                        Uji Inspeksi Akhir (Final QC)
                      </span>
                      <span className="bg-green-100 border border-green-800 text-green-900 font-bold px-1.5 py-0.2 rounded text-[9.5px]">
                        LULUS (PASSED)
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1 leading-snug text-[10px]">
                      Unit kendaraan telah melalui seluruh pemeriksaan checklist kelaikan akhir (struktur, kelistrikan, dan finishing) serta dinyatakan lulus uji inspeksi QC.
                    </p>
                  </div>

                  {/* Box Keuangan */}
                  <div className="border border-gray-800 rounded p-2 bg-gray-50/60">
                    <div className="flex items-center justify-between pb-1 border-b border-gray-300">
                      <span className="font-bold text-gray-900 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-green-700" />
                        Penyelesaian Pembayaran
                      </span>
                      <span className="bg-green-100 border border-green-800 text-green-900 font-bold px-1.5 py-0.2 rounded text-[9.5px]">
                        LUNAS (PAID)
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1 leading-snug text-[10px]">
                      Seluruh kewajiban pembayaran invoice akhir dan uang muka (DP) telah diterima secara penuh dan diverifikasi lunas oleh Bagian Kasir.
                    </p>
                  </div>

                </div>
              </div>

              {/* Kolom Pengesahan Tanda Tangan */}
              <div className="my-3 pt-0.5 break-inside-avoid">
                <p className="text-[10px] text-gray-700 text-center mb-2">
                  Demikian Berita Acara Serah Terima ini dibuat dengan sebenarnya dan ditandatangani oleh para pihak untuk dipergunakan sebagaimana mestinya.
                </p>
                <div className="grid grid-cols-3 gap-3 text-center text-[10.5px]">
                  
                  {/* Kolom 1: Kasir */}
                  <div className="flex flex-col justify-between h-24 border border-dashed border-gray-300 p-2 rounded">
                    <div>
                      <p className="font-semibold text-gray-700 text-[10.5px]">Yang Menyerahkan,</p>
                      <p className="font-bold text-gray-900 text-[10.5px]">RobelKaroseri</p>
                    </div>
                    <div>
                      <div className="w-32 mx-auto border-b border-gray-800 mb-0.5"></div>
                      <p className="text-[9.5px] text-gray-600 font-medium">Kasir / Administrasi Bengkel</p>
                    </div>
                  </div>

                  {/* Kolom 2: Mandor / Kepala Bengkel */}
                  <div className="flex flex-col justify-between h-24 border border-dashed border-gray-300 p-2 rounded">
                    <div>
                      <p className="font-semibold text-gray-700 text-[10.5px]">Mengetahui,</p>
                      <p className="font-bold text-gray-900 text-[10.5px]">Kepala Bengkel / QC</p>
                    </div>
                    <div>
                      <div className="w-32 mx-auto border-b border-gray-800 mb-0.5"></div>
                      <p className="text-[9.5px] text-gray-600 font-medium">Mandor / Inspector QC</p>
                    </div>
                  </div>

                  {/* Kolom 3: Pelanggan */}
                  <div className="flex flex-col justify-between h-24 border border-dashed border-gray-300 p-2 rounded">
                    <div>
                      <p className="font-semibold text-gray-700 text-[10.5px]">Yang Menerima,</p>
                      <p className="font-bold text-gray-900 text-[10.5px]">Konsumen / Pemilik</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 underline text-[10.5px] truncate px-1">{customerName}</p>
                      <p className="text-[9.5px] text-gray-600 font-medium">Pemilik / Kuasa Pemilik</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Catatan Kaki Legal */}
            <div className="pt-1.5 border-t border-gray-400 text-[9px] text-gray-500 flex justify-between items-center mt-2 break-inside-avoid">
              <span>* BAST ini merupakan bukti sah perpindahan hak operasional dan tanggung jawab kendaraan ke Pihak Kedua.</span>
              <span className="font-mono">Tercetak: {timestampStr}</span>
            </div>

          </div>
        </div>

      </div>

      {/* Embedded CSS for Exact A4 Single Page Print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Sembunyikan seluruh UI luar dari aliran cetak */
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

          /* Jika modal berada di portal atau di dalam DOM biasa */
          .modal-backdrop,
          header,
          nav,
          button,
          .no-print {
            display: none !important;
          }

          /* Netralkan wrapper container di dalam #print-root */
          #print-root {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }

          #bast-modal-backdrop,
          #bast-modal-backdrop > div,
          #bast-modal-backdrop > div > div {
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

          /* Kontainer kertas BAST */
          #printable-bast {
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

          #printable-bast * {
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
