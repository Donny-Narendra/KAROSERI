import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ProductPackage } from '../types/package';

export interface RabItemPayload {
  wbsCategory: string;
  type: 'material' | 'labor' | 'overhead';
  description: string;
  qty: number;
  unitPrice: number;
  wasteFactor?: number;
}

interface PackageAllocationModalProps {
  packageData: ProductPackage;
  isOpen: boolean;
  onClose: () => void;
  onApply: (allocatedItems: RabItemPayload[]) => void;
  existingItems?: {
    wbsCategory: string;
    type: 'material' | 'labor' | 'overhead';
    description: string;
    qty: number;
    unitPrice: number;
  }[];
}

const WBS_CATEGORIES = [
  'Pembongkaran',
  'Sasis/Rangka',
  'Dinding/Fabrikasi',
  'Cat/Finishing',
  'Kelistrikan/Hidrolik',
];

type AllocationState = {
  [itemIndex: number]: {
    [category: string]: string;
  };
};

export const PackageAllocationModal: React.FC<PackageAllocationModalProps> = ({
  packageData,
  isOpen,
  onClose,
  onApply,
  existingItems,
}) => {
  const [allocations, setAllocations] = useState<AllocationState>({});

  useEffect(() => {
    if (isOpen && packageData.items) {
      const initial: AllocationState = {};
      packageData.items.forEach((item, idx) => {
        initial[idx] = {};
        const desc = item.item_type === 'MATERIAL' ? (item.material?.name || 'Unknown Material') : (item.labor_name || 'Unknown Labor');
        WBS_CATEGORIES.forEach((cat) => {
          const match = existingItems?.find(e => e.wbsCategory === cat && e.description === desc);
          initial[idx][cat] = match && match.qty > 0 ? String(match.qty) : '';
        });
      });
      setAllocations(initial);
    }
  }, [isOpen, packageData, existingItems]);

  if (!isOpen) return null;

  const items = packageData.items || [];

  const handleAllocationChange = (itemIdx: number, cat: string, val: string) => {
    setAllocations((prev) => ({
      ...prev,
      [itemIdx]: {
        ...prev[itemIdx],
        [cat]: val,
      },
    }));
  };

  const isAllAllocated = items.every((item, idx) => {
    const totalAllocated = WBS_CATEGORIES.reduce((sum, cat) => sum + (parseFloat(allocations[idx]?.[cat]) || 0), 0);
    // Use a small epsilon for floating point comparison
    return Math.abs(totalAllocated - item.quantity) < 0.001;
  });

  const handleApply = () => {
    if (!isAllAllocated) return;

    const payload: RabItemPayload[] = [];

    items.forEach((item, idx) => {
      WBS_CATEGORIES.forEach((cat) => {
        const qty = parseFloat(allocations[idx]?.[cat]) || 0;
        if (qty > 0) {
          payload.push({
            wbsCategory: cat,
            type: item.item_type === 'MATERIAL' ? 'material' : 'labor',
            description: item.item_type === 'MATERIAL' ? (item.material?.name || 'Unknown Material') : (item.labor_name || 'Unknown Labor'),
            qty,
            unitPrice: item.cost_per_unit,
            wasteFactor: 0,
          });
        }
      });
    });

    onApply(payload);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background shrink-0">
          <h3 className="font-bold text-lg text-text">Alokasi Material Paket ke Tahap WBS</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-background">
          <div className="mb-4">
            <h4 className="font-bold text-primary">{packageData.name}</h4>
            <p className="text-sm text-text-muted">Bagi kuota masing-masing komponen (Bahan/Jasa) ke dalam 5 tahapan WBS.</p>
          </div>

          <div className="overflow-x-auto border border-border rounded">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface text-text-muted text-xs uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-surface z-10">Komponen</th>
                  <th className="px-4 py-3 text-center">Total Kuota</th>
                  {WBS_CATEGORIES.map((cat, i) => (
                    <th key={cat} className="px-2 py-3 text-center w-24">WBS {i + 1}</th>
                  ))}
                  <th className="px-4 py-3 text-center">Sisa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, idx) => {
                  const totalAllocated = WBS_CATEGORIES.reduce((sum, cat) => sum + (parseFloat(allocations[idx]?.[cat]) || 0), 0);
                  const remaining = item.quantity - totalAllocated;
                  const isZero = Math.abs(remaining) < 0.001;

                  return (
                    <tr key={idx} className="hover:bg-surface-hover/30">
                      <td className="px-4 py-3 sticky left-0 bg-background z-10">
                        <div className="font-medium text-text">
                          {item.item_type === 'MATERIAL' ? item.material?.name : item.labor_name}
                        </div>
                        <div className="text-[10px] text-text-muted uppercase">
                          {item.item_type}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-text">
                        {item.quantity}
                      </td>
                      {WBS_CATEGORIES.map((cat) => (
                        <td key={cat} className="px-1 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={allocations[idx]?.[cat] || ''}
                            onChange={(e) => handleAllocationChange(idx, cat, e.target.value)}
                            className="w-20 mx-auto block bg-surface border border-border rounded px-2 py-1 text-center font-mono focus:border-primary focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                          isZero ? 'bg-status-success/20 text-status-success' : 'bg-status-danger/20 text-status-danger'
                        }`}>
                          {isZero ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {remaining > 0 ? `Sisa: ${remaining.toFixed(2)}` : remaining < 0 ? `Over: ${Math.abs(remaining).toFixed(2)}` : 'PASSED'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-surface flex justify-end gap-3 shrink-0 items-center">
          {!isAllAllocated && (
            <div className="text-sm text-status-warning flex items-center gap-2 mr-auto font-medium">
              <AlertTriangle className="w-4 h-4" />
              Sisa kuota semua material harus 0 sebelum diterapkan
            </div>
          )}
          <button 
            onClick={onClose}
            className="px-4 py-2 text-text-muted hover:text-text font-medium transition"
          >
            Batal
          </button>
          <button 
            onClick={handleApply}
            disabled={!isAllAllocated}
            className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Terapkan ke RAB
          </button>
        </div>
      </div>
    </div>
  );
};
