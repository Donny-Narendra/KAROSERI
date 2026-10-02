import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, AlertTriangle, ShieldCheck, Factory, LogOut, Package, Settings } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

export const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const [spks, setSpks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpks();
  }, []);

  const fetchSpks = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('spk').select('*').order('created_at', { ascending: false });
    if (data) setSpks(data);
    if (error) console.error('Error fetching SPKs:', error);
    setLoading(false);
  };

  const activeSpks = spks.filter(s => s.status === 'ACTIVE');
  const activeBays = activeSpks.length;
  const totalBays = 20;

  const totalWipValue = activeSpks.reduce((sum, spk) => sum + (Number(spk.total_estimated_cost) || 0), 0);
  const formattedWip = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalWipValue);

  const overbudgetCount = spks.filter(s => s.is_overbudget === true || s.material_gate_status === 'OVERBUDGET').length;
  const pendingQcCount = spks.filter(s => s.qc_status === 'PENDING' || s.wbs_status === 'WAITING_REVIEW').length;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Factory className="text-primary w-6 h-6" />
          <h1 className="font-display font-bold text-xl text-text">RobelKaroseri Admin</h1>
        </div>
        <div className="flex items-center gap-4">
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
          <h2 className="text-2xl font-bold font-display text-text">{t('admin.dashboard_title')}</h2>
          <div className="bg-primary/20 text-primary text-xs font-mono px-2 py-1 rounded">
            {t('admin.live_telemetry')}
          </div>
        </div>

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
      </main>
    </div>
  );
};
