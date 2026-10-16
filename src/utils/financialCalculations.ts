/**
 * Reusable Financial Calculation & Integrity Validation Formulas
 * RobelKaroseri Workshop Management System
 */

export interface ProfitabilityCalculation {
  totalRevenue: number;
  materialCost: number;
  laborCost: number;
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
 * Menghitung Total HPP, Laba Kotor, dan Margin Persentase Proyek SPK
 */
export function calculateJobProfitability(
  revenue: number,
  materialCost: number,
  laborCost: number
): ProfitabilityCalculation {
  const safeRevenue = Math.max(0, Number(revenue) || 0);
  const safeMaterial = Math.max(0, Number(materialCost) || 0);
  const safeLabor = Math.max(0, Number(laborCost) || 0);
  
  const totalCogs = safeMaterial + safeLabor;
  const grossProfit = safeRevenue - totalCogs;
  
  let grossMarginPercentage = 0;
  if (safeRevenue > 0) {
    grossMarginPercentage = Math.round(((grossProfit / safeRevenue) * 100) * 100) / 100;
  }

  return {
    totalRevenue: safeRevenue,
    materialCost: safeMaterial,
    laborCost: safeLabor,
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
