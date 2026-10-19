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

export interface RabOverheadItem {
  id: string;
  spk_id?: string;
  wbs_stage?: string;
  wbs_category: string;
  material_name?: string;
  description?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  item_total?: number;
  item_type?: string;
  materials?: {
    id: string;
    name: string;
    unit?: string;
    unit_price?: number;
  } | Array<{
    id: string;
    name: string;
    unit?: string;
    unit_price?: number;
  }> | null;
}

export interface SpkOverheadModalProps {
  isOpen: boolean;
  onClose: () => void;
  spkId: string;
  spkNumber?: string;
  vehiclePlate?: string;
  customerName?: string;
  defaultCategory?: string | null;
  rabOverheadItems?: RabOverheadItem[];
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

const normalizeStage = (str?: string | null): string => {
  if (!str) return '';
  return str.replace(/^WBS\s*\d+:\s*/i, '').trim().toLowerCase();
};

export const SpkOverheadModal: React.FC<SpkOverheadModalProps> = ({
  isOpen,
  onClose,
  spkId,
  spkNumber: propSpkNumber,
  vehiclePlate: propVehiclePlate,
  customerName: propCustomerName,
  defaultCategory,
  rabOverheadItems: propRabOverheadItems,
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

  // RAB Overhead items state
  const [rabOverheadItems, setRabOverheadItems] = useState<RabOverheadItem[]>(propRabOverheadItems || []);
  const [fetchingRab, setFetchingRab] = useState(false);
  const [showMasterPresets, setShowMasterPresets] = useState(false);
  const [selectedRabItemId, setSelectedRabItemId] = useState<string | null>(null);

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

  // Load RAB Overhead Items for the current SPK
  const loadRabOverheadItems = useCallback(async () => {
    if (!spkId) return;
    if (propRabOverheadItems && propRabOverheadItems.length > 0) {
      setRabOverheadItems(propRabOverheadItems);
      return;
    }

    setFetchingRab(true);
    try {
      const { data: rabEst, error: rabEstErr } = await supabase
        .from('rab_estimations')
        .select('id')
        .eq('spk_id', spkId)
        .maybeSingle();

      if (rabEstErr) {
        console.error('Error fetching RAB estimation for overhead modal:', rabEstErr);
        setRabOverheadItems([]);
        return;
      }

      if (!rabEst?.id) {
        setRabOverheadItems([]);
        return;
      }

      const { data: items, error: itemsErr } = await supabase
        .from('rab_items')
        .select(`
          id,
          quantity,
          unit,
          wbs_category,
          wbs_stage,
          description,
          material_name,
          unit_price,
          item_total,
          item_type,
          material_id,
          materials (
            id,
            name,
            unit,
            unit_price
          )
        `)
        .eq('rab_estimation_id', rabEst.id);

      if (itemsErr) {
        console.error('Error fetching RAB items for overhead modal:', itemsErr);
        setRabOverheadItems([]);
        return;
      }

      const overheadOnly: RabOverheadItem[] = (items || []).filter((item: any) => {
        if (item.item_type?.toUpperCase() === 'OVERHEAD') return true;
        const mat = Array.isArray(item.materials) ? item.materials[0] : item.materials;
        const name = (mat?.name || item.material_name || item.description || '').toLowerCase();
        if (name.includes('listrik') || name.includes('kompressor') || name.includes('kompresor') || name.includes('sewa bay') || name.includes('crane') || name.includes('overhead')) {
          return true;
        }
        return false;
      }) as RabOverheadItem[];

      setRabOverheadItems(overheadOnly);
    } catch (err) {
      console.error('Error in loadRabOverheadItems:', err);
      setRabOverheadItems([]);
    } finally {
      setFetchingRab(false);
    }
  }, [spkId, propRabOverheadItems]);

  useEffect(() => {
    if (propRabOverheadItems) {
      setRabOverheadItems(propRabOverheadItems);
    }
  }, [propRabOverheadItems]);

  useEffect(() => {
    if (isOpen && spkId) {
      void loadSpkDetails();
      void loadOverheadLogs();
      void loadRabOverheadItems();
      setWbsStage(cleanDefaultStage);
      setSelectedRabItemId(null);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, spkId, cleanDefaultStage, loadSpkDetails, loadOverheadLogs, loadRabOverheadItems]);

  // Active Stage Normalization & Filtering
  const cleanActiveStage = useMemo(() => {
    return normalizeStage(wbsStage);
  }, [wbsStage]);

  const wbsRabOverheadItems = useMemo(() => {
    return rabOverheadItems.filter((item) => {
      const itemCat = normalizeStage(item.wbs_stage || item.wbs_category);
      return itemCat === cleanActiveStage;
    });
  }, [rabOverheadItems, cleanActiveStage]);

  // Calculate Realized Quantity vs Pagu for each RAB Overhead Item
  const rabOverheadCalculations = useMemo(() => {
    return wbsRabOverheadItems.map((item) => {
      const mat = Array.isArray(item.materials) ? item.materials[0] : item.materials;
      const itemName = item.material_name || mat?.name || item.description || 'Overhead';
      const paguQty = Number(item.quantity) || 1;
      const unit = item.unit || mat?.unit || 'satuan';
      const unitPrice = Number(item.unit_price) || 
        (Number(item.quantity) && Number(item.item_total) ? Number(item.item_total) / Number(item.quantity) : 0);

      const loggedQty = logs.reduce((sum, log) => {
        const matchesId = log.rab_item_id && log.rab_item_id === item.id;
        const matchesName = !log.rab_item_id && 
          normalizeStage(log.wbs_stage) === cleanActiveStage &&
          log.overhead_name.trim().toLowerCase() === itemName.trim().toLowerCase();
        if (matchesId || matchesName) {
          return sum + (Number(log.frequency_qty) || 0);
        }
        return sum;
      }, 0);

      const remainingQty = Math.max(0, Number((paguQty - loggedQty).toFixed(2)));
      const isExhausted = remainingQty <= 0 && paguQty > 0;

      return {
        ...item,
        itemName,
        paguQty,
        unit,
        unitPrice,
        loggedQty,
        remainingQty,
        isExhausted,
      };
    });
  }, [wbsRabOverheadItems, logs, cleanActiveStage]);

  // Preset Selection: Dynamic RAB
  const applyRabPreset = (item: {
    id: string;
    itemName: string;
    unitPrice: number;
    remainingQty: number;
    paguQty: number;
  }) => {
    setSelectedRabItemId(item.id);
    setOverheadName(item.itemName);
    setRatePerUnit(item.unitPrice);
    setFrequencyQty(item.remainingQty > 0 ? item.remainingQty : item.paguQty);
    setErrorMsg(null);
  };

  // Preset Selection: Master General
  const applyPreset = (preset: OverheadPreset) => {
    setSelectedRabItemId(null);
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
        rab_item_id: selectedRabItemId || null,
      };

      await financialReportsService.createSpkOverheadLog(payload);

      // Reset form fields
      setOverheadName('');
      setFrequencyQty(1);
      setRatePerUnit('');
      setNotes('');
      setSelectedRabItemId(null);
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

          {/* Quick Presets Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Alokasi Overhead dari RAB ({wbsStage})
                </span>
                {fetchingRab && (
                  <span className="text-[10px] text-text-muted animate-pulse">Memuat RAB...</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-muted hidden md:inline">Klik kartu untuk isi form otomatis</span>
                {rabOverheadCalculations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMasterPresets(prev => !prev)}
                    className="text-[11px] font-medium text-purple-400 hover:text-purple-300 transition-colors underline-offset-2 hover:underline"
                  >
                    {showMasterPresets ? 'Tutup Preset Gudang' : 'Tampilkan Master Preset Gudang (Umum)'}
                  </button>
                )}
              </div>
            </div>

            {/* RAB-Driven Dynamic Presets */}
            {rabOverheadCalculations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {rabOverheadCalculations.map((item) => {
                  const isSelected = selectedRabItemId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => applyRabPreset(item)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between group relative overflow-hidden ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                          : 'border-border bg-background/60 hover:border-amber-500/50 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5 w-full">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100 truncate">
                          <span className="text-amber-400 shrink-0">⚡</span>
                          <span className="truncate group-hover:text-amber-300 transition-colors" title={item.itemName}>
                            {item.itemName}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold uppercase tracking-wider shrink-0">
                            Aktif
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between items-baseline text-[11px]">
                          <span className="text-text-muted">Pagu: {item.paguQty} {item.unit}</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            Rp {item.unitPrice.toLocaleString('id-ID')}
                          </span>
                        </div>

                        <div className="pt-1 border-t border-border/50 flex justify-between items-center text-[10px]">
                          <span className="text-text-muted">Sisa Kuota:</span>
                          <span className={`font-mono font-semibold ${item.isExhausted ? 'text-slate-500' : 'text-amber-300'}`}>
                            {item.remainingQty} {item.unit}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-dashed border-border bg-background/40 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2 text-text-muted text-center sm:text-left">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Tidak ada alokasi overhead RAB untuk tahapan <strong>{wbsStage}</strong>.</span>
                </div>
                {!showMasterPresets && (
                  <button
                    type="button"
                    onClick={() => setShowMasterPresets(true)}
                    className="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition-all font-medium text-[11px] shrink-0"
                  >
                    Tampilkan Master Preset Gudang (Umum)
                  </button>
                )}
              </div>
            )}

            {/* Fallback / Master General Presets */}
            {showMasterPresets && (
              <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/10 space-y-2 animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Master Preset Gudang Karoseri (Umum / Luar RAB)
                  </span>
                  <span className="text-[10px] text-purple-400/80">Pilih jika terjadi overhead darurat/tak terduga</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                        className="p-2.5 rounded-lg bg-surface/80 border border-border hover:border-purple-500/50 hover:bg-purple-500/10 text-left transition-all group flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {getIcon()}
                          <span className="text-xs font-medium text-slate-200 group-hover:text-purple-300 truncate">
                            {p.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-muted flex justify-between items-center w-full mt-1">
                          <span>{p.stage}</span>
                          <span className="font-mono text-purple-400 font-semibold">{formatCurrency(p.rate)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Form Input */}
          <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-background/50 border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-purple-400" />
                  Catat Pengeluaran / Alokasi FOH Baru
                </h4>
                {selectedRabItemId && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    ⚡ RAB Sinkron
                  </span>
                )}
              </div>
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
                  onChange={(e) => {
                    setWbsStage(e.target.value);
                    setSelectedRabItemId(null);
                  }}
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
                  onChange={(e) => {
                    setOverheadName(e.target.value);
                    if (selectedRabItemId) setSelectedRabItemId(null);
                  }}
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
                  min="0.01"
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
                  step="any"
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
                          <div className="flex items-center gap-1.5">
                            <span>{item.overhead_name}</span>
                            {item.rab_item_id ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" title="Terhubung ke RAB">
                                RAB
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-700/40 text-slate-400 border border-slate-700" title="Non-RAB (Umum)">
                                Umum
                              </span>
                            )}
                          </div>
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
