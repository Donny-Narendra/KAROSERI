import { describe, it, expect } from 'vitest';
import { computeSegregatedProjectProfit } from '../profitCalculator';

describe('profitCalculator: computeSegregatedProjectProfit', () => {
  it('returns zeroed metrics for empty or null inputs', () => {
    const emptyRes = computeSegregatedProjectProfit([]);
    expect(emptyRes.packages).toEqual([]);
    expect(emptyRes.totalPackageRevenue).toBe(0);
    expect(emptyRes.totalPackageCost).toBe(0);
    expect(emptyRes.totalPackageProfit).toBe(0);
    expect(emptyRes.granularMaterial.profit).toBe(0);
    expect(emptyRes.granularLabor.profit).toBe(0);
    expect(emptyRes.granularOverhead.profit).toBe(0);
    expect(emptyRes.grandTotalProfit).toBe(0);

    const nullRes = computeSegregatedProjectProfit(null as any);
    expect(nullRes.grandTotalRevenue).toBe(0);
  });

  it('correctly aggregates an assembly package with material, labor, and overhead components', () => {
    const items = [
      {
        package_id: 'pkg-dump',
        package_name: 'Paket Dump 6 Roda',
        item_type: 'MATERIAL',
        quantity: 10,
        unit_price: 1000000,
        cost_price: 800000, // 10 * 800k = 8.000.000
      },
      {
        package_id: 'pkg-dump',
        package_name: 'Paket Dump 6 Roda',
        item_type: 'LABOR',
        quantity: 2,
        unit_price: 2500000,
        cost_price: 2000000, // 2 * 2jt = 4.000.000
      },
      {
        package_id: 'pkg-dump',
        package_name: 'Paket Dump 6 Roda',
        item_type: 'OVERHEAD',
        quantity: 1,
        unit_price: 1500000,
        cost_price: 1000000, // 1 * 1jt = 1.000.000
      },
    ];

    // Master selling price: 20.000.000
    const masters = new Map([
      ['pkg-dump', { selling_price: 20000000, name: 'Paket Dump 6 Roda' }]
    ]);

    const result = computeSegregatedProjectProfit(items, masters);

    expect(result.packages).toHaveLength(1);
    const pkg = result.packages[0];
    expect(pkg.packageName).toBe('Paket Dump 6 Roda');
    expect(pkg.sellingPrice).toBe(20000000);
    expect(pkg.materialCost).toBe(8000000);
    expect(pkg.laborCost).toBe(4000000);
    expect(pkg.overheadCost).toBe(1000000);
    expect(pkg.totalCost).toBe(13000000);
    expect(pkg.netProfit).toBe(7000000);
    expect(pkg.marginPercentage).toBe(35);

    // Verify package totals
    expect(result.totalPackageRevenue).toBe(20000000);
    expect(result.totalPackageCost).toBe(13000000);
    expect(result.totalPackageProfit).toBe(7000000);

    // Crucial: Granular labor MUST NOT absorb internal package labor!
    expect(result.granularLabor.revenue).toBe(0);
    expect(result.granularLabor.cost).toBe(0);
    expect(result.granularLabor.profit).toBe(0);

    // Grand total
    expect(result.grandTotalRevenue).toBe(20000000);
    expect(result.grandTotalCost).toBe(13000000);
    expect(result.grandTotalProfit).toBe(7000000);
    expect(result.grandTotalMarginPercentage).toBe(35);
  });

  it('correctly handles multiple packages and distinguishes each assembly list margin', () => {
    const items = [
      // Package 1: Bak Dump
      {
        package_id: 'pkg-1',
        package_name: 'Paket Bak Dump',
        item_type: 'MATERIAL',
        quantity: 1,
        unit_price: 10000000,
        cost_price: 6000000,
      },
      {
        package_id: 'pkg-1',
        package_name: 'Paket Bak Dump',
        item_type: 'LABOR',
        quantity: 1,
        unit_price: 5000000,
        cost_price: 2000000,
      },
      // Package 2: Kanopi & Pengaman
      {
        package_id: 'pkg-2',
        package_name: 'Paket Kanopi',
        item_type: 'MATERIAL',
        quantity: 1,
        unit_price: 3000000,
        cost_price: 1500000,
      },
      {
        package_id: 'pkg-2',
        package_name: 'Paket Kanopi',
        item_type: 'LABOR',
        quantity: 1,
        unit_price: 2000000,
        cost_price: 1000000,
      },
    ];

    const packageArray = [
      { id: 'pkg-1', name: 'Paket Bak Dump', selling_price: 15000000 },
      { id: 'pkg-2', name: 'Paket Kanopi', selling_price: 5000000 },
    ];

    const result = computeSegregatedProjectProfit(items, packageArray);

    expect(result.packages).toHaveLength(2);

    const pkg1 = result.packages.find(p => p.packageId === 'pkg-1')!;
    expect(pkg1.sellingPrice).toBe(15000000);
    expect(pkg1.totalCost).toBe(8000000); // 6m + 2m
    expect(pkg1.netProfit).toBe(7000000);
    expect(pkg1.marginPercentage).toBe(46.67);

    const pkg2 = result.packages.find(p => p.packageId === 'pkg-2')!;
    expect(pkg2.sellingPrice).toBe(5000000);
    expect(pkg2.totalCost).toBe(2500000); // 1.5m + 1.0m
    expect(pkg2.netProfit).toBe(2500000);
    expect(pkg2.marginPercentage).toBe(50);

    expect(result.totalPackageRevenue).toBe(20000000);
    expect(result.totalPackageCost).toBe(10500000);
    expect(result.totalPackageProfit).toBe(9500000);
  });

  it('correctly calculates granular loose items for material, labor, and overhead', () => {
    const items = [
      {
        item_type: 'MATERIAL',
        quantity: 4,
        unit_price: 250000,
        cost_price: 150000, // Rev: 1.000.000, Cost: 600.000
      },
      {
        item_type: 'LABOR',
        quantity: 1,
        unit_price: 800000,
        cost_price: 500000, // Rev: 800.000, Cost: 500.000
      },
      {
        item_type: 'OVERHEAD',
        quantity: 2,
        unit_price: 300000,
        cost_price: 200000, // Rev: 600.000, Cost: 400.000
      },
    ];

    const result = computeSegregatedProjectProfit(items);

    expect(result.packages).toHaveLength(0);
    expect(result.totalPackageRevenue).toBe(0);

    // Granular Material
    expect(result.granularMaterial.revenue).toBe(1000000);
    expect(result.granularMaterial.cost).toBe(600000);
    expect(result.granularMaterial.profit).toBe(400000);
    expect(result.granularMaterial.marginPct).toBe(40);

    // Granular Labor
    expect(result.granularLabor.revenue).toBe(800000);
    expect(result.granularLabor.cost).toBe(500000);
    expect(result.granularLabor.profit).toBe(300000);
    expect(result.granularLabor.marginPct).toBe(37.5);

    // Granular Overhead
    expect(result.granularOverhead.revenue).toBe(600000);
    expect(result.granularOverhead.cost).toBe(400000);
    expect(result.granularOverhead.profit).toBe(200000);
    expect(result.granularOverhead.marginPct).toBe(33.33);

    // Total Granular
    expect(result.totalGranularRevenue).toBe(2400000);
    expect(result.totalGranularCost).toBe(1500000);
    expect(result.totalGranularProfit).toBe(900000);

    // Grand Total
    expect(result.grandTotalRevenue).toBe(2400000);
    expect(result.grandTotalCost).toBe(1500000);
    expect(result.grandTotalProfit).toBe(900000);
    expect(result.grandTotalMarginPercentage).toBe(37.5);
  });

  it('correctly calculates mixed project scenario reconciling Grand Total SPK', () => {
    const items = [
      // 1. Package item (material)
      {
        package_id: 'pkg-main',
        package_name: 'Paket Standar',
        item_type: 'MATERIAL',
        quantity: 1,
        unit_price: 5000000,
        cost_price: 3000000,
      },
      // 2. Package item (labor)
      {
        package_id: 'pkg-main',
        package_name: 'Paket Standar',
        item_type: 'LABOR',
        quantity: 1,
        unit_price: 2000000,
        cost_price: 1000000,
      },
      // 3. Loose granular material
      {
        item_type: 'MATERIAL',
        quantity: 2,
        unit_price: 500000,
        cost_price: 300000,
      },
      // 4. Loose granular labor
      {
        item_type: 'LABOR',
        quantity: 1,
        unit_price: 1500000,
        cost_price: 1000000,
      },
    ];

    const packageRecord = {
      'pkg-main': { selling_price: 7000000, name: 'Paket Standar' },
    };

    const res = computeSegregatedProjectProfit(items, packageRecord);

    // Package: Rev 7m, Cost 4m, Profit 3m
    expect(res.totalPackageRevenue).toBe(7000000);
    expect(res.totalPackageCost).toBe(4000000);
    expect(res.totalPackageProfit).toBe(3000000);

    // Granular Material: Rev 1m, Cost 600k, Profit 400k
    expect(res.granularMaterial.revenue).toBe(1000000);
    expect(res.granularMaterial.cost).toBe(600000);
    expect(res.granularMaterial.profit).toBe(400000);

    // Granular Labor: Rev 1.5m, Cost 1m, Profit 500k
    expect(res.granularLabor.revenue).toBe(1500000);
    expect(res.granularLabor.cost).toBe(1000000);
    expect(res.granularLabor.profit).toBe(500000);

    // Grand Totals: Rev 9.5m, Cost 5.6m, Profit 3.9m
    expect(res.grandTotalRevenue).toBe(9500000);
    expect(res.grandTotalCost).toBe(5600000);
    expect(res.grandTotalProfit).toBe(3900000);
    expect(res.grandTotalMarginPercentage).toBe(41.05);
  });
});
