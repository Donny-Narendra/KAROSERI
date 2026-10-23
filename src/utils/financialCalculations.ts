/**
 * Reusable Financial Calculation & Integrity Validation Formulas
 * RobelKaroseri Workshop Management System
 */

export interface ProfitabilityCalculation {
  totalRevenue: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPercentage: number;
  isNegativeMargin: boolean;
}

export interface WbsBudgetVarianceCalculation {
  initialBudget: number;
  changeOrderAdjustment: number;
  totalBudget: number;
  actualSpent: number;
  variance: number;
  isOverBudget: boolean;
  overspendAmount: number;
}

export type HandoverClearanceStatus = 
  | 'LUNAS (SIAP HANDOVER)'
  | 'UNIT SELESAI (TERTAHAN PELUNASAN)'
  | 'PENGERJAAN BERJALAN';

/**
 * Menghitung Total HPP (3 Unsur: Material, Labor, Overhead), Laba Kotor, dan Margin Persentase Proyek SPK
 */
export function calculateJobProfitability(
  revenue: number,
  materialCost: number,
  laborCost: number,
  overheadCost: number = 0
): ProfitabilityCalculation {
  const safeRevenue = Math.max(0, Number(revenue) || 0);
  const safeMaterial = Math.max(0, Number(materialCost) || 0);
  const safeLabor = Math.max(0, Number(laborCost) || 0);
  const safeOverhead = Math.max(0, Number(overheadCost) || 0);
  
  const totalCogs = safeMaterial + safeLabor + safeOverhead;
  const grossProfit = safeRevenue - totalCogs;
  
  let grossMarginPercentage = 0;
  if (safeRevenue > 0) {
    grossMarginPercentage = Math.round(((grossProfit / safeRevenue) * 100) * 100) / 100;
  }

  return {
    totalRevenue: safeRevenue,
    materialCost: safeMaterial,
    laborCost: safeLabor,
    overheadCost: safeOverhead,
    totalCogs,
    grossProfit,
    grossMarginPercentage,
    isNegativeMargin: safeRevenue > 0 && grossProfit < 0,
  };
}

/**
 * Menghitung Varian Pagu Anggaran (RAB Awal + Revisi Change Orders vs Aktual)
 */
export function calculateWbsBudgetVariance(
  initialBudget: number,
  changeOrderAdjustment: number,
  actualSpent: number
): WbsBudgetVarianceCalculation {
  const safeInitial = Number(initialBudget) || 0;
  const safeCo = Number(changeOrderAdjustment) || 0;
  const totalBudget = safeInitial + safeCo;
  const safeActual = Number(actualSpent) || 0;

  const variance = totalBudget - safeActual;
  const isOverBudget = safeActual > totalBudget;
  const overspendAmount = isOverBudget ? safeActual - totalBudget : 0;

  return {
    initialBudget: safeInitial,
    changeOrderAdjustment: safeCo,
    totalBudget,
    actualSpent: safeActual,
    variance,
    isOverBudget,
    overspendAmount,
  };
}

/**
 * Menentukan Status Kelayakan Serah Terima (Handover Clearance Gate)
 */
export function determineHandoverClearance(params: {
  outstandingBalance: number;
  qcStatus?: string | null;
}): HandoverClearanceStatus {
  const balance = Number(params.outstandingBalance) || 0;
  const isQcPassed = String(params.qcStatus || '').trim().toUpperCase() === 'PASS';

  if (balance <= 0) {
    return 'LUNAS (SIAP HANDOVER)';
  }

  if (isQcPassed && balance > 0) {
    return 'UNIT SELESAI (TERTAHAN PELUNASAN)';
  }

  return 'PENGERJAAN BERJALAN';
}

/**
 * Menghitung Usia Piutang dalam Hari
 */
export function calculateReceivableAgingDays(
  invoiceDate: string | Date,
  referenceDate: string | Date = new Date()
): number {
  if (!invoiceDate) return 0;
  const invTime = new Date(invoiceDate).getTime();
  const refTime = new Date(referenceDate).getTime();

  if (isNaN(invTime) || isNaN(refTime)) return 0;

  const diffMs = refTime - invTime;
  if (diffMs <= 0) return 0;

  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Memeriksa apakah piutang serah terima berisiko kritis (Aging > 7 hari)
 */
export function isCriticalHandoverRisk(
  clearanceStatus: HandoverClearanceStatus | string,
  agingDays: number
): boolean {
  return clearanceStatus === 'UNIT SELESAI (TERTAHAN PELUNASAN)' && agingDays > 7;
}

/**
 * Format mata uang Rupiah standar
 */
export function formatIdrCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export interface SegregatedProfitCalculation {
  pkgRev: number;
  pkgCost: number;
  pkgProfit: number;
  matRev: number;
  matCost: number;
  matProfit: number;
  otherRev: number;
  otherCost: number;
  otherProfit: number;
  totalRev: number;
  totalCost: number;
  totalProfit: number;
}

/**
 * Menghitung pemisahan profit 3-pilar (Paket Barang Jadi, Material Granular, dan Jasa/Overhead Bebas)
 * Mendukung data dari tabel rab_items, change_order_items, state RabItem, maupun DraftItem.
 */
export function calculateSegregatedProfit(
  items: Array<any>,
  packages?: Array<any>
): SegregatedProfitCalculation {
  if (!Array.isArray(items)) {
    return {
      pkgRev: 0, pkgCost: 0, pkgProfit: 0,
      matRev: 0, matCost: 0, matProfit: 0,
      otherRev: 0, otherCost: 0, otherProfit: 0,
      totalRev: 0, totalCost: 0, totalProfit: 0,
    };
  }

  // Paket: memiliki package_id atau package_source_id atau package_name (atau packageId / packageName / notes Paket:)
  const isPkg = (i: any) => Boolean(
    i.package_id ||
    i.package_source_id ||
    i.package_name ||
    i.packageId ||
    i.packageName ||
    (typeof i.notes === 'string' && i.notes.includes('Paket:'))
  );

  const getQty = (i: any) => Number(i.quantity !== undefined ? i.quantity : (i.qty || 0));
  const getUnitPrice = (i: any) => Number(i.unit_price !== undefined ? i.unit_price : (i.unitPrice || 0));
  const getCostPrice = (i: any) => {
    if (i.cost_price !== undefined && i.cost_price !== null) return Number(i.cost_price || 0);
    if (i.costPrice !== undefined && i.costPrice !== null) return Number(i.costPrice || 0);
    if (i.unitPrice !== undefined && i.unit_price === undefined) return Number(i.unitPrice || 0);
    return 0;
  };
  const isMat = (i: any) => {
    const t = String(i.item_type || i.type || '').toUpperCase();
    return t === 'MATERIAL';
  };

  // Paket: memiliki package_id atau package_source_id atau package_name
  const pkgItems = items.filter(isPkg);
  let pkgRev = 0;
  if (Array.isArray(packages) && packages.length > 0) {
    const uniquePackages = new Map<string, number>();
    const unbundledPkgItems: any[] = [];

    pkgItems.forEach(i => {
      const key = i.package_instance_id || i.packageInstanceId || i.packageId || i.package_id || i.package_source_id || i.packageName || i.package_name;
      const pid = i.packageId || i.package_id || i.package_source_id;
      const pName = i.packageName || i.package_name;
      const found = packages.find(p => (pid && p.id === pid) || (pName && p.name === pName));
      if (found) {
        if (key && !uniquePackages.has(key)) {
          uniquePackages.set(key, Number(found.selling_price || 0));
        }
      } else {
        unbundledPkgItems.push(i);
      }
    });

    uniquePackages.forEach(price => { pkgRev += price; });
    pkgRev += unbundledPkgItems.reduce((acc, i) => acc + (getQty(i) * getUnitPrice(i)), 0);
  } else {
    pkgRev = pkgItems.reduce((acc, i) => acc + (getQty(i) * getUnitPrice(i)), 0);
  }
  const pkgCost = pkgItems.reduce((acc, i) => acc + (getQty(i) * getCostPrice(i)), 0);
  const pkgProfit = pkgRev - pkgCost;

  // Granular Material: tanpa paket & tipe MATERIAL
  const matItems = items.filter(i => !isPkg(i) && isMat(i));
  const matRev = matItems.reduce((acc, i) => acc + (getQty(i) * getUnitPrice(i)), 0);
  const matCost = matItems.reduce((acc, i) => acc + (getQty(i) * getCostPrice(i)), 0);
  const matProfit = matRev - matCost;

  // Granular Other: tanpa paket & tipe JASA / OVERHEAD
  const otherItems = items.filter(i => !isPkg(i) && !isMat(i));
  const otherRev = otherItems.reduce((acc, i) => acc + (getQty(i) * getUnitPrice(i)), 0);
  const otherCost = otherItems.reduce((acc, i) => acc + (getQty(i) * getCostPrice(i)), 0);
  const otherProfit = otherRev - otherCost;

  const totalRev = pkgRev + matRev + otherRev;
  const totalCost = pkgCost + matCost + otherCost;
  const totalProfit = totalRev - totalCost;

  return {
    pkgRev, pkgCost, pkgProfit,
    matRev, matCost, matProfit,
    otherRev, otherCost, otherProfit,
    totalRev, totalCost, totalProfit,
  };
}

export interface ChangeOrderMarginBreakdown {
  packageMargin: number;
  materialMargin: number;
  laborMargin: number;
  overheadMargin: number;
  totalProfit: number;
  packageRev: number;
  materialRev: number;
  laborRev: number;
  overheadRev: number;
}

/**
 * Menghitung rincian 4 pilar margin (Paket Assembly, Material Granular, Labor/Jasa, Overhead/FOH)
 * untuk item snapshot pada kartu Change Order.
 */
export function computeChangeOrderMargins(items?: Array<any> | null): ChangeOrderMarginBreakdown {
  let packageMargin = 0, packageRev = 0;
  let materialMargin = 0, materialRev = 0;
  let laborMargin = 0, laborRev = 0;
  let overheadMargin = 0, overheadRev = 0;

  if (Array.isArray(items)) {
    items.forEach(item => {
      const qty = Number(item.quantity !== undefined && item.quantity !== null ? item.quantity : (item.qty ?? 1));
      const selling = Number(item.unit_price !== undefined && item.unit_price !== null ? item.unit_price : (item.unitPrice ?? 0)) * qty;
      const cost = Number(item.cost_price !== undefined && item.cost_price !== null ? item.cost_price : (item.costPrice ?? 0)) * qty;
      const margin = selling - cost;

      const isPackage = Boolean(
        item.package_source_id ||
        item.package_name ||
        item.packageId ||
        item.packageName ||
        item.product_packages?.name ||
        (typeof item.notes === 'string' && (item.notes.includes('Bagian dari paket:') || item.notes.includes('[Paket:')))
      );

      const itemType = String(item.item_type || item.type || '').toUpperCase();

      if (isPackage) {
        packageRev += selling;
        packageMargin += margin;
      } else if (itemType === 'MATERIAL') {
        materialRev += selling;
        materialMargin += margin;
      } else if (itemType === 'LABOR') {
        laborRev += selling;
        laborMargin += margin;
      } else if (itemType === 'OVERHEAD') {
        overheadRev += selling;
        overheadMargin += margin;
      }
    });
  }

  return {
    packageMargin,
    materialMargin,
    laborMargin,
    overheadMargin,
    totalProfit: packageMargin + materialMargin + laborMargin + overheadMargin,
    packageRev,
    materialRev,
    laborRev,
    overheadRev
  };
}


