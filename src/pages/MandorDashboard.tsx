import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { WbsChecklist } from '../components/WbsChecklist';
import { supabase } from '../lib/supabaseClient';
import type { Spk } from '../types/spk';
import { QcInspectionForm } from '../components/QcInspectionForm';
import { SpkSelector } from '../components/SpkSelector';

export const MandorDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [selectedSpk, setSelectedSpk] = useState<string>('');
  const [spks, setSpks] = useState<Spk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSpks = useCallback(async () => {
    try {
      const [spkRes, reqRes] = await Promise.all([
        supabase.from('spk').select('*').eq('status', 'ACTIVE').order('created_at', { ascending: false }),
        supabase.from('material_requisitions').select('id, spk_id').eq('status', 'PENDING')
      ]);

      if (spkRes.error) {
        console.error('Error fetching SPKs for Mandor:', spkRes.error);
      }

      // Hitung total pending requisitions per SPK
      const pendingCountMap = new Map<string, number>();
      if (reqRes.data) {
        reqRes.data.forEach((r: { id: string; spk_id?: string | null }) => {
          if (r.spk_id) {
            pendingCountMap.set(r.spk_id, (pendingCountMap.get(r.spk_id) || 0) + 1);
          }
        });
      }

      if (spkRes.data) {
        const enrichedSpks: Spk[] = (spkRes.data as Spk[]).map((spk) => ({
          ...spk,
          pending_requisitions_count: pendingCountMap.get(spk.id) || 0,
        }));
        setSpks(enrichedSpks);

        setSelectedSpk((prev) => {
          if (!prev) return '';
          const stillExists = enrichedSpks.some((s) => s.id === prev);
          return stillExists ? prev : '';
        });
      }
    } catch (error) {
      console.error('Error fetching SPKs and requisitions for Mandor:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (isMounted) {
        await fetchSpks();
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [fetchSpks]);

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
          
          <SpkSelector
            spks={spks}
            selectedSpkId={selectedSpk}
            onSelectSpk={setSelectedSpk}
            isLoading={loading}
          />

          {selectedSpk && (
            <>
              <WbsChecklist spkId={selectedSpk} />
              <QcInspectionForm spkId={selectedSpk} onQcUpdated={fetchSpks} />
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
