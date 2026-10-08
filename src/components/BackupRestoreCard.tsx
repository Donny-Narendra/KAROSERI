import React, { useState } from 'react';
import { Download, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export const BackupRestoreCard: React.FC = () => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Use Supabase Edge Functions URL
  const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL || '';
  const API_URL = `${PROJECT_URL}/functions/v1`;

  const getSessionToken = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      return data.session.access_token;
    }
    throw new Error('Sesi tidak ditemukan atau kedaluwarsa. Silakan login ulang.');
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    setMessage(null);
    try {
      const token = await getSessionToken();
      const response = await fetch(`${API_URL}/backup`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        let errMessage = 'Gagal mengunduh backup';
        try {
          const errData = await response.clone().json();
          if (errData?.error) errMessage += `: ${errData.error}`;
        } catch(e) {}
        throw new Error(errMessage);
      }

      // Create a blob from the response stream and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `karoseriops-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql.gz`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setMessage({ text: 'Backup berhasil diunduh.', type: 'success' });
    } catch (error: any) {
      console.error(error);
      setMessage({ text: error.message || 'Terjadi kesalahan saat backup', type: 'error' });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage({ text: 'Pilih file backup (.sql.gz) terlebih dahulu', type: 'error' });
      return;
    }
    setShowConfirmModal(true);
  };

  const executeRestore = async () => {
    if (!selectedFile) return;
    
    setShowConfirmModal(false);
    setIsRestoring(true);
    setMessage(null);
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const token = await getSessionToken();
      const response = await fetch(`${API_URL}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal merestore database');
      }

      setMessage({ text: 'Database berhasil dipulihkan.', type: 'success' });
      setSelectedFile(null);
      // Optional: window.location.reload(); to refresh state
    } catch (error: any) {
      console.error(error);
      setMessage({ text: error.message || 'Terjadi kesalahan saat restore', type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 text-primary rounded-lg">
          <Download className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text">Manajemen Data (Backup & Restore)</h2>
          <p className="text-sm text-text-muted">Unduh atau pulihkan keseluruhan data operasional bengkel.</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${message.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
          {message.type === 'error' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <div className="w-5 h-5 shrink-0">✓</div>}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Section */}
        <div className="p-5 border border-border rounded-lg bg-background">
          <h3 className="font-semibold text-text mb-2">Unduh Backup</h3>
          <p className="text-sm text-text-muted mb-4">
            Ekspor seluruh data operasional (Users, SPK, RAB, WBS, Gudang) ke format <code className="bg-surface px-1 py-0.5 rounded text-primary">.sql.gz</code>.
          </p>
          <button
            onClick={handleBackup}
            disabled={isBackingUp || isRestoring}
            className="flex items-center justify-center w-full gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBackingUp ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sedang Mengunduh...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Unduh Backup (.sql.gz)
              </>
            )}
          </button>
        </div>

        {/* Restore Section */}
        <div className="p-5 border border-border rounded-lg bg-background">
          <h3 className="font-semibold text-text mb-2">Pulihkan Database</h3>
          <p className="text-sm text-text-muted mb-4">
            Pilih file backup yang pernah diunduh untuk menimpa data server saat ini.
          </p>
          
          <form onSubmit={handleRestoreSubmit} className="space-y-3">
            <input
              type="file"
              accept=".gz,.sql.gz"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              disabled={isRestoring || isBackingUp}
              className="block w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            <button
              type="submit"
              disabled={!selectedFile || isRestoring || isBackingUp}
              className="flex items-center justify-center w-full gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Memulihkan...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Pulihkan Data
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-bold">Peringatan Kritis</h3>
              </div>
              <p className="text-text mb-4 font-medium">
                PERINGATAN: Memulihkan database akan menimpa data yang ada saat ini secara keseluruhan.
              </p>
              <p className="text-sm text-text-muted mb-6">
                Pastikan Anda benar-benar ingin melakukan ini. Jika terjadi kesalahan, Anda akan kehilangan data operasional terkini.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 rounded-lg text-text hover:bg-background border border-border transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executeRestore}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  Lanjutkan Pemulihan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
