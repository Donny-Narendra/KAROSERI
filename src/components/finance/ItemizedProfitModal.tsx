import React, { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { spkService } from '../../services/spkService';
import { packageService } from '../../services/packageService';
import { computeSegregatedProjectProfit, type ProfitBreakdownResult } from '../../utils/profitCalculator';

interface ItemizedProfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  spkId: string;
  spkNumber: string;
  customerName: string;
  vehiclePlate?: string;
  rowRevenue?: number;
  rowGrossProfit?: number;
  rowMarginPercentage?: number;
  rowTotalCogs?: number;
  rowInitialCogs?: number;
}

export const ItemizedProfitModal: React.FC<ItemizedProfitModalProps> = ({
  isOpen,
  onClose,
  spkId,
  spkNumber,
  customerName,
  vehiclePlate,
  rowRevenue,
  rowGrossProfit,
  rowMarginPercentage,
  rowTotalCogs,
  rowInitialCogs,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [packagesCatalog, setPackagesCatalog] = useState<any[]>([]);

  const formatRupiah = (val: number): string => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

  useEffect(() => {
    if (!isOpen || !spkId) return;

    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch package catalog
        let fetchedPackages: any[] = [];
        try {
          fetchedPackages = await packageService.getPackages();
        } catch (pkgErr) {
          console.warn('Could not fetch packages catalog:', pkgErr);
        }

        // 2. Fetch live materials master catalog for store cost comparison
        const materialsMap = new Map<string, number>();
        try {
          const { data: matsData } = await supabase
            .from('materials')
            .select('id, cost_price');
          if (matsData) {
            matsData.forEach((m: any) => {
              if (m.id && m.cost_price !== undefined && m.cost_price !== null) {
                materialsMap.set(m.id, Number(m.cost_price));
              }
            });
          }
        } catch (matsErr) {
          console.warn('Could not fetch materials catalog in ItemizedProfitModal:', matsErr);
        }

        // 3. Fetch material_issues for realized actual issues pricing
        const materialIssuesMap = new Map<string, number>();
        try {
          const { data: issuesData } = await supabase
            .from('material_issues')
            .select('material_id, rab_item_id, unit_price, cost_price, custom_unit_price')
            .eq('spk_id', spkId);
          if (issuesData) {
            issuesData.forEach((iss: any) => {
              const issueCost = Number(iss.custom_unit_price ?? iss.unit_price ?? iss.cost_price ?? 0);
              if (issueCost > 0) {
                if (iss.rab_item_id) materialIssuesMap.set(`rab_${iss.rab_item_id}`, issueCost);
                if (iss.material_id) materialIssuesMap.set(`mat_${iss.material_id}`, issueCost);
              }
            });
          }
        } catch (issuesErr) {
          console.warn('Could not fetch material issues in ItemizedProfitModal:', issuesErr);
        }

        // 4. Fetch rab_items with joined materials (Task 2)
        let rabItems: any[] = [];
        const { data: estData } = await supabase
          .from('rab_estimations')
          .select('id')
          .eq('spk_id', spkId)
          .maybeSingle();

        const estId = estData?.id;
        let rawRabItems: any[] | null = null;
        let rabErr: any = null;

        const primaryRes = await supabase
          .from('rab_items')
          .select('*, product_packages:package_id (id, name, selling_price), materials:material_id (id, cost_price)')
          .eq(estId ? 'rab_estimation_id' : 'spk_id', estId || spkId);

        if (!primaryRes.error && primaryRes.data) {
          rawRabItems = primaryRes.data;
        } else {
          const fallbackRes = await supabase
            .from('rab_items')
            .select('*, product_packages:package_id (id, name, selling_price), materials(id, cost_price)')
            .eq(estId ? 'rab_estimation_id' : 'spk_id', estId || spkId);
          if (!fallbackRes.error && fallbackRes.data) {
            rawRabItems = fallbackRes.data;
          } else {
            const basicRes = await supabase
              .from('rab_items')
              .select('*, product_packages:package_id (id, name, selling_price)')
              .eq(estId ? 'rab_estimation_id' : 'spk_id', estId || spkId);
            if (!basicRes.error && basicRes.data) {
              rawRabItems = basicRes.data;
            } else {
              rabErr = basicRes.error || fallbackRes.error || primaryRes.error;
            }
          }
        }

        if (!rabErr && rawRabItems) {
          rabItems = rawRabItems;
        }

        // 5. Fetch approved change orders
        let coItems: any[] = [];
        try {
          const cos = await spkService.getChangeOrders(spkId);
          const approvedCos = (cos || []).filter((co: any) => String(co.status || '').toUpperCase() === 'APPROVED');
          approvedCos.forEach((co: any) => {
            if (Array.isArray(co.items)) {
              coItems.push(...co.items);
            }
          });
        } catch (coErr) {
          console.warn('Could not fetch change orders:', coErr);
        }

        // 6. Consolidate items with live effective cost and joined materials
        const consolidatedItems = [...rabItems, ...coItems].map((item: any) => {
          let joinedMatCost: number | undefined = undefined;
          if (item.materials) {
            joinedMatCost = Array.isArray(item.materials) ? item.materials[0]?.cost_price : item.materials.cost_price;
          }
          if ((joinedMatCost === undefined || joinedMatCost === null) && item.material_id && materialsMap.has(item.material_id)) {
            joinedMatCost = materialsMap.get(item.material_id);
          }

          const issueCost = (item.id && materialIssuesMap.get(`rab_${item.id}`)) ||
                            (item.material_id && materialIssuesMap.get(`mat_${item.material_id}`));

          const baseCost = Number(item.cost_price ?? item.costPrice ?? 0);
          
          let effectiveCost = baseCost;
          if (String(item.item_type || item.type || 'MATERIAL').toUpperCase() === 'MATERIAL') {
            if (issueCost && issueCost > 0) {
              effectiveCost = issueCost;
            } else if (joinedMatCost !== undefined && joinedMatCost !== null && joinedMatCost > 0) {
              effectiveCost = joinedMatCost;
            }
          }

          return {
            ...item,
            materials: joinedMatCost !== undefined ? { id: item.material_id, cost_price: joinedMatCost } : item.materials,
            effective_cost_price: item.effective_cost_price ?? effectiveCost,
            actual_cost_price: item.actual_cost_price ?? effectiveCost,
          };
        });

        if (isMounted) {
          setPackagesCatalog(fetchedPackages);
          setItems(consolidatedItems);
        }
      } catch (err: any) {
        console.error('Error fetching SPK breakdown items:', err);
        if (isMounted) setError(err.message || 'Gagal memuat rincian item SPK');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, spkId]);

  const computedProfit: ProfitBreakdownResult = useMemo(() => {
    return computeSegregatedProjectProfit(items, packagesCatalog);
  }, [items, packagesCatalog]);

  const breakdown = computedProfit;

  // Header Cards di SegregatedProfitModal (Task 2)
  const totalRevenue = computedProfit.grandTotalRevenue > 0 ? computedProfit.grandTotalRevenue : (rowRevenue || 0);
  const totalCogs = computedProfit.grandTotalCost > 0 ? computedProfit.grandTotalCost : (rowTotalCogs || 0);
  const computedGrossProfit = totalRevenue - totalCogs;
  const grossProfit = (totalRevenue > 0 || totalCogs > 0) ? computedGrossProfit : (rowGrossProfit ?? 0);
  const marginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : (rowMarginPercentage ?? 0);

  // Track if there is inflation/procurement cost increase
  const initialCogs = (computedProfit.grandTotalEstimatedCost && computedProfit.grandTotalEstimatedCost > 0)
    ? computedProfit.grandTotalEstimatedCost
    : (rowInitialCogs || totalCogs);
  const costIncrease = Math.max(
    0,
    computedProfit.grandTotalMarginErosion || 0,
    totalCogs > initialCogs ? totalCogs - initialCogs : 0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-breakdown-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-surface via-surface to-surface-hover">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold uppercase">
                Model Hibrida 2 Pilar
              </span>
              <span className="text-xs text-text-muted font-mono">
                No. SPK: <strong className="text-primary">{spkNumber}</strong>
              </span>
            </div>
            <h3 id="modal-breakdown-title" className="text-lg font-bold text-text mt-1">
              Rincian Laba Paket Barang Jadi vs Penjualan Lepas
            </h3>
            <p className="text-xs text-text-muted">
              {customerName} {vehiclePlate && `• ${vehiclePlate}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text hover:bg-surface-hover rounded-xl transition cursor-pointer"
            title="Tutup dialog"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 text-center text-text-muted">
              <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="font-semibold text-text text-sm">Menghitung Pemisahan Laba 2 Pilar...</p>
              <p className="text-xs text-text-muted mt-1">Mengisolasi biaya bahan, upah resep paket, dan borongan mandor lepas</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl text-status-danger text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Grand Total Reconciliation Header */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-surface-hover/70 border border-border rounded-xl p-3">
                  <div className="text-[11px] text-text-muted">Total Pendapatan (Jual)</div>
                  <div className="text-base font-bold font-mono text-text mt-1">
                    {formatRupiah(totalRevenue)}
                  </div>
                </div>
                <div className="bg-surface-hover/70 border border-border rounded-xl p-3">
                  <div className="text-[11px] text-text-muted">Total Modal HPP</div>
                  <div className="text-base font-bold font-mono text-text mt-1">
                    {formatRupiah(totalCogs)}
                  </div>
                  {costIncrease > 0 && (
                    <div className="text-[10px] text-amber-400 font-mono mt-0.5" data-testid="cogs-inflation-badge">
                      (Menyerap kenaikan belanja +{formatRupiah(costIncrease)})
                    </div>
                  )}
                </div>
                <div className="bg-surface-hover/70 border border-border rounded-xl p-3">
                  <div className="text-[11px] text-text-muted">Grand Total Laba Kotor</div>
                  <div className={`text-base font-bold font-mono mt-1 ${grossProfit >= 0 ? 'text-emerald-400' : 'text-status-danger'}`}>
                    {formatRupiah(grossProfit)}
                  </div>
                </div>
                <div className="bg-surface-hover/70 border border-border rounded-xl p-3">
                  <div className="text-[11px] text-text-muted">Margin Laba Bersih</div>
                  <div className={`text-base font-bold font-mono mt-1 ${marginPct >= 0 ? 'text-emerald-400' : 'text-status-danger'}`}>
                    {marginPct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* PILAR 1: Itemized Assembly Packages */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono">
                      PILAR 1
                    </span>
                    <h4 className="text-xs font-bold text-text uppercase tracking-wide">
                      Keuntungan per Paket Barang Jadi (Itemized Assembly Margin)
                    </h4>
                  </div>
                  <span className="text-[11px] text-text-muted font-mono">
                    {breakdown.packages.length} Paket Assembly
                  </span>
                </div>

                {breakdown.packages.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {breakdown.packages.map((pkg) => (
                      <div key={pkg.packageId} className="bg-surface-hover/60 border border-amber-500/30 rounded-xl p-4 space-y-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                              <span>📦</span>
                              <span>{pkg.packageName}</span>
                            </div>
                            <div className="text-[11px] text-text-muted font-mono mt-0.5">
                              Karya Paket Manufaktur
                            </div>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${
                            pkg.marginPercentage >= 25 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                            pkg.marginPercentage >= 15 ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                            'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          }`}>
                            {pkg.marginPercentage.toFixed(1)}%
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs font-mono">
                          <div className="flex justify-between items-baseline">
                            <span className="text-text-muted">Harga Jual Paket:</span>
                            <span className="font-bold text-text">{formatRupiah(pkg.sellingPrice)}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-1 py-1.5 px-2 bg-background/80 rounded-lg text-[10px] border border-border/40 text-text-muted">
                            <div>
                              <div>Material:</div>
                              <div className="text-text font-semibold">{formatRupiah(pkg.materialCost)}</div>
                            </div>
                            <div>
                              <div>Labor:</div>
                              <div className="text-text font-semibold">{formatRupiah(pkg.laborCost)}</div>
                            </div>
                            <div>
                              <div>Overhead:</div>
                              <div className="text-text font-semibold">{formatRupiah(pkg.overheadCost)}</div>
                            </div>
                          </div>

                          <div className="flex justify-between items-baseline pt-1">
                            <span className="text-text-muted">Total Modal (HPP):</span>
                            <div className="text-right">
                              <span className="text-text font-semibold">{formatRupiah(pkg.totalCost)}</span>
                              {pkg.costVariance !== undefined && pkg.costVariance > 0 && (
                                <span className="block text-[9px] text-amber-400 font-mono">
                                  (+{formatRupiah(pkg.costVariance)})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-baseline pt-1 border-t border-border/40">
                            <span className="text-text font-semibold">Laba Bersih Paket:</span>
                            <span className={`font-bold ${pkg.netProfit >= 0 ? 'text-emerald-400' : 'text-status-danger'}`}>
                              {formatRupiah(pkg.netProfit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-surface-hover/30 border border-border/50 rounded-xl text-center text-xs text-text-muted">
                    Tidak ada paket karya assembly pada SPK ini (seluruh item berstatus penjualan granular).
                  </div>
                )}

                {breakdown.packages.length > 0 && (
                  <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 rounded-lg font-mono">
                    <span className="text-amber-400 font-semibold">Total Seluruh Paket ({breakdown.packages.length} Unit)</span>
                    <div className="flex gap-4">
                      <span>Jual: <strong className="text-text">{formatRupiah(breakdown.totalPackageRevenue)}</strong></span>
                      <span>HPP: <strong className="text-text">{formatRupiah(breakdown.totalPackageCost)}</strong></span>
                      <span>Laba: <strong className="text-emerald-400">{formatRupiah(breakdown.totalPackageProfit)}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* PILAR 2: Granular Segregation */}
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold font-mono">
                      PILAR 2
                    </span>
                    <h4 className="text-xs font-bold text-text uppercase tracking-wide">
                      Keuntungan Penjualan Lepas / Granular (Non-Paket)
                    </h4>
                  </div>
                  <span className="text-[11px] text-text-muted font-mono">
                    Bahan & Jasa di Luar Resep Paket
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Granular Material */}
                  <div className="p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1">
                        <span>🧱</span>
                        <span>Material Lepas</span>
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400/80">
                        {breakdown.granularMaterial.marginPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-base font-bold text-text font-mono mt-2">
                      {formatRupiah(breakdown.granularMaterial.profit)}
                    </div>
                    <div className="text-[11px] text-text-muted flex justify-between mt-2 pt-2 border-t border-cyan-500/10 font-mono">
                      <span>Jual: {formatRupiah(breakdown.granularMaterial.revenue)}</span>
                      <span>HPP: {formatRupiah(breakdown.granularMaterial.cost)}</span>
                    </div>
                  </div>

                  {/* Granular Labor */}
                  <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                        <span>🔧</span>
                        <span>Labor Mandor Lepas</span>
                      </span>
                      <span className="text-[10px] font-mono text-blue-400/80">
                        {breakdown.granularLabor.marginPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-base font-bold text-text font-mono mt-2">
                      {formatRupiah(breakdown.granularLabor.profit)}
                    </div>
                    <div className="text-[11px] text-text-muted flex justify-between mt-2 pt-2 border-t border-blue-500/10 font-mono">
                      <span>Tagih: {formatRupiah(breakdown.granularLabor.revenue)}</span>
                      <span>Modal: {formatRupiah(breakdown.granularLabor.cost)}</span>
                    </div>
                  </div>

                  {/* Granular Overhead */}
                  <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-400 flex items-center gap-1">
                        <span>⚡</span>
                        <span>Overhead Lepas</span>
                      </span>
                      <span className="text-[10px] font-mono text-purple-400/80">
                        {breakdown.granularOverhead.marginPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-base font-bold text-text font-mono mt-2">
                      {formatRupiah(breakdown.granularOverhead.profit)}
                    </div>
                    <div className="text-[11px] text-text-muted flex justify-between mt-2 pt-2 border-t border-purple-500/10 font-mono">
                      <span>Tagih: {formatRupiah(breakdown.granularOverhead.revenue)}</span>
                      <span>Modal: {formatRupiah(breakdown.granularOverhead.cost)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end p-4 border-t border-border bg-surface-hover/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface hover:bg-surface-hover text-text border border-border rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export { ItemizedProfitModal as SegregatedProfitModal };
export default ItemizedProfitModal;
