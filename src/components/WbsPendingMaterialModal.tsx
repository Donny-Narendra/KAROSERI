import React, { useEffect } from 'react';
import { AlertTriangle, X, ArrowRight, PackageOpen } from 'lucide-react';

export interface PendingWbsMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  estimatedCost: number;
}

interface WbsPendingMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  categoryLabel?: string;
  pendingMaterials: PendingWbsMaterial[];
  onOpenRequisition: () => void;
}

export const WbsPendingMaterialModal: React.FC<WbsPendingMaterialModalProps> = ({
  isOpen,
  onClose,
  category,
  categoryLabel,
  pendingMaterials,
  onOpenRequisition,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalCost = pendingMaterials.reduce((acc, item) => acc + (item.estimatedCost || 0), 0);
  const title = categoryLabel || category;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-surface border border-border rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-surface-hover/50 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  Peringatan Alokasi
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-semibold">
                  {pendingMaterials.length} Item Tertunda
                </span>
              </div>
              <h3 className="text-lg font-bold font-display text-text mt-0.5">
                Material Belum Diminta
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Tahapan: <span className="font-semibold text-text">{title}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stat Summary Bar */}
        <div className="px-5 py-3 bg-background/50 border-b border-border grid grid-cols-2 gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase text-text-muted">Total Item Tertunda</span>
            <p className="text-sm font-bold font-mono text-text">
              {pendingMaterials.length} jenis material
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono uppercase text-text-muted">Estimasi Biaya Tertunda</span>
            <p className="text-sm font-bold font-mono text-amber-400">
              {formatCurrency(totalCost)}
            </p>
          </div>
        </div>

        {/* Content Table / List */}
        <div className="p-5 flex-1 overflow-y-auto">
          {pendingMaterials.length === 0 ? (
            <div className="p-8 text-center text-text-muted flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-lg">
              <PackageOpen className="w-8 h-8 text-text-muted/60" />
              <p className="text-sm font-medium">Semua material RAB untuk tahapan ini telah terdistribusi.</p>
              <p className="text-xs text-text-muted">Tidak ada material yang berstatus belum diminta.</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-background text-text-muted font-mono uppercase border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5">Nama Material</th>
                    <th className="px-4 py-2.5 text-center">Qty Belum Diambil</th>
                    <th className="px-4 py-2.5 text-right">Estimasi Biaya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {pendingMaterials.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-surface-hover/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-text text-sm">{item.name}</div>
                        {item.unitPrice > 0 && (
                          <div className="text-[11px] font-mono text-text-muted">
                            @ {formatCurrency(item.unitPrice)} / {item.unit}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono font-bold text-amber-300">
                        {item.quantity} <span className="text-[10px] text-text-muted font-normal">{item.unit}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-text">
                        {formatCurrency(item.estimatedCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-hover/30 flex items-center justify-between gap-3">
          <p className="text-[11px] text-text-muted hidden sm:block">
            Pastikan seluruh material diajukan sebelum WBS di-QC.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface border border-border text-text rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRequisition();
              }}
              className="flex-1 sm:flex-initial px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <span>Buka Minta Material</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
