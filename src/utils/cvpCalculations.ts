/**
 * Cost-Volume-Profit (CVP) & Break-Even Analysis Math Utility
 * Powers the Smart Sales Target Solver Engine for Karoseri Workshop Management.
 */

export interface CvpInputParams {
  /** Target Net Operating Profit (Target Laba Bersih yang diinginkan) */
  targetProfit: number;
  /** Fixed Costs per period (Total OPEX bulanan) */
  fixedCosts: number;
  /** Average Selling Price per Unit SPK (Omzet rata-rata per SPK) */
  pricePerUnit: number;
  /** Variable Cost per Unit SPK (Material + Labor + Overhead rata-rata per SPK) */
  variableCostPerUnit: number;
  /** Actual Current Revenue for Margin of Safety calculation */
  actualRevenue?: number;
  /** Actual Current Units for Margin of Safety calculation */
  actualUnits?: number;
}

export interface CvpAnalysisResult {
  /** Unit Contribution Margin = Price - Variable Cost */
  contributionMarginPerUnit: number;
  /** Contribution Margin Ratio (%) = (CM per unit / Price) * 100 */
  contributionMarginRatio: number;
  /** Break-Even Point in Units = Fixed Costs / CM per unit (rounded up) */
  bepUnits: number;
  /** Break-Even Point in Rupiah = Fixed Costs / (CM Ratio / 100) */
  bepRevenue: number;
  /** Required Units to achieve Target Profit = (Fixed Costs + Target Profit) / CM per unit (rounded up) */
  targetUnits: number;
  /** Required Revenue (Omzet) to achieve Target Profit = (Fixed Costs + Target Profit) / (CM Ratio / 100) */
  targetRevenue: number;
  /** Margin of Safety in Rupiah = Actual Revenue - BEP Revenue */
  marginOfSafetyRevenue: number;
  /** Margin of Safety Ratio (%) = (MoS Revenue / Actual Revenue) * 100 */
  marginOfSafetyPercentage: number;
  /** Is the current situation above BEP? */
  isProfitable: boolean;
  /** Diagnostic status message */
  statusMessage: string;
}

export interface CvpScenario {
  label: string;
  priceDeltaPercentage: number;
  volumeDeltaPercentage: number;
  projectedUnits: number;
  projectedRevenue: number;
  projectedTotalCogs: number;
  projectedGrossProfit: number;
  projectedNetProfit: number;
  meetsTarget: boolean;
}

/**
 * Calculates complete CVP, Break-Even Point, and Target Profit Solver figures.
 */
export function calculateCvpAnalysis(params: CvpInputParams): CvpAnalysisResult {
  const targetProfit = Math.max(0, Number(params.targetProfit) || 0);
  const fixedCosts = Math.max(0, Number(params.fixedCosts) || 0);
  const price = Math.max(0, Number(params.pricePerUnit) || 0);
  const variableCost = Math.max(0, Number(params.variableCostPerUnit) || 0);
  const actualRevenue = Math.max(0, Number(params.actualRevenue) || 0);

  const cmPerUnit = price - variableCost;
  const cmRatio = price > 0 ? (cmPerUnit / price) * 100 : 0;

  if (price <= 0) {
    return {
      contributionMarginPerUnit: 0,
      contributionMarginRatio: 0,
      bepUnits: 0,
      bepRevenue: 0,
      targetUnits: 0,
      targetRevenue: 0,
      marginOfSafetyRevenue: 0,
      marginOfSafetyPercentage: 0,
      isProfitable: false,
      statusMessage: 'Harga jual per unit belum diisi.',
    };
  }

  if (cmPerUnit <= 0) {
    return {
      contributionMarginPerUnit: cmPerUnit,
      contributionMarginRatio: cmRatio,
      bepUnits: 0,
      bepRevenue: 0,
      targetUnits: 0,
      targetRevenue: 0,
      marginOfSafetyRevenue: 0,
      marginOfSafetyPercentage: 0,
      isProfitable: false,
      statusMessage: 'Biaya variabel per unit melebihi atau sama dengan harga jual. Tidak dapat mencapai titik impas (Margin Kontribusi Negatif).',
    };
  }

  // BEP Calculation
  const bepUnitsExact = fixedCosts / cmPerUnit;
  const bepUnits = Math.ceil(bepUnitsExact);
  const bepRevenue = fixedCosts / (cmRatio / 100);

  // Target Profit Calculation
  const targetUnitsExact = (fixedCosts + targetProfit) / cmPerUnit;
  const targetUnits = Math.ceil(targetUnitsExact);
  const targetRevenue = (fixedCosts + targetProfit) / (cmRatio / 100);

  // Margin of Safety
  const marginOfSafetyRevenue = actualRevenue > bepRevenue ? actualRevenue - bepRevenue : 0;
  const marginOfSafetyPercentage = actualRevenue > 0 
    ? Math.max(0, (marginOfSafetyRevenue / actualRevenue) * 100) 
    : 0;

  const isProfitable = actualRevenue >= bepRevenue;

  let statusMessage = 'Target realistis dan margin kontribusi sehat.';
  if (marginOfSafetyPercentage > 30) {
    statusMessage = 'Sangat aman! Posisi omzet berada jauh di atas batas impas (MoS > 30%).';
  } else if (marginOfSafetyPercentage > 10) {
    statusMessage = 'Aman. Posisi operasional menutupi seluruh beban tetap dan menghasilkan laba.';
  } else if (isProfitable) {
    statusMessage = 'Waspada. Omzet mendekati titik impas. Fluktuasi biaya kecil dapat menyebabkan defisit.';
  } else {
    statusMessage = 'Defisit. Omzet aktual belum melampaui titik impas bulanan.';
  }

  return {
    contributionMarginPerUnit: Math.round(cmPerUnit),
    contributionMarginRatio: Math.round(cmRatio * 100) / 100,
    bepUnits,
    bepRevenue: Math.round(bepRevenue),
    targetUnits,
    targetRevenue: Math.round(targetRevenue),
    marginOfSafetyRevenue: Math.round(marginOfSafetyRevenue),
    marginOfSafetyPercentage: Math.round(marginOfSafetyPercentage * 10) / 10,
    isProfitable,
    statusMessage,
  };
}

/**
 * Generates sensitivity scenarios (e.g. ±10%, ±20% volume & price shifts)
 */
export function generateCvpScenarios(
  params: CvpInputParams,
  baseAnalysis: CvpAnalysisResult
): CvpScenario[] {
  const variations = [
    { label: 'Pesimis (-20% Volume)', volDelta: -0.2, priceDelta: 0 },
    { label: 'Konservatif (-10% Volume)', volDelta: -0.1, priceDelta: 0 },
    { label: 'Baseline Target', volDelta: 0, priceDelta: 0 },
    { label: 'Optimis (+10% Volume)', volDelta: 0.1, priceDelta: 0 },
    { label: 'Skenario Efisiensi Harga (+5% Harga)', volDelta: 0, priceDelta: 0.05 },
    { label: 'Agresif (+15% Vol & +5% Harga)', volDelta: 0.15, priceDelta: 0.05 },
  ];

  const baseUnits = baseAnalysis.targetUnits || 1;
  const basePrice = params.pricePerUnit;
  const varCost = params.variableCostPerUnit;
  const fixed = params.fixedCosts;
  const desiredProfit = params.targetProfit;

  return variations.map(v => {
    const units = Math.max(1, Math.round(baseUnits * (1 + v.volDelta)));
    const price = Math.round(basePrice * (1 + v.priceDelta));
    const revenue = units * price;
    const cogs = units * varCost;
    const gross = revenue - cogs;
    const net = gross - fixed;

    return {
      label: v.label,
      priceDeltaPercentage: v.priceDelta * 100,
      volumeDeltaPercentage: v.volDelta * 100,
      projectedUnits: units,
      projectedRevenue: revenue,
      projectedTotalCogs: cogs,
      projectedGrossProfit: gross,
      projectedNetProfit: net,
      meetsTarget: net >= desiredProfit,
    };
  });
}
