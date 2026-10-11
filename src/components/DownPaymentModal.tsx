import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Receipt } from 'lucide-react';
import { ConfirmationModal, type ConfirmationModalVariant } from './ConfirmationModal';

interface DownPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  spk: any;
  suggestedAmount?: number;
  onSuccess: () => void;
}

export const DownPaymentModal: React.FC<DownPaymentModalProps> = ({ isOpen, onClose, spk, suggestedAmount, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Transfer Bank');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    variant?: ConfirmationModalVariant;
    confirmText?: string;
    cancelText?: string;
    hideCancel?: boolean;
    isLoading?: boolean;
    onConfirm?: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
  });

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false, isLoading: false }));
  };

  useEffect(() => {
    if (isOpen && suggestedAmount !== undefined) {
      setAmount(suggestedAmount.toString());
    }
  }, [isOpen, suggestedAmount]);

  if (!isOpen || !spk) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dpAmount = Number(amount);
    if (isNaN(dpAmount) || dpAmount <= 0) {
      setModalConfig({
        isOpen: true,
        title: 'Nominal DP Tidak Valid',
        message: 'Harap masukkan nominal uang muka (DP) yang valid lebih besar dari Rp 0.',
        variant: 'warning',
        hideCancel: true,
        confirmText: 'Mengerti',
        onConfirm: closeModal,
      });
      return;
    }

    setModalConfig({
      isOpen: true,
      title: 'Konfirmasi Penerimaan Uang Muka (DP)',
      variant: 'warning',
      confirmText: 'Ya, Terima DP & Aktifkan SPK',
      cancelText: 'Periksa Kembali',
      message: `Apakah Anda yakin ingin membukukan penerimaan uang muka (DP) berikut?\n\n` +
        `• No. SPK: ${spk.id}\n` +
        `• Konsumen: ${spk.customerName}\n` +
        `• Nominal DP: ${formatCurrency(dpAmount)}\n` +
        `• Metode Pembayaran: ${paymentMethod}\n` +
        (notes ? `• Catatan/Referensi: ${notes}\n\n` : '\n') +
        `Tindakan ini akan mencatat transaksi pembayaran dan mengubah status SPK menjadi ACTIVE agar pengerjaan produksi dapat dimulai.`,
      onConfirm: () => executeSubmitDp(dpAmount),
    });
  };

  const executeSubmitDp = async (dpAmount: number) => {
    setModalConfig(prev => ({ ...prev, isLoading: true }));
    setIsSubmitting(true);
    try {
      // 1. Simpan catatan pembayaran ke tabel payments
      const { error: paymentError } = await supabase.from('payments').insert({
        spk_id: spk.dbId,
        payment_type: 'DP',
        amount: dpAmount,
        payment_method: paymentMethod,
        notes: notes
      });

      if (paymentError) {
        console.error("Gagal mencatat pembayaran, pastikan tabel payments sudah dibuat.", paymentError);
        // Kita tetap lanjutkan update SPK agar tidak memblokir alur kerja jika migration belum dijalankan
      }
      
      // 2. Update status SPK dan jumlah DP
      const { error: spkError } = await supabase.from('spk').update({ 
        dp_amount: dpAmount, 
        status: 'ACTIVE' 
      }).eq('id', spk.dbId);

      if (spkError) throw spkError;
      
      setModalConfig({
        isOpen: true,
        title: 'DP Berhasil Dicatat',
        message: `Penerimaan DP sebesar ${formatCurrency(dpAmount)} telah berhasil dibukukan.\n\nStatus SPK ${spk.id} kini resmi berubah menjadi ACTIVE.`,
        variant: 'success',
        hideCancel: true,
        confirmText: 'Selesai',
        onConfirm: () => {
          closeModal();
          onSuccess();
          onClose();
        },
      });
    } catch (err: any) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        title: 'Gagal Memproses DP',
        message: 'Terjadi kesalahan sistem saat memproses DP: ' + (err?.message || 'Unknown error'),
        variant: 'danger',
        hideCancel: true,
        confirmText: 'Tutup',
        onConfirm: closeModal,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl shadow-2xl border border-surface-border w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-surface-border bg-surface shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-display font-semibold text-xl text-text-primary">Terima Uang Muka (DP)</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-full hover:bg-surface-border">
            <X className="w-5 h-5"/>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-background rounded-lg p-3 border border-surface-border grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Nomor SPK</p>
              <p className="font-medium text-text-primary">{spk.id}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Konsumen</p>
              <p className="font-medium text-text-primary">{spk.customerName}</p>
            </div>
            <div className="col-span-2 pt-2 border-t border-surface-border border-dashed mt-1">
              <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Total Tagihan (Final Bill)</p>
              <p className="font-semibold text-lg text-secondary">
                {formatCurrency(suggestedAmount || 0)}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Nominal DP (Rp) <span className="text-status-danger">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-medium">Rp</span>
              <input 
                type="number" 
                required 
                min="1" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                className="w-full bg-background border border-surface-border focus:border-primary rounded-lg pl-10 pr-4 py-2.5 text-text-primary outline-none transition-all" 
                placeholder="Masukkan jumlah DP"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Metode Pembayaran <span className="text-status-danger">*</span></label>
            <select 
              value={paymentMethod} 
              onChange={e => setPaymentMethod(e.target.value)} 
              className="w-full bg-background border border-surface-border rounded-lg px-4 py-2.5 text-text-primary outline-none focus:border-primary transition-all cursor-pointer"
            >
              <option value="Transfer Bank">Transfer Bank</option>
              <option value="Tunai">Tunai / Cash</option>
              <option value="Giro / Cek">Giro / Cek</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Catatan / No. Referensi Bukti</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              rows={2} 
              className="w-full bg-background border border-surface-border rounded-lg px-4 py-2 text-text-primary outline-none focus:border-primary transition-all resize-none" 
              placeholder="Contoh: Transfer BCA an Budi, No Ref: 12345678"
            ></textarea>
          </div>
        </div>

        <div className="shrink-0 p-4 border-t border-surface-border bg-surface flex justify-end gap-3 z-10">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 rounded-lg text-text-muted font-medium hover:bg-surface-border hover:text-text-primary transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? 'Memproses...' : 'Simpan Pembayaran & Aktifkan SPK'}
            </button>
          </div>
        </form>
      </div>
      {/* Confirmation & Notification Modal */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        variant={modalConfig.variant}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        hideCancel={modalConfig.hideCancel}
        isLoading={modalConfig.isLoading}
        onConfirm={modalConfig.onConfirm || closeModal}
        onCancel={closeModal}
      />
    </div>
  );
};
