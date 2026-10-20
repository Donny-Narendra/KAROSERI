import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, FileText, Plus, ClipboardList, Camera, Pencil, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { SpkForm } from '../components/SpkForm';
import { SpkCredentialSection } from '../components/SpkCredentialSection';
import { AmendmentManager } from '../components/AmendmentManager';
import { RabCalculator } from '../components/RabCalculator';
import { CancelSpkModal } from '../components/CancelSpkModal';
import { SpkGalleryModal } from '../components/spk/SpkGalleryModal';
import { spkService } from '../services/spkService';
import { PackageManager } from '../components/PackageManager';
import { WbsChecklist } from '../components/WbsChecklist';
import { SAInventoryPanel } from '../components/SAInventoryPanel';
import { ConfirmationModal, type ConfirmationModalVariant } from '../components/ConfirmationModal';
import { GoodsIssueForm } from '../components/GoodsIssueForm';
import { GoodsReturnForm } from '../components/GoodsReturnForm';
import { RequisitionApproval } from '../components/RequisitionApproval';
import { InventoryManager } from '../components/InventoryManager';
import { RecentMaterialIssues } from '../components/RecentMaterialIssues';
import { SpkFilterListBox, type SpkFilterItem } from '../components/SpkFilterListBox';
import { RecentApprovedMaterials, type StockAuditItem } from '../components/RecentApprovedMaterials';

export const ServiceAdvisorDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [mainTab, setMainTab] = useState<'spk' | 'bom' | 'inventory' | 'warehouse'>('spk');
  const [spks, setSpks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSpkId, setSelectedSpkId] = useState<string | null>(null);
  const [isEditCredentialMode, setIsEditCredentialMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'wbs' | 'amendments' | 'rab'>('rab');
  const [listTab, setListTab] = useState<'active' | 'cancelled'>('active');
  const [cancellingSpkId, setCancellingSpkId] = useState<string | null>(null);
  const [viewingGallerySpk, setViewingGallerySpk] = useState<any | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: ConfirmationModalVariant;
  } | null>(null);

  // Warehouse backup operational states
  const [pendingReqCount, setPendingReqCount] = useState<number>(0);
  const [warehouseSubTab, setWarehouseSubTab] = useState<'requisition' | 'issue' | 'return' | 'inventory'>('requisition');
  const [selectedSpkFilter, setSelectedSpkFilter] = useState<string>('ALL');
  const [spkFilterList, setSpkFilterList] = useState<SpkFilterItem[]>([]);
  const [recentApprovals, setRecentApprovals] = useState<StockAuditItem[]>([]);
  const [warehouseRefreshKey, setWarehouseRefreshKey] = useState(0);

  const handleSpkSummaryChange = useCallback((summary: SpkFilterItem[]) => {
    setSpkFilterList(summary);
  }, []);

  const handleApprovalRecorded = useCallback((newAudits: StockAuditItem[]) => {
    setRecentApprovals(prev => [...newAudits, ...prev].slice(0, 15));
  }, []);

  const fetchPendingReqCount = async () => {
    try {
      const { data, count, error } = await supabase
        .from('material_requisitions')
        .select(`
          id,
          spk ( id, spk_no, customer_name, vehicle_plate, sub_tasks )
        `, { count: 'exact' })
        .eq('status', 'PENDING');
      
      if (!error && data) {
        setPendingReqCount(count ?? data.length);
        const map = new Map<string, SpkFilterItem>();
        data.forEach((req: any) => {
          const spk = Array.isArray(req.spk) ? req.spk[0] : req.spk;
          const spkId = spk?.id;
          const spkNo = spk?.spk_no || 'Tanpa SPK';
          const customerName = spk?.customer_name || 'Umum';
          const vehiclePlate = spk?.vehicle_plate || '';
          const subTasks = spk?.sub_tasks || [];
          
          if (map.has(spkNo)) {
            const current = map.get(spkNo)!;
            current.count += 1;
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
              count: 1
            });
          }
        });
        setSpkFilterList(Array.from(map.values()).sort((a, b) => a.spkNo.localeCompare(b.spkNo)));
      }
    } catch (error) {
      console.error('Error fetching pending requisitions count for SA:', error);
    }
  };

  useEffect(() => {
    fetchPendingReqCount();
  }, [warehouseRefreshKey]);

  const fetchSpks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spk')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setSpks(data || []);
    } catch (error) {
      console.error('Error fetching SPKs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpks();
  }, []);

  const handleSuccess = () => {
    setShowForm(false);
    fetchSpks();
  };

  const handleCancelSpk = async (reason: string) => {
    if (!cancellingSpkId || !profile) return;
    const spkCancelled = spks.find(s => s.id === cancellingSpkId);
    try {
      await spkService.cancelSpk({ spkId: cancellingSpkId, reason, userId: profile.id });
      fetchSpks();
      setFeedbackModal({
        isOpen: true,
        title: 'SPK Berhasil Dibatalkan',
        message: `SPK ${spkCancelled?.spk_no || cancellingSpkId} telah dibatalkan dengan alasan: "${reason}".`,
        variant: 'warning',
      });
    } catch (err: any) {
      console.error('Cancel SPK Error:', err);
      setFeedbackModal({
        isOpen: true,
        title: 'Gagal Membatalkan SPK',
        message: err.message || 'Terjadi kesalahan saat membatalkan SPK.',
        variant: 'danger',
      });
    }
  };

  const filteredSpks = spks.filter(s => 
    listTab === 'active' ? s.status !== 'CANCELLED' : s.status === 'CANCELLED'
  );

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-primary w-6 h-6" />
          <h1 className="font-display font-bold text-xl text-text">Service Advisor Portal</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-muted font-mono">{profile?.full_name} ({profile?.role})</span>
          <button 
            onClick={() => window.location.href = '/kasir'}
            className="flex items-center gap-2 text-sm bg-surface-hover hover:bg-surface-active px-3 py-1.5 rounded transition text-text"
          >
            Kasir / Billing
          </button>
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
          <div className="flex gap-4 border-b border-border w-full max-w-4xl flex-wrap">
            <button 
              onClick={() => setMainTab('spk')}
              className={`pb-2 text-lg font-bold font-display transition border-b-2 ${mainTab === 'spk' ? 'border-primary text-text' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              Vehicle Check-in
            </button>
            <button 
              onClick={() => setMainTab('bom')}
              className={`pb-2 text-lg font-bold font-display transition border-b-2 ${mainTab === 'bom' ? 'border-primary text-text' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              Katalog Paket (Assembly List)
            </button>
            <button 
              onClick={() => setMainTab('inventory')}
              className={`pb-2 text-lg font-bold font-display transition border-b-2 ${mainTab === 'inventory' ? 'border-primary text-text' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              Inventory & Audit
            </button>
            <button 
              onClick={() => setMainTab('warehouse')}
              className={`pb-2 text-lg font-bold font-display transition border-b-2 flex items-center gap-2 ${mainTab === 'warehouse' ? 'border-primary text-text' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              <span>Operasional Gudang (Backup)</span>
              {pendingReqCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingReqCount}
                </span>
              )}
            </button>
          </div>
          {!showForm && mainTab === 'spk' && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary hover:bg-primary-hover text-background font-bold py-2 px-4 rounded transition flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              New SPK
            </button>
          )}
        </div>

        {mainTab === 'warehouse' ? (
          <div className="mt-4 space-y-6">
            {/* Alert Banner for Backup Mode */}
            <div className="bg-amber-950/30 border border-amber-600/40 rounded-xl p-4 flex items-start gap-3.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-amber-200/90 leading-relaxed">
                <p className="font-bold text-amber-300">Wewenang Operasional Cadangan Aktif (Service Advisor)</p>
                <p className="mt-0.5 text-xs text-amber-200/80">
                  Digunakan saat Petugas Gudang berhalangan hadir atau membutuhkan eskalasi backup. Anda memiliki akses operasional penuh untuk <strong className="text-amber-200 font-semibold">Issue Material</strong>, <strong className="text-amber-200 font-semibold">Retur Material</strong>, serta <strong className="text-amber-200 font-semibold">Approval Permintaan Mandor</strong>. Seluruh aksi otomatis mencatat Audit Trail atas nama <strong>{profile?.full_name || 'Service Advisor'} ({profile?.role})</strong> demi menjaga integritas data dan akuntabilitas bengkel.
                </p>
              </div>
            </div>

            {/* Layout with Subtabs and Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex border-b border-border">
                  <button
                    className={`px-4 py-2 font-medium flex items-center gap-2 ${warehouseSubTab === 'requisition' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}
                    onClick={() => setWarehouseSubTab('requisition')}
                  >
                    <span>Mandor Requests</span>
                    {pendingReqCount > 0 && (
                      <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-status-warning/20 text-status-warning border border-status-warning/30">
                        {pendingReqCount}
                      </span>
                    )}
                  </button>
                  <button
                    className={`px-4 py-2 font-medium ${warehouseSubTab === 'issue' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}
                    onClick={() => setWarehouseSubTab('issue')}
                  >
                    Issue Material
                  </button>
                  <button
                    className={`px-4 py-2 font-medium ${warehouseSubTab === 'return' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}
                    onClick={() => setWarehouseSubTab('return')}
                  >
                    Return Material
                  </button>
                  <button
                    className={`px-4 py-2 font-medium ${warehouseSubTab === 'inventory' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}
                    onClick={() => setWarehouseSubTab('inventory')}
                  >
                    Inventaris Gudang
                  </button>
                </div>

                {warehouseSubTab === 'issue' && (
                  <GoodsIssueForm onSuccess={() => setWarehouseRefreshKey(k => k + 1)} />
                )}
                {warehouseSubTab === 'return' && (
                  <GoodsReturnForm onSuccess={() => setWarehouseRefreshKey(k => k + 1)} />
                )}
                {warehouseSubTab === 'requisition' && (
                  <RequisitionApproval 
                    onSuccess={() => setWarehouseRefreshKey(k => k + 1)}
                    refreshKey={warehouseRefreshKey}
                    selectedSpkFilter={selectedSpkFilter}
                    onResetFilter={() => setSelectedSpkFilter('ALL')}
                    onSpkSummaryChange={handleSpkSummaryChange}
                    onApprovalRecorded={handleApprovalRecorded}
                  />
                )}
                {warehouseSubTab === 'inventory' && (
                  <InventoryManager />
                )}
              </div>

              <div className="space-y-6">
                <SpkFilterListBox
                  items={spkFilterList}
                  totalPendingCount={pendingReqCount}
                  selectedSpk={selectedSpkFilter}
                  onSelectSpk={setSelectedSpkFilter}
                />
                <RecentMaterialIssues
                  selectedSpkFilter={selectedSpkFilter}
                  refreshKey={warehouseRefreshKey}
                  onSuccess={() => setWarehouseRefreshKey(k => k + 1)}
                />
                <RecentApprovedMaterials 
                  refreshKey={warehouseRefreshKey}
                  recentApprovals={recentApprovals}
                />
              </div>
            </div>
          </div>
        ) : mainTab === 'inventory' ? (
          <div className="mt-4">
            <SAInventoryPanel />
          </div>
        ) : mainTab === 'bom' ? (
          <div className="mt-4">
            <PackageManager />
          </div>
        ) : showForm ? (
          <div>
            <button 
              onClick={() => setShowForm(false)}
              className="text-text-muted hover:text-text mb-4 text-sm flex items-center gap-2 transition"
            >
              ← Back to List
            </button>
            <SpkForm onSuccess={handleSuccess} />
          </div>
        ) : selectedSpkId ? (
          <div>
            <button 
              onClick={() => {
                setSelectedSpkId(null);
                setIsEditCredentialMode(false);
              }}
              className="text-text-muted hover:text-text mb-4 text-sm flex items-center gap-2 transition cursor-pointer"
            >
              ← Back to SPK List
            </button>

            {/* SPK Credentials Section (View & Edit Mode) */}
            {(() => {
              const curSpk = spks.find(s => s.id === selectedSpkId);
              if (!curSpk) return null;
              return (
                <SpkCredentialSection
                  spk={curSpk}
                  onUpdated={fetchSpks}
                  initialEditMode={isEditCredentialMode}
                />
              );
            })()}

            {/* Tabs for RAB, Change Orders, WBS */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden p-6 mb-6">
               <div className="flex gap-2 border-b border-border pb-0">
                 <button 
                   onClick={() => setActiveTab('rab')}
                   className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer ${activeTab === 'rab' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
                 >
                   RAB Calculator
                 </button>
                 <button 
                   onClick={() => setActiveTab('amendments')}
                   className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer ${activeTab === 'amendments' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
                 >
                   Change Orders
                 </button>
                 <button 
                   onClick={() => setActiveTab('wbs')}
                   className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer ${activeTab === 'wbs' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
                 >
                   WBS & QC
                 </button>
               </div>
            </div>
            
            {activeTab === 'rab' ? (
              <RabCalculator spkId={selectedSpkId} />
            ) : activeTab === 'amendments' ? (
              <AmendmentManager spkId={selectedSpkId} spkNo={spks.find(s => s.id === selectedSpkId)?.spk_no} />
            ) : (
              <WbsChecklist spkId={selectedSpkId} />
            )}
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-surface-hover flex justify-between items-center">
              <h3 className="font-bold text-text font-display flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary"/> Recent SPKs
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setListTab('active')}
                  className={`px-3 py-1 text-sm font-medium rounded transition ${listTab === 'active' ? 'bg-primary text-background' : 'bg-background text-text-muted hover:text-text'}`}
                >
                  Active
                </button>
                <button
                  onClick={() => setListTab('cancelled')}
                  className={`px-3 py-1 text-sm font-medium rounded transition ${listTab === 'cancelled' ? 'bg-status-danger text-white' : 'bg-background text-text-muted hover:text-text'}`}
                >
                  Cancelled
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-text-muted">Loading SPKs...</div>
            ) : spks.length === 0 ? (
              <div className="p-8 text-center text-text-muted">No SPKs found. Create one to get started.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-text">
                  <thead className="bg-background text-text-muted font-mono text-xs uppercase">
                    <tr>
                      <th className="px-5 py-3">SPK No.</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Vehicle Plate</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Target Date</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSpks.map((spk) => (
                      <tr key={spk.id} className="hover:bg-surface-hover/50 transition">
                        <td className="px-5 py-4 font-mono font-medium text-primary">{spk.spk_no}</td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-text">{spk.customer_name}</div>
                          {spk.customer_phone && (
                            <div className="text-xs text-text-muted font-mono">{spk.customer_phone}</div>
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono">
                          <div>{spk.vehicle_plate}</div>
                          {spk.vehicle_model && (
                            <div className="text-xs text-text-muted font-sans">{spk.vehicle_model}</div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="bg-surface-active px-2 py-1 rounded text-xs font-mono">{spk.status}</span>
                        </td>
                        <td className="px-5 py-4 text-text-muted">
                          {spk.target_date ? new Date(spk.target_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-5 py-4 text-right flex justify-end gap-3 items-center">
                          <button
                            title="Lihat Foto 360°"
                            onClick={() => setViewingGallerySpk(spk)}
                            className={`p-1.5 rounded transition ${(!spk.vehicle_photos || spk.vehicle_photos.length === 0) ? 'text-text-muted hover:text-primary hover:bg-surface-active' : 'text-primary hover:bg-surface-active'}`}
                          >
                            <Camera className="w-5 h-5" />
                          </button>
                          <button
                            title="Edit Credential SPK"
                            onClick={() => {
                              setSelectedSpkId(spk.id);
                              setIsEditCredentialMode(true);
                            }}
                            className="text-amber-400 hover:text-amber-300 text-sm font-medium transition flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSpkId(spk.id);
                              setIsEditCredentialMode(false);
                            }}
                            className="text-primary hover:text-primary-hover text-sm font-medium transition cursor-pointer"
                          >
                            Manage
                          </button>
                          {(spk.status === 'DRAFT' || spk.status === 'PENDING_PAYMENT') && (
                            <button
                              onClick={() => setCancellingSpkId(spk.id)}
                              className="text-status-danger hover:text-red-500 text-sm font-medium transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      <CancelSpkModal
        isOpen={!!cancellingSpkId}
        onClose={() => setCancellingSpkId(null)}
        onConfirm={handleCancelSpk}
        spkNo={spks.find(s => s.id === cancellingSpkId)?.spk_no || ''}
      />
      
      <SpkGalleryModal
        isOpen={!!viewingGallerySpk}
        onClose={() => setViewingGallerySpk(null)}
        onPhotoAdded={(updatedSpk) => {
          setViewingGallerySpk(updatedSpk);
          setSpks(prev => prev.map(s => s.id === updatedSpk.id ? updatedSpk : s));
        }}
        spk={viewingGallerySpk}
      />

      {/* Modal Notifikasi / Feedback FeedbackModal */}
      {feedbackModal && (
        <ConfirmationModal
          isOpen={feedbackModal.isOpen}
          title={feedbackModal.title}
          message={feedbackModal.message}
          confirmText="Mengerti"
          variant={feedbackModal.variant}
          hideCancel={true}
          onConfirm={() => setFeedbackModal(null)}
          onCancel={() => setFeedbackModal(null)}
        />
      )}
    </div>
  );
};
