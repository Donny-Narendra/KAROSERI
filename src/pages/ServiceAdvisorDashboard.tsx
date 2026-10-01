import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, FileText, Plus, ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { SpkForm } from '../components/SpkForm';
import { AmendmentManager } from '../components/AmendmentManager';

export const ServiceAdvisorDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [spks, setSpks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSpkId, setSelectedSpkId] = useState<string | null>(null);

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
          <h2 className="text-2xl font-bold font-display text-text">Vehicle Check-in</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary hover:bg-primary-hover text-background font-bold py-2 px-4 rounded transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New SPK
            </button>
          )}
        </div>

        {showForm ? (
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
               <h3 className="font-bold text-lg text-text mb-2">SPK Details</h3>
               <p className="text-sm text-text-muted mb-4">Detailed view and change orders for this SPK.</p>
               <div className="font-mono text-sm bg-background p-3 rounded border border-border">
                 SPK ID: {spks.find(s => s.id === selectedSpkId)?.spk_no || selectedSpkId}
               </div>
            </div>
            <AmendmentManager spkId={selectedSpkId} />
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-surface-hover">
              <h3 className="font-bold text-text font-display flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary"/> Recent SPKs
              </h3>
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
                    {spks.map((spk) => (
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
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setSelectedSpkId(spk.id)}
                            className="text-primary hover:text-primary-hover text-sm font-medium transition"
                          >
                            Manage
                          </button>
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
    </div>
  );
};
