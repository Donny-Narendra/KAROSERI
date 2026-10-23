import { describe, it, expect } from 'vitest';
import { calculateSegregatedProfit, computeChangeOrderMargins } from '../financialCalculations';
import { calculateSegregatedProfit as rabCalcSegProfit } from '../../components/RabCalculator';
import { calculateSegregatedProfit as amendmentSegProfit, computeChangeOrderMargins as amendmentComputeMargins } from '../../components/AmendmentManager';
import { calculateSegregatedProfit as itemizedCoSegProfit, computeChangeOrderMargins as itemizedCoComputeMargins } from '../../components/ItemizedChangeOrderForm';
import { calculateSegregatedProfit as changeOrdersTabSegProfit, computeChangeOrderMargins as changeOrdersTabComputeMargins } from '../../components/ChangeOrdersTab';

describe('Sprint 82 Task 2: calculateSegregatedProfit Helper', () => {
  it('is exported and consistent across all component and utility modules', () => {
    expect(typeof calculateSegregatedProfit).toBe('function');
    expect(calculateSegregatedProfit).toBe(rabCalcSegProfit);
    expect(calculateSegregatedProfit).toBe(amendmentSegProfit);
    expect(calculateSegregatedProfit).toBe(itemizedCoSegProfit);
    expect(calculateSegregatedProfit).toBe(changeOrdersTabSegProfit);
  });

  it('safely handles empty array or invalid inputs', () => {
    const emptyResult = calculateSegregatedProfit([]);
    expect(emptyResult).toEqual({
      pkgRev: 0, pkgCost: 0, pkgProfit: 0,
      matRev: 0, matCost: 0, matProfit: 0,
      otherRev: 0, otherCost: 0, otherProfit: 0,
      totalRev: 0, totalCost: 0, totalProfit: 0,
    });

    const nullResult = calculateSegregatedProfit(null as any);
    expect(nullResult.totalProfit).toBe(0);
  });

  it('correctly calculates 3-pillar segregated profit with database/draft item snake_case keys', () => {
    const items = [
      // 1. Paket Barang Jadi
      {
        package_source_id: 'pkg-box-1',
        package_name: 'Box Pendingin Standar',
        item_type: 'MATERIAL',
        quantity: 2,
        unit_price: 25_000_000,
        cost_price: 18_000_000,
      },
      // 2. Granular Material
      {
        package_source_id: null,
        item_type: 'MATERIAL',
        quantity: 10,
        unit_price: 500_000,
        cost_price: 350_000,
      },
      // 3. Granular Labor / Jasa
      {
        package_source_id: null,
        item_type: 'LABOR',
        quantity: 1,
        unit_price: 4_000_000,
        cost_price: 2_500_000,
      },
      // 4. Granular Overhead
      {
        package_source_id: null,
        item_type: 'OVERHEAD',
        quantity: 2,
        unit_price: 500_000,
        cost_price: 300_000,
      },
    ];

    const result = calculateSegregatedProfit(items);

    // Package: Rev = 50,000,000, Cost = 36,000,000, Profit = 14,000,000 (28.0%)
    expect(result.pkgRev).toBe(50_000_000);
    expect(result.pkgCost).toBe(36_000_000);
    expect(result.pkgProfit).toBe(14_000_000);

    // Granular Material: Rev = 5,000,000, Cost = 3,500,000, Profit = 1,500,000 (30.0%)
    expect(result.matRev).toBe(5_000_000);
    expect(result.matCost).toBe(3_500_000);
    expect(result.matProfit).toBe(1_500_000);

    // Granular Other (Labor 4m/2.5m + Overhead 1m/0.6m = Rev 5,000,000, Cost 3,100,000, Profit 1,900,000)
    expect(result.otherRev).toBe(5_000_000);
    expect(result.otherCost).toBe(3_100_000);
    expect(result.otherProfit).toBe(1_900_000);

    // Combined Totals
    expect(result.totalRev).toBe(60_000_000);
    expect(result.totalCost).toBe(42_600_000);
    expect(result.totalProfit).toBe(17_400_000);
  });

  it('correctly calculates 3-pillar segregated profit with RabItem camelCase keys', () => {
    const rabItems = [
      // 1. Paket Barang Jadi (packageId set)
      {
        packageId: 'pkg-wingbox',
        type: 'material',
        qty: 1,
        unitPrice: 80_000_000,
        costPrice: 60_000_000,
      },
      // 2. Granular Material (type: material, no package)
      {
        type: 'material',
        qty: 4,
        unitPrice: 1_250_000,
        costPrice: 1_000_000,
      },
      // 3. Granular Tukang (type: labor, no package)
      {
        type: 'labor',
        qty: 1,
        unitPrice: 10_000_000,
        costPrice: 7_000_000,
      },
    ];

    const result = calculateSegregatedProfit(rabItems);

    expect(result.pkgRev).toBe(80_000_000);
    expect(result.pkgCost).toBe(60_000_000);
    expect(result.pkgProfit).toBe(20_000_000);

    expect(result.matRev).toBe(5_000_000);
    expect(result.matCost).toBe(4_000_000);
    expect(result.matProfit).toBe(1_000_000);

    expect(result.otherRev).toBe(10_000_000);
    expect(result.otherCost).toBe(7_000_000);
    expect(result.otherProfit).toBe(3_000_000);

    expect(result.totalRev).toBe(95_000_000);
    expect(result.totalCost).toBe(71_000_000);
    expect(result.totalProfit).toBe(24_000_000);
  });

  it('correctly resolves package selling price when packages list is provided', () => {
    const packages = [
      { id: 'pkg-1', name: 'Paket Box', selling_price: 3_000_000 },
      { id: 'pkg-2', name: 'Paket Hidrolis', selling_price: 500_000 },
    ];
    const items = [
      // 2 components of pkg-1 (BOM cost only)
      { package_id: 'pkg-1', item_type: 'MATERIAL', quantity: 1, unit_price: 55_000, cost_price: 40_000 },
      { package_id: 'pkg-1', item_type: 'LABOR', quantity: 1, unit_price: 900_000, cost_price: 720_000 },
      // 1 component of pkg-2
      { package_id: 'pkg-2', item_type: 'MATERIAL', quantity: 1, unit_price: 30_000, cost_price: 24_000 },
      // Granular items
      { package_id: null, item_type: 'MATERIAL', quantity: 1, unit_price: 100_000, cost_price: 100_000 },
      { package_id: null, item_type: 'LABOR', quantity: 1, unit_price: 100_000, cost_price: 80_000 },
      { package_id: null, item_type: 'OVERHEAD', quantity: 1, unit_price: 1_600_000, cost_price: 1_280_000 },
    ];

    const result = calculateSegregatedProfit(items, packages);

    // Package Revenue = 3,000,000 + 500,000 = 3,500,000
    // Package Cost = 40,000 + 720,000 + 24,000 = 784,000
    // Package Profit = 3,500,000 - 784,000 = 2,716,000
    expect(result.pkgRev).toBe(3_500_000);
    expect(result.pkgCost).toBe(784_000);
    expect(result.pkgProfit).toBe(2_716_000);

    // Granular Material: Rev = 100,000, Cost = 100,000, Profit = 0
    expect(result.matRev).toBe(100_000);
    expect(result.matCost).toBe(100_000);
    expect(result.matProfit).toBe(0);

    // Granular Other: Rev = 1,700,000, Cost = 1,360,000, Profit = 340,000
    expect(result.otherRev).toBe(1_700_000);
    expect(result.otherCost).toBe(1_360_000);
    expect(result.otherProfit).toBe(340_000);

    // Total Profit = 2,716,000 + 0 + 340,000 = 3,056,000
    expect(result.totalProfit).toBe(result.pkgProfit + result.matProfit + result.otherProfit);
  });
});

describe('Sprint 84: computeChangeOrderMargins Helper', () => {
  it('is exported and consistent across financialCalculations, AmendmentManager, ChangeOrdersTab, and ItemizedChangeOrderForm', () => {
    expect(typeof computeChangeOrderMargins).toBe('function');
    expect(computeChangeOrderMargins).toBe(amendmentComputeMargins);
    expect(computeChangeOrderMargins).toBe(itemizedCoComputeMargins);
    expect(computeChangeOrderMargins).toBe(changeOrdersTabComputeMargins);
  });

  it('safely handles empty array, null, or undefined inputs', () => {
    const emptyResult = computeChangeOrderMargins([]);
    expect(emptyResult).toEqual({
      packageMargin: 0,
      materialMargin: 0,
      laborMargin: 0,
      overheadMargin: 0,
      totalProfit: 0,
      packageRev: 0,
      materialRev: 0,
      laborRev: 0,
      overheadRev: 0,
    });

    const nullResult = computeChangeOrderMargins(null);
    expect(nullResult).toEqual(emptyResult);

    const undefResult = computeChangeOrderMargins(undefined);
    expect(undefResult).toEqual(emptyResult);
  });

  it('correctly calculates itemized margins for package, granular material, labor, and overhead items', () => {
    const items = [
      // 1. Package component (Assembly package)
      {
        package_source_id: 'pkg-1',
        package_name: 'Dudukan Slebor',
        item_type: 'MATERIAL',
        quantity: 2,
        unit_price: 3_000_000,
        cost_price: 2_000_000,
      },
      // 2. Package component with notes prefix
      {
        notes: 'Bagian dari paket: Tangki Solar 200L',
        item_type: 'LABOR',
        quantity: 1,
        unit_price: 1_000_000,
        cost_price: 600_000,
      },
      // 3. Granular Material
      {
        item_type: 'MATERIAL',
        quantity: 5,
        unit_price: 200_000,
        cost_price: 150_000,
      },
      // 4. Granular Labor (Tukang / Jasa)
      {
        item_type: 'LABOR',
        quantity: 2,
        unit_price: 500_000,
        cost_price: 350_000,
      },
      // 5. Granular Overhead (FOH)
      {
        item_type: 'OVERHEAD',
        quantity: 3,
        unit_price: 100_000,
        cost_price: 70_000,
      },
    ];

    const result = computeChangeOrderMargins(items);

    // Package: item 1 (selling: 6M, cost: 4M, margin: 2M) + item 2 (selling: 1M, cost: 0.6M, margin: 0.4M)
    expect(result.packageRev).toBe(7_000_000);
    expect(result.packageMargin).toBe(2_400_000);

    // Material: item 3 (selling: 5 * 200k = 1M, cost: 5 * 150k = 750k, margin: 250k)
    expect(result.materialRev).toBe(1_000_000);
    expect(result.materialMargin).toBe(250_000);

    // Labor: item 4 (selling: 2 * 500k = 1M, cost: 2 * 350k = 700k, margin: 300k)
    expect(result.laborRev).toBe(1_000_000);
    expect(result.laborMargin).toBe(300_000);

    // Overhead: item 5 (selling: 3 * 100k = 300k, cost: 3 * 70k = 210k, margin: 90k)
    expect(result.overheadRev).toBe(300_000);
    expect(result.overheadMargin).toBe(90_000);

    // Total Profit: 2.4M + 250k + 300k + 90k = 3,040,000
    expect(result.totalProfit).toBe(3_040_000);
    expect(result.totalProfit).toBe(
      result.packageMargin + result.materialMargin + result.laborMargin + result.overheadMargin
    );
  });

  it('correctly handles default quantities and price fallbacks', () => {
    const items = [
      {
        item_type: 'MATERIAL',
        unit_price: 100_000,
        cost_price: 80_000,
        // no quantity provided -> defaults to 1
      },
      {
        item_type: 'LABOR',
        qty: 3,
        unitPrice: 200_000,
        costPrice: 150_000,
        // camelCase qty / unitPrice / costPrice
      },
    ];

    const result = computeChangeOrderMargins(items);
    expect(result.materialMargin).toBe(20_000);
    expect(result.materialRev).toBe(100_000);
    expect(result.laborMargin).toBe(150_000);
    expect(result.laborRev).toBe(600_000);
    expect(result.totalProfit).toBe(170_000);
  });
});

