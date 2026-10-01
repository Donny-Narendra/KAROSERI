import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, AlertTriangle, ShieldCheck, Factory, LogOut, Package } from 'lucide-react';

const MOCK_SPKS = [
  {
    id: 'SPK-10024',
    client: 'PT Logistik Indo',
    wbsPhase: '3. Dinding/Fabrikasi',
    dpStatus: 'Lunas',
    materialStatus: 'In Budget',
    qcStatus: 'Pending WBS',
    handoverStatus: 'Locked',
    isOverbudget: false,
  },
  {
    id: 'SPK-10025',
    client: 'Sinar Karya',
    wbsPhase: '2. Sasis/Rangka',
    dpStatus: 'Lunas',
    materialStatus: 'Overbudget (+12%)',
    qcStatus: 'Pending WBS',
    handoverStatus: 'Locked',
    isOverbudget: true,
  },
  {
    id: 'SPK-10018',
    client: 'Trans Buana',
    wbsPhase: '5. Kelistrikan',
    dpStatus: 'Lunas',
    materialStatus: 'In Budget',
    qcStatus: 'Waiting Review',
    handoverStatus: 'Locked',
    isOverbudget: false,
  },
];

export const AdminDashboardPage: React.FC = () => {
  const { profile, signOut } = useAuth();

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
            onClick={signOut}
            className="flex items-center gap-2 text-sm bg-surface-hover hover:bg-surface-active px-3 py-1.5 rounded transition text-status-danger"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-display text-text">Owner Dashboard</h2>
          <div className="bg-primary/20 text-primary text-xs font-mono px-2 py-1 rounded">
            Live Telemetry Active
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-muted font-mono">ACTIVE BAYS</p>
                <p className="text-3xl font-bold text-text mt-2">14 <span className="text-sm text-text-muted font-normal">/ 20</span></p>
              </div>
              <div className="w-10 h-10 rounded bg-secondary/20 flex items-center justify-center text-secondary">
                <Factory className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-muted font-mono">TOTAL WIP VALUE</p>
                <p className="text-2xl font-bold text-text mt-2">Rp 4.2B</p>
                <p className="text-xs text-text-muted mt-1">Material + Labor + Overhead</p>
              </div>
              <div className="w-10 h-10 rounded bg-status-success/20 flex items-center justify-center text-status-success">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-surface border border-status-danger/50 rounded-lg p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-status-danger/10 blur-2xl rounded-full"></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-sm text-text-muted font-mono">OVERBUDGET ALERTS</p>
                <p className="text-3xl font-bold text-status-danger mt-2">3</p>
                <p className="text-xs text-text-muted mt-1">Waiting Owner Auth (Material Gate)</p>
              </div>
              <div className="w-10 h-10 rounded bg-status-danger/20 flex items-center justify-center text-status-danger">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-muted font-mono">PENDING QC</p>
                <p className="text-3xl font-bold text-status-warning mt-2">5</p>
                <p className="text-xs text-text-muted mt-1">Shower / Dimension / Elec</p>
              </div>
              <div className="w-10 h-10 rounded bg-status-warning/20 flex items-center justify-center text-status-warning">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Monitoring Table */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden mt-8">
          <div className="px-5 py-4 border-b border-border bg-surface-hover">
            <h3 className="font-bold text-text font-display">Active SPK Monitoring (System Hard-Gates)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text">
              <thead className="bg-background text-text-muted font-mono text-xs uppercase">
                <tr>
                  <th className="px-5 py-3">SPK No.</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">WBS Phase</th>
                  <th className="px-5 py-3">DP Status</th>
                  <th className="px-5 py-3">Material Gate</th>
                  <th className="px-5 py-3">QC Status</th>
                  <th className="px-5 py-3">Handover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_SPKS.map((spk) => (
                  <tr key={spk.id} className={`hover:bg-surface-hover/50 transition ${spk.isOverbudget ? 'bg-status-danger/5' : ''}`}>
                    <td className="px-5 py-4 font-mono font-medium">{spk.id}</td>
                    <td className="px-5 py-4">{spk.client}</td>
                    <td className="px-5 py-4">
                      <span className="bg-surface-active px-2 py-1 rounded text-xs font-mono">{spk.wbsPhase}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-status-success font-medium flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4"/> {spk.dpStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {spk.isOverbudget ? (
                        <span className="text-status-danger font-bold flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4"/> {spk.materialStatus}
                        </span>
                      ) : (
                        <span className="text-status-success font-medium">{spk.materialStatus}</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={spk.qcStatus === 'Waiting Review' ? 'text-status-warning font-medium' : 'text-status-idle'}>
                        {spk.qcStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-status-danger font-medium flex items-center gap-1">
                        <Package className="w-4 h-4"/> {spk.handoverStatus}
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
