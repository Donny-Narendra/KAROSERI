import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Plus, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  AlertCircle,
  Clock,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { operatingExpenseService } from '../../../services/operatingExpenseService';
import type { MonthlyCorporatePnL } from '../../../types/operatingExpenses';
import { formatRupiah } from '../../../utils/formatters';
import { CorporatePnLCharts } from '../CorporatePnLCharts';
import { SmartTargetSolverWidget } from '../SmartTargetSolverWidget';
import { OperatingExpenseManagerModal } from '../OperatingExpenseManagerModal';

interface CorporatePnlTabProps {
  refreshTrigger?: number;
}

export const CorporatePnlTab: React.FC<CorporatePnlTabProps> = ({ refreshTrigger }) => {
  const [data, setData] = useState<MonthlyCorporatePnL[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Year & Month filter
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // OPEX Modal state
  const [isOpexModalOpen, setIsOpexModalOpen] = useState<boolean>(false);
  const [selectedOpexMonth, setSelectedOpexMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Expanded month for tiered view
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await operatingExpenseService.getCorporatePnL(selectedYear);
      setData(result);
      if (result.length > 0) {
        setActiveMonthIndex(0);
      }
    } catch (err: any) {
      console.error('Failed to load corporate monthly pnl:', err);
      setError(err.message || 'Gagal memuat laporan laba rugi perusahaan.');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const handleOpenOpexForMonth = (monthStr: string) => {
    setSelectedOpexMonth(monthStr.slice(0, 7));
    setIsOpexModalOpen(true);
  };

  const formatMonthLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Aggregates across active year
  const totalRev = data.reduce((sum, d) => sum + d.total_revenue, 0);
  const totalCogs = data.reduce((sum, d) => sum + d.total_cogs, 0);
  const totalGross = data.reduce((sum, d) => sum + d.gross_profit, 0);
  const totalOpex = data.reduce((sum, d) => sum + d.total_opex, 0);
  const totalNet = data.reduce((sum, d) => sum + d.net_operating_profit, 0);
  const totalSpk = data.reduce((sum, d) => sum + d.total_spk_count, 0);
  const avgMargin = totalRev > 0 ? (totalNet / totalRev) * 100 : 0;

  // Selected month for Tiered P&L Statement
  const activeMonthData = data[activeMonthIndex] || data[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Action & Filter Bar */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold font-display text-text">
              Laporan Laba Rugi Komprehensif Perusahaan & OPEX
            </h2>
            <p className="text-xs text-text-muted">
              Pilar Akuntansi Periodik: Mengurangkan Laba Kotor SPK dengan Beban Operasional Berkala untuk menghasilkan EBIT.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 text-xs text-text-muted bg-surface-hover px-2.5 py-1.5 rounded-lg border border-border">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <span>Tahun Buku:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-text font-mono text-xs focus:outline-hidden cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="bg-surface text-text">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={fetchData}
            className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-text-muted hover:text-text border border-border transition"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedOpexMonth(new Date().toISOString().slice(0, 7));
              setIsOpexModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Beban OPEX</span>
          </button>
        </div>
      </div>

      {/* Corporate Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-surface border border-border">
          <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
            Total Omzet Penjualan
          </div>
          <div className="text-base lg:text-lg font-bold font-mono text-text mt-1">
            {formatRupiah(totalRev)}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            {totalSpk} SPK Teregistrasi
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border">
          <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
            Total HPP Proyek (COGS)
          </div>
          <div className="text-base lg:text-lg font-bold font-mono text-text mt-1">
            {formatRupiah(totalCogs)}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            Material + Borongan + FOH
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border">
          <div className="text-[10px] text-primary font-bold uppercase tracking-wider">
            Total Laba Kotor
          </div>
          <div className="text-base lg:text-lg font-bold font-mono text-primary mt-1">
            {formatRupiah(totalGross)}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            Margin: {totalRev > 0 ? ((totalGross / totalRev) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border">
          <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
            Total OPEX Berkala
          </div>
          <div className="text-base lg:text-lg font-bold font-mono text-rose-400 mt-1">
            {formatRupiah(totalOpex)}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            Beban Operasional Rutin
          </div>
        </div>

        <div className={`p-3.5 rounded-xl border col-span-2 lg:col-span-1 ${
          totalNet >= 0 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Laba Bersih (EBIT)</span>
            {totalNet >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          </div>
          <div className="text-base lg:text-lg font-bold font-mono mt-1">
            {formatRupiah(totalNet)}
          </div>
          <div className="text-[10px] font-mono mt-0.5">
            Net Margin: {avgMargin.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Wave 3: Grafik Empiris Analisis Laba Rugi */}
      <CorporatePnLCharts data={data} />

      {/* Wave 4: Smart Sales Target Solver Engine (CVP Analysis Widget) */}
      <SmartTargetSolverWidget 
        pnlData={data} 
        currentMonthRevenue={activeMonthData ? activeMonthData.total_revenue : 0} 
      />

      {/* Wave 3.1: Tabel Laba Rugi Komprehensif Berjenjang (Statement-Style) */}
      {activeMonthData && (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <h3 className="font-display font-bold text-text text-sm">
                  Laporan Laba Rugi Komprehensif Berjenjang — Bulan {formatMonthLabel(activeMonthData.report_month)}
                </h3>
              </div>
              <p className="text-xs text-text-muted">
                Struktur berjenjang standar: Omzet Penjualan &rarr; HPP Proyek &rarr; Laba Kotor &rarr; Rincian OPEX &rarr; Laba Bersih Usaha (EBIT).
              </p>
            </div>

            {/* Selector Bulan untuk Tampilan Berjenjang */}
            {data.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Pilih Bulan:</span>
                <select
                  value={activeMonthIndex}
                  onChange={e => setActiveMonthIndex(Number(e.target.value))}
                  className="bg-surface border border-border text-text rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-hidden"
                >
                  {data.map((m, idx) => (
                    <option key={m.report_month} value={idx}>
                      {formatMonthLabel(m.report_month)} ({m.total_spk_count} SPK)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="border border-border rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-surface-hover/70 text-text font-bold border-b border-border text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 w-7/12">Komponen Pembukuan (Akun Finansial)</th>
                  <th className="py-2.5 px-4 text-right w-3/12">Nominal (Rupiah)</th>
                  <th className="py-2.5 px-4 text-center w-2/12">% Terhadap Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* 1. Omzet / Pendapatan Penjualan */}
                <tr className="bg-blue-500/5 font-semibold text-text">
                  <td className="py-3 px-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>1. Omzet / Pendapatan Penjualan SPK</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-blue-400">
                    {formatRupiah(activeMonthData.total_revenue)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-text-muted">
                    100.0%
                  </td>
                </tr>

                {/* 2. HPP Proyek (COGS) */}
                <tr className="text-text-muted font-medium">
                  <td className="py-2 px-6 pl-8">
                    &bull; HPP Bahan Baku / Material Terpakai
                  </td>
                  <td className="py-2 px-4 text-right font-mono">
                    ({formatRupiah(activeMonthData.total_material_cogs)})
                  </td>
                  <td className="py-2 px-4 text-center font-mono text-text-muted">
                    {activeMonthData.total_revenue > 0 ? ((activeMonthData.total_material_cogs / activeMonthData.total_revenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="text-text-muted font-medium">
                  <td className="py-2 px-6 pl-8">
                    &bull; HPP Tenaga Kerja Borongan (Labor)
                  </td>
                  <td className="py-2 px-4 text-right font-mono">
                    ({formatRupiah(activeMonthData.total_labor_cogs)})
                  </td>
                  <td className="py-2 px-4 text-center font-mono text-text-muted">
                    {activeMonthData.total_revenue > 0 ? ((activeMonthData.total_labor_cogs / activeMonthData.total_revenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="text-text-muted font-medium">
                  <td className="py-2 px-6 pl-8">
                    &bull; HPP Overhead Stasiun Kerja (FOH)
                  </td>
                  <td className="py-2 px-4 text-right font-mono">
                    ({formatRupiah(activeMonthData.total_foh_cogs)})
                  </td>
                  <td className="py-2 px-4 text-center font-mono text-text-muted">
                    {activeMonthData.total_revenue > 0 ? ((activeMonthData.total_foh_cogs / activeMonthData.total_revenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="bg-amber-500/5 font-semibold text-text">
                  <td className="py-2.5 px-4 pl-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>2. Total HPP Proyek (Cost of Goods Sold)</span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-400">
                    ({formatRupiah(activeMonthData.total_cogs)})
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-400">
                    {activeMonthData.total_revenue > 0 ? ((activeMonthData.total_cogs / activeMonthData.total_revenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                {/* 3. Laba Kotor (Gross Profit) */}
                <tr className="bg-primary/5 font-bold text-text">
                  <td className="py-3 px-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span>3. Laba Kotor SPK (Gross Profit)</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-primary font-bold">
                    {formatRupiah(activeMonthData.gross_profit)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-primary font-bold">
                    {activeMonthData.total_revenue > 0 ? ((activeMonthData.gross_profit / activeMonthData.total_revenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                {/* 4. Daftar Rincian OPEX */}
                <tr className="text-text-muted font-medium">
                  <td className="py-2 px-6 pl-8">
                    &bull; Beban Gaji & Tunjangan Staf Tetap
                  </td>
                  <td className="py-2 px-4 text-right font-mono">
                    ({formatRupiah(activeMonthData.opex_salary)})
                  </td>
                  <td className="py-2 px-4 text-center font-mono text-text-muted">
                    {activeMonthData.total_revenue > 0 ? ((activeMonthData.opex_salary / activeMonthData.total_revenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="text-text-muted font-medium">
                  <td className="py-2 px-6 pl-8">
                    &bull; Beban Token Listrik & Utilitas Bengkel
                  </td>
                  <td className="py-2 px-4 text-right font-mono">
                    ({formatRupiah(activeMonthData.opex_utility)})
                  </td>
                  <td className="py-2 px-4 text-center font-mono text-text-muted">
                    {activeMonthData.total_revenue > 0 ? ((activeMonthData.opex_utility / activeMonthData.total_revenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="text-text-muted font-medium">
                  <td className="py-2 px-6 pl-8">
                    &bull; Beban Amortisasi Sewa Tempat / Gedung
                  </td>
                  <td className="py-2 px-4 text-right font-mono">
                    ({formatRupiah(activeMonthData.opex_rent)})
                  </td>
                  <td className="py-2 px-4 text-center font-mono text-text-muted">
                    {activeMonthData.total_revenue > 0 ? ((activeMonthData.opex_rent / activeMonthData.total_revenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="text-text-muted font-medium">
                  <td className="py-2 px-6 pl-8">
                    &bull; Beban Kebersihan & Amenities Fasilitas
                  </td>
                  <td className="py-2 px-4 text-right font-mono">
                    ({formatRupiah(activeMonthData.opex_amenities)})
                  </td>
                  <td className="py-2 px-4 text-center font-mono text-text-muted">
                    {activeMonthData.total_revenue > 0 ? ((activeMonthData.opex_amenities / activeMonthData.total_revenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="text-text-muted font-medium">
                  <td className="py-2 px-6 pl-8">
                    &bull; Beban Operasional Lain-lain
                  </td>
                  <td className="py-2 px-4 text-right font-mono">
                    ({formatRupiah(activeMonthData.opex_others)})
                  </td>
                  <td className="py-2 px-4 text-center font-mono text-text-muted">
                    {activeMonthData.total_revenue > 0 ? ((activeMonthData.opex_others / activeMonthData.total_revenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="bg-rose-500/5 font-semibold text-text">
                  <td className="py-2.5 px-4 pl-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span>4. Total Beban Operasional Berkala (OPEX)</span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-400">
                    ({formatRupiah(activeMonthData.total_opex)})
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono font-bold text-rose-400">
                    {activeMonthData.total_revenue > 0 ? ((activeMonthData.total_opex / activeMonthData.total_revenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                {/* 5. Laba Bersih Usaha (Net Operating Profit / EBIT) */}
                <tr className={`font-bold ${
                  activeMonthData.net_operating_profit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  <td className="py-3.5 px-4 flex items-center gap-2 text-sm">
                    {activeMonthData.net_operating_profit >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                    )}
                    <span>5. Laba Bersih Usaha Perusahaan (Net EBIT)</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-base font-bold">
                    {formatRupiah(activeMonthData.net_operating_profit)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-sm font-bold">
                    {activeMonthData.net_margin_percentage >= 0 ? '+' : ''}{activeMonthData.net_margin_percentage}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabel Ringkas Bulanan */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div>
            <h3 className="font-display font-bold text-text text-sm">
              Rekapitulasi Bulanan Tahun {selectedYear}
            </h3>
            <p className="text-xs text-text-muted">
              Pilih baris untuk mengelola transaksi beban OPEX atau melihat perbandingan.
            </p>
          </div>
          <span className="text-xs font-mono text-text-muted">
            {data.length} Bulan Terdata
          </span>
        </div>

        {error && (
          <div className="p-4 m-4 bg-status-danger/10 border border-status-danger/30 rounded-xl text-status-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-text-muted text-xs">
            <Clock className="w-6 h-6 mx-auto mb-2 animate-spin text-primary" />
            <span>Memuat data laba rugi perusahaan...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-xs">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30 text-primary" />
            <span>Belum ada data laba rugi untuk tahun {selectedYear}.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-text-muted text-[10px] uppercase border-b border-border font-semibold">
                <tr>
                  <th className="py-3 px-4">Bulan Buku</th>
                  <th className="py-3 px-3 text-center">SPK</th>
                  <th className="py-3 px-3 text-right">Omzet</th>
                  <th className="py-3 px-3 text-right">HPP (COGS)</th>
                  <th className="py-3 px-3 text-right">Laba Kotor</th>
                  <th className="py-3 px-3 text-right">Beban OPEX</th>
                  <th className="py-3 px-3 text-right">Laba Bersih (EBIT)</th>
                  <th className="py-3 px-3 text-center">Net Margin</th>
                  <th className="py-3 px-4 text-center">Aksi OPEX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((row, idx) => {
                  const isPositive = row.net_operating_profit >= 0;
                  const isSelected = activeMonthIndex === idx;

                  return (
                    <tr 
                      key={row.report_month} 
                      className={`hover:bg-surface-hover/50 transition cursor-pointer ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => setActiveMonthIndex(idx)}
                    >
                      <td className="py-3 px-4 font-semibold text-text flex items-center gap-1.5">
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-primary rotate-90' : 'text-text-muted'}`} />
                        <span>{formatMonthLabel(row.report_month)}</span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-text">
                        {row.total_spk_count}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-text">
                        {formatRupiah(row.total_revenue)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-amber-400 font-medium">
                        {formatRupiah(row.total_cogs)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-primary font-semibold">
                        {formatRupiah(row.gross_profit)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-rose-400 font-semibold">
                        {formatRupiah(row.total_opex)}
                      </td>

                      <td className={`py-3 px-3 text-right font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatRupiah(row.net_operating_profit)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          isPositive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {row.net_margin_percentage >= 0 ? '+' : ''}{row.net_margin_percentage}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenOpexForMonth(row.report_month);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition"
                        >
                          Kelola OPEX
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Pencatatan Biaya Berkala */}
      <OperatingExpenseManagerModal
        isOpen={isOpexModalOpen}
        onClose={() => setIsOpexModalOpen(false)}
        defaultMonth={selectedOpexMonth}
        onExpenseAdded={fetchData}
      />
    </div>
  );
};
