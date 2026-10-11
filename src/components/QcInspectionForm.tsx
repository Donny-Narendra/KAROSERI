import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ConfirmationModal, type ConfirmationModalVariant } from './ConfirmationModal';

interface QcInspectionFormProps {
  spkId: string;
  onQcUpdated?: () => void;
}

const CHECKLIST_ITEMS = [
  { key: 'shower_test', label: 'Shower Test Anti Bocor (Water Leaks)' },
  { key: 'uji_hidrolik', label: 'Uji Hidrolik (Hydraulic Test)' },
  { key: 'dimensi_kendaraan', label: 'Dimensi Kendaraan (Dimensions Check)' },
  { key: 'uji_kelistrikan', label: 'Uji Kelistrikan (Electrical Test)' }
] as const;

export const QcInspectionForm: React.FC<QcInspectionFormProps> = ({ spkId, onQcUpdated }) => {
  const [params, setParams] = useState({
    shower_test: false,
    uji_hidrolik: false,
    dimensi_kendaraan: false,
    uji_kelistrikan: false
  });
  const [status, setStatus] = useState<'PENDING' | 'PASS' | 'FAIL'>('PENDING');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  // Notification / Alert Modal state
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    variant?: ConfirmationModalVariant;
  } | null>(null);

  React.useEffect(() => {
    if (!spkId) return;

    const fetchQcData = async () => {
      setLoading(true);
      try {
        // Fetch SPK status, qc_status, and final_qc_checklist
        const { data: spkData, error: spkError } = await supabase
          .from('spk')
          .select('status, qc_status, final_qc_checklist')
          .eq('id', spkId)
          .single();
          
        if (spkError) throw spkError;
        
        if (spkData.status === 'DRAFT') {
          setIsDraft(true);
          return;
        }

        const checklist = Array.isArray(spkData.final_qc_checklist) ? spkData.final_qc_checklist : [];
        const currentQcStatus = (spkData.qc_status as 'PENDING' | 'PASS' | 'FAIL') || 'PENDING';

        if (checklist.length > 0 || currentQcStatus === 'PASS' || currentQcStatus === 'FAIL') {
          setParams({
            shower_test: checklist.includes('shower_test') || checklist.includes('Shower Test Anti Bocor (Water Leaks)'),
            uji_hidrolik: checklist.includes('uji_hidrolik') || checklist.includes('Uji Hidrolik (Hydraulic Test)'),
            dimensi_kendaraan: checklist.includes('dimensi_kendaraan') || checklist.includes('Dimensi Kendaraan (Dimensions Check)'),
            uji_kelistrikan: checklist.includes('uji_kelistrikan') || checklist.includes('Uji Kelistrikan (Electrical Test)')
          });
          setStatus(currentQcStatus);
          setSubmitted(currentQcStatus === 'PASS');
        } else {
          // Fallback to qc_inspections table if spk columns were not populated
          const { data, error } = await supabase
            .from('qc_inspections')
            .select('*')
            .eq('spk_id', spkId)
            .order('inspected_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') throw error;

          if (data && data.form_data) {
            setParams(data.form_data);
            setStatus(data.status);
            setSubmitted(data.status === 'PASS');
          } else {
            // Reset if no data found for this SPK
            setParams({
              shower_test: false,
              uji_hidrolik: false,
              dimensi_kendaraan: false,
              uji_kelistrikan: false
            });
            setStatus('PENDING');
            setSubmitted(false);
          }
        }
      } catch (err) {
        console.error('Error fetching QC data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQcData();
  }, [spkId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Require all checks to be true to pass the QC
    const allPassed = params.shower_test && params.uji_hidrolik && params.dimensi_kendaraan && params.uji_kelistrikan;
    const finalStatus: 'PASS' | 'FAIL' = allPassed ? 'PASS' : 'FAIL';
    const checkedItems = CHECKLIST_ITEMS.filter(item => params[item.key]).map(item => item.label);
    
    setLoading(true);
    try {
      // 1. Update spk.qc_status and spk.final_qc_checklist
      const { error: spkError } = await supabase
        .from('spk')
        .update({
          qc_status: finalStatus,
          final_qc_checklist: checkedItems
        })
        .eq('id', spkId);

      if (spkError) throw spkError;

      // 2. Also record in qc_inspections for inspection audit trail
      try {
        await supabase
          .from('qc_inspections')
          .insert({
            spk_id: spkId,
            form_data: params,
            status: finalStatus,
            inspected_at: new Date().toISOString()
          });
      } catch (logErr) {
        console.warn('Logging to qc_inspections failed (non-blocking):', logErr);
      }

      setStatus(finalStatus);
      setSubmitted(finalStatus === 'PASS');
      onQcUpdated?.();
      setNotification({
        title: 'QC Inspection Disubmit',
        message: `Hasil inspeksi QC berhasil disimpan dengan status: ${finalStatus}.`,
        variant: finalStatus === 'PASS' ? 'success' : 'warning'
      });
    } catch (err: any) {
      console.error('Error submitting QC inspection:', err);
      setNotification({
        title: 'Gagal Submit QC',
        message: 'Gagal menyimpan hasil inspeksi QC: ' + (err.message || 'Terjadi kesalahan.'),
        variant: 'danger'
      });
    } finally {
      setLoading(false);
    }
  };

  if (isDraft) {
    return (
      <div className="bg-status-warning/10 border-l-4 border-status-warning p-4 rounded mt-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-status-warning" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-status-warning">Akses Ditolak</h3>
            <div className="mt-2 text-sm text-status-warning/80">
              <p>SPK ini masih berstatus DRAFT. Inspeksi QC baru dapat diakses setelah SPK disetujui.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface p-6 rounded-lg shadow-sm border border-border mt-6">
      <h2 className="text-xl font-display font-semibold mb-4 text-primary">Final QC Inspection</h2>
      {(submitted || status !== 'PENDING') && (
        <div className={`mb-4 p-3 rounded text-sm font-medium ${status === 'PASS' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
          Current Status: {status}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center space-x-3 cursor-pointer p-3 border border-border rounded hover:bg-background transition-colors">
            <input 
              type="checkbox" 
              className="w-5 h-5 accent-primary" 
              checked={params.shower_test}
              onChange={(e) => setParams({...params, shower_test: e.target.checked})}
            />
            <span className="font-medium">Shower Test Anti Bocor (Water Leaks)</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer p-3 border border-border rounded hover:bg-background transition-colors">
            <input 
              type="checkbox" 
              className="w-5 h-5 accent-primary" 
              checked={params.uji_hidrolik}
              onChange={(e) => setParams({...params, uji_hidrolik: e.target.checked})}
            />
            <span className="font-medium">Uji Hidrolik (Hydraulic Test)</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer p-3 border border-border rounded hover:bg-background transition-colors">
            <input 
              type="checkbox" 
              className="w-5 h-5 accent-primary" 
              checked={params.dimensi_kendaraan}
              onChange={(e) => setParams({...params, dimensi_kendaraan: e.target.checked})}
            />
            <span className="font-medium">Dimensi Kendaraan (Dimensions Check)</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer p-3 border border-border rounded hover:bg-background transition-colors">
            <input 
              type="checkbox" 
              className="w-5 h-5 accent-primary" 
              checked={params.uji_kelistrikan}
              onChange={(e) => setParams({...params, uji_kelistrikan: e.target.checked})}
            />
            <span className="font-medium">Uji Kelistrikan (Electrical Test)</span>
          </label>
        </div>
        
        <button 
          type="submit" 
          disabled={loading || submitted && status === 'PASS'}
          className={`w-full py-3 rounded-lg font-bold transition-all ${
            loading || (submitted && status === 'PASS')
              ? 'bg-surface border border-border text-text-muted cursor-not-allowed'
              : 'bg-primary text-primary-content hover:brightness-110 shadow-[0_0_15px_rgba(255,107,0,0.3)]'
          }`}
        >
          {loading ? 'Loading...' : (submitted && status === 'PASS' ? 'QC Passed' : 'Submit Final QC')}
        </button>
      </form>

      {/* Modal Notifikasi / Alert QC */}
      <ConfirmationModal
        isOpen={!!notification}
        title={notification?.title || 'Pemberitahuan'}
        message={notification?.message || ''}
        confirmText="Tutup"
        variant={notification?.variant || 'info'}
        hideCancel={true}
        onConfirm={() => setNotification(null)}
        onCancel={() => setNotification(null)}
      />
    </div>
  );
};
