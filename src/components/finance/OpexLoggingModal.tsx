import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  DollarSign, 
  Calendar, 
  Receipt, 
  CreditCard, 
  Building2, 
  CheckCircle, 
  AlertCircle, 
  Clock 
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { operatingExpenseService } from '../../services/operatingExpenseService';
import type { OperatingExpenseItem, ExpenseCategory } from '../../types/operatingExpenses';
import { formatRupiah } from '../../utils/formatters';
import { ManageExpenseCategoriesModal } from './ManageExpenseCategoriesModal';

export interface OpexLoggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded?: () => void;
  onExpenseChanged?: () => void; // Trigger refresh ke halaman utama
  currentMonth?: string;
  defaultMonth?: string; // YYYY-MM
}

export const OpexLoggingModal: React.FC<OpexLoggingModalProps> = ({
  isOpen,
  onClose,
  onExpenseAdded,
  onExpenseChanged,
  currentMonth,
  defaultMonth,
}) => {
  const currentMonthStr = currentMonth || defaultMonth || new Date().toISOString().slice(0, 7);

  // Modal Kelola Kategori State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // Categories & Existing Expenses
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<OperatingExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active view: 'create' or 'list'
  const [viewMode, setViewMode] = useState<'create' | 'list'>('create');

  // Form inputs
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CASH'>('TRANSFER');
  const [receiptRef, setReceiptRef] = useState<string>('');

  // Delete handling
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync selectedMonth if currentMonth or defaultMonth changes
  useEffect(() => {
    const active = currentMonth || defaultMonth;
    if (active) {
      setSelectedMonth(active);
    }
  }, [currentMonth, defaultMonth]);

  // 1. Fetching Kategori Dinamis dari expense_categories
  const loadCategories = useCallback(async (preferredCatId?: string) => {
    try {
      const { data: dbCategories, error: fetchErr } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true });

      let cats: ExpenseCategory[] = (dbCategories || []) as ExpenseCategory[];

      // Fallback jika database view/service fallback diperlukan
      if (fetchErr || cats.length === 0) {
        cats = await operatingExpenseService.getCategories(false);
      }

      setCategories(cats);

      if (cats.length > 0) {
        setCategoryId(prev => {
          const targetId = preferredCatId || prev;
          if (!targetId || !cats.some(c => c.id === targetId)) {
            setCategoryName(cats[0].name);
            return cats[0].id;
          }
          const current = cats.find(c => c.id === targetId);
          if (current) setCategoryName(current.name);
          return targetId;
        });
      } else {
        setCategoryId('');
        setCategoryName('');
      }
    } catch (err: any) {
      console.error('Failed to load expense categories:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen, loadCategories]);

  // Load expenses for selected month
  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operatingExpenseService.getExpensesByMonth(selectedMonth);
      setExpenses(data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat catatan pengeluaran operasional.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (isOpen) {
      loadExpenses();
    }
  }, [isOpen, loadExpenses]);

  if (!isOpen) return null;

  // Handle Category Change (with __ADD_NEW__ trigger)
  const handleCategoryChange = (val: string) => {
    if (val === '__ADD_NEW__') {
      setIsManageModalOpen(true);
      return;
    }

    setCategoryId(val);
    const found = categories.find(c => c.id === val);
    if (found) {
      setCategoryName(found.name);
    }
  };

  // Submit Expense
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const parsedAmount = parseFloat(amountStr.replace(/[^0-9]/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Nominal pengeluaran harus lebih dari 0.');
      return;
    }

    if (!description.trim()) {
      setError('Deskripsi pengeluaran wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await operatingExpenseService.createExpense({
        expense_date: expenseDate,
        effective_month: selectedMonth,
        category_id: categoryId || null,
        category_name: categoryName || 'Lain-lain',
        description: description.trim(),
        amount: parsedAmount,
        payment_method: paymentMethod,
        receipt_ref: receiptRef.trim() || null,
      });

      setSuccessMsg('Pengeluaran operasional berhasil disimpan.');
      setDescription('');
      setAmountStr('');
      setReceiptRef('');
      await loadExpenses();
      if (onExpenseChanged) {
        onExpenseChanged();
      }
      if (onExpenseAdded) {
        onExpenseAdded();
      }
      setViewMode('list');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan pengeluaran operasional.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan pengeluaran ini?')) return;

    setIsDeleting(true);
    setDeletingId(expenseId);
    try {
      const { error } = await supabase
        .from('operating_expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      // 1. Update state list lokal di dalam modal
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
      setSuccessMsg('Catatan beban berhasil dihapus');

      // 2. Trigger penyegaran data ke halaman induk (Laporan & Grafik)
      if (onExpenseChanged) {
        onExpenseChanged();
      }
      if (onExpenseAdded) {
        onExpenseAdded();
      }
    } catch (err: any) {
      setError(`Gagal menghapus: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const totalMonthlyOpex = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-text">
                Pencatatan Biaya Operasional Berkala (OPEX)
              </h2>
              <p className="text-xs text-text-muted">
                Catat beban rutin: Gaji staf, token listrik bengkel, kebersihan, amenities, dan amortisasi sewa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-active transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Tabs & Month Filter */}
        <div className="px-6 py-3 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('create')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'create'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-hover text-text-muted hover:text-text'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Input Beban Baru</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-hover text-text-muted hover:text-text'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Daftar Pengeluaran ({expenses.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Bulan Efektif:</span>
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-border bg-surface text-text font-mono focus:ring-1 focus:ring-primary focus:outline-hidden"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {viewMode === 'create' ? (
            /* Formulir Catat Pengeluaran Operasional */
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tanggal Beban */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">
                    Tanggal Beban / Pengeluaran *
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-primary focus:outline-hidden"
                    required
                  />
                </div>

                {/* Dropdown Kategori Dinamis */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-text-muted">
                      Kategori Beban *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsManageModalOpen(true)}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer transition"
                      title="Kelola Master Kategori Beban"
                    >
                      <span>⚙ Kelola Kategori</span>
                    </button>
                  </div>
                  <select
                    value={categoryId}
                    onChange={e => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-primary focus:outline-hidden"
                    required
                  >
                    {categories.length === 0 ? (
                      <option value="" disabled>Belum ada kategori aktif</option>
                    ) : (
                      categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))
                    )}
                    <option value="__ADD_NEW__" className="text-amber-400 font-semibold bg-surface-hover">
                      + Tambah Kategori Baru...
                    </option>
                  </select>
                </div>
              </div>

              {/* Deskripsi / Keperluan */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">
                  Deskripsi / Keperluan *
                </label>
                <input
                  type="text"
                  placeholder='e.g. Beli Token Listrik 500rb No Meter xxx / Gaji Admin & Kasir'
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-primary focus:outline-hidden"
                  required
                />
              </div>

              {/* Nominal (Rp) dengan Currency Preview */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">
                  Nominal Pengeluaran (Rp) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted text-xs font-bold font-mono">
                    Rp
                  </div>
                  <input
                    type="number"
                    placeholder="0"
                    min="1"
                    step="1000"
                    value={amountStr}
                    onChange={e => setAmountStr(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-border bg-surface text-text font-mono focus:ring-1 focus:ring-primary focus:outline-hidden"
                    required
                  />
                </div>
                {amountStr && parseFloat(amountStr) > 0 && (
                  <p className="text-[11px] font-mono text-emerald-400 mt-1 font-semibold">
                    Format: {formatRupiah(parseFloat(amountStr))}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Metode Pembayaran */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">
                    Metode Pembayaran
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('TRANSFER')}
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        paymentMethod === 'TRANSFER'
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'border-border text-text-muted hover:bg-surface-hover'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Transfer Bank</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        paymentMethod === 'CASH'
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'border-border text-text-muted hover:bg-surface-hover'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Kas Tunai</span>
                    </button>
                  </div>
                </div>

                {/* No. Bukti / Ref */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">
                    No. Bukti / Ref Kwitansi (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TRF-BCA-1029 / KW-0081"
                    value={receiptRef}
                    onChange={e => setReceiptRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-text-muted hover:bg-surface-hover border border-border transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-sm flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Simpan Pengeluaran</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Tabel Ringkas Pengeluaran Bulan Berjalan */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                <div>
                  <span className="text-text-muted">Total Akumulasi Beban ({selectedMonth}):</span>
                  <div className="font-bold font-mono text-purple-400 text-sm">
                    {formatRupiah(totalMonthlyOpex)}
                  </div>
                </div>
                <div className="text-[11px] text-text-muted font-medium">
                  {expenses.length} Transaksi Tercatat
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-text-muted text-xs">
                  <Clock className="w-5 h-5 mx-auto mb-2 animate-spin text-primary" />
                  <span>Memuat daftar pengeluaran operasional...</span>
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-xs border border-dashed border-border rounded-xl">
                  Belum ada pengeluaran operasional pada bulan {selectedMonth}.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden divide-y divide-border text-xs">
                  {expenses.map(item => (
                    <div key={item.id} className="p-3.5 hover:bg-surface-hover/50 flex items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text truncate">
                            {item.description}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface border border-border text-text-muted">
                            {item.category_name}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-muted flex items-center gap-3">
                          <span>{new Date(item.expense_date).toLocaleDateString('id-ID')}</span>
                          <span>•</span>
                          <span>{item.payment_method}</span>
                          {item.receipt_ref && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{item.receipt_ref}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-text">
                          {formatRupiah(item.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(item.id)}
                          disabled={isDeleting || deletingId === item.id}
                          className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-modal Kelola Kategori Beban Dinamis */}
      <ManageExpenseCategoriesModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        onCategoriesUpdated={(newlyCreatedCatId) => {
          loadCategories(newlyCreatedCatId);
        }}
      />
    </div>
  );
};

export default OpexLoggingModal;
