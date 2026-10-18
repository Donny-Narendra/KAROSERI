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
import { financialReportsService } from '../../services/financialReportsService';
import type { OperatingExpense, OperatingExpenseCategory } from '../../types/financialReports';
import { formatRupiah } from '../../utils/formatters';

interface OpexExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded?: () => void;
  defaultMonth?: string; // YYYY-MM
}

export const OpexExpenseModal: React.FC<OpexExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseAdded,
  defaultMonth,
}) => {
  const currentMonthStr = defaultMonth || new Date().toISOString().slice(0, 7);

  // Categories & Existing Expenses
  const [categories, setCategories] = useState<OperatingExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active form view: 'list' or 'create'
  const [viewMode, setViewMode] = useState<'list' | 'create'>('create');

  // Form inputs
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CASH'>('TRANSFER');
  const [receiptRef, setReceiptRef] = useState<string>('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load categories
  useEffect(() => {
    if (!isOpen) return;
    const loadCategories = async () => {
      try {
        const cats = await financialReportsService.getOperatingExpenseCategories();
        setCategories(cats);
        if (cats.length > 0 && !categoryId) {
          setCategoryId(cats[0].id);
          setCategoryName(cats[0].name);
        }
      } catch (err: any) {
        console.error('Failed to load OPEX categories:', err);
      }
    };
    loadCategories();
  }, [isOpen, categoryId]);

  // Load existing expenses for selectedMonth
  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financialReportsService.getOperatingExpenses({
        effectiveMonth: selectedMonth,
      });
      setExpenses(data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat catatan beban operasional.');
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

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    const found = categories.find(c => c.id === catId);
    if (found) {
      setCategoryName(found.name);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const parsedAmount = parseFloat(amountStr.replace(/[^0-9]/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Nominal beban harus lebih dari 0.');
      return;
    }

    if (!description.trim()) {
      setError('Keterangan pengeluaran wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await financialReportsService.createOperatingExpense({
        expense_date: expenseDate,
        effective_month: selectedMonth,
        category_id: categoryId || null,
        category_name: categoryName || 'Lain-lain',
        description: description.trim(),
        amount: parsedAmount,
        payment_method: paymentMethod,
        receipt_ref: receiptRef.trim() || null,
      });

      setSuccessMsg('Beban operasional berhasil dicatat.');
      setDescription('');
      setAmountStr('');
      setReceiptRef('');
      await loadExpenses();
      onExpenseAdded?.();
      setViewMode('list');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan beban operasional.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan beban operasional ini?')) {
      return;
    }

    setDeletingId(id);
    try {
      await financialReportsService.deleteOperatingExpense(id);
      await loadExpenses();
      onExpenseAdded?.();
    } catch (err: any) {
      alert(`Gagal menghapus beban: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const totalOpexForMonth = expenses.reduce((sum, e) => sum + e.amount, 0);

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
                Beban Operasional Berkala (OPEX)
              </h2>
              <p className="text-xs text-text-muted">
                Catat pengeluaran periodik: Gaji staf, token listrik, amenities, dan amortisasi sewa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-active transition"
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-hover text-text-muted hover:text-text'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Daftar Transaksi ({expenses.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Bulan Buku:</span>
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-border bg-surface text-text font-mono focus:ring-1 focus:ring-primary focus:outline-hidden"
            />
          </div>
        </div>

        {/* Body Container */}
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
            /* Form Input Beban Operasional */
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kategori Beban */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">
                    Kategori Beban Operasional *
                  </label>
                  <select
                    value={categoryId}
                    onChange={e => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-primary focus:outline-hidden"
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tanggal Transaksi */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">
                    Tanggal Pembayaran / Pengeluaran *
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-primary focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">
                  Keterangan / Rincian Beban *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pembelian Token Listrik Bengkel 2.200 VA (ID Pel: 5312...)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-primary focus:outline-hidden"
                  required
                />
              </div>

              {/* Nominal & Live Preview */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">
                  Nominal Beban (Rp) *
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
                    Preview: {formatRupiah(parseFloat(amountStr))}
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
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
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
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
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
                    No. Bukti / Kwitansi (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TRF-BCA-8891 / KW-0091"
                    value={receiptRef}
                    onChange={e => setReceiptRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-text-muted hover:bg-surface-hover border border-border transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-sm flex items-center gap-2 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Simpan Beban Operasional</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* List Transaksi Beban Operasional */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                <div>
                  <span className="text-text-muted">Total Beban Operasional ({selectedMonth}):</span>
                  <div className="font-bold font-mono text-purple-400 text-sm">
                    {formatRupiah(totalOpexForMonth)}
                  </div>
                </div>
                <div className="text-[11px] text-text-muted font-medium">
                  {expenses.length} Transaksi Tercatat
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-text-muted text-xs">
                  <Clock className="w-5 h-5 mx-auto mb-2 animate-spin text-primary" />
                  <span>Memuat daftar beban operasional...</span>
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-xs border border-dashed border-border rounded-xl">
                  Belum ada beban operasional tercatat pada bulan {selectedMonth}.
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
                          disabled={deletingId === item.id}
                          className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition"
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
    </div>
  );
};
