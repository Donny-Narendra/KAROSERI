import { cleanPackageName, extractPackageFromNotes } from './sourceOrigin';

export interface PackageProfitDetail {
  packageId: string;
  packageName: string;
  instanceId?: string;
  sellingPrice: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  netProfit: number;
  marginPercentage: number;
}

export interface GranularProfitPillar {
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
}

export interface ProfitBreakdownResult {
  // Pilar 1: Per Paket (Itemized Assembly Margin)
  packages: PackageProfitDetail[];
  totalPackageRevenue: number;
  totalPackageCost: number;
  totalPackageProfit: number;

  // Pilar 2: Granular / Lepas (Non-Paket)
  granularMaterial: GranularProfitPillar;
  granularLabor: GranularProfitPillar;
  granularOverhead: GranularProfitPillar;
  totalGranularRevenue: number;
  totalGranularCost: number;
  totalGranularProfit: number;

  // Grand Total Proyek SPK
  grandTotalRevenue: number;
  grandTotalCost: number;
  grandTotalProfit: number;
  grandTotalMarginPercentage: number;
}

export type PackageMasterLookup = 
  | Map<string, { selling_price: number; name?: string }>
  | Array<{ id: string; name: string; selling_price: number }>
  | Record<string, { selling_price: number; name?: string }>;

/**
 * Computes 2-Pillar Segregated Project Profit:
 * - Pilar 1: Itemized Assembly Packages (Selling Price - Total Components HPP [Material + Labor + Overhead])
 * - Pilar 2: Granular Non-Package items (Material, Labor, Overhead isolated)
 * - Grand Total: Reconciled overall SPK profit and margin.
 */
export function computeSegregatedProjectProfit(
  items: Array<any> | null | undefined,
  packageMasters?: PackageMasterLookup
): ProfitBreakdownResult {
  // Normalize package masters to a lookup function
  const lookupMaster = (keyOrId?: string | null, name?: string | null): { selling_price: number; name?: string } | undefined => {
    if (!packageMasters) return undefined;

    if (packageMasters instanceof Map) {
      if (keyOrId && packageMasters.has(keyOrId)) return packageMasters.get(keyOrId);
      if (name && packageMasters.has(name)) return packageMasters.get(name);
      const cleaned = cleanPackageName(name);
      if (cleaned && packageMasters.has(cleaned)) return packageMasters.get(cleaned);
      return undefined;
    }

    if (Array.isArray(packageMasters)) {
      const cleanedName = cleanPackageName(name);
      const found = packageMasters.find(p => 
        (keyOrId && p.id === keyOrId) ||
        (name && p.name === name) ||
        (cleanedName && cleanPackageName(p.name) === cleanedName)
      );
      return found ? { selling_price: Number(found.selling_price || 0), name: found.name } : undefined;
    }

    if (typeof packageMasters === 'object') {
      const rec = packageMasters as Record<string, { selling_price: number; name?: string }>;
      if (keyOrId && rec[keyOrId]) return rec[keyOrId];
      if (name && rec[name]) return rec[name];
      const cleaned = cleanPackageName(name);
      if (cleaned && rec[cleaned]) return rec[cleaned];
    }

    return undefined;
  };

  if (!Array.isArray(items) || items.length === 0) {
    return {
      packages: [],
      totalPackageRevenue: 0,
      totalPackageCost: 0,
      totalPackageProfit: 0,
      granularMaterial: { revenue: 0, cost: 0, profit: 0, marginPct: 0 },
      granularLabor: { revenue: 0, cost: 0, profit: 0, marginPct: 0 },
      granularOverhead: { revenue: 0, cost: 0, profit: 0, marginPct: 0 },
      totalGranularRevenue: 0,
      totalGranularCost: 0,
      totalGranularProfit: 0,
      grandTotalRevenue: 0,
      grandTotalCost: 0,
      grandTotalProfit: 0,
      grandTotalMarginPercentage: 0,
    };
  }

  const packageMap = new Map<string, {
    packageName: string;
    instanceId?: string;
    sellingPrice: number;
    materialCost: number;
    laborCost: number;
    overheadCost: number;
    totalRevenueAccum: number;
  }>();

  let granMatRev = 0, granMatCost = 0;
  let granLabRev = 0, granLabCost = 0;
  let granOvhRev = 0, granOvhCost = 0;

  items.forEach(item => {
    const qty = Number(item.quantity !== undefined && item.quantity !== null ? item.quantity : (item.qty ?? 1));
    const unitPrice = Number(item.unit_price !== undefined && item.unit_price !== null ? item.unit_price : (item.unitPrice ?? 0));
    const costPrice = Number(item.cost_price !== undefined && item.cost_price !== null ? item.cost_price : (item.costPrice ?? 0));
    const selling = item.subtotal !== undefined && item.subtotal !== null ? Number(item.subtotal) : qty * unitPrice;
    const cost = qty * costPrice;

    // Detect Package Key & Name
    let rawPkgName = item.package_name || item.packageName || item.product_packages?.name || null;
    if (!rawPkgName && item.notes) {
      rawPkgName = extractPackageFromNotes(item.notes);
    }
    const cleanedPkg = cleanPackageName(rawPkgName);

    const isPackageItem = Boolean(
      item.is_package ||
      item.package_instance_id ||
      item.packageInstanceId ||
      item.package_source_id ||
      item.package_id ||
      item.packageId ||
      cleanedPkg ||
      (typeof item.notes === 'string' && (item.notes.includes('Paket:') || item.notes.includes('Bagian dari paket:')))
    );

    const packageKey = isPackageItem
      ? (item.package_instance_id || item.packageInstanceId || item.package_source_id || item.package_id || item.packageId || (cleanedPkg ? `pkg_${cleanedPkg}` : 'pkg_general'))
      : null;

    const rawType = String(item.item_type || item.type || 'MATERIAL').toUpperCase();
    const itemType = rawType === 'LABOR' ? 'LABOR' : rawType === 'OVERHEAD' ? 'OVERHEAD' : 'MATERIAL';

    if (packageKey) {
      const pkgName = cleanedPkg || rawPkgName || item.product_packages?.name || 'Paket Barang Jadi';
      const masterInfo = lookupMaster(item.package_id || item.package_source_id || item.packageId, pkgName);
      const masterPrice = masterInfo?.selling_price !== undefined ? Number(masterInfo.selling_price) : undefined;

      if (!packageMap.has(packageKey)) {
        packageMap.set(packageKey, {
          packageName: masterInfo?.name || pkgName,
          instanceId: item.package_instance_id || item.packageInstanceId || undefined,
          sellingPrice: masterPrice !== undefined ? masterPrice : 0,
          materialCost: 0,
          laborCost: 0,
          overheadCost: 0,
          totalRevenueAccum: 0,
        });
      }

      const pEntry = packageMap.get(packageKey)!;
      pEntry.totalRevenueAccum += selling;

      if (itemType === 'MATERIAL') {
        pEntry.materialCost += cost;
      } else if (itemType === 'LABOR') {
        pEntry.laborCost += cost;
      } else if (itemType === 'OVERHEAD') {
        pEntry.overheadCost += cost;
      }
    } else {
      // Non-Paket (Granular)
      if (itemType === 'MATERIAL') {
        granMatRev += selling;
        granMatCost += cost;
      } else if (itemType === 'LABOR') {
        granLabRev += selling;
        granLabCost += cost;
      } else if (itemType === 'OVERHEAD') {
        granOvhRev += selling;
        granOvhCost += cost;
      }
    }
  });

  const packageList: PackageProfitDetail[] = Array.from(packageMap.entries()).map(([key, p]) => {
    const finalSellingPrice = p.sellingPrice > 0 ? p.sellingPrice : p.totalRevenueAccum;
    const totalCost = p.materialCost + p.laborCost + p.overheadCost;
    const netProfit = finalSellingPrice - totalCost;
    const marginPercentage = finalSellingPrice > 0 
      ? Math.round(((netProfit / finalSellingPrice) * 100) * 100) / 100 
      : 0;

    return {
      packageId: key,
      packageName: p.packageName,
      instanceId: p.instanceId,
      sellingPrice: finalSellingPrice,
      materialCost: p.materialCost,
      laborCost: p.laborCost,
      overheadCost: p.overheadCost,
      totalCost,
      netProfit,
      marginPercentage,
    };
  });

  const totalPackageRevenue = packageList.reduce((acc, p) => acc + p.sellingPrice, 0);
  const totalPackageCost = packageList.reduce((acc, p) => acc + p.totalCost, 0);
  const totalPackageProfit = totalPackageRevenue - totalPackageCost;

  const granMatProfit = granMatRev - granMatCost;
  const granLabProfit = granLabRev - granLabCost;
  const granOvhProfit = granOvhRev - granOvhCost;

  const totalGranularRevenue = granMatRev + granLabRev + granOvhRev;
  const totalGranularCost = granMatCost + granLabCost + granOvhCost;
  const totalGranularProfit = totalGranularRevenue - totalGranularCost;

  const grandTotalRevenue = totalPackageRevenue + totalGranularRevenue;
  const grandTotalCost = totalPackageCost + totalGranularCost;
  const grandTotalProfit = grandTotalRevenue - grandTotalCost;
  const grandTotalMarginPercentage = grandTotalRevenue > 0 
    ? Math.round(((grandTotalProfit / grandTotalRevenue) * 100) * 100) / 100 
    : 0;

  return {
    packages: packageList,
    totalPackageRevenue,
    totalPackageCost,
    totalPackageProfit,
    granularMaterial: {
      revenue: granMatRev,
      cost: granMatCost,
      profit: granMatProfit,
      marginPct: granMatRev > 0 ? Math.round(((granMatProfit / granMatRev) * 100) * 100) / 100 : 0,
    },
    granularLabor: {
      revenue: granLabRev,
      cost: granLabCost,
      profit: granLabProfit,
      marginPct: granLabRev > 0 ? Math.round(((granLabProfit / granLabRev) * 100) * 100) / 100 : 0,
    },
    granularOverhead: {
      revenue: granOvhRev,
      cost: granOvhCost,
      profit: granOvhProfit,
      marginPct: granOvhRev > 0 ? Math.round(((granOvhProfit / granOvhRev) * 100) * 100) / 100 : 0,
    },
    totalGranularRevenue,
    totalGranularCost,
    totalGranularProfit,
    grandTotalRevenue,
    grandTotalCost,
    grandTotalProfit,
    grandTotalMarginPercentage,
  };
}
