import * as XLSX from 'xlsx';
import type {
  SpkJobProfitability,
  WbsCostVariance,
  InventoryValuation,
  ProjectReceivable,
  FinancialExecutiveSummary,
  CorporateMonthlyPnl,
} from '../types/financialReports';

export type FinancialReportType = 'profitability' | 'variance' | 'inventory' | 'receivables' | 'corporate_pnl';

export interface FullReportsData {
  profitability: SpkJobProfitability[];
  variance: WbsCostVariance[];
  inventory: InventoryValuation[];
  receivables: ProjectReceivable[];
  corporatePnl?: CorporateMonthlyPnl[];
  summary?: FinancialExecutiveSummary | null;
}

/**
 * Format tanggal YYYYMMDD untuk penamaan file
 */
export function getFormattedDateForFilename(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Format string tanggal lokal Indonesia (DD/MM/YYYY HH:mm)
 */
export function formatLocalTimestamp(isoDateStr?: string | null): string {
  if (!isoDateStr) return '-';
  const d = new Date(isoDateStr);
  if (isNaN(d.getTime())) return String(isoDateStr);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Transform data Laba Rugi SPK ke format baris Excel bahasa Indonesia
 */
export function mapProfitabilityToExcelRows(items: SpkJobProfitability[]) {
  return items.map((item, idx) => ({
    'No.': idx + 1,
    'Nomor SPK': item.spk_number || '-',
    'Nama Pelanggan': item.customer_name || '-',
    'No. Telepon': item.customer_phone || '-',
    'Plat Nomor': item.vehicle_plate || '-',
    'Status SPK': item.spk_status || '-',
    'Tanggal Registrasi': formatLocalTimestamp(item.registration_date),
    'Target Selesai': formatLocalTimestamp(item.target_date),
    'Pendapatan Tagihan (Rp)': Number(item.total_revenue) || 0,
    'Profit Paket Assembly (Rp)': Number(item.package_profit) || 0,
    'Profit Material Granular (Rp)': Number(item.granular_material_profit) || 0,
    'Profit Jasa & Overhead (Rp)': Number(item.granular_other_profit) || 0,
    'HPP Bahan/Material (Rp)': Number(item.actual_material_cost) || 0,
    'HPP Jasa/Borongan (Rp)': Number(item.actual_labor_cost) || 0,
    'HPP Overhead Pabrikasi (Rp)': Number(item.actual_overhead_cost) || 0,
    'Total HPP Aktual (Rp)': Number(item.total_cogs) || 0,
    'Laba Kotor (Rp)': Number(item.gross_profit) || 0,
    'Margin Kotor (%)': Number(item.gross_margin_percentage) || 0,
    'Status Penagihan': item.payment_status || 'UNBILLED',
  }));
}

/**
 * Transform data Varian Anggaran WBS ke format baris Excel bahasa Indonesia
 * Menyajikan 3 pilar job order costing: Material, Jasa/Labor, dan Overhead Pabrikasi (FOH)
 * Sinkronisasi kolom Overhead (total_overhead_budget, actual_overhead_spent, overhead_variance)
 */
export function mapVarianceToExcelRows(items: WbsCostVariance[]) {
  return items.map((item, idx) => {
    const matBudget = Number(item.total_material_budget) || 0;
    const matSpent = Number(item.actual_material_spent) || 0;
    const matVar = Number(item.material_variance) || 0;
    const labBudget = Number(item.total_labor_budget) || 0;
    const labSpent = Number(item.actual_labor_spent) || 0;
    const labVar = Number(item.labor_variance) || 0;
    const fohBudget = Number(item.total_overhead_budget) || 0;
    const fohSpent = Number(item.actual_overhead_spent) || 0;
    const fohVar = Number(item.overhead_variance) || 0;
    const totalBudget = matBudget + labBudget + fohBudget;
    const totalSpent = matSpent + labSpent + fohSpent;
    const totalVar = totalBudget - totalSpent;

    return {
      'No.': idx + 1,
      'Nomor SPK': item.spk_number || '-',
      'Nama Pelanggan': item.customer_name || '-',
      'Plat Nomor': item.vehicle_plate || '-',
      'Tahapan WBS': item.wbs_stage || '-',
      'Pagu Material (Rp)': matBudget,
      'Aktual Material (Rp)': matSpent,
      'Varian Material (Rp)': matVar,
      'Pagu Jasa/Labor (Rp)': labBudget,
      'Aktual Jasa/Labor (Rp)': labSpent,
      'Varian Jasa (Rp)': labVar,
      'Pagu Overhead/FOH (Rp)': fohBudget,
      'Aktual Overhead/FOH (Rp)': fohSpent,
      'Varian Overhead (Rp)': fohVar,
      'Total Pagu (Rp)': totalBudget,
      'Total Aktual (Rp)': totalSpent,
      'Total Varian (Rp)': totalVar,
      'Status Anggaran': matVar < 0 || labVar < 0 || fohVar < 0 ? 'OVER BUDGET (DEFISIT)' : 'SURPLUS',
    };
  });
}

/**
 * Transform data Valuasi Persediaan Gudang ke format baris Excel bahasa Indonesia
 */
export function mapInventoryToExcelRows(items: InventoryValuation[]) {
  return items.map((item, idx) => ({
    'No.': idx + 1,
    'Nama Material / Barang': item.material_name || '-',
    'Kategori': item.category || 'General',
    'Satuan': item.unit || 'pcs',
    'Stok Fisik': Number(item.current_stock) || 0,
    'Harga Pokok HPP (Rp)': Number(item.cost_price_hpp) || 0,
    'Harga Jual Standar (Rp)': Number(item.standard_selling_price) || 0,
    'Total Valuasi HPP (Rp)': Number(item.total_inventory_valuation_hpp) || 0,
    'Total Nilai Pasar (Rp)': Number(item.total_inventory_market_value) || 0,
    'Pembaruan Terakhir': formatLocalTimestamp(item.last_inventory_update),
  }));
}

/**
 * Transform data Piutang & Aging Proyek ke format baris Excel bahasa Indonesia
 */
export function mapReceivablesToExcelRows(items: ProjectReceivable[]) {
  return items.map((item, idx) => ({
    'No.': idx + 1,
    'Nomor SPK': item.spk_number || '-',
    'Nama Pelanggan': item.customer_name || '-',
    'No. Telepon': item.customer_phone || '-',
    'Plat Nomor': item.vehicle_plate || '-',
    'Nomor Faktur': item.invoice_number || '-',
    'Tanggal Faktur': formatLocalTimestamp(item.invoice_date),
    'Total Nilai Faktur (Rp)': Number(item.total_billing_amount) || 0,
    'DP Diterima (Rp)': Number(item.dp_paid) || 0,
    'Pelunasan Tambahan (Rp)': Number(item.additional_paid) || 0,
    'Sisa Piutang (Rp)': Number(item.outstanding_balance) || 0,
    'Usia Piutang (Hari)': Number(item.receivable_aging_days) || 0,
    'Status Pembayaran': item.payment_status || '-',
    'Status Serah Terima': item.handover_clearance_status || '-',
  }));
}

/**
 * Transform data Laba Rugi Komprehensif Perusahaan (Corporate P&L) ke format Excel
 */
export function mapCorporatePnlToExcelRows(items: CorporateMonthlyPnl[]) {
  return items.map((item, idx) => ({
    'No.': idx + 1,
    'Bulan Buku': item.report_month || '-',
    'Jumlah SPK': Number(item.total_spk_count) || 0,
    'Total Pendapatan (Rp)': Number(item.total_revenue) || 0,
    'HPP Bahan Baku (Rp)': Number(item.total_material_cogs) || 0,
    'HPP Jasa Borongan (Rp)': Number(item.total_labor_cogs) || 0,
    'HPP Overhead FOH (Rp)': Number(item.total_foh_cogs) || 0,
    'Total HPP/COGS (Rp)': Number(item.total_cogs) || 0,
    'Laba Kotor (Rp)': Number(item.gross_profit) || 0,
    'Total Beban OPEX (Rp)': Number(item.total_opex) || 0,
    'OPEX Gaji (Rp)': Number(item.opex_salary) || 0,
    'OPEX Listrik & Utilitas (Rp)': Number(item.opex_utility) || 0,
    'OPEX Sewa Tempat (Rp)': Number(item.opex_rent) || 0,
    'OPEX Amenities (Rp)': Number(item.opex_amenities) || 0,
    'OPEX Lainnya (Rp)': Number(item.opex_others) || 0,
    'Laba Bersih Usaha/EBIT (Rp)': Number(item.net_operating_profit) || 0,
    'Net Margin (%)': Number(item.net_margin_percentage) || 0,
  }));
}

/**
 * Helper untuk mengatur auto-fit lebar kolom pada worksheet
 */
function autoFitColumns(rows: Record<string, any>[]): { wch: number }[] {
  if (!rows || rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((key) => {
    let maxLen = key.length;
    for (const r of rows) {
      const val = r[key];
      const strVal = val !== null && val !== undefined ? String(val) : '';
      if (strVal.length > maxLen) {
        maxLen = strVal.length;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
  });
}

/**
 * 1. Ekspor Data Laporan Aktif ke File Excel (.xlsx) Tunggal
 */
export function exportToExcel(
  reportType: FinancialReportType,
  data: any[],
  options?: { customFilename?: string; sheetName?: string }
): void {
  const dateStr = getFormattedDateForFilename();
  let mappedRows: Record<string, any>[] = [];
  let defaultSheetName = 'Laporan';
  let defaultFilename = `RobelKaroseri_${reportType}_${dateStr}.xlsx`;

  switch (reportType) {
    case 'profitability':
      mappedRows = mapProfitabilityToExcelRows(data as SpkJobProfitability[]);
      defaultSheetName = 'Laba Rugi SPK';
      defaultFilename = `RobelKaroseri_Laba_Rugi_SPK_${dateStr}.xlsx`;
      break;
    case 'variance':
      mappedRows = mapVarianceToExcelRows(data as WbsCostVariance[]);
      defaultSheetName = 'Varian Anggaran WBS';
      defaultFilename = `RobelKaroseri_Varian_Anggaran_WBS_${dateStr}.xlsx`;
      break;
    case 'inventory':
      mappedRows = mapInventoryToExcelRows(data as InventoryValuation[]);
      defaultSheetName = 'Valuasi Persediaan';
      defaultFilename = `RobelKaroseri_Valuasi_Persediaan_${dateStr}.xlsx`;
      break;
    case 'receivables':
      mappedRows = mapReceivablesToExcelRows(data as ProjectReceivable[]);
      defaultSheetName = 'Piutang & Aging';
      defaultFilename = `RobelKaroseri_Piutang_dan_Aging_${dateStr}.xlsx`;
      break;
    case 'corporate_pnl':
      mappedRows = mapCorporatePnlToExcelRows(data as CorporateMonthlyPnl[]);
      defaultSheetName = 'Laba Rugi Perusahaan';
      defaultFilename = `RobelKaroseri_Laba_Rugi_Perusahaan_${dateStr}.xlsx`;
      break;
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(mappedRows);
  ws['!cols'] = autoFitColumns(mappedRows);

  const sheetName = options?.sheetName || defaultSheetName;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const filename = options?.customFilename || defaultFilename;
  XLSX.writeFile(wb, filename);
}

/**
 * 2. Ekspor Semua Laporan Menjadi 1 File Excel Multi-Sheet Komprehensif (Full Workbook)
 */
export function exportFullFinancialWorkbook(
  allReportsData: FullReportsData,
  options?: { customFilename?: string }
): void {
  const dateStr = getFormattedDateForFilename();
  const wb = XLSX.utils.book_new();

  // Sheet 0: Ringkasan Eksekutif (jika tersedia)
  if (allReportsData.summary) {
    const s = allReportsData.summary;
    const summaryRows = [
      { 'Indikator Kunci (KPI)': 'Total Proyek SPK Tercatat', 'Nilai': s.total_projects, 'Keterangan': 'Unit SPK Aktif & Selesai' },
      { 'Indikator Kunci (KPI)': 'Total Pendapatan (Revenue)', 'Nilai': s.total_revenue, 'Keterangan': 'Rupiah' },
      { 'Indikator Kunci (KPI)': 'Total Biaya Bahan Baku (Goods Issued)', 'Nilai': s.total_actual_material_cost, 'Keterangan': 'Material Terpakai Riil' },
      { 'Indikator Kunci (KPI)': 'Total Biaya Borongan Mandor Terbayar', 'Nilai': s.total_actual_labor_cost, 'Keterangan': 'Upah Borongan Riil' },
      { 'Indikator Kunci (KPI)': 'Total Biaya Overhead Pabrikasi (FOH)', 'Nilai': s.total_actual_overhead_cost, 'Keterangan': 'Overhead Mesin & Bay Riil' },
      { 'Indikator Kunci (KPI)': 'Total HPP Riil (COGS)', 'Nilai': s.total_cogs, 'Keterangan': 'Bahan Material + Jasa Borongan + Overhead' },
      { 'Indikator Kunci (KPI)': 'Laba Kotor Kumulatif (Gross Profit)', 'Nilai': s.total_gross_profit, 'Keterangan': 'Revenue - HPP Riil' },
      { 'Indikator Kunci (KPI)': 'Rata-rata Gross Margin (%)', 'Nilai': `${s.average_gross_margin}%`, 'Keterangan': 'Target Benchmark >= 25%' },
      { 'Indikator Kunci (KPI)': 'Valuasi Aset Gudang (HPP)', 'Nilai': s.total_inventory_valuation, 'Keterangan': 'Biaya Pokok Persediaan' },
      { 'Indikator Kunci (KPI)': 'Nilai Pasar Persediaan', 'Nilai': s.total_inventory_market_value, 'Keterangan': 'Standar Harga Jual Gudang' },
      { 'Indikator Kunci (KPI)': 'Total Piutang Belum Tertagih', 'Nilai': s.total_outstanding_receivables, 'Keterangan': 'Sisa Tagihan Invoice' },
      { 'Indikator Kunci (KPI)': 'Unit Tertahan Pelunasan', 'Nilai': s.units_pending_handover, 'Keterangan': 'QC Pass tapi belum lunas' },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 38 }, { wch: 25 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Eksekutif');
  }

  // Sheet 1: Laba Rugi SPK
  const rowsProf = mapProfitabilityToExcelRows(allReportsData.profitability || []);
  const wsProf = XLSX.utils.json_to_sheet(rowsProf);
  wsProf['!cols'] = autoFitColumns(rowsProf);
  XLSX.utils.book_append_sheet(wb, wsProf, 'Laba Rugi SPK');

  // Sheet 2: Varian Anggaran WBS
  const rowsVar = mapVarianceToExcelRows(allReportsData.variance || []);
  const wsVar = XLSX.utils.json_to_sheet(rowsVar);
  wsVar['!cols'] = autoFitColumns(rowsVar);
  XLSX.utils.book_append_sheet(wb, wsVar, 'Varian Anggaran WBS');

  // Sheet 3: Valuasi Persediaan
  const rowsInv = mapInventoryToExcelRows(allReportsData.inventory || []);
  const wsInv = XLSX.utils.json_to_sheet(rowsInv);
  wsInv['!cols'] = autoFitColumns(rowsInv);
  XLSX.utils.book_append_sheet(wb, wsInv, 'Valuasi Persediaan');

  // Sheet 4: Piutang & Aging
  const rowsRec = mapReceivablesToExcelRows(allReportsData.receivables || []);
  const wsRec = XLSX.utils.json_to_sheet(rowsRec);
  wsRec['!cols'] = autoFitColumns(rowsRec);
  XLSX.utils.book_append_sheet(wb, wsRec, 'Piutang & Aging');

  // Sheet 5: Laba Rugi Komprehensif Perusahaan (jika tersedia)
  if (allReportsData.corporatePnl && allReportsData.corporatePnl.length > 0) {
    const rowsCorp = mapCorporatePnlToExcelRows(allReportsData.corporatePnl);
    const wsCorp = XLSX.utils.json_to_sheet(rowsCorp);
    wsCorp['!cols'] = autoFitColumns(rowsCorp);
    XLSX.utils.book_append_sheet(wb, wsCorp, 'Laba Rugi Perusahaan');
  }

  const filename = options?.customFilename || `RobelKaroseri_Full_Financial_Workbook_${dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * 3. Ekspor Data Tab Aktif ke File CSV Standar
 */
export function exportToCsv(
  reportType: FinancialReportType,
  data: any[],
  customFilename?: string
): void {
  const dateStr = getFormattedDateForFilename();
  let mappedRows: Record<string, any>[] = [];
  let defaultFilename = `RobelKaroseri_${reportType}_${dateStr}.csv`;

  switch (reportType) {
    case 'profitability':
      mappedRows = mapProfitabilityToExcelRows(data as SpkJobProfitability[]);
      defaultFilename = `RobelKaroseri_Laba_Rugi_${dateStr}.csv`;
      break;
    case 'variance':
      mappedRows = mapVarianceToExcelRows(data as WbsCostVariance[]);
      defaultFilename = `RobelKaroseri_Varian_WBS_${dateStr}.csv`;
      break;
    case 'inventory':
      mappedRows = mapInventoryToExcelRows(data as InventoryValuation[]);
      defaultFilename = `RobelKaroseri_Valuasi_Gudang_${dateStr}.csv`;
      break;
    case 'receivables':
      mappedRows = mapReceivablesToExcelRows(data as ProjectReceivable[]);
      defaultFilename = `RobelKaroseri_Piutang_Aging_${dateStr}.csv`;
      break;
    case 'corporate_pnl':
      mappedRows = mapCorporatePnlToExcelRows(data as CorporateMonthlyPnl[]);
      defaultFilename = `RobelKaroseri_Laba_Rugi_Perusahaan_${dateStr}.csv`;
      break;
  }

  const ws = XLSX.utils.json_to_sheet(mappedRows);
  const csvOutput = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', customFilename || defaultFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
