import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface Material {
  id: string;
  name: string;
  current_stock: number;
}

interface MaterialRequisitionFormProps {
  spkId: string;
  wbsCategory: string;
  onClose: () => void;
}

export const MaterialRequisitionForm: React.FC<MaterialRequisitionFormProps> = ({
  spkId,
  wbsCategory,
  onClose
}) => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [items, setItems] = useState<{ materialId: string; quantity: number }[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    const { data, error } = await supabase
      .from('materials')
      .select('id, name, current_stock')
      .order('name');
    if (error) {
      console.error('Error fetching materials:', error);
    } else {
      setMaterials(data as Material[]);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { materialId: '', quantity: 1 }]);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validate
    const validItems = items.filter(item => item.materialId && item.quantity > 0);
    if (validItems.length === 0) {
      alert('Please add at least one valid material with quantity > 0');
      return;
    }

    setLoading(true);
    try {
      // 1. Create requisition
      const { data: reqData, error: reqError } = await supabase
        .from('material_requisitions')
        .insert({
          spk_id: spkId,
          wbs_category: wbsCategory,
          requested_by: user.id,
          notes: notes,
          status: 'PENDING'
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // 2. Insert items
      const itemsToInsert = validItems.map(item => ({
        requisition_id: reqData.id,
        material_id: item.materialId,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('material_requisition_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      alert('Material Requisition submitted successfully');
      onClose();
    } catch (error: any) {
      console.error('Error submitting requisition:', error);
      alert('Failed to submit requisition: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
      <div className="bg-surface rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-xl font-display font-semibold text-text">Minta Material (Requisition)</h2>
            <p className="text-sm text-text-muted mt-1">{wbsCategory}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            &times;
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="requisition-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Material Items</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary/90"
                >
                  + Add Item
                </button>
              </div>

              {items.length === 0 && (
                <div className="text-center py-4 text-text-muted border border-dashed border-border rounded">
                  No items added. Click "+ Add Item" to begin.
                </div>
              )}

              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Material</label>
                    <select
                      value={item.materialId}
                      onChange={(e) => handleItemChange(index, 'materialId', e.target.value)}
                      className="w-full p-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    >
                      <option value="">Select Material...</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} (Stock: {m.current_stock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-sm font-medium mb-1">Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                      className="w-full p-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-2 text-status-danger hover:bg-status-danger/10 rounded"
                    title="Remove item"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary h-24"
                placeholder="Any special instructions or reasons..."
              />
            </div>
            
          </form>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3 bg-background/50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface border border-border rounded hover:bg-background transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="requisition-form"
            disabled={loading || items.length === 0}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Requisition'}
          </button>
        </div>
      </div>
    </div>
  );
};
