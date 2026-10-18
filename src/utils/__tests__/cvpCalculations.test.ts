import { describe, it, expect } from 'vitest';
import { calculateCvpAnalysis, generateCvpScenarios } from '../cvpCalculations';

describe('CVP Analysis & Smart Target Solver Engine', () => {
  it('correctly calculates BEP and Target Profit figures for baseline karoseri workshop', () => {
    const input = {
      targetProfit: 30_000_000, // 30 Juta
      fixedCosts: 45_000_000,   // 45 Juta
      pricePerUnit: 50_000_000, // 50 Juta per unit SPK
      variableCostPerUnit: 35_000_000, // 35 Juta per unit SPK
      actualRevenue: 300_000_000,
    };

    const result = calculateCvpAnalysis(input);

    expect(result.contributionMarginPerUnit).toBe(15_000_000);
    expect(result.contributionMarginRatio).toBe(30);
    expect(result.bepUnits).toBe(3); // 45M / 15M = 3
    expect(result.bepRevenue).toBe(150_000_000);
    expect(result.targetUnits).toBe(5); // (45M + 30M) / 15M = 5
    expect(result.targetRevenue).toBe(250_000_000);
    expect(result.marginOfSafetyRevenue).toBe(150_000_000); // 300M - 150M = 150M
    expect(result.marginOfSafetyPercentage).toBe(50);
    expect(result.isProfitable).toBe(true);
  });

  it('handles fractional units with Math.ceil to guarantee break-even coverage', () => {
    const input = {
      targetProfit: 10_000_000,
      fixedCosts: 25_000_000,
      pricePerUnit: 40_000_000,
      variableCostPerUnit: 30_000_000, // CM = 10,000,000
    };

    // BEP Units = 25M / 10M = 2.5 => Math.ceil = 3
    const result = calculateCvpAnalysis(input);
    expect(result.bepUnits).toBe(3);
    // Target Units = (25M + 10M) / 10M = 3.5 => Math.ceil = 4
    expect(result.targetUnits).toBe(4);
  });

  it('safely handles zero or negative contribution margin', () => {
    const input = {
      targetProfit: 10_000_000,
      fixedCosts: 25_000_000,
      pricePerUnit: 20_000_000,
      variableCostPerUnit: 25_000_000, // Var cost exceeds price
    };

    const result = calculateCvpAnalysis(input);
    expect(result.bepUnits).toBe(0);
    expect(result.bepRevenue).toBe(0);
    expect(result.targetUnits).toBe(0);
    expect(result.isProfitable).toBe(false);
    expect(result.statusMessage).toContain('Margin Kontribusi Negatif');
  });

  it('safely handles zero price input', () => {
    const input = {
      targetProfit: 10_000_000,
      fixedCosts: 25_000_000,
      pricePerUnit: 0,
      variableCostPerUnit: 0,
    };

    const result = calculateCvpAnalysis(input);
    expect(result.bepUnits).toBe(0);
    expect(result.targetUnits).toBe(0);
    expect(result.statusMessage).toContain('belum diisi');
  });

  it('generates multi-tier sensitivity scenarios correctly', () => {
    const input = {
      targetProfit: 30_000_000,
      fixedCosts: 45_000_000,
      pricePerUnit: 50_000_000,
      variableCostPerUnit: 35_000_000,
    };

    const baseResult = calculateCvpAnalysis(input);
    const scenarios = generateCvpScenarios(input, baseResult);

    expect(scenarios.length).toBe(6);
    const baseline = scenarios.find(s => s.label === 'Baseline Target');
    expect(baseline).toBeDefined();
    expect(baseline?.projectedUnits).toBe(5);
    expect(baseline?.projectedRevenue).toBe(250_000_000);
    expect(baseline?.projectedGrossProfit).toBe(75_000_000);
    expect(baseline?.projectedNetProfit).toBe(30_000_000);
    expect(baseline?.meetsTarget).toBe(true);

    const pessimistic = scenarios.find(s => s.label.includes('Pesimis'));
    expect(pessimistic).toBeDefined();
    // 5 * 0.8 = 4 units
    expect(pessimistic?.projectedUnits).toBe(4);
    // 4 units * 15M CM = 60M gross profit - 45M fixed = 15M net profit (< 30M target)
    expect(pessimistic?.meetsTarget).toBe(false);
  });
});
