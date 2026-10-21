import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Check, X, Clock, Plus, AlertCircle, Trash2, ChevronDown, ChevronUp, 
  Layers, Package, Wrench, ShieldCheck, DollarSign, TrendingUp, Info
} from 'lucide-react';
import { spkService } from '../services/spkService';
import { inventoryService } from '../services/inventoryService';
import type { Material } from '../services/inventoryService';
import { ConfirmationModal } from './ConfirmationModal';
import { LaborSearchAutocomplete } from './LaborSearchAutocomplete';
import { isLaborKeyword } from '../utils/itemClassification';
import type { ChangeOrderRecord, ChangeOrderItemRecord, ChangeOrderItemType } from '../types/database';
import { ChangeOrderPackageModal } from './ChangeOrderPackageModal';
import type { ExplodedChangeOrderItem } from '../utils/packageExplosion';

interface AmendmentManagerProps {
  spkId: string;
  spkNo?: string;
}

interface DraftItem {
  id: string; // Temporary ID for form rendering
  wbs_stage: string;
  item_type: ChangeOrderItemType;
  material_id?: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number; // Snapshot selling price
  cost_price: number; // Snapshot HPP
  notes?: string;
}

const WBS_STAGES = [
  'WBS 1: Pembongkaran',
  'WBS 2: Sasis/Rangka',
  'WBS 3: Dinding/Fabrikasi',
  'WBS 4: Cat/Finishing',
  'WBS 5: Kelistrikan/Hidrolik',
];

export const AmendmentManager: React.FC<AmendmentManagerProps> = ({ spkId, spkNo: propSpkNo }) => {
  const { profile } = useAuth();
  const [changeOrders, setChangeOrders] = useState<ChangeOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedSpkNo, setResolvedSpkNo] = useState<string>(propSpkNo || '');
  const [masterMaterials, setMasterMaterials] = useState<Material[]>([]);
  const [expandedCoIds, setExpandedCoIds] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Filter master inventory items specifically for labor / jasa
  const laborMaterials = useMemo(() => {
    return masterMaterials.filter(m => 
      m.category?.toLowerCase().includes('labor') || 
      m.category?.toLowerCase().includes('jasa') ||
      m.name.toLowerCase().startsWith('tukang') ||
      m.name.toLowerCase().includes('jasa') ||
      isLaborKeyword(m.category) ||
      isLaborKeyword(m.name)
    );
  }, [masterMaterials]);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [isPackageSelectorOpen, setIsPackageSelectorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal confirmation state
  const [actionTarget, setActionTarget] = useState<{
    id: string;
    coNumber?: string;
    description: string;
    totalAmount: number;
    action: 'APPROVED' | 'REJECTED';
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isOwner = profile?.role === 'owner';
  const isSA = profile?.role === 'service_advisor';

  // Fetch change orders and master materials
  const fetchChangeOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await spkService.getChangeOrders(spkId);
      setChangeOrders(data as ChangeOrderRecord[]);

      // By default expand the first change order if available
      if (data && data.length > 0) {
        setExpandedCoIds(prev => ({ ...prev, [data[0].id]: true }));
      }
    } catch (err: any) {
      console.error('Error fetching change orders:', err);
    } finally {
      setLoading(false);
    }
  }, [spkId]);

  useEffect(() => {
    if (spkId) {
      void fetchChangeOrders();

      // Resolve SPK No if not provided
      if (!propSpkNo) {
        supabase
          .from('spk')
          .select('spk_no')
          .eq('id', spkId)
          .single()
          .then(({ data }) => {
            if (data?.spk_no) setResolvedSpkNo(data.spk_no);
          });
      }

      // Load master inventory for itemized material selection
      inventoryService.getMaterials().then(mats => {
        setMasterMaterials(mats);
      }).catch(err => {
        console.error('Error fetching materials for Change Order:', err);
      });
    }
  }, [spkId, propSpkNo, fetchChangeOrders]);

  // Handle adding an empty line item to the draft form
  const handleAddItem = (type: ChangeOrderItemType = 'MATERIAL') => {
    const newItem: DraftItem = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      wbs_stage: WBS_STAGES[1], // default WBS 2
      item_type: type,
      material_id: null,
      item_name: '',
      quantity: 1,
      unit: type === 'MATERIAL' ? 'pcs' : (type === 'OVERHEAD' ? 'hari' : 'jam'),
      unit_price: 0,
      cost_price: 0,
      notes: ''
    };
    setDraftItems(prev => [...prev, newItem]);
  };

  // Handle applying exploded product package items
  const handleApplyPackage = (items: ExplodedChangeOrderItem[]) => {
    setDraftItems(prev => [...prev, ...items]);
  };

  // Handle removing a line item
  const handleRemoveItem = (id: string) => {
    setDraftItems(prev => prev.filter(item => item.id !== id));
  };

  // Update a specific line item's field
  const handleItemChange = (id: string, field: keyof DraftItem, value: any) => {
    setDraftItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // If user selected a master material, snapshot its details and prices immediately
      if (field === 'material_id') {
        const mat = masterMaterials.find(m => m.id === value);
        if (mat) {
          updated.item_name = mat.name;
          updated.unit = mat.unit || 'pcs';
          updated.unit_price = Number(mat.selling_price || mat.unit_price || 0);
          updated.cost_price = Number(mat.cost_price || 0);
        }
      }

      // If changing item_type
      if (field === 'item_type') {
        if (value === 'LABOR') {
          updated.material_id = null;
          updated.unit = 'jam';
        } else if (value === 'OVERHEAD') {
          updated.material_id = null;
          updated.unit = 'hari';
        } else {
          updated.unit = 'pcs';
        }
      }

      return updated;
    }));
  };

  // Select labor material from inventory with auto-populated selling and cost prices
  const handleSelectLaborItem = (itemId: string, material: Material) => {
    const standardRate = Number(material.selling_price || material.unit_price || 0);
    const costRate = material.cost_price !== undefined && Number(material.cost_price) > 0
      ? Number(material.cost_price)
      : Math.round(standardRate * 0.8);

    setDraftItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        material_id: material.id,
        item_name: material.name,
        unit: material.unit || item.unit || 'jam',
        unit_price: standardRate,
        cost_price: costRate,
      };
    }));
  };

  // Custom non-inventory labor name fallback with material_id: null
  const handleCustomLaborName = (itemId: string, name: string) => {
    setDraftItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        material_id: null,
        item_name: name,
      };
    }));
  };

  // Calculated totals for the draft form
  const draftSummary = useMemo(() => {
    let totalSelling = 0;
    let totalHpp = 0;
    let materialCount = 0;
    let laborCount = 0;
    let overheadCount = 0;

    draftItems.forEach(item => {
      const qty = Number(item.quantity || 0);
      const sell = Number(item.unit_price || 0);
      const hpp = Number(item.cost_price || 0);

      totalSelling += (qty * sell);
      totalHpp += (qty * hpp);

      if (item.item_type === 'MATERIAL') materialCount++;
      else if (item.item_type === 'LABOR') laborCount++;
      else overheadCount++;
    });

    const profit = totalSelling - totalHpp;
    const marginPct = totalSelling > 0 ? (profit / totalSelling) * 100 : 0;

    return {
      totalSelling,
      totalHpp,
      profit,
      marginPct,
      materialCount,
      laborCount,
      overheadCount
    };
  }, [draftItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (draftItems.length === 0) {
        throw new Error('Minimal tambahkan satu item rincian material atau jasa!');
      }

      // Validate each item
      for (let i = 0; i < draftItems.length; i++) {
        const it = draftItems[i];
        if (!it.item_name || it.item_name.trim() === '') {
          throw new Error(`Item baris ke-${i + 1} belum memiliki nama material atau jasa!`);
        }
        if (Number(it.quantity) === 0) {
          throw new Error(`Item "${it.item_name}" jumlah quantity tidak boleh 0!`);
        }
      }

      await spkService.createChangeOrder({
        spkId,
        spkNo: resolvedSpkNo,
        description: description.trim(),
        items: draftItems.map(item => ({
          wbs_stage: item.wbs_stage,
          item_type: item.item_type,
          material_id: item.material_id || null,
          item_name: item.item_name,
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: Number(item.unit_price),
          cost_price: Number(item.cost_price),
          notes: item.notes
        })),
        createdBy: profile?.id,
        status: 'PENDING'
      });

      setShowForm(false);
      setDescription('');
      setDraftItems([]);
      await fetchChangeOrders();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan Change Order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionClick = (co: ChangeOrderRecord, action: 'APPROVED' | 'REJECTED') => {
    setActionError(null);
    setActionTarget({
      id: co.id,
      coNumber: co.co_number,
      description: co.description,
      totalAmount: Number(co.cost_adjustment || co.total_amount || 0),
      action,
    });
  };

  const executeAction = async () => {
    if (!actionTarget) return;
    try {
      setIsProcessingAction(true);
      setActionError(null);
      if (actionTarget.action === 'APPROVED') {
        if (!profile?.id) throw new Error("ID pengguna tidak terdeteksi");
        await spkService.approveChangeOrder(actionTarget.id, profile.id);
      } else {
        await spkService.rejectChangeOrder(actionTarget.id);
      }
      setActionTarget(null);
      await fetchChangeOrders();
    } catch (err: any) {
      console.error(`Error updating change order to ${actionTarget.action}:`, err);
      setActionError(err.message || 'Gagal memproses permohonan Change Order');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCoIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredChangeOrders = useMemo(() => {
    if (filterStatus === 'ALL') return changeOrders;
    return changeOrders.filter(co => co.status === filterStatus);
  }, [changeOrders, filterStatus]);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-muted mt-6 flex items-center justify-center gap-2">
        <Clock className="w-5 h-5 animate-spin text-primary" />
        <span>Memuat data Change Orders & Snapshot Harga...</span>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden mt-6">
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-border bg-surface-hover flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-text font-display flex items-center gap-2 text-base">
            <Layers className="w-5 h-5 text-primary" />
            Change Orders & Amandemen SPK
            {resolvedSpkNo && (
              <span className="text-xs font-mono font-normal bg-surface-active px-2 py-0.5 rounded text-primary">
                {resolvedSpkNo}
              </span>
            )}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Snapshot harga jual patokan, HPP gudang point-in-time, dan alokasi granular WBS stage.
          </p>
        </div>

        {(isSA || isOwner) && !showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              if (draftItems.length === 0) {
                handleAddItem('MATERIAL');
              }
            }}
            className="bg-primary hover:bg-primary-hover text-background text-xs font-bold py-2 px-3.5 rounded transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Buat Change Order Baru
          </button>
        )}
      </div>

      {/* Itemized Change Order Creation Form */}
      {showForm && (isSA || isOwner) && (
        <form onSubmit={handleSubmit} className="p-5 border-b border-border bg-surface-hover/40 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <h4 className="text-sm font-bold text-text font-display">
                Formulir Pengajuan Itemized Change Order (CO)
              </h4>
            </div>
            <span className="text-xs font-mono text-text-muted bg-surface px-2.5 py-1 rounded border border-border">
              Preview No: CO-{resolvedSpkNo ? resolvedSpkNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : 'SPK'}-AUTO
            </span>
          </div>

          {error && (
            <div className="bg-status-danger/10 border border-status-danger/30 text-status-danger px-3 py-2.5 rounded text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Description & Justification */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
              Deskripsi & Justifikasi Perubahan Pekerjaan *
            </label>
            <textarea
              required
              rows={2}
              className="w-full bg-background border border-border rounded p-2.5 text-text text-sm focus:outline-none focus:border-primary transition"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Penambahan lapisan plat bordes 3mm pada lantai dan perkuatan crossmember sasis sesuai permintaan customer."
            />
          </div>

          {/* Itemized Table / Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
                Rincian Item Material & Jasa (Itemized Snapshot)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddItem('MATERIAL')}
                  className="bg-surface-active hover:bg-surface-active/80 text-text text-xs px-2.5 py-1 rounded border border-border flex items-center gap-1 transition cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5 text-emerald-400" />
                  + Item Material
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('LABOR')}
                  className="bg-surface-active hover:bg-surface-active/80 text-text text-xs px-2.5 py-1 rounded border border-border flex items-center gap-1 transition cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5 text-sky-400" />
                  + Item Jasa / Mandor
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('OVERHEAD')}
                  className="bg-surface-active hover:bg-surface-active/80 text-text text-xs px-2.5 py-1 rounded border border-border flex items-center gap-1 transition cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  + Item Overhead (FOH)
                </button>
                <button
                  type="button"
                  onClick={() => setIsPackageSelectorOpen(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <span>📦</span>
                  <span>+ Paket Barang Jadi</span>
                </button>
              </div>
            </div>

            {draftItems.length === 0 ? (
              <div className="p-4 rounded border border-dashed border-border text-center text-xs text-text-muted">
                Belum ada item ditambahkan. Klik tombol di atas untuk menambahkan material gudang atau jasa.
              </div>
            ) : (
              <div className="space-y-3">
                {draftItems.map((item, index) => {
                  const subtotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
                  const hppSubtotal = Number(item.quantity || 0) * Number(item.cost_price || 0);
                  const itemMargin = subtotal - hppSubtotal;

                  return (
                    <div 
                      key={item.id} 
                      className="p-3.5 rounded-lg border border-border bg-background/80 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-surface-active flex items-center justify-center text-xs font-mono font-bold text-text-muted">
                            {index + 1}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                            item.item_type === 'MATERIAL' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : item.item_type === 'OVERHEAD'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          }`}>
                            {item.item_type === 'MATERIAL' ? (
                              <Package className="w-3 h-3" />
                            ) : item.item_type === 'OVERHEAD' ? (
                              <Clock className="w-3 h-3" />
                            ) : (
                              <Wrench className="w-3 h-3" />
                            )}
                            {item.item_type}
                          </span>
                          <span className="text-xs text-text-muted font-mono">
                            Subtotal Jual: <strong className="text-primary">Rp {subtotal.toLocaleString('id-ID')}</strong>
                          </span>
                          <span className="text-xs text-text-muted font-mono hidden md:inline">
                            (HPP: Rp {hppSubtotal.toLocaleString('id-ID')} | Margin: Rp {itemMargin.toLocaleString('id-ID')})
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-text-muted hover:text-status-danger transition cursor-pointer"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Line Item Inputs Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                        {/* WBS Stage */}
                        <div className="md:col-span-3">
                          <label className="block text-[11px] text-text-muted mb-1 font-medium">
                            Alokasi WBS Stage *
                          </label>
                          <select
                            className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-text focus:border-primary transition"
                            value={item.wbs_stage}
                            onChange={(e) => handleItemChange(item.id, 'wbs_stage', e.target.value)}
                          >
                            {WBS_STAGES.map(stage => (
                              <option key={stage} value={stage}>{stage}</option>
                            ))}
                          </select>
                        </div>

                        {/* Material / Item Name */}
                        <div className="md:col-span-4">
                          <label className="block text-[11px] text-text-muted mb-1 font-medium">
                            {item.item_type === 'MATERIAL' 
                              ? 'Pilih Material Gudang *' 
                              : item.item_type === 'OVERHEAD'
                                ? 'Uraian Biaya Overhead (FOH) *'
                                : 'Uraian Jasa / Pekerjaan *'}
                          </label>
                          {item.item_type === 'MATERIAL' ? (
                            <select
                              className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-text focus:border-primary transition"
                              value={item.material_id || ''}
                              onChange={(e) => handleItemChange(item.id, 'material_id', e.target.value)}
                            >
                              <option value="">-- Pilih dari Master Gudang --</option>
                              {masterMaterials.map(mat => (
                                <option key={mat.id} value={mat.id}>
                                  {mat.name} (Stok: {mat.current_stock} {mat.unit} | Jual: Rp {(mat.selling_price || mat.unit_price || 0).toLocaleString('id-ID')})
                                </option>
                              ))}
                            </select>
                          ) : item.item_type === 'LABOR' ? (
                            <LaborSearchAutocomplete
                              laborMaterials={laborMaterials}
                              value={item.item_name}
                              materialId={item.material_id}
                              onSelectLabor={(mat) => handleSelectLaborItem(item.id, mat)}
                              onCustomLabor={(name) => handleCustomLaborName(item.id, name)}
                              placeholder="Misal: Jasa las struktur tambahan"
                              required
                            />
                          ) : (
                            <input
                              type="text"
                              required
                              placeholder="Misal: Sewa alat derek / oven lembur"
                              className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-text focus:border-primary transition"
                              value={item.item_name}
                              onChange={(e) => handleItemChange(item.id, 'item_name', e.target.value)}
                            />
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="md:col-span-2">
                          <label className="block text-[11px] text-text-muted mb-1 font-medium">
                            Qty & Satuan *
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              required
                              className="w-16 bg-surface border border-border rounded px-2 py-1.5 text-text focus:border-primary transition text-right"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            />
                            <input
                              type="text"
                              className="w-14 bg-surface border border-border rounded px-2 py-1.5 text-text focus:border-primary transition text-center"
                              value={item.unit}
                              onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                              placeholder="pcs"
                            />
                          </div>
                        </div>

                        {/* Unit Price (Selling Price Snapshot) */}
                        <div className="md:col-span-3">
                          <label className="block text-[11px] text-text-muted mb-1 font-medium flex items-center justify-between">
                            <span>Harga Jual / Satuan *</span>
                            <span className="text-[10px] text-primary">Snapshot</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-text-muted text-[11px]">Rp</span>
                            <input
                              type="number"
                              required
                              min="0"
                              className="w-full bg-surface border border-border rounded pl-8 pr-2.5 py-1.5 text-text focus:border-primary transition text-right font-mono"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Second Row: HPP Snapshot & Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs pt-1">
                        <div className="md:col-span-4">
                          <label className="block text-[11px] text-text-muted mb-1 font-medium flex items-center justify-between">
                            <span>Harga Modal HPP Gudang</span>
                            <span className="text-[10px] text-emerald-400">Snapshot HPP</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-text-muted text-[11px]">Rp</span>
                            <input
                              type="number"
                              min="0"
                              className="w-full bg-surface border border-border rounded pl-8 pr-2.5 py-1.5 text-text focus:border-primary transition text-right font-mono"
                              value={item.cost_price}
                              onChange={(e) => handleItemChange(item.id, 'cost_price', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="md:col-span-8">
                          <label className="block text-[11px] text-text-muted mb-1 font-medium">
                            Catatan Item / Spesifikasi Teknis
                          </label>
                          <input
                            type="text"
                            placeholder="Opsional: Keterangan tambahan atau alasan perubahan"
                            className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-text focus:border-primary transition"
                            value={item.notes || ''}
                            onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Box with Realtime Margins */}
          <div className="bg-surface border border-border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-text-muted block">Total Penyesuaian Harga Jual</span>
              <span className="text-lg font-bold font-mono text-primary flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                Rp {draftSummary.totalSelling.toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] text-text-muted">
                {draftSummary.materialCount} Material, {draftSummary.laborCount} Jasa, {draftSummary.overheadCount} Overhead
              </span>
            </div>

            <div>
              <span className="text-xs text-text-muted block">Estimasi Beban Modal (HPP Gudang)</span>
              <span className="text-lg font-bold font-mono text-text flex items-center gap-1">
                Rp {draftSummary.totalHpp.toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] text-text-muted">
                Diteruskan ke Pagu Gate 2 & RAB Mandor
              </span>
            </div>

            <div>
              <span className="text-xs text-text-muted block">Estimasi Laba Kotor & Margin</span>
              <span className="text-lg font-bold font-mono text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Rp {draftSummary.profit.toLocaleString('id-ID')}
                <span className="text-xs font-normal text-emerald-300">
                  ({draftSummary.marginPct.toFixed(1)}%)
                </span>
              </span>
              <span className="text-[11px] text-text-muted">
                Gross profit change order
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setDraftItems([]);
                setError(null);
              }}
              className="px-4 py-2 border border-border text-text rounded hover:bg-surface-active transition text-xs font-medium cursor-pointer"
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary text-background rounded hover:bg-primary-hover transition text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              disabled={submitting || draftItems.length === 0}
            >
              <ShieldCheck className="w-4 h-4" />
              {submitting ? 'Menyimpan & Snapshotting...' : 'Ajukan Change Order'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="px-5 py-2.5 bg-surface-hover/30 border-b border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded transition cursor-pointer font-medium ${
                filterStatus === st 
                  ? 'bg-surface-active text-text font-bold shadow-sm' 
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {st === 'ALL' ? 'Semua' : st === 'PENDING' ? 'Menunggu' : st === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
              <span className="ml-1 text-[10px] font-mono opacity-80">
                ({st === 'ALL' ? changeOrders.length : changeOrders.filter(c => c.status === st).length})
              </span>
            </button>
          ))}
        </div>

        <div className="text-text-muted text-xs hidden sm:flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-primary" />
          Harga unit_price & cost_price terkunci permanen pada saat Change Order dibuat.
        </div>
      </div>

      {/* Change Orders List */}
      {filteredChangeOrders.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">
          Tidak ada Change Order untuk SPK ini dengan filter terpilih.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredChangeOrders.map(co => {
            const isExpanded = !!expandedCoIds[co.id];
            const items = co.items || [];
            const coAmount = Number(co.cost_adjustment || co.total_amount || 0);

            // Compute total HPP from snapshot items
            const totalHppFromItems = items.reduce(
              (sum, it) => sum + (Number(it.quantity || 0) * Number(it.cost_price || 0)), 
              0
            );

            return (
              <div key={co.id} className="p-5 hover:bg-surface-hover/20 transition space-y-3">
                {/* Main Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-surface-active text-text px-2 py-0.5 rounded border border-border">
                        {co.co_number || `CO-${co.id.substring(0, 8).toUpperCase()}`}
                      </span>

                      {co.status === 'PENDING' && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-status-warning bg-status-warning/10 border border-status-warning/20 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3" /> Menunggu Persetujuan
                        </span>
                      )}
                      {co.status === 'APPROVED' && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-status-success bg-status-success/10 border border-status-success/20 px-2 py-0.5 rounded">
                          <Check className="w-3 h-3" /> Disetujui (Approved)
                        </span>
                      )}
                      {co.status === 'REJECTED' && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-status-danger bg-status-danger/10 border border-status-danger/20 px-2 py-0.5 rounded">
                          <X className="w-3 h-3" /> Ditolak
                        </span>
                      )}

                      <span className="text-xs text-text-muted">
                        • {new Date(co.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-text pt-0.5">
                      {co.description || 'Tidak ada uraian deskripsi.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1 text-text-muted">
                      <span>
                        Penyesuaian Jual: <strong className={coAmount >= 0 ? "text-primary" : "text-status-danger"}>
                          {coAmount >= 0 ? '+' : ''}Rp {coAmount.toLocaleString('id-ID')}
                        </strong>
                      </span>
                      {totalHppFromItems > 0 && (
                        <span>
                          Estimasi HPP: <strong>Rp {totalHppFromItems.toLocaleString('id-ID')}</strong>
                        </span>
                      )}
                      <span>
                        Rincian: <strong className="text-text">{items.length} item</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions & Expand Toggle */}
                  <div className="flex items-center gap-2 self-start">
                    {(isOwner || isSA) && co.status === 'PENDING' && (
                      <div className="flex items-center gap-1.5 mr-2">
                        <button
                          onClick={() => handleActionClick(co, 'APPROVED')}
                          className="px-2.5 py-1 bg-status-success/10 text-status-success border border-status-success/20 hover:bg-status-success/20 rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Setujui Change Order ini"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Setujui
                        </button>
                        <button
                          onClick={() => handleActionClick(co, 'REJECTED')}
                          className="px-2.5 py-1 bg-status-danger/10 text-status-danger border border-status-danger/20 hover:bg-status-danger/20 rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Tolak Change Order ini"
                        >
                          <X className="w-3.5 h-3.5" />
                          Tolak
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => toggleExpand(co.id)}
                      className="p-1.5 rounded hover:bg-surface-active text-text-muted hover:text-text transition cursor-pointer flex items-center gap-1 text-xs"
                    >
                      <span>{isExpanded ? 'Tutup Rincian' : 'Lihat Rincian'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Itemized Detail Table */}
                {isExpanded && (
                  <div className="pt-2">
                    {items.length === 0 ? (
                      <div className="bg-surface p-3.5 rounded border border-border text-xs text-text-muted italic">
                        Change Order ini tercatat sebelum modul rincian itemized diaktifkan (legacy order tanpa rincian item).
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded border border-border bg-surface">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-surface-active text-text-muted font-medium border-b border-border">
                            <tr>
                              <th className="py-2 px-3">Tipe</th>
                              <th className="py-2 px-3">WBS Stage</th>
                              <th className="py-2 px-3">Material / Jasa</th>
                              <th className="py-2 px-3 text-right">Qty</th>
                              <th className="py-2 px-3 text-right">Harga Jual (Snap)</th>
                              <th className="py-2 px-3 text-right">HPP Gudang (Snap)</th>
                              <th className="py-2 px-3 text-right">Subtotal Jual</th>
                              <th className="py-2 px-3">Catatan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                            {items.map((it: ChangeOrderItemRecord) => {
                              const itemSub = Number(it.subtotal || (Number(it.quantity) * Number(it.unit_price)) || 0);
                              return (
                                <tr key={it.id} className="hover:bg-surface-hover/30 transition">
                                  <td className="py-2 px-3">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      it.item_type === 'MATERIAL' 
                                        ? 'bg-emerald-500/10 text-emerald-400' 
                                        : it.item_type === 'OVERHEAD'
                                          ? 'bg-purple-500/10 text-purple-400'
                                          : 'bg-sky-500/10 text-sky-400'
                                    }`}>
                                      {it.item_type}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 font-sans text-text-muted">
                                    {it.wbs_stage}
                                  </td>
                                  <td className="py-2 px-3 font-sans font-medium text-text">
                                    {it.item_name}
                                  </td>
                                  <td className="py-2 px-3 text-right text-text">
                                    {Number(it.quantity)} {it.unit}
                                  </td>
                                  <td className="py-2 px-3 text-right text-text-muted">
                                    Rp {Number(it.unit_price).toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-2 px-3 text-right text-text-muted">
                                    Rp {Number(it.cost_price).toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-2 px-3 text-right font-bold text-primary">
                                    Rp {itemSub.toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-2 px-3 font-sans text-text-muted max-w-[150px] truncate" title={it.notes || ''}>
                                    {it.notes || '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Change Order Approval / Rejection */}
      <ConfirmationModal
        isOpen={!!actionTarget}
        title={actionTarget?.action === 'APPROVED' ? 'Setujui Change Order' : 'Tolak Change Order'}
        message={actionTarget ? (
          actionTarget.action === 'APPROVED'
            ? `Apakah Anda yakin ingin MENYETUJUI Change Order "${actionTarget.coNumber || 'CO'}" (${actionTarget.description}) dengan total penyesuaian biaya sebesar Rp ${actionTarget.totalAmount.toLocaleString('id-ID')}? Seluruh rincian material akan dialokasikan ke Pagu Gate 2 Gudang dan WBS Mandor.`
            : `Apakah Anda yakin ingin MENOLAK permohonan Change Order "${actionTarget.coNumber || 'CO'}" (${actionTarget.description})? Permohonan ini tidak akan dimasukkan ke dalam kalkulasi tagihan SPK maupun pagu operasional.`
        ) : ''}
        confirmText={actionTarget?.action === 'APPROVED' ? 'Ya, Setujui Change Order' : 'Ya, Tolak'}
        cancelText="Batal"
        variant={actionTarget?.action === 'APPROVED' ? 'info' : 'danger'}
        isLoading={isProcessingAction}
        onConfirm={executeAction}
        onCancel={() => {
          if (!isProcessingAction) setActionTarget(null);
        }}
      >
        {actionError && (
          <div className="bg-status-danger/10 border border-status-danger text-status-danger px-3 py-2 rounded text-xs mt-2">
            {actionError}
          </div>
        )}
      </ConfirmationModal>

      {/* Modal Pemilih Paket Barang Jadi (Assembly List) */}
      <ChangeOrderPackageModal
        isOpen={isPackageSelectorOpen}
        onClose={() => setIsPackageSelectorOpen(false)}
        onApply={handleApplyPackage}
      />
    </div>
  );
};
