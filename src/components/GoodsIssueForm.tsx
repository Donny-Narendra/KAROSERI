import React, { useState, useEffect, useRef } from 'react';
import { Package, CheckCircle2, Lock, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { inventoryService } from '../services/inventoryService';
import { ConfirmationModal } from './ConfirmationModal';
import { MaterialSearchAutocomplete, type MaterialOption } from './MaterialSearchAutocomplete';

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
  const requestQtyInputRef = useRef<HTMLInputElement>(null);

  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'success' | 'danger' | 'warning' | 'info';
  } | null>(null);

  const [rabMaterials, setRabMaterials] = useState<any[]>([]);
  const [masterMaterials, setMasterMaterials] = useState<any[]>([]);
  const [inventoryTotals, setInventoryTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchSpks();
    fetchMasterMaterials();
  }, []);

  const fetchMasterMaterials = async () => {
    const { data } = await supabase.from('materials').select('id, name, current_stock, unit').order('name');
    if (data) setMasterMaterials(data);
  };

  const fetchSpks = async () => {
    const { data, error } = await supabase.from('spk').select('id, spk_no, customer_name, vehicle_plate, sub_tasks, status').eq('status', 'ACTIVE').order('created_at', { ascending: false });
    if (data) setSpks(data);
    if (error) console.error('Error fetching SPKs:', error);
  };

  useEffect(() => {
    if (selectedSpk) {
      fetchRabAndInventory(selectedSpk);
      setSelectedMaterial('');
      setRequestQty('');
    } else {
      setRabMaterials([]);
      setInventoryTotals({});
      setSelectedMaterial('');
      setRequestQty('');
    }
  }, [selectedSpk]);

  const fetchRabAndInventory = async (spkId: string) => {
    // Fetch master materials first for tolerant matching
    const { data: masterData } = await supabase.from('materials').select('id, name, current_stock, unit, waste_factor_percentage').order('name');
    if (masterData) setMasterMaterials(masterData);

    const { data: rabData } = await supabase
      .from('rab_estimations')
      .select(`
        id,
        rab_items (
          quantity,
          description,
          material_id
        )
      `)
      .eq('spk_id', spkId)
      .single();

    let mats: any[] = [];
    if (rabData && rabData.rab_items && masterData) {
      mats = rabData.rab_items.map((item: any) => {
        let matched = null;
        if (item.material_id) matched = masterData.find(m => m.id === item.material_id);
        else if (item.description) matched = masterData.find(m => m.name.toLowerCase() === item.description.toLowerCase());

        if (matched) {
          return {
            material_id: matched.id,
            quantity: Number(item.quantity || 0),
            materials: {
              id: matched.id,
              name: matched.name,
              waste_factor_percentage: matched.waste_factor_percentage || 0
            }
          };
        }
        return null;
      }).filter(Boolean);
    }

    // Ambil material dari Change Order yang telah APPROVED untuk memperluas kuota Gate 2
    try {
      const { data: coItemsData } = await supabase
        .from('change_order_items')
        .select(`
          material_id,
          item_name,
          quantity,
          item_type,
          change_orders!inner ( status )
        `)
        .eq('spk_id', spkId)
        .eq('item_type', 'MATERIAL')
        .eq('change_orders.status', 'APPROVED');

      if (coItemsData && masterData) {
        coItemsData.forEach((coItem: any) => {
          let matched = null;
          if (coItem.material_id) matched = masterData.find(m => m.id === coItem.material_id);
          else if (coItem.item_name) matched = masterData.find(m => m.name.toLowerCase() === coItem.item_name.toLowerCase());

          if (matched) {
            const existing = mats.find(m => m.material_id === matched.id);
            const addQty = Number(coItem.quantity || 0);
            if (existing) {
              existing.quantity += addQty;
            } else {
              mats.push({
                material_id: matched.id,
                quantity: addQty,
                materials: {
                  id: matched.id,
                  name: matched.name,
                  waste_factor_percentage: matched.waste_factor_percentage || 0
                }
              });
            }
          }
        });
      }
    } catch (coErr) {
      console.warn('Notice: Could not load change order items for Gate 2 quota:', coErr);
    }

    setRabMaterials(mats);

    try {
      const totals = await inventoryService.getIssuedMaterialsBySpk(spkId);
      setInventoryTotals(totals);
    } catch (invError) {
      console.error('Error fetching inventory:', invError);
    }
  };

  const selectedRabItem = rabMaterials.find(m => m.material_id === selectedMaterial);
  const selectedMasterItem = masterMaterials.find(m => m.id === selectedMaterial);
  
  let maxAllowed = 0;
  let remainingAllowed = 0;
  let isOverbudget = false;

  if (selectedRabItem) {
    const wasteFactor = Number(selectedRabItem.materials.waste_factor_percentage || 0);
    const rabQty = Number(selectedRabItem.quantity || 0);
    const issuedQty = inventoryTotals[selectedMaterial] || 0;
    
    maxAllowed = rabQty * (1 + (wasteFactor / 100));
    remainingAllowed = maxAllowed - issuedQty;
    isOverbudget = parseFloat(requestQty || '0') > remainingAllowed;
  } else if (selectedMasterItem) {
    // If not in RAB (or RAB is empty), fallback to physical stock limit logic if needed, 
    // but for flexibility, we allow issuing if it's not strictly restricted by RAB here,
    // or we treat remainingAllowed as current stock.
    const issuedQty = inventoryTotals[selectedMaterial] || 0;
    maxAllowed = Infinity;
    remainingAllowed = (selectedMasterItem.current_stock || 0) - issuedQty;
    // Don't block with overbudget for non-RAB fallback according to prompt "Sesuai fleksibilitas"
    isOverbudget = parseFloat(requestQty || '0') > (selectedMasterItem.current_stock || 0);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Guardrail: Double Issuance Check
    if (inventoryTotals[selectedMaterial] && inventoryTotals[selectedMaterial] > 0) {
      setFeedbackModal({
        isOpen: true,
        title: 'Material Pernah Dikeluarkan',
        message: 'Material ini sudah pernah dikeluarkan untuk SPK ini dan tidak dapat diambil kembali.',
        variant: 'warning'
      });
      return;
    }

    if (!isOverbudget && requestQty && user) {
      const qty = parseFloat(requestQty);

      // Ambil stok aktual terbaru dari materials sebelum pengurangan
      const { data: freshMat } = await supabase
        .from('materials')
        .select('name, unit, current_stock')
        .eq('id', selectedMaterial)
        .single();

      const stockBefore = Number(freshMat?.current_stock ?? (selectedMasterItem?.current_stock || 0));
      const stockAfter = Math.max(0, stockBefore - qty);
      const executorName = profile?.full_name || user.email || 'Petugas Gudang';
      const executorRole = profile?.role || 'petugas_gudang';
      const finalAuditNotes = auditNotes.trim() || (profile?.role === 'service_advisor'
        ? 'Diproses oleh Service Advisor (Backup Gudang)'
        : 'Pengeluaran material operasional gudang');

      let insertError: any = null;
      const { error: fullError } = await supabase
        .from('inventory_transactions')
        .insert({
          spk_id: selectedSpk,
          material_id: selectedMaterial,
          quantity_issued: qty,
          issued_by: user.id,
          issued_by_user_id: user.id,
          issued_by_name: executorName,
          issued_by_role: executorRole,
          audit_notes: finalAuditNotes,
          stock_before: stockBefore,
          stock_after: stockAfter
        });

      if (fullError) {
        console.warn('Gagal insert dengan snapshot stok di GoodsIssueForm, mencoba fallback transaksi:', fullError.message);
        const { error: fallbackError } = await supabase
          .from('inventory_transactions')
          .insert({
            spk_id: selectedSpk,
            material_id: selectedMaterial,
            quantity_issued: qty,
            issued_by: user.id,
            issued_by_user_id: user.id,
            issued_by_name: executorName,
            issued_by_role: executorRole,
            audit_notes: finalAuditNotes
          });
        insertError = fallbackError;
      } else {
        insertError = null;
      }
        
      if (!insertError) {
        // Kurangi current_stock di tabel materials
        await supabase.from('materials').update({ current_stock: stockAfter }).eq('id', selectedMaterial);

        // Mirror ke tabel material_issues untuk audit kompatibilitas
        try {
          await supabase.from('material_issues').insert({
            spk_id: selectedSpk,
            material_id: selectedMaterial,
            quantity: qty,
            issued_by_user_id: user.id,
            issued_by_name: executorName,
            issued_by_role: executorRole,
            audit_notes: finalAuditNotes
          });
        } catch (err: any) {
          console.warn('Mirror material_issues notice:', err);
        }

        setFeedbackModal({
          isOpen: true,
          title: 'Material Berhasil Dikeluarkan',
          message: `Berhasil mengeluarkan ${qty} unit material untuk SPK ini. Stok inventaris gudang telah disesuaikan (Sisa: ${stockAfter}). Audit trail tercatat atas nama ${executorName} (${executorRole}).`,
          variant: 'success'
        });
        setRequestQty('');
        setSelectedMaterial('');
        setAuditNotes('');
        fetchRabAndInventory(selectedSpk);
        if (onSuccess) onSuccess();
      } else {
        setFeedbackModal({
          isOpen: true,
          title: 'Gagal Mengeluarkan Material',
          message: insertError?.message || 'Gagal mengeluarkan material ke SPK.',
          variant: 'danger'
        });
        console.error(insertError);
      }
    }
  };

  const autocompleteMaterials: MaterialOption[] = masterMaterials.map(mat => {
    const isRab = rabMaterials.some(r => r.material_id === mat.id);
    const issuedQty = inventoryTotals[mat.id] || 0;
    const hasBeenIssued = issuedQty > 0;
    return {
      id: mat.id,
      name: mat.name,
      code: (mat as any).code,
      current_stock: mat.current_stock ?? 0,
      unit: mat.unit || 'pcs',
      waste_factor_percentage: mat.waste_factor_percentage,
      is_rab: isRab,
      has_been_issued: hasBeenIssued,
    };
  });

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
              onChange={(e) => {
                setSelectedSpk(e.target.value);
              }}
              className="w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none"
            >
              <option value="">-- Choose SPK --</option>
              {spks.map(spk => (
                <option key={spk.id} value={spk.id}>{spk.spk_no} - {spk.customer_name}</option>
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
              <p className="font-bold text-lg">{selectedMasterItem.current_stock || 0} <span className="text-sm font-normal text-text-muted">{selectedMasterItem.unit}</span></p>
            </div>
            {selectedRabItem && (
              <div className="text-right">
                <p className="text-sm text-text-muted">Sisa Kuota RAB</p>
                <p className={`font-bold text-lg ${remainingAllowed <= 0 ? 'text-status-danger' : 'text-status-success'}`}>
                  {remainingAllowed.toFixed(2)} <span className="text-sm font-normal text-text-muted">{selectedMasterItem.unit}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {selectedRabItem && (
          <div className="bg-background border border-border p-4 rounded-lg grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-text-muted uppercase font-mono">RAB Estimate</div>
              <div className="font-medium">{selectedRabItem.quantity} (Waste {selectedRabItem.materials.waste_factor_percentage}%)</div>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase font-mono">Max Allowed</div>
              <div className="font-medium">{maxAllowed.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase font-mono">Remaining Budget</div>
              <div className={`font-medium ${remainingAllowed <= 0 ? 'text-status-danger' : 'text-status-success'}`}>
                {remainingAllowed.toFixed(2)}
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
              min="0.1"
              step="0.1"
              value={requestQty}
              onChange={(e) => setRequestQty(e.target.value)}
              disabled={!selectedMaterial || remainingAllowed <= 0}
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

        {isOverbudget && requestQty && (
          <div className="bg-status-danger/10 border border-status-danger/30 rounded p-3 flex items-start gap-3">
            <Lock className="w-5 h-5 text-status-danger mt-0.5" />
            <div>
              <h4 className="font-bold text-status-danger text-sm">Gate 2 Locked: Overbudget</h4>
              <p className="text-xs text-status-danger/80 mt-1">
                Requested quantity ({requestQty}) exceeds the remaining allowable budget ({remainingAllowed.toFixed(2)}).
                This issue is blocked until authorized by the Owner via a Change Order (Amandemen SPK).
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
            disabled={!selectedMaterial || !requestQty || isOverbudget || remainingAllowed <= 0 || !user}
            className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-6 rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isOverbudget ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {isOverbudget ? (selectedRabItem ? 'Blocked: Overbudget' : 'Blocked: Insufficient Stock') : 'Issue Material'}
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
