import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Download, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import { financialReportsService } from '../../../services/financialReportsService';
import { exportToExcel, exportToCsv } from '../../../utils/exportFinancialReports';
import type { SpkJobProfitability } from '../../../types/financialReports';

interface JobProfitabilityTabProps {
  globalSearch?: string;
  startDate?: string;
  endDate?: string;
  refreshTrigger?: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const JobProfitabilityTab: React.FC<JobProfitabilityTabProps> = ({
  globalSearch = '',
  startDate,
  endDate,
  refreshTrigger,
}) => {
  const [data, setData] = useState<SpkJobProfitability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local filters
  const [localSearch, setLocalSearch] = useState('');
  const [spkStatus, setSpkStatus] = useState<string>('ALL');
  const [paymentStatus, setPaymentStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'revenue' | 'profit' | 'margin'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeSearch = localSearch.trim() || globalSearch.trim();
      const result = await financialReportsService.getJobProfitability({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        searchQuery: activeSearch || undefined,
        spkStatus: spkStatus !== 'ALL' ? spkStatus : undefined,
        paymentStatus: paymentStatus !== 'ALL' ? paymentStatus : undefined,
      });
      const operationalData = result.filter(
        row => !['DRAFT', 'PENDING_PAYMENT'].includes(String(row.spk_status || '').toUpperCase())
      );
      setData(operationalData);
    } catch (err: any) {
      console.error('JobProfitabilityTab fetch error:', err);
      setError(err.message || 'Gagal memuat data profitabilitas proyek.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, globalSearch, localSearch, spkStatus, paymentStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  // Sorting
  const sortedData = [...data].sort((a, b) => {
    let diff = 0;
    if (sortBy === 'date') {
      diff = new Date(a.registration_date).getTime() - new Date(b.registration_date).getTime();
    } else if (sortBy === 'revenue') {
      diff = a.total_revenue - b.total_revenue;
    } else if (sortBy === 'profit') {
      diff = a.gross_profit - b.gross_profit;
    } else if (sortBy === 'margin') {
      diff = a.gross_margin_percentage - b.gross_margin_percentage;
    }
    return sortAsc ? diff : -diff;
  });

  const toggleSort = (column: 'date' | 'revenue' | 'profit' | 'margin') => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(false);
    }
  };


  // Aggregates for footer
  const totalRevenueSum = sortedData.reduce((acc, curr) => acc + curr.total_revenue, 0);
  const totalPackageProfitSum = sortedData.reduce((acc, curr) => acc + (curr.package_profit || 0), 0);
  const totalGranularMatProfitSum = sortedData.reduce((acc, curr) => acc + (curr.granular_material_profit || 0), 0);
  const totalGranularOtherProfitSum = sortedData.reduce((acc, curr) => acc + (curr.granular_other_profit || 0), 0);
  const totalMaterialSum = sortedData.reduce((acc, curr) => acc + curr.actual_material_cost, 0);
  const totalLaborSum = sortedData.reduce((acc, curr) => acc + curr.actual_labor_cost, 0);
  const totalOverheadSum = sortedData.reduce((acc, curr) => acc + (curr.actual_overhead_cost || 0), 0);
  const totalGrossProfitSum = sortedData.reduce((acc, curr) => acc + curr.gross_profit, 0);
  const avgMargin = totalRevenueSum > 0 ? (totalGrossProfitSum / totalRevenueSum) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* 3-Pillar Segregated Profit Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface/80 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 font-mono uppercase">
              <span>📦</span>
              <span>Profit Paket Assembly (BOM)</span>
            </div>
            <div className="text-lg font-bold font-mono text-text mt-1">
              {formatCurrency(totalPackageProfitSum)}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              Karya manufaktur mandiri paket barang jadi
            </div>
          </div>
        </div>

        <div className="bg-surface/80 border border-cyan-500/30 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 font-mono uppercase">
              <span>📋</span>
              <span>Profit Material Granular</span>
            </div>
            <div className="text-lg font-bold font-mono text-text mt-1">
              {formatCurrency(totalGranularMatProfitSum)}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              Markup margin bahan baku lepasan
            </div>
          </div>
        </div>

        <div className="bg-surface/80 border border-purple-500/30 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 font-mono uppercase">
              <span>⚙️</span>
              <span>Profit Jasa & Overhead Lepas</span>
            </div>
            <div className="text-lg font-bold font-mono text-text mt-1">
              {formatCurrency(totalGranularOtherProfitSum)}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              Kontribusi laba jasa borongan & operasional
            </div>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface/60 p-4 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Filter lokal SPK / Customer..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-background/80 border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={spkStatus}
            onChange={(e) => setSpkStatus(e.target.value)}
            className="bg-background/80 border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua SPK Operasional (Non-Draft)</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="bg-background/80 border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Status Bayar</option>
            <option value="PAID">LUNAS (PAID)</option>
            <option value="PARTIAL">SEBAGIAN (PARTIAL)</option>
            <option value="UNPAID">BELUM BAYAR (UNPAID)</option>
            <option value="UNBILLED">BELUM DITAGIH (UNBILLED)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover hover:bg-surface-active text-text rounded-lg border border-border text-sm font-medium transition"
            title="Refresh tabel"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <button
            onClick={() => exportToExcel('profitability', sortedData)}
            disabled={!sortedData.length}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium transition disabled:opacity-50"
            title="Unduh format Excel (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => exportToCsv('profitability', sortedData)}
            disabled={!sortedData.length}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover hover:bg-surface-active text-text-muted hover:text-text border border-border rounded-lg text-sm font-medium transition disabled:opacity-50"
            title="Unduh format CSV (.csv)"
          >
            <span>CSV</span>
          </button>
        </div>
      </div>


      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl text-status-danger text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-surface-hover/80 text-text-muted font-mono uppercase text-[11px] border-b border-border">
              <tr>
                <th className="py-3 px-4">No. SPK & Customer</th>
                <th 
                  className="py-3 px-4 cursor-pointer hover:text-text transition"
                  onClick={() => toggleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    <span>Tgl Masuk</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:text-text transition"
                  onClick={() => toggleSort('revenue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Pendapatan (Tagihan)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                {/* Segregated Profit Columns */}
                <th className="py-3 px-3 text-right text-amber-400" title="Profit Penjualan Paket Barang Jadi (BOM)">
                  Profit Paket (BOM)
                </th>
                <th className="py-3 px-3 text-right text-cyan-400" title="Markup Profit Penjualan Material Lepas (Granular)">
                  Profit Mat. Granular
                </th>
                <th className="py-3 px-3 text-right text-purple-400" title="Margin Pekerjaan Jasa Lepas & Overhead Bebas">
                  Profit Jasa & FOH
                </th>
                <th className="py-3 px-3 text-right">Biaya Bahan</th>
                <th className="py-3 px-3 text-right">Biaya Borongan</th>
                <th className="py-3 px-3 text-right">Biaya Overhead (FOH)</th>
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:text-text transition"
                  onClick={() => toggleSort('profit')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Laba Kotor (Gross)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3 px-4 text-center cursor-pointer hover:text-text transition"
                  onClick={() => toggleSort('margin')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Margin %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Status Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span>Memuat data profitabilitas...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-text-muted">
                    Tidak ada catatan SPK yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => {
                  const margin = row.gross_margin_percentage;
                  const isNegative = margin < 0 || row.gross_profit < 0;
                  const isLowMargin = margin >= 0 && margin < 15;
                  const isHealthy = margin >= 25;

                  let marginBadge = 'bg-status-danger/20 text-status-danger border-status-danger/40';
                  if (isHealthy) {
                    marginBadge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                  } else if (isLowMargin) {
                    marginBadge = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
                  }

                  let rowHighlight = '';
                  if (isNegative) {
                    rowHighlight = 'bg-rose-950/20 hover:bg-rose-950/30';
                  } else if (isLowMargin) {
                    rowHighlight = 'bg-amber-950/10 hover:bg-amber-950/20';
                  } else {
                    rowHighlight = 'hover:bg-surface-hover/50';
                  }

                  return (
                    <tr key={row.spk_id} className={`transition-colors ${rowHighlight}`}>
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-text">
                          {row.spk_number}
                        </div>
                        <div className="text-xs text-text-muted">
                          {row.customer_name} {row.vehicle_plate && `• ${row.vehicle_plate}`}
                        </div>
                        <div className="mt-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-hover border border-border text-text-muted">
                            {row.spk_status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-text-muted whitespace-nowrap">
                        {new Date(row.registration_date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-text">
                        {formatCurrency(row.total_revenue)}
                      </td>
                      {/* Segregated Profit Columns */}
                      <td className="py-3 px-3 text-right font-mono text-amber-400 font-medium">
                        {formatCurrency(row.package_profit || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-cyan-400 font-medium">
                        {formatCurrency(row.granular_material_profit || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-purple-400 font-medium">
                        {formatCurrency(row.granular_other_profit || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-text-muted">
                        {formatCurrency(row.actual_material_cost)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-text-muted">
                        {formatCurrency(row.actual_labor_cost)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-text-muted">
                        {formatCurrency(row.actual_overhead_cost || 0)}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${row.gross_profit >= 0 ? 'text-emerald-400' : 'text-status-danger'}`}>
                        {formatCurrency(row.gross_profit)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block font-mono text-xs px-2.5 py-0.5 rounded-full border font-bold ${marginBadge}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                          row.payment_status === 'PAID'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : row.payment_status === 'PARTIAL'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}>
                          {row.payment_status === 'PAID' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {row.payment_status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer with Summary Aggregates */}
            {sortedData.length > 0 && (
              <tfoot className="bg-surface-hover/90 font-mono font-bold text-xs border-t-2 border-border">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-text uppercase">
                    Total Akumulasi ({sortedData.length} SPK):
                  </td>
                  <td className="py-3 px-4 text-right text-text">
                    {formatCurrency(totalRevenueSum)}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-400">
                    {formatCurrency(totalPackageProfitSum)}
                  </td>
                  <td className="py-3 px-3 text-right text-cyan-400">
                    {formatCurrency(totalGranularMatProfitSum)}
                  </td>
                  <td className="py-3 px-3 text-right text-purple-400">
                    {formatCurrency(totalGranularOtherProfitSum)}
                  </td>
                  <td className="py-3 px-3 text-right text-text-muted">
                    {formatCurrency(totalMaterialSum)}
                  </td>
                  <td className="py-3 px-3 text-right text-text-muted">
                    {formatCurrency(totalLaborSum)}
                  </td>
                  <td className="py-3 px-3 text-right text-text-muted">
                    {formatCurrency(totalOverheadSum)}
                  </td>
                  <td className={`py-3 px-4 text-right ${totalGrossProfitSum >= 0 ? 'text-emerald-400' : 'text-status-danger'}`}>
                    {formatCurrency(totalGrossProfitSum)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-emerald-400">
                      {avgMargin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-text-muted">
                    -
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
