import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Check, X, Clock, Plus, AlertCircle, Trash2, ChevronDown, ChevronUp, 
  Layers, Package, Wrench, ShieldCheck, Info, Edit2
} from 'lucide-react';
import { spkService } from '../services/spkService';
import { inventoryService } from '../services/inventoryService';
import type { Material } from '../services/inventoryService';
import { packageService } from '../services/packageService';
import type { ProductPackage } from '../types/package';
import { ConfirmationModal } from './ConfirmationModal';
import { LaborSearchAutocomplete } from './LaborSearchAutocomplete';
import { MaterialAutocomplete } from './MaterialAutocomplete';
import { isLaborKeyword } from '../utils/itemClassification';
import type { ChangeOrderRecord, ChangeOrderItemType } from '../types/database';
import { ChangeOrderPackageModal } from './ChangeOrderPackageModal';
import type { ExplodedChangeOrderItem } from '../utils/packageExplosion';
import { parseDecimalValue } from '../utils/numberUtils';

interface AmendmentManagerProps {
  spkId: string;
  spkNo?: string;
}

interface DraftItem {
  id: string; // Temporary ID for form rendering & editing
  wbs_stage: string;
  item_type: ChangeOrderItemType;
  material_id?: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number; // Snapshot selling price
  cost_price: number; // Snapshot HPP
  package_source_id?: string | null;
  package_instance_id?: string | null;
  package_name?: string | null;
  notes?: string;
}

const WBS_CATEGORIES = [
  { id: 'WBS 1: Pembongkaran', stageKey: 'Pembongkaran', shortLabel: 'WBS 1', label: 'WBS 1: Pembongkaran' },
  { id: 'WBS 2: Sasis/Rangka', stageKey: 'Sasis/Rangka', shortLabel: 'WBS 2', label: 'WBS 2: Sasis/Rangka' },
  { id: 'WBS 3: Dinding/Fabrikasi', stageKey: 'Dinding/Fabrikasi', shortLabel: 'WBS 3', label: 'WBS 3: Dinding/Fabrikasi' },
  { id: 'WBS 4: Cat/Finishing', stageKey: 'Cat/Finishing', shortLabel: 'WBS 4', label: 'WBS 4: Cat/Finishing' },
  { id: 'WBS 5: Kelistrikan/Hidrolik', stageKey: 'Kelistrikan/Hidrolik', shortLabel: 'WBS 5', label: 'WBS 5: Kelistrikan/Hidrolik' },
];

export const AmendmentManager: React.FC<AmendmentManagerProps> = ({ spkId, spkNo: propSpkNo }) => {
  const { profile } = useAuth();
  const [changeOrders, setChangeOrders] = useState<ChangeOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedSpkNo, setResolvedSpkNo] = useState<string>(propSpkNo || '');
  const [masterMaterials, setMasterMaterials] = useState<Material[]>([]);
  const [packages, setPackages] = useState<ProductPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');

  const handleOpenPackageModal = (packageId?: string) => {
    if (packageId) {
      setSelectedPackageId(packageId);
    } else if (!selectedPackageId && packages.length > 0) {
      setSelectedPackageId(packages[0].id);
    }
    setIsPackageSelectorOpen(true);
  };
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

  // Form Main State
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [isPackageSelectorOpen, setIsPackageSelectorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Left Panel Builder State
  // Mode: 'material' (default) | 'labor' | 'overhead'
  const [itemMode, setItemMode] = useState<'material' | 'labor' | 'overhead'>('material');
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  // Material Builder Inputs
  const [materialForm, setMaterialForm] = useState({
    materialId: null as string | null,
    itemName: '',
    unit: 'pcs',
    unitPrice: 0,
    costPrice: 0,
    notes: '',
  });

  // Labor Builder Inputs
  const [laborForm, setLaborForm] = useState({
    materialId: null as string | null,
    name: '',
    isCustom: false,
    unit: 'jam',
    unitPrice: 0,
    costPrice: 0,
    notes: '',
  });

  // Overhead Builder Inputs
  const [overheadForm, setOverheadForm] = useState({
    description: '',
    unit: 'hari',
    unitPrice: 0,
    costPrice: 0,
    notes: '',
  });

  // Target Quantity & WBS Allocations for the Builder
  const [targetQty, setTargetQty] = useState<string | number>('1');
  const [wbsAllocations, setWbsAllocations] = useState<Record<string, string>>({
    'WBS 1: Pembongkaran': '0',
    'WBS 2: Sasis/Rangka': '1',
    'WBS 3: Dinding/Fabrikasi': '0',
    'WBS 4: Cat/Finishing': '0',
    'WBS 5: Kelistrikan/Hidrolik': '0',
  });

  // Modal confirmation state
  const [actionTarget, setActionTarget] = useState<{
    id: string;
    coNumber?: string;
    description: string;
    totalAmount: number;
    action: 'APPROVED' | 'REJECTED';
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [, setActionError] = useState<string | null>(null);

  const isOwner = profile?.role === 'owner';
  const isSA = profile?.role === 'service_advisor';

  // Fetch change orders, materials, and packages
  const fetchChangeOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await spkService.getChangeOrders(spkId);
      setChangeOrders(data as ChangeOrderRecord[]);

      // By default expand the first change order if available
      if (data && data.length > 0) {
        setExpandedCoIds(prev => ({ ...prev, [data[0].id]: true }));
      }
    } catch (err: unknown) {
      console.error('Error fetching change orders:', err);
    } finally {
      setLoading(false);
    }
  }, [spkId, setExpandedCoIds]);

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

      // Load product packages
      packageService.getPackages().then(pkgs => {
        setPackages(pkgs || []);
      }).catch(err => {
        console.error('Error fetching product packages for Change Order:', err);
      });
    }
  }, [spkId, propSpkNo, fetchChangeOrders]);

  // Allocation validation calculations
  const totalTargetNum = parseDecimalValue(targetQty);
  const allocatedSum = Math.round(
    WBS_CATEGORIES.reduce(
      (sum, cat) => sum + parseDecimalValue(wbsAllocations[cat.id] ?? 0),
      0
    ) * 100
  ) / 100;
  const allocationRemaining = Math.round((totalTargetNum - allocatedSum) * 100) / 100;
  const isAllocationMatch = Math.abs(allocationRemaining) < 0.001 && totalTargetNum > 0 && allocatedSum > 0;

  // Reset builder form inputs
  const resetBuilderInputs = (mode: 'material' | 'labor' | 'overhead' = itemMode) => {
    setEditingDraftId(null);
    setTargetQty('1');
    setWbsAllocations({
      'WBS 1: Pembongkaran': '0',
      'WBS 2: Sasis/Rangka': '1',
      'WBS 3: Dinding/Fabrikasi': '0',
      'WBS 4: Cat/Finishing': '0',
      'WBS 5: Kelistrikan/Hidrolik': '0',
    });

    if (mode === 'material') {
      setMaterialForm({
        materialId: null,
        itemName: '',
        unit: 'pcs',
        unitPrice: 0,
        costPrice: 0,
        notes: '',
      });
    } else if (mode === 'labor') {
      setLaborForm({
        materialId: null,
        name: '',
        isCustom: false,
        unit: 'jam',
        unitPrice: 0,
        costPrice: 0,
        notes: '',
      });
    } else {
      setOverheadForm({
        description: '',
        unit: 'hari',
        unitPrice: 0,
        costPrice: 0,
        notes: '',
      });
    }
  };

  const handleSwitchMode = (mode: 'material' | 'labor' | 'overhead') => {
    setItemMode(mode);
    resetBuilderInputs(mode);
  };

  // Handle applying exploded product package items
  const handleApplyPackage = (items: ExplodedChangeOrderItem[]) => {
    setDraftItems(prev => [...prev, ...items]);
  };

  // Handle removing a line item from the right table
  const handleRemoveItem = (id: string) => {
    setDraftItems(prev => prev.filter(item => item.id !== id));
    if (editingDraftId === id) {
      resetBuilderInputs();
    }
  };

  // Handle editing an item from the right table
  const handleEditItem = (item: DraftItem) => {
    setEditingDraftId(item.id);
    const mode = item.item_type.toLowerCase() as 'material' | 'labor' | 'overhead';
    setItemMode(mode);
    setTargetQty(item.quantity);

    // Set allocations focused on this item's WBS stage
    const allocs: Record<string, string> = {
      'WBS 1: Pembongkaran': '0',
      'WBS 2: Sasis/Rangka': '0',
      'WBS 3: Dinding/Fabrikasi': '0',
      'WBS 4: Cat/Finishing': '0',
      'WBS 5: Kelistrikan/Hidrolik': '0',
    };
    allocs[item.wbs_stage] = String(item.quantity);
    setWbsAllocations(allocs);

    if (mode === 'material') {
      setMaterialForm({
        materialId: item.material_id || null,
        itemName: item.item_name,
        unit: item.unit || 'pcs',
        unitPrice: item.unit_price,
        costPrice: item.cost_price,
        notes: item.notes || '',
      });
    } else if (mode === 'labor') {
      setLaborForm({
        materialId: item.material_id || null,
        name: item.item_name,
        isCustom: !item.material_id,
        unit: item.unit || 'jam',
        unitPrice: item.unit_price,
        costPrice: item.cost_price,
        notes: item.notes || '',
      });
    } else {
      setOverheadForm({
        description: item.item_name,
        unit: item.unit || 'hari',
        unitPrice: item.unit_price,
        costPrice: item.cost_price,
        notes: item.notes || '',
      });
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    resetBuilderInputs();
  };

  // Add or update item to the right-hand review table
  const handleAddOrUpdateItem = () => {
    setError(null);

    const currentType: ChangeOrderItemType = 
      itemMode === 'material' ? 'MATERIAL' : itemMode === 'labor' ? 'LABOR' : 'OVERHEAD';

    const name = itemMode === 'material' 
      ? materialForm.itemName 
      : itemMode === 'labor' 
        ? laborForm.name 
        : overheadForm.description;

    if (!name || !name.trim()) {
      setError(
        itemMode === 'material' 
          ? 'Pilih atau isi nama bahan baku terlebih dahulu' 
          : itemMode === 'labor' 
            ? 'Pilih atau isi uraian jasa / pekerjaan terlebih dahulu' 
            : 'Uraian biaya overhead (FOH) wajib diisi'
      );
      return;
    }

    if (totalTargetNum <= 0) {
      setError('Target quantity harus lebih dari 0');
      return;
    }

    if (!isAllocationMatch) {
      setError(
        allocationRemaining > 0
          ? `Harap tentukan alokasi tahapan WBS (sisa ${allocationRemaining.toFixed(2)} dari target ${targetQty}).`
          : `Alokasi tahapan WBS melebihi target ${targetQty} (lebih ${Math.abs(allocationRemaining).toFixed(2)}).`
      );
      return;
    }

    const unitPrice = itemMode === 'material' 
      ? Number(materialForm.unitPrice || 0) 
      : itemMode === 'labor' 
        ? Number(laborForm.unitPrice || 0) 
        : Number(overheadForm.unitPrice || 0);

    if (unitPrice <= 0) {
      setError('Harga satuan jual harus diisi angka yang valid (lebih dari 0)');
      return;
    }

    const unit = itemMode === 'material' 
      ? (materialForm.unit || 'pcs') 
      : itemMode === 'labor' 
        ? (laborForm.unit || 'jam') 
        : (overheadForm.unit || 'hari');

    const costPrice = itemMode === 'material' 
      ? Number(materialForm.costPrice || 0) 
      : itemMode === 'labor' 
        ? Number(laborForm.costPrice || 0) 
        : Number(overheadForm.costPrice || 0);

    const notes = itemMode === 'material' 
      ? materialForm.notes 
      : itemMode === 'labor' 
        ? laborForm.notes 
        : overheadForm.notes;

    const materialId = itemMode === 'material' 
      ? materialForm.materialId 
      : itemMode === 'labor' 
        ? laborForm.materialId 
        : null;

    // Collect all WBS stages with allocated qty > 0
    const createdItems: DraftItem[] = [];
    WBS_CATEGORIES.forEach(cat => {
      const qtyForStage = parseDecimalValue(wbsAllocations[cat.id]);
      if (qtyForStage > 0) {
        createdItems.push({
          id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          wbs_stage: cat.id,
          item_type: currentType,
          material_id: materialId,
          item_name: name.trim(),
          quantity: qtyForStage,
          unit,
          unit_price: unitPrice,
          cost_price: costPrice,
          notes: notes ? notes.trim() : undefined,
        });
      }
    });

    if (createdItems.length === 0) return;

    if (editingDraftId) {
      setDraftItems(prev => {
        const idx = prev.findIndex(i => i.id === editingDraftId);
        if (idx !== -1) {
          const copy = [...prev];
          copy.splice(idx, 1, ...createdItems);
          return copy;
        }
        return [...prev, ...createdItems];
      });
      setEditingDraftId(null);
    } else {
      setDraftItems(prev => [...prev, ...createdItems]);
    }

    resetBuilderInputs(itemMode);
  };


  // Financial summary & category pagu calculations
  const totalMaterialSelling = useMemo(() => {
    return draftItems
      .filter(i => i.item_type === 'MATERIAL')
      .reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price)), 0);
  }, [draftItems]);

  const totalLaborSelling = useMemo(() => {
    return draftItems
      .filter(i => i.item_type === 'LABOR')
      .reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price)), 0);
  }, [draftItems]);

  const totalOverheadSelling = useMemo(() => {
    return draftItems
      .filter(i => i.item_type === 'OVERHEAD')
      .reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price)), 0);
  }, [draftItems]);

  const totalHpp = useMemo(() => {
    return draftItems.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.cost_price || 0)), 0);
  }, [draftItems]);

  const totalSelling = totalMaterialSelling + totalLaborSelling + totalOverheadSelling;
  const profit = totalSelling - totalHpp;
  const marginPct = totalSelling > 0 ? (profit / totalSelling) * 100 : 0;

  const materialCount = draftItems.filter(i => i.item_type === 'MATERIAL').length;
  const laborCount = draftItems.filter(i => i.item_type === 'LABOR').length;
  const overheadCount = draftItems.filter(i => i.item_type === 'OVERHEAD').length;

  // Submit Change Order to backend (Decoupled final submission)
  const handleSubmitFinalChangeOrder = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      if (!description.trim()) {
        throw new Error('Deskripsi & Justifikasi Perubahan Pekerjaan wajib diisi!');
      }

      if (draftItems.length === 0) {
        throw new Error('Minimal tambahkan satu item rincian material atau jasa ke Change Order!');
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
          package_source_id: item.package_source_id || null,
          package_instance_id: item.package_instance_id || null,
          package_name: item.package_name || null,
          notes: item.notes
        })),
        createdBy: profile?.id,
        status: 'PENDING'
      });

      setShowForm(false);
      setDescription('');
      setDraftItems([]);
      resetBuilderInputs();
      await fetchChangeOrders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan Change Order.');
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
    } catch (err: unknown) {
      console.error(`Error updating change order to ${actionTarget.action}:`, err);
      setActionError(err instanceof Error ? err.message : 'Gagal memproses permohonan Change Order');
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
              resetBuilderInputs('material');
            }}
            className="bg-primary hover:bg-primary-hover text-background text-xs font-bold py-2 px-3.5 rounded transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Buat Change Order Baru
          </button>
        )}
      </div>

      {/* Itemized Change Order Creation Form (2-Column Split Grid matching RAB Calculator) */}
      {showForm && (isSA || isOwner) && (
        <form noValidate onSubmit={handleSubmitFinalChangeOrder} className="p-6 border-b border-border bg-surface-hover/30 space-y-6">
          {/* Form Header */}
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

          {/* 1. Description & Justification (Top Header) */}
          <div className="bg-background border border-border rounded-lg p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Deskripsi & Justifikasi Perubahan Pekerjaan *
            </label>
            <textarea
              rows={2}
              className="w-full bg-surface border border-border rounded p-2.5 text-text text-sm focus:outline-none focus:border-primary transition"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Penambahan lapisan plat bordes 3mm pada lantai dan perkuatan crossmember sasis sesuai permintaan customer."
            />
          </div>

          {/* Split Panel Grid: Left Col (lg:col-span-1) & Right Col (lg:col-span-2) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Panel Kiri: Input Builder Component */}
            <div className="lg:col-span-1 space-y-5">
              {/* Dropdown Assembly Package List */}
              <div className="bg-background border border-border rounded-lg p-4">
                <h4 className="font-bold text-sm text-text border-b border-border pb-2 mb-3">
                  Pilih Paket Barang Jadi (Assembly List)
                </h4>
                <div className="flex flex-col gap-2">
                  <select
                    aria-label="Pilih Paket Assembly List"
                    className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary transition"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        handleOpenPackageModal(val);
                      }
                      e.target.value = '';
                    }}
                    value=""
                  >
                    <option value="" disabled>-- Pilih Paket Assembly List --</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleOpenPackageModal(selectedPackageId || packages[0]?.id || '')}
                    className="w-full mt-1 px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <span>📦</span>
                    <span>+ Paket Barang Jadi</span>
                  </button>
                </div>
              </div>

              {/* Toggle Mode: Bahan Baku (Material) vs Jasa / Tukang (Labor) vs Overhead (FOH) */}
              <div className="flex rounded-lg bg-surface p-1 border border-border">
                <button
                  type="button"
                  id="toggle-mode-material"
                  aria-label="+ Item Material"
                  onClick={() => handleSwitchMode('material')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    itemMode === 'material'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-text-muted hover:text-text hover:bg-surface-hover'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 shrink-0" />
                  <span>Bahan Baku (Material)</span>
                </button>

                <button
                  type="button"
                  id="toggle-mode-labor"
                  aria-label="+ Item Jasa / Mandor"
                  onClick={() => handleSwitchMode('labor')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    itemMode === 'labor'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-text-muted hover:text-text hover:bg-surface-hover'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5 shrink-0" />
                  <span>Jasa / Tukang (Labor)</span>
                </button>

                <button
                  type="button"
                  id="toggle-mode-overhead"
                  aria-label="+ Item Overhead (FOH)"
                  onClick={() => handleSwitchMode('overhead')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    itemMode === 'overhead'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-text-muted hover:text-text hover:bg-surface-hover'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Overhead (FOH)</span>
                </button>
              </div>

              {/* Item Builder Box */}
              <div className="bg-background border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    {itemMode === 'material' ? (
                      <Package className="w-4 h-4 text-primary" />
                    ) : itemMode === 'labor' ? (
                      <Wrench className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-purple-400" />
                    )}
                    <h4 className="font-bold text-sm text-text">
                      {editingDraftId 
                        ? (itemMode === 'material' ? 'Edit Bahan Baku' : itemMode === 'labor' ? 'Edit Jasa / Tukang' : 'Edit Overhead')
                        : (itemMode === 'material' ? 'Input Bahan Baku (Material)' : itemMode === 'labor' ? 'Input Jasa / Tukang (Labor)' : 'Input Overhead (FOH)')}
                    </h4>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    itemMode === 'material'
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : itemMode === 'labor'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  }`}>
                    {itemMode === 'material' ? 'PAGU MATERIAL' : itemMode === 'labor' ? 'PAGU JASA' : 'OVERHEAD (FOH)'}
                  </span>
                </div>

                {/* Mode Material Inputs */}
                {itemMode === 'material' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                        Item Bahan Baku <span className="text-status-danger">*</span>
                      </label>
                      <MaterialAutocomplete
                        materials={masterMaterials}
                        initialValue={materialForm.itemName}
                        onSelect={(m) => {
                          setMaterialForm(prev => ({
                            ...prev,
                            materialId: m.id,
                            itemName: m.name,
                            unit: m.unit || 'pcs',
                            unitPrice: Number(m.selling_price || m.unit_price || 0),
                            costPrice: Number(m.cost_price || 0),
                          }));
                        }}
                        placeholder="Cari material gudang..."
                      />
                      {materialForm.materialId && (
                        <span className="text-[10px] font-mono text-cyan-400 mt-1 block">
                          ✓ Terhubung ke Master Material Gudang (ID: {materialForm.materialId})
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="material-target-qty" className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                          Qty (Target) <span className="text-status-danger">*</span>
                        </label>
                        <input
                          id="material-target-qty"
                          type="text"
                          inputMode="decimal"
                          value={targetQty}
                          onChange={(e) => {
                            const raw = e.target.value.replace(',', '.');
                            if (raw === '' || /^[0-9]*\.?[0-9]*$/.test(raw)) {
                              setTargetQty(raw);
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          onMouseUp={(e) => e.preventDefault()}
                          className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                          Satuan
                        </label>
                        <input
                          type="text"
                          value={materialForm.unit}
                          onChange={(e) => setMaterialForm(prev => ({ ...prev, unit: e.target.value }))}
                          placeholder="pcs"
                          className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Harga Modal HPP</span>
                          <span className="text-[10px] text-emerald-400 font-mono">Snapshot</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">Rp</span>
                          <input
                            type="number"
                            min="0"
                            value={materialForm.costPrice || ''}
                            onChange={(e) => setMaterialForm(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-text font-mono focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Harga Satuan Jual *</span>
                          <span className="text-[10px] text-primary font-mono">Snapshot</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">Rp</span>
                          <input
                            type="number"
                            min="0"
                            value={materialForm.unitPrice || ''}
                            onChange={(e) => setMaterialForm(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-primary font-mono focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                        Catatan / Spesifikasi Teknis
                      </label>
                      <input
                        type="text"
                        value={materialForm.notes}
                        onChange={(e) => setMaterialForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Keterangan tambahan..."
                        className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-text focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                {/* Mode Labor Inputs */}
                {itemMode === 'labor' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono flex items-center justify-between">
                        <span>Uraian Jasa / Pekerjaan *</span>
                        {laborMaterials.length > 0 && (
                          <span className="text-[10px] font-mono text-amber-400">
                            Auto-suggest aktif ({laborMaterials.length} katalog jasa)
                          </span>
                        )}
                      </label>
                      <LaborSearchAutocomplete
                        laborMaterials={laborMaterials}
                        value={laborForm.name}
                        materialId={laborForm.materialId}
                        onSelectLabor={(mat) => {
                          const standardRate = Number(mat.selling_price || mat.unit_price || 0);
                          const costRate = mat.cost_price !== undefined && Number(mat.cost_price) > 0
                            ? Number(mat.cost_price)
                            : Math.round(standardRate * 0.8);
                          setLaborForm(prev => ({
                            ...prev,
                            materialId: mat.id,
                            name: mat.name,
                            unit: mat.unit || 'jam',
                            unitPrice: standardRate,
                            costPrice: costRate,
                            isCustom: false,
                          }));
                        }}
                        onCustomLabor={(name) => {
                          setLaborForm(prev => ({
                            ...prev,
                            materialId: null,
                            name,
                            isCustom: true,
                          }));
                        }}
                        placeholder="Misal: Jasa las struktur tambahan"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="labor-target-qty" className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                          Target Qty (Lot / Jam) *
                        </label>
                        <input
                          id="labor-target-qty"
                          type="text"
                          inputMode="decimal"
                          value={targetQty}
                          onChange={(e) => {
                            const raw = e.target.value.replace(',', '.');
                            if (raw === '' || /^[0-9]*\.?[0-9]*$/.test(raw)) {
                              setTargetQty(raw);
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          onMouseUp={(e) => e.preventDefault()}
                          className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-amber-500"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                          Satuan
                        </label>
                        <input
                          type="text"
                          value={laborForm.unit}
                          onChange={(e) => setLaborForm(prev => ({ ...prev, unit: e.target.value }))}
                          placeholder="jam"
                          className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Dual Financial Inputs: HPP vs Tarif Tagih */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                          Upah Tukang / HPP
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">Rp</span>
                          <input
                            type="number"
                            min="0"
                            value={laborForm.costPrice || ''}
                            onChange={(e) => setLaborForm(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-amber-300 font-mono focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                          Tarif Tagih (Harga Jual) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">Rp</span>
                          <input
                            type="number"
                            min="0"
                            value={laborForm.unitPrice || ''}
                            onChange={(e) => setLaborForm(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-emerald-400 font-mono focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live Margin Indicator */}
                    {laborForm.unitPrice > 0 && (
                      <div className="p-2 rounded bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Proyeksi Margin Jasa:</span>
                        <span className={`font-mono font-bold ${laborForm.unitPrice >= laborForm.costPrice ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {laborForm.unitPrice >= laborForm.costPrice ? '+ ' : '- '}Rp {Math.abs(laborForm.unitPrice - laborForm.costPrice).toLocaleString('id-ID')} ({Math.round(((laborForm.unitPrice - laborForm.costPrice) / laborForm.unitPrice) * 100)}%)
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                        Catatan / Scope Pekerjaan
                      </label>
                      <input
                        type="text"
                        value={laborForm.notes}
                        onChange={(e) => setLaborForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Ruang lingkup pekerjaan tukang..."
                        className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-text focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* Mode Overhead Inputs */}
                {itemMode === 'overhead' && (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="overhead-description-input" className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                        Uraian Biaya Overhead (FOH) *
                      </label>
                      <input
                        id="overhead-description-input"
                        type="text"
                        placeholder="Misal: Sewa alat derek / oven lembur"
                        className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-purple-500"
                        value={overheadForm.description}
                        onChange={(e) => setOverheadForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="overhead-target-qty" className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                          FREKWENSI DALAM PROYEK INI *
                        </label>
                        <input
                          id="overhead-target-qty"
                          type="text"
                          inputMode="decimal"
                          value={targetQty}
                          onChange={(e) => {
                            const raw = e.target.value.replace(',', '.');
                            if (raw === '' || /^[0-9]*\.?[0-9]*$/.test(raw)) {
                              setTargetQty(raw);
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          onMouseUp={(e) => e.preventDefault()}
                          className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-purple-500"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                          Satuan
                        </label>
                        <input
                          type="text"
                          value={overheadForm.unit}
                          onChange={(e) => setOverheadForm(prev => ({ ...prev, unit: e.target.value }))}
                          placeholder="hari"
                          className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                          Harga Modal (HPP)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">Rp</span>
                          <input
                            type="number"
                            min="0"
                            value={overheadForm.costPrice || ''}
                            onChange={(e) => setOverheadForm(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-text font-mono focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                          Harga Satuan Jual *
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">Rp</span>
                          <input
                            type="number"
                            min="0"
                            value={overheadForm.unitPrice || ''}
                            onChange={(e) => setOverheadForm(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-purple-400 font-mono focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                        Catatan Overhead
                      </label>
                      <input
                        type="text"
                        value={overheadForm.notes}
                        onChange={(e) => setOverheadForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Keterangan alokasi overhead..."
                        className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-text focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}

                {/* Multi-WBS Interactive Allocation Matrix (WBS 1 to 5) */}
                <div className="border border-border rounded-lg overflow-hidden mt-3">
                  <div className="bg-surface px-3 py-2 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-text uppercase font-mono">Alokasi WBS</span>
                    <span className="text-[10px] text-text-muted font-mono">Distribusikan Qty ke WBS 1 - 5</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-background text-text-muted text-[10px] uppercase border-b border-border">
                        <tr>
                          <th className="px-2 py-2 text-center border-r border-border bg-surface-hover/50">Total Qty</th>
                          {WBS_CATEGORIES.map((cat) => (
                            <th key={cat.id} className="px-1 py-2 text-center" title={cat.label}>{cat.shortLabel}</th>
                          ))}
                          <th className="px-2 py-2 text-center border-l border-border bg-surface-hover/50">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-surface">
                        <tr>
                          <td className="px-2 py-3 font-mono font-bold text-center text-primary border-r border-border bg-surface-hover/50">
                            {targetQty || 0}
                          </td>
                          {WBS_CATEGORIES.map((cat) => (
                            <td key={cat.id} className="px-1 py-3 text-center">
                              <input
                                type="text"
                                inputMode="decimal"
                                aria-label={`Alokasi ${cat.label}`}
                                value={wbsAllocations[cat.id] ?? ''}
                                onChange={(e) => {
                                  const rawVal = e.target.value;
                                  const normalized = rawVal.replace(',', '.');
                                  if (normalized === '' || /^[0-9]*\.?[0-9]*$/.test(normalized)) {
                                    setWbsAllocations(prev => ({ ...prev, [cat.id]: normalized }));
                                  }
                                }}
                                onFocus={(e) => e.target.select()}
                                onMouseUp={(e) => e.preventDefault()}
                                className="w-12 mx-auto block bg-background border border-border rounded px-1 py-1 text-center font-mono focus:border-primary focus:outline-none text-xs text-text"
                                placeholder="0"
                              />
                            </td>
                          ))}
                          <td className="px-2 py-3 text-center border-l border-border bg-surface-hover/50">
                            <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isAllocationMatch 
                                ? 'bg-status-success/20 text-status-success' 
                                : allocationRemaining > 0 
                                  ? 'bg-status-danger/20 text-status-danger' 
                                  : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {isAllocationMatch 
                                ? 'Sesuai / Pas (0.00)' 
                                : allocationRemaining > 0 
                                  ? `Sisa: ${allocationRemaining.toFixed(2)}` 
                                  : `Lebih: ${Math.abs(allocationRemaining).toFixed(2)}`}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {!isAllocationMatch && (
                  <p className="text-[11px] font-mono text-status-danger">
                    {allocationRemaining > 0 
                      ? `Harap tentukan alokasi tahapan WBS (sisa ${allocationRemaining.toFixed(2)} dari target ${targetQty}).`
                      : `Alokasi tahapan WBS melebihi target ${targetQty} (lebih ${Math.abs(allocationRemaining).toFixed(2)}).`}
                  </p>
                )}

                {/* Local Item Submit / Update Button */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddOrUpdateItem}
                    disabled={submitting}
                    className="w-full bg-primary hover:bg-primary-hover text-background font-bold py-2.5 px-4 rounded text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{editingDraftId ? 'Update Item di Change Order' : '+ Tambah ke Change Order'}</span>
                  </button>
                  {editingDraftId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="w-full bg-surface hover:bg-surface-hover text-text-muted border border-border font-bold py-2 px-4 rounded text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Panel Kanan: Live Item Review & Financial Summary */}
            <div className="lg:col-span-2 flex flex-col h-full space-y-4">
              <div className="flex-1 bg-background border border-border rounded-lg overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto max-h-[380px]">
                  {draftItems.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-text-muted text-sm p-12 text-center">
                      Belum ada item ditambahkan ke Change Order.<br/>
                      Pilih jenis item di panel kiri dan tentukan alokasi WBS untuk menyusun Change Order.
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm text-text">
                      <thead className="bg-surface sticky top-0 border-b border-border text-text-muted font-mono text-xs uppercase shadow-sm">
                        <tr>
                          <th className="px-3 py-3">Description</th>
                          <th className="px-3 py-3">Type</th>
                          <th className="px-3 py-3">WBS</th>
                          <th className="px-3 py-3 text-right">Qty</th>
                          <th className="px-3 py-3 text-right">Harga Satuan</th>
                          <th className="px-3 py-3 text-right">Harga Modal (HPP)</th>
                          <th className="px-3 py-3 text-right">Subtotal</th>
                          <th className="px-3 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {draftItems.map((item) => {
                          const subtotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
                          const isBeingEdited = editingDraftId === item.id;

                          return (
                            <tr key={item.id} className={`hover:bg-surface-hover/30 transition ${isBeingEdited ? 'bg-primary/10' : ''}`}>
                              <td className="px-3 py-3 font-medium">
                                <div className="flex flex-col gap-0.5">
                                  <span>{item.item_name}</span>
                                  {(item.package_name || (item.notes && item.notes.includes('Paket:'))) && (
                                    <span 
                                      data-testid={`badge-package-${item.id}`}
                                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1 w-fit mt-0.5"
                                    >
                                      <span>📦</span>
                                      <span>
                                        {item.package_name 
                                          ? `[Paket: ${item.package_name}]`
                                          : (item.notes?.includes('[Paket:') 
                                              ? item.notes.match(/\[Paket:[^\]]+\]/)?.[0] 
                                              : `[${item.notes}]`)}
                                      </span>
                                    </span>
                                  )}
                                  {item.notes && !item.notes.includes('Paket:') && (
                                    <span className="text-[11px] text-text-muted italic leading-tight">
                                      Catatan: {item.notes}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                {item.item_type === 'LABOR' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    <Wrench className="w-3 h-3" /> [ JASA / TUKANG ]
                                  </span>
                                ) : item.item_type === 'OVERHEAD' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                    <Clock className="w-3 h-3" /> [ OVERHEAD ]
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                                    <Package className="w-3 h-3" /> [ MATERIAL ]
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-xs text-text-muted truncate max-w-[140px]" title={item.wbs_stage}>
                                {item.wbs_stage}
                              </td>
                              <td className="px-3 py-3 text-right font-mono">
                                {item.quantity} {item.unit || ''}
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-text">
                                Rp {Number(item.unit_price).toLocaleString('id-ID')}
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-text-muted">
                                Rp {Number(item.cost_price || 0).toLocaleString('id-ID')}
                              </td>
                              <td className="px-3 py-3 text-right font-mono font-medium text-primary">
                                Rp {subtotal.toLocaleString('id-ID')}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button 
                                    type="button"
                                    onClick={() => handleEditItem(item)}
                                    className="text-primary hover:text-primary-hover p-1 rounded hover:bg-primary/10 transition cursor-pointer"
                                    title="Edit item"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="text-status-danger hover:text-red-400 p-1 rounded hover:bg-status-danger/10 transition cursor-pointer"
                                    title="Hapus baris ini"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Total Footer & Financial Summaries */}
                <div className="bg-surface border-t border-border p-4 flex flex-col gap-3">
                  {/* Category Budget Cards */}
                  <div className="grid grid-cols-3 gap-2 pb-2 border-b border-border text-xs">
                    <div className="bg-background/60 p-2.5 rounded border border-border">
                      <span className="text-text-muted block text-[10px] font-mono uppercase">Pagu Material</span>
                      <span className="font-mono font-bold text-cyan-400 text-sm">
                        Rp {totalMaterialSelling.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="bg-background/60 p-2.5 rounded border border-border">
                      <span className="text-text-muted block text-[10px] font-mono uppercase">Pagu Jasa (Labor)</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        Rp {totalLaborSelling.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="bg-background/60 p-2.5 rounded border border-border">
                      <span className="text-text-muted block text-[10px] font-mono uppercase">Overhead</span>
                      <span className="font-mono font-bold text-purple-400 text-sm">
                        Rp {totalOverheadSelling.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Summary per WBS Stage Matrix */}
                  <div className="pt-1 border-b border-border pb-3">
                    <span className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider block mb-2">
                      Ringkasan Pagu Biaya per Tahapan WBS:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                      {WBS_CATEGORIES.map(cat => {
                        const stageItems = draftItems.filter(i => i.wbs_stage === cat.id);
                        const stageMat = stageItems.filter(i => i.item_type === 'MATERIAL').reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price)), 0);
                        const stageLabor = stageItems.filter(i => i.item_type === 'LABOR').reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price)), 0);
                        const stageOverhead = stageItems.filter(i => i.item_type === 'OVERHEAD').reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price)), 0);
                        const stageTotal = stageMat + stageLabor + stageOverhead;
                        return (
                          <div key={cat.id} className="bg-background/80 p-2 rounded border border-border">
                            <span className="text-text font-bold block truncate text-[11px]" title={cat.label}>
                              {cat.shortLabel}: {cat.stageKey}
                            </span>
                            <div className="mt-1 flex flex-col text-[10px] font-mono gap-0.5">
                              <span className="text-cyan-400">Material: Rp {stageMat.toLocaleString('id-ID')}</span>
                              <span className="text-amber-400">Jasa: Rp {stageLabor.toLocaleString('id-ID')}</span>
                              <span className="text-purple-400">Overhead: Rp {stageOverhead.toLocaleString('id-ID')}</span>
                              <span className="text-text font-bold pt-1 border-t border-border/50">
                                Total: Rp {stageTotal.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comprehensive Financial Totals */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-text-muted uppercase">
                      Total Estimated Cost (HPP Modal CO)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-text-muted">Rp</span>
                      <span className="text-2xl font-bold font-mono text-text-muted">
                        {totalHpp.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm font-mono text-text-muted uppercase">
                      Total Harga Jual (Quotation CO)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-status-success">Rp</span>
                      <span className="text-2xl font-bold font-mono text-status-success">
                        {totalSelling.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-text-muted uppercase">
                      Margin (Profit CO)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>Rp</span>
                      <span className={`text-xl font-bold font-mono ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {profit.toLocaleString('id-ID')}
                        <span className="text-xs font-normal ml-1">({marginPct.toFixed(1)}%)</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-text-muted font-mono flex items-center justify-between pt-1">
                    <span>Komposisi Draft Item:</span>
                    <span>{materialCount} Material, {laborCount} Jasa, {overheadCount} Overhead</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Batal & Ajukan Change Order */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setDraftItems([]);
                    setError(null);
                    resetBuilderInputs();
                  }}
                  className="px-5 py-2.5 border border-border text-text rounded hover:bg-surface-active transition text-xs font-bold cursor-pointer"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmitFinalChangeOrder}
                  className="px-6 py-2.5 bg-primary text-background rounded hover:bg-primary-hover transition text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting || draftItems.length === 0}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {submitting ? 'Menyimpan Change Order...' : 'Ajukan Change Order'}
                </button>
              </div>
            </div>
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
      <div className="divide-y divide-border">
        {filteredChangeOrders.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            Tidak ada Change Order ditemukan dengan filter ini.
          </div>
        ) : (
          filteredChangeOrders.map((co) => {
            const isExpanded = expandedCoIds[co.id];
            const isPending = co.status === 'PENDING';
            const isApproved = co.status === 'APPROVED';
            const isRejected = co.status === 'REJECTED';

            const coTotalSelling = Number(co.cost_adjustment || co.total_amount || 0);
            const coTotalHpp = co.items ? co.items.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.cost_price || 0)), 0) : 0;
            const coMargin = coTotalSelling - coTotalHpp;
            const coMarginPct = coTotalSelling > 0 ? (coMargin / coTotalSelling) * 100 : 0;

            return (
              <div key={co.id} className="transition bg-surface hover:bg-surface-hover/20">
                {/* Collapsible Card Header */}
                <div 
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => toggleExpand(co.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-text-muted" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-text-muted" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-text bg-surface-active px-2 py-0.5 rounded border border-border">
                          {co.co_number || 'CO-PENDING'}
                        </span>
                        
                        {/* Status Badge */}
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded flex items-center gap-1 ${
                          isApproved 
                            ? 'bg-status-success/15 text-status-success border border-status-success/30' 
                            : isRejected 
                              ? 'bg-status-danger/15 text-status-danger border border-status-danger/30' 
                              : 'bg-status-warning/15 text-status-warning border border-status-warning/30'
                        }`}>
                          {isApproved && <Check className="w-3.5 h-3.5" />}
                          {isRejected && <X className="w-3.5 h-3.5" />}
                          {isPending && <Clock className="w-3.5 h-3.5" />}
                          {isApproved ? 'Disetujui (Approved)' : isRejected ? 'Ditolak (Rejected)' : 'Menunggu Review'}
                        </span>

                        <span className="text-xs text-text-muted">
                          {new Date(co.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      <p className="text-sm text-text font-medium mt-1">
                        {co.description}
                      </p>
                    </div>
                  </div>

                  {/* Financial Metrics in Summary Line */}
                  <div className="flex items-center gap-4 text-right pl-8 md:pl-0">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-text-muted block">Harga Jual Konsumen</span>
                      <span className="font-mono font-bold text-sm text-primary">
                        Rp {coTotalSelling.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="hidden sm:block border-l border-border pl-4">
                      <span className="text-[10px] uppercase font-mono text-text-muted block">Beban Modal (HPP)</span>
                      <span className="font-mono font-bold text-sm text-text">
                        Rp {coTotalHpp.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="hidden sm:block border-l border-border pl-4">
                      <span className="text-[10px] uppercase font-mono text-text-muted block">Margin Laba</span>
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        Rp {coMargin.toLocaleString('id-ID')} ({coMarginPct.toFixed(0)}%)
                      </span>
                    </div>

                    {/* Owner Action Buttons */}
                    {isOwner && isPending && (
                      <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleActionClick(co, 'APPROVED')}
                          className="bg-status-success/20 hover:bg-status-success/30 text-status-success p-1.5 rounded transition cursor-pointer"
                          title="Setujui Change Order"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleActionClick(co, 'REJECTED')}
                          className="bg-status-danger/20 hover:bg-status-danger/30 text-status-danger p-1.5 rounded transition cursor-pointer"
                          title="Tolak Change Order"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Itemized Breakdown Table */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 bg-surface-hover/10">
                    <div className="border border-border rounded-lg overflow-hidden bg-background">
                      <div className="bg-surface px-4 py-2 border-b border-border flex items-center justify-between text-xs text-text-muted font-mono">
                        <span className="uppercase font-bold">Rincian Item Snapshot (Point-in-Time)</span>
                        <span>{co.items ? co.items.length : 0} Item Terdaftar</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-surface/50 text-text-muted uppercase text-[10px] border-b border-border font-mono">
                            <tr>
                              <th className="px-3 py-2">Item Type</th>
                              <th className="px-3 py-2">Alokasi WBS</th>
                              <th className="px-3 py-2">Deskripsi Item</th>
                              <th className="px-3 py-2 text-right">Qty</th>
                              <th className="px-3 py-2 text-right">Tarif Jual</th>
                              <th className="px-3 py-2 text-right">Modal HPP</th>
                              <th className="px-3 py-2 text-right">Subtotal Jual</th>
                              <th className="px-3 py-2">Catatan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {co.items && co.items.length > 0 ? (
                              co.items.map((it) => {
                                const itSellingSub = Number(it.quantity || 0) * Number(it.unit_price || 0);
                                return (
                                  <tr key={it.id} className="hover:bg-surface-hover/20">
                                    <td className="px-3 py-2">
                                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                        it.item_type === 'MATERIAL'
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                          : it.item_type === 'OVERHEAD'
                                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                      }`}>
                                        {it.item_type}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-text-muted">
                                      {it.wbs_stage}
                                    </td>
                                    <td className="px-3 py-2 font-medium text-text">
                                      {it.item_name}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-text">
                                      {it.quantity} {it.unit}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-primary">
                                      Rp {Number(it.unit_price || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-text-muted">
                                      Rp {Number(it.cost_price || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-bold text-text">
                                      Rp {itSellingSub.toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-3 py-2 text-text-muted italic max-w-[200px] truncate">
                                      {it.notes || '-'}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={8} className="px-4 py-4 text-center text-text-muted italic">
                                  Tidak ada rincian item individual (Legacy Change Order).
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Package Selector Modal */}
      <ChangeOrderPackageModal
        isOpen={isPackageSelectorOpen}
        onClose={() => setIsPackageSelectorOpen(false)}
        onApply={handleApplyPackage}
        packages={packages}
        selectedPackageId={selectedPackageId}
        onPackageChange={setSelectedPackageId}
      />

      {/* Confirmation Modal for Approval / Rejection */}
      {actionTarget && (
        <ConfirmationModal
          isOpen={true}
          title={actionTarget.action === 'APPROVED' ? 'Setujui Change Order?' : 'Tolak Change Order?'}
          message={`Apakah Anda yakin ingin ${actionTarget.action === 'APPROVED' ? 'menyetujui' : 'menolak'} Change Order ${actionTarget.coNumber || ''} sebesar Rp ${actionTarget.totalAmount.toLocaleString('id-ID')} untuk pekerjaan "${actionTarget.description}"?`}
          confirmText={actionTarget.action === 'APPROVED' ? 'Ya, Setujui Change Order' : 'Ya, Tolak Permohonan'}
          cancelText="Kembali"
          variant={actionTarget.action === 'APPROVED' ? 'success' : 'danger'}
          isLoading={isProcessingAction}
          onConfirm={executeAction}
          onCancel={() => {
            if (!isProcessingAction) setActionTarget(null);
          }}
        />
      )}
    </div>
  );
};
