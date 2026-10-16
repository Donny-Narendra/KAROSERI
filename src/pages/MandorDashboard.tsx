import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
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
  const [wbsUpdateKey, setWbsUpdateKey] = useState<number>(0);

  const handleWbsUpdated = useCallback(() => {
    setWbsUpdateKey((prev) => prev + 1);
  }, []);

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

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: SPK Selector (Master) */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-4 lg:sticky lg:top-24">
            <SpkSelector
              spks={spks}
              selectedSpkId={selectedSpk}
              onSelectSpk={setSelectedSpk}
              isLoading={loading}
              maxHeightClassName="max-h-[420px] lg:max-h-[calc(100vh-220px)]"
            />
          </div>

          {/* Kolom Kanan: WBS Progress & QC (Detail) */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-6">
            {selectedSpk ? (
              <>
                <WbsChecklist spkId={selectedSpk} onWbsUpdated={handleWbsUpdated} />
                <QcInspectionForm spkId={selectedSpk} onQcUpdated={fetchSpks} wbsUpdateKey={wbsUpdateKey} />
              </>
            ) : (
              <div className="bg-surface border-2 border-dashed border-border rounded-xl p-10 text-center text-text-muted flex flex-col items-center justify-center min-h-[360px]">
                <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-500">
                  <ClipboardList className="w-7 h-7 text-amber-500/70" />
                </div>
                <h3 className="text-base font-semibold text-slate-200 mb-1.5">
                  Belum Ada SPK Dipilih
                </h3>
                <p className="text-xs sm:text-sm text-text-muted max-w-md leading-relaxed">
                  Pilih salah satu SPK aktif dari daftar di sebelah kiri untuk membuka lembar kerja progres WBS, permintaan material gudang, borongan teknisi, dan form checklist QC.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
