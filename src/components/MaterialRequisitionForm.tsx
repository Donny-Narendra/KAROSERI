import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  ChevronsLeft, 
  ChevronsRight, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  X,
  FileText
} from 'lucide-react';
import { normalizeText } from '../utils/rabItemAllocation';
import { ConfirmationModal, type ConfirmationModalVariant } from './ConfirmationModal';

interface MasterMaterial {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  cost_price?: number;
  current_stock: number;
}

interface RabSourceItem {
  id: string; // rab_items id
  materialId?: string | null;
  name: string;
  unit: string;
  unitPrice: number;
  costPrice?: number;
  rabQuantity: number;
  subtotal: number;
  currentStock: number;
}

interface RequisitionItem {
  tempId: string; // unique row id
  sourceRabId?: string | null; // reference to rab_items id if from RAB
  materialId?: string | null;
  material_id?: string | null;
  id?: string;
  name: string;
  material_name?: string;
  unit: string;
  unitPrice: number;
  unit_price?: number;
  costPrice?: number;
  cost_price?: number;
  estimated_price?: number;
  quantity: number;
  subtotal: number;
  wbs_stage?: string;
  isManual?: boolean;
  isPersisted?: boolean; // true if already saved in database
  dbRequisitionItemId?: string; // id in material_requisition_items
  dbRequisitionId?: string; // id in material_requisitions
  status?: string; // 'PENDING' | 'APPROVED' | 'REJECTED'
}

interface ActiveSpkBorongan {
  id: string;
  material_id?: string;
  rab_item_id?: string;
  task_description?: string;
  status: string;
}

interface MaterialRequisitionFormProps {
  spkId: string;
  wbsCategory: string;
  onClose: () => void;
}

const formatCurrency = (val: number | null | undefined): string => {
  if (!val || isNaN(val)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
};

export const MaterialRequisitionForm: React.FC<MaterialRequisitionFormProps> = ({
  spkId,
  wbsCategory,
  onClose
}) => {
  const { user } = useAuth();
  const cleanWbsCategory = wbsCategory.replace(/^WBS\s*\d+:\s*/i, '').trim();

  // Master materials from database
  const [masterMaterials, setMasterMaterials] = useState<MasterMaterial[]>([]);
  const [spkNo, setSpkNo] = useState<string>('');

  // Dual-list states
  const [rawRabItems, setRawRabItems] = useState<RabSourceItem[]>([]);
  const [availableItems, setAvailableItems] = useState<RabSourceItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<RequisitionItem[]>([]);

  // Selection states for transfer
  const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(null);
  const [highlightedTargetId, setHighlightedTargetId] = useState<string | null>(null);

  // Confirmation dialog state for removing / returning item that is persisted in DB
  const [confirmItemToRemove, setConfirmItemToRemove] = useState<RequisitionItem | null>(null);

  // Notification / Alert modal state
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    variant?: ConfirmationModalVariant;
    onConfirm?: () => void;
  } | null>(null);

  // Form states
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    setFetching(true);
    setErrorMessage(null);
    try {
      // 1. Fetch SPK Details
      const { data: spkData } = await supabase
        .from('spk')
        .select('spk_no')
        .eq('id', spkId)
        .maybeSingle();
      if (spkData) setSpkNo(spkData.spk_no);

      // 2. Fetch Master Materials
      const { data: matData, error: matError } = await supabase
        .from('materials')
        .select('id, name, unit, unit_price, current_stock')
        .order('name');
      if (matError) throw matError;
      
      const loadedMaster: MasterMaterial[] = (matData || []).map(m => ({
        id: m.id,
        name: m.name,
        unit: m.unit || 'pcs',
        unit_price: Number(m.unit_price || 0),
        current_stock: Number(m.current_stock || 0)
      }));
      setMasterMaterials(loadedMaster);

      // 3. Fetch RAB Estimation & Items for this SPK and WBS Category
      let sourceList: RabSourceItem[] = [];
      const { data: rabEst, error: estError } = await supabase
        .from('rab_estimations')
        .select('id')
        .eq('spk_id', spkId)
        .maybeSingle();

      if (estError) throw estError;

      if (rabEst) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('rab_items')
          .select(`
            id,
            quantity,
            wbs_category,
            description,
            item_total,
            material_id,
            materials (
              id,
              name,
              unit,
              unit_price,
              current_stock
            )
          `)
          .eq('rab_estimation_id', rabEst.id);

        if (itemsError) throw itemsError;

        if (itemsData) {
          // Filter tolerantly for WBS category
          const filtered = itemsData.filter((item: any) => {
            if (!item.wbs_category) return true;
            const itemCatClean = item.wbs_category.replace(/^WBS\s*\d+:\s*/i, '').trim().toLowerCase();
            return (
              itemCatClean === cleanWbsCategory.toLowerCase() ||
              item.wbs_category.toLowerCase() === wbsCategory.toLowerCase()
            );
          });

          // Map to RabSourceItem
          sourceList = filtered.map((item: any) => {
            const rawMat = item.materials;
            let matchedMat = rawMat;
            
            // If rawMat is null or missing id, match by description or material_id in master
            if (!matchedMat && item.material_id) {
              matchedMat = loadedMaster.find(m => m.id === item.material_id);
            }
            if (!matchedMat && item.description) {
              const cleanDesc = normalizeText(item.description);
              matchedMat = loadedMaster.find(m => normalizeText(m.name) === cleanDesc);
            }

            // CRITICAL FIX: NEVER fallback to item.id (which is rab_items.id)!
            const materialId = matchedMat?.id || item.material_id || null;
            const name = matchedMat?.name || item.description || 'Material Tanpa Nama';
            const unit = matchedMat?.unit || 'pcs';
            const qty = Number(item.quantity || 0);

            // Determine unit price with multi-layer fallback (master unit_price -> rab item_total / qty)
            let unitPrice = Number(matchedMat?.unit_price || 0);
            if (unitPrice === 0 && item.item_total && qty > 0) {
              unitPrice = Number(item.item_total) / qty;
            } else if (unitPrice === 0 && item.item_total) {
              unitPrice = Number(item.item_total);
            }

            const calculatedSubtotal = item.item_total ? Number(item.item_total) : (qty * unitPrice);

            return {
              id: item.id,
              materialId,
              name,
              unit,
              unitPrice,
              rabQuantity: qty,
              subtotal: calculatedSubtotal,
              currentStock: matchedMat ? Number(matchedMat.current_stock || 0) : 0
            };
          });

          setRawRabItems(sourceList);
        }
      }

      // 4. Fetch Active SPK Borongan Assignments for this SPK and WBS (Exclusion List)
      let matchingBorong: ActiveSpkBorongan[] = [];
      try {
        const { data: spkBData, error: spkBError } = await supabase
          .from('spk_borongan')
          .select('*')
          .eq('spk_id', spkId)
          .neq('status', 'CUT_OFF');

        if (spkBError) {
          console.error('Error fetching spk_borongan for exclusion:', spkBError);
        } else if (spkBData) {
          matchingBorong = (spkBData as any[]).filter((borong) => {
            if (!borong.wbs_category) return true;
            const bCat = borong.wbs_category.replace(/^WBS\s*\d+:\s*/i, '').trim().toLowerCase();
            return (
              bCat === cleanWbsCategory.toLowerCase() ||
              borong.wbs_category.toLowerCase() === wbsCategory.toLowerCase()
            );
          });
        }
      } catch (spkBErr) {
        console.error('Error loading spk_borongan for exclusion:', spkBErr);
      }

      // 5. Fetch Existing Requisitions for this SPK and WBS (Exclusion & Hydration)
      const persistedItems: RequisitionItem[] = [];
      try {
        const { data: reqData, error: reqError } = await supabase
          .from('material_requisitions')
          .select(`
            id,
            wbs_category,
            status,
            notes,
            created_at,
            material_requisition_items (
              id,
              material_id,
              rab_item_id,
              material_name,
              quantity,
              unit,
              unit_price,
              subtotal,
              wbs_stage,
              materials (
                id,
                name,
                unit,
                unit_price,
                current_stock
              )
            )
          `)
          .eq('spk_id', spkId)
          .neq('status', 'CANCELLED')
          .neq('status', 'REJECTED');

        if (reqError) {
          console.error('Error fetching material requisitions for exclusion:', reqError);
          setErrorMessage(`Gagal mengambil data permintaan material aktif: ${reqError.message}`);
        } else if (reqData) {
          reqData.forEach((req: any) => {
            const reqCat = (req.wbs_category || '').replace(/^WBS\s*\d+:\s*/i, '').trim().toLowerCase();
            const isMatchingWbs = 
              !req.wbs_category || 
              reqCat === cleanWbsCategory.toLowerCase() || 
              req.wbs_category.toLowerCase() === wbsCategory.toLowerCase() ||
              normalizeText(reqCat) === normalizeText(cleanWbsCategory);

            if (isMatchingWbs && req.material_requisition_items) {
              req.material_requisition_items.forEach((item: any) => {
                const cleanItemName = (item.material_name || item.materials?.name || '').trim();
                const normItemName = normalizeText(cleanItemName);

                // Check if this requisition item matches a RAB item from sourceList
                const matchedRab = sourceList.find(r => 
                  (item.rab_item_id && r.id === item.rab_item_id) ||
                  (normItemName && normalizeText(r.name) === normItemName)
                );

                // Check if item matches master materials table
                const matchedMaster = loadedMaster.find(m => 
                  (item.material_id && m.id === item.material_id) ||
                  (normItemName && normalizeText(m.name) === normItemName)
                );

                const isFromRab = Boolean(matchedRab || item.rab_item_id);
                const sourceRabId = matchedRab?.id || item.rab_item_id || null;
                const materialId = item.material_id || item.materials?.id || matchedMaster?.id || matchedRab?.materialId || null;
                const name = cleanItemName || matchedRab?.name || matchedMaster?.name || 'Material Tanpa Nama';
                const unit = item.unit || item.materials?.unit || matchedRab?.unit || matchedMaster?.unit || 'pcs';
                const qty = Number(item.quantity || (matchedRab?.rabQuantity ?? 1));

                // Calculate price and subtotal
                let unitPrice = Number(item.unit_price ?? item.materials?.unit_price ?? 0);
                if (unitPrice === 0 && matchedRab) {
                  unitPrice = matchedRab.unitPrice || (matchedRab.rabQuantity > 0 ? matchedRab.subtotal / matchedRab.rabQuantity : 0);
                }
                if (unitPrice === 0 && matchedMaster) {
                  unitPrice = matchedMaster.unit_price;
                }

                let subtotal = Number(item.subtotal) || (qty * unitPrice);
                if (subtotal === 0 && matchedRab && matchedRab.subtotal > 0) {
                  subtotal = matchedRab.subtotal;
                  if (qty > 0 && unitPrice === 0) {
                    unitPrice = subtotal / qty;
                  }
                }

                persistedItems.push({
                  tempId: `persisted-${item.id}`,
                  sourceRabId,
                  materialId,
                  material_id: materialId,
                  name,
                  material_name: name,
                  unit,
                  unitPrice,
                  unit_price: unitPrice,
                  estimated_price: unitPrice,
                  quantity: qty,
                  subtotal,
                  wbs_stage: item.wbs_stage || cleanWbsCategory,
                  isManual: !isFromRab,
                  isPersisted: true,
                  dbRequisitionItemId: item.id,
                  dbRequisitionId: req.id,
                  status: req.status || 'PENDING'
                });
              });
            }
          });
        }
      } catch (reqErr) {
        console.error('Error loading requisitions for exclusion:', reqErr);
      }

      // 6. Calculate initial available RAB items
      // Items are excluded if already persisted in a requisition for this WBS,
      // or already assigned in active SPK Borongan.
      const persistedRabIds = new Set(
        persistedItems
          .map(p => p.sourceRabId)
          .filter((id): id is string => Boolean(id))
      );

      const initialAvailable = sourceList.filter(item => {
        // Exclude if already in a saved requisition
        if (persistedRabIds.has(item.id)) return false;

        // Exclude if allocated in active SPK Borongan
        const isBorong = matchingBorong.some(b => {
          const status = (b.status || '').toUpperCase();
          if (status === 'CUT_OFF' || status === 'CANCELLED') return false;
          if (b.rab_item_id && b.rab_item_id === item.id) return true;
          const bDesc = normalizeText(b.task_description);
          const rName = normalizeText(item.name);
          return bDesc && rName && bDesc === rName;
        });
        if (isBorong) return false;

        return true;
      });

      setSelectedItems(persistedItems);
      setAvailableItems(initialAvailable);
    } catch (err: any) {
      console.error('Error loading requisition data:', err);
      setErrorMessage(err.message || 'Gagal memuat data alokasi RAB');
    } finally {
      setFetching(false);
    }
  }, [cleanWbsCategory, spkId, wbsCategory]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Transfer Handlers (Single-item isolated transfer: Right to Left)
  const handleMoveToRequisition = (sourceIdToMove?: string) => {
    const targetId = sourceIdToMove || highlightedSourceId;
    if (!targetId) return;

    const sourceItem = availableItems.find(item => item.id === targetId);
    if (!sourceItem) return;

    // Add to left list (selectedItems)
    const newRequisitionItem: RequisitionItem = {
      tempId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sourceRabId: sourceItem.id,
      materialId: sourceItem.materialId || null,
      material_id: sourceItem.materialId || null,
      name: sourceItem.name,
      material_name: sourceItem.name,
      unit: sourceItem.unit,
      unitPrice: sourceItem.unitPrice,
      unit_price: sourceItem.unitPrice,
      estimated_price: sourceItem.unitPrice,
      quantity: sourceItem.rabQuantity > 0 ? sourceItem.rabQuantity : 1,
      subtotal: sourceItem.subtotal,
      wbs_stage: cleanWbsCategory,
      isManual: false,
      isPersisted: false
    };

    setSelectedItems(prev => [...prev, newRequisitionItem]);
    // Remove ONLY the selected item from availableItems on the right
    setAvailableItems(prev => prev.filter(item => item.id !== sourceItem.id));
    setHighlightedSourceId(null);
    setHighlightedTargetId(newRequisitionItem.tempId);
  };

  // Direct return / remove for unpersisted items (newly transferred or manual)
  const handleReturnItem = (itemToRemove: RequisitionItem) => {
    // 1. If it originated from RAB, return it to availableItems on the right
    if (itemToRemove.sourceRabId) {
      const orig = rawRabItems.find(r => r.id === itemToRemove.sourceRabId);
      if (orig) {
        setAvailableItems(prev => {
          if (prev.some(r => r.id === orig.id)) return prev;
          return [...prev, orig];
        });
      }
    }

    // 2. Remove from selectedItems on the left
    setSelectedItems(prev => prev.filter(i => i.tempId !== itemToRemove.tempId));
    if (highlightedTargetId === itemToRemove.tempId) {
      setHighlightedTargetId(null);
    }
  };

  // Trigger confirmation dialog for removing / returning item that is persisted in DB
  const handlePromptRemove = (item: RequisitionItem) => {
    setConfirmItemToRemove(item);
  };

  // Return highlighted item (tombol >>)
  const handleReturnHighlighted = () => {
    if (!highlightedTargetId) return;
    const item = selectedItems.find(i => i.tempId === highlightedTargetId);
    if (!item) return;

    if (item.isPersisted) {
      handlePromptRemove(item);
    } else {
      handleReturnItem(item);
    }
  };

  // Execute Removal after Confirmation (for persisted items)
  const handleExecuteRemove = async (itemToCancel: RequisitionItem) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. If item is persisted in database, delete record from Supabase
      if (itemToCancel.isPersisted && itemToCancel.dbRequisitionItemId) {
        const { error: delItemErr } = await supabase
          .from('material_requisition_items')
          .delete()
          .eq('id', itemToCancel.dbRequisitionItemId);

        if (delItemErr) throw delItemErr;

        // If parent requisition has no other items left, delete the requisition header
        if (itemToCancel.dbRequisitionId) {
          const { data: remainingItems } = await supabase
            .from('material_requisition_items')
            .select('id')
            .eq('requisition_id', itemToCancel.dbRequisitionId);

          if (!remainingItems || remainingItems.length === 0) {
            await supabase
              .from('material_requisitions')
              .delete()
              .eq('id', itemToCancel.dbRequisitionId);
          }
        }
      }

      // 2. If it originated from RAB, restore to availableItems on the right
      if (itemToCancel.sourceRabId) {
        const orig = rawRabItems.find(r => r.id === itemToCancel.sourceRabId);
        if (orig) {
          setAvailableItems(prev => {
            if (prev.some(r => r.id === orig.id)) return prev;
            return [...prev, orig];
          });
        }
      }

      // 3. Remove from selectedItems state
      setSelectedItems((prev) => prev.filter((i) => i.tempId !== itemToCancel.tempId));
      if (highlightedTargetId === itemToCancel.tempId) {
        setHighlightedTargetId(null);
      }
      setConfirmItemToRemove(null);
    } catch (err: any) {
      console.error('Error removing requisition item:', err);
      setErrorMessage(err.message || 'Gagal membatalkan item permintaan material.');
    } finally {
      setLoading(false);
    }
  };

  // Add Manual Item (Extra Requisition)
  const handleAddManualItem = () => {
    const newItem: RequisitionItem = {
      tempId: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      materialId: '',
      name: '',
      unit: 'pcs',
      unitPrice: 0,
      quantity: 1,
      subtotal: 0,
      isManual: true
    };
    setSelectedItems(prev => [...prev, newItem]);
    setHighlightedTargetId(newItem.tempId);
  };

  // Handle Manual Material Dropdown Selection
  const handleManualMaterialSelect = (tempId: string, materialId: string) => {
    const selectedMat = masterMaterials.find(m => m.id === materialId);
    if (!selectedMat) return;

    setSelectedItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      const subtotal = item.quantity * selectedMat.unit_price;
      return {
        ...item,
        materialId: selectedMat.id,
        material_id: selectedMat.id,
        name: selectedMat.name,
        material_name: selectedMat.name,
        unit: selectedMat.unit,
        unitPrice: selectedMat.unit_price,
        unit_price: selectedMat.unit_price,
        estimated_price: selectedMat.unit_price,
        subtotal,
        wbs_stage: cleanWbsCategory
      };
    }));
  };

  // Update Quantity in Selected List
  const handleQuantityChange = (tempId: string, newQty: number) => {
    const validQty = isNaN(newQty) || newQty < 0 ? 0 : newQty;
    setSelectedItems(prev => prev.map(item => {
      if (item.tempId !== tempId || item.isPersisted) return item;
      const unitPrice = item.unitPrice || item.unit_price || item.estimated_price || 0;
      return {
        ...item,
        quantity: validQty,
        subtotal: validQty * unitPrice
      };
    }));
  };

  // Calculate Total Requisition Cost
  const totalRequisitionCost = useMemo(() => {
    return selectedItems.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  }, [selectedItems]);

  // Count unpersisted new items
  const newItemsCount = useMemo(() => {
    return selectedItems.filter(i => !i.isPersisted).length;
  }, [selectedItems]);

  // Submit Requisition (only new unpersisted items)
  const handleSubmitRequisition = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      setNotification({
        title: 'Sesi Tidak Valid',
        message: 'Sesi pengguna tidak valid. Silakan login kembali.',
        variant: 'warning'
      });
      return;
    }

    // Only process new unpersisted items
    const newItems = selectedItems.filter(item => !item.isPersisted);
    if (newItems.length === 0) {
      setNotification({
        title: 'Tidak Ada Item Baru',
        message: 'Semua item dalam daftar permintaan sudah diajukan ke gudang.',
        variant: 'info'
      });
      return;
    }

    // Validation: Require at least 1 new item with quantity > 0
    const validItems = newItems.filter(item => (item.materialId || item.material_id || (item.name && item.name.trim())) && item.quantity > 0);
    if (validItems.length === 0) {
      setNotification({
        title: 'Validasi Kuantitas',
        message: 'Harap pilih minimal 1 material dengan kuantitas lebih dari 0.',
        variant: 'warning'
      });
      return;
    }

    // Check if any manual item has not selected a material and has no name
    const unselectedManual = validItems.find(item => item.isManual && !item.materialId && !item.material_id && !item.name.trim());
    if (unselectedManual) {
      setNotification({
        title: 'Material Belum Dipilih',
        message: 'Terdapat item ekstra manual yang belum dipilih materialnya. Silakan pilih material dari daftar atau hapus item tersebut.',
        variant: 'warning'
      });
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Insert Material Requisition Header for new items
      const { data: reqData, error: reqError } = await supabase
        .from('material_requisitions')
        .insert({
          spk_id: spkId,
          wbs_category: cleanWbsCategory,
          requested_by: user.id,
          notes: notes.trim() || null,
          status: 'PENDING'
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // 2. Insert Material Requisition Items with snapshot prices and WBS stage
      const itemsToInsert = validItems.map(item => {
        let resolvedMaterialId = item.material_id || item.materialId || item.id || null;
        const itemName = item.material_name || item.name || 'Material Tanpa Nama';

        // Check if resolvedMaterialId is a valid master material ID
        if (resolvedMaterialId && !masterMaterials.some(m => m.id === resolvedMaterialId)) {
          const foundById = masterMaterials.find(m => m.id === resolvedMaterialId);
          if (!foundById) resolvedMaterialId = null;
        }

        // Lenient name resolution against master catalog
        if (!resolvedMaterialId && itemName) {
          const norm = normalizeText(itemName);
          const found = masterMaterials.find(m => normalizeText(m.name) === norm);
          if (found) {
            resolvedMaterialId = found.id;
          }
        }

        const unitPrice = Number(item.estimated_price || item.unit_price || item.unitPrice || 0);
        const matchedMat = masterMaterials.find(m => m.id === resolvedMaterialId);
        const costPrice = Number(item.cost_price || item.costPrice || (matchedMat?.cost_price !== undefined ? matchedMat.cost_price : Math.round(unitPrice * 0.8)));
        const quantity = Number(item.quantity) || 1;
        const subtotal = Number(item.subtotal) || (quantity * unitPrice);
        const wbsStage = item.wbs_stage || cleanWbsCategory;

        return {
          requisition_id: reqData.id,
          material_id: resolvedMaterialId,
          rab_item_id: item.sourceRabId || null,
          material_name: itemName,
          quantity,
          unit: item.unit || 'pcs',
          unit_price: unitPrice,
          cost_price: costPrice,
          subtotal,
          wbs_stage: wbsStage
        };
      });

      const { error: itemsError } = await supabase
        .from('material_requisition_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      setNotification({
        title: 'Permintaan Berhasil Diajukan',
        message: `Permintaan material untuk ${cleanWbsCategory} (${validItems.length} item baru) berhasil diajukan dengan status PENDING.`,
        variant: 'success',
        onConfirm: onClose
      });
    } catch (error: any) {
      console.error('Error submitting requisition:', error);
      setErrorMessage(error.message || 'Gagal mengajukan permintaan material.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 z-50">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex justify-between items-center bg-surface">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-display font-bold text-text">
                  Minta Material (Requisition)
                </h2>
                {spkNo && (
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-primary/20 text-primary border border-primary/30">
                    {spkNo}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                Tahapan WBS: <strong className="text-text font-semibold">{cleanWbsCategory}</strong>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-text-muted hover:text-text hover:bg-background rounded-lg transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-background/50">
          
          {errorMessage && (
            <div className="p-3 bg-status-danger/10 border border-status-danger/30 rounded-lg flex items-center gap-2 text-status-danger text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {fetching ? (
            <div className="py-16 text-center text-text-muted">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
              <p className="text-sm">Memuat alokasi material RAB untuk {cleanWbsCategory}...</p>
            </div>
          ) : (
            <>
              {/* Dual-List Grid Container: 3 Kolom Bersebelahan pada Tablet (md:) & Desktop */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch">
                
                {/* 1. KOLOM 1 (Kiri): Daftar Permintaan Material Siap Submit (5 Kolom) */}
                <div className="md:col-span-5 flex flex-col h-[420px] md:h-[460px] rounded-xl border border-emerald-500/30 bg-surface/90 overflow-hidden shadow-sm">
                  {/* Header Kotak Kiri */}
                  <div className="p-3 sm:p-3.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
                      <h3 className="text-sm font-bold text-emerald-400 truncate">
                        Daftar Permintaan Material
                      </h3>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
                        {selectedItems.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddManualItem}
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center gap-1 transition-colors shrink-0 shadow-sm"
                      title="Tambah material ekstra di luar RAB"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  {/* List Content Kotak Kiri - Scrollable Mandiri */}
                  <div className="p-2 sm:p-3 flex-1 overflow-y-auto space-y-2">
                    {selectedItems.length === 0 ? (
                      <div className="h-full border-2 border-dashed border-emerald-500/20 rounded-lg flex flex-col items-center justify-center p-4 text-center text-text-muted">
                        <Package className="w-8 h-8 text-emerald-500/30 mb-2" />
                        <p className="text-xs sm:text-sm font-medium text-text">Belum ada material yang diminta</p>
                        <p className="text-[11px] text-text-muted mt-1 max-w-xs">
                          Pilih item dari kotak kanan lalu klik tombol <strong className="text-emerald-400">&quot;&lt;&lt;&quot;</strong>, atau klik <strong className="text-emerald-400">&quot;+ Add Item&quot;</strong> untuk material tambahan.
                        </p>
                      </div>
                    ) : (
                      selectedItems.map((item) => {
                        const isHighlighted = highlightedTargetId === item.tempId;
                        return (
                          <div
                            key={item.tempId}
                            onClick={() => setHighlightedTargetId(item.tempId)}
                            onDoubleClick={() => {
                              if (item.isPersisted) {
                                handlePromptRemove(item);
                              } else {
                                handleReturnItem(item);
                              }
                            }}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              isHighlighted
                                ? 'border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/40'
                                : 'border-border/80 bg-background/80 hover:border-emerald-500/40 hover:bg-emerald-500/5'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {!item.isPersisted && item.isManual && (!item.name || !item.name.trim()) ? (
                                  <div>
                                    <label className="block text-[11px] text-emerald-400 mb-1 font-semibold">
                                      Pilih Material Ekstra:
                                    </label>
                                    <select
                                      value={item.materialId || ''}
                                      onChange={(e) => handleManualMaterialSelect(item.tempId, e.target.value)}
                                      className="w-full p-1.5 bg-surface border border-border rounded text-xs text-text focus:border-emerald-500 focus:outline-none"
                                      autoFocus
                                    >
                                      <option value="">-- Pilih dari Master Material --</option>
                                      {masterMaterials.map(m => (
                                        <option key={m.id} value={m.id}>
                                          {m.name} (Stok: {m.current_stock} {m.unit})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-xs sm:text-sm text-text break-words">
                                        {item.name || 'Material Tanpa Nama'}
                                      </span>
                                      {item.isPersisted ? (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                          {item.status === 'APPROVED' ? 'DISETUJUI' : 'TERCATAT'}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                          BARU
                                        </span>
                                      )}
                                      {!item.isManual || item.sourceRabId ? (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                                          RAB
                                        </span>
                                      ) : (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold border border-primary/30">
                                          Ekstra
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-text-muted mt-0.5">
                                      Estimasi: <span className="font-mono font-medium text-emerald-400">{formatCurrency(item.subtotal)}</span>
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Quantity Input & Remove Button */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className={`flex items-center gap-1 bg-surface border border-border px-1.5 py-0.5 rounded ${
                                  item.isPersisted ? 'bg-surface/50 border-border/50' : ''
                                }`}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={item.quantity}
                                    disabled={item.isPersisted}
                                    onChange={(e) => handleQuantityChange(item.tempId, parseFloat(e.target.value))}
                                    className={`w-14 bg-transparent text-right font-mono font-bold text-xs text-text focus:outline-none ${
                                      item.isPersisted ? 'text-text-muted cursor-not-allowed' : ''
                                    }`}
                                    title={item.isPersisted ? 'Kuantitas material yang sudah diajukan' : 'Ubah kuantitas'}
                                  />
                                  <span className="text-[11px] text-text-muted">
                                    {item.unit}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.isPersisted) {
                                      handlePromptRemove(item);
                                    } else {
                                      handleReturnItem(item);
                                    }
                                  }}
                                  className="p-1 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                  title={item.isPersisted ? 'Batalkan permintaan material ini' : (item.isManual ? 'Hapus item' : 'Kembalikan ke Alokasi RAB')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer Kotak Kiri: Subtotal Permintaan */}
                  <div className="p-2.5 sm:p-3 bg-emerald-500/5 border-t border-emerald-500/20 flex justify-between items-center text-xs shrink-0">
                    <span className="text-text-muted">Total Estimasi Material:</span>
                    <span className="font-bold font-mono text-emerald-400 text-sm">
                      {formatCurrency(totalRequisitionCost)}
                    </span>
                  </div>
                </div>

                {/* 2. KOLOM 2 (Tengah): PANEL TOMBOL KONTROL TRANSFER (2 Kolom) */}
                <div className="md:col-span-2 flex md:flex-col items-center justify-center gap-3 py-2 self-center">
                  <button
                    type="button"
                    onClick={() => handleMoveToRequisition()}
                    disabled={!highlightedSourceId || !availableItems.some(i => i.id === highlightedSourceId)}
                    className="flex-1 md:flex-none w-full md:w-auto p-2.5 md:p-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
                    title="Pindahkan item yang disorot ke Daftar Permintaan (<<)"
                  >
                    <ChevronsLeft className="w-5 h-5 hidden md:block" />
                    <span className="text-xs font-bold md:hidden flex items-center gap-1">
                      <ChevronsLeft className="w-4 h-4" /> Ambil (&lt;&lt;)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReturnHighlighted}
                    disabled={!highlightedTargetId}
                    className="flex-1 md:flex-none w-full md:w-auto p-2.5 md:p-3.5 bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
                    title="Kembalikan item yang disorot ke Daftar RAB (>>)"
                  >
                    <ChevronsRight className="w-5 h-5 hidden md:block" />
                    <span className="text-xs font-bold md:hidden flex items-center gap-1">
                      Kembalikan (&gt;&gt;) <ChevronsRight className="w-4 h-4" />
                    </span>
                  </button>
                </div>

                {/* 3. KOLOM 3 (Kanan): Alokasi Material RAB WBS Terkait (5 Kolom) */}
                <div className="md:col-span-5 flex flex-col h-[420px] md:h-[460px] rounded-xl border border-rose-500/30 bg-surface/90 overflow-hidden shadow-sm">
                  {/* Header Kotak Kanan */}
                  <div className="p-3 sm:p-3.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></div>
                      <h3 className="text-sm font-bold text-rose-400 truncate">
                        Alokasi RAB (WBS Terkait)
                      </h3>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-semibold">
                        {availableItems.length}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-muted hidden sm:inline">
                      Double-click untuk transfer
                    </span>
                  </div>

                  {/* List Content Kotak Kanan - Scrollable Mandiri */}
                  <div className="p-2 sm:p-3 flex-1 overflow-y-auto space-y-2">
                    {availableItems.length === 0 ? (
                      <div className="h-full border-2 border-dashed border-rose-500/20 rounded-lg flex flex-col items-center justify-center p-4 text-center text-text-muted">
                        <CheckCircle2 className="w-8 h-8 text-rose-500/30 mb-2" />
                        <p className="text-xs sm:text-sm font-medium text-text">
                          Semua material telah dipindahkan
                        </p>
                        <p className="text-[11px] text-text-muted mt-1 max-w-xs">
                          Seluruh item RAB untuk tahapan WBS ini sudah berada di daftar permintaan atau sedang ditugaskan di SPK Borongan.
                        </p>
                      </div>
                    ) : (
                      availableItems.map((item) => {
                        const isHighlighted = highlightedSourceId === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setHighlightedSourceId(item.id)}
                            onDoubleClick={() => handleMoveToRequisition(item.id)}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              isHighlighted
                                ? 'border-rose-500 bg-rose-500/15 ring-1 ring-rose-500/40'
                                : 'border-border/80 bg-background/80 hover:border-rose-500/40 hover:bg-rose-500/5'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-xs sm:text-sm text-text break-words">
                                  {item.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-muted">
                                  <span>Stok: {item.currentStock} {item.unit}</span>
                                  {item.unitPrice > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>@ {formatCurrency(item.unitPrice)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="inline-block px-2 py-0.5 rounded bg-surface border border-border text-xs font-mono font-bold text-primary">
                                  {item.rabQuantity} <span className="font-normal text-[10px] text-text-muted">{item.unit}</span>
                                </div>
                                <p className="text-xs font-semibold font-mono text-rose-400 mt-0.5">
                                  {formatCurrency(item.subtotal)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer Kotak Kanan */}
                  <div className="p-2.5 sm:p-3 bg-rose-500/5 border-t border-rose-500/20 flex justify-between items-center text-xs text-text-muted shrink-0">
                    <span>Sisa Material di RAB:</span>
                    <span className="font-semibold text-text">
                      {availableItems.length} item tersisa
                    </span>
                  </div>
                </div>

              </div>

              {/* Notes Input Area */}
              <div className="bg-surface/60 border border-border rounded-xl p-3 sm:p-4 space-y-2">
                <label className="block text-xs font-semibold text-text flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>Catatan Permintaan Mandor (Opsional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-background border border-border rounded-lg text-xs sm:text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary h-20 resize-none"
                  placeholder="Contoh: Pengambilan batch 1 pengerjaan sasis, harap disiapkan segera..."
                />
              </div>
            </>
          )}

        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 bg-surface">
          <div className="text-xs text-text-muted hidden sm:block">
            {newItemsCount > 0 ? (
              <span>
                Siap mengajukan <strong className="text-emerald-400">{newItemsCount} item material baru</strong> ke petugas gudang
                {selectedItems.length > newItemsCount && ` (${selectedItems.length - newItemsCount} item sudah tercatat)`}.
              </span>
            ) : selectedItems.length > 0 ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Semua {selectedItems.length} item material untuk tahapan ini sudah tercatat di sistem gudang.
              </span>
            ) : (
              <span>Pindahkan minimal 1 material untuk mengajukan permintaan.</span>
            )}
          </div>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 sm:flex-none px-4 py-2 bg-surface border border-border text-text rounded-lg text-sm hover:bg-background transition-colors font-medium"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSubmitRequisition}
              disabled={loading || newItemsCount === 0 || fetching}
              className="flex-1 sm:flex-none px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Mengajukan...</span>
                </>
              ) : newItemsCount > 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Requisition ({newItemsCount} baru)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Semua Item Diajukan</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Reusable ConfirmationModal for removing / returning item */}
      <ConfirmationModal
        isOpen={!!confirmItemToRemove}
        title="Konfirmasi Pembatalan Material"
        message={
          confirmItemToRemove
            ? `Apakah Anda yakin ingin membatalkan permintaan material "${confirmItemToRemove.name}"? Material akan dikembalikan ke daftar Alokasi RAB.`
            : ''
        }
        confirmText="Ya, Kembalikan"
        cancelText="Batal"
        variant="danger"
        isLoading={loading}
        onConfirm={() => {
          if (confirmItemToRemove) {
            handleExecuteRemove(confirmItemToRemove);
          }
        }}
        onCancel={() => {
          if (!loading) setConfirmItemToRemove(null);
        }}
      >
        {confirmItemToRemove?.isPersisted && (
          <p className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20 font-medium">
            Item ini telah tercatat di Supabase ({confirmItemToRemove.status || 'PENDING'}). Konfirmasi akan menghapus data dari daftar permintaan aktif.
          </p>
        )}
      </ConfirmationModal>

      {/* Reusable Notification / Alert Modal */}
      <ConfirmationModal
        isOpen={!!notification}
        title={notification?.title || 'Pemberitahuan'}
        message={notification?.message || ''}
        confirmText="OK"
        variant={notification?.variant || 'info'}
        hideCancel={true}
        onConfirm={() => {
          const action = notification?.onConfirm;
          setNotification(null);
          if (action) action();
        }}
        onCancel={() => {
          const action = notification?.onConfirm;
          setNotification(null);
          if (action) action();
        }}
      />
    </div>
  );
};
