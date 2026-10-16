import React from 'react';
import { Printer, X, Download, FileText, CheckCircle2 } from 'lucide-react';
import type {
  SpkJobProfitability,
  WbsCostVariance,
  InventoryValuation,
  ProjectReceivable,
  FinancialExecutiveSummary,
} from '../../types/financialReports';
import { exportFullFinancialWorkbook, exportToExcel } from '../../utils/exportFinancialReports';

interface FinancialPrintReportProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'profitability' | 'variance' | 'inventory' | 'receivables' | 'all';
  setActiveTab?: (tab: 'profitability' | 'variance' | 'inventory' | 'receivables' | 'all') => void;
  summary: FinancialExecutiveSummary | null;
  profitabilityData: SpkJobProfitability[];
  varianceData: WbsCostVariance[];
  inventoryData: InventoryValuation[];
  receivablesData: ProjectReceivable[];
  startDate?: string;
  endDate?: string;
  currentUser?: {
    name?: string;
    role?: string;
  };
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const FinancialPrintReport: React.FC<FinancialPrintReportProps> = ({
  isOpen,
  onClose,
  activeTab = 'all',
  setActiveTab,
  summary,
  profitabilityData = [],
  varianceData = [],
  inventoryData = [],
  receivablesData = [],
  startDate,
  endDate,
  currentUser,
}) => {
  if (!isOpen) return null;

  const printTimestamp = new Date().toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const periodLabel = startDate && endDate
    ? `${startDate} s/d ${endDate}`
    : startDate
    ? `Mulai ${startDate}`
    : endDate
    ? `Sampai ${endDate}`
    : 'Semua Periode Transaksi';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = () => {
    if (activeTab === 'all') {
      exportFullFinancialWorkbook({
        profitability: profitabilityData,
        variance: varianceData,
        inventory: inventoryData,
        receivables: receivablesData,
        summary,
      });
    } else {
      let data: any[] = [];
      if (activeTab === 'profitability') data = profitabilityData;
      if (activeTab === 'variance') data = varianceData;
      if (activeTab === 'inventory') data = inventoryData;
      if (activeTab === 'receivables') data = receivablesData;
      exportToExcel(activeTab, data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto flex justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container Dialog */}
      <div className="bg-white text-gray-900 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto print:shadow-none print:rounded-none print:max-w-none print:my-0">
        
        {/* Screen Controls Header (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-display text-sm sm:text-base">
                Pratinjau Dokumen Cetak Formal (A4)
              </h3>
              <p className="text-xs text-slate-400">
                Format resmi siap cetak ke printer fisik atau disimpan sebagai PDF berstandar akuntansi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {setActiveTab && (
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary"
              >
                <option value="all">Dokumen Komprehensif (Semua Laporan)</option>
                <option value="profitability">1. Laba Rugi SPK</option>
                <option value="variance">2. Varian Anggaran WBS</option>
                <option value="inventory">3. Valuasi Persediaan Gudang</option>
                <option value="receivables">4. Piutang & Kontrol Serah Terima</option>
              </select>
            )}

            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold transition"
              title="Unduh Lembar Kerja Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md transition"
              title="Kirim ke Printer / Simpan sebagai PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition ml-1"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div id="printable-report-canvas" className="p-8 sm:p-12 space-y-6 text-black bg-white print:p-6 print:m-0">
          
          {/* 1. Official Corporate Letterhead */}
          <div className="border-b-2 border-black pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-slate-900 font-display">
                  ROBEL<span className="text-orange-600">KAROSERI</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-black uppercase font-bold tracking-wider">
                  OFFICIAL AUDIT REPORT
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700 tracking-wider uppercase mt-0.5">
                INDUSTRIAL VEHICLE MODIFICATION & SPECIAL BODY FABRICATION
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Workshop & Plant: Kawasan Industri Karoseri Terpadu, Sidoarjo - Jawa Timur • Telp: (031) 8900-KRS
              </p>
            </div>

            <div className="text-right font-mono text-[11px] text-slate-700 shrink-0 border border-slate-300 p-2.5 rounded bg-slate-50">
              <div className="font-bold text-slate-900">NO. DOKUMEN: FIN-REP/{new Date().getFullYear()}/{getDocSuffix(activeTab)}</div>
              <div>Tanggal Cetak: <span className="font-semibold text-slate-900">{printTimestamp}</span></div>
              <div>Pencetak: <span className="font-semibold text-slate-900">{currentUser?.name || 'Petugas'} ({currentUser?.role || 'Finance'})</span></div>
              <div>Periode: <span className="font-semibold text-slate-900">{periodLabel}</span></div>
            </div>
          </div>

          {/* Document Title Header */}
          <div className="text-center py-2 space-y-1">
            <h1 className="text-lg font-extrabold uppercase tracking-wide text-slate-900 underline underline-offset-4">
              {getDocumentTitle(activeTab)}
            </h1>
            <p className="text-xs text-slate-600 italic">
              Laporan Konsolidasi Finansial & Operasional untuk Manajemen Karoseri dan Audit Keuangan Bengkel
            </p>
          </div>

          {/* 2. Executive Summary KPI Table */}
          {summary && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                I. Ringkasan Eksekutif Finansial Bengkel
              </h2>
              <table className="w-full text-xs border border-black border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-black text-center">
                    <th className="border border-black p-2">Total Proyek SPK</th>
                    <th className="border border-black p-2">Total Revenue</th>
                    <th className="border border-black p-2">Total HPP Riil (COGS)</th>
                    <th className="border border-black p-2">Laba Kotor Kumulatif</th>
                    <th className="border border-black p-2">Rata-rata Margin</th>
                    <th className="border border-black p-2">Valuasi Gudang (HPP)</th>
                    <th className="border border-black p-2">Piutang Tertahan</th>
                  </tr>
                </thead>
                <tbody className="text-center font-mono">
                  <tr>
                    <td className="border border-black p-2 font-bold">{summary.total_projects} SPK</td>
                    <td className="border border-black p-2 font-bold text-slate-900">{formatCurrency(summary.total_revenue)}</td>
                    <td className="border border-black p-2">{formatCurrency(summary.total_cogs)}</td>
                    <td className={`border border-black p-2 font-bold ${summary.total_gross_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatCurrency(summary.total_gross_profit)}
                    </td>
                    <td className="border border-black p-2 font-bold">{summary.average_gross_margin}%</td>
                    <td className="border border-black p-2">{formatCurrency(summary.total_inventory_valuation)}</td>
                    <td className="border border-black p-2 font-bold text-amber-700">
                      {formatCurrency(summary.total_outstanding_receivables)}
                      {summary.units_pending_handover > 0 && ` (${summary.units_pending_handover} Unit)`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 3. Detailed Tables Section */}
          <div className="space-y-6">
            
            {/* Table 1: Laba Rugi SPK */}
            {(activeTab === 'all' || activeTab === 'profitability') && (
              <div className="space-y-2 break-inside-avoid">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-700" />
                  {activeTab === 'all' ? 'II. Rincian Laba Rugi per Proyek SPK (Job Profitability)' : 'I. Rincian Laba Rugi per Proyek SPK'}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border border-black border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-black text-left">
                        <th className="border border-black p-1.5 text-center w-8">No</th>
                        <th className="border border-black p-1.5">No. SPK</th>
                        <th className="border border-black p-1.5">Pelanggan</th>
                        <th className="border border-black p-1.5">Plat</th>
                        <th className="border border-black p-1.5 text-right">Revenue (Rp)</th>
                        <th className="border border-black p-1.5 text-right">HPP Bahan (Rp)</th>
                        <th className="border border-black p-1.5 text-right">HPP Jasa (Rp)</th>
                        <th className="border border-black p-1.5 text-right">Total HPP (Rp)</th>
                        <th className="border border-black p-1.5 text-right">Laba Kotor (Rp)</th>
                        <th className="border border-black p-1.5 text-right">Margin %</th>
                        <th className="border border-black p-1.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black font-mono">
                      {profitabilityData.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="border border-black p-3 text-center text-slate-500 italic">
                            Tidak ada data transaksi laba rugi untuk periode yang dipilih.
                          </td>
                        </tr>
                      ) : (
                        profitabilityData.map((row, idx) => (
                          <tr key={idx} className="border-b border-black">
                            <td className="border border-black p-1 text-center font-sans">{idx + 1}</td>
                            <td className="border border-black p-1 font-bold">{row.spk_number}</td>
                            <td className="border border-black p-1 font-sans">{row.customer_name}</td>
                            <td className="border border-black p-1">{row.vehicle_plate || '-'}</td>
                            <td className="border border-black p-1 text-right font-bold">{formatCurrency(row.total_revenue)}</td>
                            <td className="border border-black p-1 text-right">{formatCurrency(row.actual_material_cost)}</td>
                            <td className="border border-black p-1 text-right">{formatCurrency(row.actual_labor_cost)}</td>
                            <td className="border border-black p-1 text-right">{formatCurrency(row.total_cogs)}</td>
                            <td className={`border border-black p-1 text-right font-bold ${row.gross_profit < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                              {formatCurrency(row.gross_profit)}
                            </td>
                            <td className="border border-black p-1 text-right font-bold">{row.gross_margin_percentage}%</td>
                            <td className="border border-black p-1 text-center text-[9px] font-sans font-bold">{row.payment_status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Table 2: Varian Anggaran WBS */}
            {(activeTab === 'all' || activeTab === 'variance') && (
              <div className="space-y-2 break-inside-avoid">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-700" />
                  {activeTab === 'all' ? 'III. Rincian Analisis Varian Anggaran WBS (Pagu vs Realisasi)' : 'I. Rincian Varian Anggaran WBS'}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border border-black border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-black text-left">
                        <th className="border border-black p-1.5 text-center w-8">No</th>
                        <th className="border border-black p-1.5">No. SPK</th>
                        <th className="border border-black p-1.5">Pelanggan</th>
                        <th className="border border-black p-1.5">Tahapan WBS</th>
                        <th className="border border-black p-1.5 text-right">Pagu Material</th>
                        <th className="border border-black p-1.5 text-right">Aktual Material</th>
                        <th className="border border-black p-1.5 text-right">Varian Material</th>
                        <th className="border border-black p-1.5 text-right">Pagu Jasa</th>
                        <th className="border border-black p-1.5 text-right">Aktual Jasa</th>
                        <th className="border border-black p-1.5 text-right">Varian Jasa</th>
                        <th className="border border-black p-1.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black font-mono">
                      {varianceData.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="border border-black p-3 text-center text-slate-500 italic">
                            Tidak ada data varian anggaran WBS yang sesuai.
                          </td>
                        </tr>
                      ) : (
                        varianceData.slice(0, activeTab === 'all' ? 25 : varianceData.length).map((row, idx) => {
                          const isOver = row.material_variance < 0 || row.labor_variance < 0;
                          return (
                            <tr key={idx} className="border-b border-black">
                              <td className="border border-black p-1 text-center font-sans">{idx + 1}</td>
                              <td className="border border-black p-1 font-bold">{row.spk_number}</td>
                              <td className="border border-black p-1 font-sans">{row.customer_name}</td>
                              <td className="border border-black p-1 font-sans">{row.wbs_stage}</td>
                              <td className="border border-black p-1 text-right">{formatCurrency(row.total_material_budget)}</td>
                              <td className="border border-black p-1 text-right">{formatCurrency(row.actual_material_spent)}</td>
                              <td className={`border border-black p-1 text-right font-bold ${row.material_variance < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                                {formatCurrency(row.material_variance)}
                              </td>
                              <td className="border border-black p-1 text-right">{formatCurrency(row.total_labor_budget)}</td>
                              <td className="border border-black p-1 text-right">{formatCurrency(row.actual_labor_spent)}</td>
                              <td className={`border border-black p-1 text-right font-bold ${row.labor_variance < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                                {formatCurrency(row.labor_variance)}
                              </td>
                              <td className={`border border-black p-1 text-center text-[9px] font-sans font-bold ${isOver ? 'text-rose-700' : 'text-emerald-700'}`}>
                                {isOver ? 'DEFISIT' : 'SURPLUS'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Table 3: Valuasi Persediaan Gudang */}
            {(activeTab === 'all' || activeTab === 'inventory') && (
              <div className="space-y-2 break-inside-avoid">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-700" />
                  {activeTab === 'all' ? 'IV. Rincian Valuasi Persediaan Gudang (HPP vs Pasar)' : 'I. Rincian Valuasi Persediaan Gudang'}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border border-black border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-black text-left">
                        <th className="border border-black p-1.5 text-center w-8">No</th>
                        <th className="border border-black p-1.5">Nama Material</th>
                        <th className="border border-black p-1.5">Kategori</th>
                        <th className="border border-black p-1.5 text-center">Satuan</th>
                        <th className="border border-black p-1.5 text-right">Stok Fisik</th>
                        <th className="border border-black p-1.5 text-right">Harga Pokok HPP</th>
                        <th className="border border-black p-1.5 text-right">Harga Jual Standar</th>
                        <th className="border border-black p-1.5 text-right">Total Valuasi HPP</th>
                        <th className="border border-black p-1.5 text-right">Total Nilai Pasar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black font-mono">
                      {inventoryData.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="border border-black p-3 text-center text-slate-500 italic">
                            Tidak ada data persediaan gudang.
                          </td>
                        </tr>
                      ) : (
                        inventoryData.slice(0, activeTab === 'all' ? 25 : inventoryData.length).map((row, idx) => (
                          <tr key={idx} className="border-b border-black">
                            <td className="border border-black p-1 text-center font-sans">{idx + 1}</td>
                            <td className="border border-black p-1 font-bold font-sans">{row.material_name}</td>
                            <td className="border border-black p-1 font-sans">{row.category}</td>
                            <td className="border border-black p-1 text-center font-sans">{row.unit}</td>
                            <td className="border border-black p-1 text-right font-bold">{row.current_stock}</td>
                            <td className="border border-black p-1 text-right">{formatCurrency(row.cost_price_hpp)}</td>
                            <td className="border border-black p-1 text-right">{formatCurrency(row.standard_selling_price)}</td>
                            <td className="border border-black p-1 text-right font-bold text-slate-900">{formatCurrency(row.total_inventory_valuation_hpp)}</td>
                            <td className="border border-black p-1 text-right">{formatCurrency(row.total_inventory_market_value)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Table 4: Piutang & Aging */}
            {(activeTab === 'all' || activeTab === 'receivables') && (
              <div className="space-y-2 break-inside-avoid">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-700" />
                  {activeTab === 'all' ? 'V. Rincian Piutang Proyek & Kontrol Serah Terima' : 'I. Rincian Piutang Proyek & Aging'}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border border-black border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-black text-left">
                        <th className="border border-black p-1.5 text-center w-8">No</th>
                        <th className="border border-black p-1.5">No. SPK</th>
                        <th className="border border-black p-1.5">Pelanggan</th>
                        <th className="border border-black p-1.5">Plat</th>
                        <th className="border border-black p-1.5">No. Faktur</th>
                        <th className="border border-black p-1.5 text-right">Nilai Faktur</th>
                        <th className="border border-black p-1.5 text-right">DP / Terbayar</th>
                        <th className="border border-black p-1.5 text-right">Sisa Piutang</th>
                        <th className="border border-black p-1.5 text-center">Usia Piutang</th>
                        <th className="border border-black p-1.5 text-center">Status Serah Terima</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black font-mono">
                      {receivablesData.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="border border-black p-3 text-center text-slate-500 italic">
                            Tidak ada data piutang proyek tercatat.
                          </td>
                        </tr>
                      ) : (
                        receivablesData.map((row, idx) => (
                          <tr key={idx} className="border-b border-black">
                            <td className="border border-black p-1 text-center font-sans">{idx + 1}</td>
                            <td className="border border-black p-1 font-bold">{row.spk_number}</td>
                            <td className="border border-black p-1 font-sans">{row.customer_name}</td>
                            <td className="border border-black p-1">{row.vehicle_plate || '-'}</td>
                            <td className="border border-black p-1">{row.invoice_number}</td>
                            <td className="border border-black p-1 text-right">{formatCurrency(row.total_billing_amount)}</td>
                            <td className="border border-black p-1 text-right">{formatCurrency(row.dp_paid + row.additional_paid)}</td>
                            <td className={`border border-black p-1 text-right font-bold ${row.outstanding_balance > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                              {formatCurrency(row.outstanding_balance)}
                            </td>
                            <td className="border border-black p-1 text-center font-sans font-bold">{row.receivable_aging_days} Hari</td>
                            <td className="border border-black p-1 text-center text-[9px] font-sans font-bold">{row.handover_clearance_status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 4. Official Signatures Block */}
          <div className="pt-8 border-t border-slate-300 break-inside-avoid">
            <div className="grid grid-cols-2 gap-12 text-center text-xs">
              <div className="space-y-16">
                <div>
                  <p className="font-semibold text-slate-700">Disiapkan & Diverifikasi Oleh,</p>
                  <p className="text-[11px] text-slate-500">Bagian Kasir / Keuangan Bengkel</p>
                </div>
                <div>
                  <p className="font-bold underline text-slate-900">{currentUser?.name || '___________________________'}</p>
                  <p className="text-[10px] text-slate-500">Finance & Billing Administrator</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">Tanggal: ___ / ___ / 2026</p>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <p className="font-semibold text-slate-700">Disetujui & Disahkan Oleh,</p>
                  <p className="text-[11px] text-slate-500">Pemilik Bengkel (Owner / Direktur)</p>
                </div>
                <div>
                  <p className="font-bold underline text-slate-900">Donny Narendra, S.T.</p>
                  <p className="text-[10px] text-slate-500">Managing Director / Owner RobelKaroseri</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">Tanggal: ___ / ___ / 2026</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
              Dokumen ini dihasilkan secara otomatis dan sah oleh KaroseriOps Enterprise Financial Engine • Dicetak pada {printTimestamp}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

function getDocSuffix(tab: string): string {
  switch (tab) {
    case 'profitability': return 'PROF';
    case 'variance': return 'VAR';
    case 'inventory': return 'INV';
    case 'receivables': return 'REC';
    default: return 'FULL';
  }
}

function getDocumentTitle(tab: string): string {
  switch (tab) {
    case 'profitability': return 'LAPORAN LABA RUGI PROYEK SPK (JOB PROFITABILITY)';
    case 'variance': return 'LAPORAN ANALISIS VARIAN ANGGARAN WBS (PAGU VS REALISASI)';
    case 'inventory': return 'LAPORAN VALUASI PERSEDIAAN & MUTASI GUDANG';
    case 'receivables': return 'LAPORAN PIUTANG PROYEK & KONTROL SERAH TERIMA';
    default: return 'LAPORAN KONSOLIDASI EVALUASI FINANSIAL & OPERASIONAL BENGKEL';
  }
}
