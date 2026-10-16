import React from 'react';
import { 
  TrendingUp, 
  Layers, 
  Percent, 
  Warehouse, 
  AlertCircle,
  ArrowUpRight,
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

  const s = summary || {
    total_projects: 0,
    total_revenue: 0,
    total_cogs: 0,
    total_gross_profit: 0,
    average_gross_margin: 0,
    total_inventory_valuation: 0,
    total_inventory_market_value: 0,
    total_outstanding_receivables: 0,
    units_pending_handover: 0,
  };

  // Margin color classification
  const margin = Number(s.average_gross_margin) || 0;
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
      {/* 1. Total Pendapatan / Omzet */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-border-active transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            Total Omzet (Revenue)
          </span>
          <div className="w-9 h-9 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold font-mono text-text tracking-tight">
            {formatCurrency(s.total_revenue)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
            <span className="font-semibold text-secondary">{s.total_projects} Proyek</span>
            <span>terdaftar / aktif</span>
          </div>
        </div>
      </div>

      {/* 2. Total HPP Aktual (COGS) */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-border-active transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            Total HPP Aktual (COGS)
          </span>
          <div className="w-9 h-9 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold font-mono text-text tracking-tight">
            {formatCurrency(s.total_cogs)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-text-muted">Laba Kotor Riil:</span>
            <span className={`font-mono font-medium ${s.total_gross_profit >= 0 ? 'text-emerald-400' : 'text-status-danger'}`}>
              {formatCurrency(s.total_gross_profit)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Rata-rata Gross Margin */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-border-active transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            Rata-rata Margin
          </span>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Percent className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text">
              {margin.toFixed(1)}%
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${marginBadgeClass}`}>
              {marginLabel}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-text-muted">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target Benchmark: ≥ 25%</span>
          </div>
        </div>
      </div>

      {/* 4. Valuasi Aset Gudang (HPP) */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-border-active transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            Valuasi Aset Gudang
          </span>
          <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
            <Warehouse className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold font-mono text-text tracking-tight">
            {formatCurrency(s.total_inventory_valuation)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-text-muted">Potensi Pasar:</span>
            <span className="font-mono text-text-muted">
              {formatCurrency(s.total_inventory_market_value)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Total Piutang Belum Lunas & Unit Tertahan */}
      <div className="bg-surface/90 border border-border rounded-xl p-5 hover:border-border-active transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
            Piutang Tertahan
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
                {s.units_pending_handover} Unit Belum Serah Terima
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
