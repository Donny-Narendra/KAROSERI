import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calculator, Plus, Trash2, Edit2, Download, Printer, Lock, ShieldCheck, Info, Wrench, Package, Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

import { inventoryService } from '../services/inventoryService';
import type { Material } from '../services/inventoryService';
import { MaterialAutocomplete } from './MaterialAutocomplete';

import { packageService } from '../services/packageService';
import type { ProductPackage } from '../types/package';
import { PackageAllocationModal } from './PackageAllocationModal';
import type { RabItemPayload } from './PackageAllocationModal';
import { exportRabToExcel, printRabQuotation } from '../utils/rabExport';
import { ConfirmationModal, type ConfirmationModalVariant } from './ConfirmationModal';

interface RabSpkDetails {
  id: string;
  spk_no: string;
  customer_name: string;
  vehicle_number?: string | null;
  vehicle_plate?: string | null;
  status?: string | null;
  is_pricing_locked?: boolean | null;
  allocation_status?: 'PARTIAL' | 'COMPLETE' | null;
  locked_at?: string | null;
}

interface DbRabItemRecord {
  id: string;
  wbs_category: string;
  wbs_stage?: string | null;
  item_type?: 'MATERIAL' | 'LABOR' | string | null;
  description?: string | null;
  material_name?: string | null;
  material_id?: string | null;
  package_id?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  notes?: string | null;
  unit_price?: number | string | null;
  cost_price?: number | string | null;
  labor_hours?: number | string | null;
  labor_rate?: number | string | null;
  overhead_hours?: number | string | null;
  overhead_rate?: number | string | null;
  item_total?: number | string | null;
  subtotal?: number | string | null;
  is_locked?: boolean | null;
}

interface RabItem {
  id: string;
  wbsCategory: string;
  type: 'material' | 'labor' | 'overhead';
  description: string;
  qty: number;
  unit?: string;
  notes?: string;
  unitPrice: number;
  costPrice?: number;
  subtotal?: number;
  isLocked?: boolean;
  wasteFactor?: number; // percentage (0-100)
  packageId?: string;
  materialId?: string;
}

const LABOR_KEYWORDS = ['jasa', 'ongkos', 'borongan', 'tukang', 'upah', 'tenaga'];

export const RabCalculator: React.FC<{ spkId: string }> = ({ spkId }) => {
  const [items, setItems] = useState<RabItem[]>([]);
  const [manualAllocations, setManualAllocations] = useState<Record<string, string>>({});
  const [bayHourlyRate, setBayHourlyRate] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [modalFeedback, setModalFeedback] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: ConfirmationModalVariant;
  } | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [spkDetails, setSpkDetails] = useState<RabSpkDetails | null>(null);
  const isDocumentLocked = Boolean(spkDetails?.is_pricing_locked || (spkDetails?.status && spkDetails.status !== 'DRAFT'));

  // Toggle mode: 'material' (default) | 'labor' | 'overhead'
  const [itemMode, setItemMode] = useState<'material' | 'labor' | 'overhead'>('material');

  const wbsCategories = [
    { id: 'Pembongkaran', label: 'WBS 1: Pembongkaran' },
    { id: 'Sasis/Rangka', label: 'WBS 2: Sasis/Rangka' },
    { id: 'Dinding/Fabrikasi', label: 'WBS 3: Dinding/Fabrikasi' },
    { id: 'Cat/Finishing', label: 'WBS 4: Pengecatan' },
    { id: 'Kelistrikan/Hidrolik', label: 'WBS 5: Kelistrikan/Hidrolik' },
  ];

  // Dedicated state for Labor / Tukang item entry
  const [laborForm, setLaborForm] = useState({
    name: '',
    estimatedCost: 0,
    notes: '',
  });

  const [laborAllocations, setLaborAllocations] = useState<Record<string, string>>({
    'Pembongkaran': '1',
    'Sasis/Rangka': '0',
    'Dinding/Fabrikasi': '0',
    'Cat/Finishing': '0',
    'Kelistrikan/Hidrolik': '0',
  });

  const laborTotalQty = wbsCategories.reduce(
    (sum, cat) => sum + (parseFloat(laborAllocations[cat.id]) || 0),
    0
  );

  // Package BOM & Inventory master state
  const [packages, setPackages] = useState<ProductPackage[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);

  // Filter master inventory items specifically for labor
  const availableLaborItems = useMemo(() => {
    return materials.filter(item => {
      const nameLower = (item.name || '').toLowerCase();
      const categoryLower = (item.category || '').toLowerCase();
      return (
        categoryLower === 'jasa' || 
        categoryLower === 'labor' ||
        LABOR_KEYWORDS.some(kw => nameLower.includes(kw))
      );
    });
  }, [materials]);

  const [isLaborSuggestOpen, setIsLaborSuggestOpen] = useState(false);
  const [laborHighlightedIndex, setLaborHighlightedIndex] = useState(-1);
  const laborListRef = useRef<HTMLUListElement>(null);

  const filteredLaborItems = useMemo(() => {
    const q = (laborForm.name || '').trim().toLowerCase();
    if (!q) return availableLaborItems;
    return availableLaborItems.filter(item => item.name.toLowerCase().includes(q));
  }, [availableLaborItems, laborForm.name]);

  const handleSelectLaborItem = (item: Material) => {
    const standardRate = item.selling_price || item.cost_price || item.unit_price || 0;
    setLaborForm(prev => ({
      ...prev,
      name: item.name,
      estimatedCost: standardRate > 0 ? standardRate : prev.estimatedCost,
    }));
    setIsLaborSuggestOpen(false);
  };

  const handleLaborInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isLaborSuggestOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsLaborSuggestOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setLaborHighlightedIndex(prev => (prev + 1) % (filteredLaborItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setLaborHighlightedIndex(prev => (prev - 1 + (filteredLaborItems.length || 1)) % (filteredLaborItems.length || 1));
    } else if (e.key === 'Enter') {
      if (laborHighlightedIndex >= 0 && laborHighlightedIndex < filteredLaborItems.length) {
        e.preventDefault();
        handleSelectLaborItem(filteredLaborItems[laborHighlightedIndex]);
      } else {
        setIsLaborSuggestOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsLaborSuggestOpen(false);
    }
  };

  const handleLaborBlur = () => {
    setTimeout(() => {
      setIsLaborSuggestOpen(false);
    }, 150);
  };
  const [selectedPackage, setSelectedPackage] = useState<ProductPackage | null>(null);
  const [allocationStatus, setAllocationStatus] = useState<'PARTIAL' | 'COMPLETE'>('COMPLETE');
  
  const [newItem, setNewItem] = useState<Partial<RabItem>>({
    type: 'material',
    qty: 1,
    unitPrice: 0,
    wasteFactor: 0,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase.from('workshop_settings').select('bay_hourly_rate').eq('id', 1).single();
      if (!error && data) {
        setBayHourlyRate(data.bay_hourly_rate || 0);
      }
    };

    const fetchExistingRab = async () => {
      if (!spkId) return;
      
      const { data: estData, error: estError } = await supabase
        .from('rab_estimations')
        .select('id')
        .eq('spk_id', spkId)
        .single();
        
      const { data: spkData } = await supabase.from('spk').select('*').eq('id', spkId).single();
      if (spkData) {
         setSpkDetails(spkData as unknown as RabSpkDetails);
         if (spkData.allocation_status) {
           setAllocationStatus(spkData.allocation_status);
         }
      }
        
      if (!estError && estData) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('rab_items')
          .select('*')
          .eq('rab_estimation_id', estData.id);
          
        if (!itemsError && itemsData) {
          const loadedItems = (itemsData as unknown as DbRabItemRecord[]).map((dbItem: DbRabItemRecord) => {
            let type: 'material' | 'labor' | 'overhead' = 'material';
            let qty = 0;
            let unitPrice = Number(dbItem.unit_price) || 0;
            const costPrice = Number(dbItem.cost_price) || 0;
            
            const laborHours = Number(dbItem.labor_hours || 0);
            const overheadHours = Number(dbItem.overhead_hours || 0);

            if (dbItem.item_type === 'LABOR' || laborHours > 0 || Number(dbItem.labor_rate || 0) > 0) {
              type = 'labor';
              qty = Number(dbItem.quantity) || laborHours || 1;
              unitPrice = Number(dbItem.unit_price) || Number(dbItem.labor_rate) || 0;
              if (unitPrice === 0 && Number(dbItem.item_total || 0) > 0) {
                unitPrice = Number(dbItem.item_total) / qty;
              }
            } else if (overheadHours > 0) {
              type = 'overhead';
              qty = overheadHours / 8;
              unitPrice = Number(dbItem.overhead_rate) * 8 || unitPrice;
            } else {
              type = 'material';
              qty = Number(dbItem.quantity || 0);
              // Recover unit price if still 0
              if (unitPrice === 0) {
                unitPrice = Number(dbItem.item_total || 0) / (Number(dbItem.quantity) || 1);
              }
            }
            
            return {
              id: dbItem.id,
              wbsCategory: dbItem.wbs_category,
              type,
              description: dbItem.material_name || dbItem.description || '',
              qty,
              unit: dbItem.unit || (type === 'labor' ? 'lot' : 'pcs'),
              notes: dbItem.notes || (type === 'labor' && dbItem.description && dbItem.description !== dbItem.material_name ? dbItem.description : undefined),
              unitPrice,
              costPrice,
              subtotal: Number(dbItem.subtotal) || (qty * unitPrice),
              isLocked: dbItem.is_locked ?? false,
              wasteFactor: 0,
              packageId: dbItem.package_id || undefined,
              materialId: dbItem.material_id || undefined
            };
          });
          setItems(loadedItems);
        }
      }
    };

    const fetchPackages = async () => {
      try {
        const pkgs = await packageService.getPackages();
        setPackages(pkgs);
      } catch (err) {
        console.error("Failed to load packages:", err);
      }
    };

    const fetchMaterials = async () => {
      try {
        const mats = await inventoryService.getMaterials();
        setMaterials(mats);
      } catch (err) {
        console.error("Failed to load materials:", err);
      }
    };

    fetchSettings();
    fetchPackages();
    fetchMaterials();
    fetchExistingRab().finally(() => {
      setIsInitialLoad(false);
    });
  }, [spkId]);

  useEffect(() => {
    if (isInitialLoad || isDocumentLocked) return;
    
    const timer = setTimeout(() => {
      handleSaveEstimation(true); // true = silent save
    }, 500);

    return () => clearTimeout(timer);
  }, [items, isInitialLoad, isDocumentLocked]);

  const handleAddLaborItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDocumentLocked) {
      setModalFeedback({
        isOpen: true,
        title: 'Dokumen Terkunci',
        message: 'Tidak dapat menambah item karena RAB dan SPK telah berstatus terkunci (read-only).',
        variant: 'danger',
      });
      return;
    }
    if (!laborForm.name.trim() || !laborForm.estimatedCost || laborForm.estimatedCost <= 0) return;

    if (laborTotalQty <= 0) {
      setModalFeedback({
        isOpen: true,
        title: 'Alokasi WBS Kosong',
        message: 'Harap tentukan alokasi tahapan WBS minimal 1.',
        variant: 'danger',
      });
      return;
    }

    const newLaborItemsToPush: RabItem[] = [];
    wbsCategories.forEach(cat => {
      const wbsQty = parseFloat(laborAllocations[cat.id]) || 0;
      if (wbsQty > 0) {
        newLaborItemsToPush.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          wbsCategory: cat.id,
          type: 'labor',
          description: laborForm.name.trim(),
          qty: wbsQty,
          unit: 'lot',
          unitPrice: laborForm.estimatedCost,
          costPrice: laborForm.estimatedCost,
          subtotal: wbsQty * laborForm.estimatedCost,
          isLocked: false,
          wasteFactor: 0,
          notes: laborForm.notes.trim() || undefined,
          materialId: undefined,
        });
      }
    });

    const baseItems = editingId ? items.filter(i => i.id !== editingId) : items;
    setItems([...baseItems, ...newLaborItemsToPush]);
    setEditingId(null);
    setIsLaborSuggestOpen(false);

    setLaborForm({
      name: '',
      estimatedCost: 0,
      notes: '',
    });
    setLaborAllocations({
      'Pembongkaran': '1',
      'Sasis/Rangka': '0',
      'Dinding/Fabrikasi': '0',
      'Cat/Finishing': '0',
      'Kelistrikan/Hidrolik': '0',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsLaborSuggestOpen(false);
    setLaborForm({
      name: '',
      estimatedCost: 0,
      notes: '',
    });
    setLaborAllocations({
      'Pembongkaran': '1',
      'Sasis/Rangka': '0',
      'Dinding/Fabrikasi': '0',
      'Cat/Finishing': '0',
      'Kelistrikan/Hidrolik': '0',
    });
    setNewItem({
      type: itemMode,
      qty: 1,
      unitPrice: itemMode === 'overhead' ? bayHourlyRate * 8 : 0,
      wasteFactor: 0,
    });
    setManualAllocations({});
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDocumentLocked) {
      setModalFeedback({
        isOpen: true,
        title: 'Dokumen Terkunci',
        message: 'Tidak dapat menambah item karena RAB dan SPK telah berstatus terkunci (read-only).',
        variant: 'danger',
      });
      return;
    }
    if (!newItem.description || !newItem.qty || newItem.unitPrice === undefined) return;
    
    const totalManualAllocated = wbsCategories.reduce((sum, cat) => sum + (parseFloat(manualAllocations[cat.id]) || 0), 0);
    const manualRemaining = (newItem.qty || 0) - totalManualAllocated;
    const isAllocationPassed = Math.abs(manualRemaining) < 0.001;
    
    if (!isAllocationPassed || newItem.qty <= 0) return;

    const matchedMat = materials.find(m => m.id === newItem.materialId);
    const costPrice = matchedMat?.cost_price !== undefined 
      ? matchedMat.cost_price 
      : (newItem.type === 'labor' 
          ? (newItem.unitPrice as number) 
          : (newItem.unitPrice ? Math.round((newItem.unitPrice as number) * 0.8) : 0));

    const newItemsToPush: RabItem[] = [];
    wbsCategories.forEach(cat => {
       const wbsQty = parseFloat(manualAllocations[cat.id]) || 0;
       if (wbsQty > 0) {
          newItemsToPush.push({
             id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
             wbsCategory: cat.id,
             type: newItem.type as 'material' | 'labor' | 'overhead',
             description: newItem.description as string,
             qty: wbsQty,
             unit: newItem.type === 'labor' ? 'lot' : 'pcs',
             unitPrice: newItem.unitPrice as number,
             costPrice,
             subtotal: wbsQty * (newItem.unitPrice as number),
             isLocked: false,
             wasteFactor: newItem.type === 'material' ? (newItem.wasteFactor || 0) : 0,
             materialId: newItem.materialId,
          });
       }
    });

    const baseItems = editingId ? items.filter(i => i.id !== editingId) : items;
    setItems([...baseItems, ...newItemsToPush]);
    setEditingId(null);
    setManualAllocations({});
    
    setNewItem({
      type: newItem.type,
      qty: 1,
      unitPrice: newItem.type === 'overhead' ? bayHourlyRate * 8 : 0,
      wasteFactor: 0,
    });
  };

  const handleExportXlsx = () => {
    exportRabToExcel(spkDetails, items, {
      material: totalMaterialCost,
      labor: totalLaborCost,
      overhead: totalOverheadCost,
      grandTotal: totalCost
    });
  };

  const handlePrintPdf = () => {
    printRabQuotation(spkDetails, items, {
      material: totalMaterialCost,
      labor: totalLaborCost,
      overhead: totalOverheadCost,
      grandTotal: totalCost
    });
  };

  const handleEditItem = (item: RabItem) => {
    if (isDocumentLocked) {
      setModalFeedback({
        isOpen: true,
        title: 'Dokumen Terkunci',
        message: 'Item ini telah terkunci dan tidak dapat diedit secara langsung.',
        variant: 'danger',
      });
      return;
    }
    setEditingId(item.id);
    if (item.type === 'labor') {
      setItemMode('labor');
      setLaborForm({
        name: item.description,
        estimatedCost: item.unitPrice,
        notes: item.notes || '',
      });
      setLaborAllocations({
        'Pembongkaran': item.wbsCategory === 'Pembongkaran' ? String(item.qty) : '0',
        'Sasis/Rangka': item.wbsCategory === 'Sasis/Rangka' ? String(item.qty) : '0',
        'Dinding/Fabrikasi': item.wbsCategory === 'Dinding/Fabrikasi' ? String(item.qty) : '0',
        'Cat/Finishing': item.wbsCategory === 'Cat/Finishing' ? String(item.qty) : '0',
        'Kelistrikan/Hidrolik': item.wbsCategory === 'Kelistrikan/Hidrolik' ? String(item.qty) : '0',
      });
    } else {
      setItemMode(item.type);
      setNewItem({
        type: item.type,
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
        wasteFactor: item.wasteFactor,
        materialId: item.materialId,
      });
      setManualAllocations({ [item.wbsCategory]: String(item.qty) });
    }
  };

  const handleRemoveItem = (id: string) => {
    if (isDocumentLocked) {
      setModalFeedback({
        isOpen: true,
        title: 'Dokumen Terkunci',
        message: 'Item tidak dapat dihapus karena dokumen SPK telah disetujui / aktif.',
        variant: 'danger',
      });
      return;
    }
    setItemToDelete(id);
  };

  const confirmRemoveItem = () => {
    if (isDocumentLocked) return;
    if (itemToDelete) {
      if (editingId === itemToDelete) {
        handleCancelEdit();
      }
      setItems(items.filter(item => item.id !== itemToDelete));
      setItemToDelete(null);
    }
  };

  const calculateItemTotal = (item: RabItem) => {
    if (item.type === 'material') {
      const wasteMultiplier = 1 + (item.wasteFactor || 0) / 100;
      return item.qty * item.unitPrice * wasteMultiplier;
    }
    return item.qty * item.unitPrice;
  };

  const totalMaterialCost = items.filter(i => i.type === 'material').reduce((sum, i) => sum + calculateItemTotal(i), 0);
  const totalLaborCost = items.filter(i => i.type === 'labor').reduce((sum, i) => sum + calculateItemTotal(i), 0);
  const totalOverheadCost = items.filter(i => i.type === 'overhead').reduce((sum, i) => sum + calculateItemTotal(i), 0);
  const totalCost = totalMaterialCost + totalLaborCost + totalOverheadCost;

  const handleSaveEstimation = async (silent = false) => {
    if (!spkId) {
      if (!silent) {
        setModalFeedback({
          isOpen: true,
          title: 'ID SPK Tidak Ditemukan',
          message: 'Gagal menyimpan estimasi karena parameter ID SPK tidak ditemukan.',
          variant: 'danger',
        });
      }
      return;
    }

    if (isDocumentLocked) {
      if (!silent) {
        setModalFeedback({
          isOpen: true,
          title: 'Dokumen Terkunci (Read-Only)',
          message: `RAB dan harga SPK ini telah dikunci (status: ${spkDetails?.status || 'LOCKED'}). Nilai harga bersifat permanen (point-in-time snapshot). Setiap perubahan wajib melalui Change Order (SPK Tambahan).`,
          variant: 'danger',
        });
      }
      return;
    }

    try {
      // 1. Upsert estimation
      const { data: estData, error: estError } = await supabase.from('rab_estimations').upsert({
        spk_id: spkId,
        total_material_cost: totalMaterialCost,
        total_labor_cost: totalLaborCost,
        total_overhead_cost: totalOverheadCost,
        total_estimated_cost: totalCost,
      }, { onConflict: 'spk_id' }).select().single();

      if (estError) throw estError;

      // 2. Insert items with point-in-time price snapshot
      const { error: delError } = await supabase.from('rab_items').delete().eq('rab_estimation_id', estData.id);
      if (delError && !silent) console.error("Error deleting old items:", delError);

      if (items.length > 0) {
        const itemsToInsert = items.map(item => {
          const matchedMat = materials.find(m => m.id === item.materialId);
          const unitPrice = (item.type === 'material' || item.type === 'labor') ? item.unitPrice : 0;
          const costPrice = item.costPrice !== undefined 
            ? item.costPrice 
            : (item.type === 'labor' 
                ? item.unitPrice 
                : (matchedMat?.cost_price !== undefined ? matchedMat.cost_price : Math.round(unitPrice * 0.8)));

          return {
            rab_estimation_id: estData.id,
            spk_id: spkId,
            wbs_category: item.wbsCategory,
            item_type: item.type === 'labor' ? 'LABOR' : 'MATERIAL',
            description: item.notes || item.description,
            material_name: item.description,
            quantity: item.qty,
            unit: item.unit || (item.type === 'labor' ? 'lot' : 'pcs'),
            notes: item.notes || null,
            unit_price: unitPrice,
            cost_price: costPrice,
            labor_hours: item.type === 'labor' ? item.qty : 0,
            labor_rate: item.type === 'labor' ? item.unitPrice : 0,
            overhead_hours: item.type === 'overhead' ? item.qty * 8 : 0,
            overhead_rate: item.type === 'overhead' ? item.unitPrice / 8 : 0,
            item_total: calculateItemTotal(item),
            package_id: item.packageId || null,
            material_id: item.type === 'labor' ? null : (item.materialId || null),
            is_locked: false
          };
        });

        const { error: itemsError } = await supabase.from('rab_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      // 3. Update SPK total cost
      const { error: spkError } = await supabase.from('spk').update({ 
        total_estimated_cost: totalCost,
        allocation_status: allocationStatus
      }).eq('id', spkId);
      if (spkError) throw spkError;

      if (!silent) {
        setModalFeedback({
          isOpen: true,
          title: 'Estimasi Berhasil Disimpan',
          message: 'Data estimasi RAB dan status alokasi berhasil diperbarui ke database dengan snapshot harga permanen.',
          variant: 'success',
        });
      }
    } catch (err: unknown) {
      console.error(err);
      if (!silent) {
        setModalFeedback({
          isOpen: true,
          title: 'Gagal Menyimpan Estimasi',
          message: 'Terjadi kesalahan saat menyimpan estimasi: ' + (err instanceof Error ? err.message : 'Unknown error'),
          variant: 'danger',
        });
      }
    }
  };

  const handleApplyPackageAllocation = async (allocatedItems: RabItemPayload[], isComplete: boolean, templateToSave?: Record<string, Record<string, number>>) => {
    if (isDocumentLocked) {
      setModalFeedback({
        isOpen: true,
        title: 'Dokumen Terkunci',
        message: 'Tidak dapat mengubah alokasi paket karena SPK telah berstatus terkunci.',
        variant: 'danger',
      });
      return;
    }
    if (!selectedPackage) return;
    const pkgId = selectedPackage.id;

    if (templateToSave) {
      try {
        for (const [itemId, allocation] of Object.entries(templateToSave)) {
          await packageService.updatePackageItemDefaultAllocation(itemId, allocation);
        }
        // Force refresh packages to get the new templates in state
        const pkgs = await packageService.getPackages();
        setPackages(pkgs);
      } catch (err) {
        console.error("Failed to save template:", err);
      }
    }

    const newItems = allocatedItems.map((payload) => {
      const payloadMatId = payload.materialId;
      const matchedMat = materials.find(m => (payloadMatId && m.id === payloadMatId) || m.name.toLowerCase() === payload.description.toLowerCase());
      const costPrice = matchedMat?.cost_price !== undefined 
        ? matchedMat.cost_price 
        : (payload.type === 'labor' ? payload.unitPrice : Math.round(payload.unitPrice * 0.8));
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        wbsCategory: payload.wbsCategory,
        type: payload.type,
        description: payload.description,
        qty: payload.qty,
        unitPrice: payload.unitPrice,
        costPrice,
        subtotal: payload.qty * payload.unitPrice,
        isLocked: false,
        wasteFactor: payload.wasteFactor || 0,
        packageId: pkgId,
        materialId: payloadMatId || matchedMat?.id,
      };
    });
    
    setItems((prev) => [
      ...prev.filter(i => i.packageId !== pkgId),
      ...newItems
    ]);
    setAllocationStatus(isComplete ? 'COMPLETE' : 'PARTIAL');
    setIsPackageModalOpen(false);
    setSelectedPackage(null);
  };

  const appliedPackagesData = packages.filter(p => items.some(i => i.packageId === p.id));

  const totalManualAllocated = wbsCategories.reduce((sum, cat) => sum + (parseFloat(manualAllocations[cat.id]) || 0), 0);
  const manualRemaining = (newItem.qty || 0) - totalManualAllocated;
  const isAllocationPassed = Math.abs(manualRemaining) < 0.001;

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-surface-hover flex items-center justify-between flex-wrap gap-3">
         <div className="flex items-center gap-3">
           <h3 className="font-bold text-text font-display flex items-center gap-2">
             <Calculator className="w-5 h-5 text-primary"/> RAB Calculator
           </h3>
           {isDocumentLocked ? (
             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
               <Lock className="w-3.5 h-3.5" /> STATUS: TERKUNCI ({spkDetails?.status || 'LOCKED'})
             </span>
           ) : (
             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-mono">
               <ShieldCheck className="w-3.5 h-3.5" /> STATUS: DRAFT (EDITABLE)
             </span>
           )}
         </div>
         <div className="flex gap-2">
           <button 
              onClick={handleExportXlsx}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-status-success/10 text-status-success border border-status-success/20 rounded hover:bg-status-success/20 transition cursor-pointer"
              title="Export to XLSX"
           >
              <Download className="w-4 h-4" /> Export XLSX
           </button>
           <button 
              onClick={handlePrintPdf}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary/20 transition cursor-pointer" 
              title="Print to PDF"
           >
              <Printer className="w-4 h-4" /> Export PDF / Cetak
           </button>
         </div>
      </div>

      {isDocumentLocked && (
        <div className="mx-6 mt-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 mt-0.5 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                Dokumen Harga Terkunci (Point-in-Time Price Snapshot Enforced)
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                STATUS: {spkDetails?.status || 'ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              SPK ini telah berstatus resmi <strong>{spkDetails?.status}</strong>. Seluruh nilai nominal harga satuan bahan baku dan subtotal item RAB telah dibekukan (point-in-time snapshot). Fluktuasi harga master material di gudang tidak akan mengubah nilai kontrak ini. Perubahan spesifikasi pekerjaan wajib melalui <strong>Change Order (SPK Tambahan)</strong>.
            </p>
            {spkDetails?.locked_at && (
              <p className="text-[11px] font-mono text-amber-400/80 mt-2">
                🔒 Terkunci sejak: {new Date(spkDetails.locked_at).toLocaleString('id-ID')}
              </p>
            )}
          </div>
        </div>
      )}
      
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col - Input Form or Read-Only Locked Card */}
        <div className="lg:col-span-1 space-y-6">
          {isDocumentLocked ? (
            <div className="bg-background border border-amber-500/20 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 text-amber-400 border-b border-border pb-3">
                <Lock className="w-5 h-5" />
                <h4 className="font-bold text-sm">Mode Read-Only Aktif</h4>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Penambahan, perubahan harga, atau penghapusan item estimasi dinonaktifkan karena dokumen SPK telah disetujui.
              </p>
              <div className="bg-surface p-3 rounded-lg border border-border text-xs space-y-2">
                <div className="flex justify-between items-center text-text-muted">
                  <span>Status Dokumen:</span>
                  <span className="font-mono font-bold text-amber-400">{spkDetails?.status}</span>
                </div>
                <div className="flex justify-between items-center text-text-muted">
                  <span>Kebijakan Harga:</span>
                  <span className="font-mono text-text">Point-in-Time Snapshot</span>
                </div>
                <div className="flex justify-between items-center text-text-muted">
                  <span>Total Item RAB:</span>
                  <span className="font-mono font-bold text-text">{items.length} item</span>
                </div>
              </div>
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-text-muted">
                <p className="text-primary font-semibold mb-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Butuh Perubahan Pekerjaan?
                </p>
                Ajukan <strong>Change Order (SPK Tambahan)</strong> melalui modul Service Advisor untuk penambahan material atau jasa baru.
              </div>
            </div>
          ) : (
            <>
              <div className="bg-background border border-border rounded-lg p-4 mb-6">
                <h4 className="font-bold text-sm text-text border-b border-border pb-2 mb-3">Pilih Paket Barang Jadi (Assembly List)</h4>
            <div className="flex flex-col gap-2">
              <select
                className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary transition"
                onChange={(e) => {
                  const pkg = packages.find(p => p.id === e.target.value);
                  if (pkg) {
                    setSelectedPackage(pkg);
                    setIsPackageModalOpen(true);
                  }
                  e.target.value = ''; // Reset select
                }}
                value=""
              >
                <option value="" disabled>-- Pilih Paket Assembly List --</option>
                {packages.map(p => {
                  const isApplied = items.some(i => i.packageId === p.id);
                  return (
                    <option key={p.id} value={p.id} disabled={isApplied}>
                      {p.name} {isApplied ? '(Sudah Dialokasikan)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {appliedPackagesData.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4 mb-6">
              <h4 className="font-bold text-sm text-text border-b border-border pb-2 mb-3 flex items-center gap-2">
                Paket Assembly List Diterapkan
                {allocationStatus === 'PARTIAL' && (
                  <span className="bg-status-warning/20 text-status-warning text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Alokasi Sebagian (Perlu Dilengkapi)
                  </span>
                )}
              </h4>
              <div className="space-y-2">
                {appliedPackagesData.map(pkg => (
                  <div key={pkg.id} className="flex items-center justify-between bg-background p-2 rounded border border-border">
                    <span className="text-sm font-medium text-text">{pkg.name}</span>
                    <button
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setIsPackageModalOpen(true);
                      }}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition font-bold"
                    >
                      Edit Alokasi
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toggle Mode Input Item: Bahan Baku (Material) vs Jasa / Tukang (Labor) vs Overhead */}
          <div className="flex rounded-lg bg-surface p-1 border border-border mb-4">
            <button
              type="button"
              id="toggle-mode-material"
              onClick={() => {
                setItemMode('material');
                setNewItem(prev => ({ ...prev, type: 'material', wasteFactor: 0 }));
                if (editingId) handleCancelEdit();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-bold transition cursor-pointer ${
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
              onClick={() => {
                setItemMode('labor');
                setIsLaborSuggestOpen(false);
                setLaborAllocations({
                  'Pembongkaran': '1',
                  'Sasis/Rangka': '0',
                  'Dinding/Fabrikasi': '0',
                  'Cat/Finishing': '0',
                  'Kelistrikan/Hidrolik': '0',
                });
                setNewItem(prev => ({ ...prev, type: 'labor', wasteFactor: 0, materialId: undefined }));
                if (editingId) handleCancelEdit();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-bold transition cursor-pointer ${
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
              onClick={() => {
                setItemMode('overhead');
                setNewItem(prev => ({ ...prev, type: 'overhead', wasteFactor: 0, unitPrice: bayHourlyRate * 8, materialId: undefined }));
                if (editingId) handleCancelEdit();
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-bold transition cursor-pointer ${
                itemMode === 'overhead'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-text-muted hover:text-text hover:bg-surface-hover'
              }`}
              title="Workshop Bay Overhead"
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Overhead</span>
            </button>
          </div>

          {itemMode === 'labor' ? (
            <form onSubmit={handleAddLaborItem} className="bg-background border border-amber-500/30 rounded-lg p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="font-bold text-sm text-text flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span>{editingId ? 'Edit Jasa / Pekerjaan Tukang' : 'Input Jasa / Tukang (Labor)'}</span>
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  PAGU JASA
                </span>
              </div>

              <div className="relative">
                <label htmlFor="labor-name-input" className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono flex items-center justify-between">
                  <span>Nama Jasa / Pekerjaan Tukang <span className="text-status-danger">*</span></span>
                  {availableLaborItems.length > 0 && (
                    <span className="text-[10px] font-mono font-normal text-amber-400">
                      Auto-suggest aktif ({availableLaborItems.length} katalog jasa)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    id="labor-name-input"
                    type="text"
                    required
                    value={laborForm.name}
                    onChange={(e) => {
                      setLaborForm({ ...laborForm, name: e.target.value });
                      setIsLaborSuggestOpen(true);
                    }}
                    onFocus={() => setIsLaborSuggestOpen(true)}
                    onBlur={handleLaborBlur}
                    onKeyDown={handleLaborInputKeyDown}
                    placeholder="misal: Jasa Tukang Las Sasis"
                    className="w-full bg-surface border border-border rounded pl-3 pr-24 py-2 text-sm text-text focus:outline-none focus:border-amber-500"
                    autoComplete="off"
                  />
                  {availableLaborItems.length > 0 && (
                    <span className="absolute right-2.5 top-2.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 pointer-events-none">
                      Katalog Jasa
                    </span>
                  )}
                </div>

                {/* Floating Suggestions Dropdown */}
                {isLaborSuggestOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                    {filteredLaborItems.length > 0 ? (
                      <ul ref={laborListRef} className="divide-y divide-border/60">
                        {filteredLaborItems.map((item, index) => {
                          const standardRate = item.selling_price || item.cost_price || item.unit_price || 0;
                          const isHighlighted = index === laborHighlightedIndex;
                          return (
                            <li
                              key={item.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectLaborItem(item);
                              }}
                              onMouseEnter={() => setLaborHighlightedIndex(index)}
                              className={`p-2.5 cursor-pointer text-xs transition-colors flex items-center justify-between gap-2 ${
                                isHighlighted ? 'bg-amber-500/15 text-amber-300' : 'text-text hover:bg-surface-hover'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                                  JASA
                                </span>
                                <span className="font-medium truncate">{item.name}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-mono font-bold text-amber-400">
                                  Rp {standardRate.toLocaleString('id-ID')}
                                </div>
                                <div className="text-[10px] text-text-muted">Tarif Standar</div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="p-3 text-center text-xs text-text-muted font-mono">
                        Tidak ditemukan di master inventaris jasa. Tekan Enter untuk gunakan nama kustom.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Multi-stage Labor WBS Allocation Grid */}
              <div className="space-y-1.5 mt-3">
                <label className="block text-xs font-semibold text-text-muted uppercase font-mono tracking-wider">
                  ALOKASI WBS <span className="text-status-danger">*</span>
                </label>
                <div className="border border-border rounded-md overflow-hidden bg-surface">
                  <div className="grid grid-cols-6 text-center text-xs font-semibold border-b border-border bg-surface-hover/90 py-1.5 text-text-muted font-mono">
                    <div className="border-r border-border">TOTAL QTY</div>
                    <div title="WBS 1: Pembongkaran">WBS 1</div>
                    <div title="WBS 2: Sasis/Rangka">WBS 2</div>
                    <div title="WBS 3: Dinding/Fabrikasi">WBS 3</div>
                    <div title="WBS 4: Pengecatan">WBS 4</div>
                    <div title="WBS 5: Kelistrikan/Hidrolik">WBS 5</div>
                  </div>
                  <div className="grid grid-cols-6 text-center items-center py-2 px-1 gap-1">
                    <div className="text-sm font-bold text-amber-500 font-mono border-r border-border">
                      {laborTotalQty}
                    </div>
                    {wbsCategories.map((cat) => (
                      <div key={cat.id} className="flex justify-center">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          aria-label={`Alokasi ${cat.label}`}
                          value={laborAllocations[cat.id] ?? ''}
                          onChange={(e) => setLaborAllocations({ ...laborAllocations, [cat.id]: e.target.value })}
                          className="w-12 mx-auto block bg-background border border-border rounded px-1 py-1 text-center font-mono focus:border-amber-500 focus:outline-none text-xs text-text"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {laborTotalQty <= 0 && (
                  <p className="text-[11px] font-mono text-status-danger">
                    Harap tentukan alokasi tahapan WBS minimal 1.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="labor-cost-input" className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                  Estimasi Biaya Jasa / Upah (Rp) <span className="text-status-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-text-muted font-mono">Rp</span>
                  <input
                    id="labor-cost-input"
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={laborForm.estimatedCost || ''}
                    onChange={(e) => setLaborForm({ ...laborForm, estimatedCost: parseFloat(e.target.value) || 0 })}
                    placeholder="misal: 500000"
                    className="w-full bg-surface border border-border rounded pl-10 pr-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                {laborForm.estimatedCost > 0 && (
                  <p className="text-[11px] font-mono text-amber-400 mt-1">
                    Terbilang: Rp {laborForm.estimatedCost.toLocaleString('id-ID')} (per 1 unit / lot pekerjaan)
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="labor-notes-input" className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                  Catatan / Scope Pekerjaan <span className="text-text-muted lowercase text-[10px] font-sans">(opsional)</span>
                </label>
                <textarea
                  id="labor-notes-input"
                  rows={3}
                  value={laborForm.notes}
                  onChange={(e) => setLaborForm({ ...laborForm, notes: e.target.value })}
                  placeholder="Keterangan ruang lingkup pekerjaan tukang..."
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={!laborForm.name.trim() || !laborForm.estimatedCost || laborForm.estimatedCost <= 0 || laborTotalQty <= 0}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingId ? 'Update Jasa ke RAB' : 'Tambah Jasa ke RAB'}</span>
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full bg-surface hover:bg-surface-hover text-text-muted border border-border font-bold py-2 px-4 rounded text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Batal Edit
                  </button>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddItem} className="bg-background border border-border rounded-lg p-4 space-y-4">
              <h4 className="font-bold text-sm text-text border-b border-border pb-2">
                {editingId 
                  ? (itemMode === 'overhead' ? 'Edit Item Overhead' : 'Edit Item Bahan Baku') 
                  : (itemMode === 'overhead' ? 'Tambah Item Overhead' : 'Tambah Item Bahan Baku')}
              </h4>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                  {itemMode === 'material' ? 'Item Bahan Baku' : 'Deskripsi Overhead'}
                </label>
                {itemMode === 'material' ? (
                  <MaterialAutocomplete
                    materials={materials}
                    initialValue={newItem.description || ''}
                    onSelect={(m) => setNewItem({ ...newItem, description: m.name, unitPrice: m.unit_price || 0, materialId: m.id })}
                    placeholder="Cari material gudang..."
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={newItem.description || ''}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="e.g. Workshop Bay Overhead"
                    className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                    {itemMode === 'material' ? 'Qty (Bahan)' : 'Days (Hari Kerja)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    value={newItem.qty || ''}
                    onChange={(e) => setNewItem({ ...newItem, qty: parseFloat(e.target.value) })}
                    className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                    {itemMode === 'material' ? 'Harga Satuan Bahan' : 'Bay Rate / Hari'}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newItem.unitPrice === 0 ? '' : newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) })}
                    className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Waste factor is hidden and defaults to 0% to keep material calculation pure */}
              <input
                type="hidden"
                id="waste-factor-input"
                value={newItem.wasteFactor ?? 0}
              />

              {/* Multi-WBS Allocation Matrix */}
              <div className="border border-border rounded-lg overflow-hidden mt-2">
                <div className="bg-surface px-3 py-2 border-b border-border">
                  <span className="text-xs font-bold text-text uppercase font-mono">Alokasi WBS</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-background text-text-muted text-[10px] uppercase border-b border-border">
                      <tr>
                        <th className="px-2 py-2 text-center border-r border-border bg-surface-hover/50">Total Qty</th>
                        {wbsCategories.map((cat, i) => (
                          <th key={cat.id} className="px-1 py-2 text-center" title={cat.label}>WBS {i+1}</th>
                        ))}
                        <th className="px-2 py-2 text-center border-l border-border bg-surface-hover/50">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface">
                      <tr>
                        <td className="px-2 py-3 font-mono font-bold text-center text-primary border-r border-border bg-surface-hover/50">
                          {newItem.qty || 0}
                        </td>
                        {wbsCategories.map((cat) => (
                          <td key={cat.id} className="px-1 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={manualAllocations[cat.id] || ''}
                              onChange={(e) => setManualAllocations({ ...manualAllocations, [cat.id]: e.target.value })}
                              className="w-14 mx-auto block bg-background border border-border rounded px-1 py-1 text-center font-mono focus:border-primary focus:outline-none text-xs"
                              placeholder="0"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-3 text-center border-l border-border bg-surface-hover/50">
                          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isAllocationPassed ? 'bg-status-success/20 text-status-success' : 'bg-status-danger/20 text-status-danger'
                          }`}>
                            {isAllocationPassed ? 'PASSED' : (manualRemaining > 0 ? `Sisa: ${manualRemaining.toFixed(2)}` : `Over: ${Math.abs(manualRemaining).toFixed(2)}`)}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isAllocationPassed || !newItem.qty || newItem.qty <= 0}
                className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold py-2 px-4 rounded text-sm transition flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {editingId ? 'Update Item' : 'Tambah Bahan ke RAB'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full bg-surface hover:bg-surface-hover text-text-muted border border-border font-bold py-2 px-4 rounded text-sm transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
            </form>
          )}
        </>
      )}
    </div>

        {/* Right Col - Estimation Table */}
        <div className="lg:col-span-2 flex flex-col h-full">
          <div className="flex-1 bg-background border border-border rounded-lg overflow-hidden flex flex-col">
            
            <div className="flex-1 overflow-auto">
              {items.length === 0 ? (
                <div className="h-full flex items-center justify-center text-text-muted text-sm p-8 text-center">
                  No items added yet.<br/>Select a WBS category and add items to estimate cost.
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
                      <th className="px-3 py-3 text-right">Waste</th>
                      <th className="px-3 py-3 text-right">Subtotal</th>
                      <th className="px-3 py-3 text-center">Aksi / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-hover/30 transition">
                        <td className="px-3 py-3 font-medium">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              {isDocumentLocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              <span>{item.description}</span>
                            </div>
                            {item.notes && item.type === 'labor' && (
                              <span className="text-[11px] text-text-muted italic leading-tight">
                                Scope: {item.notes}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {item.type === 'labor' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Wrench className="w-3 h-3" /> [ JASA / TUKANG ]
                            </span>
                          ) : item.type === 'overhead' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              <Clock className="w-3 h-3" /> [ OVERHEAD ]
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                              <Package className="w-3 h-3" /> [ MATERIAL ]
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-text-muted truncate max-w-[130px]" title={wbsCategories.find(c => c.id === item.wbsCategory)?.label || item.wbsCategory}>
                          {wbsCategories.find(c => c.id === item.wbsCategory)?.label || item.wbsCategory}
                        </td>
                        <td className="px-3 py-3 text-right font-mono">
                          {item.qty} {item.type === 'labor' ? (item.unit || 'lot') : ''}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-text">
                          Rp {item.unitPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-text-muted">
                          Rp {(item.costPrice || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-text-muted">
                          {item.type === 'material' ? `${item.wasteFactor}%` : '-'}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-medium text-primary">
                          Rp {calculateItemTotal(item).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {isDocumentLocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleEditItem(item)}
                                className="text-primary hover:text-primary-hover p-1 rounded hover:bg-primary/10 transition cursor-pointer"
                                title="Edit item"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-status-danger hover:text-red-400 p-1 rounded hover:bg-status-danger/10 transition cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Total Footer */}
            <div className="bg-surface border-t border-border p-4 flex flex-col gap-3">
               <div className="grid grid-cols-3 gap-2 pb-2 border-b border-border text-xs">
                 <div className="bg-background/60 p-2 rounded border border-border">
                   <span className="text-text-muted block text-[10px] font-mono uppercase">Pagu Material</span>
                   <span className="font-mono font-bold text-cyan-400 text-sm">Rp {totalMaterialCost.toLocaleString('id-ID')}</span>
                 </div>
                 <div className="bg-background/60 p-2 rounded border border-border">
                   <span className="text-text-muted block text-[10px] font-mono uppercase">Pagu Jasa (Labor)</span>
                   <span className="font-mono font-bold text-amber-400 text-sm">Rp {totalLaborCost.toLocaleString('id-ID')}</span>
                 </div>
                 <div className="bg-background/60 p-2 rounded border border-border">
                   <span className="text-text-muted block text-[10px] font-mono uppercase">Overhead</span>
                   <span className="font-mono font-bold text-purple-400 text-sm">Rp {totalOverheadCost.toLocaleString('id-ID')}</span>
                 </div>
               </div>

               {/* Ringkasan per WBS */}
               <div className="pt-2 border-b border-border pb-3">
                 <span className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider block mb-2">
                   Ringkasan Pagu Biaya per Tahapan WBS:
                 </span>
                 <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                   {wbsCategories.map(cat => {
                     const catItems = items.filter(i => i.wbsCategory === cat.id);
                     const catMat = catItems.filter(i => i.type === 'material').reduce((sum, i) => sum + calculateItemTotal(i), 0);
                     const catLabor = catItems.filter(i => i.type === 'labor').reduce((sum, i) => sum + calculateItemTotal(i), 0);
                     const catTotal = catMat + catLabor;
                     return (
                       <div key={cat.id} className="bg-background/80 p-2 rounded border border-border">
                         <span className="text-text font-bold block truncate text-[11px]" title={cat.label}>
                           {cat.label}
                         </span>
                         <div className="mt-1 flex flex-col text-[10px] font-mono">
                           <span className="text-cyan-400">Material: Rp {catMat.toLocaleString('id-ID')}</span>
                           <span className="text-amber-400">Jasa: Rp {catLabor.toLocaleString('id-ID')}</span>
                           <span className="text-text font-bold pt-1 border-t border-border/50">
                             Total: Rp {catTotal.toLocaleString('id-ID')}
                           </span>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>

               <div className="flex items-center justify-between">
                 <span className="text-sm font-mono text-text-muted uppercase">Total Estimated Cost (RAB Modal)</span>
                 <div className="flex items-center gap-2">
                   <span className="text-xl font-bold text-text-muted">Rp</span>
                   <span className="text-2xl font-bold font-mono text-text-muted">
                     {totalCost.toLocaleString('id-ID')}
                   </span>
                 </div>
               </div>
               
               <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                 <span className="text-sm font-mono text-text-muted uppercase">Total Harga Jual (Quotation)</span>
                 <div className="flex items-center gap-2">
                   <span className="text-xl font-bold text-status-success">Rp</span>
                   <span className="text-2xl font-bold font-mono text-status-success">
                     {(() => {
                        const uniquePackages = new Map();
                        let nonPackageCost = 0;
                        items.forEach(item => {
                           if (item.packageId) {
                              const pkg = packages.find(p => p.id === item.packageId);
                              if (pkg) uniquePackages.set(item.packageId, pkg.selling_price);
                           } else {
                              nonPackageCost += calculateItemTotal(item);
                           }
                        });
                        let packagePrice = 0;
                        uniquePackages.forEach(p => packagePrice += Number(p));
                        const totalJual = packagePrice + nonPackageCost;
                        return totalJual.toLocaleString('id-ID');
                     })()}
                   </span>
                 </div>
               </div>

               <div className="flex items-center justify-between">
                 <span className="text-sm font-mono text-text-muted uppercase">Margin (Profit)</span>
                 <div className="flex items-center gap-2">
                   <span className="text-lg font-bold text-primary">Rp</span>
                   <span className="text-xl font-bold font-mono text-primary">
                     {(() => {
                        const uniquePackages = new Map();
                        let nonPackageCost = 0;
                        items.forEach(item => {
                           if (item.packageId) {
                              const pkg = packages.find(p => p.id === item.packageId);
                              if (pkg) uniquePackages.set(item.packageId, pkg.selling_price);
                           } else {
                              nonPackageCost += calculateItemTotal(item);
                           }
                        });
                        let packagePrice = 0;
                        uniquePackages.forEach(p => packagePrice += Number(p));
                        const totalJual = packagePrice + nonPackageCost;
                        return (totalJual - totalCost).toLocaleString('id-ID');
                     })()}
                   </span>
                 </div>
               </div>
            </div>

          </div>
        </div>

      </div>

      {/* Modal Konfirmasi Hapus Item RAB */}
      <ConfirmationModal
        isOpen={!!itemToDelete}
        title="Hapus Item RAB"
        message={(() => {
          const item = items.find(i => i.id === itemToDelete);
          return item 
            ? `Apakah Anda yakin ingin menghapus "${item.description}" (${item.wbsCategory}) dari estimasi RAB? Tindakan ini tidak dapat dibatalkan.`
            : 'Apakah Anda yakin ingin menghapus item ini dari estimasi RAB? Tindakan ini tidak dapat dibatalkan.';
        })()}
        confirmText="Ya, Hapus Item"
        cancelText="Batal"
        variant="danger"
        onConfirm={confirmRemoveItem}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Modal Notifikasi / Feedback */}
      {modalFeedback && (
        <ConfirmationModal
          isOpen={modalFeedback.isOpen}
          title={modalFeedback.title}
          message={modalFeedback.message}
          confirmText="Mengerti"
          variant={modalFeedback.variant}
          hideCancel={true}
          onConfirm={() => setModalFeedback(null)}
          onCancel={() => setModalFeedback(null)}
        />
      )}

      {selectedPackage && (
        <PackageAllocationModal
          packageData={selectedPackage}
          existingItems={items.filter(i => i.packageId === selectedPackage.id)}
          isOpen={isPackageModalOpen}
          onClose={() => {
            setIsPackageModalOpen(false);
            setSelectedPackage(null);
          }}
          onApply={handleApplyPackageAllocation}
        />
      )}
    </div>
  );
};
