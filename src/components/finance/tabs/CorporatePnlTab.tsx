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
  Layers,
  Wrench,
  Factory,
  ChevronRight
} from 'lucide-react';
import { financialReportsService } from '../../../services/financialReportsService';
import type { CorporateMonthlyPnl } from '../../../types/financialReports';
import { formatRupiah } from '../../../utils/formatters';
import { PnlTrendChart } from '../charts/PnlTrendChart';
import { CostBreakdownDoughnut } from '../charts/CostBreakdownDoughnut';
import { SmartTargetSolver } from '../SmartTargetSolver';
import { OpexExpenseModal } from '../OpexExpenseModal';

interface CorporatePnlTabProps {
  refreshTrigger?: number;
}

export const CorporatePnlTab: React.FC<CorporatePnlTabProps> = ({ refreshTrigger }) => {
  const [data, setData] = useState<CorporateMonthlyPnl[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Month filter
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');

  // OPEX Modal state
  const [isOpexModalOpen, setIsOpexModalOpen] = useState<boolean>(false);
  const [selectedOpexMonth, setSelectedOpexMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Expanded row details
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financialReportsService.getCorporateMonthlyPnl({
        startMonth: startMonth || undefined,
        endMonth: endMonth || undefined,
      });
      setData(result);
    } catch (err: any) {
      console.error('Failed to load corporate monthly pnl:', err);
      setError(err.message || 'Gagal memuat laporan laba rugi perusahaan.');
    } finally {
      setLoading(false);
    }
  }, [startMonth, endMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const handleOpenOpexForMonth = (monthStr: string) => {
    setSelectedOpexMonth(monthStr.slice(0, 7));
    setIsOpexModalOpen(true);
  };

  // Format month for display
  const formatMonthLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Aggregate stats across all displayed months
  const totalRev = data.reduce((sum, d) => sum + d.total_revenue, 0);
  const totalCogs = data.reduce((sum, d) => sum + d.total_cogs, 0);
  const totalGross = data.reduce((sum, d) => sum + d.gross_profit, 0);
  const totalOpex = data.reduce((sum, d) => sum + d.total_opex, 0);
  const totalNet = data.reduce((sum, d) => sum + d.net_operating_profit, 0);
  const totalSpk = data.reduce((sum, d) => sum + d.total_spk_count, 0);
  const avgMargin = totalRev > 0 ? (totalNet / totalRev) * 100 : 0;

  // Breakdown across all displayed months
  const totalMat = data.reduce((sum, d) => sum + d.total_material_cogs, 0);
  const totalLab = data.reduce((sum, d) => sum + d.total_labor_cogs, 0);
  const totalFoh = data.reduce((sum, d) => sum + d.total_foh_cogs, 0);

  // Averages per SPK for Solver pre-fill
  const avgRevenuePerSpk = totalSpk > 0 ? Math.round(totalRev / totalSpk) : 50000000;
  const avgVarCostPerSpk = totalSpk > 0 ? Math.round(totalCogs / totalSpk) : 35000000;
  // Current month OPEX (or latest month)
  const latestMonthOpex = data.length > 0 ? data[0].total_opex : 45000000;
  const latestMonthRevenue = data.length > 0 ? data[0].total_revenue : 0;
  const latestMonthSpk = data.length > 0 ? data[0].total_spk_count : 0;

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
              Laporan Laba Rugi Komprehensif Perusahaan (Corporate P&L)
            </h2>
            <p className="text-xs text-text-muted">
              Konsolidasi Laba Kotor SPK dikurangi Beban Operasional Berkala (OPEX) menghasilkan Laba Bersih Usaha (EBIT).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Range Filters */}
          <div className="flex items-center gap-1.5 text-xs text-text-muted bg-surface-hover px-2.5 py-1.5 rounded-lg border border-border">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <span>Dari:</span>
            <input
              type="month"
              value={startMonth}
              onChange={e => setStartMonth(e.target.value)}
              className="bg-transparent text-text font-mono text-xs focus:outline-hidden"
            />
            <span className="text-text-muted/60">—</span>
            <span>Sampai:</span>
            <input
              type="month"
              value={endMonth}
              onChange={e => setEndMonth(e.target.value)}
              className="bg-transparent text-text font-mono text-xs focus:outline-hidden"
            />
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

      {/* Corporate KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-surface border border-border">
          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            Total Revenue
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
            Total HPP (COGS)
          </div>
          <div className="text-base lg:text-lg font-bold font-mono text-text mt-1">
            {formatRupiah(totalCogs)}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            Biaya Langsung Pekerjaan
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border">
          <div className="text-[10px] text-primary font-bold uppercase tracking-wider">
            Laba Kotor (Gross)
          </div>
          <div className="text-base lg:text-lg font-bold font-mono text-primary mt-1">
            {formatRupiah(totalGross)}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            Margin Kotor: {totalRev > 0 ? ((totalGross / totalRev) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border">
          <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
            Beban OPEX Berkala
          </div>
          <div className="text-base lg:text-lg font-bold font-mono text-purple-400 mt-1">
            {formatRupiah(totalOpex)}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            Gaji, Listrik, Sewa, Amenities
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

      {/* Empirical Visual Analytics: Trend Chart & Cost Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <PnlTrendChart data={data} />
        </div>
        <div className="lg:col-span-5">
          <CostBreakdownDoughnut
            materialCost={totalMat}
            laborCost={totalLab}
            overheadCost={totalFoh}
            opexCost={totalOpex}
            monthLabel="Akumulasi Periode"
          />
        </div>
      </div>

      {/* Smart Sales Target Solver (CVP Engine) */}
      <SmartTargetSolver
        defaultFixedCosts={latestMonthOpex > 0 ? latestMonthOpex : 45000000}
        defaultAveragePrice={avgRevenuePerSpk > 0 ? avgRevenuePerSpk : 50000000}
        defaultAverageVarCost={avgVarCostPerSpk > 0 ? avgVarCostPerSpk : 35000000}
        currentActualRevenue={latestMonthRevenue}
        currentSpkCount={latestMonthSpk}
      />

      {/* Monthly Corporate P&L Ledger Table */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div>
            <h3 className="font-display font-bold text-text text-sm">
              Tabel Rekapitulasi Laba Rugi Bulanan
            </h3>
            <p className="text-xs text-text-muted">
              Rincian laporan laba rugi korporat per bulan buku.
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
            <span>Belum ada data laba rugi untuk periode yang dipilih.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-text-muted text-[10px] uppercase border-b border-border font-semibold">
                <tr>
                  <th className="py-3 px-4">Bulan Buku</th>
                  <th className="py-3 px-3 text-center">SPK</th>
                  <th className="py-3 px-3 text-right">Revenue</th>
                  <th className="py-3 px-3 text-right">HPP (COGS)</th>
                  <th className="py-3 px-3 text-right">Laba Kotor</th>
                  <th className="py-3 px-3 text-right">Beban OPEX</th>
                  <th className="py-3 px-3 text-right">Laba Bersih (EBIT)</th>
                  <th className="py-3 px-3 text-center">Net Margin</th>
                  <th className="py-3 px-4 text-center">Aksi OPEX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map(row => {
                  const isExpanded = expandedMonth === row.report_month;
                  const isPositive = row.net_operating_profit >= 0;

                  return (
                    <React.Fragment key={row.report_month}>
                      <tr className="hover:bg-surface-hover/50 transition">
                        <td className="py-3 px-4 font-semibold text-text">
                          <button
                            type="button"
                            onClick={() => setExpandedMonth(isExpanded ? null : row.report_month)}
                            className="flex items-center gap-1.5 text-left hover:text-primary transition"
                          >
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90 text-primary' : 'text-text-muted'}`} />
                            <span>{formatMonthLabel(row.report_month)}</span>
                          </button>
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

                        <td className="py-3 px-3 text-right font-mono text-purple-400 font-semibold">
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
                            onClick={() => handleOpenOpexForMonth(row.report_month)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition"
                          >
                            Kelola OPEX
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Breakdown Drawer */}
                      {isExpanded && (
                        <tr className="bg-surface-hover/30">
                          <td colSpan={9} className="py-3 px-6 border-b border-border/80">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              {/* Rincian COGS */}
                              <div className="p-3 rounded-lg bg-surface border border-border">
                                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Wrench className="w-3.5 h-3.5" />
                                  <span>Rincian HPP (Cost of Goods Sold)</span>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between">
                                    <span className="text-text-muted flex items-center gap-1">
                                      <Layers className="w-3 h-3 text-sky-400" />
                                      <span>Bahan Baku (Material)</span>
                                    </span>
                                    <span className="font-mono text-text">{formatRupiah(row.total_material_cogs)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-muted flex items-center gap-1">
                                      <Wrench className="w-3 h-3 text-amber-400" />
                                      <span>Tenaga Kerja Borongan (Labor)</span>
                                    </span>
                                    <span className="font-mono text-text">{formatRupiah(row.total_labor_cogs)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-muted flex items-center gap-1">
                                      <Factory className="w-3 h-3 text-purple-400" />
                                      <span>Overhead Stasiun Kerja (FOH)</span>
                                    </span>
                                    <span className="font-mono text-text">{formatRupiah(row.total_foh_cogs)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Rincian OPEX */}
                              <div className="p-3 rounded-lg bg-surface border border-border">
                                <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5" />
                                  <span>Rincian Beban Operasional (OPEX)</span>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between">
                                    <span className="text-text-muted">Gaji & Staf Tetap:</span>
                                    <span className="font-mono text-text">{formatRupiah(row.opex_salary)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-muted">Token Listrik & Utilitas:</span>
                                    <span className="font-mono text-text">{formatRupiah(row.opex_utility)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-muted">Amortisasi Sewa Gedung:</span>
                                    <span className="font-mono text-text">{formatRupiah(row.opex_rent)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-muted">Kebersihan & Amenities:</span>
                                    <span className="font-mono text-text">{formatRupiah(row.opex_amenities)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-muted">Lain-lain / Tak Terduga:</span>
                                    <span className="font-mono text-text">{formatRupiah(row.opex_others)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Input/List Beban Operasional */}
      <OpexExpenseModal
        isOpen={isOpexModalOpen}
        onClose={() => setIsOpexModalOpen(false)}
        defaultMonth={selectedOpexMonth}
        onExpenseAdded={fetchData}
      />
    </div>
  );
};
