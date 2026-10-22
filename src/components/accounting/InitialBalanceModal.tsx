import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, DollarSign, Package, Wrench, FileText, Layers, AlertTriangle } from 'lucide-react';
import { generalLedgerService } from '../../services/generalLedgerService';
import type { InitialBalanceRecord } from '../../services/generalLedgerService';

interface InitialBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: InitialBalanceRecord | null;
}

export const InitialBalanceModal: React.FC<InitialBalanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentBalance,
}) => {
  const [cashBank, setCashBank] = useState<number>(0);
  const [inventoryValue, setInventoryValue] = useState<number>(0);
  const [equipmentValue, setEquipmentValue] = useState<number>(0);
  const [suppliesValue, setSuppliesValue] = useState<number>(0);
  const [payables, setPayables] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentBalance) {
      setCashBank(currentBalance.cash_bank);
      setInventoryValue(currentBalance.inventory_value);
      setEquipmentValue(currentBalance.equipment_value);
      setSuppliesValue(currentBalance.supplies_value);
      setPayables(currentBalance.payables);
      setIsLocked(currentBalance.is_locked);
    } else {
      setCashBank(0);
      setInventoryValue(0);
      setEquipmentValue(0);
      setSuppliesValue(0);
      setPayables(0);
      setIsLocked(false);
    }
    setErrorMsg(null);
  }, [currentBalance, isOpen]);

  if (!isOpen) return null;

  const totalAssets = cashBank + inventoryValue + equipmentValue + suppliesValue;
  const initialEquity = totalAssets - payables;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await generalLedgerService.saveInitialBalance({
        cash_bank: Number(cashBank) || 0,
        inventory_value: Number(inventoryValue) || 0,
        equipment_value: Number(equipmentValue) || 0,
        supplies_value: Number(suppliesValue) || 0,
        payables: Number(payables) || 0,
        is_locked: isLocked,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving initial balance:', err);
      setErrorMsg(err.message || 'Gagal menyimpan saldo awal bengkel.');
    } finally {
      setLoading(false);
    }
  };

  const isFormLocked = currentBalance?.is_locked === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface-hover/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-text">
                Setup Saldo Awal Bengkel
              </h2>
              <p className="text-xs text-text-muted">
                Pencatatan posisi keuangan awal untuk fondasi Buku Besar Model T
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl text-status-danger text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isFormLocked && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>
                Saldo awal ini telah <strong>DIKUNCI</strong> untuk menjaga integritas pembukuan akuntansi. Hubungi administrator jika perlu penyesuaian khusus.
              </span>
            </div>
          )}

          {/* Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kas & Bank */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                Kas & Bank Saat Ini
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={isFormLocked}
                  value={cashBank || ''}
                  onChange={(e) => setCashBank(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary disabled:opacity-50"
                  required
                />
              </div>
              <p className="text-[11px] text-text-muted">Total dana tunai dan saldo rekening operasional bengkel.</p>
            </div>

            {/* Nilai Persediaan Bahan Gudang */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-secondary" />
                Nilai Persediaan Bahan Gudang
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={isFormLocked}
                  value={inventoryValue || ''}
                  onChange={(e) => setInventoryValue(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary disabled:opacity-50"
                  required
                />
              </div>
              <p className="text-[11px] text-text-muted">Valuasi stok pelat, besi, cat, dan material fisik di gudang.</p>
            </div>

            {/* Nilai Peralatan & Mesin */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-blue-400" />
                Nilai Peralatan & Mesin Pabrik
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={isFormLocked}
                  value={equipmentValue || ''}
                  onChange={(e) => setEquipmentValue(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary disabled:opacity-50"
                  required
                />
              </div>
              <p className="text-[11px] text-text-muted">Nilai mesin las, bending, crane, kompresor, dan aset tetap.</p>
            </div>

            {/* Nilai Perlengkapan */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Nilai Perlengkapan Pabrik (Consumables)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={isFormLocked}
                  value={suppliesValue || ''}
                  onChange={(e) => setSuppliesValue(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary disabled:opacity-50"
                  required
                />
              </div>
              <p className="text-[11px] text-text-muted">Perlengkapan habis pakai, mata gerinda, kawat las cadangan.</p>
            </div>

            {/* Total Hutang Usaha / Tempo */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-status-danger" />
                Total Hutang Usaha / Tempo / Pinjaman Awal
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={isFormLocked}
                  value={payables || ''}
                  onChange={(e) => setPayables(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary disabled:opacity-50"
                  required
                />
              </div>
              <p className="text-[11px] text-text-muted">Total kewajiban yang masih belum lunas ke supplier atau pihak ketiga saat cut-off.</p>
            </div>
          </div>

          {/* Real-Time Preview Card: Kalkulasi Ekuitas Bersih */}
          <div className="bg-surface-hover/50 border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Pratinjau Otomatis Ekuitas & Model T
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-background/80 p-3 rounded-lg border border-border">
                <span className="text-[11px] text-text-muted block">Total Harta Awal (Aktiva)</span>
                <span className="text-sm font-bold font-mono text-primary">
                  {formatCurrency(totalAssets)}
                </span>
              </div>
              <div className="bg-background/80 p-3 rounded-lg border border-border">
                <span className="text-[11px] text-text-muted block">Total Kewajiban (Hutang)</span>
                <span className="text-sm font-bold font-mono text-status-danger">
                  {formatCurrency(payables)}
                </span>
              </div>
              <div className="bg-background/80 p-3 rounded-lg border border-primary/30">
                <span className="text-[11px] text-emerald-400 block font-semibold">Modal Awal Bersih (Ekuitas)</span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {formatCurrency(initialEquity)}
                </span>
              </div>
            </div>
            <p className="text-[11px] font-mono text-text-muted">
              Rumus: Ekuitas Awal = (Kas + Persediaan + Peralatan + Perlengkapan) - Hutang
            </p>
          </div>

          {/* Lock Checkbox */}
          {!isFormLocked && (
            <div className="flex items-center gap-2.5 pt-2">
              <input
                type="checkbox"
                id="lock_balance"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-border bg-background"
              />
              <label htmlFor="lock_balance" className="text-xs text-text cursor-pointer select-none">
                Kunci Saldo Awal ini secara permanen setelah disimpan
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-text-muted hover:text-text rounded-xl hover:bg-surface-hover transition"
            >
              Tutup
            </button>
            {!isFormLocked && (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-sm font-medium bg-primary text-background rounded-xl hover:bg-primary-hover transition shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan Saldo Awal'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
