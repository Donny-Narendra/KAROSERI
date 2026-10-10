import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { inventoryService, type Material } from '../services/inventoryService';
import { MaterialAutocomplete } from './MaterialAutocomplete';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  materials: Material[];
}

export const RestockModal: React.FC<RestockModalProps> = ({ isOpen, onClose, onSuccess, materials }) => {
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [addedQuantity, setAddedQuantity] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setSelectedMaterial(null);
    setAddedQuantity(0);
    setNotes('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) {
      setError('Pilih material terlebih dahulu.');
      return;
    }
    if (addedQuantity <= 0) {
      setError('Jumlah penambahan harus lebih besar dari 0.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await inventoryService.restockMaterial(selectedMaterial.id, addedQuantity, notes);
      onSuccess(`Berhasil restock ${selectedMaterial.name} sebanyak ${addedQuantity} ${selectedMaterial.unit}`);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan stok.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background">
          <h3 className="font-bold text-lg text-text">Restock Material</h3>
          <button onClick={handleClose} className="text-text-muted hover:text-text">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-visible">
          {error && (
            <div className="mb-4 p-3 bg-status-danger/10 border border-status-danger/30 rounded text-status-danger text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Cari Material</label>
              <MaterialAutocomplete 
                key={isOpen ? 'open' : 'closed'} // Force remount to reset internal state when reopened
                materials={materials}
                onSelect={(m) => setSelectedMaterial(m)}
                placeholder="Ketik nama material..."
                initialValue={selectedMaterial ? selectedMaterial.name : ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Stok Saat Ini</label>
                <div className="w-full bg-surface-hover border border-border rounded px-3 py-2 text-text font-mono">
                  {selectedMaterial ? `${selectedMaterial.current_stock} ${selectedMaterial.unit}` : '-'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Jumlah Penambahan</label>
                <input 
                  type="number" 
                  required
                  min="0.01"
                  step="0.01"
                  value={addedQuantity || ''}
                  onChange={e => setAddedQuantity(parseFloat(e.target.value) || 0)}
                  disabled={!selectedMaterial}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-primary font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Stok Baru (Estimasi)</label>
              <div className={`w-full border rounded px-3 py-2 font-mono font-bold ${selectedMaterial ? 'bg-status-success/10 border-status-success/30 text-status-success' : 'bg-surface-hover border-border text-text-muted'}`}>
                {selectedMaterial ? `${(selectedMaterial.current_stock + addedQuantity).toFixed(2)} ${selectedMaterial.unit}` : '-'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Catatan / Referensi (Opsional)</label>
              <input 
                type="text" 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Contoh: Surat Jalan SJ-12345"
                disabled={!selectedMaterial}
                className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-3">
            <button 
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-text-muted hover:text-text font-medium transition"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button 
              type="submit"
              disabled={isSubmitting || !selectedMaterial || addedQuantity <= 0}
              className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Simpan & Tambahkan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
