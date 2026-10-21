import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, X, AlertCircle, Check, Info, Layers, Wrench, Clock, Sparkles
} from 'lucide-react';
import type { ProductPackage } from '../types/package';
import { packageService } from '../services/packageService';
import { 
  WBS_STAGES, 
  explodePackageToDraftItems, 
  type ExplodedChangeOrderItem 
} from '../utils/packageExplosion';

export interface ChangeOrderPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (items: ExplodedChangeOrderItem[]) => void;
  packages?: ProductPackage[];
}

export const ChangeOrderPackageModal: React.FC<ChangeOrderPackageModalProps> = ({
  isOpen,
  onClose,
  onApply,
  packages: propPackages,
}) => {
  const [packages, setPackages] = useState<ProductPackage[]>(propPackages || []);
  const [loading, setLoading] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [targetWbsMode, setTargetWbsMode] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [singleWbsStage, setSingleWbsStage] = useState<string>(WBS_STAGES[1]); // Default WBS 2
  const [packageMultiplier, setPackageMultiplier] = useState<number>(1);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Close with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load packages if not provided or empty
  useEffect(() => {
    if (isOpen) {
      if (propPackages && propPackages.length > 0) {
        setPackages(propPackages);
        setSelectedPackageId(prev => prev || propPackages[0]?.id || '');
      } else {
        setLoading(true);
        setFetchError(null);
        packageService.getPackages()
          .then(data => {
            setPackages(data || []);
            if (data && data.length > 0) {
              setSelectedPackageId(prev => prev || data[0].id);
            }
          })
          .catch(err => {
            console.error('Error fetching product packages:', err);
            setFetchError('Gagal memuat master paket barang jadi.');
          })
          .finally(() => setLoading(false));
      }
    } else {
      // Reset state on close
      setSelectedPackageId('');
      setPackageMultiplier(1);
      setTargetWbsMode('SINGLE');
      setSingleWbsStage(WBS_STAGES[1]);
    }
  }, [isOpen, propPackages]);

  const selectedPackage = useMemo(() => {
    return packages.find(p => p.id === selectedPackageId) || null;
  }, [packages, selectedPackageId]);

  // Exploded preview
  const previewItems = useMemo(() => {
    if (!selectedPackage) return [];
    return explodePackageToDraftItems(
      selectedPackage,
      targetWbsMode,
      singleWbsStage,
      packageMultiplier
    );
  }, [selectedPackage, targetWbsMode, singleWbsStage, packageMultiplier]);

  // Totals summary
  const summary = useMemo(() => {
    let totalSelling = 0;
    let totalHpp = 0;
    previewItems.forEach(item => {
      totalSelling += item.quantity * item.unit_price;
      totalHpp += item.quantity * item.cost_price;
    });
    const profit = totalSelling - totalHpp;
    const marginPct = totalSelling > 0 ? (profit / totalSelling) * 100 : 0;
    return { totalSelling, totalHpp, profit, marginPct };
  }, [previewItems]);

  const handleApply = () => {
    if (previewItems.length === 0) return;
    onApply(previewItems);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-70 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="package-modal-title"
    >
      <div 
        className="bg-surface border border-border rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 id="package-modal-title" className="font-bold text-base text-text font-display flex items-center gap-2">
                Tambah Paket Barang Jadi (Assembly List)
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  BOM Explosion
                </span>
              </h3>
              <p className="text-xs text-text-muted">
                Pilih paket perakitan lengkap, tentukan tahapan WBS tujuan, dan ledakkan menjadi baris item Change Order.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-background transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {fetchError && (
            <div className="bg-status-danger/10 border border-status-danger/30 text-status-danger px-3 py-2.5 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-muted text-sm">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Memuat data paket assembly list...</span>
            </div>
          ) : packages.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm space-y-2">
              <Package className="w-10 h-10 mx-auto text-text-muted/40" />
              <p className="font-semibold text-text">Belum Ada Paket Barang Jadi</p>
              <p className="text-xs">
                Master paket barang jadi belum dibuat. Daftarkan paket melalui modul Master Barang Jadi / Gudang.
              </p>
            </div>
          ) : (
            <>
              {/* Configuration Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-background/60 p-4 rounded-xl border border-border">
                {/* Package Select */}
                <div className="md:col-span-8">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                    Pilih Paket Barang Jadi (Master BOM) *
                  </label>
                  <select
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition"
                    value={selectedPackageId}
                    onChange={e => setSelectedPackageId(e.target.value)}
                  >
                    <option value="" disabled>-- Pilih Paket Assembly List --</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} — Jual: Rp {Number(pkg.selling_price || 0).toLocaleString('id-ID')} ({pkg.items?.length || 0} komponen)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Package Multiplier */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                    Jumlah / Paket Qty *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition text-right font-mono"
                      value={packageMultiplier}
                      onChange={e => setPackageMultiplier(parseFloat(e.target.value) || 1)}
                    />
                    <span className="text-xs text-text-muted font-medium shrink-0">paket</span>
                  </div>
                </div>

                {/* WBS Strategy Selection */}
                <div className="md:col-span-12 pt-2 border-t border-border/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Target Alokasi Tahapan WBS *
                    </label>
                    <div className="inline-flex rounded-lg bg-surface p-1 border border-border text-xs">
                      <button
                        type="button"
                        onClick={() => setTargetWbsMode('SINGLE')}
                        className={`px-3 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          targetWbsMode === 'SINGLE'
                            ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                            : 'text-text-muted hover:text-text'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Single WBS Target
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetWbsMode('MULTI')}
                        className={`px-3 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          targetWbsMode === 'MULTI'
                            ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                            : 'text-text-muted hover:text-text'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        Multi-WBS (Distribusi Otomatis)
                      </button>
                    </div>
                  </div>

                  {targetWbsMode === 'SINGLE' ? (
                    <div className="bg-surface/60 p-3 rounded-lg border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <span className="text-text-muted">
                        Seluruh ({previewItems.length}) komponen BOM paket akan dialokasikan ke satu tahapan WBS yang sama:
                      </span>
                      <select
                        className="bg-background border border-border rounded-lg px-3 py-1.5 text-text focus:outline-none focus:border-primary transition min-w-[220px]"
                        value={singleWbsStage}
                        onChange={e => setSingleWbsStage(e.target.value)}
                      >
                        {WBS_STAGES.map(stage => (
                          <option key={stage} value={stage}>{stage}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-start gap-2.5 text-xs text-amber-300">
                      <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                      <div>
                        <strong className="text-amber-200">Mode Multi-WBS Aktif:</strong> Kuota tiap komponen material dan jasa akan dipecah otomatis ke tahapan WBS sesuai template bawaan paket (WBS 1 s/d WBS 5). Jika item tidak memiliki alokasi template, item diarahkan ke fallback WBS stage default.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Exploded BOM Preview Table */}
              {selectedPackage && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-primary" />
                      Pratinjau Ledakan Komponen ({previewItems.length} Item Siap Diterapkan)
                    </span>
                    <span className="text-text-muted font-mono">
                      Paket Dasar: <strong className="text-text">{selectedPackage.name}</strong>
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border bg-background">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-surface text-text-muted text-[11px] uppercase tracking-wider border-b border-border">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold text-center w-8">#</th>
                          <th className="px-3 py-2.5 font-semibold">Tipe</th>
                          <th className="px-3 py-2.5 font-semibold">Nama Komponen</th>
                          <th className="px-3 py-2.5 font-semibold">Tahapan WBS</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Qty & Satuan</th>
                          <th className="px-3 py-2.5 font-semibold text-right">HPP Modal</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Harga Jual Satuan</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Subtotal Jual</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {previewItems.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-6 text-center text-text-muted">
                              Paket ini belum memiliki komponen BOM terdaftar.
                            </td>
                          </tr>
                        ) : (
                          previewItems.map((item, idx) => {
                            const lineSubtotal = item.quantity * item.unit_price;
                            return (
                              <tr key={item.id} className="hover:bg-surface/50 transition">
                                <td className="px-3 py-2 text-center text-text-muted font-mono font-medium">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    item.item_type === 'MATERIAL'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : item.item_type === 'OVERHEAD'
                                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                        : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                  }`}>
                                    {item.item_type === 'MATERIAL' ? (
                                      <Package className="w-2.5 h-2.5" />
                                    ) : item.item_type === 'OVERHEAD' ? (
                                      <Clock className="w-2.5 h-2.5" />
                                    ) : (
                                      <Wrench className="w-2.5 h-2.5" />
                                    )}
                                    {item.item_type}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-medium text-text max-w-xs truncate" title={item.item_name}>
                                  {item.item_name}
                                </td>
                                <td className="px-3 py-2 text-text-muted">
                                  <span className="font-mono text-[11px] bg-surface px-1.5 py-0.5 rounded border border-border">
                                    {item.wbs_stage}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-text">
                                  {item.quantity} <span className="text-[10px] font-normal text-text-muted">{item.unit}</span>
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-text-muted">
                                  Rp {item.cost_price.toLocaleString('id-ID')}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-primary font-medium">
                                  Rp {item.unit_price.toLocaleString('id-ID')}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-text">
                                  Rp {lineSubtotal.toLocaleString('id-ID')}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Bar */}
                  <div className="bg-surface/80 border border-border rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-text-muted block">Komponen Baru</span>
                      <strong className="text-sm font-mono text-text">{previewItems.length} baris</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-text-muted block">Total Modal HPP</span>
                      <strong className="text-sm font-mono text-text-muted">Rp {summary.totalHpp.toLocaleString('id-ID')}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-text-muted block">Total Harga Jual</span>
                      <strong className="text-sm font-mono text-primary">Rp {summary.totalSelling.toLocaleString('id-ID')}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-text-muted block">Estimasi Margin</span>
                      <strong className="text-sm font-mono text-emerald-400">
                        Rp {summary.profit.toLocaleString('id-ID')} ({summary.marginPct.toFixed(1)}%)
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border bg-surface flex items-center justify-between shrink-0">
          <div className="text-xs text-text-muted hidden sm:block">
            {previewItems.length > 0 ? (
              <span>Item yang diterapkan dapat diedit kembali di formulir sebelum submit.</span>
            ) : (
              <span>Pilih paket barang jadi untuk melanjutkan.</span>
            )}
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-xs sm:text-sm font-medium hover:bg-background text-text transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={previewItems.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan {previewItems.length > 0 ? `${previewItems.length} Item ` : ''}ke Change Order</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
