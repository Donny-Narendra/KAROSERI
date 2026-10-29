import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Clock, 
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { financialReportsService } from '../../services/financialReportsService';
import { formatTahapanBadge } from '../../utils/wbsSort';
import type { 
  FinancialSanityAuditResult, 
  OverBudgetAnomaly, 
  NegativeMarginAnomaly, 
  UnbilledCompletedAnomaly, 
  CriticalReceivableAnomaly 
} from '../../types/financialReports';

interface FinancialAuditPanelProps {
  refreshTrigger?: number;
  onRefreshParent?: () => void;
  onSelectTab?: (tab: 'profitability' | 'variance' | 'inventory' | 'receivables') => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const FinancialAuditPanel: React.FC<FinancialAuditPanelProps> = ({
  refreshTrigger = 0,
  onRefreshParent,
  onSelectTab,
}) => {
  const [auditData, setAuditData] = useState<FinancialSanityAuditResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedAnomalyType, setSelectedAnomalyType] = useState<
    'over_budget' | 'negative_margin' | 'unbilled' | 'receivables' | null
  >(null);

  const runAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financialReportsService.getSanityAudit();
      setAuditData(result);

      // Otomatis pilih tab anomali pertama yang memiliki temuan jika belum terpilih
      if (result.over_budget_count > 0) {
        setSelectedAnomalyType('over_budget');
      } else if (result.negative_margin_count > 0) {
        setSelectedAnomalyType('negative_margin');
      } else if (result.unbilled_completed_count > 0) {
        setSelectedAnomalyType('unbilled');
      } else if (result.critical_receivables_count > 0) {
        setSelectedAnomalyType('receivables');
      } else {
        setSelectedAnomalyType(null);
      }
    } catch (err: any) {
      console.error('Failed to run financial sanity check audit:', err);
      setError(err.message || 'Gagal menjalankan audit integritas keuangan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runAudit();
  }, [runAudit, refreshTrigger]);

  const handleManualRecheck = () => {
    runAudit();
    if (onRefreshParent) {
      onRefreshParent();
    }
  };

  const totalAnomalies = auditData
    ? auditData.over_budget_count +
      auditData.negative_margin_count +
      auditData.unbilled_completed_count +
      auditData.critical_receivables_count
    : 0;

  return (
    <div className="bg-surface border border-border rounded-xl shadow-md overflow-hidden transition-all duration-200">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 bg-surface-hover/30">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              loading
                ? 'bg-surface-hover text-text-muted border-border'
                : auditData?.is_healthy
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse'
            }`}
          >
            {auditData?.is_healthy ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold font-display text-text">
                Audit & Rekonsiliasi Integritas Data
              </h2>
              {loading ? (
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-surface-hover text-text-muted border border-border">
                  Memeriksa Database...
                </span>
              ) : auditData?.is_healthy ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  SISTEM SEHAT (0 ANOMALI)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {totalAnomalies} ANOMALI TERDETEKSI
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Pemeriksaan otomatis integritas matematis, pembengkakan pagu revisi, dan risiko penagihan serah terima.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={handleManualRecheck}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-hover text-xs font-medium text-text transition"
            title="Jalankan Ulang Audit Sanity Check"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${loading ? 'animate-spin' : ''}`} />
            <span>Audit Ulang</span>
          </button>

          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-1.5 rounded-lg bg-surface border border-border hover:bg-surface-hover text-text-muted hover:text-text transition"
            title={isExpanded ? 'Sembunyikan Panel Detail' : 'Tampilkan Panel Detail'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={runAudit}
            className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 font-medium transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Expanded Content Body */}
      {isExpanded && auditData && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Over Budget Card */}
            <div
              onClick={() => setSelectedAnomalyType('over_budget')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                selectedAnomalyType === 'over_budget'
                  ? 'bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/30'
                  : 'bg-surface/60 border-border hover:border-border-hover hover:bg-surface-hover/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  Over-Budget Material
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    auditData.over_budget_count > 0
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-surface-hover text-text-muted'
                  }`}
                >
                  {auditData.over_budget_count}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-[11px] text-text-muted leading-relaxed">
                  SPK dengan realisasi belanja material melebihi pagu revisi (RAB + CO).
                </p>
              </div>
            </div>

            {/* 2. Negative Margin Card */}
            <div
              onClick={() => setSelectedAnomalyType('negative_margin')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                selectedAnomalyType === 'negative_margin'
                  ? 'bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/30'
                  : 'bg-surface/60 border-border hover:border-border-hover hover:bg-surface-hover/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-rose-400" />
                  Margin Negatif / Defisit
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    auditData.negative_margin_count > 0
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-surface-hover text-text-muted'
                  }`}
                >
                  {auditData.negative_margin_count}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-[11px] text-text-muted leading-relaxed">
                  SPK aktif/selesai dengan nilai penagihan lebih rendah dibanding total HPP.
                </p>
              </div>
            </div>

            {/* 3. Unbilled Completed Card */}
            <div
              onClick={() => setSelectedAnomalyType('unbilled')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                selectedAnomalyType === 'unbilled'
                  ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-surface/60 border-border hover:border-border-hover hover:bg-surface-hover/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  QC Pass Belum Ditagih
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    auditData.unbilled_completed_count > 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-surface-hover text-text-muted'
                  }`}
                >
                  {auditData.unbilled_completed_count}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-[11px] text-text-muted leading-relaxed">
                  SPK telah lolos inspeksi QC Pass namun faktur penagihan belum diterbitkan.
                </p>
              </div>
            </div>

            {/* 4. Critical Receivables Card */}
            <div
              onClick={() => setSelectedAnomalyType('receivables')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                selectedAnomalyType === 'receivables'
                  ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-surface/60 border-border hover:border-border-hover hover:bg-surface-hover/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Risiko Serah Terima
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    auditData.critical_receivables_count > 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-surface-hover text-text-muted'
                  }`}
                >
                  {auditData.critical_receivables_count}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Unit selesai tertahan pelunasan dengan usia piutang lebih dari 7 hari.
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Drill-down Section */}
          {selectedAnomalyType && (
            <div className="bg-background/70 border border-border rounded-xl p-4 space-y-3">
              {/* 1. Over Budget Detail View */}
              {selectedAnomalyType === 'over_budget' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold font-display uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Daftar SPK dengan Pengeluaran Melebihi Pagu ({auditData.over_budget_count})
                    </h3>
                    {onSelectTab && (
                      <button
                        onClick={() => onSelectTab('variance')}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Buka Tab Varian Tahapan <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {auditData.over_budget_items.length === 0 ? (
                    <p className="text-xs text-text-muted py-2 italic">
                      Tidak ada SPK dengan pengeluaran melebihi pagu. Pagu material terkendali.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-surface/80 text-text-muted uppercase font-mono text-[10px]">
                          <tr>
                            <th className="px-3 py-2">No. SPK</th>
                            <th className="px-3 py-2">Pelanggan</th>
                            <th className="px-3 py-2">Tahapan</th>
                            <th className="px-3 py-2 text-right">Pagu Material</th>
                            <th className="px-3 py-2 text-right">Aktual Belanja</th>
                            <th className="px-3 py-2 text-right text-rose-400">Pembengkakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {auditData.over_budget_items.map((item: OverBudgetAnomaly, idx: number) => (
                            <tr key={idx} className="hover:bg-surface/50 font-mono">
                              <td className="px-3 py-2 font-bold text-text">{item.spk_number}</td>
                              <td className="px-3 py-2 font-sans text-text">{item.customer_name}</td>
                              <td className="px-3 py-2 text-text-muted">{formatTahapanBadge(item.wbs_stage)}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(item.total_material_budget)}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(item.actual_material_spent)}</td>
                              <td className="px-3 py-2 text-right font-bold text-rose-400">
                                +{formatCurrency(item.overspend_amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Negative Margin Detail View */}
              {selectedAnomalyType === 'negative_margin' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold font-display uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Daftar SPK Defisit / Margin Negatif ({auditData.negative_margin_count})
                    </h3>
                    {onSelectTab && (
                      <button
                        onClick={() => onSelectTab('profitability')}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Buka Tab Laba Rugi <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {auditData.negative_margin_items.length === 0 ? (
                    <p className="text-xs text-text-muted py-2 italic">
                      Tidak ada proyek dengan margin negatif. Seluruh SPK menghasilkan gross margin positif.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-surface/80 text-text-muted uppercase font-mono text-[10px]">
                          <tr>
                            <th className="px-3 py-2">No. SPK</th>
                            <th className="px-3 py-2">Pelanggan</th>
                            <th className="px-3 py-2 text-right">Total Revenue</th>
                            <th className="px-3 py-2 text-right">Total HPP (COGS)</th>
                            <th className="px-3 py-2 text-right text-rose-400">Gross Defisit</th>
                            <th className="px-3 py-2 text-right text-rose-400">Margin %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {auditData.negative_margin_items.map((item: NegativeMarginAnomaly, idx: number) => (
                            <tr key={idx} className="hover:bg-surface/50 font-mono">
                              <td className="px-3 py-2 font-bold text-text">{item.spk_number}</td>
                              <td className="px-3 py-2 font-sans text-text">{item.customer_name}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(item.total_revenue)}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(item.total_cogs)}</td>
                              <td className="px-3 py-2 text-right font-bold text-rose-400">
                                {formatCurrency(item.gross_profit)}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-rose-400">
                                {item.gross_margin_percentage}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Unbilled Completed Detail View */}
              {selectedAnomalyType === 'unbilled' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold font-display uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      Daftar SPK Lolos QC Tanpa Faktur Tagihan ({auditData.unbilled_completed_count})
                    </h3>
                  </div>

                  {auditData.unbilled_completed_items.length === 0 ? (
                    <p className="text-xs text-text-muted py-2 italic">
                      Semua unit yang lulus QC Pass telah memiliki tagihan aktif atau terlunasi.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-surface/80 text-text-muted uppercase font-mono text-[10px]">
                          <tr>
                            <th className="px-3 py-2">No. SPK</th>
                            <th className="px-3 py-2">Pelanggan</th>
                            <th className="px-3 py-2">Plat Nomor</th>
                            <th className="px-3 py-2">Status QC</th>
                            <th className="px-3 py-2 text-right">Status Penagihan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {auditData.unbilled_completed_items.map((item: UnbilledCompletedAnomaly, idx: number) => (
                            <tr key={idx} className="hover:bg-surface/50 font-mono">
                              <td className="px-3 py-2 font-bold text-text">{item.spk_number}</td>
                              <td className="px-3 py-2 font-sans text-text">{item.customer_name}</td>
                              <td className="px-3 py-2">{item.vehicle_plate || '-'}</td>
                              <td className="px-3 py-2 text-emerald-400 font-bold">PASS</td>
                              <td className="px-3 py-2 text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  BELUM DITAGIH
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Critical Receivables Detail View */}
              {selectedAnomalyType === 'receivables' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold font-display uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      Daftar Unit Selesai Tertahan Pelunasan &gt; 7 Hari ({auditData.critical_receivables_count})
                    </h3>
                    {onSelectTab && (
                      <button
                        onClick={() => onSelectTab('receivables')}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Buka Tab Piutang & Aging <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {auditData.critical_receivables_items.length === 0 ? (
                    <p className="text-xs text-text-muted py-2 italic">
                      Tidak ada unit selesai dengan piutang tertahan lebih dari 7 hari.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-surface/80 text-text-muted uppercase font-mono text-[10px]">
                          <tr>
                            <th className="px-3 py-2">No. SPK</th>
                            <th className="px-3 py-2">Pelanggan</th>
                            <th className="px-3 py-2 text-right">Usia Piutang</th>
                            <th className="px-3 py-2 text-right">Sisa Piutang</th>
                            <th className="px-3 py-2 text-right">Status Serah Terima</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {auditData.critical_receivables_items.map((item: CriticalReceivableAnomaly, idx: number) => (
                            <tr key={idx} className="hover:bg-surface/50 font-mono">
                              <td className="px-3 py-2 font-bold text-text">{item.spk_number}</td>
                              <td className="px-3 py-2 font-sans text-text">{item.customer_name}</td>
                              <td className="px-3 py-2 text-right font-bold text-amber-400">
                                {item.receivable_aging_days} Hari
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-rose-400">
                                {formatCurrency(item.outstanding_balance)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  TERTAHAN PELUNASAN
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
