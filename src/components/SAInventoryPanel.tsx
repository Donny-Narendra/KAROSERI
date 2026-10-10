import React, { useState, useEffect } from 'react';
import { Package, History, Edit, AlertCircle } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import type { Material, InventoryAuditLog } from '../services/inventoryService';

export const SAInventoryPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'materials' | 'audit'>('materials');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [auditLogs, setAuditLogs] = useState<InventoryAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState<'STOCK' | 'DETAIL'>('DETAIL');

  // Form states
  const [formData, setFormData] = useState<Partial<Material>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getMaterials();
      setMaterials(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getMaterialAuditLogs();
      setAuditLogs(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'materials') {
      fetchMaterials();
    } else {
      fetchLogs();
    }
  }, [activeTab]);

  const openModal = (mat: Material, mode: 'STOCK' | 'DETAIL') => {
    setSelectedMaterial(mat);
    setEditMode(mode);
    setFormData({
      current_stock: mat.current_stock,
      unit_price: mat.unit_price,
      name: mat.name,
      unit: mat.unit,
      minimum_stock: mat.minimum_stock,
    });
    setNotes('');
    setError('');
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    if (!notes.trim()) {
      setError('Catatan/Alasan wajib diisi untuk keperluan audit.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const actionType = editMode === 'STOCK' ? 'STOCK_ADJUSTMENT' : 
                         (formData.unit_price !== selectedMaterial.unit_price ? 'PRICE_CHANGE' : 'DETAIL_UPDATE');
      
      const prevData = {
        current_stock: selectedMaterial.current_stock,
        unit_price: selectedMaterial.unit_price,
        name: selectedMaterial.name,
        unit: selectedMaterial.unit,
        minimum_stock: selectedMaterial.minimum_stock
      };

      await inventoryService.updateMaterialWithAudit(
        selectedMaterial.id,
        formData,
        actionType as any,
        notes,
        prevData
      );

      setShowEditModal(false);
      fetchMaterials();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan data');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="flex border-b border-border bg-surface-hover">
        <button
          onClick={() => setActiveTab('materials')}
          className={`flex items-center gap-2 px-6 py-4 font-medium font-display transition ${activeTab === 'materials' ? 'text-primary border-b-2 border-primary bg-surface' : 'text-text-muted hover:text-text'}`}
        >
          <Package className="w-5 h-5" />
          Daftar Material
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-6 py-4 font-medium font-display transition ${activeTab === 'audit' ? 'text-primary border-b-2 border-primary bg-surface' : 'text-text-muted hover:text-text'}`}
        >
          <History className="w-5 h-5" />
          Audit Trail
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'materials' && (
          <div>
            {loading ? (
              <p className="text-text-muted">Memuat material...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-hover text-text-muted font-mono text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Nama Material</th>
                      <th className="px-4 py-3">Stok</th>
                      <th className="px-4 py-3">Harga Satuan</th>
                      <th className="px-4 py-3">Satuan</th>
                      <th className="px-4 py-3 rounded-tr-lg text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {materials.map(mat => (
                      <tr key={mat.id} className="hover:bg-surface-hover/50">
                        <td className="px-4 py-3 font-medium text-text flex items-center gap-2">
                          {mat.name}
                          {mat.current_stock <= mat.minimum_stock && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-danger opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-danger"></span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono ${mat.current_stock <= mat.minimum_stock ? 'text-status-danger font-bold' : ''}`}>
                            {mat.current_stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-text-muted">
                          Rp {mat.unit_price.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 font-mono text-text-muted">{mat.unit}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openModal(mat, 'STOCK')}
                              className="text-xs bg-surface-active hover:bg-border px-2 py-1 rounded transition text-text font-medium flex items-center gap-1"
                            >
                              <AlertCircle className="w-3 h-3" /> Stok
                            </button>
                            <button
                              onClick={() => openModal(mat, 'DETAIL')}
                              className="text-xs border border-primary text-primary hover:bg-primary hover:text-background px-2 py-1 rounded transition flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div>
            {loading ? (
              <p className="text-text-muted">Memuat log...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-text-muted text-center py-8">Belum ada aktivitas terekam.</p>
            ) : (
              <div className="space-y-4">
                {auditLogs.map(log => (
                  <div key={log.id} className="bg-background border border-border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                          {log.action_type}
                        </span>
                        <span className="text-sm font-medium text-text">
                          {log.profiles?.full_name || log.changed_by}
                        </span>
                        <span className="text-xs text-text-muted font-mono">
                          ({log.profiles?.role})
                        </span>
                      </div>
                      <span className="text-xs text-text-muted font-mono">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                    
                    <p className="text-sm text-text-muted mb-3 italic">"{log.notes}"</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm font-mono bg-surface p-3 rounded">
                      <div>
                        <span className="text-text-muted block text-xs mb-1">Sebelum</span>
                        <pre className="whitespace-pre-wrap text-text">{JSON.stringify(log.previous_data, null, 2)}</pre>
                      </div>
                      <div>
                        <span className="text-text-muted block text-xs mb-1">Sesudah</span>
                        <pre className="whitespace-pre-wrap text-text">{JSON.stringify(log.new_data, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showEditModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-hover">
              <h3 className="font-bold text-lg font-display text-text">
                {editMode === 'STOCK' ? 'Penyesuaian Stok' : 'Edit Material'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-status-danger/10 text-status-danger px-4 py-3 rounded text-sm flex gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              
              <div className="bg-background p-3 rounded border border-border mb-4">
                <p className="text-sm text-text-muted font-mono mb-1">Material ID: {selectedMaterial.id}</p>
                <p className="font-medium text-text">{selectedMaterial.name}</p>
              </div>

              {editMode === 'STOCK' ? (
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Stok Baru ({selectedMaterial.unit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.current_stock ?? ''}
                    onChange={e => setFormData({...formData, current_stock: parseFloat(e.target.value)})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-text font-mono focus:border-primary focus:outline-none transition"
                  />
                  <p className="text-xs text-text-muted mt-1 font-mono">Stok Saat Ini: {selectedMaterial.current_stock}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">
                      Nama Material
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:border-primary focus:outline-none transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Harga Satuan (Rp)
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.unit_price ?? ''}
                        onChange={e => setFormData({...formData, unit_price: parseInt(e.target.value)})}
                        className="w-full bg-background border border-border rounded px-3 py-2 text-text font-mono focus:border-primary focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Stok Minimum
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.minimum_stock ?? ''}
                        onChange={e => setFormData({...formData, minimum_stock: parseFloat(e.target.value)})}
                        className="w-full bg-background border border-border rounded px-3 py-2 text-text font-mono focus:border-primary focus:outline-none transition"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Catatan / Alasan Perubahan <span className="text-status-danger">*</span>
                </label>
                <textarea
                  required
                  placeholder="Contoh: Stok diubah setelah opname fisik / Penyesuaian harga supplier baru"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:border-primary focus:outline-none transition h-24"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-text-muted hover:text-text transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary-hover text-background px-6 py-2 rounded font-medium transition flex items-center gap-2"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan & Catat Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
