import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, Save, X, Search, CheckCircle2, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { inventoryService, type Material } from '../services/inventoryService';
import { exportMaterialsToExcel } from '../utils/excelExport';
import { ImportInventoryModal } from './ImportInventoryModal';
import { RestockModal } from './RestockModal';
import { MaterialAuditModal } from './MaterialAuditModal';
import { Upload, PackagePlus, History } from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [auditMaterial, setAuditMaterial] = useState<Material | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'pcs',
    current_stock: 0,
    minimum_stock: 0,
    unit_price: 0,
    waste_factor_percentage: 0
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Bulk delete state
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getMaterials();
      setMaterials(data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data inventaris');
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

  const handleOpenModal = (material?: Material) => {
    setError(null);
    if (material) {
      setEditingMaterial(material);
      setFormData({
        name: material.name,
        unit: material.unit,
        current_stock: material.current_stock,
        minimum_stock: material.minimum_stock,
        unit_price: material.unit_price,
        waste_factor_percentage: material.waste_factor_percentage
      });
    } else {
      setEditingMaterial(null);
      setFormData({
        name: '',
        unit: 'pcs',
        current_stock: 0,
        minimum_stock: 0,
        unit_price: 0,
        waste_factor_percentage: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (editingMaterial) {
        await inventoryService.updateMaterial(editingMaterial.id, formData);
        showMessage('Material berhasil diperbarui');
      } else {
        await inventoryService.addMaterial(formData);
        showMessage('Material berhasil ditambahkan');
      }
      setIsModalOpen(false);
      loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (id: string) => {
    try {
      const inUse = await inventoryService.checkMaterialUsage(id);
      if (inUse) {
        showMessage('Material tidak dapat dihapus karena sudah digunakan dalam transaksi', true);
        return;
      }
      setDeleteConfirmId(id);
    } catch (err: any) {
      showMessage('Gagal mengecek status material', true);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await inventoryService.deleteMaterial(deleteConfirmId);
      showMessage('Material berhasil dihapus');
      loadMaterials();
    } catch (err: any) {
      showMessage(err.message || 'Gagal menghapus material', true);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedMaterialIds(filteredMaterials.map(m => m.id));
    } else {
      setSelectedMaterialIds([]);
    }
  };

  const handleSelectMaterial = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedMaterialIds(prev => [...prev, id]);
    } else {
      setSelectedMaterialIds(prev => prev.filter(mId => mId !== id));
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedMaterialIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await inventoryService.bulkDeleteMaterials(selectedMaterialIds);
      showMessage(`${selectedMaterialIds.length} material berhasil dihapus`);
      setSelectedMaterialIds([]);
      setIsBulkDeleteModalOpen(false);
      loadMaterials();
    } catch (err: any) {
      showMessage(err.message || 'Gagal menghapus material', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const paginatedMaterials = filteredMaterials.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col font-sans">
      <div className="p-5 border-b border-border bg-surface-hover flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-bold text-text font-display flex items-center gap-2">
          Manajemen Inventaris
        </h3>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Cari material..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded pl-9 pr-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
            />
          </div>
          <button 
            onClick={() => exportMaterialsToExcel(materials)}
            className="bg-surface-hover hover:bg-border text-text border border-border px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1.5 shrink-0"
            title="Download Data Stok (Excel)"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-surface-hover hover:bg-border text-text border border-border px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1.5 shrink-0"
            title="Import Data Stok (Excel)"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button 
            onClick={() => setIsRestockModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1.5 shrink-0"
            title="Restock Material"
          >
            <PackagePlus className="w-4 h-4" />
            Restock
          </button>
          {selectedMaterialIds.length > 0 && (
            <button 
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="bg-status-danger hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1.5 shrink-0"
              title="Hapus Terpilih"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Terpilih ({selectedMaterialIds.length})
            </button>
          )}
          <button 
            onClick={() => handleOpenModal()}
            className="bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 bg-status-danger/10 border border-status-danger/30 rounded text-status-danger text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="mx-5 mt-4 p-3 bg-status-success/10 border border-status-success/30 rounded text-status-success text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}

      <div className="overflow-x-auto p-5">
        <table className="w-full text-left text-sm text-text border border-border">
          <thead className="bg-background text-text-muted font-mono text-xs uppercase border-b border-border">
            <tr>
              <th className="px-4 py-3 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                  checked={filteredMaterials.length > 0 && selectedMaterialIds.length === filteredMaterials.length}
                  onChange={handleSelectAll}
                  title="Pilih Semua"
                />
              </th>
              <th className="px-4 py-3">Nama Bahan</th>
              <th className="px-4 py-3">Satuan</th>
              <th className="px-4 py-3 text-right">Stok Saat Ini</th>
              <th className="px-4 py-3 text-right">Stok Min</th>
              <th className="px-4 py-3 text-right">Harga Satuan (Rp)</th>
              <th className="px-4 py-3 text-right">Waste %</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted">Loading data...</td>
              </tr>
            ) : filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted">Tidak ada material ditemukan.</td>
              </tr>
            ) : (
              paginatedMaterials.map((m) => (
                <tr key={m.id} className="hover:bg-surface-hover/50 transition">
                  <td className="px-4 py-3 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                      checked={selectedMaterialIds.includes(m.id)}
                      onChange={(e) => handleSelectMaterial(m.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-text-muted">{m.unit}</td>
                  <td className={`px-4 py-3 text-right font-mono ${m.current_stock <= m.minimum_stock ? 'text-status-danger font-bold' : ''}`}>
                    {m.current_stock}
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted font-mono">{m.minimum_stock}</td>
                  <td className="px-4 py-3 text-right font-mono text-text-muted">
                    {new Intl.NumberFormat('id-ID').format(m.unit_price)}
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted font-mono">{m.waste_factor_percentage}%</td>
                  <td className="px-4 py-3 flex justify-center gap-2">
                    <button 
                      onClick={() => setAuditMaterial(m)}
                      className="text-blue-500 hover:text-blue-700 p-1 rounded transition"
                      title="Riwayat Audit"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleOpenModal(m)}
                      className="text-primary hover:text-primary-hover p-1 rounded transition"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(m.id)}
                      className="text-status-danger hover:text-red-400 p-1 rounded transition"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-5 py-4 border-t border-border flex items-center justify-between bg-surface">
          <span className="text-sm text-text-muted">
            Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredMaterials.length)} dari {filteredMaterials.length} material
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-border hover:bg-surface-hover disabled:opacity-50 text-text transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm px-2 text-text font-medium">
              Hal {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-border hover:bg-surface-hover disabled:opacity-50 text-text transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background">
              <h3 className="font-bold text-lg text-text">
                {editingMaterial ? 'Edit Material' : 'Tambah Material Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Nama Barang</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-primary"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">Satuan</label>
                    <select 
                      value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-primary"
                    >
                      <option value="pcs">pcs</option>
                      <option value="lembar">lembar</option>
                      <option value="batang">batang</option>
                      <option value="kaleng">kaleng</option>
                      <option value="tube">tube</option>
                      <option value="set">set</option>
                      <option value="liter">liter</option>
                      <option value="kg">kg</option>
                      <option value="meter">meter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">Stok Awal</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      step="0.01"
                      value={formData.current_stock}
                      onChange={e => setFormData({...formData, current_stock: parseFloat(e.target.value) || 0})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">Stok Minimum</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      step="0.01"
                      value={formData.minimum_stock}
                      onChange={e => setFormData({...formData, minimum_stock: parseFloat(e.target.value) || 0})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">Harga Satuan (Rp)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      value={formData.unit_price}
                      onChange={e => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Waste Factor (%)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.waste_factor_percentage}
                    onChange={e => setFormData({...formData, waste_factor_percentage: parseFloat(e.target.value) || 0})}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-primary font-mono"
                  />
                  <p className="text-xs text-text-muted mt-1">Persentase toleransi sisa bahan (0-100)</p>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-text-muted hover:text-text font-medium transition"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded font-medium transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Simpan
                </button>
              </div>
            </form>
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
            <h3 className="font-bold text-lg text-text mb-2">Hapus Material?</h3>
            <p className="text-text-muted mb-6">
              Tindakan ini tidak dapat dibatalkan. Data material akan dihapus permanen dari sistem.
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

      {/* Import Modal */}
      {isImportModalOpen && (
        <ImportInventoryModal 
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={(msg) => {
            showMessage(msg);
            loadMaterials();
          }}
          existingMaterials={materials}
        />
      )}

      {/* Restock Modal */}
      <RestockModal 
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        onSuccess={(msg) => {
          showMessage(msg);
          loadMaterials();
        }}
        materials={materials}
      />

      {/* Audit Modal */}
      {auditMaterial && (
        <MaterialAuditModal
          isOpen={true}
          onClose={() => setAuditMaterial(null)}
          material={auditMaterial}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-status-danger/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-status-danger" />
            </div>
            <h3 className="font-bold text-lg text-text mb-2">Hapus {selectedMaterialIds.length} Material?</h3>
            <p className="text-text-muted mb-6">
              Tindakan ini tidak dapat dibatalkan. Material yang sudah digunakan dalam transaksi tidak akan ikut terhapus.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-status-danger/10 border border-status-danger/30 rounded text-status-danger text-sm text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 border border-border rounded text-text-muted hover:text-text hover:bg-surface-hover font-medium transition"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button 
                onClick={confirmBulkDelete}
                className="px-4 py-2 bg-status-danger hover:bg-red-600 text-white rounded font-medium transition flex items-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
