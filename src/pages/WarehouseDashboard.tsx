import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Factory, LogOut, Search, ClipboardList } from 'lucide-react';
import { GoodsIssueForm } from '../components/GoodsIssueForm';

export const WarehouseDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Factory className="text-primary w-6 h-6" />
          <h1 className="font-display font-bold text-xl text-text">RobelKaroseri Warehouse</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-muted font-mono">{profile?.full_name} (Gudang)</span>
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
      <main className="flex-1 p-6 lg:p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold font-display text-text">Petugas Gudang Dashboard</h2>
          <p className="text-text-muted mt-1">Material Issuance and Gate 2 Enforcement</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GoodsIssueForm />
            
            {/* Recent Issues Table Mock */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-surface-hover flex justify-between items-center">
                <h3 className="font-bold text-text font-display flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Recent Material Issues
                </h3>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="text" 
                    placeholder="Search SPK..." 
                    className="bg-background border border-border rounded pl-9 pr-3 py-1 text-sm text-text focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <table className="w-full text-left text-sm text-text">
                <thead className="bg-background text-text-muted font-mono text-xs uppercase border-b border-border">
                  <tr>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">SPK No.</th>
                    <th className="px-5 py-3">Material</th>
                    <th className="px-5 py-3">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-surface-hover/50 transition">
                    <td className="px-5 py-3 text-text-muted">10:45 AM</td>
                    <td className="px-5 py-3 font-mono">SPK-10024</td>
                    <td className="px-5 py-3">Plat Besi 2mm</td>
                    <td className="px-5 py-3 font-medium">10 Lembar</td>
                  </tr>
                  <tr className="hover:bg-surface-hover/50 transition">
                    <td className="px-5 py-3 text-text-muted">09:12 AM</td>
                    <td className="px-5 py-3 font-mono">SPK-10025</td>
                    <td className="px-5 py-3">Kabel 2.5mm</td>
                    <td className="px-5 py-3 font-medium">2 Roll</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="space-y-6">
             <div className="bg-surface border border-border rounded-lg p-5">
              <h3 className="font-bold text-text font-display mb-3">Gate 2 Rules (Material)</h3>
              <ul className="space-y-3 text-sm text-text-muted">
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-status-success mt-1.5 shrink-0"></div>
                  <p>Check the system for the RAB limit + assigned waste factor before issuing materials.</p>
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-status-danger mt-1.5 shrink-0"></div>
                  <p>If requested amount exceeds remaining budget, the system will lock the issue.</p>
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
                  <p>Overbudget requests require a formal Change Order (Amandemen) approved by the Owner.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
