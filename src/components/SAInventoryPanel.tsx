import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  History, 
  Edit, 
  AlertCircle, 
  Search, 
  Filter, 
  ChevronsLeft, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsRight, 
  FileText, 
  Calendar, 
  Box 
} from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import type { Material, InventoryAuditLog } from '../services/inventoryService';
import { AuditDiffTable } from './AuditDiffTable';

export const SAInventoryPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'materials' | 'audit'>('materials');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [auditLogs, setAuditLogs] = useState<InventoryAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState<'STOCK' | 'DETAIL'>('DETAIL');

  // Pagination & Filter state for Audit Trail
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');

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
      if (materials.length === 0) {
        fetchMaterials();
      }
      fetchLogs();
    }
  }, [activeTab, materials.length]);

  const openModal = (mat: Material, mode: 'STOCK' | 'DETAIL') => {
    setSelectedMaterial(mat);
    setEditMode(mode);
    setFormData({
      current_stock: mat.current_stock,
      unit_price: mat.unit_price,
      cost_price: mat.cost_price !== undefined ? mat.cost_price : Math.round(mat.unit_price * 0.8),
      selling_price: mat.selling_price !== undefined ? mat.selling_price : mat.unit_price,
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
      const submitData = {
        ...formData,
        unit_price: formData.selling_price || formData.unit_price || 0,
        cost_price: formData.cost_price || 0,
        selling_price: formData.selling_price || formData.unit_price || 0
      };

      const actionType = editMode === 'STOCK' ? 'STOCK_ADJUSTMENT' : 
                         (submitData.unit_price !== selectedMaterial.unit_price || submitData.cost_price !== selectedMaterial.cost_price ? 'PRICE_CHANGE' : 'DETAIL_UPDATE');
      
      const prevData = {
        current_stock: selectedMaterial.current_stock,
        unit_price: selectedMaterial.unit_price,
        cost_price: selectedMaterial.cost_price,
        selling_price: selectedMaterial.selling_price,
        name: selectedMaterial.name,
        unit: selectedMaterial.unit,
        minimum_stock: selectedMaterial.minimum_stock
      };

      await inventoryService.updateMaterialWithAudit(
        selectedMaterial.id,
        submitData,
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

  // Audit filtering & pagination
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Action filter
      if (auditActionFilter !== 'ALL' && log.action_type !== auditActionFilter) {
        return false;
      }
      // Search query
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const matName = (
          log.materials?.name ||
          materials.find(m => m.id === log.material_id)?.name ||
          log.new_data?.name ||
          log.previous_data?.name ||
          ''
        ).toLowerCase();
        const userName = (log.profiles?.full_name || log.changed_by || '').toLowerCase();
        const userRole = (log.profiles?.role || '').toLowerCase();
        const notesText = (log.notes || '').toLowerCase();
        const actionText = log.action_type.toLowerCase();
        return (
          matName.includes(q) ||
          userName.includes(q) ||
          userRole.includes(q) ||
          notesText.includes(q) ||
          actionText.includes(q)
        );
      }
      return true;
    });
  }, [auditLogs, auditActionFilter, auditSearch, materials]);

  const totalAuditItems = filteredAuditLogs.length;
  const totalAuditPages = Math.max(1, Math.ceil(totalAuditItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalAuditPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalAuditItems);
  const paginatedAuditLogs = useMemo(() => {
    return filteredAuditLogs.slice(startIndex, endIndex);
  }, [filteredAuditLogs, startIndex, endIndex]);

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'RESTOCK':
        return {
          label: 'Restock Masuk',
          className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        };
      case 'STOCK_ADJUSTMENT':
        return {
          label: 'Penyesuaian Stok',
          className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
        };
      case 'PRICE_CHANGE':
        return {
          label: 'Perubahan Harga',
          className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        };
      case 'MATERIAL_CREATE':
        return {
          label: 'Material Baru',
          className: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        };
      case 'DETAIL_UPDATE':
        return {
          label: 'Update Detail',
          className: 'bg-slate-700/60 text-slate-300 border border-slate-600/50',
        };
      default:
        return {
          label: actionType,
          className: 'bg-primary/20 text-primary border border-primary/30',
        };
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
                      <th className="px-4 py-3">Harga Modal (HPP)</th>
                      <th className="px-4 py-3">Harga Jual</th>
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
                          Rp {(mat.cost_price || Math.round(mat.unit_price * 0.8)).toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 font-mono text-text font-medium">
                          Rp {(mat.selling_price || mat.unit_price).toLocaleString('id-ID')}
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
          <div className="space-y-4">
            {/* Filter & Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-hover/60 border border-border p-3.5 rounded-lg">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama material, staf, catatan, aksi..."
                  value={auditSearch}
                  onChange={e => {
                    setAuditSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-background border border-border rounded pl-9 pr-8 py-1.5 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none transition"
                />
                {auditSearch && (
                  <button
                    onClick={() => {
                      setAuditSearch('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text p-1"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-text-muted shrink-0" />
                <select
                  value={auditActionFilter}
                  onChange={e => {
                    setAuditActionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-background border border-border rounded px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none transition"
                >
                  <option value="ALL">Semua Tipe Aksi</option>
                  <option value="STOCK_ADJUSTMENT">Penyesuaian Stok</option>
                  <option value="RESTOCK">Restock Masuk</option>
                  <option value="PRICE_CHANGE">Perubahan Harga</option>
                  <option value="DETAIL_UPDATE">Update Detail</option>
                  <option value="MATERIAL_CREATE">Material Baru</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-text-muted flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm">Memuat log audit trail...</p>
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="text-center py-12 text-text-muted border border-dashed border-border rounded-lg bg-surface/30">
                <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Tidak ada aktivitas audit ditemukan.</p>
                {(auditSearch || auditActionFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setAuditSearch('');
                      setAuditActionFilter('ALL');
                      setCurrentPage(1);
                    }}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Reset Filter Pencarian
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedAuditLogs.map(log => {
                    const actionBadge = getActionBadge(log.action_type);
                    const matName =
                      log.materials?.name ||
                      materials.find(m => m.id === log.material_id)?.name ||
                      log.new_data?.name ||
                      log.previous_data?.name ||
                      'Material #' + (log.material_id ? log.material_id.substring(0, 8) : 'Unknown');
                    
                    const unit =
                      log.materials?.unit ||
                      materials.find(m => m.id === log.material_id)?.unit ||
                      log.new_data?.unit ||
                      log.previous_data?.unit;

                    return (
                      <div
                        key={log.id}
                        className="bg-slate-900/60 border border-slate-700/80 rounded-lg p-4 shadow-sm hover:border-slate-600 transition"
                      >
                        {/* Header Kartu Audit */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-mono text-xs px-2.5 py-0.5 rounded font-medium ${actionBadge.className}`}
                            >
                              {actionBadge.label}
                            </span>
                            <div className="flex items-center gap-1.5 font-medium text-text text-sm">
                              <Box className="w-4 h-4 text-primary shrink-0" />
                              <span>{matName}</span>
                            </div>
                            <span className="text-xs text-text-muted font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                              Oleh: {log.profiles?.full_name || log.changed_by.substring(0, 8)}
                              {log.profiles?.role ? ` (${log.profiles.role})` : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono self-start sm:self-auto">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{new Date(log.created_at).toLocaleString('id-ID')}</span>
                          </div>
                        </div>

                        {/* Diff Table */}
                        <AuditDiffTable
                          previousData={log.previous_data}
                          newData={log.new_data}
                          unit={unit}
                        />

                        {/* Catatan / Alasan Perubahan di Bagian Footer */}
                        {log.notes && (
                          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded border border-slate-800/60">
                            <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-text-muted font-medium mr-1.5">Catatan / Alasan:</span>
                              <span className="italic text-slate-200">"{log.notes}"</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border mt-6">
                  <div className="text-xs text-text-muted font-mono">
                    Menampilkan {totalAuditItems === 0 ? 0 : startIndex + 1} - {endIndex} dari {totalAuditItems} riwayat audit
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono">
                      <span>Item per halaman:</span>
                      <select
                        value={pageSize}
                        onChange={e => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-surface border border-border rounded px-2 py-1 text-text text-xs focus:border-primary focus:outline-none"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={safeCurrentPage <= 1}
                        title="Halaman Pertama"
                        className="p-1.5 rounded border border-border bg-surface hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition text-text text-xs flex items-center gap-1"
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Pertama</span>
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={safeCurrentPage <= 1}
                        title="Halaman Sebelumnya"
                        className="p-1.5 rounded border border-border bg-surface hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition text-text text-xs flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Sebelumnya</span>
                      </button>

                      <span className="px-3 py-1 font-mono text-xs text-text bg-surface-hover border border-border rounded">
                        Halaman {safeCurrentPage} dari {totalAuditPages}
                      </span>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalAuditPages, prev + 1))}
                        disabled={safeCurrentPage >= totalAuditPages || totalAuditItems === 0}
                        title="Halaman Berikutnya"
                        className="p-1.5 rounded border border-border bg-surface hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition text-text text-xs flex items-center gap-1"
                      >
                        <span className="hidden md:inline">Berikutnya</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalAuditPages)}
                        disabled={safeCurrentPage >= totalAuditPages || totalAuditItems === 0}
                        title="Halaman Terakhir"
                        className="p-1.5 rounded border border-border bg-surface hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition text-text text-xs flex items-center gap-1"
                      >
                        <span className="hidden md:inline">Terakhir</span>
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
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
                        Harga Modal / HPP (Rp)
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.cost_price ?? ''}
                        onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})}
                        className="w-full bg-background border border-border rounded px-3 py-2 text-text font-mono focus:border-primary focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Harga Jual (Rp)
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.selling_price ?? ''}
                        onChange={e => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0, unit_price: parseFloat(e.target.value) || 0})}
                        className="w-full bg-background border border-border rounded px-3 py-2 text-text font-mono focus:border-primary focus:outline-none transition"
                      />
                    </div>
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
                      onChange={e => setFormData({...formData, minimum_stock: parseFloat(e.target.value) || 0})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-text font-mono focus:border-primary focus:outline-none transition"
                    />
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
