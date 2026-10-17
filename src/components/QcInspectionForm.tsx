import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ConfirmationModal, type ConfirmationModalVariant } from './ConfirmationModal';

interface QcInspectionFormProps {
  spkId: string;
  onQcUpdated?: () => void;
  wbsUpdateKey?: number;
}

const CHECKLIST_ITEMS = [
  { key: 'shower_test', label: 'Shower Test Anti Bocor (Water Leaks)' },
  { key: 'uji_hidrolik', label: 'Uji Hidrolik (Hydraulic Test)' },
  { key: 'dimensi_kendaraan', label: 'Dimensi Kendaraan (Dimensions Check)' },
  { key: 'uji_kelistrikan', label: 'Uji Kelistrikan (Electrical Test)' }
] as const;

const WBS_CATEGORIES = [
  'Pembongkaran',
  'Sasis/Rangka',
  'Dinding/Fabrikasi',
  'Cat/Finishing',
  'Kelistrikan/Hidrolik'
];

interface WbsItemCheck {
  wbs_category: string;
  status: 'PENDING' | 'PASS' | 'FAIL';
  progress_percentage: number;
}

export const QcInspectionForm: React.FC<QcInspectionFormProps> = ({ spkId, onQcUpdated, wbsUpdateKey }) => {
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
  const [wbsChecklists, setWbsChecklists] = useState<WbsItemCheck[]>([]);

  // Notification / Alert Modal state
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    variant?: ConfirmationModalVariant;
  } | null>(null);

  useEffect(() => {
    if (!spkId) return;

    const fetchQcData = async () => {
      setLoading(true);
      try {
        // Fetch SPK status, qc_status, final_qc_checklist, dan wbs_checklists secara bersamaan
        const [spkRes, wbsRes] = await Promise.all([
          supabase
            .from('spk')
            .select('status, qc_status, final_qc_checklist')
            .eq('id', spkId)
            .single(),
          supabase
            .from('wbs_checklists')
            .select('wbs_category, status, progress_percentage')
            .eq('spk_id', spkId)
        ]);

        if (spkRes.error) throw spkRes.error;
        const spkData = spkRes.data;

        if (wbsRes.data) {
          setWbsChecklists(wbsRes.data as WbsItemCheck[]);
        } else {
          setWbsChecklists([]);
        }

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
  }, [spkId, wbsUpdateKey]);

  // Evaluasi kelayakan tahapan WBS (Pre-condition 2: Tidak ada WBS FAIL dan seluruh tahapan tuntas)
  const wbsValidation = useMemo(() => {
    const map = new Map<string, { status?: string; progress?: number }>();
    wbsChecklists.forEach((item) => {
      if (item.wbs_category) {
        map.set(item.wbs_category, {
          status: item.status,
          progress: item.progress_percentage || 0
        });
      }
    });

    const failedCategories: string[] = [];
    const incompleteCategories: string[] = [];

    WBS_CATEGORIES.forEach((cat) => {
      const record = map.get(cat);
      if (!record) {
        incompleteCategories.push(cat);
      } else if (record.status === 'FAIL') {
        failedCategories.push(cat);
      } else if (record.status !== 'PASS' || (record.progress || 0) < 100) {
        incompleteCategories.push(cat);
      }
    });

    const isWbsReady = failedCategories.length === 0 && incompleteCategories.length === 0;

    return {
      failedCategories,
      incompleteCategories,
      isWbsReady
    };
  }, [wbsChecklists]);

  // Evaluasi kelayakan Checklist Final (Pre-condition 1: Seluruh 4 checklist tercentang)
  const isChecklistAllChecked = Boolean(
    params.shower_test &&
    params.uji_hidrolik &&
    params.dimensi_kendaraan &&
    params.uji_kelistrikan
  );

  // Status kelayakan submit Final QC (Hard-Gate Condition)
  const isAllPassed = isChecklistAllChecked && wbsValidation.isWbsReady;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard Clause: Cegah eksekusi jika kondisi Hard-Gate belum lolos
    if (!isAllPassed) {
      setNotification({
        title: 'Hard-Gate QC Terkunci',
        message: 'Tidak dapat mengirim Final QC: Semua checklist wajib dicentang dan seluruh tahapan WBS harus lolos uji!',
        variant: 'danger'
      });
      return;
    }

    setLoading(true);
    try {
      const finalStatus = 'PASS' as const;
      const checkedItems = CHECKLIST_ITEMS.filter(item => params[item.key]).map(item => item.label);

      // 1. Update spk.qc_status dan spk.final_qc_checklist
      const { error: spkError } = await supabase
        .from('spk')
        .update({
          qc_status: finalStatus,
          final_qc_checklist: checkedItems
        })
        .eq('id', spkId);

      if (spkError) throw spkError;

      // 2. Rekam di qc_inspections untuk riwayat audit inspeksi
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
      setSubmitted(true);
      onQcUpdated?.();
      setNotification({
        title: 'Final QC Berhasil Disetujui',
        message: 'Hasil inspeksi Final QC berhasil disimpan. Unit SPK resmi dinyatakan LULUS (PASS).',
        variant: 'success'
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-display font-semibold text-primary">Final QC Inspection</h2>
          <p className="text-xs text-text-muted mt-0.5">Pemeriksaan kelaikan unit sebelum serah terima (BAST)</p>
        </div>
      </div>

      {/* Dynamic Feedback UI Banner */}
      {status === 'PASS' ? (
        <div className="mb-4 p-3.5 rounded-lg text-sm font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Current Status: PASS (Telah Lulus Final QC)</span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
            TERVERIFIKASI
          </span>
        </div>
      ) : isAllPassed ? (
        <div className="mb-4 p-3.5 rounded-lg text-sm font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Current Status: READY TO PASS</span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold animate-pulse">
            SIAP SUBMIT
          </span>
        </div>
      ) : (
        <div className="mb-4 p-3.5 rounded-lg text-sm bg-rose-950/60 border border-rose-800 text-rose-300 space-y-2 shadow-xs">
          <div className="flex items-center justify-between font-semibold">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>Current Status: INCOMPLETE / FAIL</span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono font-bold">
              HARD-GATE LOCKED
            </span>
          </div>
          <div className="pt-1.5 border-t border-rose-900/60 text-xs text-rose-200/90 space-y-1">
            {!isChecklistAllChecked && (
              <div className="flex items-start gap-1.5">
                <span className="text-rose-400 font-bold">•</span>
                <span>Lengkapi 4 parameter checklist Final QC di bawah ini.</span>
              </div>
            )}
            {wbsValidation.failedCategories.length > 0 && (
              <div className="flex items-start gap-1.5">
                <span className="text-rose-400 font-bold">•</span>
                <span>Tahapan WBS berstatus QC FAIL: <strong className="text-rose-100">{wbsValidation.failedCategories.join(', ')}</strong></span>
              </div>
            )}
            {wbsValidation.incompleteCategories.length > 0 && (
              <div className="flex items-start gap-1.5">
                <span className="text-rose-400 font-bold">•</span>
                <span>Tahapan WBS belum 100% tuntas / belum lolos QC: <strong className="text-rose-100">{wbsValidation.incompleteCategories.join(', ')}</strong></span>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => (
            <label
              key={item.key}
              className={`flex items-center space-x-3 cursor-pointer p-3 border rounded transition-colors ${
                params[item.key]
                  ? 'border-emerald-500/50 bg-emerald-950/20'
                  : 'border-border hover:bg-background'
              }`}
            >
              <input 
                type="checkbox" 
                className="w-5 h-5 accent-emerald-500 cursor-pointer" 
                checked={params[item.key]}
                disabled={submitted && status === 'PASS'}
                onChange={(e) => setParams({ ...params, [item.key]: e.target.checked })}
              />
              <span className={`font-medium text-sm ${params[item.key] ? 'text-emerald-300' : 'text-slate-200'}`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
        
        {/* Tombol Submit & Peringatan Hard-Gate */}
        <div className="space-y-2 pt-2">
          <button 
            type="submit" 
            disabled={loading || (submitted && status === 'PASS') || !isAllPassed}
            title={!isAllPassed ? "Lengkapi dan centang semua parameter inspeksi di atas untuk mengaktifkan persetujuan Final QC." : undefined}
            className={`w-full py-3 rounded-lg font-bold transition-all ${
              loading || (submitted && status === 'PASS') || !isAllPassed
                ? 'bg-surface border border-border text-text-muted opacity-50 cursor-not-allowed'
                : 'bg-primary text-primary-content hover:brightness-110 shadow-[0_0_15px_rgba(255,107,0,0.3)] cursor-pointer'
            }`}
          >
            {loading 
              ? 'Menyimpan...' 
              : (submitted && status === 'PASS') 
                ? 'QC Passed (Sudah Lulus)' 
                : 'Submit Final QC'}
          </button>

          {!isAllPassed && status !== 'PASS' && (
            <p className="text-xs text-text-muted text-center flex items-center justify-center gap-1.5 pt-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Lengkapi dan centang semua parameter inspeksi di atas untuk mengaktifkan persetujuan Final QC.</span>
            </p>
          )}
        </div>
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
