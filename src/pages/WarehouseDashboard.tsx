import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Factory, LogOut } from 'lucide-react';
import { GoodsIssueForm } from '../components/GoodsIssueForm';
import { GoodsReturnForm } from '../components/GoodsReturnForm';
import { RequisitionApproval } from '../components/RequisitionApproval';
import { InventoryManager } from '../components/InventoryManager';
import { PackageManager } from '../components/PackageManager';
import { RecentMaterialIssues } from '../components/RecentMaterialIssues';
import { SpkFilterListBox, type SpkFilterItem } from '../components/SpkFilterListBox';
import { RecentApprovedMaterials, type StockAuditItem } from '../components/RecentApprovedMaterials';
import { supabase } from '../lib/supabaseClient';
import { AlertTriangle } from 'lucide-react';

export const WarehouseDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [lowStockWarnings, setLowStockWarnings] = useState<any[]>([]);
  const [pendingReqCount, setPendingReqCount] = useState<number>(0);
  const [selectedSpkFilter, setSelectedSpkFilter] = useState<string>('ALL');
  const [spkFilterList, setSpkFilterList] = useState<SpkFilterItem[]>([]);
  const [recentApprovals, setRecentApprovals] = useState<StockAuditItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'issue' | 'return' | 'requisition' | 'inventory' | 'packages'>('requisition');

  const handleSpkSummaryChange = useCallback((summary: SpkFilterItem[]) => {
    setSpkFilterList(summary);
  }, []);

  const handleApprovalRecorded = useCallback((newAudits: StockAuditItem[]) => {
    setRecentApprovals(prev => [...newAudits, ...prev].slice(0, 15));
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data: matData } = await supabase
        .from('materials')
        .select('*');
      if (matData) {
        setLowStockWarnings(matData.filter(m => Number(m.current_stock) <= Number(m.minimum_stock)));
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const fetchPendingReqCount = async () => {
    try {
      const { data, count, error } = await supabase
        .from('material_requisitions')
        .select(`
          id,
          spk ( id, spk_no, customer_name )
        `, { count: 'exact' })
        .eq('status', 'PENDING');
      
      if (!error && data) {
        setPendingReqCount(count ?? data.length);
        const map = new Map<string, SpkFilterItem>();
        data.forEach((req: any) => {
          const spkId = req.spk?.id;
          const spkNo = req.spk?.spk_no || 'Tanpa SPK';
          const customerName = req.spk?.customer_name || 'Umum';
          
          if (map.has(spkNo)) {
            const current = map.get(spkNo)!;
            current.count += 1;
          } else {
            map.set(spkNo, {
              spkId: spkId || null,
              spkNo,
              customerName,
              count: 1
            });
          }
        });
        setSpkFilterList(Array.from(map.values()).sort((a, b) => a.spkNo.localeCompare(b.spkNo)));
      }
    } catch (error) {
      console.error('Error fetching pending requisitions count:', error);
    }
  };

  useEffect(() => {
    fetchMaterials();
    fetchPendingReqCount();
  }, [refreshKey]);

  const handleIssueSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

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
            <div className="flex border-b border-border">
              <button
                className={`px-4 py-2 font-medium ${activeTab === 'issue' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}
                onClick={() => setActiveTab('issue')}
              >
                Issue Material
              </button>
              <button
                className={`px-4 py-2 font-medium ${activeTab === 'return' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}
                onClick={() => setActiveTab('return')}
              >
                Return Material
              </button>
              <button
                className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === 'requisition' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}
                onClick={() => setActiveTab('requisition')}
              >
                <span>Mandor Requests</span>
                {pendingReqCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-status-warning/20 text-status-warning border border-status-warning/30">
                    {pendingReqCount}
                  </span>
                )}
              </button>
              <button
                className={`px-4 py-2 font-medium ${activeTab === 'inventory' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}
                onClick={() => setActiveTab('inventory')}
              >
                Manajemen Inventaris
              </button>
              <button
                className={`px-4 py-2 font-medium ${activeTab === 'packages' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}
                onClick={() => setActiveTab('packages')}
              >
                Paket Barang Jadi
              </button>
            </div>

            {activeTab === 'issue' ? (
              <GoodsIssueForm onSuccess={handleIssueSuccess} />
            ) : activeTab === 'return' ? (
              <GoodsReturnForm onSuccess={handleIssueSuccess} />
            ) : activeTab === 'requisition' ? (
              <RequisitionApproval
                refreshKey={refreshKey}
                selectedSpkFilter={selectedSpkFilter}
                onResetFilter={() => setSelectedSpkFilter('ALL')}
                onSpkSummaryChange={handleSpkSummaryChange}
                onApprovalRecorded={handleApprovalRecorded}
                onSuccess={handleIssueSuccess}
              />
            ) : activeTab === 'packages' ? (
              <PackageManager />
            ) : (
              <InventoryManager />
            )}
            
            {/* Recent Issues Table */}
            <RecentMaterialIssues 
              selectedSpkFilter={selectedSpkFilter} 
              refreshKey={refreshKey} 
              onSuccess={handleIssueSuccess} 
            />
          </div>
          
          <div className="space-y-6">
            {/* SPK Filter List Box (Shown when Mandor Requests or Issue Material tab is active) */}
            {(activeTab === 'requisition' || activeTab === 'issue') && (
              <SpkFilterListBox
                items={spkFilterList}
                totalPendingCount={pendingReqCount}
                selectedSpk={selectedSpkFilter}
                onSelectSpk={setSelectedSpkFilter}
              />
            )}

            {/* Riwayat Approval & Dampak Stok Widget */}
            <RecentApprovedMaterials 
              refreshKey={refreshKey} 
              recentApprovals={recentApprovals} 
            />

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
