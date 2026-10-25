import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, AlertTriangle, ShieldCheck, Factory, LogOut, Package,
  Settings, Bell, Check, X, Search, RotateCcw, FileSpreadsheet, Ban, TrendingUp, BookOpen 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PackageManager } from '../components/PackageManager';
import { spkService } from '../services/spkService';
import { WbsChecklist } from '../components/WbsChecklist';
import { ConfirmationModal, type ConfirmationModalVariant } from '../components/ConfirmationModal';
import { CancelledSpkAuditLog } from '../components/CancelledSpkAuditLog';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { dashboardService, type DashboardSpkItem } from '../services/dashboardService';
import { ResetSimulationModal } from '../components/owner/ResetSimulationModal';

export const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const [mainTab, setMainTab] = useState<'dashboard' | 'bom' | 'cancellations'>('dashboard');
  const [spks, setSpks] = useState<DashboardSpkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApprovalsModal, setShowApprovalsModal] = useState(false);
  const [selectedWbsSpkId, setSelectedWbsSpkId] = useState<string | null>(null);

  // Modal State untuk Aksi Approval Change Order
  const [pendingActionTarget, setPendingActionTarget] = useState<{
    id: string;
    action: 'APPROVED' | 'REJECTED';
    spkNo?: string;
    description?: string;
  } | null>(null);

  // Modal State untuk Pembatalan SPK Langsung oleh Owner
  const [cancellingSpk, setCancellingSpk] = useState<any | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Modal State untuk Ekspor Laporan
  const [showExportModal, setShowExportModal] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Modal Feedback / Notifikasi Umum
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: ConfirmationModalVariant;
  } | null>(null);

  // State Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_QC' | 'OVERBUDGET' | 'CANCELLED'>('ALL');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSpks();
  }, []);

  const fetchSpks = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.fetchOwnerDashboardSpks();
      setSpks(data);
    } catch (error) {
      console.error('Error fetching SPKs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalActionConfirm = async () => {
    if (!pendingActionTarget) return;
    setActionLoading(true);
    try {
      if (pendingActionTarget.action === 'APPROVED') {
        if (!profile?.id) throw new Error("User ID is missing");
        await spkService.approveAmendment(pendingActionTarget.id, profile.id);
      } else {
        await spkService.rejectAmendment(pendingActionTarget.id);
      }
      await fetchSpks();
      setFeedbackModal({
        isOpen: true,
        title: pendingActionTarget.action === 'APPROVED' ? 'Change Order Disetujui' : 'Change Order Ditolak',
        message: `Perubahan biaya untuk SPK ${pendingActionTarget.spkNo || ''} telah berhasil di-${pendingActionTarget.action.toLowerCase()}.`,
        variant: pendingActionTarget.action === 'APPROVED' ? 'success' : 'warning',
      });
    } catch (err: any) {
      console.error(`Error updating amendment:`, err);
      setFeedbackModal({
        isOpen: true,
        title: 'Gagal Memproses Approval',
        message: err.message || 'Terjadi kesalahan sistem saat memperbarui status change order.',
        variant: 'danger',
      });
    } finally {
      setActionLoading(false);
      setPendingActionTarget(null);
    }
  };

  const handleCancelSpkSubmit = async () => {
    if (!cancellingSpk) return;
    if (!cancellationReason.trim()) {
      setFeedbackModal({
        isOpen: true,
        title: 'Alasan Pembatalan Wajib Diisi',
        message: 'Silakan masukkan alasan pembatalan SPK secara formal sebelum melanjutkan.',
        variant: 'warning',
      });
      return;
    }

    setActionLoading(true);
    try {
      await spkService.cancelSpk({
        spkId: cancellingSpk.id,
        reason: cancellationReason.trim(),
        userId: profile?.id || ''
      });
      await fetchSpks();
      setFeedbackModal({
        isOpen: true,
        title: 'SPK Berhasil Dibatalkan',
        message: `SPK ${cancellingSpk.spk_no} telah dibatalkan dengan alasan: "${cancellationReason.trim()}". Status kini terdaftar pada Log Pembatalan.`,
        variant: 'warning',
      });
      setCancellingSpk(null);
      setCancellationReason('');
    } catch (err: any) {
      console.error('Cancel SPK Error:', err);
      setFeedbackModal({
        isOpen: true,
        title: 'Gagal Membatalkan SPK',
        message: err.message || 'Terjadi kesalahan saat membatalkan SPK.',
        variant: 'danger',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredSpks = useMemo(() => {
    return spks.filter(spk => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (spk.spk_no && spk.spk_no.toLowerCase().includes(q)) ||
        (spk.customer_name && spk.customer_name.toLowerCase().includes(q)) ||
        (spk.vehicle_plate && spk.vehicle_plate.toLowerCase().includes(q));
      
      if (!matchesSearch) return false;

      if (statusFilter === 'ACTIVE') return spk.status === 'ACTIVE';
      if (statusFilter === 'PENDING_QC') return spk.qc_status === 'PENDING' || spk.wbs_status === 'WAITING_REVIEW';
      if (statusFilter === 'OVERBUDGET') return spk.is_overbudget === true || spk.material_gate_status === 'OVERBUDGET' || spk.financials?.isOverbudget === true;
      if (statusFilter === 'CANCELLED') return spk.status === 'CANCELLED';
      return true;
    });
  }, [spks, searchQuery, statusFilter]);

  const handleResetFilter = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
  };

  const executeExportSpkSummary = () => {
    setShowExportModal(false);
    try {
      const exportData = filteredSpks.map((s, idx) => ({
        No: idx + 1,
        'No SPK': s.spk_no,
        'Nama Pelanggan': s.customer_name,
        'Plat Nomor': s.vehicle_plate || '-',
        Status: s.status,
        'QC Status': s.qc_status || '-',
        'Total HPP': s.financials?.totalHpp ?? (Number(s.total_estimated_cost) || 0),
        'Total Tagihan': s.financials?.totalTagihan ?? 0,
        'Realisasi Biaya Aktual': s.financials?.totalRealisasiAktual ?? 0,
        'Selisih Varian': s.financials?.varianceAmount ?? 0,
        'Status Biaya': (s.financials?.isOverbudget || s.is_overbudget) ? 'OVERBUDGET' : 'IN BUDGET',
        'Tanggal Dibuat': new Date(s.created_at).toLocaleDateString('id-ID'),
      }));

      // Generate CSV format
      const headers = Object.keys(exportData[0] || {}).join(',');
      const rows = exportData.map(row => 
        Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + `${headers}\n${rows}`;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Laporan_Monitoring_SPK_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setFeedbackModal({
        isOpen: true,
        title: 'Ekspor Laporan Berhasil',
        message: `Sebanyak ${exportData.length} baris ringkasan SPK telah berhasil diunduh ke format CSV.`,
        variant: 'success',
      });
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        title: 'Gagal Mengunduh Laporan',
        message: err.message || 'Terjadi kesalahan saat menyusun data ekspor.',
        variant: 'danger',
      });
    }
  };

  const activeSpks = spks.filter(s => s.status === 'ACTIVE');
  const activeBays = activeSpks.length;
  const totalBays = 20;

  const pendingAmendments = spks.flatMap(s => (s.spk_amendments || []).map((a: any) => ({...a, spk_no: s.spk_no, customer_name: s.customer_name}))).filter((a: any) => a.status === 'PENDING');
  const pendingAmendmentsCount = pendingAmendments.length;

  const totalWipValue = activeSpks.reduce((sum: number, spk: any) => {
    const fin = spk.financials || dashboardService.calculateSpkFinancialMetrics(spk);
    return sum + (Number(fin.totalTagihan ?? spk.total_tagihan ?? 0) || 0);
  }, 0);
  const formattedWip = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalWipValue);

  const overbudgetCount = spks.filter(s => s.is_overbudget === true || s.material_gate_status === 'OVERBUDGET' || s.financials?.isOverbudget === true).length;
  const pendingQcCount = spks.filter(s => s.qc_status === 'PENDING' || s.wbs_status === 'WAITING_REVIEW').length;

  const validSpksForCosting = spks.filter(s => !['CANCELLED', 'DRAFT', 'PENDING_PAYMENT'].includes(s.status));
  let totalProjectedCost = 0;
  let totalActualCost = 0;
  let totalTagihanCosting = 0;

  validSpksForCosting.forEach(spk => {
    const fin = spk.financials || dashboardService.calculateSpkFinancialMetrics(spk);
    totalProjectedCost += (fin.totalHpp || 0);
    totalActualCost += (fin.totalRealisasiAktual || 0);
    totalTagihanCosting += (fin.totalTagihan || 0);
  });
  
  const marginPercentage = totalTagihanCosting > 0 
    ? ((totalTagihanCosting - totalProjectedCost) / totalTagihanCosting) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Factory className="text-primary w-6 h-6" />
          <h1 className="font-display font-bold text-xl text-text">RobelKaroseri Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowApprovalsModal(true)}
            className="relative p-2 text-text-muted hover:text-text transition bg-surface-hover rounded-full"
            title="Pending Approvals"
          >
            <Bell className="w-5 h-5" />
            {pendingAmendmentsCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-status-danger text-background text-[10px] font-bold flex items-center justify-center rounded-full border border-surface">
                {pendingAmendmentsCount}
              </span>
            )}
          </button>
          <span className="text-sm text-text-muted font-mono">{profile?.full_name} ({profile?.role})</span>
          <LanguageSwitcher />
          <button 
            onClick={() => window.location.href = '/finance-reports'}
            className="flex items-center gap-2 text-sm bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded transition font-medium"
            title="Buka Laporan Keuangan & Executive Dashboard"
          >
            <TrendingUp className="w-4 h-4" />
            {t('finance.title', 'Laporan Keuangan')}
          </button>
          <button 
            onClick={() => window.location.href = '/buku-besar'}
            className="flex items-center gap-2 text-sm bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-1.5 rounded transition font-medium"
            title="Buka Buku Besar & Kas (Akuntansi Model T)"
          >
            <BookOpen className="w-4 h-4" />
            {t('ledger.title', 'Buku Besar & Kas')}
          </button>
          <button 
            onClick={() => window.location.href = '/kasir'}
            className="flex items-center gap-2 text-sm bg-surface-hover hover:bg-surface-active px-3 py-1.5 rounded transition text-text"
          >
            {t('cashier.title', 'Kasir / Billing')}
          </button>
          <button 
            onClick={() => window.location.href = '/admin/settings'}
            className="flex items-center gap-2 text-sm bg-surface-hover hover:bg-surface-active px-3 py-1.5 rounded transition text-text"
          >
            <Settings className="w-4 h-4" />
            {t('admin.settings')}
          </button>
          <button 
            onClick={signOut}
            className="flex items-center gap-2 text-sm bg-surface-hover hover:bg-surface-active px-3 py-1.5 rounded transition text-status-danger"
          >
            <LogOut className="w-4 h-4" />
            {t('admin.logout')}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 border-b border-border w-full max-w-xl">
            <button 
              onClick={() => setMainTab('dashboard')}
              className={`pb-2 text-lg font-bold font-display transition border-b-2 ${mainTab === 'dashboard' ? 'border-primary text-text' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              {t('admin.dashboard_title')}
            </button>
            <button 
              onClick={() => setMainTab('bom')}
              className={`pb-2 text-lg font-bold font-display transition border-b-2 ${mainTab === 'bom' ? 'border-primary text-text' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              {t('admin.bom_tab', 'Paket Produk (Assembly List)')}
            </button>
            <button 
              onClick={() => setMainTab('cancellations')}
              className={`pb-2 text-lg font-bold font-display transition border-b-2 flex items-center gap-1.5 ${mainTab === 'cancellations' ? 'border-status-danger text-status-danger' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              <Ban className="w-4 h-4" />
              <span>{t('admin.cancellations_tab', 'Audit Pembatalan')}</span>
              {spks.filter(s => s.status === 'CANCELLED').length > 0 && (
                <span className="text-xs bg-status-danger/20 text-status-danger font-mono font-bold px-1.5 py-0.2 rounded-full ml-1">
                  {spks.filter(s => s.status === 'CANCELLED').length}
                </span>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {profile?.role === 'owner' && (
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Khusus Owner: Reset data transaksi untuk mengulang simulasi"
              >
                <span>⚠️</span>
                <span>Reset Simulasi Transaksi</span>
              </button>
            )}
            <div className="bg-primary/20 text-primary text-xs font-mono px-2 py-1 rounded">
              {t('admin.live_telemetry')}
            </div>
          </div>
        </div>

        {mainTab === 'dashboard' ? (
          <>
            {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-muted font-mono">{t('admin.active_bays')}</p>
                {loading ? (
                  <div className="h-9 w-20 bg-surface-hover animate-pulse rounded mt-2"></div>
                ) : (
                  <p className="text-3xl font-bold text-text mt-2">{activeBays} <span className="text-sm text-text-muted font-normal">/ {totalBays}</span></p>
                )}
              </div>
              <div className="w-10 h-10 rounded bg-secondary/20 flex items-center justify-center text-secondary">
                <Factory className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-muted font-mono">{t('admin.wip_value')}</p>
                {loading ? (
                  <div className="h-8 w-32 bg-surface-hover animate-pulse rounded mt-2 mb-1"></div>
                ) : (
                  <p className="text-2xl font-bold text-text mt-2">{formattedWip}</p>
                )}
                <p className="text-xs text-text-muted mt-1">Material + Labor + Overhead</p>
              </div>
              <div className="w-10 h-10 rounded bg-status-success/20 flex items-center justify-center text-status-success">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className={`bg-surface border rounded-lg p-5 relative overflow-hidden ${overbudgetCount > 0 ? 'border-status-danger/50' : 'border-border'}`}>
            {overbudgetCount > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-status-danger/10 blur-2xl rounded-full"></div>}
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-sm text-text-muted font-mono">{t('admin.overbudget')}</p>
                {loading ? (
                  <div className="h-9 w-12 bg-surface-hover animate-pulse rounded mt-2"></div>
                ) : (
                  <p className={`text-3xl font-bold mt-2 ${overbudgetCount > 0 ? 'text-status-danger' : 'text-status-success'}`}>
                    {overbudgetCount}
                  </p>
                )}
                <p className="text-xs text-text-muted mt-1">Waiting Owner Auth (Material Gate)</p>
              </div>
              <div className={`w-10 h-10 rounded flex items-center justify-center ${overbudgetCount > 0 ? 'bg-status-danger/20 text-status-danger' : 'bg-status-success/20 text-status-success'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-muted font-mono">{t('admin.pending_qc')}</p>
                {loading ? (
                  <div className="h-9 w-12 bg-surface-hover animate-pulse rounded mt-2"></div>
                ) : (
                  <p className={`text-3xl font-bold mt-2 ${pendingQcCount > 0 ? 'text-status-warning' : 'text-text'}`}>
                    {pendingQcCount}
                  </p>
                )}
                <p className="text-xs text-text-muted mt-1">Shower / Dimension / Elec</p>
              </div>
              <div className={`w-10 h-10 rounded flex items-center justify-center ${pendingQcCount > 0 ? 'bg-status-warning/20 text-status-warning' : 'bg-surface-hover text-text-muted'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Actual Costing vs Projected Margin */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden mt-8 p-6">
          <h3 className="font-bold text-text font-display mb-4">{t('admin.costing_margin', 'Actual Costing vs Projected Margin')}</h3>
          {loading ? (
            <div className="h-20 bg-surface-hover animate-pulse rounded"></div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-text-muted font-mono mb-1">Total Actual Cost vs Projected</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-text">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalActualCost)}
                    </span>
                    <span className="text-sm text-text-muted">
                      / {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalProjectedCost)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-muted font-mono mb-1">Profit Margin</p>
                  <span className={`text-xl font-bold ${marginPercentage >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                    {marginPercentage > 0 ? '+' : ''}{marginPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-surface-hover rounded-full h-4 overflow-hidden flex">
                <div 
                  className={`h-full transition-all ${totalActualCost > totalProjectedCost ? 'bg-status-danger' : 'bg-primary'}`} 
                  style={{ width: `${totalProjectedCost > 0 ? Math.min(100, (totalActualCost / totalProjectedCost) * 100) : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-text-muted text-center mt-2">
                * Cost is calculated from {validSpksForCosting.length} active/completed SPKs with RAB estimations.
              </p>
            </div>
          )}
        </div>

        {/* Monitoring Table & Controls */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden mt-8">
          <div className="px-5 py-4 border-b border-border bg-surface-hover flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-text font-display">{t('admin.spk_monitoring')}</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Menampilkan {filteredSpks.length} dari total {spks.length} SPK terdaftar
              </p>
            </div>
            
            {/* Toolbar Filter & Aksi */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Cari SPK / Client / Nopol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary transition"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-primary transition"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Aktif (WIP)</option>
                <option value="PENDING_QC">Menunggu QC</option>
                <option value="OVERBUDGET">Overbudget</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>

              {(searchQuery || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:text-text hover:bg-background transition flex items-center gap-1.5"
                  title="Reset Filter & Pencarian"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary/50 text-xs font-medium text-text hover:text-primary transition flex items-center gap-1.5 shadow-xs"
                title="Ekspor Ringkasan Laporan SPK ke CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-status-success" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text">
              <thead className="bg-background text-text-muted font-mono text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('admin.spk_no')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('admin.client')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    TOTAL HPP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    TOTAL TAGIHAN
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    REALISASI BIAYA AKTUAL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('admin.qc_status')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('admin.handover')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('admin.managerial_actions', 'Aksi Manajerial')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-mono">Memuat data monitoring SPK...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSpks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-text-muted text-sm">
                      Tidak ada data SPK yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredSpks.map((spk) => {
                    const fin = spk.financials || dashboardService.calculateSpkFinancialMetrics(spk);
                    const totalHpp = fin.totalHpp;
                    const coHpp = fin.coHpp;
                    const totalTagihan = fin.totalTagihan;
                    const materialIssuedCost = fin.materialIssuedCost;
                    const laborActualCost = fin.laborActualCost;
                    const fohActualCost = fin.fohActualCost;
                    const totalRealisasiAktual = fin.totalRealisasiAktual;

                    return (
                      <tr key={spk.id} className="hover:bg-surface-hover/50 transition">
                        <td className="px-4 py-3 font-mono font-medium">
                          <div>{spk.spk_no}</div>
                          {spk.vehicle_plate && (
                            <div className="text-xs text-text-muted font-normal">{spk.vehicle_plate}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">{spk.customer_name}</td>
                        <td className="px-4 py-3 text-left">
                          <div className="font-mono font-bold text-slate-100 text-xs">
                            Rp {totalHpp.toLocaleString('id-ID')}
                          </div>
                          {coHpp > 0 && (
                            <div className="text-[10px] text-purple-400">
                              Termasuk CO: +Rp {coHpp.toLocaleString('id-ID')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-left">
                          <div className="font-mono font-bold text-amber-400 text-xs">
                            Rp {totalTagihan.toLocaleString('id-ID')}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span>DP: Rp {(spk.dp_amount || 0).toLocaleString('id-ID')}</span>
                            <span className={spk.payment_status === 'PAID' ? 'text-emerald-400' : 'text-slate-500'}>
                              • {spk.payment_status || 'UNPAID'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-left">
                          <div className="font-mono font-bold text-xs flex items-center gap-1.5">
                            <span className={totalRealisasiAktual > totalHpp ? 'text-rose-400' : 'text-emerald-400'}>
                              Rp {totalRealisasiAktual.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Mat: Rp {materialIssuedCost.toLocaleString('id-ID')} | Jasa+FOH: Rp {(laborActualCost + fohActualCost).toLocaleString('id-ID')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={spk.status === 'CANCELLED' ? 'text-status-danger' : 'text-status-idle'}>
                            {spk.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {spk.status === 'COMPLETED' ? (
                            <span className="text-status-success font-medium flex items-center gap-1 text-xs">
                              <ShieldCheck className="w-4 h-4"/> Selesai
                            </span>
                          ) : (
                            <span className="text-status-danger font-medium flex items-center gap-1 text-xs">
                              <Package className="w-4 h-4"/> Locked
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedWbsSpkId(spk.id)}
                              className="text-primary hover:text-primary-hover text-xs font-semibold px-2.5 py-1 rounded hover:bg-primary/10 transition"
                            >
                              WBS & QC
                            </button>
                            {spk.status !== 'CANCELLED' && spk.status !== 'COMPLETED' && (
                              <button
                                onClick={() => {
                                  setCancellingSpk(spk);
                                  setCancellationReason('');
                                }}
                                className="text-status-danger hover:text-red-400 text-xs font-semibold px-2 py-1 rounded hover:bg-status-danger/10 transition flex items-center gap-1"
                                title="Batalkan SPK Langsung"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Batalkan</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cancelled SPK Log */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden mt-8">
          <div className="px-5 py-4 border-b border-border bg-surface-hover flex items-center justify-between">
            <div>
              <h3 className="font-bold text-status-danger font-display flex items-center gap-2">
                <Ban className="w-4 h-4" />
                {t('admin.cancelled_spk_log', 'Log SPK Dibatalkan')}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">Ringkasan cepat riwayat pembatalan SPK terbaru</p>
            </div>
            <button
              onClick={() => setMainTab('cancellations')}
              className="text-xs font-semibold text-status-danger hover:text-red-400 px-3 py-1.5 rounded-lg border border-status-danger/30 hover:bg-status-danger/10 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Buka Modul Audit Penuh</span>
              <span>&rarr;</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text">
              <thead className="bg-background text-text-muted font-mono text-xs uppercase">
                <tr>
                  <th className="px-5 py-3">Plat Nomor / No SPK</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Waktu Batal</th>
                  <th className="px-5 py-3">Dibatalkan Oleh</th>
                  <th className="px-5 py-3">Alasan Pembatalan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {spks.filter(s => s.status === 'CANCELLED').length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-text-muted">
                      Tidak ada log SPK yang dibatalkan.
                    </td>
                  </tr>
                ) : spks.filter(s => s.status === 'CANCELLED').slice(0, 5).map((spk) => (
                  <tr key={spk.id} className="hover:bg-surface-hover/50 transition">
                    <td className="px-5 py-4 font-mono">
                      <div className="font-bold text-text">{spk.vehicle_plate || 'Tanpa Plat'}</div>
                      <div className="text-xs text-text-muted">{spk.spk_no}</div>
                    </td>
                    <td className="px-5 py-4 font-medium">{spk.customer_name}</td>
                    <td className="px-5 py-4 text-xs font-mono text-text-muted">
                      {spk.cancelled_at 
                        ? new Date(spk.cancelled_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : (spk.updated_at ? new Date(spk.updated_at).toLocaleString('id-ID') : '-')}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {spk.cancelled_by_profile ? (
                        <span className="font-medium text-text">
                          {spk.cancelled_by_profile.full_name} <span className="text-[10px] text-text-muted font-mono uppercase">({spk.cancelled_by_profile.role})</span>
                        </span>
                      ) : (
                        <span className="text-text-muted italic">Owner / Admin</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-text-muted italic max-w-xs">
                      "{spk.cancellation_reason || spk.notes || 'Tanpa keterangan tertulis'}"
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          </>
        ) : mainTab === 'bom' ? (
          <div className="mt-4">
            <PackageManager />
          </div>
        ) : (
          <div className="mt-4">
            <CancelledSpkAuditLog onRefreshParent={fetchSpks} />
          </div>
        )}
      </main>

      {/* Pending Approvals Modal */}
      {showApprovalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b border-border bg-surface-hover">
              <h2 className="font-bold text-lg font-display flex items-center gap-2">
                <Bell className="w-5 h-5 text-status-warning" />
                Pending Approvals ({pendingAmendmentsCount})
              </h2>
              <button onClick={() => setShowApprovalsModal(false)} className="text-text-muted hover:text-text transition p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {pendingAmendments.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm">
                  Tidak ada daftar approval yang tertunda.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingAmendments.map((amendment: any) => (
                    <div key={amendment.id} className="border border-border rounded p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-surface-hover/30">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text text-sm font-mono">{amendment.spk_no}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-surface-active text-text-muted">{amendment.customer_name}</span>
                        </div>
                        <p className="text-sm text-text">{amendment.description}</p>
                        <div className="flex items-center gap-3 text-xs text-text-muted font-mono">
                          <span className={amendment.cost_adjustment > 0 ? "text-status-danger" : "text-text"}>
                            {amendment.cost_adjustment >= 0 ? '+' : ''}
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amendment.cost_adjustment || 0)}
                          </span>
                          <span>{new Date(amendment.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                        <button
                          type="button"
                          onClick={() => setPendingActionTarget({
                            id: amendment.id,
                            action: 'APPROVED',
                            spkNo: amendment.spk_no,
                            description: amendment.description
                          })}
                          className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-status-success/10 hover:bg-status-success/20 text-status-success rounded text-sm font-medium transition"
                        >
                          <Check className="w-4 h-4" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingActionTarget({
                            id: amendment.id,
                            action: 'REJECTED',
                            spkNo: amendment.spk_no,
                            description: amendment.description
                          })}
                          className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-status-danger/10 hover:bg-status-danger/20 text-status-danger rounded text-sm font-medium transition"
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-surface-hover flex justify-end">
              <button
                onClick={() => setShowApprovalsModal(false)}
                className="px-4 py-2 border border-border text-text rounded hover:bg-surface-active transition text-sm font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WBS Modal */}
      {selectedWbsSpkId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-border bg-surface-hover">
              <h2 className="font-bold text-lg font-display flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                WBS & QC Management
              </h2>
              <button onClick={() => setSelectedWbsSpkId(null)} className="text-text-muted hover:text-text transition p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-background">
              <WbsChecklist spkId={selectedWbsSpkId} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Persetujuan / Penolakan Change Order */}
      <ConfirmationModal
        isOpen={Boolean(pendingActionTarget)}
        title={pendingActionTarget?.action === 'APPROVED' ? 'Setujui Change Order?' : 'Tolak Change Order?'}
        message={
          pendingActionTarget?.action === 'APPROVED'
            ? `Apakah Anda yakin ingin MENYETUJUI usulan perubahan biaya untuk SPK ${pendingActionTarget?.spkNo || ''}?\n\nKeterangan Pekerjaan: "${pendingActionTarget?.description || '-'}"`
            : `Apakah Anda yakin ingin MENOLAK usulan perubahan biaya untuk SPK ${pendingActionTarget?.spkNo || ''}?\n\nKeterangan Pekerjaan: "${pendingActionTarget?.description || '-'}"`
        }
        confirmText={pendingActionTarget?.action === 'APPROVED' ? 'Ya, Setujui Change Order' : 'Ya, Tolak Change Order'}
        cancelText="Batal"
        variant={pendingActionTarget?.action === 'APPROVED' ? 'info' : 'danger'}
        isLoading={actionLoading}
        onConfirm={handleApprovalActionConfirm}
        onCancel={() => setPendingActionTarget(null)}
      />

      {/* Modal Konfirmasi Pembatalan SPK Langsung oleh Owner */}
      <ConfirmationModal
        isOpen={Boolean(cancellingSpk)}
        title={`Batalkan SPK ${cancellingSpk?.spk_no || ''}?`}
        message="PERINGATAN: Pembatalan SPK langsung oleh Owner akan menghentikan seluruh aktivitas pengerjaan unit karoseri dan mencatat alasan pembatalan ke log audit sistem."
        confirmText="Ya, Batalkan SPK Ini"
        cancelText="Kembali"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleCancelSpkSubmit}
        onCancel={() => {
          setCancellingSpk(null);
          setCancellationReason('');
        }}
      >
        <div className="mt-3">
          <label className="block text-xs font-mono text-text-muted mb-1.5">
            ALASAN PEMBATALAN <span className="text-status-danger">*</span>
          </label>
          <textarea
            rows={3}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Masukkan alasan pembatalan (misal: Permintaan pembatalan sepihak klien, perubahan spesifikasi total, dsb.)"
            className="w-full bg-background border border-border rounded-lg p-2.5 text-xs sm:text-sm text-text focus:outline-none focus:border-status-danger resize-none"
          />
        </div>
      </ConfirmationModal>

      {/* Modal Konfirmasi Ekspor Laporan SPK */}
      <ConfirmationModal
        isOpen={showExportModal}
        title="Ekspor Ringkasan Laporan SPK?"
        message={`Sistem akan mengekspor ${filteredSpks.length} data SPK sesuai filter aktif saat ini ke dalam berkas format CSV. Lanjutkan pengunduhan berkas?`}
        confirmText="Unduh Laporan CSV"
        cancelText="Batal"
        variant="info"
        onConfirm={executeExportSpkSummary}
        onCancel={() => setShowExportModal(false)}
      />

      {/* Modal Feedback dan Notifikasi Umum */}
      {feedbackModal && (
        <ConfirmationModal
          isOpen={feedbackModal.isOpen}
          title={feedbackModal.title}
          message={feedbackModal.message}
          confirmText="Mengerti"
          hideCancel={true}
          variant={feedbackModal.variant}
          onConfirm={() => setFeedbackModal(null)}
          onCancel={() => setFeedbackModal(null)}
        />
      )}

      {/* Modal Reset Simulasi Transaksi (Khusus Owner) */}
      <ResetSimulationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
};
