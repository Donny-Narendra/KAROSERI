import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { inventoryService, type Material } from '../services/inventoryService';

interface ImportInventoryModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  existingMaterials: Material[];
}

export const ImportInventoryModal: React.FC<ImportInventoryModalProps> = ({ onClose, onSuccess, existingMaterials }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<{
    inserts: Omit<Material, 'id'>[];
    updates: (Partial<Omit<Material, 'id'>> & { id: string })[];
    skips: number;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setReconciliation(null);
      setError(null);
    }
  };

  const processFile = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    
    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          const inserts: Omit<Material, 'id'>[] = [];
          const updates: (Partial<Omit<Material, 'id'>> & { id: string })[] = [];
          let skips = 0;

          data.forEach((row: any) => {
            const name = row['Nama Bahan'];
            if (!name) return; // Skip invalid rows

            const unit = row['Satuan'] || 'pcs';
            const current_stock = parseFloat(row['Stok Saat Ini']) || 0;
            const minimum_stock = parseFloat(row['Stok Min']) || 0;
            const unit_price = parseFloat(row['Harga Satuan (Rp)']) || 0;
            const waste_factor_percentage = parseFloat(row['Waste %']) || 0;

            const existing = existingMaterials.find(m => m.name.toLowerCase() === String(name).toLowerCase());

            if (existing) {
              const hasChanges = 
                existing.unit !== unit ||
                existing.current_stock !== current_stock ||
                existing.minimum_stock !== minimum_stock ||
                existing.unit_price !== unit_price ||
                existing.waste_factor_percentage !== waste_factor_percentage;

              if (hasChanges) {
                updates.push({
                  id: existing.id,
                  unit,
                  current_stock,
                  minimum_stock,
                  unit_price,
                  waste_factor_percentage
                });
              } else {
                skips++;
              }
            } else {
              inserts.push({
                name: String(name),
                unit,
                current_stock,
                minimum_stock,
                unit_price,
                waste_factor_percentage
              });
            }
          });

          setReconciliation({ inserts, updates, skips });
        } catch (err: any) {
          setError('Gagal membaca format file Excel: ' + err.message);
        } finally {
          setLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError('Gagal membaca file');
        setLoading(false);
      };

      reader.readAsBinaryString(file);
    } catch (err: any) {
      setError('Terjadi kesalahan: ' + err.message);
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!reconciliation) return;
    setLoading(true);
    try {
      await inventoryService.bulkSyncMaterials(reconciliation.inserts, reconciliation.updates);
      onSuccess(`Berhasil memproses data: ${reconciliation.inserts.length} ditambah, ${reconciliation.updates.length} diupdate, ${reconciliation.skips} diabaikan.`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal sinkronisasi data ke database');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-lg flex flex-col">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background">
          <h3 className="font-bold text-lg text-text">Import Data Stok (Excel)</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-status-danger/10 border border-status-danger/30 rounded text-status-danger text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!reconciliation ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center">
                <FileText className="w-10 h-10 text-text-muted mb-3" />
                <p className="text-text-muted text-sm mb-4">
                  Upload file Excel (.xlsx) dengan kolom: <br/>
                  <span className="font-mono bg-surface-hover px-1 rounded mt-2 inline-block">Nama Bahan, Satuan, Stok Saat Ini, Stok Min, Harga Satuan (Rp), Waste %</span>
                </p>
                <label className="bg-surface-hover hover:bg-border text-text border border-border px-4 py-2 rounded text-sm font-medium transition cursor-pointer flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Pilih File
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {file && <p className="mt-3 text-sm text-primary font-medium">{file.name}</p>}
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 text-text-muted hover:text-text font-medium transition"
                >
                  Batal
                </button>
                <button 
                  onClick={processFile}
                  disabled={!file || loading}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded font-medium transition flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Memproses...' : 'Review Data'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-surface-hover border border-border rounded-lg p-5">
                <h4 className="font-bold text-text mb-3">Ringkasan Rekonsiliasi</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between items-center text-status-success font-medium">
                    <span>Data Baru (Insert)</span>
                    <span className="bg-status-success/20 px-2 py-0.5 rounded">{reconciliation.inserts.length}</span>
                  </li>
                  <li className="flex justify-between items-center text-status-warning font-medium">
                    <span>Data Berubah (Update)</span>
                    <span className="bg-status-warning/20 px-2 py-0.5 rounded">{reconciliation.updates.length}</span>
                  </li>
                  <li className="flex justify-between items-center text-text-muted">
                    <span>Tidak Ada Perubahan (Skip)</span>
                    <span className="bg-background px-2 py-0.5 rounded border border-border">{reconciliation.skips}</span>
                  </li>
                </ul>
                <p className="mt-4 text-xs text-text-muted bg-background p-2 rounded border border-border">
                  Sistem mencocokkan data berdasarkan nama bahan (case-insensitive).
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setReconciliation(null)}
                  disabled={loading}
                  className="px-4 py-2 text-text-muted hover:text-text font-medium transition"
                >
                  Kembali
                </button>
                <button 
                  onClick={handleSync}
                  disabled={loading || (reconciliation.inserts.length === 0 && reconciliation.updates.length === 0)}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded font-medium transition flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {loading ? 'Menyimpan...' : 'Eksekusi Sinkronisasi'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
