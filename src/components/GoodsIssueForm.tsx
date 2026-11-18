import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Package, CheckCircle2, Lock, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { ConfirmationModal } from './ConfirmationModal';
import { MaterialSearchAutocomplete, type MaterialOption } from './MaterialSearchAutocomplete';
import {
  evaluateGate2ItemQuota,
  formatGate2Qty,
  GATE2_QTY_EPSILON,
  type RabItemGate2,
  type ChangeOrderItemGate2,
  type DirectIssueGate2,
} from '../utils/gate2BudgetValidation';

interface GoodsIssueFormProps {
  onSuccess?: () => void;
}

export const GoodsIssueForm: React.FC<GoodsIssueFormProps> = ({ onSuccess }) => {
  const { user, profile } = useAuth();
  const [spks, setSpks] = useState<any[]>([]);
  const [selectedSpk, setSelectedSpk] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [requestQty, setRequestQty] = useState<string>('');
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [ownerOverride, setOwnerOverride] = useState<boolean>(false);
  const requestQtyInputRef = useRef<HTMLInputElement>(null);

  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'success' | 'danger' | 'warning' | 'info';
  } | null>(null);

  const [rabItems, setRabItems] = useState<RabItemGate2[]>([]);
  const [approvedCoItems, setApprovedCoItems] = useState<ChangeOrderItemGate2[]>([]);
  const [issuedTransactions, setIssuedTransactions] = useState<DirectIssueGate2[]>([]);
  const [masterMaterials, setMasterMaterials] = useState<any[]>([]);
  const [inventoryTotals, setInventoryTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchSpks();
    fetchMasterMaterials();
  }, []);

  const fetchMasterMaterials = async () => {
    const { data } = await supabase
      .from('materials')
      .select('id, name, barcode, unit, current_stock, cost_price, selling_price, unit_price, waste_factor_percentage')
      .order('name');
    if (data) setMasterMaterials(data);
  };

  const fetchSpks = async () => {
    const { data, error } = await supabase
      .from('spk')
      .select('id, spk_no, customer_name, vehicle_plate, sub_tasks, status, is_hidden, is_test')
      .eq('status', 'ACTIVE')
      .eq('is_hidden', false)
      .eq('is_test', false)
      .order('created_at', { ascending: false });
    if (data) setSpks(data.filter(s => !s.is_hidden && !s.is_test));
    if (error) console.error('Error fetching SPKs:', error);
  };

  const fetchRabAndInventory = useCallback(async (spkId: string) => {
    const { data: masterData } = await supabase
      .from('materials')
      .select('id, name, barcode, unit, current_stock, cost_price, selling_price, unit_price, waste_factor_percentage')
      .order('name');
    const loadedMasters = masterData || [];
    if (masterData) setMasterMaterials(masterData);

    const resolveMasterId = (matId?: string | null, label?: string | null): string | null => {
      if (matId) return matId;
      if (!label || !loadedMasters.length) return null;
      const clean = label.replace(/^(?:Bagian dari paket:\s*)?(?:\[?Paket:\s*[^\]]+\]?\s*[-:]?\s*)/i, '').trim().toLowerCase();
      const found = loadedMasters.find((m: any) => String(m.name || '').trim().toLowerCase() === clean);
      return found ? found.id : null;
    };

    const { data: rabData } = await supabase
      .from('rab_estimations')
      .select(`
        id,
        rab_items (
          id,
          quantity,
          description,
          material_id,
          item_type,
          wbs_stage,
          wbs_category,
          cost_price,
          unit_price,
          item_total
        )
      `)
      .eq('spk_id', spkId)
      .single();

    const mappedRabItems: RabItemGate2[] = [];
    if (rabData && rabData.rab_items) {
      rabData.rab_items
        .filter((item: any) => {
          const t = (item.item_type || '').toUpperCase();
          return !t || t === 'MATERIAL';
        })
        .forEach((item: any) => {
          const resolvedMatId = resolveMasterId(item.material_id, item.description);
          const matchedMat = loadedMasters.find((m: any) => m.id === resolvedMatId);
          mappedRabItems.push({
            id: item.id,
            spk_id: spkId,
            material_id: resolvedMatId,
            description: item.description,
            quantity: Number(item.quantity || 0),
            item_type: 'MATERIAL',
            wbs_stage: item.wbs_stage || item.wbs_category || null,
            wbs_category: item.wbs_category || null,
            cost_price: Number(item.cost_price || 0),
            unit_price: Number(item.unit_price || 0),
            item_total: Number(item.item_total || 0),
            materials: matchedMat
              ? {
                  id: matchedMat.id,
                  name: matchedMat.name,
                  unit: matchedMat.unit,
                  cost_price: matchedMat.cost_price,
                  unit_price: matchedMat.unit_price,
                  waste_factor_percentage: matchedMat.waste_factor_percentage || 0,
                }
              : null,
          });
        });
    }
    setRabItems(mappedRabItems);

    const mappedCoItems: ChangeOrderItemGate2[] = [];
    try {
      const { data: coItemsData } = await supabase
        .from('change_order_items')
        .select(`
          id,
          material_id,
          item_name,
          quantity,
          item_type,
          wbs_stage,
          cost_price,
          unit_price,
          subtotal,
          change_orders!inner ( status )
        `)
        .eq('spk_id', spkId)
        .eq('item_type', 'MATERIAL')
        .eq('change_orders.status', 'APPROVED');

      if (coItemsData) {
        coItemsData.forEach((coItem: any) => {
          const resolvedMatId = resolveMasterId(coItem.material_id, coItem.item_name);
          const matchedMat = loadedMasters.find((m: any) => m.id === resolvedMatId);
          mappedCoItems.push({
            id: coItem.id,
            spk_id: spkId,
            material_id: resolvedMatId,
            item_name: coItem.item_name,
            quantity: Number(coItem.quantity || 0),
            item_type: 'MATERIAL',
            wbs_stage: coItem.wbs_stage || null,
            cost_price: Number(coItem.cost_price || 0),
            unit_price: Number(coItem.unit_price || 0),
            subtotal: Number(coItem.subtotal || 0),
            materials: matchedMat
              ? {
                  id: matchedMat.id,
                  name: matchedMat.name,
                  unit: matchedMat.unit,
                  cost_price: matchedMat.cost_price,
                  unit_price: matchedMat.unit_price,
                  waste_factor_percentage: matchedMat.waste_factor_percentage || 0,
                }
              : null,
          });
        });
      }
    } catch (coErr) {
      console.warn('Notice: Could not load change order items for Gate 2 quota:', coErr);
    }
    setApprovedCoItems(mappedCoItems);

    try {
      const { data: txData, error: txErr } = await supabase
        .from('inventory_transactions')
        .select('id, spk_id, material_id, quantity_issued, wbs_stage, status, custom_unit_price')
        .eq('spk_id', spkId);

      if (txErr) throw txErr;

      const activeTxs = (txData || []).filter((tx: any) => {
        const st = String(tx.status || '').toUpperCase();
        return st !== 'VOID' && st !== 'VOIDED' && st !== 'CANCELLED';
      });
      setIssuedTransactions(activeTxs);

      const totals: Record<string, number> = {};
      activeTxs.forEach((tx: any) => {
        if (tx.material_id) {
          totals[tx.material_id] = (totals[tx.material_id] || 0) + Number(tx.quantity_issued || 0);
        }
      });
      setInventoryTotals(totals);
    } catch (invError) {
      console.error('Error fetching inventory:', invError);
      setIssuedTransactions([]);
      setInventoryTotals({});
    }
  }, []);

  useEffect(() => {
    if (selectedSpk) {
      fetchRabAndInventory(selectedSpk);
      setSelectedMaterial('');
      setRequestQty('');
      setOwnerOverride(false);
    } else {
      setRabItems([]);
      setApprovedCoItems([]);
      setIssuedTransactions([]);
      setInventoryTotals({});
      setSelectedMaterial('');
      setRequestQty('');
      setOwnerOverride(false);
    }
  }, [selectedSpk, fetchRabAndInventory]);

  useEffect(() => {
    setOwnerOverride(false);
  }, [selectedMaterial]);

  const selectedMasterItem = masterMaterials.find(m => m.id === selectedMaterial);

  // Determine RAB + Approved CO allocations for the currently selected material
  const selectedMaterialRabStages = useMemo(() => {
    if (!selectedMaterial) return [];
    const stages = new Set<string>();
    rabItems.forEach(ri => {
      if (ri.material_id === selectedMaterial) {
        const st = (ri.wbs_stage || ri.wbs_category || '').trim();
        if (st) stages.add(st);
      }
    });
    approvedCoItems.forEach(ci => {
      if (ci.material_id === selectedMaterial) {
        const st = (ci.wbs_stage || '').trim();
        if (st) stages.add(st);
      }
    });
    return Array.from(stages);
  }, [selectedMaterial, rabItems, approvedCoItems]);

  const hasRabAllocation = useMemo(() => {
    if (!selectedMaterial) return false;
    return (
      rabItems.some(ri => ri.material_id === selectedMaterial) ||
      approvedCoItems.some(ci => ci.material_id === selectedMaterial)
    );
  }, [selectedMaterial, rabItems, approvedCoItems]);

  const parsedRequestQty = useMemo(() => {
    const num = parseFloat(requestQty || '0');
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [requestQty]);

  const wbsStageLabel =
    selectedMaterialRabStages.length === 1
      ? selectedMaterialRabStages[0]
      : selectedMaterialRabStages.length > 1
        ? selectedMaterialRabStages.join(', ')
        : 'Alokasi RAB SPK';

  const gate2Eval = useMemo(() => {
    if (!selectedSpk || !selectedMaterial || !selectedMasterItem) return null;
    return evaluateGate2ItemQuota({
      spkId: selectedSpk,
      wbsStage: selectedMaterialRabStages.length === 1 ? selectedMaterialRabStages[0] : null,
      materialId: selectedMaterial,
      materialName: selectedMasterItem.name,
      unit: selectedMasterItem.unit || 'pcs',
      currentRequestQty: parsedRequestQty,
      currentInventoryCostPrice: selectedMasterItem.cost_price ? Number(selectedMasterItem.cost_price) : null,
      rabItems,
      approvedCoItems,
      approvedReqs: [],
      directIssues: issuedTransactions,
      masterMaterials,
    });
  }, [
    selectedSpk,
    selectedMaterial,
    selectedMasterItem,
    selectedMaterialRabStages,
    parsedRequestQty,
    rabItems,
    approvedCoItems,
    issuedTransactions,
    masterMaterials,
  ]);

  const remainingQuotaBeforeInput = gate2Eval
    ? Math.max(0, gate2Eval.qtyPaguRab - gate2Eval.qtySudahKeluar)
    : 0;
  const availableStock = Number(selectedMasterItem?.current_stock || 0);
  const isInsufficientStock = Boolean(
    selectedMasterItem && parsedRequestQty > availableStock + GATE2_QTY_EPSILON
  );
  const isQtyOverQuota = Boolean(hasRabAllocation && gate2Eval?.isQtyOverQuota);
  const isOwnerOverrideActive = profile?.role === 'owner' && ownerOverride;
  const isLockedByGate2 = isQtyOverQuota && !isOwnerOverrideActive;
  const isSubmitDisabled =
    !selectedMaterial ||
    parsedRequestQty <= 0 ||
    isLockedByGate2 ||
    isInsufficientStock ||
    !user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled || !user || !selectedMasterItem) return;

    const qty = parsedRequestQty;

    // Ambil stok aktual terbaru dari materials sebelum pengurangan
    const { data: freshMat } = await supabase
      .from('materials')
      .select('name, unit, current_stock')
      .eq('id', selectedMaterial)
      .single();

    const stockBefore = Number(freshMat?.current_stock ?? availableStock);
    const stockAfter = Math.max(0, stockBefore - qty);
    const executorName = profile?.full_name || user.email || 'Petugas Gudang';
    const executorRole = profile?.role || 'petugas_gudang';
    const finalAuditNotes =
      auditNotes.trim() ||
      (profile?.role === 'service_advisor'
        ? 'Diproses oleh Service Advisor (Backup Gudang)'
        : 'Pengeluaran material operasional gudang');
    const resolvedWbsStage = selectedMaterialRabStages.length === 1 ? selectedMaterialRabStages[0] : null;

    let insertError: any = null;
    const baseTx: any = {
      spk_id: selectedSpk,
      material_id: selectedMaterial,
      quantity_issued: qty,
      issued_by: user.id,
      issued_by_user_id: user.id,
      issued_by_name: executorName,
      issued_by_role: executorRole,
      audit_notes: finalAuditNotes,
      stock_before: stockBefore,
      stock_after: stockAfter,
    };
    if (resolvedWbsStage) {
      baseTx.wbs_stage = resolvedWbsStage;
    }

    const { error: fullError } = await supabase
      .from('inventory_transactions')
      .insert(baseTx);

    if (fullError) {
      console.warn('Gagal insert dengan snapshot stok/wbs di GoodsIssueForm, mencoba fallback transaksi:', fullError.message);
      const { stock_before: _sb, stock_after: _sa, wbs_stage: _ws, ...fallbackTx } = baseTx;
      const { error: fallbackError } = await supabase
        .from('inventory_transactions')
        .insert(fallbackTx);
      insertError = fallbackError;
    }

    if (!insertError) {
      await supabase.from('materials').update({ current_stock: stockAfter }).eq('id', selectedMaterial);

      try {
        await supabase.from('material_issues').insert({
          spk_id: selectedSpk,
          material_id: selectedMaterial,
          quantity: qty,
          issued_by_user_id: user.id,
          issued_by_name: executorName,
          issued_by_role: executorRole,
          audit_notes: finalAuditNotes,
        });
      } catch (err: any) {
        console.warn('Mirror material_issues notice:', err);
      }

      setFeedbackModal({
        isOpen: true,
        title: 'Material Berhasil Dikeluarkan',
        message: `Berhasil mengeluarkan ${qty} ${selectedMasterItem.unit || 'unit'} material untuk SPK ini. Stok inventaris gudang telah disesuaikan (Sisa: ${stockAfter}). Audit trail tercatat atas nama ${executorName} (${executorRole}).`,
        variant: 'success',
      });
      setRequestQty('');
      setSelectedMaterial('');
      setAuditNotes('');
      setOwnerOverride(false);
      fetchRabAndInventory(selectedSpk);
      if (onSuccess) onSuccess();
    } else {
      setFeedbackModal({
        isOpen: true,
        title: 'Gagal Mengeluarkan Material',
        message: insertError?.message || 'Gagal mengeluarkan material ke SPK.',
        variant: 'danger',
      });
      console.error(insertError);
    }
  };

  const autocompleteMaterials: MaterialOption[] = masterMaterials.map(mat => {
    const matchingRabs = rabItems.filter(r => r.material_id === mat.id);
    const matchingCos = approvedCoItems.filter(c => c.material_id === mat.id);
    const isRab = matchingRabs.length > 0 || matchingCos.length > 0;
    const totalQuota =
      matchingRabs.reduce((s, r) => {
        const w = Number(r.materials?.waste_factor_percentage ?? mat.waste_factor_percentage ?? 0);
        return s + Number(r.quantity || 0) * (1 + w / 100);
      }, 0) +
      matchingCos.reduce((s, c) => {
        const w = Number(c.materials?.waste_factor_percentage ?? mat.waste_factor_percentage ?? 0);
        return s + Number(c.quantity || 0) * (1 + w / 100);
      }, 0);
    const issuedQty = inventoryTotals[mat.id] || 0;
    const hasBeenIssued = isRab ? (totalQuota - issuedQty) <= GATE2_QTY_EPSILON : false;

    return {
      id: mat.id,
      name: mat.name,
      code: (mat as any).code,
      barcode: mat.barcode,
      current_stock: mat.current_stock ?? 0,
      unit: mat.unit || 'pcs',
      cost_price: mat.cost_price,
      selling_price: mat.selling_price,
      waste_factor_percentage: mat.waste_factor_percentage,
      is_rab: isRab,
      has_been_issued: hasBeenIssued,
    };
  });

  const satuan = selectedMasterItem?.unit || 'pcs';

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg font-display text-text flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Issue Material (Goods Issue)
        </h3>
        {profile?.role === 'service_advisor' && (
          <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
            Backup Gudang
          </span>
        )}
      </div>

      {profile?.role === 'service_advisor' && (
        <div className="bg-amber-950/40 border border-amber-600/50 rounded-lg p-3 text-sm text-amber-200 flex items-start gap-2.5 mb-4">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold text-amber-300">Wewenang Cadangan (Service Advisor):</span> Anda bertindak sebagai backup Petugas Gudang. Pengeluaran material ini akan dicatat dalam Audit Trail atas nama <strong className="font-semibold">{profile?.full_name || 'Service Advisor'}</strong>.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Select SPK</label>
            <select
              value={selectedSpk}
              onChange={(e) => setSelectedSpk(e.target.value)}
              className="w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none"
            >
              <option value="">-- Choose SPK --</option>
              {spks.map(spk => (
                <option key={spk.id} value={spk.id}>
                  {spk.spk_no} - {spk.customer_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Select Material</label>
            <MaterialSearchAutocomplete
              materials={autocompleteMaterials}
              selectedMaterialId={selectedMaterial}
              onSelect={(mat) => setSelectedMaterial(mat ? mat.id : '')}
              disabled={!selectedSpk}
              placeholder="Cari bahan baku, profil besi, sparepart, atau kustom..."
              onEnterFocusNext={() => requestQtyInputRef.current?.focus()}
            />
          </div>
        </div>

        {selectedMasterItem && (
          <div className="bg-surface/50 border border-border p-4 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Stok Tersedia</p>
              <p className="font-bold text-lg">
                {availableStock} <span className="text-sm font-normal text-text-muted">{satuan}</span>
              </p>
            </div>
            {hasRabAllocation && gate2Eval && (
              <div className="text-right">
                <p className="text-sm text-text-muted">Sisa Kuota RAB (Qty)</p>
                <p className={`font-bold text-lg ${remainingQuotaBeforeInput <= GATE2_QTY_EPSILON ? 'text-status-danger' : 'text-status-success'}`}>
                  {formatGate2Qty(remainingQuotaBeforeInput)}{' '}
                  <span className="text-sm font-normal text-text-muted">{satuan}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {hasRabAllocation && gate2Eval && (
          <div className="bg-background border border-border p-4 rounded-lg grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-text-muted uppercase font-mono">Kuota RAB (+Waste)</div>
              <div className="font-medium">
                {formatGate2Qty(gate2Eval.qtyPaguRab)} {satuan}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase font-mono">Sudah Keluar</div>
              <div className="font-medium">
                {formatGate2Qty(gate2Eval.qtySudahKeluar)} {satuan}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase font-mono">Sisa Kuota Qty</div>
              <div className={`font-medium ${gate2Eval.isQtyOverQuota ? 'text-status-danger' : 'text-status-success'}`}>
                {formatGate2Qty(gate2Eval.remainingQtyQuota)} {satuan}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm text-text-muted mb-1">Request Quantity</label>
          <div className="relative">
            <input
              ref={requestQtyInputRef}
              type="number"
              min="0.001"
              step="any"
              value={requestQty}
              onChange={(e) => setRequestQty(e.target.value)}
              disabled={!selectedMaterial}
              className={`w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none disabled:opacity-50 ${selectedMasterItem?.unit ? 'pr-20' : ''}`}
              placeholder="Enter quantity..."
            />
            {selectedMasterItem?.unit && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-mono font-medium text-text-muted">
                <span className="bg-surface px-2 py-0.5 rounded border border-border">
                  {selectedMasterItem.unit}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Gate 2 Quantity-Based Validation Banners */}
        {hasRabAllocation && gate2Eval && (
          <>
            {isQtyOverQuota ? (
              <div className="bg-rose-950/80 border border-rose-600 text-rose-200 rounded-lg p-3 flex items-start gap-2.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 w-full">
                  <p className="leading-relaxed">
                    <span className="font-bold text-rose-300">🚫 PERINGATAN GATE 2 (OVER QUOTA KUANTITAS):</span> Permintaan ini menyebabkan total pengambilan ({formatGate2Qty(gate2Eval.proyeksiTotalQty)} {satuan}) MELEBIHI kuota RAB ({formatGate2Qty(gate2Eval.qtyPaguRab)} {satuan}) sebesar +{formatGate2Qty(gate2Eval.overQty)} {satuan}. Membutuhkan otorisasi Owner atau Change Order dari Service Advisor.
                  </p>
                  {profile?.role === 'owner' && (
                    <label className="mt-1 inline-flex items-center gap-2 cursor-pointer text-[11px] font-medium text-amber-200 bg-rose-900/50 border border-rose-500/40 px-2.5 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={ownerOverride}
                        onChange={(e) => setOwnerOverride(e.target.checked)}
                        className="accent-amber-500 rounded"
                      />
                      <span>Otorisasi Owner Override (Buka Kunci Rilis Over-Quota)</span>
                    </label>
                  )}
                </div>
              </div>
            ) : gate2Eval.costVarianceRp > 0 ? (
              <div className="bg-sky-950/40 border border-sky-800 text-sky-200 rounded-lg p-3 flex items-start gap-2.5 text-xs">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  ℹ Kuantitas Sesuai Kuota RAB ({formatGate2Qty(gate2Eval.proyeksiTotalQty)} / {formatGate2Qty(gate2Eval.qtyPaguRab)} {satuan}). Catatan Audit: Terjadi penyesuaian harga HPP gudang (+Rp {Math.round(gate2Eval.costVarianceRp).toLocaleString('id-ID')}) dari estimasi awal RAB.
                </p>
              </div>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-lg p-3 flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  ✓ Kuota Kuantitas Sesuai RAB ({wbsStageLabel}): {formatGate2Qty(gate2Eval.proyeksiTotalQty)} / {formatGate2Qty(gate2Eval.qtyPaguRab)} {satuan} (Aman untuk dirilis).
                </span>
              </div>
            )}
          </>
        )}

        {isInsufficientStock && (
          <div className="bg-rose-950/80 border border-rose-600 text-rose-200 rounded-lg p-3 flex items-start gap-2.5 text-xs">
            <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-300">Stok Fisik Tidak Mencukupi</h4>
              <p className="mt-0.5">
                Jumlah diminta ({formatGate2Qty(parsedRequestQty)} {satuan}) melebihi stok fisik tersedia ({formatGate2Qty(availableStock)} {satuan}).
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm text-text-muted mb-1">Catatan Konteks / Alasan Pengeluaran (Audit Trail)</label>
          <input
            type="text"
            value={auditNotes}
            onChange={(e) => setAuditNotes(e.target.value)}
            placeholder={profile?.role === 'service_advisor' ? 'Diproses oleh Service Advisor (Backup Gudang)' : 'Catatan audit operasional gudang...'}
            className="w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none text-sm placeholder:text-text-muted/60"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-6 rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLockedByGate2 || isInsufficientStock ? (
              <Lock className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isLockedByGate2
              ? 'Blocked: Over Quota Qty'
              : isInsufficientStock
                ? 'Blocked: Insufficient Stock'
                : 'Issue Material'}
          </button>
        </div>
      </form>

      {/* Feedback / Alert Modal */}
      {feedbackModal && (
        <ConfirmationModal
          isOpen={feedbackModal.isOpen}
          title={feedbackModal.title}
          message={feedbackModal.message}
          confirmText="Tutup"
          hideCancel={true}
          variant={feedbackModal.variant}
          onConfirm={() => setFeedbackModal(null)}
          onCancel={() => setFeedbackModal(null)}
        />
      )}
    </div>
  );
};
