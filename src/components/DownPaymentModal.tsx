import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Receipt } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen && suggestedAmount !== undefined) {
      setAmount(suggestedAmount.toString());
    }
  }, [isOpen, suggestedAmount]);

  if (!isOpen || !spk) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dpAmount = Number(amount);
    if (isNaN(dpAmount) || dpAmount <= 0) {
      alert('Nominal DP tidak valid');
      return;
    }

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
      
      alert('DP berhasil dicatat dan SPK sekarang berstatus ACTIVE.');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Gagal memproses DP: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl shadow-2xl border border-surface-border w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-5 border-b border-surface-border bg-surface-hover/50">
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
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-background rounded-lg p-4 border border-surface-border grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Nomor SPK</p>
              <p className="font-medium text-text-primary">{spk.id}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Konsumen</p>
              <p className="font-medium text-text-primary">{spk.customerName}</p>
            </div>
            <div className="col-span-2 pt-2 border-t border-surface-border border-dashed mt-1">
              <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Estimasi Total RAB</p>
              <p className="font-semibold text-lg text-secondary">
                {formatCurrency(spk.materialCost + spk.jasaCost + spk.overheadCost)}
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
              rows={3} 
              className="w-full bg-background border border-surface-border rounded-lg px-4 py-2.5 text-text-primary outline-none focus:border-primary transition-all resize-none" 
              placeholder="Contoh: Transfer BCA an Budi, No Ref: 12345678"
            ></textarea>
          </div>

          <div className="pt-2 flex justify-end gap-3">
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
    </div>
  );
}
