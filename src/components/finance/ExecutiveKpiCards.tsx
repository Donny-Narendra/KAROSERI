import React from 'react';
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign, 
  AlertCircle,
  Car
} from 'lucide-react';
import type { FinancialExecutiveSummary } from '../../types/financialReports';

interface ExecutiveKpiCardsProps {
  summary: FinancialExecutiveSummary | null;
  isLoading: boolean;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const ExecutiveKpiCards: React.FC<ExecutiveKpiCardsProps> = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((idx) => (
          <div
            key={idx}
            className="bg-surface/80 border border-border/80 rounded-xl p-5 animate-pulse flex flex-col justify-between h-36"
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
  const grossProfit = Number(s.total_gross_profit) || 0;
  const margin = Number(s.average_gross_margin) || 0;

  // Percentage shares relative to Revenue
  const materialPercent = totalRevenue > 0 ? (materialCost / totalRevenue) * 100 : 0;
  const laborPercent = totalRevenue > 0 ? (laborCost / totalRevenue) * 100 : 0;

  // Margin classification badge
  let marginBadgeClass = 'bg-status-danger/20 text-status-danger border-status-danger/40';
  let marginLabel = 'Rendah (<10%)';
  if (margin >= 25) {
    marginBadgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    marginLabel = 'Sehat (≥25%)';
  } else if (margin >= 10) {
    marginBadgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    marginLabel = 'Waspada (10-24%)';
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Omzet SPK (Revenue) */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-secondary/50 transition-all duration-200 hover:shadow-lg hover:shadow-secondary/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            1. Total Omzet (Revenue)
          </span>
          <div className="w-9 h-9 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold font-mono text-text tracking-tight">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
            <span className="font-semibold text-secondary">{s.total_projects} Proyek</span>
            <span>terdaftar / aktif</span>
          </div>
        </div>
      </div>

      {/* 2. Total Biaya Aktual Bahan Baku (Goods Issued) */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-amber-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            2. Biaya Bahan Baku (GI)
          </span>
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
            {formatCurrency(materialCost)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-text-muted font-mono">{materialPercent.toFixed(1)}% dari Omzet</span>
            <span className="text-[11px] font-mono text-text-muted/80">Barang Keluar</span>
          </div>
        </div>
      </div>

      {/* 3. Total Biaya Borongan Mandor Terbayar */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-violet-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            3. Borongan Mandor
          </span>
          <div className="w-9 h-9 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold font-mono text-violet-400 tracking-tight">
            {formatCurrency(laborCost)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-text-muted font-mono">{laborPercent.toFixed(1)}% dari Omzet</span>
            <span className="text-[11px] font-mono text-text-muted/80">Upah Terbayar</span>
          </div>
        </div>
      </div>

      {/* 4. Estimasi Laba Operasional (Gross Profit) & Margin % */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-emerald-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            4. Laba Operasional & Margin
          </span>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${grossProfit >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-status-danger/15 text-status-danger'}`}>
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-1">
            <span className={`text-2xl font-bold font-mono tracking-tight ${grossProfit >= 0 ? 'text-emerald-400' : 'text-status-danger'}`}>
              {formatCurrency(grossProfit)}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border whitespace-nowrap ${marginBadgeClass}`}>
              {margin.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-text-muted font-mono">HPP: {formatCurrency(s.total_cogs)}</span>
            <span className="text-[11px] text-text-muted">{marginLabel}</span>
          </div>
        </div>
      </div>

      {/* 5. Total Piutang & Unit Tertahan Pelunasan */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-rose-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-rose-500/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            5. Piutang & Unit Tertahan
          </span>
          <div className="w-9 h-9 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold font-mono text-rose-400 tracking-tight">
            {formatCurrency(s.total_outstanding_receivables)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            {s.units_pending_handover > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                <Car className="w-3.5 h-3.5" />
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
