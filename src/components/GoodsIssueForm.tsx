import React, { useState, useEffect } from 'react';
import { Package, CheckCircle2, Lock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface GoodsIssueFormProps {
  onSuccess?: () => void;
}

export const GoodsIssueForm: React.FC<GoodsIssueFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [spks, setSpks] = useState<any[]>([]);
  const [selectedSpk, setSelectedSpk] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [requestQty, setRequestQty] = useState<string>('');

  const [rabMaterials, setRabMaterials] = useState<any[]>([]);
  const [inventoryTotals, setInventoryTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchSpks();
  }, []);

  const fetchSpks = async () => {
    const { data, error } = await supabase.from('spk').select('id, spk_no, customer_name, vehicle_plate, status').eq('status', 'ACTIVE').order('created_at', { ascending: false });
    if (data) setSpks(data);
    if (error) console.error('Error fetching SPKs:', error);
  };

  useEffect(() => {
    if (selectedSpk) {
      fetchRabAndInventory(selectedSpk);
    } else {
      setRabMaterials([]);
      setInventoryTotals({});
      setSelectedMaterial('');
    }
  }, [selectedSpk]);

  const fetchRabAndInventory = async (spkId: string) => {
    const { data: rabData, error: rabError } = await supabase
      .from('rab_estimations')
      .select(`
        id,
        rab_items (
          quantity,
          material_id,
          materials ( id, name, waste_factor_percentage )
        )
      `)
      .eq('spk_id', spkId)
      .single();

    if (rabError) {
      console.error('Error fetching RAB data:', rabError);
      setRabMaterials([]);
    } else if (rabData && rabData.rab_items) {
      const mats = rabData.rab_items.filter((item: any) => item.material_id && item.materials);
      setRabMaterials(mats);
    }

    const { data: invData, error: invError } = await supabase
      .from('inventory_transactions')
      .select('material_id, quantity_issued')
      .eq('spk_id', spkId);

    if (invError) {
      console.error('Error fetching inventory:', invError);
    } else if (invData) {
      const totals: Record<string, number> = {};
      invData.forEach((tx: any) => {
        totals[tx.material_id] = (totals[tx.material_id] || 0) + Number(tx.quantity_issued);
      });
      setInventoryTotals(totals);
    }
  };

  const selectedRabItem = rabMaterials.find(m => m.material_id === selectedMaterial);
  
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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOverbudget && requestQty && remainingAllowed > 0 && user) {
      const qty = parseFloat(requestQty);
      const { error } = await supabase
        .from('inventory_transactions')
        .insert({
          spk_id: selectedSpk,
          material_id: selectedMaterial,
          quantity_issued: qty,
          issued_by: user.id
        });
        
      if (!error) {
        alert(`Berhasil mengeluarkan ${qty} unit material`);
        setRequestQty('');
        fetchRabAndInventory(selectedSpk);
        if (onSuccess) onSuccess();
      } else {
        alert('Gagal mengeluarkan material');
        console.error(error);
      }
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h3 className="font-bold text-lg font-display text-text mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-primary" />
        Issue Material (Goods Issue)
      </h3>

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
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              disabled={!selectedSpk || rabMaterials.length === 0}
              className="w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none disabled:opacity-50"
            >
              <option value="">-- Choose Material --</option>
              {rabMaterials.map(mat => (
                <option key={mat.material_id} value={mat.material_id}>{mat.materials.name}</option>
              ))}
            </select>
          </div>
        </div>

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
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={requestQty}
            onChange={(e) => setRequestQty(e.target.value)}
            disabled={!selectedRabItem || remainingAllowed <= 0}
            className="w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none disabled:opacity-50"
            placeholder="Enter quantity..."
          />
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

        <div className="pt-2">
          <button
            type="submit"
            disabled={!selectedMaterial || !requestQty || isOverbudget || remainingAllowed <= 0 || !user}
            className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-6 rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isOverbudget ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {isOverbudget ? 'Blocked' : 'Issue Material'}
          </button>
        </div>
      </form>
    </div>
  );
};
