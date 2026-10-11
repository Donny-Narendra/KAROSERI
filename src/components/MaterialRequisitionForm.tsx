import React, { useState, useEffect, useMemo } from 'react';
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

interface MasterMaterial {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  current_stock: number;
}

interface RabSourceItem {
  id: string; // rab_items id
  materialId: string;
  name: string;
  unit: string;
  unitPrice: number;
  rabQuantity: number;
  subtotal: number;
  currentStock: number;
}

interface RequisitionItem {
  tempId: string; // unique row id
  sourceRabId?: string; // reference to rab_items id if from RAB
  materialId: string;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  isManual?: boolean;
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
  const [availableItems, setAvailableItems] = useState<RabSourceItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<RequisitionItem[]>([]);

  // Selection states for transfer
  const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(null);
  const [highlightedTargetId, setHighlightedTargetId] = useState<string | null>(null);

  // Form states
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [spkId, wbsCategory]);

  const loadInitialData = async () => {
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

      // 3. Fetch RAB Estimation for this SPK
      const { data: rabEst, error: estError } = await supabase
        .from('rab_estimations')
        .select('id')
        .eq('spk_id', spkId)
        .maybeSingle();

      if (estError) throw estError;

      if (rabEst) {
        // 4. Fetch RAB Items matching WBS category
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
          const sourceList: RabSourceItem[] = filtered.map((item: any) => {
            const rawMat = item.materials;
            let matchedMat = rawMat;
            
            // If rawMat is null or missing id, match by description or material_id in master
            if (!matchedMat && item.material_id) {
              matchedMat = loadedMaster.find(m => m.id === item.material_id);
            }
            if (!matchedMat && item.description) {
              matchedMat = loadedMaster.find(m => m.name.toLowerCase() === item.description.toLowerCase());
            }

            const materialId = matchedMat?.id || item.material_id || item.id;
            const name = matchedMat?.name || item.description || 'Material Tanpa Nama';
            const unit = matchedMat?.unit || 'pcs';
            const unitPrice = Number(matchedMat?.unit_price || 0);
            const qty = Number(item.quantity || 0);
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

          setAvailableItems(sourceList);
        }
      }
    } catch (err: any) {
      console.error('Error loading requisition data:', err);
      setErrorMessage(err.message || 'Gagal memuat data alokasi RAB');
    } finally {
      setFetching(false);
    }
  };

  // Transfer Handlers
  const handleMoveToRequisition = (sourceIdToMove?: string) => {
    const targetId = sourceIdToMove || highlightedSourceId;
    if (!targetId) return;

    const sourceItem = availableItems.find(item => item.id === targetId);
    if (!sourceItem) return;

    // Remove from available items
    setAvailableItems(prev => prev.filter(item => item.id !== targetId));

    // Add to selected items
    const newRequisitionItem: RequisitionItem = {
      tempId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sourceRabId: sourceItem.id,
      materialId: sourceItem.materialId,
      name: sourceItem.name,
      unit: sourceItem.unit,
      unitPrice: sourceItem.unitPrice,
      quantity: sourceItem.rabQuantity > 0 ? sourceItem.rabQuantity : 1,
      subtotal: sourceItem.subtotal,
      isManual: false
    };

    setSelectedItems(prev => [...prev, newRequisitionItem]);
    setHighlightedSourceId(null);
    setHighlightedTargetId(newRequisitionItem.tempId);
  };

  const handleMoveBackToAvailable = (targetIdToMove?: string) => {
    const targetId = targetIdToMove || highlightedTargetId;
    if (!targetId) return;

    const selectedItem = selectedItems.find(item => item.tempId === targetId);
    if (!selectedItem) return;

    // Remove from selected items
    setSelectedItems(prev => prev.filter(item => item.tempId !== targetId));

    // If item originated from RAB, restore back to available list
    if (selectedItem.sourceRabId) {
      const restoredItem: RabSourceItem = {
        id: selectedItem.sourceRabId,
        materialId: selectedItem.materialId,
        name: selectedItem.name,
        unit: selectedItem.unit,
        unitPrice: selectedItem.unitPrice,
        rabQuantity: selectedItem.quantity,
        subtotal: selectedItem.quantity * selectedItem.unitPrice,
        currentStock: masterMaterials.find(m => m.id === selectedItem.materialId)?.current_stock || 0
      };

      setAvailableItems(prev => [...prev, restoredItem]);
    }

    setHighlightedTargetId(null);
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
        name: selectedMat.name,
        unit: selectedMat.unit,
        unitPrice: selectedMat.unit_price,
        subtotal
      };
    }));
  };

  // Update Quantity in Selected List
  const handleQuantityChange = (tempId: string, newQty: number) => {
    const validQty = isNaN(newQty) || newQty < 0 ? 0 : newQty;
    setSelectedItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      return {
        ...item,
        quantity: validQty,
        subtotal: validQty * item.unitPrice
      };
    }));
  };

  // Calculate Total Requisition Cost
  const totalRequisitionCost = useMemo(() => {
    return selectedItems.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  }, [selectedItems]);

  // Submit Requisition
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Sesi pengguna tidak valid. Silakan login kembali.');
      return;
    }

    // Validation
    const validItems = selectedItems.filter(item => item.materialId && item.quantity > 0);
    if (validItems.length === 0) {
      alert('Harap pilih minimal 1 material dengan kuantitas lebih dari 0.');
      return;
    }

    // Check if any manual item has not selected a material
    const unselectedManual = selectedItems.find(item => item.isManual && !item.materialId);
    if (unselectedManual) {
      alert('Terdapat item manual yang belum dipilih materialnya. Silakan pilih material atau hapus item tersebut.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Insert Material Requisition Header
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

      // 2. Insert Material Requisition Items
      const itemsToInsert = validItems.map(item => ({
        requisition_id: reqData.id,
        material_id: item.materialId,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('material_requisition_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      alert(`Permintaan material untuk ${cleanWbsCategory} (${validItems.length} item) berhasil diajukan dengan status PENDING.`);
      onClose();
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
              {/* Dual-List Grid Container */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr,60px,1fr] gap-3 items-stretch">
                
                {/* 1. KOTAK KIRI (Hijau Muda): Daftar Permintaan Material Siap Submit */}
                <div className="flex flex-col rounded-xl border border-emerald-500/30 bg-surface/90 overflow-hidden shadow-sm">
                  {/* Header Kotak Kiri */}
                  <div className="p-3 sm:p-3.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
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

                  {/* List Content Kotak Kiri */}
                  <div className="p-2 sm:p-3 flex-1 overflow-y-auto max-h-[340px] space-y-2">
                    {selectedItems.length === 0 ? (
                      <div className="h-44 border-2 border-dashed border-emerald-500/20 rounded-lg flex flex-col items-center justify-center p-4 text-center text-text-muted">
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
                            onDoubleClick={() => handleMoveBackToAvailable(item.tempId)}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              isHighlighted
                                ? 'border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/40'
                                : 'border-border/80 bg-background/80 hover:border-emerald-500/40 hover:bg-emerald-500/5'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {item.isManual && !item.materialId ? (
                                  <div>
                                    <label className="block text-[11px] text-emerald-400 mb-1 font-semibold">
                                      Pilih Material Ekstra:
                                    </label>
                                    <select
                                      value={item.materialId}
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
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-xs sm:text-sm text-text break-words">
                                        {item.name}
                                      </span>
                                      {item.isManual ? (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                                          Ekstra
                                        </span>
                                      ) : (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                                          RAB
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-text-muted mt-0.5">
                                      Estimasi: {formatCurrency(item.subtotal)}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Quantity Input & Remove Button */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="flex items-center gap-1 bg-surface border border-border px-1.5 py-0.5 rounded">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={item.quantity}
                                    onChange={(e) => handleQuantityChange(item.tempId, parseFloat(e.target.value))}
                                    className="w-14 bg-transparent text-right font-mono font-bold text-xs text-text focus:outline-none"
                                  />
                                  <span className="text-[11px] text-text-muted">
                                    {item.unit}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveBackToAvailable(item.tempId);
                                  }}
                                  className="p-1 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                  title={item.isManual ? 'Hapus item' : 'Kembalikan ke Alokasi RAB'}
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
                  <div className="p-2.5 sm:p-3 bg-emerald-500/5 border-t border-emerald-500/20 flex justify-between items-center text-xs">
                    <span className="text-text-muted">Total Estimasi Material:</span>
                    <span className="font-bold font-mono text-emerald-400 text-sm">
                      {formatCurrency(totalRequisitionCost)}
                    </span>
                  </div>
                </div>

                {/* 2. PANEL TOMBOL KONTROL TRANSFER DI TENGAH */}
                <div className="flex lg:flex-col items-center justify-center gap-2 py-2 lg:py-0">
                  <button
                    type="button"
                    onClick={() => handleMoveToRequisition()}
                    disabled={!highlightedSourceId}
                    className="flex-1 lg:flex-none p-2.5 sm:p-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
                    title="Pindahkan item yang disorot ke Daftar Permintaan (<<)"
                  >
                    <ChevronsLeft className="w-5 h-5 hidden lg:block" />
                    <span className="text-xs font-bold lg:hidden flex items-center gap-1">
                      <ChevronsLeft className="w-4 h-4" /> Ambil (&lt;&lt;)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveBackToAvailable()}
                    disabled={!highlightedTargetId}
                    className="flex-1 lg:flex-none p-2.5 sm:p-3 bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
                    title="Kembalikan item yang disorot ke Daftar RAB (>>)"
                  >
                    <ChevronsRight className="w-5 h-5 hidden lg:block" />
                    <span className="text-xs font-bold lg:hidden flex items-center gap-1">
                      Kembalikan (&gt;&gt;) <ChevronsRight className="w-4 h-4" />
                    </span>
                  </button>
                </div>

                {/* 3. KOTAK KANAN (Merah/Rose): Alokasi Material RAB WBS Terkait */}
                <div className="flex flex-col rounded-xl border border-rose-500/30 bg-surface/90 overflow-hidden shadow-sm">
                  {/* Header Kotak Kanan */}
                  <div className="p-3 sm:p-3.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
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

                  {/* List Content Kotak Kanan */}
                  <div className="p-2 sm:p-3 flex-1 overflow-y-auto max-h-[340px] space-y-2">
                    {availableItems.length === 0 ? (
                      <div className="h-44 border-2 border-dashed border-rose-500/20 rounded-lg flex flex-col items-center justify-center p-4 text-center text-text-muted">
                        <CheckCircle2 className="w-8 h-8 text-rose-500/30 mb-2" />
                        <p className="text-xs sm:text-sm font-medium text-text">
                          Semua material RAB telah dipindahkan
                        </p>
                        <p className="text-[11px] text-text-muted mt-1 max-w-xs">
                          Seluruh item RAB untuk tahapan WBS ini sudah berada di daftar permintaan atau belum dialokasikan di estimasi.
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
                  <div className="p-2.5 sm:p-3 bg-rose-500/5 border-t border-rose-500/20 flex justify-between items-center text-xs text-text-muted">
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
            {selectedItems.length > 0 ? (
              <span>
                Siap mengajukan <strong className="text-emerald-400">{selectedItems.length} item material</strong> ke petugas gudang.
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
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || selectedItems.length === 0 || fetching}
              className="flex-1 sm:flex-none px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Mengajukan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Requisition ({selectedItems.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
