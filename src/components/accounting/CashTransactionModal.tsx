import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, DollarSign, Calendar, CreditCard, FileText, Tag, AlertTriangle } from 'lucide-react';
import { generalLedgerService } from '../../services/generalLedgerService';
import type { CashTransactionCategory } from '../../services/generalLedgerService';

interface CashTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDirection?: 'IN' | 'OUT';
}

export const CashTransactionModal: React.FC<CashTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDirection = 'IN',
}) => {
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [category, setCategory] = useState<CashTransactionCategory>('CAPITAL_INJECTION');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CASH'>('TRANSFER');
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [description, setDescription] = useState<string>('');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDirection(defaultDirection);
      if (defaultDirection === 'IN') {
        setCategory('CAPITAL_INJECTION');
      } else {
        setCategory('EQUIPMENT_PURCHASE');
      }
      setAmount(0);
      setPaymentMethod('TRANSFER');
      setTransactionDate(new Date().toISOString().slice(0, 10));
      setDescription('');
      setReceiptNo('');
      setErrorMsg(null);
    }
  }, [isOpen, defaultDirection]);

  if (!isOpen) return null;

  const handleDirectionChange = (newDir: 'IN' | 'OUT') => {
    setDirection(newDir);
    if (newDir === 'IN') {
      setCategory('CAPITAL_INJECTION');
    } else {
      setCategory('EQUIPMENT_PURCHASE');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg('Nominal transaksi kas harus lebih besar dari 0.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Keterangan / keperluan transaksi wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await generalLedgerService.createCashTransaction({
        transaction_date: transactionDate,
        direction,
        category,
        amount: Number(amount),
        payment_method: paymentMethod,
        description: description.trim(),
        receipt_no: receiptNo.trim() || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating cash transaction:', err);
      setErrorMsg(err.message || 'Gagal menyimpan transaksi kas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface-hover/30">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                direction === 'IN'
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/20 border border-rose-500/30 text-rose-400'
              }`}
            >
              {direction === 'IN' ? (
                <ArrowDownRight className="w-5 h-5" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-text">
                Pencatatan Kas Non-SPK
              </h2>
              <p className="text-xs text-text-muted">
                Mutasi kas modal, peralatan, hutang, perlengkapan, dan prive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface-hover transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle: Kas Masuk (+) vs Kas Keluar (-) */}
        <div className="px-6 pt-4 pb-2">
          <div className="grid grid-cols-2 p-1 bg-background rounded-xl border border-border">
            <button
              type="button"
              onClick={() => handleDirectionChange('IN')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                direction === 'IN'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              Kas Masuk (+)
            </button>
            <button
              type="button"
              onClick={() => handleDirectionChange('OUT')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                direction === 'OUT'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Kas Keluar (-)
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-status-danger/10 border border-status-danger/30 rounded-xl text-status-danger text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Kategori Transaksi */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary" />
              Kategori Transaksi
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CashTransactionCategory)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              {direction === 'IN' ? (
                <>
                  <option value="CAPITAL_INJECTION">
                    Tambah Setoran Modal Pemilik (Kas +, Modal +)
                  </option>
                  <option value="DEBT_RECEIVED">
                    Terima Pinjaman / Hutang Baru (Kas +, Hutang +)
                  </option>
                  <option value="OTHER_INCOME">
                    Pendapatan Lain-lain Non-SPK (Kas +, Pendapatan +)
                  </option>
                </>
              ) : (
                <>
                  <option value="EQUIPMENT_PURCHASE">
                    Beli Mesin & Peralatan Bengkel (Kas -, Aset Mesin +)
                  </option>
                  <option value="SUPPLIES_PURCHASE">
                    Beli Perlengkapan Pabrik / Consumables (Kas -, Perlengkapan +)
                  </option>
                  <option value="PRIVE_WITHDRAWAL">
                    Penarikan Prive Pemilik (Kas -, Modal -)
                  </option>
                  <option value="DEBT_REPAYMENT">
                    Bayar Cicilan / Pelunasan Hutang (Kas -, Hutang -)
                  </option>
                </>
              )}
            </select>
          </div>

          {/* Tanggal & Metode Pembayaran */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-secondary" />
                Tanggal
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'TRANSFER' | 'CASH')}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              >
                <option value="TRANSFER">Transfer Bank / Rekening</option>
                <option value="CASH">Kas Tunai (Cash di Tangan)</option>
              </select>
            </div>
          </div>

          {/* Nominal (Rp) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              Nominal Transaksi (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">Rp</span>
              <input
                type="number"
                min="1"
                step="any"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary"
                required
              />
            </div>
            {amount > 0 && (
              <span className="text-xs font-mono text-emerald-400 block pt-0.5">
                Terformat: {formatCurrency(amount)}
              </span>
            )}
          </div>

          {/* Keterangan / Deskripsi */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-text-muted" />
              Keperluan / Keterangan Transaksi
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Pembelian mesin bending plat 3mm untuk Bay Fabrikasi"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              required
            />
          </div>

          {/* No Bukti / Kuitansi (Opsional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted">
              Nomor Kuitansi / Referensi Bukti Kas (Opsional)
            </label>
            <input
              type="text"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              placeholder="e.g. KW-2026/X/084"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary font-mono"
            />
          </div>

          {/* Accounting Impact Hint */}
          <div className="p-3 bg-surface-hover/40 border border-border rounded-xl text-[11px] text-text-muted">
            <span className="font-semibold text-text block mb-1">Dampak Akuntansi Model T:</span>
            {direction === 'IN' ? (
              <span>
                Menambah saldo Kas & Bank serta menyesuaikan sisi Pasiva ({category === 'CAPITAL_INJECTION' ? 'Setoran Modal' : category === 'DEBT_RECEIVED' ? 'Hutang Usaha' : 'Pendapatan Lain'}).
              </span>
            ) : (
              <span>
                Mengurangi saldo Kas & Bank serta {category === 'EQUIPMENT_PURCHASE' ? 'menambah Aset Peralatan Mesin' : category === 'SUPPLIES_PURCHASE' ? 'menambah Aset Perlengkapan Pabrik' : category === 'PRIVE_WITHDRAWAL' ? 'mengurangi Ekuitas Pemilik' : 'mengurangi Hutang Usaha'}.
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-text-muted hover:text-text rounded-xl hover:bg-surface-hover transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || amount <= 0}
              className={`px-5 py-2 text-sm font-medium rounded-xl text-white transition shadow-lg flex items-center gap-2 disabled:opacity-50 ${
                direction === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
              }`}
            >
              {loading ? 'Menyimpan...' : direction === 'IN' ? 'Catat Kas Masuk' : 'Catat Kas Keluar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
