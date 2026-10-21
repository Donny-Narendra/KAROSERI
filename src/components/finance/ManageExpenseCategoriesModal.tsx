import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Plus, 
  Search, 
  Edit3, 
  Check, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Settings, 
  ToggleLeft, 
  ToggleRight
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { operatingExpenseService } from '../../services/operatingExpenseService';
import type { ExpenseCategory } from '../../types/operatingExpenses';
import { useAuth } from '../../context/AuthContext';

export interface ManageExpenseCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesUpdated?: (newlyCreatedCatId?: string) => void;
}

export const ManageExpenseCategoriesModal: React.FC<ManageExpenseCategoriesModalProps> = ({
  isOpen,
  onClose,
  onCategoriesUpdated,
}) => {
  const { profile } = useAuth();
  const isAuthorized = !profile || profile.role === 'owner' || profile.role === 'kasir';

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form input state: Tambah Kategori Baru
  const [newName, setNewName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [submittingAdd, setSubmittingAdd] = useState<boolean>(false);

  // Edit category state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);

  // Status toggle / delete state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load all categories from expense_categories
  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operatingExpenseService.getCategories(true);
      setCategories(data);
    } catch (err: any) {
      console.error('Failed to load categories in ManageExpenseCategoriesModal:', err);
      setError(err.message || 'Gagal memuat master kategori beban.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setNewName('');
      setNewDescription('');
      setEditingId(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, loadCategories]);

  if (!isOpen) return null;

  // Handle Form Tambah Kategori Baru
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedName = newName.trim();
    if (!trimmedName) {
      setError('Nama kategori beban wajib diisi.');
      return;
    }

    setSubmittingAdd(true);
    try {
      const created = await operatingExpenseService.createCategory({
        name: trimmedName,
        description: newDescription.trim() || null,
      });

      setSuccessMsg(`Kategori "${trimmedName}" berhasil ditambahkan.`);
      setNewName('');
      setNewDescription('');
      await loadCategories();
      onCategoriesUpdated?.(created?.id);
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan kategori baru.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Start Editing Row
  const handleStartEdit = (cat: ExpenseCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description || '');
    setError(null);
  };

  // Cancel Editing Row
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  // Save Edited Category
  const handleSaveEdit = async (id: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setError('Nama kategori tidak boleh kosong.');
      return;
    }

    setSubmittingEdit(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await operatingExpenseService.updateCategory(id, {
        name: trimmedName,
        description: editDescription.trim() || null,
      });

      setSuccessMsg(`Kategori "${trimmedName}" berhasil diperbarui.`);
      setEditingId(null);
      await loadCategories();
      onCategoriesUpdated?.(id);
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui kategori.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Check category usage in OPEX expenses
  const checkCategoryUsage = async (categoryId: string, categoryName: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('operating_expenses')
        .select('*', { count: 'exact', head: true })
        .or(`category_id.eq.${categoryId},category_name.eq.${categoryName}`);

      if (error) {
        console.warn('Could not query operating_expenses count:', error.message);
        return 0;
      }
      return count || 0;
    } catch {
      return 0;
    }
  };

  // Handle Hapus / Nonaktifkan kategori
  const handleToggleOrDelete = async (cat: ExpenseCategory) => {
    setActionLoadingId(cat.id);
    setError(null);
    setSuccessMsg(null);

    try {
      const isCurrentlyActive = cat.is_active !== false;

      if (isCurrentlyActive) {
        // Cek apakah kategori sudah dipakai pada transaksi OPEX
        const usedCount = await checkCategoryUsage(cat.id, cat.name);

        let confirmMsg = '';
        if (usedCount > 0) {
          confirmMsg = `⚠️ PERINGATAN: Kategori "${cat.name}" sudah digunakan pada ${usedCount} transaksi OPEX!\n\nMenonaktifkan kategori ini akan menyembunyikannya dari dropdown transaksi baru, namun tidak akan merusak riwayat transaksi historis.\n\nLanjutkan menonaktifkan kategori ini?`;
        } else {
          confirmMsg = `Apakah Anda yakin ingin menonaktifkan kategori "${cat.name}"?`;
        }

        if (!window.confirm(confirmMsg)) {
          setActionLoadingId(null);
          return;
        }

        await operatingExpenseService.toggleCategoryActive(cat.id, false);
        setSuccessMsg(`Kategori "${cat.name}" berhasil dinonaktifkan.`);
      } else {
        // Aktifkan kembali
        if (!window.confirm(`Aktifkan kembali kategori "${cat.name}"?`)) {
          setActionLoadingId(null);
          return;
        }

        await operatingExpenseService.toggleCategoryActive(cat.id, true);
        setSuccessMsg(`Kategori "${cat.name}" berhasil diaktifkan kembali.`);
      }

      await loadCategories();
      onCategoriesUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah status kategori.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter categories by search
  const filteredCategories = categories.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  const activeCount = categories.filter(c => c.is_active !== false).length;
  const inactiveCount = categories.length - activeCount;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-text flex items-center gap-2">
                <span>Kelola Kategori Beban</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {categories.length} Kategori
                </span>
              </h2>
              <p className="text-xs text-text-muted">
                Master kategori beban operasional berkala untuk evaluasi pengeluaran OPEX
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-active transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Penambahan Kategori Baru */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-text">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Tambah Kategori Baru</span>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted mb-1">
                    Nama Kategori *
                  </label>
                  <input
                    type="text"
                    placeholder="misal: BBM Operasional Truk Bengkel"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-muted mb-1">
                    Deskripsi Kategori (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="misal: Pembelian solar armada penjemputan"
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submittingAdd || !isAuthorized}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingAdd ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Simpan Kategori Baru</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Search Bar & Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Cari kategori beban..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
            </div>

            <div className="text-[11px] text-text-muted font-medium">
              Aktif: <strong className="text-emerald-400">{activeCount}</strong> | Nonaktif: <strong className="text-zinc-400">{inactiveCount}</strong>
            </div>
          </div>

          {/* Daftar Kategori Beban & Status */}
          {loading ? (
            <div className="text-center py-10 text-text-muted text-xs">
              <Clock className="w-5 h-5 mx-auto mb-2 animate-spin text-amber-400" />
              <span>Memuat daftar kategori beban...</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-xs border border-dashed border-border rounded-xl">
              {searchQuery ? 'Tidak ada kategori yang cocok dengan pencarian.' : 'Belum ada kategori beban.'}
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border text-xs">
              {filteredCategories.map(cat => {
                const isEditing = editingId === cat.id;
                const isActive = cat.is_active !== false;

                return (
                  <div
                    key={cat.id}
                    className={`p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive ? 'hover:bg-surface-hover/50' : 'bg-surface-hover/20 opacity-75'
                    }`}
                  >
                    {isEditing ? (
                      /* Inline Edit Form */
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-amber-500 bg-surface text-text focus:outline-hidden"
                            placeholder="Nama Kategori"
                            required
                          />
                          <input
                            type="text"
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-text focus:outline-hidden"
                            placeholder="Deskripsi Kategori"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium text-text-muted hover:bg-surface-hover border border-border cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat.id)}
                            disabled={submittingEdit}
                            className="px-3 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3 h-3" />
                            <span>Simpan</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Item Display */
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isActive ? 'text-text' : 'text-text-muted line-through'}`}>
                            {cat.name}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono border ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}>
                            {isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted line-clamp-1">
                          {cat.description || 'Tidak ada deskripsi rincian pos akun.'}
                        </p>
                      </div>
                    )}

                    {/* Tombol Aksi per Baris */}
                    {!isEditing && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-text-muted hover:text-text hover:bg-surface-hover border border-border flex items-center gap-1 transition cursor-pointer"
                          title="Edit nama kategori"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleOrDelete(cat)}
                          disabled={actionLoadingId === cat.id}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition cursor-pointer disabled:opacity-50 ${
                            isActive
                              ? 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                              : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                          }`}
                          title={isActive ? 'Hapus / Nonaktifkan kategori' : 'Aktifkan kembali kategori'}
                        >
                          {isActive ? (
                            <>
                              <ToggleLeft className="w-3.5 h-3.5" />
                              <span>Nonaktifkan</span>
                            </>
                          ) : (
                            <>
                              <ToggleRight className="w-3.5 h-3.5" />
                              <span>Aktifkan</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-surface-hover/30 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-hover hover:bg-surface-active text-text border border-border transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageExpenseCategoriesModal;
