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

export const WarehouseDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [pendingReqCount, setPendingReqCount] = useState<number>(0);
  const [selectedSpkFilter, setSelectedSpkFilter] = useState<string>('ALL');
  const [spkFilterList, setSpkFilterList] = useState<SpkFilterItem[]>([]);
  const [recentApprovals, setRecentApprovals] = useState<StockAuditItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'issue' | 'return' | 'requisition' | 'inventory' | 'packages'>('requisition');

  const handleSpkSummaryChange = useCallback((summary: SpkFilterItem[]) => {
    setSpkFilterList(summary);
    const totalPendingItems = summary.reduce((acc, curr) => acc + (curr.count || 0), 0);
    setPendingReqCount(totalPendingItems);
  }, []);

  const handleApprovalRecorded = useCallback((newAudits: StockAuditItem[]) => {
    setRecentApprovals(prev => [...newAudits, ...prev].slice(0, 15));
  }, []);

  const fetchPendingReqCount = async () => {
    try {
      const { data, error } = await supabase
        .from('material_requisitions')
        .select(`
          id,
          spk_id,
          status,
          wbs_category,
          spk:spk_id ( id, spk_no, spk_number, customer_name, vehicle_plate, sub_tasks ),
          material_requisition_items (
            id,
            status,
            quantity,
            material_id,
            material_name,
            materials ( id, name, unit, unit_price )
          )
        `)
        .in('status', ['PENDING', 'PARTIALLY_ISSUED'])
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        let totalPendingItemsCount = 0;
        const map = new Map<string, SpkFilterItem>();

        data.forEach((req: any) => {
          const items = req.material_requisition_items || req.items || [];
          const pendingItems = items.filter((it: any) => it.status === 'PENDING' || !it.status);
          
          // Lewati jika seluruh item pada dokumen requisition sudah disetujui / ditolak
          if (pendingItems.length === 0) return;

          totalPendingItemsCount += pendingItems.length;

          const rawSpk = Array.isArray(req.spk) ? req.spk[0] : req.spk;
          const spkId = rawSpk?.id || req.spk_id;
          const spkNo = rawSpk?.spk_no || rawSpk?.spk_number || 'Tanpa SPK';
          const customerName = rawSpk?.customer_name || 'Umum';
          const vehiclePlate = rawSpk?.vehicle_plate || '';
          const subTasks = rawSpk?.sub_tasks || [];
          
          if (map.has(spkNo)) {
            const current = map.get(spkNo)!;
            current.count += pendingItems.length;
            if (!current.vehiclePlate && vehiclePlate) current.vehiclePlate = vehiclePlate;
            const hasExistingSubTasks = Array.isArray(current.subTasks) ? current.subTasks.length > 0 : Boolean(current.subTasks);
            const hasNewSubTasks = Array.isArray(subTasks) ? subTasks.length > 0 : Boolean(subTasks);
            if (!hasExistingSubTasks && hasNewSubTasks) current.subTasks = subTasks;
          } else {
            map.set(spkNo, {
              spkId: spkId || null,
              spkNo,
              customerName,
              vehiclePlate,
              subTasks,
              count: pendingItems.length
            });
          }
        });

        setPendingReqCount(totalPendingItemsCount);
        setSpkFilterList(Array.from(map.values()).sort((a, b) => a.spkNo.localeCompare(b.spkNo)));
      }
    } catch (error) {
      console.error('Error fetching pending requisitions count:', error);
    }
  };

  useEffect(() => {
    fetchPendingReqCount();
  }, [refreshKey]);

  const handleIssueSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const selectedSpkId = React.useMemo(() => {
    if (!selectedSpkFilter || selectedSpkFilter === 'ALL') return null;
    const item = spkFilterList.find(s => s.spkNo === selectedSpkFilter || s.spkId === selectedSpkFilter);
    return item?.spkId || (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedSpkFilter) ? selectedSpkFilter : null);
  }, [selectedSpkFilter, spkFilterList]);

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

            {/* Recent Issues Table (Shown when Mandor Requests or Issue Material tab is active) */}
            {(activeTab === 'requisition' || activeTab === 'issue') && (
              <RecentMaterialIssues 
                selectedSpk={selectedSpkFilter}
                selectedSpkFilter={selectedSpkFilter} 
                selectedSpkId={selectedSpkId}
                refreshKey={refreshKey} 
                onSuccess={handleIssueSuccess} 
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
