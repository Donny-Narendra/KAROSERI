import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { WbsChecklist } from '../components/WbsChecklist';
import { supabase } from '../lib/supabaseClient';

import { QcInspectionForm } from '../components/QcInspectionForm';

export const MandorDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [selectedSpk, setSelectedSpk] = useState<string>('');
  const [spks, setSpks] = useState<any[]>([]);

  useEffect(() => {
    fetchSpks();
  }, []);

  const fetchSpks = async () => {
    const { data, error } = await supabase.from('spk').select('*').eq('status', 'ACTIVE');
    if (data) setSpks(data);
    if (error) console.error('Error fetching SPKs:', error);
  };

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="bg-surface border-b border-border p-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-display font-bold text-primary">Mandor Terminal</h1>
            <p className="text-text-muted text-sm">Industrial QC Tablet Interface</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <p className="text-xs text-text-muted capitalize">{profile?.role.replace('_', ' ')}</p>
            </div>
            <button 
              onClick={() => signOut()}
              className="px-4 py-2 bg-surface border border-border rounded text-sm hover:bg-background transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
            <h2 className="text-xl font-display font-semibold mb-4">Select Active SPK</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {spks.map(spk => (
                <button
                  key={spk.id}
                  onClick={() => setSelectedSpk(spk.id)}
                  className={`p-6 rounded-lg border text-left transition-all ${
                    selectedSpk === spk.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="text-lg font-bold">{spk.spk_no}</div>
                  <div className="text-text-muted">{spk.customer_name}</div>
                  <div className="text-sm mt-2 text-text">
                    <span className="inline-block bg-background px-2 py-1 rounded border border-border mr-2">
                      {spk.vehicle_number || 'N/A'}
                    </span>
                    <span className="text-text-muted">
                      In: {new Date(spk.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedSpk && (
            <>
              <WbsChecklist spkId={selectedSpk} />
              <QcInspectionForm spkId={selectedSpk} />
            </>
          )}

          {!selectedSpk && (
            <div className="text-center py-12 text-text-muted border-2 border-dashed border-border rounded-lg">
              Select an SPK above to view and update WBS QC Checklists
            </div>
          )}

        </div>
      </main>
    </div>
  );
};
