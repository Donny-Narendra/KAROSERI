import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ShieldAlert, 
  EyeOff, 
  Eye, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  CheckSquare, 
  Square, 
  Info,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export interface SpkIsolationItem {
  id: string;
  spk_no: string;
  customer_name: string;
  vehicle_plate?: string | null;
  status: string;
  is_hidden: boolean;
  is_test: boolean;
  hidden_at?: string | null;
  hidden_reason?: string | null;
  created_at: string;
}

interface SpkIsolationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REQUIRED_CONFIRM_KEYWORD = 'KONFIRMASI';

export const SpkIsolationManagerModal: React.FC<SpkIsolationManagerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [spks, setSpks] = useState<SpkIsolationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE' | 'ISOLATED'>('ALL');

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'ISOLATE' | 'RESTORE';
  } | null>(null);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [reason, setReason] = useState('Uji Coba Sistem / Isolasi Finansial');
  const [executing, setExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSpks();
      setSelectedIds(new Set());
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const loadSpks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spk')
        .select('id, spk_no, customer_name, vehicle_plate, status, is_hidden, is_test, hidden_at, hidden_reason, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading SPKs for isolation manager:', error);
        setErrorMsg('Gagal memuat daftar SPK: ' + error.message);
      } else {
        setSpks((data || []) as SpkIsolationItem[]);
      }
    } catch (err: any) {
      console.error('Unexpected error loading SPKs:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat memuat data SPK.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSpks = useMemo(() => {
    return spks.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (s.spk_no && s.spk_no.toLowerCase().includes(q)) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.vehicle_plate && s.vehicle_plate.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterType === 'ACTIVE') return !s.is_hidden && !s.is_test;
      if (filterType === 'ISOLATED') return s.is_hidden || s.is_test;
      return true;
    });
  }, [spks, searchQuery, filterType]);

  const isAllVisibleSelected = useMemo(() => {
    if (filteredSpks.length === 0) return false;
    return filteredSpks.every(s => selectedIds.has(s.id));
  }, [filteredSpks, selectedIds]);

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllVisibleSelected) {
      filteredSpks.forEach(s => next.delete(s.id));
    } else {
      filteredSpks.forEach(s => next.add(s.id));
    }
    setSelectedIds(next);
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleOpenConfirm = (action: 'ISOLATE' | 'RESTORE') => {
    if (selectedIds.size === 0) return;
    setConfirmDialog({ isOpen: true, action });
    setTypedConfirmation('');
    if (action === 'ISOLATE') {
      setReason('Uji Coba Sistem / Isolasi Finansial');
    }
    setErrorMsg(null);
  };

  const handleCloseConfirm = () => {
    if (executing) return;
    setConfirmDialog(null);
    setTypedConfirmation('');
  };

  const isConfirmValid = typedConfirmation.trim() === REQUIRED_CONFIRM_KEYWORD;

  const handleExecuteAction = async () => {
    if (!confirmDialog || !isConfirmValid || executing) return;

    setExecuting(true);
    setErrorMsg(null);

    const isIsolate = confirmDialog.action === 'ISOLATE';
    const targetSpkIds = Array.from(selectedIds);

    try {
      const { error } = await supabase.rpc('set_spk_isolation_status', {
        p_spk_ids: targetSpkIds,
        p_is_hidden: isIsolate,
        p_is_test: isIsolate,
        p_reason: isIsolate ? reason.trim() : 'Dipulihkan ke sistem'
      });

      if (error) {
        throw new Error(error.message || 'Gagal mengubah status isolasi SPK.');
      }

      setSuccessMsg(
        isIsolate
          ? `${targetSpkIds.length} SPK berhasil diisolasi dan disembunyikan dari laporan finansial.`
          : `${targetSpkIds.length} SPK berhasil dipulihkan kembali ke sistem finansial dan antrean operasional.`
      );

      // Reset selection and reload data
      setSelectedIds(new Set());
      setConfirmDialog(null);
      await loadSpks();
      onSuccess?.();
    } catch (err: any) {
      console.error('Error executing set_spk_isolation_status RPC:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses status isolasi SPK.');
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface-hover flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display text-text">
                  Manajemen Isolasi SPK (Soft-Isolation)
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                  Khusus Owner
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Keluarkan SPK uji coba dari laporan laba rugi (/finance-reports) & antrean tanpa hard delete.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-background transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-300">
          <Info className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            SPK yang diisolasi tidak akan dihitung pada Laba Rugi Proyek (Job Profitability), Varian Biaya WBS, 
            maupun dasbor harian, menjaga audit trail tetap aman tanpa merusak integritas stok atau finansial.
          </span>
        </div>

        {/* Notification Messages */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="p-6 pb-3 border-b border-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Cari No SPK, Customer, atau Nopol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center rounded-lg border border-border bg-background p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType('ALL')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    filterType === 'ALL' ? 'bg-primary/20 text-primary font-semibold' : 'text-text-muted hover:text-text'
                  }`}
                >
                  Semua ({spks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('ACTIVE')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    filterType === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-text-muted hover:text-text'
                  }`}
                >
                  Aktif ({spks.filter(s => !s.is_hidden).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('ISOLATED')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    filterType === 'ISOLATED' ? 'bg-rose-500/20 text-rose-400 font-semibold' : 'text-text-muted hover:text-text'
                  }`}
                >
                  Terisolasi ({spks.filter(s => s.is_hidden).length})
                </button>
              </div>
            </div>

            <button
              onClick={loadSpks}
              disabled={loading}
              className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:bg-background transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-text-muted">
                {selectedIds.size} SPK dipilih dari {filteredSpks.length} data
              </span>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-primary hover:underline"
                >
                  Batal Pilih
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenConfirm('ISOLATE')}
                disabled={selectedIds.size === 0}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Sembunyikan & Isolasi</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenConfirm('RESTORE')}
                disabled={selectedIds.size === 0}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pulihkan ke Sistem</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Checklist */}
        <div className="flex-1 overflow-auto p-6 pt-0">
          <div className="border border-border rounded-lg overflow-hidden mt-3">
            <table className="w-full text-left text-xs text-text">
              <thead className="bg-background text-text-muted font-mono uppercase border-b border-border">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-text-muted hover:text-text transition"
                      title={isAllVisibleSelected ? 'Batalkan Semua' : 'Pilih Semua'}
                    >
                      {isAllVisibleSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 font-semibold">No. SPK</th>
                  <th className="p-3 font-semibold">Pelanggan</th>
                  <th className="p-3 font-semibold">Kendaraan / Nopol</th>
                  <th className="p-3 font-semibold">Status SPK</th>
                  <th className="p-3 font-semibold">Status Isolasi</th>
                  <th className="p-3 font-semibold">Dibuat Pada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-muted">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Memuat data SPK...
                    </td>
                  </tr>
                ) : filteredSpks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-muted">
                      Tidak ada SPK yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredSpks.map(spk => {
                    const isSelected = selectedIds.has(spk.id);
                    const isIsolated = spk.is_hidden || spk.is_test;

                    return (
                      <tr
                        key={spk.id}
                        onClick={() => handleToggleRow(spk.id)}
                        className={`cursor-pointer transition hover:bg-surface-hover ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleToggleRow(spk.id)}
                            className="text-text-muted hover:text-text transition"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="p-3 font-mono font-bold text-text">
                          {spk.spk_no}
                        </td>
                        <td className="p-3 font-medium text-text">
                          {spk.customer_name}
                        </td>
                        <td className="p-3 font-mono text-text-muted">
                          {spk.vehicle_plate || '-'}
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-surface border border-border text-text-muted uppercase">
                            {spk.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {isIsolated ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 w-fit">
                                <EyeOff className="w-3 h-3 text-rose-400" />
                                TERISOLASI
                              </span>
                              {spk.hidden_reason && (
                                <span className="text-[10px] text-text-muted mt-0.5 truncate max-w-[150px]" title={spk.hidden_reason}>
                                  {spk.hidden_reason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 w-fit">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              NORMAL
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-text-muted">
                          {new Date(spk.created_at).toLocaleDateString('id-ID')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-hover flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Tindakan isolasi hanya dapat dilakukan dan dibatalkan oleh akun dengan kewenangan Owner.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface border border-border hover:bg-background text-xs font-medium text-text transition"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Dedicated Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-fade-in">
          <div className="bg-surface border border-border w-full max-w-lg rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                confirmDialog.action === 'ISOLATE'
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                  : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              }`}>
                {confirmDialog.action === 'ISOLATE' ? (
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold font-display text-text">
                  {confirmDialog.action === 'ISOLATE'
                    ? `Konfirmasi Isolasi Finansial (${selectedIds.size} SPK)`
                    : `Konfirmasi Pemulihan SPK (${selectedIds.size} SPK)`}
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  {confirmDialog.action === 'ISOLATE'
                    ? 'SPK yang dipilih akan dikeluarkan dari perhitungan Laporan Laba Rugi (/finance-reports), Varian Biaya WBS, dan disembunyikan dari dashboard antrean utama. Audit trail & stok gudang tetap dipertahankan.'
                    : 'SPK yang dipilih akan dikembalikan ke dalam kalkulasi finansial komprehensif dan kembali terlihat pada antrean kerja dashboard utama.'}
                </p>
              </div>
            </div>

            {confirmDialog.action === 'ISOLATE' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-text">
                  Alasan Isolasi / Catatan Audit
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Uji Coba Sistem / Simulasi Harga"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-primary"
                />
              </div>
            )}

            {/* Instruction to type KONFIRMASI */}
            <div className="p-3 rounded-lg bg-background border border-border space-y-2">
              <p className="text-xs text-text font-medium">
                Ketik teks <span className="font-mono font-bold text-primary">KONFIRMASI</span> di bawah ini untuk melanjutkan:
              </p>
              <input
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder="Ketik KONFIRMASI"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono text-text focus:outline-none focus:border-primary tracking-wider"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCloseConfirm}
                disabled={executing}
                className="px-4 py-2 rounded-lg border border-border text-xs text-text-muted hover:text-text hover:bg-background transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={!isConfirmValid || executing}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  confirmDialog.action === 'ISOLATE'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white disabled:bg-rose-900/50 disabled:text-rose-400/60'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-emerald-900/50 disabled:text-emerald-400/60'
                } disabled:cursor-not-allowed`}
              >
                {executing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {confirmDialog.action === 'ISOLATE' ? 'Eksekusi Isolasi' : 'Eksekusi Pemulihan'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
