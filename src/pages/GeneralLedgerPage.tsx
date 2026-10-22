import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  ArrowLeft,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Wrench,
  Layers,
  FileText,
  Search,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  PieChart,
} from 'lucide-react';
import { generalLedgerService } from '../services/generalLedgerService';
import type {
  GeneralLedgerMetrics,
  CashLedgerTransaction,
  CashTransactionCategory,
} from '../services/generalLedgerService';
import { InitialBalanceModal } from '../components/accounting/InitialBalanceModal';
import { CashTransactionModal } from '../components/accounting/CashTransactionModal';

export const GeneralLedgerPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Metrics State
  const [metrics, setMetrics] = useState<GeneralLedgerMetrics | null>(null);
  const [transactions, setTransactions] = useState<CashLedgerTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals State
  const [isInitialBalanceModalOpen, setIsInitialBalanceModalOpen] = useState<boolean>(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState<boolean>(false);
  const [cashModalDirection, setCashModalDirection] = useState<'IN' | 'OUT'>('IN');

  // Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | CashTransactionCategory>('ALL');

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [metricsData, txData] = await Promise.all([
        generalLedgerService.getGeneralLedgerMetrics(),
        generalLedgerService.getCashTransactions(),
      ]);

      setMetrics(metricsData);
      setTransactions(txData);
    } catch (err: any) {
      console.error('Failed to load General Ledger data:', err);
      setErrorMsg(err.message || 'Gagal memuat data Buku Besar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCashModal = (dir: 'IN' | 'OUT') => {
    setCashModalDirection(dir);
    setIsCashModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan transaksi kas ini?')) {
      return;
    }

    try {
      setDeletingId(id);
      await generalLedgerService.deleteCashTransaction(id);
      await fetchData();
    } catch (err: any) {
      alert(`Gagal menghapus transaksi: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const getCategoryLabel = (cat: CashTransactionCategory) => {
    switch (cat) {
      case 'CAPITAL_INJECTION':
        return 'Setoran Modal Pemilik';
      case 'DEBT_RECEIVED':
        return 'Penerimaan Pinjaman / Hutang';
      case 'OTHER_INCOME':
        return 'Pendapatan Lain-lain';
      case 'EQUIPMENT_PURCHASE':
        return 'Beli Peralatan / Mesin';
      case 'SUPPLIES_PURCHASE':
        return 'Beli Perlengkapan Consumables';
      case 'PRIVE_WITHDRAWAL':
        return 'Penarikan Prive Pemilik';
      case 'DEBT_REPAYMENT':
        return 'Pembayaran Cicilan Hutang';
      default:
        return cat;
    }
  };

  // Filtered Transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (directionFilter !== 'ALL' && tx.direction !== directionFilter) return false;
    if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchCat = getCategoryLabel(tx.category).toLowerCase().includes(q);
      const matchReceipt = tx.receipt_no?.toLowerCase().includes(q) || false;
      if (!matchDesc && !matchCat && !matchReceipt) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-surface border-b border-border px-6 py-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(profile?.role === 'owner' ? '/dashboard' : '/kasir')}
              className="p-2 rounded-xl bg-surface-hover hover:bg-surface-active text-text-muted hover:text-text border border-border transition"
              title="Kembali ke Dashboard Utama"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-display tracking-tight text-text">
                  Buku Besar & Kas Bengkel
                </h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  Akuntansi Model T
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Pencatatan Saldo Awal, Visualisasi Aktiva vs Pasiva, dan Buku Kas Masuk/Keluar Non-SPK
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsInitialBalanceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface-hover hover:bg-surface-active text-text-muted hover:text-text border border-border rounded-xl text-xs sm:text-sm font-medium transition"
              title="Setup atau tinjau saldo awal bengkel"
            >
              <Sliders className="w-4 h-4 text-primary" />
              <span>Setup Saldo Awal</span>
            </button>

            <button
              onClick={() => handleOpenCashModal('IN')}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs sm:text-sm font-medium transition"
              title="Catat kas masuk non-SPK (modal disetor, pinjaman, dll)"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Kas Masuk</span>
            </button>

            <button
              onClick={() => handleOpenCashModal('OUT')}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs sm:text-sm font-medium transition"
              title="Catat kas keluar non-SPK (beli peralatan, perlengkapan, prive, bayar hutang)"
            >
              <MinusCircle className="w-4 h-4" />
              <span>- Kas Keluar</span>
            </button>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl bg-surface-hover hover:bg-surface-active text-text-muted hover:text-text border border-border transition"
              title="Segarkan Buku Besar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error notification */}
        {errorMsg && (
          <div className="p-4 bg-status-danger/10 border border-status-danger/30 rounded-2xl text-status-danger text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Warning banner jika Saldo Awal belum disetup */}
        {!metrics?.hasInitialBalance && !loading && (
          <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-300">
                  Saldo Awal Bengkel Belum Dikonfigurasi
                </h3>
                <p className="text-xs text-text-muted">
                  Untuk menghasilkan pembukuan Akuntansi Model T yang akurat, masukkan saldo Kas Awal, Nilai Stok Inventaris, Peralatan, dan Hutang Awal.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsInitialBalanceModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-background font-medium text-xs rounded-xl transition shadow-lg shadow-amber-500/20 shrink-0"
            >
              Konfigurasi Saldo Awal Sekarang
            </button>
          </div>
        )}

        {/* Status Keseimbangan Akuntansi Banner (Model T Balance Status) */}
        {metrics && (
          <div
            className={`p-5 rounded-2xl border transition-all duration-300 ${
              metrics.isBalanced
                ? 'bg-gradient-to-r from-emerald-950/40 via-surface to-surface border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                : 'bg-gradient-to-r from-amber-950/40 via-surface to-surface border-amber-500/40 shadow-lg shadow-amber-950/20'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    metrics.isBalanced
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                      : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                  }`}
                >
                  {metrics.isBalanced ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : (
                    <AlertTriangle className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                        metrics.isBalanced
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {metrics.isBalanced ? 'BALANCE (100% SEIMBANG) ✓' : 'UNBALANCED (SELISIH DETEKSI) ⚠'}
                    </span>
                    <span className="text-xs text-text-muted font-mono">
                      Prinsip Persamaan Akuntansi: Aktiva = Pasiva
                    </span>
                  </div>
                  <h2 className="text-lg font-bold font-display mt-0.5 text-text">
                    {metrics.isBalanced
                      ? 'Seluruh Posisi Harta Aktiva Tepat Mengimbangi Modal & Pasiva'
                      : `Terdapat Selisih Pembukuan Sebesar ${formatCurrency(Math.abs(metrics.balanceDiff))}`}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-6 self-start md:self-auto font-mono text-sm bg-background/60 px-4 py-2.5 rounded-xl border border-border">
                <div>
                  <span className="text-[10px] text-text-muted uppercase block">Total Aktiva</span>
                  <span className="text-base font-bold text-primary">
                    {formatCurrency(metrics.aktiva.totalAktiva)}
                  </span>
                </div>
                <div className="text-text-muted text-lg font-bold">==</div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase block">Total Pasiva</span>
                  <span className="text-base font-bold text-secondary">
                    {formatCurrency(metrics.pasiva.totalPasiva)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VISUALISASI PAPAN MODEL T (INTERACTIVE T-ACCOUNT BOARD) */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* PANEL KIRI: SISI AKTIVA (HARTA & ASET) */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-primary/10 border-b border-primary/20 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold font-mono text-xs">
                    L
                  </div>
                  <div>
                    <h3 className="font-bold font-display text-text text-base">
                      SISI KIRI: AKTIVA (ASET)
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Seluruh sumber daya ekonomi dan harta yang dimiliki bengkel
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-primary bg-primary/15 px-2.5 py-1 rounded-lg border border-primary/30">
                  DEBET (+)
                </span>
              </div>

              <div className="p-6 space-y-4 flex-1">
                {/* 1. Kas & Rekening Bank */}
                <div className="p-4 bg-background/80 hover:bg-background rounded-xl border border-border flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text">Kas & Rekening Bank</h4>
                      <p className="text-[11px] text-text-muted">
                        Kas Awal + Masuk (SPK + Non-SPK) - Keluar (Borongan + OPEX + Non-SPK)
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-base text-text">
                    {formatCurrency(metrics.aktiva.cashBank)}
                  </span>
                </div>

                {/* 2. Piutang Usaha Proyek SPK */}
                <div className="p-4 bg-background/80 hover:bg-background rounded-xl border border-border flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text">Piutang Usaha Proyek (SPK)</h4>
                      <p className="text-[11px] text-text-muted">
                        Tagihan kontrak SPK yang belum lunas diselesaikan pelanggan
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-base text-text">
                    {formatCurrency(metrics.aktiva.receivables)}
                  </span>
                </div>

                {/* 3. Persediaan Gudang Fisik */}
                <div className="p-4 bg-background/80 hover:bg-background rounded-xl border border-border flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text">Persediaan Gudang Fisik</h4>
                      <p className="text-[11px] text-text-muted">
                        Total valuasi stok bahan baku (pelat, besi, cat) di gudang logistik
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-base text-text">
                    {formatCurrency(metrics.aktiva.physicalInventory)}
                  </span>
                </div>

                {/* 4. Nilai WIP Proyek Berjalan */}
                <div className="p-4 bg-background/80 hover:bg-background rounded-xl border border-border flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <PieChart className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text">Barang Dalam Proses (WIP)</h4>
                      <p className="text-[11px] text-text-muted">
                        Material yang sudah keluar ke bay SPK aktif dan belum serah terima (BAST)
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-base text-text">
                    {formatCurrency(metrics.aktiva.wipValue)}
                  </span>
                </div>

                {/* 5. Perlengkapan Pabrik */}
                <div className="p-4 bg-background/80 hover:bg-background rounded-xl border border-border flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text">Perlengkapan Pabrik (Consumables)</h4>
                      <p className="text-[11px] text-text-muted">
                        Perlengkapan Awal + Pembelian perlengkapan pabrik non-SPK
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-base text-text">
                    {formatCurrency(metrics.aktiva.suppliesValue)}
                  </span>
                </div>

                {/* 6. Peralatan & Mesin */}
                <div className="p-4 bg-background/80 hover:bg-background rounded-xl border border-border flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text">Peralatan & Mesin Pabrik</h4>
                      <p className="text-[11px] text-text-muted">
                        Peralatan Awal + Pembelian aset mesin baru dari buku kas
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-base text-text">
                    {formatCurrency(metrics.aktiva.equipmentValue)}
                  </span>
                </div>
              </div>

              {/* Footer Total Aktiva */}
              <div className="bg-surface-hover/70 border-t border-border px-6 py-4 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-text-muted block">
                    TOTAL KESELURUHAN AKTIVA
                  </span>
                  <span className="text-[11px] text-text-muted">Kas + Piutang + Gudang + WIP + Mesin + Perlengkapan</span>
                </div>
                <span className="font-mono font-bold text-xl text-primary">
                  {formatCurrency(metrics.aktiva.totalAktiva)}
                </span>
              </div>
            </div>

            {/* PANEL KANAN: SISI PASIVA (KEWAJIBAN & EKUITAS) */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-secondary/10 border-b border-secondary/20 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-secondary/20 border border-secondary/30 flex items-center justify-center text-secondary font-bold font-mono text-xs">
                    R
                  </div>
                  <div>
                    <h3 className="font-bold font-display text-text text-base">
                      SISI KANAN: PASIVA (KEWAJIBAN & MODAL)
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Klaim kreditur dan hak kepemilikan modal bersih pemilik bengkel
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-secondary bg-secondary/15 px-2.5 py-1 rounded-lg border border-secondary/30">
                  KREDIT (+)
                </span>
              </div>

              <div className="p-6 space-y-4 flex-1">
                {/* 1. Hutang Usaha & Pinjaman */}
                <div className="p-4 bg-background/80 hover:bg-background rounded-xl border border-border flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text">Hutang Usaha & Pinjaman</h4>
                      <p className="text-[11px] text-text-muted">
                        Hutang Awal + Tambah Pinjaman - Cicilan Hutang Dibayar
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-base text-status-danger">
                    {formatCurrency(metrics.pasiva.payables)}
                  </span>
                </div>

                {/* 2. Modal Awal Bersih */}
                <div className="p-4 bg-background/80 hover:bg-background rounded-xl border border-border flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text">Modal Awal Bersih (Ekuitas Awal)</h4>
                      <p className="text-[11px] text-text-muted">
                        (Kas + Inventaris + Mesin + Perlengkapan Awal) - Hutang Awal
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-base text-text">
                    {formatCurrency(metrics.pasiva.initialEquity)}
                  </span>
                </div>

                {/* 3. Tambahan Setoran Modal */}
                <div className="p-4 bg-background/80 hover:bg-background rounded-xl border border-border flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text">Tambahan Setoran Modal Pemilik</h4>
                      <p className="text-[11px] text-text-muted">
                        Injeksi modal baru yang disetor pemilik via Buku Kas
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-base text-text">
                    {formatCurrency(metrics.pasiva.capitalInjections)}
                  </span>
                </div>

                {/* 4. Laba / Rugi Berjalan */}
                <div className="p-4 bg-background/80 hover:bg-background rounded-xl border border-border flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        metrics.pasiva.netProfit >= 0
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {metrics.pasiva.netProfit >= 0 ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text">Laba / Rugi Bersih Berjalan</h4>
                      <p className="text-[11px] text-text-muted">
                        Pendapatan SPK ({formatCurrency(metrics.pasiva.totalRevenue)}) - HPP ({formatCurrency(metrics.pasiva.hppCompletedSpk)}) - OPEX ({formatCurrency(metrics.pasiva.totalOpex)})
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-mono font-bold text-base ${
                      metrics.pasiva.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(metrics.pasiva.netProfit)}
                  </span>
                </div>

                {/* 5. Prive Pemilik */}
                <div className="p-4 bg-background/80 hover:bg-background rounded-xl border border-border flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <MinusCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text">Penarikan Prive Pemilik</h4>
                      <p className="text-[11px] text-text-muted">
                        Pengambilan kas pribadi pemilik bengkel (mengurangi modal)
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-base text-amber-400">
                    -{formatCurrency(metrics.pasiva.prive)}
                  </span>
                </div>

                {/* 6. Total Modal Baru (Ekuitas Akhir) */}
                <div className="p-4 bg-emerald-950/20 hover:bg-emerald-950/30 rounded-xl border border-emerald-500/30 flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-400">Total Modal Baru (Ekuitas Akhir)</h4>
                      <p className="text-[11px] text-text-muted font-mono">
                        Modal Lama + Laba Bersih - Prive
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-base text-emerald-400">
                    {formatCurrency(metrics.pasiva.modalBaru)}
                  </span>
                </div>
              </div>

              {/* Footer Total Pasiva */}
              <div className="bg-surface-hover/70 border-t border-border px-6 py-4 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-text-muted block">
                    TOTAL KESELURUHAN PASIVA
                  </span>
                  <span className="text-[11px] text-text-muted">Hutang Usaha + Modal Baru (Ekuitas Akhir)</span>
                </div>
                <span className="font-mono font-bold text-xl text-secondary">
                  {formatCurrency(metrics.pasiva.totalPasiva)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* RINGKASAN ARUS KAS (CASH FLOW STRIP) */}
        {metrics && (
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Ringkasan Rekonsiliasi Aliran Kas (Cash Reconciliation)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
              <div className="p-4 bg-background/80 rounded-xl border border-border">
                <span className="text-[10px] text-text-muted uppercase block">Kas Awal</span>
                <span className="text-base font-bold text-text">
                  {formatCurrency(metrics.cashSummary.initialCash)}
                </span>
              </div>
              <div className="p-4 bg-background/80 rounded-xl border border-border">
                <span className="text-[10px] text-emerald-400 uppercase block">Total Kas Masuk (+)</span>
                <span className="text-base font-bold text-emerald-400">
                  +{formatCurrency(metrics.cashSummary.totalCashIn)}
                </span>
                <span className="text-[10px] text-text-muted block mt-0.5">
                  SPK: {formatCurrency(metrics.cashSummary.totalCashInSpk)} | Non-SPK: {formatCurrency(metrics.cashSummary.totalCashInNonSpk)}
                </span>
              </div>
              <div className="p-4 bg-background/80 rounded-xl border border-border">
                <span className="text-[10px] text-rose-400 uppercase block">Total Kas Keluar (-)</span>
                <span className="text-base font-bold text-rose-400">
                  -{formatCurrency(metrics.cashSummary.totalCashOut)}
                </span>
                <span className="text-[10px] text-text-muted block mt-0.5">
                  SPK: {formatCurrency(metrics.cashSummary.totalCashOutSpk)} | OPEX: {formatCurrency(metrics.cashSummary.totalCashOutOpex)}
                </span>
              </div>
              <div className="p-4 bg-background/80 rounded-xl border border-primary/30">
                <span className="text-[10px] text-primary uppercase block">Saldo Kas Akhir</span>
                <span className="text-base font-bold text-primary">
                  {formatCurrency(metrics.cashSummary.endingCash)}
                </span>
                <span className="text-[10px] text-text-muted block mt-0.5">
                  Net: {formatCurrency(metrics.cashSummary.netCashFlow)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TABEL BUKU KAS NON-SPK (CASH LEDGER MUTATIONS) */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold font-display text-text">
                Riwayat Transaksi Kas Non-SPK
              </h3>
              <p className="text-xs text-text-muted">
                Daftar mutasi kas peralatan, perlengkapan, modal disetor, penarikan prive, dan pembayaran hutang
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCashModal('IN')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                + Kas Masuk
              </button>
              <button
                onClick={() => handleOpenCashModal('OUT')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow"
              >
                <MinusCircle className="w-3.5 h-3.5" />
                - Kas Keluar
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi kas atau nomor bukti..."
                className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as any)}
                className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary"
              >
                <option value="ALL">Semua Arah</option>
                <option value="IN">Kas Masuk (+)</option>
                <option value="OUT">Kas Keluar (-)</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="CAPITAL_INJECTION">Setoran Modal Pemilik</option>
                <option value="DEBT_RECEIVED">Terima Pinjaman/Hutang</option>
                <option value="OTHER_INCOME">Pendapatan Lain-lain</option>
                <option value="EQUIPMENT_PURCHASE">Beli Mesin/Peralatan</option>
                <option value="SUPPLIES_PURCHASE">Beli Perlengkapan Pabrik</option>
                <option value="PRIVE_WITHDRAWAL">Penarikan Prive</option>
                <option value="DEBT_REPAYMENT">Bayar Cicilan Hutang</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-hover text-text-muted font-semibold uppercase tracking-wider text-[11px] border-b border-border">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">No. Bukti</th>
                  <th className="px-4 py-3">Arah & Kategori</th>
                  <th className="px-4 py-3">Keperluan / Keterangan</th>
                  <th className="px-4 py-3">Metode</th>
                  <th className="px-4 py-3 text-right">Nominal (Rp)</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                      {transactions.length === 0
                        ? 'Belum ada transaksi kas non-SPK yang dicatat. Klik "+ Kas Masuk" atau "- Kas Keluar" untuk mencatat.'
                        : 'Tidak ada transaksi yang cocok dengan kriteria pencarian.'}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-hover/50 transition">
                      <td className="px-4 py-3 font-mono text-text-muted whitespace-nowrap">
                        {tx.transaction_date}
                      </td>
                      <td className="px-4 py-3 font-mono text-text whitespace-nowrap">
                        {tx.receipt_no || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                              tx.direction === 'IN'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {tx.direction === 'IN' ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            {tx.direction}
                          </span>
                          <span className="text-text font-medium">
                            {getCategoryLabel(tx.category)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className="px-4 py-3 font-mono text-text-muted whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-surface border border-border text-[10px]">
                          {tx.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-right whitespace-nowrap">
                        <span
                          className={tx.direction === 'IN' ? 'text-emerald-400' : 'text-rose-400'}
                        >
                          {tx.direction === 'IN' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          disabled={deletingId === tx.id}
                          className="p-1.5 text-text-muted hover:text-status-danger rounded-lg hover:bg-surface-hover transition disabled:opacity-50"
                          title="Hapus Transaksi Kas"
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
        </div>
      </main>

      {/* Modals */}
      <InitialBalanceModal
        isOpen={isInitialBalanceModalOpen}
        onClose={() => setIsInitialBalanceModalOpen(false)}
        onSuccess={fetchData}
        currentBalance={metrics?.initialBalance || null}
      />

      <CashTransactionModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        onSuccess={fetchData}
        defaultDirection={cashModalDirection}
      />
    </div>
  );
};
