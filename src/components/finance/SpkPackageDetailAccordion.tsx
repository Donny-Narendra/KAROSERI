import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertCircle, Package, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { spkService } from '../../services/spkService';
import { packageService } from '../../services/packageService';
import { computeSegregatedProjectProfit, type ProfitBreakdownResult } from '../../utils/profitCalculator';

interface SpkPackageDetailAccordionProps {
  spkId: string;
  spkNumber: string;
  customerName?: string;
  vehiclePlate?: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const SpkPackageDetailAccordion: React.FC<SpkPackageDetailAccordionProps> = ({
  spkId,
  spkNumber,
  customerName,
  vehiclePlate,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [packagesCatalog, setPackagesCatalog] = useState<any[]>([]);

  useEffect(() => {
    if (!spkId) return;

    let isMounted = true;
    async function loadPackageBreakdown() {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch package catalog
        let fetchedPackages: any[] = [];
        try {
          fetchedPackages = await packageService.getPackages();
        } catch (pkgErr) {
          console.warn('Could not fetch packages catalog in SpkPackageDetailAccordion:', pkgErr);
        }

        // 2. Fetch rab_items
        let rabItems: any[] = [];
        const { data: estData } = await supabase
          .from('rab_estimations')
          .select('id')
          .eq('spk_id', spkId)
          .maybeSingle();

        const estId = estData?.id;
        const { data: rawRabItems, error: rabErr } = await supabase
          .from('rab_items')
          .select('*, product_packages:package_id (id, name, selling_price)')
          .eq(estId ? 'rab_estimation_id' : 'spk_id', estId || spkId);

        if (!rabErr && rawRabItems) {
          rabItems = rawRabItems;
        }

        // 3. Fetch approved change orders
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
          console.warn('Could not fetch change orders in SpkPackageDetailAccordion:', coErr);
        }

        if (isMounted) {
          setPackagesCatalog(fetchedPackages);
          setItems([...rabItems, ...coItems]);
        }
      } catch (err: any) {
        console.error('Error fetching package breakdown items:', err);
        if (isMounted) setError(err.message || 'Gagal memuat rincian paket SPK');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPackageBreakdown();

    return () => {
      isMounted = false;
    };
  }, [spkId]);

  const breakdown: ProfitBreakdownResult = useMemo(() => {
    return computeSegregatedProjectProfit(items, packagesCatalog);
  }, [items, packagesCatalog]);

  if (loading) {
    return (
      <div className="py-6 px-4 bg-surface/50 border border-amber-500/20 rounded-xl flex items-center justify-center gap-2 text-text-muted text-xs font-mono">
        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
        <span>Memuat rincian daftar paket & HPP gabungan...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-status-danger/10 border border-status-danger/30 rounded-xl text-status-danger text-xs flex items-center gap-2 font-mono">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (breakdown.packages.length === 0) {
    return (
      <div className="py-4 px-5 bg-surface-hover/40 border border-border/70 rounded-xl text-xs text-text-muted font-mono flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-text-muted" />
          <span>Tidak ada paket assembly pada SPK {spkNumber}. Seluruh item tercatat sebagai material & jasa lepas (Granular).</span>
        </div>
        <span className="text-[11px] text-text-muted">Granular Total: {formatCurrency(breakdown.totalGranularProfit)}</span>
      </div>
    );
  }

  return (
    <div className="bg-surface/80 border border-amber-500/30 rounded-xl p-4 space-y-4 shadow-sm animate-fadeIn">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono">
            PILAR 1: ASSEMBLY PACKAGES
          </span>
          <span className="text-xs font-bold text-text font-mono">
            Daftar Paket Assembly & HPP Gabungan (Bahan + Upah Perakit) — {spkNumber}
          </span>
        </div>
        <div className="text-xs text-text-muted font-mono">
          {customerName} {vehiclePlate && `• ${vehiclePlate}`} ({breakdown.packages.length} Paket)
        </div>
      </div>

      {/* Table of packages */}
      <div className="overflow-x-auto border border-border/70 rounded-lg">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-surface-hover/90 text-text-muted uppercase text-[10px] tracking-wider border-b border-border">
              <th className="py-2.5 px-3 font-semibold">Nama Paket Assembly</th>
              <th className="py-2.5 px-3 font-semibold text-right">Harga Jual</th>
              <th className="py-2.5 px-3 font-semibold text-right">HPP Bahan</th>
              <th className="py-2.5 px-3 font-semibold text-right">Upah Perakit (Labor)</th>
              <th className="py-2.5 px-3 font-semibold text-right text-amber-300 font-bold">
                HPP Gabungan (Bahan + Upah)
              </th>
              <th className="py-2.5 px-3 font-semibold text-right text-emerald-400 font-bold">
                Laba Bersih Paket
              </th>
              <th className="py-2.5 px-3 font-semibold text-center">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {breakdown.packages.map((pkg) => {
              const isHealthy = pkg.marginPercentage >= 25;
              const isLow = pkg.marginPercentage >= 0 && pkg.marginPercentage < 15;
              const badgeClass = isHealthy 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : isLow 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                : 'bg-rose-500/20 text-rose-400 border-rose-500/40';

              return (
                <tr key={pkg.packageId} className="hover:bg-surface-hover/40 transition">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <span>📦</span>
                      <span>{pkg.packageName}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-text font-medium">
                    {formatCurrency(pkg.sellingPrice)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-text-muted">
                    {formatCurrency(pkg.materialCost)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-text-muted">
                    {formatCurrency(pkg.laborCost)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-text font-bold">
                    <div>{formatCurrency(pkg.totalCost)}</div>
                    <div className="text-[10px] text-text-muted font-normal">
                      (Bahan: {formatCurrency(pkg.materialCost)} + Upah: {formatCurrency(pkg.laborCost)})
                    </div>
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold ${pkg.netProfit >= 0 ? 'text-emerald-400' : 'text-status-danger'}`}>
                    {formatCurrency(pkg.netProfit)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                      {pkg.marginPercentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-amber-500/10 font-bold border-t border-amber-500/30 text-xs">
              <td className="py-2.5 px-3 text-amber-400">
                Total Akumulasi Seluruh Paket ({breakdown.packages.length} Unit)
              </td>
              <td className="py-2.5 px-3 text-right text-text">
                {formatCurrency(breakdown.totalPackageRevenue)}
              </td>
              <td className="py-2.5 px-3 text-right text-text-muted">
                {formatCurrency(breakdown.packages.reduce((sum, p) => sum + p.materialCost, 0))}
              </td>
              <td className="py-2.5 px-3 text-right text-text-muted">
                {formatCurrency(breakdown.packages.reduce((sum, p) => sum + p.laborCost, 0))}
              </td>
              <td className="py-2.5 px-3 text-right text-text">
                {formatCurrency(breakdown.totalPackageCost)}
              </td>
              <td className="py-2.5 px-3 text-right text-emerald-400">
                {formatCurrency(breakdown.totalPackageProfit)}
              </td>
              <td className="py-2.5 px-3 text-center text-emerald-400">
                {breakdown.totalPackageRevenue > 0
                  ? ((breakdown.totalPackageProfit / breakdown.totalPackageRevenue) * 100).toFixed(1)
                  : '0.0'}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Comparison against granular metrics note */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-text-muted font-mono bg-background/60 p-2.5 rounded-lg border border-border/50">
        <span className="flex items-center gap-1">
          <ArrowRight className="w-3 h-3 text-primary" />
          <span>Biaya upah perakitan paket di atas telah dipisahkan secara murni dari borongan mandor granular.</span>
        </span>
        <span className="text-amber-400 font-semibold">
          Laba Paket: {formatCurrency(breakdown.totalPackageProfit)}
        </span>
      </div>
    </div>
  );
};
