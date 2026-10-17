import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, 
  Clock, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Flame, 
  Zap, 
  Wind, 
  Truck,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { financialReportsService } from '../services/financialReportsService';
import type { SpkOverheadLog, CreateSpkOverheadLogPayload } from '../types/financialReports';
import { ConfirmationModal } from './ConfirmationModal';

export interface SpkOverheadModalProps {
  isOpen: boolean;
  onClose: () => void;
  spkId: string;
  spkNumber?: string;
  vehiclePlate?: string;
  customerName?: string;
  defaultCategory?: string | null;
  onOverheadUpdated?: () => void;
}

const WBS_STAGES = [
  'Pembongkaran',
  'Sasis/Rangka',
  'Dinding/Fabrikasi',
  'Cat/Finishing',
  'Kelistrikan/Hidrolik'
];

interface OverheadPreset {
  name: string;
  stage: string;
  rate: number;
  qty: number;
  icon: 'flame' | 'zap' | 'wind' | 'truck';
}

const OVERHEAD_PRESETS: OverheadPreset[] = [
  { name: 'Oven Spray Booth & Gas', stage: 'Cat/Finishing', rate: 150000, qty: 4, icon: 'flame' },
  { name: 'Listrik Mesin Las & Fabrikasi', stage: 'Dinding/Fabrikasi', rate: 50000, qty: 8, icon: 'zap' },
  { name: 'Kompresor & Alat Pneumatik', stage: 'Sasis/Rangka', rate: 35000, qty: 8, icon: 'wind' },
  { name: 'Sewa Derek / Crane Angkat', stage: 'Pembongkaran', rate: 250000, qty: 1, icon: 'truck' },
];

const formatCurrency = (val: number | null | undefined): string => {
  if (!val || isNaN(val)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
};

export const SpkOverheadModal: React.FC<SpkOverheadModalProps> = ({
  isOpen,
  onClose,
  spkId,
  spkNumber: propSpkNumber,
  vehiclePlate: propVehiclePlate,
  customerName: propCustomerName,
  defaultCategory,
  onOverheadUpdated,
}) => {
  const { user } = useAuth();

  // Header / Project state
  const [spkMeta, setSpkMeta] = useState<{
    spkNumber: string;
    vehiclePlate: string;
    customerName: string;
  }>({
    spkNumber: propSpkNumber || '',
    vehiclePlate: propVehiclePlate || '',
    customerName: propCustomerName || '',
  });

  // Overhead Logs List
  const [logs, setLogs] = useState<SpkOverheadLog[]>([]);
  const [fetchingLogs, setFetchingLogs] = useState(false);

  // Form State
  const cleanDefaultStage = useMemo(() => {
    if (!defaultCategory) return WBS_STAGES[0];
    const cleaned = defaultCategory.replace(/^WBS\s*\d+:\s*/i, '').trim();
    return WBS_STAGES.includes(cleaned) ? cleaned : WBS_STAGES[0];
  }, [defaultCategory]);

  const [wbsStage, setWbsStage] = useState<string>(cleanDefaultStage);
  const [overheadName, setOverheadName] = useState('');
  const [frequencyQty, setFrequencyQty] = useState<number | ''>(1);
  const [ratePerUnit, setRatePerUnit] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Deletion modal state
  const [logToDelete, setLogToDelete] = useState<SpkOverheadLog | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Calculate live total
  const calculatedTotal = useMemo(() => {
    const qty = typeof frequencyQty === 'number' ? frequencyQty : 0;
    const rate = typeof ratePerUnit === 'number' ? ratePerUnit : 0;
    return qty * rate;
  }, [frequencyQty, ratePerUnit]);

  // Total Overhead Spent Sum
  const totalOverheadSpent = useMemo(() => {
    return logs.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
  }, [logs]);

  // Load SPK Details if not passed via props
  const loadSpkDetails = useCallback(async () => {
    if (!spkId) return;
    if (propSpkNumber && propVehiclePlate) return;

    try {
      const { data, error } = await supabase
        .from('spk')
        .select('spk_no, vehicle_plate, customer_name')
        .eq('id', spkId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching SPK meta for overhead modal:', error);
        return;
      }

      if (data) {
        setSpkMeta({
          spkNumber: data.spk_no || propSpkNumber || '',
          vehiclePlate: data.vehicle_plate || propVehiclePlate || '',
          customerName: data.customer_name || propCustomerName || '',
        });
      }
    } catch (err) {
      console.error('Error in loadSpkDetails:', err);
    }
  }, [spkId, propSpkNumber, propVehiclePlate, propCustomerName]);

  // Load Existing Overhead Logs
  const loadOverheadLogs = useCallback(async () => {
    if (!spkId) return;
    setFetchingLogs(true);
    try {
      const data = await financialReportsService.getSpkOverheadLogs(spkId);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching overhead logs:', err);
    } finally {
      setFetchingLogs(false);
    }
  }, [spkId]);

  useEffect(() => {
    if (isOpen && spkId) {
      void loadSpkDetails();
      void loadOverheadLogs();
      setWbsStage(cleanDefaultStage);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, spkId, cleanDefaultStage, loadSpkDetails, loadOverheadLogs]);

  // Preset Selection
  const applyPreset = (preset: OverheadPreset) => {
    setOverheadName(preset.name);
    setWbsStage(preset.stage);
    setFrequencyQty(preset.qty);
    setRatePerUnit(preset.rate);
    setErrorMsg(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!overheadName.trim()) {
      setErrorMsg('Nama pembebanan overhead harus diisi.');
      return;
    }

    const qty = typeof frequencyQty === 'number' ? frequencyQty : Number(frequencyQty);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Durasi / Frekuensi aktual harus lebih dari 0.');
      return;
    }

    const rate = typeof ratePerUnit === 'number' ? ratePerUnit : Number(ratePerUnit);
    if (isNaN(rate) || rate < 0) {
      setErrorMsg('Tarif satuan per durasi tidak boleh negatif.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateSpkOverheadLogPayload = {
        spk_id: spkId,
        wbs_stage: wbsStage,
        overhead_name: overheadName.trim(),
        frequency_qty: qty,
        rate_per_unit: rate,
        notes: notes.trim() || null,
        created_by: user?.id || null,
      };

      await financialReportsService.createSpkOverheadLog(payload);

      // Reset form fields
      setOverheadName('');
      setFrequencyQty(1);
      setRatePerUnit('');
      setNotes('');
      setSuccessMsg(`Berhasil mencatat overhead: ${payload.overhead_name}`);

      // Refresh list & notify parent
      await loadOverheadLogs();
      onOverheadUpdated?.();
    } catch (err) {
      console.error('Error submitting overhead log:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan catatan overhead.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handler
  const confirmDelete = async () => {
    if (!logToDelete) return;
    setDeleting(true);
    try {
      await financialReportsService.deleteSpkOverheadLog(logToDelete.id);
      setLogToDelete(null);
      await loadOverheadLogs();
      onOverheadUpdated?.();
      setSuccessMsg('Catatan overhead berhasil dihapus.');
    } catch (err) {
      console.error('Error deleting overhead log:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghapus catatan overhead.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-surface border border-border rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="overhead-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="overhead-modal-title" className="text-lg font-bold text-slate-100">
                  Pencatatan Overhead Pabrik (FOH)
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Floor Terminal
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                SPK: <span className="font-semibold text-slate-200">{spkMeta.spkNumber || 'N/A'}</span>
                {spkMeta.vehiclePlate && <> &bull; Plat: <span className="font-semibold text-slate-200">{spkMeta.vehiclePlate}</span></>}
                {spkMeta.customerName && <> &bull; Pelanggan: <span className="font-semibold text-slate-200">{spkMeta.customerName}</span></>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-background/80 transition-colors"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
              <button type="button" onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{successMsg}</div>
              <button type="button" onClick={() => setSuccessMsg(null)} className="text-green-400 hover:text-green-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Quick Presets Overhead Lapangan
              </span>
              <span className="text-[11px] text-text-muted">Klik untuk mengisi form otomatis</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {OVERHEAD_PRESETS.map((p) => {
                const getIcon = () => {
                  switch (p.icon) {
                    case 'flame': return <Flame className="w-3.5 h-3.5 text-amber-400" />;
                    case 'zap': return <Zap className="w-3.5 h-3.5 text-yellow-400" />;
                    case 'wind': return <Wind className="w-3.5 h-3.5 text-cyan-400" />;
                    case 'truck': return <Truck className="w-3.5 h-3.5 text-indigo-400" />;
                  }
                };

                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="p-2.5 rounded-lg bg-background/60 border border-border hover:border-purple-500/50 hover:bg-purple-500/5 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {getIcon()}
                      <span className="text-xs font-medium text-slate-200 group-hover:text-purple-300 truncate">
                        {p.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-muted flex justify-between items-center w-full mt-1">
                      <span>{p.stage}</span>
                      <span className="font-mono text-purple-400">{formatCurrency(p.rate)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Input */}
          <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-background/50 border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                Catat Pengeluaran / Alokasi FOH Baru
              </h4>
              <span className="text-xs text-text-muted">Input aktual lantai kerja</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* WBS Stage */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Tahapan WBS <span className="text-red-400">*</span>
                </label>
                <select
                  value={wbsStage}
                  onChange={(e) => setWbsStage(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-text focus:outline-none focus:ring-1 focus:ring-purple-400"
                  required
                >
                  {WBS_STAGES.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Overhead Name */}
              <div className="sm:col-span-8">
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Uraian Beban Overhead <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Oven Spray Booth Jam Lembur / Sewa Derek Mesin"
                  value={overheadName}
                  onChange={(e) => setOverheadName(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-text focus:outline-none focus:ring-1 focus:ring-purple-400"
                  required
                />
              </div>

              {/* Frequency Qty */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Durasi / Qty Aktual <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="1"
                  value={frequencyQty}
                  onChange={(e) => setFrequencyQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-text font-mono focus:outline-none focus:ring-1 focus:ring-purple-400"
                  required
                />
              </div>

              {/* Rate per Unit */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Tarif per Satuan (Rp) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Rp 0"
                  value={ratePerUnit}
                  onChange={(e) => setRatePerUnit(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-text font-mono focus:outline-none focus:ring-1 focus:ring-purple-400"
                  required
                />
              </div>

              {/* Calculated Subtotal Display */}
              <div className="sm:col-span-5 flex flex-col justify-end">
                <div className="p-2.5 rounded-lg bg-surface border border-border/80 flex items-center justify-between">
                  <span className="text-xs text-text-muted flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                    Total Biaya FOH:
                  </span>
                  <span className="text-sm font-bold font-mono text-purple-400">
                    {formatCurrency(calculatedTotal)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="sm:col-span-12">
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Catatan / Keterangan Operasional (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pemakaian spray booth shift malam untuk cat kabin primer"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-text focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-purple-600/20"
              >
                {submitting ? (
                  <>Menyimpan...</>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Simpan Catatan Overhead
                  </>
                )}
              </button>
            </div>
          </form>

          {/* History of Overhead Logs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Riwayat Pembebanan Overhead Proyek ({logs.length})
              </h4>
              <div className="text-xs text-text-muted">
                Total FOH Terealisasi:{' '}
                <span className="font-bold font-mono text-purple-400">
                  {formatCurrency(totalOverheadSpent)}
                </span>
              </div>
            </div>

            {fetchingLogs ? (
              <div className="py-8 text-center text-xs text-text-muted">
                Memuat riwayat pembebanan overhead...
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center rounded-xl border border-dashed border-border bg-background/30 text-text-muted text-xs sm:text-sm">
                Belum ada pembebanan overhead yang dicatat untuk SPK ini.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-background/80 text-text-muted border-b border-border font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Waktu</th>
                      <th className="py-2.5 px-3">Tahapan WBS</th>
                      <th className="py-2.5 px-3">Uraian Overhead</th>
                      <th className="py-2.5 px-3 text-right">Durasi / Qty</th>
                      <th className="py-2.5 px-3 text-right">Tarif Satuan</th>
                      <th className="py-2.5 px-3 text-right">Total Biaya</th>
                      <th className="py-2.5 px-3">Catatan</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {logs.map((item) => (
                      <tr key={item.id} className="hover:bg-background/40 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap text-text-muted font-mono">
                          {new Date(item.recorded_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {item.wbs_stage}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-200">
                          {item.overhead_name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {item.frequency_qty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-text-muted">
                          {formatCurrency(item.rate_per_unit)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-purple-400">
                          {formatCurrency(item.total_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-text-muted max-w-[180px] truncate" title={item.notes || ''}>
                          {item.notes || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setLogToDelete(item)}
                            className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            title="Hapus pembebanan overhead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface/90 flex justify-between items-center text-xs text-text-muted">
          <span>
            {logs.length} catatan &bull; Total FOH: <strong className="text-purple-400 font-mono">{formatCurrency(totalOverheadSpent)}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-text hover:bg-background transition-colors"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!logToDelete}
        title="Hapus Catatan Overhead?"
        message={`Apakah Anda yakin ingin menghapus catatan overhead "${logToDelete?.overhead_name}" sebesar ${formatCurrency(logToDelete?.total_amount)}? Data ini akan dikurangi dari realisasi HPP proyek.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setLogToDelete(null)}
      />
    </div>
  );
};
