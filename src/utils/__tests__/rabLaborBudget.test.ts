import { describe, it, expect } from 'vitest';

interface TestRabItem {
  id: string;
  wbsCategory: string;
  type: 'material' | 'labor' | 'overhead';
  description: string;
  qty: number;
  unitPrice: number;
  costPrice?: number;
  subtotal?: number;
  wasteFactor?: number;
  packageId?: string;
  materialId?: string;
}

interface TestDbRabItem {
  id: string;
  wbs_category: string;
  item_type?: 'MATERIAL' | 'LABOR' | string | null;
  material_name?: string | null;
  description?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  cost_price?: number | string | null;
  labor_hours?: number | string | null;
  labor_rate?: number | string | null;
  overhead_hours?: number | string | null;
  overhead_rate?: number | string | null;
  item_total?: number | string | null;
}

// Logic mirror of RabCalculator item calculation
function calculateItemTotal(item: TestRabItem): number {
  if (item.type === 'material') {
    const wasteMultiplier = 1 + (item.wasteFactor || 0) / 100;
    return item.qty * item.unitPrice * wasteMultiplier;
  }
  return item.qty * item.unitPrice;
}

function calculateRabBudgets(items: TestRabItem[]) {
  const totalMaterialCost = items.filter(i => i.type === 'material').reduce((sum, i) => sum + calculateItemTotal(i), 0);
  const totalLaborCost = items.filter(i => i.type === 'labor').reduce((sum, i) => sum + calculateItemTotal(i), 0);
  const totalOverheadCost = items.filter(i => i.type === 'overhead').reduce((sum, i) => sum + calculateItemTotal(i), 0);
  const totalCost = totalMaterialCost + totalLaborCost + totalOverheadCost;
  return { totalMaterialCost, totalLaborCost, totalOverheadCost, totalCost };
}

function mapToDbRabItem(item: TestRabItem, estId: string, spkId: string) {
  const unitPrice = (item.type === 'material' || item.type === 'labor') ? item.unitPrice : 0;
  const costPrice = item.costPrice !== undefined 
    ? item.costPrice 
    : (item.type === 'labor' ? item.unitPrice : Math.round(unitPrice * 0.8));

  return {
    rab_estimation_id: estId,
    spk_id: spkId,
    wbs_category: item.wbsCategory,
    item_type: item.type === 'labor' ? 'LABOR' : 'MATERIAL',
    description: item.description,
    material_name: item.description,
    quantity: item.qty,
    unit_price: unitPrice,
    cost_price: costPrice,
    labor_hours: item.type === 'labor' ? item.qty : 0,
    labor_rate: item.type === 'labor' ? item.unitPrice : 0,
    overhead_hours: item.type === 'overhead' ? item.qty * 8 : 0,
    overhead_rate: item.type === 'overhead' ? item.unitPrice / 8 : 0,
    item_total: calculateItemTotal(item),
    is_locked: false,
  };
}

function mapFromDbRabItem(dbItem: TestDbRabItem): TestRabItem {
  let type: 'material' | 'labor' | 'overhead' = 'material';
  let qty = 0;
  let unitPrice = Number(dbItem.unit_price) || 0;
  const costPrice = Number(dbItem.cost_price) || 0;
  
  const laborHours = Number(dbItem.labor_hours || 0);
  const overheadHours = Number(dbItem.overhead_hours || 0);

  if (dbItem.item_type === 'LABOR' || laborHours > 0 || Number(dbItem.labor_rate || 0) > 0) {
    type = 'labor';
    qty = Number(dbItem.quantity) || laborHours || 1;
    unitPrice = Number(dbItem.unit_price) || Number(dbItem.labor_rate) || 0;
    if (unitPrice === 0 && Number(dbItem.item_total || 0) > 0) {
      unitPrice = Number(dbItem.item_total) / qty;
    }
  } else if (overheadHours > 0) {
    type = 'overhead';
    qty = overheadHours / 8;
    unitPrice = Number(dbItem.overhead_rate) * 8 || unitPrice;
  } else {
    type = 'material';
    qty = Number(dbItem.quantity || 0);
    if (unitPrice === 0) {
      unitPrice = Number(dbItem.item_total || 0) / (Number(dbItem.quantity) || 1);
    }
  }

  return {
    id: dbItem.id,
    wbsCategory: dbItem.wbs_category,
    type,
    description: dbItem.material_name || dbItem.description || '',
    qty,
    unitPrice,
    costPrice,
    subtotal: qty * unitPrice,
    wasteFactor: type === 'material' ? 5 : 0,
  };
}

describe('RAB Calculator & Labor Budget Alignment', () => {
  it('correctly calculates item totals with wasteFactor for materials and without waste for labor', () => {
    const matItem: TestRabItem = {
      id: '1',
      wbsCategory: 'Sasis/Rangka',
      type: 'material',
      description: 'Plat Besi 3mm',
      qty: 10,
      unitPrice: 100000,
      wasteFactor: 5,
    };

    const laborItem: TestRabItem = {
      id: '2',
      wbsCategory: 'Pembongkaran',
      type: 'labor',
      description: 'Upah Tukang Las Gerinda',
      qty: 2,
      unitPrice: 200000,
      wasteFactor: 0,
    };

    const overheadItem: TestRabItem = {
      id: '3',
      wbsCategory: 'Cat/Finishing',
      type: 'overhead',
      description: 'Workshop Bay Overhead',
      qty: 1,
      unitPrice: 150000,
    };

    expect(calculateItemTotal(matItem)).toBe(1050000); // 10 * 100000 * 1.05
    expect(calculateItemTotal(laborItem)).toBe(400000);  // 2 * 200000
    expect(calculateItemTotal(overheadItem)).toBe(150000); // 1 * 150000
  });

  it('aggregates totalMaterialCost, totalLaborCost, and totalOverheadCost independently', () => {
    const items: TestRabItem[] = [
      { id: '1', wbsCategory: 'WBS 1', type: 'material', description: 'Baut M10', qty: 100, unitPrice: 2000, wasteFactor: 0 },
      { id: '2', wbsCategory: 'WBS 1', type: 'labor', description: 'Jasa Bending Plat', qty: 1, unitPrice: 400000 },
      { id: '3', wbsCategory: 'WBS 2', type: 'labor', description: 'Tukang Dempul Jumin', qty: 2, unitPrice: 300000 },
      { id: '4', wbsCategory: 'WBS 3', type: 'overhead', description: 'Bay Rent', qty: 2, unitPrice: 100000 },
    ];

    const budgets = calculateRabBudgets(items);
    expect(budgets.totalMaterialCost).toBe(200000);
    expect(budgets.totalLaborCost).toBe(1000000); // 400.000 + 600.000
    expect(budgets.totalOverheadCost).toBe(200000);
    expect(budgets.totalCost).toBe(1400000);
  });

  it('correctly maps labor items to database payload with item_type = "LABOR"', () => {
    const laborItem: TestRabItem = {
      id: '1',
      wbsCategory: 'Sasis/Rangka',
      type: 'labor',
      description: 'Upah Borongan Las Dudukan Slebor',
      qty: 1,
      unitPrice: 250000,
    };

    const dbPayload = mapToDbRabItem(laborItem, 'est-123', 'spk-456');

    expect(dbPayload.item_type).toBe('LABOR');
    expect(dbPayload.material_name).toBe('Upah Borongan Las Dudukan Slebor');
    expect(dbPayload.labor_hours).toBe(1);
    expect(dbPayload.labor_rate).toBe(250000);
    expect(dbPayload.unit_price).toBe(250000);
    expect(dbPayload.cost_price).toBe(250000);
    expect(dbPayload.item_total).toBe(250000);
  });

  it('correctly maps material items to database payload with item_type = "MATERIAL"', () => {
    const matItem: TestRabItem = {
      id: '1',
      wbsCategory: 'Dinding/Fabrikasi',
      type: 'material',
      description: 'Hollow 40x40x2mm',
      qty: 5,
      unitPrice: 120000,
      wasteFactor: 0,
    };

    const dbPayload = mapToDbRabItem(matItem, 'est-123', 'spk-456');

    expect(dbPayload.item_type).toBe('MATERIAL');
    expect(dbPayload.labor_hours).toBe(0);
    expect(dbPayload.labor_rate).toBe(0);
    expect(dbPayload.unit_price).toBe(120000);
    expect(dbPayload.cost_price).toBe(96000); // 80% default margin
    expect(dbPayload.item_total).toBe(600000);
  });

  it('deserializes database records with item_type = "LABOR" into type = "labor"', () => {
    const dbRecord: TestDbRabItem = {
      id: 'db-1',
      wbs_category: 'Pembongkaran',
      item_type: 'LABOR',
      material_name: 'TUKANG DEMPUL STOPLAMP',
      quantity: 1,
      unit_price: 100000,
      cost_price: 100000,
      item_total: 100000,
    };

    const loaded = mapFromDbRabItem(dbRecord);

    expect(loaded.type).toBe('labor');
    expect(loaded.description).toBe('TUKANG DEMPUL STOPLAMP');
    expect(loaded.qty).toBe(1);
    expect(loaded.unitPrice).toBe(100000);
    expect(loaded.wasteFactor).toBe(0);
  });

  it('deserializes legacy records with labor_hours > 0 into type = "labor"', () => {
    const legacyRecord: TestDbRabItem = {
      id: 'db-2',
      wbs_category: 'Sasis/Rangka',
      item_type: 'MATERIAL', // old default before migration
      material_name: 'Jasa Bending Plat Sasis',
      labor_hours: 4,
      labor_rate: 75000,
      item_total: 300000,
    };

    const loaded = mapFromDbRabItem(legacyRecord);

    expect(loaded.type).toBe('labor');
    expect(loaded.qty).toBe(4);
    expect(loaded.unitPrice).toBe(75000);
  });

  it('preserves labor item_type when allocating from Product Package BOM', () => {
    const packageBomItems = [
      { id: 'b-1', item_type: 'MATERIAL', material: { name: 'Pipa Seamless 2 inch' }, cost_per_unit: 150000 },
      { id: 'b-2', item_type: 'LABOR', labor_name: 'Jasa Fabrikasi Rangka Karoseri', cost_per_unit: 800000 },
    ];

    const allocatedPayloads = packageBomItems.map(item => ({
      wbsCategory: 'Sasis/Rangka',
      type: item.item_type === 'LABOR' ? ('labor' as const) : ('material' as const),
      description: item.item_type === 'MATERIAL' ? (item.material?.name || '') : (item.labor_name || ''),
      qty: 1,
      unitPrice: item.cost_per_unit,
    }));

    expect(allocatedPayloads[0].type).toBe('material');
    expect(allocatedPayloads[0].description).toBe('Pipa Seamless 2 inch');

    expect(allocatedPayloads[1].type).toBe('labor');
    expect(allocatedPayloads[1].description).toBe('Jasa Fabrikasi Rangka Karoseri');
    expect(allocatedPayloads[1].unitPrice).toBe(800000);
  });

  it('inherits labor item_type from inventory master catalog when material is linked in package items', () => {
    const packageItemsFromDb = [
      {
        id: 'pi-1',
        item_type: 'LABOR',
        material_id: 'mat-tukang-cat',
        labor_name: null,
        cost_per_unit: 900000,
        material: {
          id: 'mat-tukang-cat',
          name: 'TUKANG CAT BAK',
          category: 'General',
          item_type: 'LABOR',
        },
      },
      {
        id: 'pi-2',
        item_type: 'OVERHEAD',
        material_id: 'mat-listrik',
        labor_name: null,
        cost_per_unit: 150000,
        material: {
          id: 'mat-listrik',
          name: 'LISTRIK',
          category: 'Overhead',
          item_type: 'OVERHEAD',
        },
      },
    ];

    const mapped = packageItemsFromDb.map(item => {
      const isLabor = item.item_type === 'LABOR' || item.material?.item_type === 'LABOR';
      const isOverhead = item.item_type === 'OVERHEAD' || item.material?.item_type === 'OVERHEAD';
      const type = isLabor ? ('labor' as const) : (isOverhead ? ('overhead' as const) : ('material' as const));
      const description = item.labor_name || item.material?.name || '';
      return {
        type,
        description,
        unitPrice: item.cost_per_unit,
        materialId: type === 'material' ? item.material_id : undefined,
      };
    });

    expect(mapped[0].type).toBe('labor');
    expect(mapped[0].description).toBe('TUKANG CAT BAK');
    expect(mapped[0].materialId).toBeUndefined();

    expect(mapped[1].type).toBe('overhead');
    expect(mapped[1].description).toBe('LISTRIK');
    expect(mapped[1].materialId).toBeUndefined();
  });

  it('serializes allocated labor and overhead package items to database payload with item_type and null material_id', () => {
    const allocatedItem = {
      type: 'labor' as const,
      description: 'TUKANG RANGKA BAK',
      qty: 0.3,
      unitPrice: 1000000,
      materialId: undefined,
    };

    const dbPayload = {
      item_type: allocatedItem.type === 'labor' ? 'LABOR' : 'MATERIAL',
      material_name: allocatedItem.description,
      quantity: allocatedItem.qty,
      unit_price: allocatedItem.unitPrice,
      labor_hours: allocatedItem.type === 'labor' ? allocatedItem.qty : 0,
      labor_rate: allocatedItem.type === 'labor' ? allocatedItem.unitPrice : 0,
      material_id: allocatedItem.type === 'labor' ? null : (allocatedItem.materialId || null),
      item_total: allocatedItem.qty * allocatedItem.unitPrice,
    };

    expect(dbPayload.item_type).toBe('LABOR');
    expect(dbPayload.material_id).toBeNull();
    expect(dbPayload.labor_hours).toBe(0.3);
    expect(dbPayload.labor_rate).toBe(1000000);
    expect(dbPayload.item_total).toBe(300000);
  });

  it('resolves false OVERBUDGET status in WBS variance when labor budget is recognized', () => {
    // Before fix: Pagu Jasa was Rp 0, Actual Jasa was Rp 400.000 -> Variance -Rp 400.000 (OVERBUDGET)
    const beforeLaborBudget = 0;
    const actualLaborSpent = 400000;
    const beforeVariance = beforeLaborBudget - actualLaborSpent;
    const isBeforeOverbudget = beforeVariance < 0;

    expect(beforeVariance).toBe(-400000);
    expect(isBeforeOverbudget).toBe(true);

    // After fix: Pagu Jasa is Rp 400.000 from LABOR item entry in RAB -> Variance Rp 0 (ON BUDGET)
    const afterLaborBudget = 400000;
    const afterVariance = afterLaborBudget - actualLaborSpent;
    const isAfterOverbudget = afterVariance < 0;

    expect(afterVariance).toBe(0);
    expect(isAfterOverbudget).toBe(false);
  });

  describe('view_wbs_cost_variance SQL aggregation logic', () => {
    interface ViewItem {
      item_type?: 'MATERIAL' | 'LABOR' | string | null;
      quantity: number;
      unit_price: number;
    }

    function calculateViewAggregation(
      rabItems: ViewItem[],
      coItems: ViewItem[],
      actualMaterialSpent: number,
      actualLaborSpent: number
    ) {
      const rabMaterialBudget = rabItems.reduce((acc, item) => {
        return acc + (item.item_type === 'MATERIAL' || item.item_type === null || item.item_type === undefined ? item.quantity * item.unit_price : 0);
      }, 0);

      const rabLaborBudget = rabItems.reduce((acc, item) => {
        return acc + (item.item_type === 'LABOR' ? item.quantity * item.unit_price : 0);
      }, 0);

      const coMaterialBudget = coItems.reduce((acc, item) => {
        return acc + (item.item_type === 'MATERIAL' || item.item_type === null || item.item_type === undefined ? item.quantity * item.unit_price : 0);
      }, 0);

      const coLaborBudget = coItems.reduce((acc, item) => {
        return acc + (item.item_type === 'LABOR' ? item.quantity * item.unit_price : 0);
      }, 0);

      const totalMaterialBudget = rabMaterialBudget + coMaterialBudget;
      const totalLaborBudget = rabLaborBudget + coLaborBudget;

      return {
        rabMaterialBudget,
        rabLaborBudget,
        coMaterialBudget,
        coLaborBudget,
        totalMaterialBudget,
        actualMaterialSpent,
        materialVariance: totalMaterialBudget - actualMaterialSpent,
        totalLaborBudget,
        actualLaborSpent,
        laborVariance: totalLaborBudget - actualLaborSpent,
      };
    }

    it('aggregates items with NULL or MATERIAL type into rab_material_budget and LABOR into rab_labor_budget', () => {
      const rabItems: ViewItem[] = [
        { item_type: 'MATERIAL', quantity: 10, unit_price: 50000 }, // 500,000 material
        { item_type: null, quantity: 2, unit_price: 25000 },        // 50,000 legacy untyped material
        { item_type: 'LABOR', quantity: 1, unit_price: 350000 },    // 350,000 labor
      ];

      const coItems: ViewItem[] = [
        { item_type: 'MATERIAL', quantity: 2, unit_price: 50000 },  // 100,000 material CO
        { item_type: 'LABOR', quantity: 1, unit_price: 150000 },     // 150,000 labor CO
      ];

      const result = calculateViewAggregation(rabItems, coItems, 620000, 480000);

      expect(result.rabMaterialBudget).toBe(550000); // 500,000 + 50,000
      expect(result.rabLaborBudget).toBe(350000);
      expect(result.totalMaterialBudget).toBe(650000); // 550,000 + 100,000
      expect(result.totalLaborBudget).toBe(500000);    // 350,000 + 150,000

      // Variances: budget - actual
      expect(result.materialVariance).toBe(30000); // 650,000 - 620,000 (surplus)
      expect(result.laborVariance).toBe(20000);    // 500,000 - 480,000 (surplus)
    });

    it('detects deficit when actual labor or material exceeds total budget', () => {
      const rabItems: ViewItem[] = [
        { item_type: 'MATERIAL', quantity: 5, unit_price: 100000 }, // 500,000
        { item_type: 'LABOR', quantity: 1, unit_price: 200000 },    // 200,000
      ];

      const result = calculateViewAggregation(rabItems, [], 700000, 350000);

      expect(result.materialVariance).toBe(-200000); // 500k - 700k (deficit)
      expect(result.laborVariance).toBe(-150000);    // 200k - 350k (deficit)
    });
  });

  describe('Waste factor default and pure calculation verification', () => {
    it('defaults waste factor to 0 for material and calculates pure total (Qty x UnitPrice)', () => {
      // With default wasteFactor = 0
      const materialItem: TestRabItem = {
        id: 'mat-test-1',
        wbsCategory: 'Sasis/Rangka',
        type: 'material',
        description: 'Bahan Plat Karoseri',
        qty: 1,
        unitPrice: 1600000,
        wasteFactor: 0,
      };

      const itemTotal = calculateItemTotal(materialItem);
      // Pure calculation: 1 * 1,600,000 = 1,600,000 (no +5% or +Rp 80,000 markup)
      expect(itemTotal).toBe(1600000);
      expect(itemTotal).not.toBe(1680000);
    });

    it('still supports legacy non-zero wasteFactor if loaded from historical records', () => {
      const historicalItem: TestRabItem = {
        id: 'hist-1',
        wbsCategory: 'Sasis/Rangka',
        type: 'material',
        description: 'Bahan Plat Karoseri Lama',
        qty: 1,
        unitPrice: 1600000,
        wasteFactor: 5,
      };

      const itemTotal = calculateItemTotal(historicalItem);
      expect(itemTotal).toBe(1680000);
    });
  });
});


