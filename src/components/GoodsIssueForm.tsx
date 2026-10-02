import React, { useState, useEffect } from 'react';
import { Package, CheckCircle2, Lock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const MOCK_MATERIALS = [
  { id: 'M-001', name: 'Plat Besi 2mm', unit: 'Lembar' },
  { id: 'M-002', name: 'Cat Merah', unit: 'Liter' },
  { id: 'M-003', name: 'Kabel 2.5mm', unit: 'Roll' },
];

// Note: RAB Data is still mocked because the RAB schema is not yet implemented.
const MOCK_RAB_DATA = {
  'SPK-10024': {
    'M-001': { rabQty: 100, wasteFactor: 5, issuedQty: 90 }, // Max: 105, Remaining: 15
    'M-002': { rabQty: 50, wasteFactor: 10, issuedQty: 55 }, // Max: 55, Remaining: 0
  },
  'SPK-10025': {
    'M-003': { rabQty: 20, wasteFactor: 5, issuedQty: 10 }, // Max: 21, Remaining: 11
  }
};

interface GoodsIssueFormProps {
  onSuccess?: () => void;
}

export const GoodsIssueForm: React.FC<GoodsIssueFormProps> = ({ onSuccess }) => {
  const [spks, setSpks] = useState<any[]>([]);

  useEffect(() => {
    fetchSpks();
  }, []);

  const fetchSpks = async () => {
    const { data, error } = await supabase.from('spk').select('*').neq('status', 'CANCELLED').order('created_at', { ascending: false });
    if (data) setSpks(data);
    if (error) console.error('Error fetching SPKs:', error);
  };
  const [selectedSpk, setSelectedSpk] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [requestQty, setRequestQty] = useState<string>('');

  const spkRabData = selectedSpk ? (MOCK_RAB_DATA as any)[selectedSpk] : null;
  const materialRab = (spkRabData && selectedMaterial) ? spkRabData[selectedMaterial] : null;

  let maxAllowed = 0;
  let remainingAllowed = 0;
  let isOverbudget = false;

  if (materialRab) {
    maxAllowed = materialRab.rabQty * (1 + (materialRab.wasteFactor / 100));
    remainingAllowed = maxAllowed - materialRab.issuedQty;
    isOverbudget = parseFloat(requestQty || '0') > remainingAllowed;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOverbudget && requestQty && remainingAllowed > 0) {
      alert(`Berhasil mengeluarkan ${requestQty} unit material untuk ${selectedSpk}`);
      // In a real app, this would mutate the DB via Supabase
      setRequestQty('');
      if (onSuccess) onSuccess();
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
                setSelectedMaterial('');
              }}
              className="w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none"
            >
              <option value="">-- Choose SPK --</option>
              {spks.map(spk => (
                <option key={spk.id} value={spk.spk_no}>{spk.spk_no} - {spk.customer_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Select Material</label>
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              disabled={!selectedSpk}
              className="w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none disabled:opacity-50"
            >
              <option value="">-- Choose Material --</option>
              {MOCK_MATERIALS.map(mat => (
                <option key={mat.id} value={mat.id}>{mat.name} ({mat.unit})</option>
              ))}
            </select>
          </div>
        </div>

        {materialRab && (
          <div className="bg-background border border-border p-4 rounded-lg grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-text-muted uppercase font-mono">RAB Estimate</div>
              <div className="font-medium">{materialRab.rabQty} (Waste {materialRab.wasteFactor}%)</div>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase font-mono">Max Allowed</div>
              <div className="font-medium">{maxAllowed}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase font-mono">Remaining Budget</div>
              <div className={`font-medium ${remainingAllowed <= 0 ? 'text-status-danger' : 'text-status-success'}`}>
                {remainingAllowed}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm text-text-muted mb-1">Request Quantity</label>
          <input
            type="number"
            min="1"
            value={requestQty}
            onChange={(e) => setRequestQty(e.target.value)}
            disabled={!materialRab || remainingAllowed <= 0}
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
                Requested quantity ({requestQty}) exceeds the remaining allowable budget ({remainingAllowed}).
                This issue is blocked until authorized by the Owner via a Change Order (Amandemen SPK).
              </p>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={!selectedMaterial || !requestQty || isOverbudget || remainingAllowed <= 0}
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
