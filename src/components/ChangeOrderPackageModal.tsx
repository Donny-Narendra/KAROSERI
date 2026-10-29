import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, X, AlertCircle, Check, AlertTriangle, CheckCircle2,
  Clock, Wrench
} from 'lucide-react';
import type { ProductPackage } from '../types/package';
import { packageService } from '../services/packageService';
import { 
  explodePackageWithAllocations, 
  WBS_COLUMNS,
  type WbsKey,
  type ExplodedChangeOrderItem,
  generateUUID 
} from '../utils/packageExplosion';

export interface ChangeOrderPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (items: ExplodedChangeOrderItem[]) => void | Promise<void>;
  packages?: ProductPackage[];
  selectedPackageId?: string;
  initialPackageId?: string;
  onPackageChange?: (pkgId: string) => void;
}

type AllocationState = Record<string, Record<WbsKey, string>>;

export const ChangeOrderPackageModal: React.FC<ChangeOrderPackageModalProps> = ({
  isOpen,
  onClose,
  onApply,
  packages: propPackages,
  selectedPackageId: propSelectedPackageId,
  initialPackageId,
  onPackageChange,
}) => {
  const [packages, setPackages] = useState<ProductPackage[]>(propPackages || []);
  const [loading, setLoading] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [packageMultiplier, setPackageMultiplier] = useState<number>(1);
  const [allocations, setAllocations] = useState<AllocationState>({});
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Close with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load packages and bind selected package ID
  useEffect(() => {
    const targetId = propSelectedPackageId || initialPackageId || '';

    if (isOpen) {
      if (propPackages && propPackages.length > 0) {
        setPackages(propPackages);
        const effectiveId = (targetId && propPackages.some(p => p.id === targetId))
          ? targetId 
          : propPackages[0]?.id || '';
        setSelectedPackageId(effectiveId);
      } else {
        setLoading(true);
        setFetchError(null);
        packageService.getPackages()
          .then(data => {
            const list = data || [];
            setPackages(list);
            if (list.length > 0) {
              const effectiveId = (targetId && list.some(p => p.id === targetId))
                ? targetId 
                : list[0].id;
              setSelectedPackageId(effectiveId);
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
      setAllocations({});
      setSaveAsTemplate(false);
      setIsApplying(false);
    }
  }, [isOpen, propPackages, propSelectedPackageId, initialPackageId]);

  const selectedPackage = useMemo(() => {
    return packages.find(p => p.id === selectedPackageId) || null;
  }, [packages, selectedPackageId]);

  // Initialize or update allocations based on selectedPackage and packageMultiplier
  useEffect(() => {
    if (!selectedPackage) {
      setAllocations({});
      return;
    }

    const rawItems = (selectedPackage as any).package_items || selectedPackage.items || [];
    const multiplier = Math.max(0.01, packageMultiplier || 1);
    const initial: AllocationState = {};

    rawItems.forEach((item: any, idx: number) => {
      const itemKey = item.id || `pkg-item-${idx}`;
      initial[itemKey] = {
        wbs1: '',
        wbs2: '',
        wbs3: '',
        wbs4: '',
        wbs5: '',
      };

      const defaultAlloc = item.default_wbs_allocation;
      if (defaultAlloc && typeof defaultAlloc === 'object' && Object.keys(defaultAlloc).length > 0) {
        WBS_COLUMNS.forEach(col => {
          let val = 0;
          if (defaultAlloc[col.category] !== undefined) {
            val = Number(defaultAlloc[col.category]);
          } else if (defaultAlloc[col.fullName] !== undefined) {
            val = Number(defaultAlloc[col.fullName]);
          } else if (defaultAlloc[col.key] !== undefined) {
            val = Number(defaultAlloc[col.key]);
          } else if (defaultAlloc[col.label] !== undefined) {
            val = Number(defaultAlloc[col.label]);
          } else {
            // Check case-insensitive match
            for (const [k, v] of Object.entries(defaultAlloc)) {
              if (k.toLowerCase().includes(col.category.toLowerCase())) {
                val = Number(v);
                break;
              }
            }
          }
          if (val > 0) {
            const scaled = Number((val * multiplier).toFixed(4));
            initial[itemKey][col.key] = String(scaled);
          }
        });
      } else if (item.default_wbs_category || item.wbs_stage) {
        // Fallback for legacy single default stage
        const stageStr = item.default_wbs_category || item.wbs_stage;
        const matchedCol = WBS_COLUMNS.find(c => 
          stageStr.toLowerCase().includes(c.category.toLowerCase()) || 
          stageStr.toLowerCase().includes(c.label.toLowerCase())
        );
        if (matchedCol) {
          const totalQty = Number(((Number(item.quantity || 1)) * multiplier).toFixed(4));
          initial[itemKey][matchedCol.key] = String(totalQty);
        }
      }
    });

    setAllocations(initial);
  }, [selectedPackage, packageMultiplier]);

  const handleAllocationChange = (itemKey: string, colKey: WbsKey, value: string) => {
    const normalized = value.replace(',', '.');
    if (normalized === '' || /^[0-9]*\.?[0-9]*$/.test(normalized)) {
      setAllocations(prev => ({
        ...prev,
        [itemKey]: {
          ...prev[itemKey],
          [colKey]: normalized,
        },
      }));
    }
  };

  const rawItems = useMemo(() => {
    return (selectedPackage as any)?.package_items || selectedPackage?.items || [];
  }, [selectedPackage]);

  const multiplier = Math.max(0.01, packageMultiplier || 1);

  // Validation metrics
  const isComplete = useMemo(() => {
    if (!selectedPackage || rawItems.length === 0) return false;
    return rawItems.every((item: any, idx: number) => {
      const itemKey = item.id || `pkg-item-${idx}`;
      const totalQuota = Number((Number(item.quantity || 1) * multiplier).toFixed(4));
      const itemAlloc = allocations[itemKey] || { wbs1: '', wbs2: '', wbs3: '', wbs4: '', wbs5: '' };
      const totalAllocated = WBS_COLUMNS.reduce((sum, col) => sum + (parseFloat(itemAlloc[col.key]) || 0), 0);
      return Math.abs(totalQuota - totalAllocated) < 0.001;
    });
  }, [selectedPackage, rawItems, multiplier, allocations]);

  const hasNegativeRemainder = useMemo(() => {
    if (!selectedPackage || rawItems.length === 0) return false;
    return rawItems.some((item: any, idx: number) => {
      const itemKey = item.id || `pkg-item-${idx}`;
      const totalQuota = Number((Number(item.quantity || 1) * multiplier).toFixed(4));
      const itemAlloc = allocations[itemKey] || { wbs1: '', wbs2: '', wbs3: '', wbs4: '', wbs5: '' };
      const totalAllocated = WBS_COLUMNS.reduce((sum, col) => sum + (parseFloat(itemAlloc[col.key]) || 0), 0);
      return (totalQuota - totalAllocated) < -0.001;
    });
  }, [selectedPackage, rawItems, multiplier, allocations]);

  const totalAllocatedSum = useMemo(() => {
    if (!selectedPackage || rawItems.length === 0) return 0;
    return rawItems.reduce((total: number, item: any, idx: number) => {
      const itemKey = item.id || `pkg-item-${idx}`;
      const itemAlloc = allocations[itemKey] || { wbs1: '', wbs2: '', wbs3: '', wbs4: '', wbs5: '' };
      const itemTotal = WBS_COLUMNS.reduce((sum, col) => sum + (parseFloat(itemAlloc[col.key]) || 0), 0);
      return total + itemTotal;
    }, 0);
  }, [selectedPackage, rawItems, allocations]);

  // Exploded items generated from real-time matrix
  const previewItems = useMemo(() => {
    if (!selectedPackage) return [];
    return explodePackageWithAllocations(selectedPackage, allocations, packageMultiplier);
  }, [selectedPackage, allocations, packageMultiplier]);

  // Financial Summary
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

  const handleApply = async () => {
    if (isApplying || previewItems.length === 0 || hasNegativeRemainder || totalAllocatedSum === 0) return;
    setIsApplying(true);
    try {
      // Generate a unique instance ID for this specific package addition session
      const instanceId = generateUUID();
      const generatedItems: ExplodedChangeOrderItem[] = previewItems.map(item => ({
        ...item,
        id: generateUUID(),
        package_source_id: selectedPackage?.id || item.package_source_id || null,
        package_instance_id: instanceId,
        package_name: selectedPackage?.name || item.package_name || null,
        notes: item.notes || (selectedPackage ? `Bagian dari paket: ${selectedPackage.name}` : undefined)
      }));

      if (saveAsTemplate && selectedPackage) {
        try {
          for (let i = 0; i < rawItems.length; i++) {
            const item = rawItems[i];
            if (item.id) {
              const itemKey = item.id || `pkg-item-${i}`;
              const itemAlloc = allocations[itemKey];
              if (itemAlloc) {
                const tmpl: Record<string, number> = {};
                WBS_COLUMNS.forEach(col => {
                  const q = parseFloat(itemAlloc[col.key]) || 0;
                  if (q > 0) {
                    tmpl[col.category] = Number((q / multiplier).toFixed(2));
                  }
                });
                await packageService.updatePackageItemDefaultAllocation(item.id, tmpl);
              }
            }
          }
        } catch (err) {
          console.error('Failed to save default WBS template for package:', err);
        }
      }

      const res = onApply(generatedItems) as unknown as Promise<void> | undefined;
      if (res && typeof (res as any).then === 'function') {
        await res;
      }
      onClose();
    } finally {
      setTimeout(() => setIsApplying(false), 500); // Debounce guard
    }
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
        className="bg-surface border border-border rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-left animate-in zoom-in-95 duration-150"
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
                  Matriks Alokasi Tahapan
                </span>
              </h3>
              <p className="text-xs text-text-muted">
                Bagi kuota masing-masing komponen (Bahan/Jasa) ke dalam 5 tahapan untuk diterapkan ke Change Order.
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
        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-background/50">
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
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-surface p-4 rounded-xl border border-border">
                {/* Package Select */}
                <div className="md:col-span-8">
                  <label htmlFor="select-package-bom" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                    Pilih Paket Barang Jadi (Master BOM) *
                  </label>
                  <select
                    id="select-package-bom"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition"
                    value={selectedPackageId}
                    onChange={e => {
                      const newId = e.target.value;
                      setSelectedPackageId(newId);
                      onPackageChange?.(newId);
                    }}
                  >
                    <option value="" disabled>-- Pilih Paket Assembly List --</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} — Jual: Rp {Number(pkg.selling_price || 0).toLocaleString('id-ID')} ({((pkg as any).package_items || pkg.items || []).length} komponen)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Package Multiplier */}
                <div className="md:col-span-4">
                  <label htmlFor="package-qty-multiplier" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                    Jumlah / Paket Qty *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="package-qty-multiplier"
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition text-right font-mono"
                      value={packageMultiplier}
                      onChange={e => setPackageMultiplier(parseFloat(e.target.value) || 1)}
                    />
                    <span className="text-xs text-text-muted font-medium shrink-0">paket</span>
                  </div>
                </div>
              </div>

              {/* Per-Component WBS Allocation Matrix Table */}
              {selectedPackage && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-primary" />
                      Matriks Alokasi Komponen Paket ke Tahapan Pekerjaan ({rawItems.length} Komponen)
                    </span>
                    <span className="text-text-muted font-mono text-[11px]">
                      Paket Terpilih: <strong className="text-text">{selectedPackage.name}</strong>
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-surface-hover/70 text-text-muted text-[11px] uppercase tracking-wider border-b border-border">
                        <tr>
                          <th className="px-4 py-3 sticky left-0 bg-surface z-10 font-bold">Komponen</th>
                          <th className="px-3 py-3 text-center font-bold">Total Kuota</th>
                          {WBS_COLUMNS.map((col) => (
                            <th key={col.key} className="px-2 py-3 text-center w-24 font-bold" title={col.fullName}>
                              {col.label}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center font-bold">Sisa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {rawItems.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                              Paket ini belum memiliki komponen BOM terdaftar.
                            </td>
                          </tr>
                        ) : (
                          rawItems.map((item: any, idx: number) => {
                            const itemKey = item.id || `pkg-item-${idx}`;
                            const rawMat = item.material || item.materials;
                            const compName = item.labor_name || rawMat?.name || item.name || item.description || 'Komponen';
                            const rawType = item.item_type || rawMat?.item_type || (item.labor_name ? 'LABOR' : 'MATERIAL');
                            const itemType = rawType === 'LABOR' ? 'LABOR' : rawType === 'OVERHEAD' ? 'OVERHEAD' : 'MATERIAL';
                            const unit = item.unit || rawMat?.unit || (itemType === 'LABOR' ? 'jam' : itemType === 'OVERHEAD' ? 'hari' : 'pcs');
                            
                            const baseQty = Number(item.quantity || 1);
                            const totalQuota = Number((baseQty * multiplier).toFixed(4));
                            const itemAlloc = allocations[itemKey] || { wbs1: '', wbs2: '', wbs3: '', wbs4: '', wbs5: '' };
                            const totalAllocated = WBS_COLUMNS.reduce((sum, col) => sum + (parseFloat(itemAlloc[col.key]) || 0), 0);
                            const remaining = Number((totalQuota - totalAllocated).toFixed(4));
                            const isZero = Math.abs(remaining) < 0.001;
                            const isOver = remaining < -0.001;

                            return (
                              <tr key={itemKey} className="hover:bg-surface-hover/30 transition">
                                <td className="px-4 py-3 sticky left-0 bg-surface z-10">
                                  <div className="font-semibold text-text text-sm flex items-center gap-1.5">
                                    <span>{compName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                      itemType === 'MATERIAL'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : itemType === 'OVERHEAD'
                                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                    }`}>
                                      {itemType === 'MATERIAL' ? (
                                        <Package className="w-2.5 h-2.5" />
                                      ) : itemType === 'OVERHEAD' ? (
                                        <Clock className="w-2.5 h-2.5" />
                                      ) : (
                                        <Wrench className="w-2.5 h-2.5" />
                                      )}
                                      {itemType}
                                    </span>
                                    <span className="text-[10px] text-text-muted">
                                      (Basis: {baseQty} {unit})
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center font-mono font-bold text-text text-sm">
                                  {totalQuota} <span className="text-[10px] font-normal text-text-muted">{unit}</span>
                                </td>
                                {WBS_COLUMNS.map((col) => (
                                  <td key={col.key} className="px-1 py-2 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={itemAlloc[col.key] || ''}
                                      onChange={(e) => handleAllocationChange(itemKey, col.key, e.target.value)}
                                      onFocus={(e) => e.target.select()}
                                      onMouseUp={(e) => e.preventDefault()}
                                      className="w-20 mx-auto block bg-background border border-border rounded px-2 py-1.5 text-center font-mono focus:border-primary focus:outline-none text-text text-xs"
                                      aria-label={`${compName} ${col.label}`}
                                      placeholder="0"
                                    />
                                  </td>
                                ))}
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                                    isZero 
                                      ? 'bg-status-success/20 text-status-success border border-status-success/30' 
                                      : isOver 
                                        ? 'bg-status-danger/20 text-status-danger border border-status-danger/30' 
                                        : 'bg-status-warning/20 text-status-warning border border-status-warning/30'
                                  }`}>
                                    {isZero ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>PASSED</span>
                                      </>
                                    ) : isOver ? (
                                      <>
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span>Over: {Math.abs(remaining).toFixed(2)}</span>
                                      </>
                                    ) : (
                                      <>
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        <span>Sisa: {remaining.toFixed(2)}</span>
                                      </>
                                    )}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Bar */}
                  <div className="bg-surface border border-border rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-text-muted block">Komponen Siap Meledak</span>
                      <strong className="text-sm font-mono text-text">{previewItems.length} baris item CO</strong>
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
        <div className="px-5 py-3.5 border-t border-border bg-surface flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs flex items-center gap-2 mr-auto w-full sm:w-auto">
            {hasNegativeRemainder ? (
              <span className="text-status-danger font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Terdapat item yang dialokasikan melebihi kuota.
              </span>
            ) : !isComplete ? (
              <span className="text-status-warning font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Perhatian: Sebagian kuota komponen belum tuntas dialokasikan ke Tahapan.
              </span>
            ) : (
              <label className="flex items-center gap-2 text-text text-xs cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="rounded border-border accent-primary w-4 h-4 cursor-pointer"
                />
                <span>Simpan alokasi tahapan ini sebagai resep bawaan paket</span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto justify-end">
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
              disabled={isApplying || previewItems.length === 0 || hasNegativeRemainder || totalAllocatedSum === 0}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isApplying ? 'Memproses...' : `Terapkan ${previewItems.length > 0 ? `${previewItems.length} Item ` : ''}ke Change Order`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
