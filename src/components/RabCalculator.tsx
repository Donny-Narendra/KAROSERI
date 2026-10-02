import React, { useState } from 'react';
import { Calculator, Plus, Trash2, DollarSign } from 'lucide-react';

interface RabItem {
  id: string;
  type: 'material' | 'labor';
  description: string;
  qty: number;
  unitPrice: number;
  wasteFactor?: number; // percentage (0-100)
}

export const RabCalculator: React.FC<{ spkId: string }> = ({ spkId }) => {
  const [items, setItems] = useState<RabItem[]>([]);
  const [wbsCategory, setWbsCategory] = useState('1'); // 1-5
  
  const [newItem, setNewItem] = useState<Partial<RabItem>>({
    type: 'material',
    qty: 1,
    unitPrice: 0,
    wasteFactor: 5,
  });

  const wbsCategories = [
    { id: '1', label: 'WBS 1: Body Construction & Frame' },
    { id: '2', label: 'WBS 2: Electrical & Wiring' },
    { id: '3', label: 'WBS 3: Interior & Upholstery' },
    { id: '4', label: 'WBS 4: Painting & Finishing' },
    { id: '5', label: 'WBS 5: Final Assembly & QC' },
  ];

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description || !newItem.qty || newItem.unitPrice === undefined) return;
    
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        type: newItem.type as 'material' | 'labor',
        description: newItem.description,
        qty: newItem.qty,
        unitPrice: newItem.unitPrice,
        wasteFactor: newItem.type === 'material' ? newItem.wasteFactor : 0,
      }
    ]);
    
    setNewItem({
      type: newItem.type,
      qty: 1,
      unitPrice: 0,
      wasteFactor: newItem.type === 'material' ? 5 : 0,
    });
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateItemTotal = (item: RabItem) => {
    if (item.type === 'material') {
      const wasteMultiplier = 1 + (item.wasteFactor || 0) / 100;
      return item.qty * item.unitPrice * wasteMultiplier;
    }
    return item.qty * item.unitPrice;
  };

  const totalCost = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-surface-hover">
         <h3 className="font-bold text-text font-display flex items-center gap-2">
           <Calculator className="w-5 h-5 text-primary"/> RAB Calculator
         </h3>
      </div>
      
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col - Input Form */}
        <div className="lg:col-span-1 space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2 font-mono">WBS Category</label>
            <select
              value={wbsCategory}
              onChange={(e) => setWbsCategory(e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-primary transition"
            >
              {wbsCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <form onSubmit={handleAddItem} className="bg-background border border-border rounded-lg p-4 space-y-4">
            <h4 className="font-bold text-sm text-text border-b border-border pb-2">Add Estimation Item</h4>
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                <input 
                  type="radio" 
                  name="type" 
                  value="material"
                  checked={newItem.type === 'material'}
                  onChange={() => setNewItem({...newItem, type: 'material'})}
                  className="accent-primary"
                />
                Material
              </label>
              <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                <input 
                  type="radio" 
                  name="type" 
                  value="labor"
                  checked={newItem.type === 'labor'}
                  onChange={() => setNewItem({...newItem, type: 'labor', wasteFactor: 0})}
                  className="accent-primary"
                />
                Labor
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">Description</label>
              <input
                type="text"
                required
                value={newItem.description || ''}
                onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                placeholder={newItem.type === 'material' ? 'e.g. Steel Plate 2mm' : 'e.g. Welding Specialist'}
                className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                  {newItem.type === 'material' ? 'Qty' : 'Hours'}
                </label>
                <input
                  type="number"
                  required
                  min="0.1"
                  step="0.1"
                  value={newItem.qty || ''}
                  onChange={(e) => setNewItem({...newItem, qty: parseFloat(e.target.value)})}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">Unit Price</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newItem.unitPrice === 0 ? '' : newItem.unitPrice}
                  onChange={(e) => setNewItem({...newItem, unitPrice: parseFloat(e.target.value)})}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {newItem.type === 'material' && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">Waste Factor (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newItem.wasteFactor || ''}
                  onChange={(e) => setNewItem({...newItem, wasteFactor: parseFloat(e.target.value)})}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold py-2 px-4 rounded text-sm transition flex items-center justify-center gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </form>
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
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Waste</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-hover/30 transition">
                        <td className="px-4 py-3 font-medium">{item.description}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono ${item.type === 'material' ? 'bg-status-info/10 text-status-info border border-status-info/20' : 'bg-status-warning/10 text-status-warning border border-status-warning/20'}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{item.qty}</td>
                        <td className="px-4 py-3 text-right font-mono text-text-muted">
                          Rp {item.unitPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-text-muted">
                          {item.type === 'material' ? `${item.wasteFactor}%` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-primary">
                          Rp {calculateItemTotal(item).toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-status-danger hover:text-red-400 p-1 rounded hover:bg-status-danger/10 transition"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Total Footer */}
            <div className="bg-surface border-t border-border p-4 flex items-center justify-between">
               <span className="text-sm font-mono text-text-muted uppercase">Total Estimated Cost</span>
               <div className="flex items-center gap-2">
                 <span className="text-xl font-bold text-status-success">Rp</span>
                 <span className="text-2xl font-bold font-mono text-text">
                   {totalCost.toLocaleString('id-ID')}
                 </span>
               </div>
            </div>

          </div>
          
          <div className="mt-4 flex justify-end">
             <button 
                onClick={() => console.log('Saving RAB for SPK:', spkId, { wbsCategory, items })}
                disabled={items.length === 0}
                className="bg-primary hover:bg-primary-hover disabled:bg-surface disabled:text-text-muted disabled:cursor-not-allowed text-background font-bold py-2 px-6 rounded transition"
             >
                Save Estimation
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};
