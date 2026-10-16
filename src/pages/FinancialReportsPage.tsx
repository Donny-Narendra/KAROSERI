import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  Layers, 
  Warehouse, 
  AlertCircle, 
  Calendar, 
  Search, 
  RefreshCw, 
  ArrowLeft,
  DollarSign
} from 'lucide-react';
import { ExecutiveKpiCards } from '../components/finance/ExecutiveKpiCards';
import { FinancialAuditPanel } from '../components/finance/FinancialAuditPanel';
import { JobProfitabilityTab } from '../components/finance/tabs/JobProfitabilityTab';
import { WbsCostVarianceTab } from '../components/finance/tabs/WbsCostVarianceTab';
import { InventoryValuationTab } from '../components/finance/tabs/InventoryValuationTab';
import { ReceivablesAgingTab } from '../components/finance/tabs/ReceivablesAgingTab';
import { financialReportsService } from '../services/financialReportsService';
import type { FinancialExecutiveSummary } from '../types/financialReports';

type ReportTab = 'profitability' | 'variance' | 'inventory' | 'receivables';

export const FinancialReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<ReportTab>('profitability');

  // Global Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Executive KPI state
  const [summary, setSummary] = useState<FinancialExecutiveSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Refresh trigger counter to signal child tabs
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const data = await financialReportsService.getExecutiveSummary({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to fetch financial executive summary:', err);
      setSummaryError(err.message || 'Gagal memuat ringkasan KPI eksekutif.');
    } finally {
      setLoadingSummary(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, refreshTrigger]);

  const handleManualRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSetQuickDate = (period: 'this_month' | 'this_year' | 'all') => {
    const now = new Date();
    if (period === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(start.toISOString().slice(0, 10));
      setEndDate(end.toISOString().slice(0, 10));
    } else if (period === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setStartDate(start.toISOString().slice(0, 10));
      setEndDate(end.toISOString().slice(0, 10));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      {/* Header Bar */}
      <header className="bg-surface border-b border-border px-6 py-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(profile?.role === 'owner' ? '/dashboard' : '/kasir')}
              className="p-2 rounded-lg bg-surface-hover hover:bg-surface-active text-text-muted hover:text-text border border-border transition"
              title="Kembali ke Dashboard Utama"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-display tracking-tight text-text">
                  Laporan Keuangan & Executive Dashboard
                </h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Step 4 Audit
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Analitik Laba Rugi Proyek, Varian Anggaran WBS, Valuasi Gudang, dan Kontrol Piutang Serah Terima
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="hidden sm:flex flex-col text-right font-mono text-xs">
              <span className="text-text-muted">Akses Pengguna:</span>
              <span className="text-secondary font-semibold">{profile?.full_name} ({profile?.role})</span>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={loadingSummary}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 rounded-lg text-sm font-medium transition"
              title="Segarkan Seluruh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSummary ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Global Filter Bar */}
        <div className="bg-surface/90 border border-border rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Date Range Controls */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className="flex items-center gap-1.5 text-text-muted font-mono text-xs">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Periode:</span>
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background/90 border border-border rounded-lg px-3 py-1.5 text-sm text-text font-mono focus:outline-none focus:border-primary"
                title="Tanggal Mulai"
              />
              <span className="text-text-muted font-mono text-xs">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background/90 border border-border rounded-lg px-3 py-1.5 text-sm text-text font-mono focus:outline-none focus:border-primary"
                title="Tanggal Akhir"
              />

              {/* Quick Presets */}
              <div className="flex items-center gap-1 ml-1">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate('this_month')}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-surface-hover hover:bg-surface-active text-text-muted hover:text-text border border-border transition"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate('this_year')}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-surface-hover hover:bg-surface-active text-text-muted hover:text-text border border-border transition"
                >
                  Tahun Ini
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate('all')}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-surface-hover hover:bg-surface-active text-text-muted hover:text-text border border-border transition"
                >
                  Semua
                </button>
              </div>
            </div>

            {/* Global Quick Search Box */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Pencarian Global (SPK/Cust/Plat)..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full bg-background/90 border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary placeholder:text-text-muted/60"
              />
            </div>
          </div>
        </div>

        {/* Executive KPI Summary Cards */}
        {summaryError && (
          <div className="p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl text-status-danger text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{summaryError}</span>
          </div>
        )}
        <ExecutiveKpiCards summary={summary} isLoading={loadingSummary} />

        {/* Sub-Panel Visual: Audit & Rekonsiliasi Integritas Data (Step 4) */}
        <FinancialAuditPanel
          refreshTrigger={refreshTrigger}
          onRefreshParent={handleManualRefresh}
          onSelectTab={(tab) => setActiveTab(tab)}
        />

        {/* Interactive Tabs Navigation */}
        <div className="border-b border-border">
          <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none pb-px" aria-label="Tabs Laporan">
            <button
              onClick={() => setActiveTab('profitability')}
              className={`flex items-center gap-2 py-3 px-4 font-display font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-150 ${
                activeTab === 'profitability'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-text-muted hover:text-text hover:border-border'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>1. Laba Rugi Proyek (Job Profitability)</span>
            </button>

            <button
              onClick={() => setActiveTab('variance')}
              className={`flex items-center gap-2 py-3 px-4 font-display font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-150 ${
                activeTab === 'variance'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-text-muted hover:text-text hover:border-border'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>2. Varian RAB vs Aktual (per WBS)</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 py-3 px-4 font-display font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-150 ${
                activeTab === 'inventory'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-text-muted hover:text-text hover:border-border'
              }`}
            >
              <Warehouse className="w-4 h-4" />
              <span>3. Valuasi Persediaan Gudang</span>
            </button>

            <button
              onClick={() => setActiveTab('receivables')}
              className={`flex items-center gap-2 py-3 px-4 font-display font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-150 ${
                activeTab === 'receivables'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-text-muted hover:text-text hover:border-border'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>4. Piutang & Kontrol Serah Terima</span>
              {summary && summary.units_pending_handover > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content Panes */}
        <div className="pt-2">
          {activeTab === 'profitability' && (
            <JobProfitabilityTab
              globalSearch={globalSearch}
              startDate={startDate}
              endDate={endDate}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activeTab === 'variance' && (
            <WbsCostVarianceTab
              globalSearch={globalSearch}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryValuationTab
              globalSearch={globalSearch}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activeTab === 'receivables' && (
            <ReceivablesAgingTab
              globalSearch={globalSearch}
              refreshTrigger={refreshTrigger}
            />
          )}
        </div>
      </main>
    </div>
  );
};
