import React, { useState, useEffect } from 'react';
import { Layers, RotateCcw, Save, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStageSettings, DEFAULT_STAGE_NAMES } from '../../hooks/useStageSettings';

export interface StageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StageSettingsModal: React.FC<StageSettingsModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const { stageAliases, updateStageAliases, resetToDefault, loading } = useStageSettings();

  const [formAliases, setFormAliases] = useState<Record<string, string>>({ ...DEFAULT_STAGE_NAMES });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (stageAliases && Object.keys(stageAliases).length > 0) {
      setFormAliases({
        '1': stageAliases['1'] || DEFAULT_STAGE_NAMES['1'],
        '2': stageAliases['2'] || DEFAULT_STAGE_NAMES['2'],
        '3': stageAliases['3'] || DEFAULT_STAGE_NAMES['3'],
        '4': stageAliases['4'] || DEFAULT_STAGE_NAMES['4'],
        '5': stageAliases['5'] || DEFAULT_STAGE_NAMES['5'],
      });
    }
  }, [stageAliases]);

  if (!isOpen) return null;

  // Khusus role owner
  if (profile?.role !== 'owner') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-surface border border-status-danger/40 rounded-xl max-w-md w-full p-6 text-center">
          <AlertCircle className="w-12 h-12 text-status-danger mx-auto mb-3" />
          <h3 className="text-lg font-bold text-text mb-2">Akses Terbatas</h3>
          <p className="text-sm text-text-muted mb-4">
            Hanya Owner yang berhak mengonfigurasi dan mengubah istilah tahapan kerja (WBS) bengkel.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-hover hover:bg-surface-active rounded-lg text-sm text-text transition"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const handleInputChange = (stageNum: string, value: string) => {
    setFormAliases((prev) => ({
      ...prev,
      [stageNum]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const sanitized: Record<string, string> = {
        '1': (formAliases['1'] || '').trim() || DEFAULT_STAGE_NAMES['1'],
        '2': (formAliases['2'] || '').trim() || DEFAULT_STAGE_NAMES['2'],
        '3': (formAliases['3'] || '').trim() || DEFAULT_STAGE_NAMES['3'],
        '4': (formAliases['4'] || '').trim() || DEFAULT_STAGE_NAMES['4'],
        '5': (formAliases['5'] || '').trim() || DEFAULT_STAGE_NAMES['5'],
      };

      const result = await updateStageAliases(sanitized);
      if (result.error) {
        setErrorMessage(result.error.message || 'Gagal menyimpan konfigurasi istilah tahapan.');
      } else {
        setSuccessMessage('Istilah tahapan kerja (WBS) berhasil disimpan dan diperbarui di seluruh modul!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const result = await resetToDefault();
      if (result.error) {
        setErrorMessage(result.error.message || 'Gagal mereset ke istilah default.');
      } else {
        setFormAliases({ ...DEFAULT_STAGE_NAMES });
        setSuccessMessage('Istilah tahapan telah dikembalikan ke 5 istilah bawaan bengkel!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface border border-border rounded-xl max-w-xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-text">
                Pengaturan Istilah Tahapan Kerja (WBS)
              </h2>
              <p className="text-xs text-text-muted">
                Dinamisasi sebutan 5 tahapan kerja untuk bahasa lokal bengkel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-hover transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-xs text-text-muted leading-relaxed">
            <p>
              💡 <span className="font-semibold text-slate-300">Prinsip Integritas Data:</span> Mengubah istilah ini hanya memodifikasi label tampilan di antarmuka (UI). Nilai asli database PostgreSQL enum, kalkulasi finansial, dan audit historis tetap terjaga aman.
            </p>
          </div>

          {successMessage && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Tahapan 1 */}
            <div>
              <label className="block text-xs font-mono font-medium text-amber-400 mb-1 flex items-center justify-between">
                <span>Tahapan 1 (Default: Pembongkaran)</span>
                <span className="text-[10px] text-text-muted font-normal">Kategori: Pembongkaran</span>
              </label>
              <input
                type="text"
                value={formAliases['1'] || ''}
                onChange={(e) => handleInputChange('1', e.target.value)}
                placeholder="Contoh: Pembongkaran / Kupas Plat"
                disabled={loading || isSubmitting}
                className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-text focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
              />
            </div>

            {/* Tahapan 2 */}
            <div>
              <label className="block text-xs font-mono font-medium text-blue-400 mb-1 flex items-center justify-between">
                <span>Tahapan 2 (Default: Sasis/Rangka)</span>
                <span className="text-[10px] text-text-muted font-normal">Kategori: Sasis/Rangka</span>
              </label>
              <input
                type="text"
                value={formAliases['2'] || ''}
                onChange={(e) => handleInputChange('2', e.target.value)}
                placeholder="Contoh: Sasis & Rangka Utama"
                disabled={loading || isSubmitting}
                className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-text focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            {/* Tahapan 3 */}
            <div>
              <label className="block text-xs font-mono font-medium text-purple-400 mb-1 flex items-center justify-between">
                <span>Tahapan 3 (Default: Dinding/Fabrikasi)</span>
                <span className="text-[10px] text-text-muted font-normal">Kategori: Dinding/Fabrikasi</span>
              </label>
              <input
                type="text"
                value={formAliases['3'] || ''}
                onChange={(e) => handleInputChange('3', e.target.value)}
                placeholder="Contoh: Dinding & Fabrikasi Bak"
                disabled={loading || isSubmitting}
                className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-text focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
              />
            </div>

            {/* Tahapan 4 */}
            <div>
              <label className="block text-xs font-mono font-medium text-emerald-400 mb-1 flex items-center justify-between">
                <span>Tahapan 4 (Default: Pengecatan)</span>
                <span className="text-[10px] text-text-muted font-normal">Kategori: Cat/Finishing</span>
              </label>
              <input
                type="text"
                value={formAliases['4'] || ''}
                onChange={(e) => handleInputChange('4', e.target.value)}
                placeholder="Contoh: Dempul & Cat Oven"
                disabled={loading || isSubmitting}
                className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-text focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Tahapan 5 */}
            <div>
              <label className="block text-xs font-mono font-medium text-cyan-400 mb-1 flex items-center justify-between">
                <span>Tahapan 5 (Default: Kelistrikan/Hidrolik)</span>
                <span className="text-[10px] text-text-muted font-normal">Kategori: Kelistrikan/Hidrolik</span>
              </label>
              <input
                type="text"
                value={formAliases['5'] || ''}
                onChange={(e) => handleInputChange('5', e.target.value)}
                placeholder="Contoh: Kelistrikan & Instalasi Hidrolik"
                disabled={loading || isSubmitting}
                className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-text focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting || loading}
              className="px-3.5 py-2 bg-surface hover:bg-surface-hover text-text-muted hover:text-text border border-border rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-xs text-text transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="px-5 py-2 bg-primary hover:bg-secondary text-background font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Istilah Baru'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

