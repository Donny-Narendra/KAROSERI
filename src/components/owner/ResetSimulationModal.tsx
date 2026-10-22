import React, { useState } from 'react';
import { 
  X, 
  AlertOctagon, 
  Trash2, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface ResetSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REQUIRED_CONFIRM_KEYWORD = 'RESET SIMULASI';

export const ResetSimulationModal: React.FC<ResetSimulationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfirmed = typedConfirmation.trim() === REQUIRED_CONFIRM_KEYWORD;

  const handleReset = async () => {
    if (!isConfirmed || loading) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.rpc('reset_all_simulation_transactions');

      if (error) {
        throw new Error(error.message || 'Terjadi kesalahan saat memanggil RPC reset transaksi.');
      }

      if (data && data.success === false) {
        throw new Error(data.error || 'Gagal mereset transaksi simulasi.');
      }

      setSuccessMsg(data?.message || 'Seluruh transaksi simulasi berhasil dibersihkan.');
      
      // Berikan jeda sejenak untuk feedback visual, lalu reload halaman
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      }, 1200);
    } catch (err: any) {
      console.error('Reset simulation transactions failed:', err);
      setErrorMsg(err.message || 'Gagal mengeksekusi reset database simulasi.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setTypedConfirmation('');
    setErrorMsg(null);
    setSuccessMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-rose-500/40 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Danger */}
        <div className="px-6 py-5 border-b border-rose-500/30 bg-rose-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-display text-rose-200">
                  Reset Seluruh Transaksi Simulasi
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                  Khusus Owner
                </span>
              </div>
              <p className="text-xs text-rose-300/80">
                Pembersihan data operasional untuk mengulang simulasi dari kondisi awal (Fresh State)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface-hover transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-4 bg-status-danger/15 border border-status-danger/30 rounded-xl text-status-danger text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{successMsg} Merefresh terminal...</span>
            </div>
          )}

          {/* Warning Card */}
          <div className="p-4 bg-rose-950/30 border border-rose-500/20 rounded-xl space-y-2 text-xs">
            <h3 className="font-bold text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Peringatan Tindakan Destruktif Permanen
            </h3>
            <p className="text-text-muted leading-relaxed">
              Tindakan ini dirancang khusus untuk sesi uji coba dan simulasi bengkel. Seluruh jejak transaksi SPK dan mutasi kas non-SPK akan <strong>dihapus permanen</strong> dari basis data.
            </p>
          </div>

          {/* Dual List: Data Terhapus vs Dilindungi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-background rounded-xl border border-rose-500/20 space-y-2">
              <span className="font-bold text-rose-400 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                Data Dihapus Bersih:
              </span>
              <ul className="space-y-1 text-text-muted text-[11px] list-disc list-inside">
                <li>Seluruh Transaksi SPK & Estimasi RAB</li>
                <li>Riwayat Mutasi & Permintaan Gudang</li>
                <li>Log WBS & Borongan Mandor</li>
                <li>Faktur Invoice & Pembayaran Kasir</li>
                <li>Buku Kas Masuk/Keluar Non-SPK</li>
              </ul>
            </div>

            <div className="p-3.5 bg-background rounded-xl border border-emerald-500/20 space-y-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Data Aman Dilindungi:
              </span>
              <ul className="space-y-1 text-text-muted text-[11px] list-disc list-inside">
                <li>Master Katalog Material & Jasa</li>
                <li>Paket Perakitan / BOM Produk</li>
                <li>Kategori Beban Operasional</li>
                <li>Catatan Beban Berkala (OPEX)</li>
                <li>Profil Akun Pengguna & Hak Akses</li>
                <li className="text-emerald-400 font-mono">Stok Bahan Gudang di-reset = 100</li>
              </ul>
            </div>
          </div>

          {/* Security Two-Factor Text Input */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-xs font-semibold text-text block">
              Ketik kata konfirmasi berikut untuk membuka penguncian tombol:
            </label>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono font-bold text-xs rounded-lg select-all">
                {REQUIRED_CONFIRM_KEYWORD}
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                disabled={loading || Boolean(successMsg)}
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder="Ketik RESET SIMULASI di sini..."
                className={`w-full bg-background border rounded-xl px-4 py-2.5 text-xs font-mono text-text focus:outline-none transition ${
                  isConfirmed
                    ? 'border-emerald-500 ring-1 ring-emerald-500/30 text-emerald-300'
                    : 'border-border focus:border-rose-500'
                }`}
                autoFocus
              />
              {isConfirmed && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
            <p className="text-[11px] text-text-muted">
              Huruf besar dan spasi harus sesuai persis.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-surface-hover/30 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text rounded-xl hover:bg-surface-hover transition disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={!isConfirmed || loading || Boolean(successMsg)}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-lg ${
              isConfirmed && !loading && !successMsg
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 cursor-pointer'
                : 'bg-rose-950/40 text-rose-500/40 border border-rose-900/40 cursor-not-allowed opacity-60'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Membersihkan Basis Data...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Hapus Semua Transaksi & Reset</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
