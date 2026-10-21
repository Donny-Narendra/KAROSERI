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
  Tag, 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight,
  FolderKanban
} from 'lucide-react';
import { operatingExpenseService } from '../../services/operatingExpenseService';
import type { ExpenseCategory } from '../../types/operatingExpenses';
import { useAuth } from '../../context/AuthContext';

interface ExpenseCategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesUpdated?: () => void;
}

export const ExpenseCategoryManagerModal: React.FC<ExpenseCategoryManagerModalProps> = ({
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

  // Form State for Adding New Category
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [submittingAdd, setSubmittingAdd] = useState<boolean>(false);

  // State for Editing Category
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);

  // State for Toggling Status
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Fetch all categories (including inactive)
  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operatingExpenseService.getCategories(true);
      setCategories(data);
    } catch (err: any) {
      console.error('Failed to load expense categories:', err);
      setError(err.message || 'Gagal memuat daftar kategori beban.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setIsAdding(false);
      setEditingId(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, loadCategories]);

  if (!isOpen) return null;

  // Handle Add Category
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setError('Hanya Owner atau Kasir yang berwenang menambahkan kategori beban.');
      return;
    }

    const trimmedName = newName.trim();
    if (!trimmedName) {
      setError('Nama kategori beban wajib diisi.');
      return;
    }

    setSubmittingAdd(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await operatingExpenseService.createCategory({
        name: trimmedName,
        description: newDescription.trim() || null,
      });

      setSuccessMsg(`Kategori "${trimmedName}" berhasil ditambahkan.`);
      setNewName('');
      setNewDescription('');
      setIsAdding(false);
      await loadCategories();
      onCategoriesUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan kategori.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Start Editing
  const handleStartEdit = (category: ExpenseCategory) => {
    if (!isAuthorized) return;
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description || '');
    setError(null);
  };

  // Cancel Editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  // Save Editing
  const handleSaveEdit = async (id: string) => {
    if (!isAuthorized) {
      setError('Hanya Owner atau Kasir yang berwenang mengedit kategori.');
      return;
    }

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
      onCategoriesUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan perubahan kategori.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (category: ExpenseCategory) => {
    if (!isAuthorized) {
      setError('Hanya Owner atau Kasir yang berwenang mengubah status kategori.');
      return;
    }

    const nextStatus = category.is_active === false;
    const actionLabel = nextStatus ? 'mengaktifkan kembali' : 'menonaktifkan';

    if (!window.confirm(`Apakah Anda yakin ingin ${actionLabel} kategori "${category.name}"?`)) {
      return;
    }

    setTogglingId(category.id);
    setError(null);
    setSuccessMsg(null);

    try {
      await operatingExpenseService.toggleCategoryActive(category.id, nextStatus);
      setSuccessMsg(
        `Kategori "${category.name}" berhasil ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}.`
      );
      await loadCategories();
      onCategoriesUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah status kategori.');
    } finally {
      setTogglingId(null);
    }
  };

  // Filter Categories
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
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-text flex items-center gap-2">
                <span>Kelola Master Kategori Beban OPEX</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {categories.length} Pos Akun
                </span>
              </h2>
              <p className="text-xs text-text-muted">
                Daftar pos akun operasional periodik untuk mencegah bias akun "Lain-lain"
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

        {/* Permission Notice */}
        {!isAuthorized && (
          <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Mode Baca: Hanya Owner dan Kasir yang memiliki izin menambah, mengubah, atau menonaktifkan pos akun beban.</span>
          </div>
        )}

        {/* Toolbar & Filter Bar */}
        <div className="px-6 py-3 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cari pos akun kategori..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted font-medium">
              Aktif: <strong className="text-emerald-400">{activeCount}</strong> | Nonaktif: <strong className="text-zinc-400">{inactiveCount}</strong>
            </span>

            {isAuthorized && (
              <button
                type="button"
                onClick={() => setIsAdding(!isAdding)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer ${
                  isAdding 
                    ? 'bg-surface-hover text-text border border-border'
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
              >
                {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{isAdding ? 'Batal Tambah' : 'Tambah Kategori'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Container */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
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

          {/* Form Tambah Kategori Baru */}
          {isAdding && isAuthorized && (
            <form onSubmit={handleAddSubmit} className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-text">
                <Tag className="w-4 h-4 text-primary" />
                <span>Input Kategori Beban Baru</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted mb-1">
                    Nama Kategori Beban *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bahan Bakar & Solar Genset Pabrik"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-primary focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-muted mb-1">
                    Deskripsi / Peruntukan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pembelian solar genset dan pelumas mesin"
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:bg-surface-hover border border-border transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingAdd ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Simpan Kategori</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* List Kategori */}
          {loading ? (
            <div className="text-center py-12 text-text-muted text-xs">
              <Clock className="w-6 h-6 mx-auto mb-2 animate-spin text-primary" />
              <span>Memuat master kategori beban...</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-text-muted text-xs border border-dashed border-border rounded-xl">
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
                      isActive ? 'hover:bg-surface-hover/50' : 'bg-surface-hover/30 opacity-75'
                    }`}
                  >
                    {isEditing ? (
                      /* Form Inline Edit */
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-primary bg-surface text-text focus:outline-hidden"
                            placeholder="Nama Kategori"
                            required
                          />
                          <input
                            type="text"
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-text focus:outline-hidden"
                            placeholder="Deskripsi / Peruntukan"
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
                      /* Category Info View */
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

                    {/* Action Buttons */}
                    {!isEditing && isAuthorized && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-text-muted hover:text-text hover:bg-surface-hover border border-border flex items-center gap-1 transition cursor-pointer"
                          title="Edit Nama & Deskripsi"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(cat)}
                          disabled={togglingId === cat.id}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition cursor-pointer disabled:opacity-50 ${
                            isActive
                              ? 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                              : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                          }`}
                          title={isActive ? 'Nonaktifkan Pos Akun' : 'Aktifkan Kembali Pos Akun'}
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
