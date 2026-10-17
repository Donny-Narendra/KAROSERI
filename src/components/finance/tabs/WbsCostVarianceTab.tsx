import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Download, 
  RefreshCw, 
  AlertTriangle,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { financialReportsService } from '../../../services/financialReportsService';
import { exportToExcel, exportToCsv } from '../../../utils/exportFinancialReports';
import { supabase } from '../../../lib/supabaseClient';
import type { WbsCostVariance } from '../../../types/financialReports';

interface WbsCostVarianceTabProps {
  globalSearch?: string;
  refreshTrigger?: number;
}

interface SpkOption {
  id: string;
  spk_no: string;
  customer_name: string;
  vehicle_plate?: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const WbsCostVarianceTab: React.FC<WbsCostVarianceTabProps> = ({
  globalSearch = '',
  refreshTrigger,
}) => {
  const [data, setData] = useState<WbsCostVariance[]>([]);
  const [spkList, setSpkList] = useState<SpkOption[]>([]);
  const [selectedSpkId, setSelectedSpkId] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [overBudgetOnly, setOverBudgetOnly] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load distinct SPKs for dropdown
  useEffect(() => {
    const loadSpkOptions = async () => {
      try {
        const { data: spks } = await supabase
          .from('spk')
          .select('id, spk_no, customer_name, vehicle_plate')
          .order('created_at', { ascending: false })
          .limit(100);
        if (spks) {
          setSpkList(spks);
        }
      } catch (e) {
        console.error('Failed to load SPK list for variance tab:', e);
      }
    };
    loadSpkOptions();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeSearch = localSearch.trim() || globalSearch.trim();
      const result = await financialReportsService.getWbsCostVariance({
        spkId: selectedSpkId !== 'ALL' ? selectedSpkId : undefined,
        wbsStage: selectedStage !== 'ALL' ? selectedStage : undefined,
        searchQuery: activeSearch || undefined,
        overBudgetOnly: overBudgetOnly,
      });
      setData(result);
    } catch (err: any) {
      console.error('WbsCostVarianceTab fetch error:', err);
      setError(err.message || 'Gagal memuat analisis varian biaya WBS.');
    } finally {
      setLoading(false);
    }
  }, [selectedSpkId, selectedStage, localSearch, globalSearch, overBudgetOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);


  // Aggregates
  const totalMatBudget = data.reduce((a, b) => a + b.total_material_budget, 0);
  const totalMatSpent = data.reduce((a, b) => a + b.actual_material_spent, 0);
  const totalMatVariance = data.reduce((a, b) => a + b.material_variance, 0);

  const totalLaborBudget = data.reduce((a, b) => a + b.total_labor_budget, 0);
  const totalLaborSpent = data.reduce((a, b) => a + b.actual_labor_spent, 0);
  const totalLaborVariance = data.reduce((a, b) => a + b.labor_variance, 0);

  const totalOverheadBudget = data.reduce((a, b) => a + (b.total_overhead_budget || 0), 0);
  const totalOverheadSpent = data.reduce((a, b) => a + (b.actual_overhead_spent || 0), 0);
  const totalOverheadVariance = data.reduce((a, b) => a + (b.overhead_variance || 0), 0);

  const totalOverallVariance = totalMatVariance + totalLaborVariance + totalOverheadVariance;

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface/60 p-4 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3">
          {/* SPK Selector Dropdown */}
          <div className="min-w-[260px]">
            <select
              value={selectedSpkId}
              onChange={(e) => setSelectedSpkId(e.target.value)}
              className="w-full bg-background/80 border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary font-mono"
            >
              <option value="ALL">-- Tampilkan Semua SPK --</option>
              {spkList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.spk_no} - {s.customer_name} {s.vehicle_plate ? `(${s.vehicle_plate})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* WBS Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="bg-background/80 border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Tahapan WBS</option>
            <option value="WBS 1">WBS 1 (Chassis / Rangka Bawah)</option>
            <option value="WBS 2">WBS 2 (Lantai, Dinding, Rangka Bodi)</option>
            <option value="WBS 3">WBS 3 (Atap & Eksterior)</option>
            <option value="WBS 4">WBS 4 (Pengecatan & Finishing)</option>
            <option value="WBS 5">WBS 5 (Instalasi Kelistrikan & Aksesoris)</option>
          </select>

          {/* Local Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cari SPK / Plat..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-background/80 border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
            />
          </div>

          {/* Over Budget Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-text select-none bg-background/60 px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover transition">
            <input
              type="checkbox"
              checked={overBudgetOnly}
              onChange={(e) => setOverBudgetOnly(e.target.checked)}
              className="accent-primary rounded"
            />
            <span className="text-amber-400 font-medium">Hanya Over-Budget (Boros)</span>
          </label>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover hover:bg-surface-active text-text rounded-lg border border-border text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <button
            onClick={() => exportToExcel('variance', data)}
            disabled={!data.length}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium transition disabled:opacity-50"
            title="Unduh format Excel (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => exportToCsv('variance', data)}
            disabled={!data.length}
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

      {/* Table Container */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-surface-hover/80 text-text-muted font-mono uppercase text-[11px] border-b border-border">
              <tr>
                <th className="py-3 px-4">SPK & Pelanggan</th>
                <th className="py-3 px-4">Tahapan WBS</th>
                <th className="py-3 px-4 text-right">Pagu Material</th>
                <th className="py-3 px-4 text-right">Realisasi Material</th>
                <th className="py-3 px-4 text-right">Varian Material (+/-)</th>
                <th className="py-3 px-4 text-right">Pagu Jasa</th>
                <th className="py-3 px-4 text-right">Realisasi Jasa</th>
                <th className="py-3 px-4 text-right">Varian Jasa (+/-)</th>
                <th className="py-3 px-4 text-right">Pagu FOH</th>
                <th className="py-3 px-4 text-right">Realisasi FOH</th>
                <th className="py-3 px-4 text-right">Varian FOH (+/-)</th>
                <th className="py-3 px-4 text-center">Status Varian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span>Memuat analisis varian anggaran WBS...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-text-muted">
                    Tidak ada data varian WBS yang sesuai filter.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const isMatOver = row.material_variance < 0;
                  const isLaborOver = row.labor_variance < 0;
                  const isOverheadOver = (row.overhead_variance || 0) < 0;
                  const totalVar = row.material_variance + row.labor_variance + (row.overhead_variance || 0);
                  const isTotalOver = totalVar < 0;

                  return (
                    <tr 
                      key={`${row.spk_id}-${row.wbs_stage}-${idx}`} 
                      className={`hover:bg-surface-hover/50 transition-colors ${
                        isTotalOver ? 'bg-rose-950/15' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-text">
                          {row.spk_number}
                        </div>
                        <div className="text-xs text-text-muted">
                          {row.customer_name} {row.vehicle_plate && `(${row.vehicle_plate})`}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-hover border border-border text-primary font-medium">
                          {row.wbs_stage}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-text">
                        {formatCurrency(row.total_material_budget)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-text-muted">
                        {formatCurrency(row.actual_material_spent)}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${
                        isMatOver ? 'text-status-danger' : 'text-emerald-400'
                      }`}>
                        {formatCurrency(row.material_variance)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-text">
                        {formatCurrency(row.total_labor_budget)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-text-muted">
                        {formatCurrency(row.actual_labor_spent)}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${
                        isLaborOver ? 'text-status-danger' : 'text-emerald-400'
                      }`}>
                        {formatCurrency(row.labor_variance)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-text">
                        {formatCurrency(row.total_overhead_budget || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-text-muted">
                        {formatCurrency(row.actual_overhead_spent || 0)}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${
                        isOverheadOver ? 'text-status-danger' : 'text-emerald-400'
                      }`}>
                        {formatCurrency(row.overhead_variance || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                          isTotalOver
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {isTotalOver ? (
                            <>
                              <TrendingDown className="w-3 h-3 text-rose-400" />
                              <span>OVERBUDGET</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-3 h-3 text-emerald-400" />
                              <span>HEMAT</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer */}
            {data.length > 0 && (
              <tfoot className="bg-surface-hover/90 font-mono font-bold text-xs border-t-2 border-border">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-text uppercase">
                    Total Akumulasi:
                  </td>
                  <td className="py-3 px-4 text-right text-text">
                    {formatCurrency(totalMatBudget)}
                  </td>
                  <td className="py-3 px-4 text-right text-text-muted">
                    {formatCurrency(totalMatSpent)}
                  </td>
                  <td className={`py-3 px-4 text-right ${totalMatVariance < 0 ? 'text-status-danger' : 'text-emerald-400'}`}>
                    {formatCurrency(totalMatVariance)}
                  </td>
                  <td className="py-3 px-4 text-right text-text">
                    {formatCurrency(totalLaborBudget)}
                  </td>
                  <td className="py-3 px-4 text-right text-text-muted">
                    {formatCurrency(totalLaborSpent)}
                  </td>
                  <td className={`py-3 px-4 text-right ${totalLaborVariance < 0 ? 'text-status-danger' : 'text-emerald-400'}`}>
                    {formatCurrency(totalLaborVariance)}
                  </td>
                  <td className="py-3 px-4 text-right text-text">
                    {formatCurrency(totalOverheadBudget)}
                  </td>
                  <td className="py-3 px-4 text-right text-text-muted">
                    {formatCurrency(totalOverheadSpent)}
                  </td>
                  <td className={`py-3 px-4 text-right ${totalOverheadVariance < 0 ? 'text-status-danger' : 'text-emerald-400'}`}>
                    {formatCurrency(totalOverheadVariance)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                      totalOverallVariance < 0 ? 'bg-status-danger/20 text-status-danger' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {totalOverallVariance < 0 ? 'DEFISIT TOTAL' : 'SURPLUS TOTAL'}
                    </span>
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
