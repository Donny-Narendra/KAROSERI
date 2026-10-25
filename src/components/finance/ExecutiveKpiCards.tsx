import React from 'react';
import { 
  TrendingUp, 
  Package, 
  Users, 
  Activity, 
  DollarSign, 
  AlertCircle,
  Car
} from 'lucide-react';
import type { FinancialExecutiveSummary } from '../../types/financialReports';
import { formatRupiah } from '../../utils/formatters';

interface ExecutiveKpiCardsProps {
  summary: FinancialExecutiveSummary | null;
  isLoading: boolean;
}

const formatCurrency = (amount: number): string => {
  return formatRupiah(amount);
};

export const ExecutiveKpiCards: React.FC<ExecutiveKpiCardsProps> = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div
            key={idx}
            className="bg-surface/80 border border-border/80 rounded-xl p-5 animate-pulse flex flex-col justify-between h-36 overflow-hidden min-w-0"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-surface-hover rounded" />
              <div className="h-9 w-9 bg-surface-hover rounded-lg" />
            </div>
            <div className="space-y-2 mt-3">
              <div className="h-7 w-36 bg-surface-hover rounded" />
              <div className="h-3.5 w-20 bg-surface-hover rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const s: FinancialExecutiveSummary = summary || {
    total_projects: 0,
    total_revenue: 0,
    total_actual_material_cost: 0,
    total_actual_labor_cost: 0,
    total_actual_overhead_cost: 0,
    total_cogs: 0,
    total_gross_profit: 0,
    average_gross_margin: 0,
    total_inventory_valuation: 0,
    total_inventory_market_value: 0,
    total_outstanding_receivables: 0,
    units_pending_handover: 0,
  };

  const totalRevenue = Number(s.total_revenue) || 0;
  const materialCost = Number(s.total_actual_material_cost) || 0;
  const laborCost = Number(s.total_actual_labor_cost) || 0;
  const overheadCost = Number(s.total_actual_overhead_cost) || 0;
  const grossProfit = Number(s.total_gross_profit) || 0;
  const margin = Number(s.average_gross_margin) || 0;

  // Precise 3-element COGS calculation: HPP = Bahan Baku + Borongan Mandor + Overhead Pabrikasi
  const componentHpp = materialCost + laborCost + overheadCost;
  const totalHpp = componentHpp > 0 ? componentHpp : (Number(s.total_cogs) || 0);

  // Percentage shares relative to Revenue
  const materialPercent = totalRevenue > 0 ? (materialCost / totalRevenue) * 100 : 0;
  const laborPercent = totalRevenue > 0 ? (laborCost / totalRevenue) * 100 : 0;
  const overheadPercent = totalRevenue > 0 ? (overheadCost / totalRevenue) * 100 : 0;

  // Margin classification badge
  let marginBadgeClass = 'bg-rose-950/80 text-rose-400 border-rose-800';
  let marginLabel = 'Rendah (<10%)';
  if (margin >= 25) {
    marginBadgeClass = 'bg-emerald-950/80 text-emerald-400 border-emerald-800';
    marginLabel = 'Sehat (≥25%)';
  } else if (margin >= 10) {
    marginBadgeClass = 'bg-amber-950/80 text-amber-400 border-amber-800';
    marginLabel = 'Waspada (10-24%)';
  }

  const marginValue = summary?.average_gross_margin !== undefined 
    ? (Number.isInteger(Number(summary.average_gross_margin)) ? Number(summary.average_gross_margin).toFixed(1) : summary.average_gross_margin)
    : margin.toFixed(1);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Omzet SPK (Revenue) */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-secondary/50 transition-all duration-200 hover:shadow-lg hover:shadow-secondary/5 flex flex-col justify-between overflow-hidden min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            1. Total Omzet SPK
          </span>
          <div className="w-9 h-9 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold font-mono text-text tracking-tight truncate" title={formatCurrency(totalRevenue)}>
            {formatCurrency(totalRevenue)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
            <span className="font-semibold text-secondary">{s.total_projects} Proyek</span>
            <span>terdaftar / aktif</span>
          </div>
        </div>
      </div>

      {/* 2. Total Biaya Bahan Baku Riil (Goods Issued) */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-amber-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/5 flex flex-col justify-between overflow-hidden min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            2. Biaya Bahan Baku Riil
          </span>
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold font-mono text-amber-400 tracking-tight truncate" title={formatCurrency(materialCost)}>
            {formatCurrency(materialCost)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-text-muted font-mono">{materialPercent.toFixed(1)}% dari Omzet</span>
            <span className="text-[11px] font-mono text-text-muted/80">Barang Keluar</span>
          </div>
        </div>
      </div>

      {/* 3. Total Biaya Borongan Mandor Terbayar */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-violet-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/5 flex flex-col justify-between overflow-hidden min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            3. Borongan Mandor
          </span>
          <div className="w-9 h-9 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold font-mono text-violet-400 tracking-tight truncate" title={formatCurrency(laborCost)}>
            {formatCurrency(laborCost)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-text-muted font-mono">{laborPercent.toFixed(1)}% dari Omzet</span>
            <span className="text-[11px] font-mono text-text-muted/80">Upah Terbayar</span>
          </div>
        </div>
      </div>

      {/* 4. Biaya Overhead Pabrikasi (FOH) */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-purple-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/5 flex flex-col justify-between overflow-hidden min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            4. Biaya Overhead Pabrikasi
          </span>
          <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold font-mono text-purple-400 tracking-tight truncate" title={formatCurrency(overheadCost)}>
            {formatCurrency(overheadCost)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-text-muted font-mono">{overheadPercent.toFixed(1)}% dari Omzet</span>
            <span className="text-[11px] font-mono text-text-muted/80">Pemakaian Bay & Utilitas Pabrik</span>
          </div>
        </div>
      </div>

      {/* 5. Estimasi Laba Operasional (Gross Profit) & Margin % */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-emerald-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/5 flex flex-col justify-between overflow-hidden min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            5. Laba Operasional & Margin %
          </span>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${grossProfit >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-status-danger/15 text-status-danger'}`}>
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex flex-wrap items-baseline gap-1.5 my-1.5">
            <span className={`text-base xl:text-lg font-extrabold font-mono tracking-tight ${grossProfit >= 0 ? 'text-emerald-400' : 'text-status-danger'}`}>
              {formatRupiah(summary?.total_gross_profit ?? grossProfit)}
            </span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${marginBadgeClass}`}>
              {marginValue}%
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-text-muted font-mono truncate" title="HPP = Bahan Baku + Borongan Mandor + Overhead Pabrikasi">
              HPP: {formatCurrency(totalHpp)}
            </span>
            <span className="text-[11px] text-text-muted shrink-0 ml-1">{marginLabel}</span>
          </div>
        </div>
      </div>

      {/* 6. Total Piutang & Unit Tertahan Pelunasan */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-rose-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-rose-500/5 flex flex-col justify-between overflow-hidden min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            6. Piutang & Unit Tertahan
          </span>
          <div className="w-9 h-9 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold font-mono text-rose-400 tracking-tight truncate" title={formatCurrency(s.total_outstanding_receivables)}>
            {formatCurrency(s.total_outstanding_receivables)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            {s.units_pending_handover > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-400 font-medium truncate">
                <Car className="w-3.5 h-3.5 shrink-0" />
                {s.units_pending_handover} Unit Belum Lunas
              </span>
            ) : (
              <span className="text-emerald-400 font-medium">Semua Unit Bebas Piutang</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

