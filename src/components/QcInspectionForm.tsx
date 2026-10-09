import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface QcInspectionFormProps {
  spkId: string;
}

export const QcInspectionForm: React.FC<QcInspectionFormProps> = ({ spkId }) => {
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

  React.useEffect(() => {
    if (!spkId) return;

    const fetchQcData = async () => {
      setLoading(true);
      try {
        // Fetch SPK status
        const { data: spkData, error: spkError } = await supabase
          .from('spk')
          .select('status')
          .eq('id', spkId)
          .single();
          
        if (spkError) throw spkError;
        
        if (spkData.status === 'DRAFT') {
          setIsDraft(true);
          return;
        }

        const { data, error } = await supabase
          .from('qc_inspections')
          .select('*')
          .eq('spk_id', spkId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows returned

        if (data) {
          setParams(data.form_data);
          setStatus(data.status);
          setSubmitted(true);
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
    const finalStatus = allPassed ? 'PASS' : 'FAIL';
    
    try {
      const { error } = await supabase
        .from('qc_inspections')
        .insert({
          spk_id: spkId,
          form_data: params,
          status: finalStatus,
          inspected_at: new Date().toISOString()
        });

      if (error) throw error;

      if (finalStatus === 'PASS') {
        const { error: spkError } = await supabase
          .from('spk')
          .update({ status: 'READY_FOR_HANDOVER' })
          .eq('id', spkId);
          
        if (spkError) throw spkError;
      }

      setStatus(finalStatus);
      setSubmitted(true);
      alert(`QC Inspection submitted with status: ${finalStatus}`);
    } catch (err: any) {
      console.error('Error submitting QC inspection:', err);
      alert('Failed to submit QC inspection: ' + err.message);
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
      {submitted && (
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
    </div>
  );
};
