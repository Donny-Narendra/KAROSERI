import React, { useState, useEffect, useRef } from 'react';
import { RefreshCcw, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { ConfirmationModal } from './ConfirmationModal';
import { IssuedMaterialAutocomplete, type IssuedMaterialItem } from './IssuedMaterialAutocomplete';

interface GoodsReturnFormProps {
  onSuccess?: () => void;
}

export const GoodsReturnForm: React.FC<GoodsReturnFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [spks, setSpks] = useState<any[]>([]);
  const [selectedSpk, setSelectedSpk] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [returnQty, setReturnQty] = useState<string>('');

  const [issuedMaterials, setIssuedMaterials] = useState<IssuedMaterialItem[]>([]);
  const returnQtyInputRef = useRef<HTMLInputElement>(null);

  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'success' | 'danger' | 'warning' | 'info';
  } | null>(null);

  useEffect(() => {
    fetchSpks();
  }, []);

  const fetchSpks = async () => {
    const { data, error } = await supabase.from('spk').select('id, spk_no, customer_name, vehicle_plate, sub_tasks, status').eq('status', 'ACTIVE').order('created_at', { ascending: false });
    if (data) setSpks(data);
    if (error) console.error('Error fetching SPKs:', error);
  };

  useEffect(() => {
    if (selectedSpk) {
      fetchIssuedMaterials(selectedSpk);
    } else {
      setIssuedMaterials([]);
      setSelectedMaterial('');
    }
  }, [selectedSpk]);

  const fetchIssuedMaterials = async (spkId: string) => {
    const { data: invData, error: invError } = await supabase
      .from('inventory_transactions')
      .select('material_id, quantity_issued, materials(id, name, unit)')
      .eq('spk_id', spkId);

    if (invError) {
      console.error('Error fetching inventory:', invError);
      setIssuedMaterials([]);
    } else if (invData) {
      const totals: Record<string, { total_issued: number; name: string; unit: string }> = {};
      invData.forEach((tx: any) => {
        if (!totals[tx.material_id]) {
          totals[tx.material_id] = {
            total_issued: 0,
            name: tx.materials?.name || 'Unknown',
            unit: tx.materials?.unit || 'unit'
          };
        }
        totals[tx.material_id].total_issued += Number(tx.quantity_issued);
      });
      
      const issuedArr: IssuedMaterialItem[] = Object.entries(totals)
        .map(([id, info]) => ({ material_id: id, ...info }))
        .filter(m => m.total_issued > 0);
        
      setIssuedMaterials(issuedArr);
    }
  };

  const selectedMatInfo = issuedMaterials.find(m => m.material_id === selectedMaterial);
  
  const isOverReturn = selectedMatInfo && parseFloat(returnQty || '0') > selectedMatInfo.total_issued;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOverReturn && returnQty && user) {
      const qty = parseFloat(returnQty);
      const { error } = await supabase
        .from('inventory_transactions')
        .insert({
          spk_id: selectedSpk,
          material_id: selectedMaterial,
          quantity_issued: -qty, // Negative for return
          issued_by: user.id
        });
        
      if (!error) {
        setFeedbackModal({
          isOpen: true,
          title: 'Retur Material Berhasil',
          message: `Berhasil meretur ${qty} ${selectedMatInfo?.unit || 'unit'} material kembali ke stok gudang untuk SPK ini.`,
          variant: 'success'
        });
        setReturnQty('');
        fetchIssuedMaterials(selectedSpk);
        if (onSuccess) onSuccess();
      } else {
        setFeedbackModal({
          isOpen: true,
          title: 'Gagal Meretur Material',
          message: error.message || 'Gagal memproses retur material ke database.',
          variant: 'danger'
        });
        console.error(error);
      }
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h3 className="font-bold text-lg font-display text-text mb-4 flex items-center gap-2">
        <RefreshCcw className="w-5 h-5 text-primary" />
        Return Material
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Select SPK</label>
            <select
              value={selectedSpk}
              onChange={(e) => {
                setSelectedSpk(e.target.value);
                setSelectedMaterial('');
                setReturnQty('');
              }}
              className="w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none"
            >
              <option value="">-- Choose Active SPK --</option>
              {spks.map((spk) => (
                <option key={spk.id} value={spk.id}>
                  {spk.spk_no} - {spk.customer_name} ({spk.vehicle_plate})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Select Issued Material</label>
            <IssuedMaterialAutocomplete
              materials={issuedMaterials}
              selectedMaterialId={selectedMaterial}
              onSelect={(mat) => {
                setSelectedMaterial(mat ? mat.material_id : '');
                if (!mat) {
                  setReturnQty('');
                }
              }}
              disabled={!selectedSpk}
              placeholder="Ketik nama material yang telah dikeluarkan..."
              onEnterFocusNext={() => {
                returnQtyInputRef.current?.focus();
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm text-text-muted">Return Quantity</label>
            {selectedMatInfo && (
              <span className="text-xs text-orange-400 font-mono">
                Maksimal retur: {selectedMatInfo.total_issued} {selectedMatInfo.unit || 'unit'}
              </span>
            )}
          </div>
          <input
            ref={returnQtyInputRef}
            type="number"
            min="0.1"
            max={selectedMatInfo?.total_issued}
            step="0.1"
            value={returnQty}
            onChange={(e) => setReturnQty(e.target.value)}
            disabled={!selectedMatInfo}
            className="w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none disabled:opacity-50"
            placeholder={
              selectedMatInfo
                ? `Maks. ${selectedMatInfo.total_issued} ${selectedMatInfo.unit || 'unit'}`
                : 'Pilih material terlebih dahulu...'
            }
          />
        </div>

        {isOverReturn && (
          <div className="text-sm text-status-danger mt-1">
            Cannot return more than was issued ({selectedMatInfo?.total_issued.toFixed(2)} {selectedMatInfo?.unit || ''}).
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={!selectedMaterial || !returnQty || isOverReturn || !user}
            className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-6 rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Return Material
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
