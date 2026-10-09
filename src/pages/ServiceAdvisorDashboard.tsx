import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, FileText, Plus, ClipboardList, Camera } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { SpkForm } from '../components/SpkForm';
import { AmendmentManager } from '../components/AmendmentManager';
import { RabCalculator } from '../components/RabCalculator';
import { CancelSpkModal } from '../components/CancelSpkModal';
import { SpkGalleryModal } from '../components/spk/SpkGalleryModal';
import { spkService } from '../services/spkService';
import { PackageManager } from '../components/PackageManager';

export const ServiceAdvisorDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [mainTab, setMainTab] = useState<'spk' | 'bom'>('spk');
  const [spks, setSpks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSpkId, setSelectedSpkId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'amendments' | 'rab'>('rab');
  const [listTab, setListTab] = useState<'active' | 'cancelled'>('active');
  const [cancellingSpkId, setCancellingSpkId] = useState<string | null>(null);
  const [viewingGallerySpk, setViewingGallerySpk] = useState<any | null>(null);

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
    await spkService.cancelSpk({ spkId: cancellingSpkId, reason, userId: profile.id });
    fetchSpks();
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
          <div className="flex gap-4 border-b border-border w-full max-w-xl">
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

        {mainTab === 'bom' ? (
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
              onClick={() => setSelectedSpkId(null)}
              className="text-text-muted hover:text-text mb-4 text-sm flex items-center gap-2 transition"
            >
              ← Back to SPK List
            </button>
            <div className="bg-surface border border-border rounded-lg overflow-hidden p-6 mb-6">
               <div className="flex items-center justify-between mb-4">
                 <div>
                   <h3 className="font-bold text-lg text-text mb-1">SPK Details</h3>
                   <p className="text-sm text-text-muted">Manage RAB estimation and change orders for this SPK.</p>
                 </div>
                 <div className="font-mono text-sm bg-background p-3 rounded border border-border text-primary font-bold">
                   {spks.find(s => s.id === selectedSpkId)?.spk_no || selectedSpkId}
                 </div>
               </div>
               
               <div className="flex gap-2 border-b border-border pb-0 mt-6">
                 <button 
                   onClick={() => setActiveTab('rab')}
                   className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === 'rab' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
                 >
                   RAB Calculator
                 </button>
                 <button 
                   onClick={() => setActiveTab('amendments')}
                   className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === 'amendments' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
                 >
                   Change Orders
                 </button>
               </div>
            </div>
            
            {activeTab === 'rab' ? (
              <RabCalculator spkId={selectedSpkId} />
            ) : (
              <AmendmentManager spkId={selectedSpkId} />
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
                        <td className="px-5 py-4">{spk.customer_name}</td>
                        <td className="px-5 py-4 font-mono">{spk.vehicle_plate}</td>
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
                            onClick={() => setSelectedSpkId(spk.id)}
                            className="text-primary hover:text-primary-hover text-sm font-medium transition"
                          >
                            Manage
                          </button>
                          {(spk.status === 'DRAFT' || spk.status === 'PENDING_PAYMENT') && (
                            <button
                              onClick={() => setCancellingSpkId(spk.id)}
                              className="text-status-danger hover:text-red-500 text-sm font-medium transition"
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
    </div>
  );
};
