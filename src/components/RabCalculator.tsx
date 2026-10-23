import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calculator, Plus, Trash2, Edit2, Download, Printer, Lock, ShieldCheck, Info, Wrench, Package, Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

import { inventoryService } from '../services/inventoryService';
import type { Material } from '../services/inventoryService';
import { MaterialAutocomplete } from './MaterialAutocomplete';

import { packageService } from '../services/packageService';
import { isLaborKeyword, isOverheadKeyword } from '../utils/itemClassification';
import type { ProductPackage } from '../types/package';
import { PackageAllocationModal } from './PackageAllocationModal';
import type { RabItemPayload } from './PackageAllocationModal';
import { exportRabToExcel, printRabQuotation } from '../utils/rabExport';
import { parseDecimalValue } from '../utils/numberUtils';
import { ConfirmationModal, type ConfirmationModalVariant } from './ConfirmationModal';

import { rabService, type RabItem, type RabSpkDetails, type DbRabItemRecord } from '../services/rabService';

export type { RabItem, RabSpkDetails, DbRabItemRecord };

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

  // Custom vs Master Labor tracking & dual pricing state
  const [selectedLaborMaterialId, setSelectedLaborMaterialId] = useState<string | null>(null);
  const [isCustomLabor, setIsCustomLabor] = useState<boolean>(false);
  const [laborCostPrice, setLaborCostPrice] = useState<number>(0); // Biaya modal / upah tukang
  const [laborUnitPrice, setLaborUnitPrice] = useState<number>(0); // Harga jual ke konsumen

  const [laborAllocations, setLaborAllocations] = useState<Record<string, string>>({
    'Pembongkaran': '1',
    'Sasis/Rangka': '0',
    'Dinding/Fabrikasi': '0',
    'Cat/Finishing': '0',
    'Kelistrikan/Hidrolik': '0',
  });

  const [laborTargetQty, setLaborTargetQty] = useState<number | string>(1);

  const laborTarget = parseDecimalValue(laborTargetQty);
  const laborAllocatedSum = Math.round(
    wbsCategories.reduce(
      (sum, cat) => sum + parseDecimalValue(laborAllocations[cat.id] ?? 0),
      0
    ) * 100
  ) / 100;

  const laborRemaining = Math.round((laborTarget - laborAllocatedSum) * 100) / 100;
  const isLaborAllocationMatch = Math.abs(laborRemaining) < 0.001 && laborAllocatedSum > 0;

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
    const standardRate = item.selling_price || item.unit_price || 0;
    const costRate = item.cost_price !== undefined && item.cost_price > 0
      ? item.cost_price
      : Math.round(standardRate * 0.8);

    setSelectedLaborMaterialId(item.id);
    setIsCustomLabor(false);
    setLaborCostPrice(costRate);
    setLaborUnitPrice(standardRate);

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
        // Mode kustom (non-inventaris)
        setSelectedLaborMaterialId(null);
        setIsCustomLabor(true);
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
  
  const [newItem, setNewItem] = useState<{
    type: 'material' | 'labor' | 'overhead';
    description?: string;
    qty: string | number;
    unitPrice?: number;
    materialId?: string;
  }>({
    type: 'material',
    qty: 1,
    unitPrice: 0,
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
      try {
        const { spk: spkData, items: loadedItems } = await rabService.loadRabItems(spkId);
        if (spkData) {
          setSpkDetails(spkData);
          if (spkData.allocation_status) {
            setAllocationStatus(spkData.allocation_status);
          }
        }
        setItems(loadedItems);
      } catch (err) {
        console.error("Gagal memuat data RAB:", err);
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
    const effectiveUnitPrice = laborUnitPrice > 0 ? laborUnitPrice : (laborForm.estimatedCost || 0);
    const effectiveCostPrice = laborCostPrice > 0 ? laborCostPrice : effectiveUnitPrice;
    if (!laborForm.name.trim() || effectiveUnitPrice <= 0) return;

    if (!isLaborAllocationMatch) {
      setModalFeedback({
        isOpen: true,
        title: 'Alokasi WBS Belum Sesuai',
        message: laborRemaining > 0
          ? `Alokasi WBS masih memiliki sisa ${laborRemaining.toFixed(2)}. Harap sesuaikan total alokasi dengan Total Qty (${laborTarget}).`
          : `Alokasi WBS melebihi Total Qty sebesar ${Math.abs(laborRemaining).toFixed(2)}. Harap sesuaikan total alokasi.`,
        variant: 'danger',
      });
      return;
    }

    const newLaborItemsToPush: RabItem[] = [];
    wbsCategories.forEach(cat => {
      const wbsQty = parseDecimalValue(laborAllocations[cat.id] ?? 0);
      if (wbsQty > 0) {
        newLaborItemsToPush.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          wbsCategory: cat.id,
          type: 'labor',
          description: laborForm.name.trim(),
          qty: wbsQty,
          unit: 'lot',
          unitPrice: effectiveUnitPrice,
          costPrice: effectiveCostPrice,
          subtotal: Math.round(wbsQty * effectiveUnitPrice),
          isLocked: false,
          package_name: null,
          packageName: null,
          packageId: undefined,
          notes: laborForm.notes.trim() || undefined,
          materialId: isCustomLabor ? undefined : (selectedLaborMaterialId || undefined),
        });
      }
    });

    const prevEditingId = editingId;
    const baseItems = prevEditingId ? items.filter(i => i.id !== prevEditingId) : items;
    setItems([...baseItems, ...newLaborItemsToPush]);
    setEditingId(null);
    setIsLaborSuggestOpen(false);

    setLaborTargetQty(1);
    setSelectedLaborMaterialId(null);
    setIsCustomLabor(false);
    setLaborCostPrice(0);
    setLaborUnitPrice(0);
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

    // Mutasi database langsung secara permanen
    (async () => {
      try {
        if (prevEditingId) {
          await rabService.deleteRabItem(spkId, prevEditingId);
        }
        const payloads = newLaborItemsToPush.map(i => ({
          wbsCategory: i.wbsCategory,
          type: i.type,
          description: i.description,
          qty: i.qty,
          unit: i.unit,
          unitPrice: i.unitPrice,
          costPrice: i.costPrice,
          materialId: i.materialId,
          notes: i.notes,
          package_name: null,
          packageName: null,
          packageId: undefined,
        }));
        const persisted = await rabService.insertRabItems(spkId, payloads);
        if (persisted && persisted.length > 0) {
          setItems(prev => {
            const filtered = prev.filter(p => !newLaborItemsToPush.some(temp => temp.id === p.id));
            return [...filtered, ...persisted];
          });
        }
      } catch (err) {
        console.error("Gagal menyimpan item jasa ke database:", err);
      }
    })();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsLaborSuggestOpen(false);
    setLaborTargetQty(1);
    setSelectedLaborMaterialId(null);
    setIsCustomLabor(false);
    setLaborCostPrice(0);
    setLaborUnitPrice(0);
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
    const currentQty = parseDecimalValue(newItem.qty);
    if (!newItem.description || currentQty <= 0 || newItem.unitPrice === undefined) return;
    
    const totalAllocated = Math.round(
      wbsCategories.reduce((sum, cat) => sum + parseDecimalValue(manualAllocations[cat.id] ?? 0), 0) * 100
    ) / 100;
    const remaining = Math.round((currentQty - totalAllocated) * 100) / 100;
    const isAllocationPassed = Math.abs(remaining) < 0.001 && currentQty > 0;
    
    if (!isAllocationPassed || currentQty <= 0) return;

    const matchedMat = materials.find(m => m.id === newItem.materialId);
    const costPrice = matchedMat?.cost_price !== undefined 
      ? matchedMat.cost_price 
      : (newItem.type === 'labor' 
          ? (newItem.unitPrice as number) 
          : (newItem.unitPrice ? Math.round((newItem.unitPrice as number) * 0.8) : 0));

    const newItemsToPush: RabItem[] = [];
    wbsCategories.forEach(cat => {
       const wbsQty = parseDecimalValue(manualAllocations[cat.id] ?? 0);
       if (wbsQty > 0) {
          newItemsToPush.push({
             id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
             wbsCategory: cat.id,
             type: newItem.type as 'material' | 'labor' | 'overhead',
             description: newItem.description as string,
             qty: wbsQty,
             unit: newItem.type === 'labor' ? 'lot' : (newItem.type === 'overhead' ? 'hari' : 'pcs'),
             unitPrice: newItem.unitPrice as number,
             costPrice,
             subtotal: wbsQty * (newItem.unitPrice as number),
             isLocked: false,
             package_name: null,
             packageName: null,
             packageId: undefined,
             materialId: newItem.materialId,
          });
       }
    });

    const prevEditingId = editingId;
    const baseItems = prevEditingId ? items.filter(i => i.id !== prevEditingId) : items;
    setItems([...baseItems, ...newItemsToPush]);
    setEditingId(null);
    setManualAllocations({});
    
    setNewItem({
      type: newItem.type,
      qty: 1,
      unitPrice: newItem.type === 'overhead' ? bayHourlyRate * 8 : 0,
    });

    // Mutasi database langsung secara permanen
    (async () => {
      try {
        if (prevEditingId) {
          await rabService.deleteRabItem(spkId, prevEditingId);
        }
        const payloads = newItemsToPush.map(i => ({
          wbsCategory: i.wbsCategory,
          type: i.type,
          description: i.description,
          qty: i.qty,
          unit: i.unit,
          unitPrice: i.unitPrice,
          costPrice: i.costPrice,
          materialId: i.materialId,
          package_name: null,
          packageName: null,
          packageId: undefined,
        }));
        const persisted = await rabService.insertRabItems(spkId, payloads);
        if (persisted && persisted.length > 0) {
          setItems(prev => {
            const filtered = prev.filter(p => !newItemsToPush.some(temp => temp.id === p.id));
            return [...filtered, ...persisted];
          });
        }
      } catch (err) {
        console.error("Gagal menyimpan item ke database:", err);
      }
    })();
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
      setLaborTargetQty(item.qty);
      const isCustom = !item.materialId;
      setIsCustomLabor(isCustom);
      setSelectedLaborMaterialId(item.materialId || null);
      const unitPrice = item.unitPrice || 0;
      const costPrice = item.costPrice !== undefined ? item.costPrice : unitPrice;
      setLaborUnitPrice(unitPrice);
      setLaborCostPrice(costPrice);
      setLaborForm({
        name: item.description,
        estimatedCost: unitPrice,
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
      const targetId = itemToDelete;
      setItems(items.filter(item => item.id !== targetId));
      setItemToDelete(null);

      rabService.deleteRabItem(spkId, targetId).catch(err => {
        console.error("Gagal menghapus item dari database:", err);
      });
    }
  };

  const calculateItemTotal = (item: RabItem) => {
    return Number(item.qty) * Number(item.unitPrice || 0);
  };

  const calculateItemModalCost = (item: RabItem) => {
    const cost = item.costPrice !== undefined ? Number(item.costPrice) : Number(item.unitPrice || 0);
    return Number(item.qty) * cost;
  };

  const totalMaterialCost = items.filter(i => i.type === 'material').reduce((sum, i) => sum + calculateItemTotal(i), 0);
  const totalLaborCost = items.filter(i => i.type === 'labor').reduce((sum, i) => sum + calculateItemTotal(i), 0);
  const totalOverheadCost = items.filter(i => i.type === 'overhead').reduce((sum, i) => sum + calculateItemTotal(i), 0);
  const totalCost = totalMaterialCost + totalLaborCost + totalOverheadCost;
  const totalEstimatedModalCost = items.reduce((sum, i) => sum + calculateItemModalCost(i), 0);

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
      await rabService.saveFullRabEstimation(spkId, items, allocationStatus);

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

  const handleSaveEstimationRef = useRef(handleSaveEstimation);
  useEffect(() => {
    handleSaveEstimationRef.current = handleSaveEstimation;
  });

  useEffect(() => {
    if (isInitialLoad || isDocumentLocked) return;
    
    const timer = setTimeout(() => {
      handleSaveEstimationRef.current(true); // true = silent save
    }, 500);

    return () => clearTimeout(timer);
  }, [items, isInitialLoad, isDocumentLocked]);

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
      
      const itemType: 'MATERIAL' | 'LABOR' | 'OVERHEAD' = 
        (payload.type ? (payload.type.toUpperCase() as 'MATERIAL' | 'LABOR' | 'OVERHEAD') : undefined) ||
        matchedMat?.item_type || 
        (isLaborKeyword(payload.description) ? 'LABOR' : isOverheadKeyword(payload.description) ? 'OVERHEAD' : 'MATERIAL');

      const costPrice = matchedMat?.cost_price !== undefined 
        ? matchedMat.cost_price 
        : (itemType === 'LABOR' ? payload.unitPrice : Math.round(payload.unitPrice * 0.8));

      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        wbsCategory: payload.wbsCategory,
        type: itemType.toLowerCase() as 'material' | 'labor' | 'overhead',
        description: payload.description,
        qty: payload.qty,
        unit: payload.unit || matchedMat?.unit || (itemType === 'LABOR' ? 'lot' : itemType === 'OVERHEAD' ? 'hari' : 'pcs'),
        unitPrice: payload.unitPrice,
        costPrice,
        subtotal: payload.qty * payload.unitPrice,
        isLocked: false,
        packageId: pkgId,
        package_name: selectedPackage.name,
        packageName: selectedPackage.name,
        notes: `Paket: ${selectedPackage.name}`,
        materialId: itemType === 'MATERIAL' ? (payloadMatId || matchedMat?.id) : undefined,
      };
    });
    
    setItems((prev) => [
      ...prev.filter(i => i.packageId !== pkgId),
      ...newItems
    ]);
    setAllocationStatus(isComplete ? 'COMPLETE' : 'PARTIAL');
    setIsPackageModalOpen(false);
    setSelectedPackage(null);

    // Mutasi database langsung secara permanen
    (async () => {
      try {
        await rabService.deletePackageRabItems(spkId, pkgId);
        const payloads = newItems.map(i => ({
          wbsCategory: i.wbsCategory,
          type: i.type,
          description: i.description,
          qty: i.qty,
          unit: i.unit,
          unitPrice: i.unitPrice,
          costPrice: i.costPrice,
          materialId: i.materialId,
          packageId: pkgId,
          package_name: selectedPackage.name,
          packageName: selectedPackage.name,
          notes: i.notes || `Paket: ${selectedPackage.name}`,
        }));
        const persisted = await rabService.insertRabItems(spkId, payloads);
        if (persisted && persisted.length > 0) {
          setItems(prev => {
            const filtered = prev.filter(p => !newItems.some(temp => temp.id === p.id));
            return [...filtered, ...persisted];
          });
        }
        await supabase.from('spk').update({
          allocation_status: isComplete ? 'COMPLETE' : 'PARTIAL'
        }).eq('id', spkId);
      } catch (err) {
        console.error("Gagal menyimpan alokasi paket ke database:", err);
      }
    })();
  };

  const appliedPackagesData = packages.filter(p => items.some(i => i.packageId === p.id));

  const totalQty = parseDecimalValue(newItem.qty);
  const overheadAllocatedSum = Math.round(
    wbsCategories.reduce(
      (sum, cat) => sum + parseDecimalValue(manualAllocations[cat.id] ?? 0),
      0
    ) * 100
  ) / 100;
  const overheadRemaining = Math.round((totalQty - overheadAllocatedSum) * 100) / 100;
  const manualRemaining = overheadRemaining;
  const isAllocationPassed = Math.abs(manualRemaining) < 0.001 && totalQty > 0;

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

      {!isDocumentLocked && items.length === 0 && (
        <div className="mx-6 mt-6 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 mt-0.5 shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wider">
              Estimasi RAB Masih Kosong (0 Item)
            </h4>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              SPK ini belum memiliki rincian biaya. Anda wajib menambahkan item material, jasa borongan, atau memilih paket BOM terlebih dahulu. SPK tidak dapat diajukan ke Kasir untuk penerimaan DP selama rincian item masih kosong.
            </p>
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
                setNewItem(prev => ({ ...prev, type: 'material', materialId: undefined, unitPrice: 0 }));
                setManualAllocations({});
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
                setLaborTargetQty(1);
                setSelectedLaborMaterialId(null);
                setIsCustomLabor(false);
                setLaborCostPrice(0);
                setLaborUnitPrice(0);
                setLaborAllocations({
                  'Pembongkaran': '1',
                  'Sasis/Rangka': '0',
                  'Dinding/Fabrikasi': '0',
                  'Cat/Finishing': '0',
                  'Kelistrikan/Hidrolik': '0',
                });
                setNewItem(prev => ({ ...prev, type: 'labor', materialId: undefined }));
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
                setNewItem(prev => ({ ...prev, type: 'overhead', unitPrice: bayHourlyRate * 8, materialId: undefined }));
                setManualAllocations({});
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
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-sm text-text">
                    {editingId ? 'Edit Jasa / Pekerjaan Tukang' : 'Input Jasa / Tukang (Labor)'}
                  </h4>
                  {isCustomLabor ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                      KUSTOM (NON-INVENTARIS)
                    </span>
                  ) : selectedLaborMaterialId ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                      MASTER INVENTARIS
                    </span>
                  ) : null}
                </div>
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
                      const val = e.target.value;
                      setLaborForm(prev => ({ ...prev, name: val }));
                      setIsLaborSuggestOpen(true);
                      const matched = availableLaborItems.find(
                        item => item.name.toLowerCase() === val.trim().toLowerCase()
                      );
                      if (matched) {
                        setSelectedLaborMaterialId(matched.id);
                        setIsCustomLabor(false);
                        const standardRate = matched.selling_price || matched.unit_price || 0;
                        const costRate = matched.cost_price !== undefined && matched.cost_price > 0
                          ? matched.cost_price
                          : Math.round(standardRate * 0.8);
                        setLaborCostPrice(costRate);
                        setLaborUnitPrice(standardRate);
                      } else {
                        setSelectedLaborMaterialId(null);
                        setIsCustomLabor(true);
                      }
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
                  <div className="grid grid-cols-7 text-center text-xs font-semibold border-b border-border bg-surface-hover/90 py-1.5 text-text-muted font-mono">
                    <div className="border-r border-border">TOTAL QTY</div>
                    <div title="WBS 1: Pembongkaran">WBS 1</div>
                    <div title="WBS 2: Sasis/Rangka">WBS 2</div>
                    <div title="WBS 3: Dinding/Fabrikasi">WBS 3</div>
                    <div title="WBS 4: Pengecatan">WBS 4</div>
                    <div title="WBS 5: Kelistrikan/Hidrolik">WBS 5</div>
                    <div className="border-l border-border">STATUS</div>
                  </div>
                  <div className="grid grid-cols-7 text-center items-center py-2 px-1 gap-1">
                    {/* Kolom 1: Total Target Qty */}
                    <div className="text-sm font-bold text-amber-500 font-mono border-r border-border">
                      {laborTargetQty}
                    </div>
                    {/* Kolom 2 - 6: Input WBS 1 s/d WBS 5 */}
                    {wbsCategories.map((cat) => (
                      <div key={cat.id} className="flex justify-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          aria-label={`Alokasi ${cat.label}`}
                          value={laborAllocations[cat.id] ?? ''}
                          onChange={(e) => {
                            const rawVal = e.target.value;
                            const normalized = rawVal.replace(',', '.');
                            if (normalized === '' || /^[0-9]*\.?[0-9]*$/.test(normalized)) {
                              setLaborAllocations(prev => ({ ...prev, [cat.id]: normalized }));
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          onMouseUp={(e) => e.preventDefault()}
                          className="w-12 mx-auto block bg-background border border-border rounded px-1 py-1 text-center font-mono focus:border-amber-500 focus:outline-none text-xs text-text"
                          placeholder="0"
                        />
                      </div>
                    ))}
                    {/* Kolom 7: Badge STATUS */}
                    <div className="flex justify-center items-center px-1 border-l border-border">
                      {isLaborAllocationMatch ? (
                        <span className="text-[11px] font-medium px-2 py-1 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 whitespace-nowrap">
                          Sesuai / Pas (0.00)
                        </span>
                      ) : laborRemaining > 0 ? (
                        <span className="text-[11px] font-medium px-2 py-1 rounded bg-rose-950/80 text-rose-400 border border-rose-800 whitespace-nowrap">
                          Sisa: {laborRemaining.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-1 rounded bg-amber-950/80 text-amber-400 border border-amber-800 whitespace-nowrap">
                          Lebih: {Math.abs(laborRemaining).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!isLaborAllocationMatch && (
                  <p className="text-[11px] font-mono text-status-danger">
                    {laborRemaining > 0 
                      ? `Harap tentukan alokasi tahapan WBS (sisa ${laborRemaining.toFixed(2)} dari target ${laborTargetQty}).`
                      : `Alokasi tahapan WBS melebihi target ${laborTargetQty} (lebih ${Math.abs(laborRemaining).toFixed(2)}).`}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="labor-target-qty-input" className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                  Target Qty (Lot / Unit) <span className="text-status-danger">*</span>
                </label>
                <input
                  id="labor-target-qty-input"
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={laborTargetQty}
                  onChange={(e) => setLaborTargetQty(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onMouseUp={(e) => e.preventDefault()}
                  placeholder="1"
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Dual Financial Inputs: Biaya Modal (HPP) vs Tarif Tagih ke Konsumen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {/* Field 1: Biaya Modal / Upah Tukang */}
                <div>
                  <label htmlFor="labor-cost-price-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Upah Pokok Tukang / Biaya Modal (HPP) <span className="text-status-danger">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">Rp</span>
                    <input
                      id="labor-cost-price-input"
                      type="number"
                      min="0"
                      value={laborCostPrice || ''}
                      onChange={(e) => setLaborCostPrice(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      placeholder="Upah yang dibayar ke tukang..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm text-amber-300 font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Jumlah pembayaran beban gaji bengkel</span>
                </div>

                {/* Field 2: Tarif Jual ke Konsumen */}
                <div>
                  <label htmlFor="labor-cost-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Tarif Tagih ke Konsumen (Harga Jual) <span className="text-status-danger">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">Rp</span>
                    <input
                      id="labor-cost-input"
                      type="number"
                      min="0"
                      value={laborUnitPrice || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLaborUnitPrice(val);
                        setLaborForm(prev => ({ ...prev, estimatedCost: val }));
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="Tarif yang ditagihkan di SPK..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm text-emerald-400 font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Nilai yang tercetak di RAB & faktur konsumen</span>
                </div>
              </div>

              {/* Live Margin Indicator */}
              {laborUnitPrice > 0 && (
                <div className="mt-2 p-2 rounded bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Proyeksi Margin Jasa:</span>
                  <span className={`font-mono font-bold ${laborUnitPrice >= laborCostPrice ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {laborUnitPrice >= laborCostPrice ? '+ ' : '- '}Rp {Math.abs(laborUnitPrice - laborCostPrice).toLocaleString('id-ID')} ({Math.round(((laborUnitPrice - laborCostPrice) / laborUnitPrice) * 100)}%)
                  </span>
                </div>
              )}

              {laborUnitPrice > 0 && (
                <p className="text-[11px] font-mono text-amber-400">
                  Terbilang Tarif Jual: Rp {laborUnitPrice.toLocaleString('id-ID')} (per 1 unit / lot pekerjaan)
                </p>
              )}

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
                  disabled={!laborForm.name.trim() || (laborUnitPrice <= 0 && (!laborForm.estimatedCost || laborForm.estimatedCost <= 0)) || !isLaborAllocationMatch}
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
                    onSelect={(m) => setNewItem(prev => ({ ...prev, description: m.name, unitPrice: m.unit_price || 0, materialId: m.id }))}
                    placeholder="Cari material gudang..."
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={newItem.description || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewItem(prev => ({ ...prev, description: val }));
                    }}
                    placeholder="e.g. Workshop Bay Overhead"
                    className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="material-qty-input" className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                    {itemMode === 'material' ? 'Qty (Bahan)' : 'FREKWENSI DALAM PROYEK INI'}
                  </label>
                  <input
                    id="material-qty-input"
                    type="text"
                    inputMode="decimal"
                    required
                    min="0"
                    step="any"
                    value={newItem.qty ?? ''}
                    onChange={(e) => {
                      const rawVal = e.target.value;
                      const normalized = rawVal.replace(',', '.');
                      if (normalized === '' || /^[0-9]*\.?[0-9]*$/.test(normalized)) {
                        setNewItem(prev => ({ ...prev, qty: normalized }));
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    onMouseUp={(e) => e.preventDefault()}
                    className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="overhead-bay-rate-input" className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                    {itemMode === 'material' ? 'Harga Satuan Bahan' : 'BAY RATE / FREKWENSI'}
                  </label>
                  <input
                    id="overhead-bay-rate-input"
                    type="text"
                    inputMode="decimal"
                    required
                    min="0"
                    step="any"
                    value={newItem.unitPrice === 0 ? '' : newItem.unitPrice}
                    onChange={(e) => {
                      const rawVal = e.target.value;
                      const normalized = rawVal.replace(',', '.');
                      if (normalized === '' || /^[0-9]*\.?[0-9]*$/.test(normalized)) {
                        const val = parseDecimalValue(normalized);
                        setNewItem(prev => ({ ...prev, unitPrice: val }));
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    onMouseUp={(e) => e.preventDefault()}
                    className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

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
                          {totalQty || 0}
                        </td>
                        {wbsCategories.map((cat) => (
                          <td key={cat.id} className="px-1 py-3 text-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              min="0"
                              step="any"
                              aria-label={`Alokasi Bahan ${cat.label}`}
                              value={manualAllocations[cat.id] ?? ''}
                              onChange={(e) => {
                                const rawVal = e.target.value;
                                const normalized = rawVal.replace(',', '.');
                                if (normalized === '' || /^[0-9]*\.?[0-9]*$/.test(normalized)) {
                                  setManualAllocations(prev => ({ ...prev, [cat.id]: normalized }));
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                              onMouseUp={(e) => e.preventDefault()}
                              className="w-14 mx-auto block bg-background border border-border rounded px-1 py-1 text-center font-mono focus:border-primary focus:outline-none text-xs"
                              placeholder="0"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-3 text-center border-l border-border bg-surface-hover/50">
                          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isAllocationPassed 
                              ? 'bg-status-success/20 text-status-success' 
                              : manualRemaining > 0 
                                ? 'bg-status-danger/20 text-status-danger' 
                                : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {isAllocationPassed ? 'Sesuai / Pas (0.00)' : (manualRemaining > 0 ? `Sisa: ${manualRemaining.toFixed(2)}` : `Lebih: ${Math.abs(manualRemaining).toFixed(2)}`)}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isAllocationPassed || totalQty <= 0}
                className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold py-2 px-4 rounded text-sm transition flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {editingId 
                  ? 'Update Item' 
                  : (itemMode === 'overhead' ? 'Tambah Overhead ke RAB' : 'Tambah Bahan ke RAB')}
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
                      <th className="px-3 py-3 text-left">Sumber / Paket</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">WBS</th>
                      <th className="px-3 py-3 text-right">Qty</th>
                      <th className="px-3 py-3 text-right">Harga Satuan</th>
                      <th className="px-3 py-3 text-right">Harga Modal (HPP)</th>
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
                        {/* Kolom Sumber / Paket */}
                        <td className="px-3 py-3 align-middle">
                          {(() => {
                            const resolvedPackageName =
                              item.package_name ||
                              item.packageName ||
                              (item.packageId ? packages.find(p => p.id === item.packageId)?.name : null) ||
                              (item.notes && item.notes.includes('Paket:')
                                ? item.notes.replace('Bagian dari paket: ', '').replace('Paket: ', '').replace(/^\[+|\]+$/g, '').trim()
                                : null);

                            if (resolvedPackageName) {
                              const cleanName = resolvedPackageName.replace(/^Paket:\s*/i, '').trim();
                              return (
                                <span 
                                  data-testid={`badge-package-${item.id}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-950/70 text-amber-400 border border-amber-800/80 whitespace-nowrap"
                                >
                                  <span>📦</span>
                                  <span>Paket: {cleanName}</span>
                                </span>
                              );
                            }

                            return (
                              <span 
                                data-testid={`badge-granular-${item.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/80 whitespace-nowrap"
                              >
                                <span>📋</span>
                                <span>Granular</span>
                              </span>
                            );
                          })()}
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
                          Rp {(item.costPrice !== undefined ? item.costPrice : item.unitPrice).toLocaleString('id-ID')}
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
                     const catOverhead = catItems.filter(i => i.type === 'overhead').reduce((sum, i) => sum + calculateItemTotal(i), 0);
                     const catTotal = catMat + catLabor + catOverhead;
                     return (
                       <div key={cat.id} className="bg-background/80 p-2 rounded border border-border">
                         <span className="text-text font-bold block truncate text-[11px]" title={cat.label}>
                           {cat.label}
                         </span>
                         <div className="mt-1 flex flex-col text-[10px] font-mono gap-0.5">
                           <span className="text-cyan-400">Material: Rp {catMat.toLocaleString('id-ID')}</span>
                           <span className="text-amber-400">Jasa: Rp {catLabor.toLocaleString('id-ID')}</span>
                           <span className="text-purple-400">Overhead: Rp {catOverhead.toLocaleString('id-ID')}</span>
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
                     {totalEstimatedModalCost.toLocaleString('id-ID')}
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
                        return (totalJual - totalEstimatedModalCost).toLocaleString('id-ID');
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
