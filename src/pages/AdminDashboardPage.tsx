import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, AlertTriangle, ShieldCheck, Factory, LogOut, Package, Settings, Bell, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { PackageManager } from '../components/PackageManager';
import { spkService } from '../services/spkService';

export const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const [mainTab, setMainTab] = useState<'dashboard' | 'bom'>('dashboard');
  const [spks, setSpks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApprovalsModal, setShowApprovalsModal] = useState(false);

  useEffect(() => {
    fetchSpks();
  }, []);

  const fetchSpks = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('spk').select(`
      *,
      rab_estimations ( total_estimated_cost, total_labor_cost, total_overhead_cost ),
      inventory_transactions ( quantity_issued, custom_unit_price, materials ( unit_price, is_customer_supplied ) ),
      spk_amendments ( id, description, cost_adjustment, status, created_at, spk_id )
    `).order('created_at', { ascending: false });
    if (data) setSpks(data);
    if (error) console.error('Error fetching SPKs:', error);
    setLoading(false);
  };

  const activeSpks = spks.filter(s => s.status === 'ACTIVE');
  const activeBays = activeSpks.length;
  const totalBays = 20;

  const pendingAmendments = spks.flatMap(s => (s.spk_amendments || []).map((a: any) => ({...a, spk_no: s.spk_no, customer_name: s.customer_name}))).filter((a: any) => a.status === 'PENDING');
  const pendingAmendmentsCount = pendingAmendments.length;

  const handleApprovalAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      if (action === 'APPROVED') {
        if (!profile?.id) throw new Error("User ID is missing");
        await spkService.approveAmendment(id, profile.id);
      } else {
        await spkService.rejectAmendment(id);
      }
      fetchSpks(); // refresh data
    } catch (err) {
      console.error(`Error updating amendment to ${action}:`, err);
    }
  };

  const totalWipValue = activeSpks.reduce((sum, spk) => sum + (Number(spk.total_estimated_cost) || 0), 0);
  const formattedWip = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalWipValue);

  const overbudgetCount = spks.filter(s => s.is_overbudget === true || s.material_gate_status === 'OVERBUDGET').length;
  const pendingQcCount = spks.filter(s => s.qc_status === 'PENDING' || s.wbs_status === 'WAITING_REVIEW').length;

  const validSpksForCosting = spks.filter(s => !['CANCELLED', 'DRAFT', 'PENDING_DP'].includes(s.status));
  let totalProjectedCost = 0;
  let totalActualCost = 0;

  validSpksForCosting.forEach(spk => {
    let estCost = 0;
    let laborCost = 0;
    let overheadCost = 0;
    if (spk.rab_estimations && spk.rab_estimations.length > 0) {
      estCost = Number(spk.rab_estimations[0].total_estimated_cost || 0);
      laborCost = Number(spk.rab_estimations[0].total_labor_cost || 0);
      overheadCost = Number(spk.rab_estimations[0].total_overhead_cost || 0);
    } else if (spk.total_estimated_cost) {
      estCost = Number(spk.total_estimated_cost);
      laborCost = estCost * 0.3; 
    }
    let actualMaterial = 0;
    if (spk.inventory_transactions && spk.inventory_transactions.length > 0) {
      actualMaterial = spk.inventory_transactions.reduce((acc: number, curr: any) => {
        const isCustomerSupplied = curr.materials?.is_customer_supplied === true;
        if (isCustomerSupplied) return acc;
        const price = curr.custom_unit_price !== null && curr.custom_unit_price !== undefined 
                      ? curr.custom_unit_price 
                      : (curr.materials?.unit_price || 0);
        return acc + (Number(curr.quantity_issued) * Number(price));
      }, 0);
    }
    if (actualMaterial === 0 && estCost > 0) {
      actualMaterial = Math.max(0, estCost - laborCost - overheadCost);
    }
    totalProjectedCost += estCost;
    totalActualCost += (actualMaterial + laborCost + overheadCost);
  });
  
  const marginPercentage = totalProjectedCost > 0 ? ((totalProjectedCost - totalActualCost) / totalProjectedCost) * 100 : 0;

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
              Paket Produk (BOM)
            </button>
          </div>
          <div className="bg-primary/20 text-primary text-xs font-mono px-2 py-1 rounded shrink-0">
            {t('admin.live_telemetry')}
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
                    {marginPercentage > 0 ? '+' : ''}{marginPercentage.toFixed(2)}%
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

        {/* Monitoring Table */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden mt-8">
          <div className="px-5 py-4 border-b border-border bg-surface-hover">
            <h3 className="font-bold text-text font-display">{t('admin.spk_monitoring')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text">
              <thead className="bg-background text-text-muted font-mono text-xs uppercase">
                <tr>
                  <th className="px-5 py-3">{t('admin.spk_no')}</th>
                  <th className="px-5 py-3">{t('admin.client')}</th>
                  <th className="px-5 py-3">{t('admin.wbs_phase')}</th>
                  <th className="px-5 py-3">{t('admin.dp_status')}</th>
                  <th className="px-5 py-3">{t('admin.material_gate')}</th>
                  <th className="px-5 py-3">{t('admin.qc_status')}</th>
                  <th className="px-5 py-3">{t('admin.handover')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {spks.map((spk) => (
                  <tr key={spk.id} className={`hover:bg-surface-hover/50 transition`}>
                    <td className="px-5 py-4 font-mono font-medium">{spk.spk_no}</td>
                    <td className="px-5 py-4">{spk.customer_name}</td>
                    <td className="px-5 py-4">
                      <span className="bg-surface-active px-2 py-1 rounded text-xs font-mono">Phase TBD</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-status-success font-medium flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4"/> Lunas
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-status-success font-medium">In Budget</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={'text-status-idle'}>
                        {spk.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-status-danger font-medium flex items-center gap-1">
                        <Package className="w-4 h-4"/> Locked
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cancelled SPK Log */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden mt-8">
          <div className="px-5 py-4 border-b border-border bg-surface-hover">
            <h3 className="font-bold text-status-danger font-display">{t('admin.cancelled_spk_log', 'Log SPK Dibatalkan')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text">
              <thead className="bg-background text-text-muted font-mono text-xs uppercase">
                <tr>
                  <th className="px-5 py-3">Plat Nomor / No SPK</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Waktu Cancel</th>
                  <th className="px-5 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {spks.filter(s => s.status === 'CANCELLED').length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-text-muted">
                      Tidak ada log SPK yang dibatalkan.
                    </td>
                  </tr>
                ) : spks.filter(s => s.status === 'CANCELLED').map((spk) => (
                  <tr key={spk.id} className="hover:bg-surface-hover/50 transition">
                    <td className="px-5 py-4 font-mono">
                      <div className="font-bold">{spk.vehicle_plate}</div>
                      <div className="text-xs text-text-muted">{spk.spk_no}</div>
                    </td>
                    <td className="px-5 py-4">{spk.customer_name}</td>
                    <td className="px-5 py-4">{new Date(spk.updated_at).toLocaleString('id-ID')}</td>
                    <td className="px-5 py-4 text-text-muted italic">{spk.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          </>
        ) : (
          <div className="mt-4">
            <PackageManager />
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
                          onClick={() => handleApprovalAction(amendment.id, 'APPROVED')}
                          className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-status-success/10 hover:bg-status-success/20 text-status-success rounded text-sm font-medium transition"
                        >
                          <Check className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => handleApprovalAction(amendment.id, 'REJECTED')}
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
    </div>
  );
};
