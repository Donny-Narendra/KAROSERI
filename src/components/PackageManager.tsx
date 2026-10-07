import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, Save, X, Search, CheckCircle2, Calculator } from 'lucide-react';
import { packageService } from '../services/packageService';
import { inventoryService, type Material } from '../services/inventoryService';
import type { ProductPackage, PackageItem } from '../types/package';
import { MaterialAutocomplete } from './MaterialAutocomplete';

export const PackageManager: React.FC = () => {
  const [packages, setPackages] = useState<ProductPackage[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ProductPackage | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [items, setItems] = useState<Partial<PackageItem>[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pkgs, mats] = await Promise.all([
        packageService.getPackages(),
        inventoryService.getMaterials()
      ]);
      setPackages(pkgs);
      setMaterials(mats);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3000);
  };

  const handleOpenModal = (pkg?: ProductPackage) => {
    setError(null);
    if (pkg) {
      setEditingPackage(pkg);
      setName(pkg.name);
      setSellingPrice(pkg.selling_price);
      setItems(pkg.items?.map(i => ({
        ...i,
        material: i.material
      })) || []);
    } else {
      setEditingPackage(null);
      setName('');
      setSellingPrice(0);
      setItems([]);
    }
    setIsModalOpen(true);
  };

  const handleAddNewMaterialRow = (material: Material) => {
    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.item_type === 'MATERIAL' && item.material_id === material.id
      );

      if (existingIndex > -1) {
        const updatedItems = [...prevItems];
        const targetItem = updatedItems[existingIndex];
        const newQty = Number(targetItem.quantity || 0) + 1;
        
        updatedItems[existingIndex] = {
          ...targetItem,
          quantity: newQty,
        };
        return updatedItems;
      }

      return [
        ...prevItems,
        {
          item_type: 'MATERIAL',
          material_id: material.id,
          labor_name: null,
          quantity: 1,
          cost_per_unit: material.unit_price || 0,
        }
      ];
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof PackageItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    
    // Type casting needed due to dynamic field assignment
    (item as any)[field] = value;

    if (field === 'material_id') {
      const selectedMaterial = materials.find(m => m.id === value);
      if (selectedMaterial) {
        item.cost_per_unit = selectedMaterial.unit_price;
      }
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      showMessage('Nama paket wajib diisi', true);
      return;
    }
    
    // Validate items
    const invalidItem = items.find(i => 
      (i.item_type === 'MATERIAL' && !i.material_id) ||
      (i.item_type === 'LABOR' && !i.labor_name?.trim())
    );

    if (invalidItem) {
      showMessage('Pastikan semua rincian komponen (Material/Jasa) terisi dengan benar', true);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formattedItems = items.map(i => ({
      item_type: i.item_type as 'MATERIAL'|'LABOR',
      material_id: i.material_id,
      labor_name: i.labor_name,
      quantity: i.quantity || 1,
      cost_per_unit: i.cost_per_unit || 0
    }));

    try {
      if (editingPackage) {
        await packageService.updatePackageWithItems(editingPackage.id, {
          name, selling_price: sellingPrice
        }, formattedItems);
        showMessage('Paket berhasil diperbarui');
      } else {
        await packageService.createPackageWithItems({
          name, selling_price: sellingPrice
        }, formattedItems);
        showMessage('Paket berhasil ditambahkan');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan paket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await packageService.deletePackage(deleteConfirmId);
      showMessage('Paket berhasil dihapus');
      loadData();
    } catch (err: any) {
      showMessage(err.message || 'Gagal menghapus paket', true);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const filteredPackages = packages.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculations for current form
  const totalHPP = useMemo(() => {
    return items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.cost_per_unit || 0)), 0);
  }, [items]);

  const marginRp = sellingPrice - totalHPP;
  const marginPercent = sellingPrice > 0 ? (marginRp / sellingPrice) * 100 : 0;

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col font-sans">
      <div className="p-5 border-b border-border bg-surface-hover flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-bold text-text font-display flex items-center gap-2">
          Paket Barang Jadi (Assembly List)
        </h3>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Cari paket..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded pl-9 pr-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Buat Paket Baru
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 bg-status-danger/10 border border-status-danger/30 rounded text-status-danger text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="mx-5 mt-4 p-3 bg-status-success/10 border border-status-success/30 rounded text-status-success text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="overflow-x-auto p-5">
        <table className="w-full text-left text-sm text-text border border-border">
          <thead className="bg-background text-text-muted font-mono text-xs uppercase border-b border-border">
            <tr>
              <th className="px-4 py-3">Nama Paket</th>
              <th className="px-4 py-3">Komponen (Bahan & Jasa)</th>
              <th className="px-4 py-3 text-right">Total HPP (Modal)</th>
              <th className="px-4 py-3 text-right">Harga Jual</th>
              <th className="px-4 py-3 text-right">Margin Keuntungan</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">Loading data...</td>
              </tr>
            ) : filteredPackages.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">Tidak ada paket ditemukan.</td>
              </tr>
            ) : (
              filteredPackages.map((p) => {
                const hpp = (p.items || []).reduce((sum, item) => sum + (item.quantity * item.cost_per_unit), 0);
                const margin = p.selling_price - hpp;
                const mPercent = p.selling_price > 0 ? (margin / p.selling_price) * 100 : 0;
                
                return (
                  <tr key={p.id} className="hover:bg-surface-hover/50 transition">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {p.items?.length || 0} item
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {new Intl.NumberFormat('id-ID').format(hpp)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-primary font-bold">
                      {new Intl.NumberFormat('id-ID').format(p.selling_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={margin > 0 ? 'text-status-success' : margin < 0 ? 'text-status-danger' : 'text-text-muted'}>
                        {new Intl.NumberFormat('id-ID').format(margin)} ({mPercent.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 flex justify-center gap-2">
                      <button 
                        onClick={() => handleOpenModal(p)}
                        className="text-primary hover:text-primary-hover p-1 rounded transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(p.id)}
                        className="text-status-danger hover:text-red-400 p-1 rounded transition"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background shrink-0">
              <h3 className="font-bold text-lg text-text">
                {editingPackage ? 'Edit Paket (Assembly List)' : 'Buat Paket Baru (Assembly List)'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Nama Paket Barang Jadi</label>
                  <input 
                    type="text" 
                    required
                    placeholder="misal: HPP DUDUKAN SLEBOR"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Harga Jual Akhir (Rp)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-primary font-mono font-bold text-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-start gap-4 mb-3">
                <h4 className="font-medium text-text shrink-0">Inventory</h4>
                <div className="w-full max-w-sm relative z-50">
                  <MaterialAutocomplete
                    materials={materials}
                    initialValue=""
                    onSelect={handleAddNewMaterialRow}
                    placeholder="Ketik & pilih bahan baku..."
                    clearOnSelect={true}
                  />
                </div>
              </div>

              <div className="border border-border rounded">
                <table className="w-full text-left text-sm">
                  <thead className="bg-background text-text-muted border-b border-border">
                    <tr>
                      <th className="px-3 py-2 w-24">Tipe</th>
                      <th className="px-3 py-2">Nama Komponen</th>
                      <th className="px-3 py-2 w-24 text-right">Qty</th>
                      <th className="px-3 py-2 w-32 text-right">Biaya Satuan</th>
                      <th className="px-3 py-2 w-32 text-right">Total Biaya</th>
                      <th className="px-3 py-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-text-muted text-sm">
                          Belum ada komponen. Cari dan pilih bahan baku inventaris di atas.
                        </td>
                      </tr>
                    ) : items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                            item.item_type === 'MATERIAL' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'
                          }`}>
                            {item.item_type === 'MATERIAL' ? 'BAHAN' : 'JASA'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {item.item_type === 'MATERIAL' ? (
                            <span className="text-sm font-medium">
                              {materials.find(m => m.id === item.material_id)?.name || 'Material tidak ditemukan'}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={item.labor_name || ''}
                              placeholder="Cth: Tukang Bending"
                              onChange={(e) => handleItemChange(index, 'labor_name', e.target.value)}
                              className="w-full bg-background border border-border rounded px-2 py-1 text-sm focus:border-primary focus:outline-none"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity || 0}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-right font-mono focus:border-primary focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={item.cost_per_unit || 0}
                            onChange={(e) => handleItemChange(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-right font-mono focus:border-primary focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-medium">
                          {new Intl.NumberFormat('id-ID').format((item.quantity || 0) * (item.cost_per_unit || 0))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-text-muted hover:text-status-danger p-1 rounded transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Calculator */}
              <div className="mt-6 bg-background rounded-lg border border-border p-4 flex flex-col md:flex-row gap-6 md:items-end justify-between">
                <div className="flex items-center gap-3 text-text-muted">
                  <Calculator className="w-8 h-8 opacity-50" />
                  <div>
                    <div className="text-xs uppercase tracking-wider font-medium">Estimasi HPP (Modal)</div>
                    <div className="text-xl font-bold font-mono text-text">
                      Rp {new Intl.NumberFormat('id-ID').format(totalHPP)}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider font-medium text-text-muted">Proyeksi Keuntungan</div>
                  <div className={`text-xl font-bold font-mono ${marginRp > 0 ? 'text-status-success' : marginRp < 0 ? 'text-status-danger' : 'text-text'}`}>
                    Rp {new Intl.NumberFormat('id-ID').format(marginRp)}
                    <span className="text-sm ml-2 opacity-80">({marginPercent.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="px-6 py-4 border-t border-border bg-background flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-text-muted hover:text-text font-medium transition"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded font-medium transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Menyimpan...' : 'Simpan Paket Assembly List'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-status-danger/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-status-danger" />
            </div>
            <h3 className="font-bold text-lg text-text mb-2">Hapus Paket?</h3>
            <p className="text-text-muted mb-6">
              Tindakan ini tidak dapat dibatalkan. Paket beserta resep Assembly List-nya akan dihapus permanen.
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-border rounded text-text-muted hover:text-text hover:bg-surface-hover font-medium transition"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-status-danger hover:bg-red-600 text-white rounded font-medium transition"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
