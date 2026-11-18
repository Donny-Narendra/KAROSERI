import { describe, it, expect } from 'vitest';
import {
  normalizeWbsStage,
  matchWbsStage,
  evaluateGate2ItemQuota,
  evaluateGate2TicketQuota,
  GATE2_QTY_EPSILON,
  type RabItemGate2,
  type ChangeOrderItemGate2,
  type ApprovedRequisitionGate2,
  type DirectIssueGate2,
  type MasterMaterialGate2,
} from '../gate2BudgetValidation';

describe('gate2BudgetValidation Unit Tests (Quantity-Based Gate 2)', () => {
  describe('WBS Stage Normalization & Matching', () => {
    it('normalizes various WBS stage string formats consistently', () => {
      expect(normalizeWbsStage('WBS 1: Pembongkaran')).toBe('pembongkaran');
      expect(normalizeWbsStage('Pembongkaran')).toBe('pembongkaran');
      expect(normalizeWbsStage('wbs 1: pembongkaran')).toBe('pembongkaran');
      expect(normalizeWbsStage('WBS 2: Sasis/Rangka')).toBe('sasis rangka');
      expect(normalizeWbsStage('Sasis/Rangka')).toBe('sasis rangka');
      expect(normalizeWbsStage('')).toBe('');
      expect(normalizeWbsStage(null)).toBe('');
      expect(normalizeWbsStage(undefined)).toBe('');
    });

    it('matches stages regardless of WBS prefix or punctuation', () => {
      expect(matchWbsStage('WBS 1: Pembongkaran', 'Pembongkaran')).toBe(true);
      expect(matchWbsStage('Pembongkaran', 'WBS 1: Pembongkaran')).toBe(true);
      expect(matchWbsStage('WBS 2: Sasis/Rangka', 'Sasis/Rangka')).toBe(true);
      expect(matchWbsStage('WBS 1: Pembongkaran', 'WBS 2: Sasis/Rangka')).toBe(false);
      expect(matchWbsStage(null, 'Pembongkaran')).toBe(false);
    });
  });

  describe('evaluateGate2ItemQuota', () => {
    const spkId = 'spk-3538-uuid';
    const baseRabItems: RabItemGate2[] = [
      {
        id: 'rab-dempul',
        spk_id: spkId,
        wbs_stage: 'WBS 3: Dinding/Fabrikasi',
        wbs_category: 'Dinding/Fabrikasi',
        item_type: 'MATERIAL',
        material_id: 'mat-dempul',
        description: 'Dempul Sanpolac 4kg',
        quantity: 2,
        unit: 'kaleng',
        cost_price: 132222, // 2 * 132222 = 264444
        unit_price: 160000,
        item_total: 320000,
      },
      {
        id: 'rab-labor-1',
        spk_id: spkId,
        wbs_stage: 'WBS 3: Dinding/Fabrikasi',
        item_type: 'LABOR', // MUST be excluded
        description: 'Tukang Dempul',
        quantity: 10,
        cost_price: 50000,
      },
      {
        id: 'rab-oh-1',
        spk_id: spkId,
        wbs_stage: 'WBS 3: Dinding/Fabrikasi',
        item_type: 'OVERHEAD', // MUST be excluded
        description: 'Listrik Kompressor',
        quantity: 5,
        cost_price: 25000,
      },
      {
        id: 'rab-dempul-wbs4',
        spk_id: spkId,
        wbs_stage: 'WBS 4: Cat/Finishing',
        item_type: 'MATERIAL',
        material_id: 'mat-dempul',
        description: 'Dempul Sanpolac 4kg',
        quantity: 1,
        cost_price: 132222,
      },
    ];

    it('Sub-kondisi 1A: passes with green status when Qty matches quota and supplier HPP is unchanged or lower', () => {
      const masters: MasterMaterialGate2[] = [
        { id: 'mat-dempul', name: 'Dempul Sanpolac 4kg', unit: 'kaleng', cost_price: 132222 },
      ];

      const res = evaluateGate2ItemQuota({
        spkId,
        wbsStage: 'Dinding/Fabrikasi',
        materialId: 'mat-dempul',
        materialName: 'Dempul Sanpolac 4kg',
        unit: 'kaleng',
        currentRequestQty: 2,
        currentInventoryCostPrice: 132222,
        rabItems: baseRabItems,
        masterMaterials: masters,
      });

      expect(res.qtyPaguRab).toBe(2);
      expect(res.qtySudahKeluar).toBe(0);
      expect(res.proyeksiTotalQty).toBe(2);
      expect(res.isQtyOverQuota).toBe(false);
      expect(res.costVarianceRp).toBe(0);
      expect(res.statusVariant).toBe('success');
      expect(res.statusBadge.title).toContain('Kuota Kuantitas Sesuai RAB');
    });

    it('Sub-kondisi 1B: allows approval (non-blocking) with info banner when supplier HPP rises (e.g. Rp 264.444 -> Rp 330.555) and Qty is 100% within quota', () => {
      const masters: MasterMaterialGate2[] = [
        { id: 'mat-dempul', name: 'Dempul Sanpolac 4kg', unit: 'kaleng', cost_price: 165277.5 }, // 2 * 165277.5 = 330555
      ];

      const res = evaluateGate2ItemQuota({
        spkId,
        wbsStage: 'WBS 3: Dinding/Fabrikasi',
        materialId: 'mat-dempul',
        materialName: 'Dempul Sanpolac 4kg',
        unit: 'kaleng',
        currentRequestQty: 2,
        currentInventoryCostPrice: 165277.5,
        rabItems: baseRabItems,
        masterMaterials: masters,
      });

      expect(res.qtyPaguRab).toBe(2);
      expect(res.proyeksiTotalQty).toBe(2);
      expect(res.isQtyOverQuota).toBe(false);
      expect(res.isOverBudget).toBe(false); // Never blocks on price!
      expect(res.paguRupiahRab).toBe(264444);
      expect(res.aktualRupiah).toBe(330555);
      expect(res.costVarianceRp).toBe(66111);
      expect(res.statusVariant).toBe('info');
      expect(res.statusBadge.description).toContain('+Rp 66.111');
    });

    it('Kondisi 2: triggers hard-gate when projected Qty exceeds RAB quota beyond EPSILON', () => {
      const approvedReqs: ApprovedRequisitionGate2[] = [
        {
          id: 'req-prev',
          spk_id: spkId,
          wbs_category: 'Dinding/Fabrikasi',
          status: 'APPROVED',
          material_requisition_items: [
            {
              id: 'item-prev',
              material_id: 'mat-dempul',
              quantity: 1,
              wbs_stage: 'WBS 3: Dinding/Fabrikasi',
              status: 'APPROVED',
            },
          ],
        },
      ];

      const res = evaluateGate2ItemQuota({
        spkId,
        wbsStage: 'Dinding/Fabrikasi',
        materialId: 'mat-dempul',
        materialName: 'Dempul Sanpolac 4kg',
        unit: 'kaleng',
        currentRequestQty: 1.5, // 1 + 1.5 = 2.5 > 2
        rabItems: baseRabItems,
        approvedReqs,
      });

      expect(res.qtyPaguRab).toBe(2);
      expect(res.qtySudahKeluar).toBe(1);
      expect(res.proyeksiTotalQty).toBe(2.5);
      expect(res.overQty).toBe(0.5);
      expect(res.isQtyOverQuota).toBe(true);
      expect(res.statusVariant).toBe('danger');
      expect(res.statusBadge.title).toContain('PERINGATAN GATE 2 (OVER QUOTA KUANTITAS)');
    });

    it('applies EPSILON = 0.001 tolerance for WBS decimal rounding without false-positive lock', () => {
      const fractionalRab: RabItemGate2[] = [
        {
          id: 'rab-frac',
          spk_id: spkId,
          wbs_stage: 'WBS 2: Sasis/Rangka',
          item_type: 'MATERIAL',
          material_id: 'mat-plat',
          description: 'Plat Besi 3mm',
          quantity: 1 / 3 + 1 / 3 + 1 / 3, // ~1.0
          cost_price: 100000,
        },
      ];

      // Simulating 0.333 + 0.333 + 0.3345 slightly over by 0.0005 < EPSILON
      const resWithinEpsilon = evaluateGate2ItemQuota({
        spkId,
        wbsStage: 'WBS 2: Sasis/Rangka',
        materialId: 'mat-plat',
        unit: 'lbr',
        currentRequestQty: 1 + GATE2_QTY_EPSILON * 0.5,
        rabItems: fractionalRab,
      });
      expect(resWithinEpsilon.isQtyOverQuota).toBe(false);

      const resAboveEpsilon = evaluateGate2ItemQuota({
        spkId,
        wbsStage: 'WBS 2: Sasis/Rangka',
        materialId: 'mat-plat',
        unit: 'lbr',
        currentRequestQty: 1 + GATE2_QTY_EPSILON * 2,
        rabItems: fractionalRab,
      });
      expect(resAboveEpsilon.isQtyOverQuota).toBe(true);
    });

    it('aggregates BOM Package items, Granular items, Approved Change Orders, and Waste Percentage consistently', () => {
      const mixedRab: RabItemGate2[] = [
        // Exploded from Package A in WBS 2
        {
          id: 'rab-pkg-1',
          spk_id: spkId,
          wbs_stage: 'WBS 2: Sasis/Rangka',
          item_type: 'MATERIAL',
          material_id: 'mat-baut',
          package_id: 'pkg-bak',
          package_name: 'Paket Bak Besi',
          description: '[Paket: Paket Bak Besi] Baut M10',
          quantity: 10,
          cost_price: 5000,
        },
        // Granular item of same material in WBS 2
        {
          id: 'rab-gran-1',
          spk_id: spkId,
          wbs_stage: 'WBS 2: Sasis/Rangka',
          item_type: 'MATERIAL',
          material_id: 'mat-baut',
          description: 'Baut M10',
          quantity: 5,
          waste_percentage: 20, // 5 * 1.2 = 6 -> combined RAB = 16
          cost_price: 5000,
        },
      ];

      const coItems: ChangeOrderItemGate2[] = [
        {
          id: 'co-1',
          spk_id: spkId,
          wbs_stage: 'WBS 2: Sasis/Rangka',
          item_type: 'MATERIAL',
          material_id: 'mat-baut',
          item_name: 'Baut M10',
          quantity: 4, // total quota = 10 + 6 + 4 = 20
          cost_price: 5000,
        },
      ];

      const directIssues: DirectIssueGate2[] = [
        {
          id: 'dir-1',
          spk_id: spkId,
          wbs_stage: 'WBS 2: Sasis/Rangka',
          material_id: 'mat-baut',
          quantity_issued: 8,
          status: 'ACTIVE',
        },
        {
          id: 'dir-void',
          spk_id: spkId,
          wbs_stage: 'WBS 2: Sasis/Rangka',
          material_id: 'mat-baut',
          quantity_issued: 50,
          status: 'VOID', // MUST be ignored
        },
      ];

      const res = evaluateGate2ItemQuota({
        spkId,
        wbsStage: 'Sasis/Rangka',
        materialId: 'mat-baut',
        materialName: 'Baut M10',
        unit: 'pcs',
        currentRequestQty: 12, // 8 + 12 = 20 == 20
        rabItems: mixedRab,
        approvedCoItems: coItems,
        directIssues,
      });

      expect(res.qtyPaguRab).toBe(20);
      expect(res.qtySudahKeluar).toBe(8);
      expect(res.proyeksiTotalQty).toBe(20);
      expect(res.isQtyOverQuota).toBe(false);
    });

    it('blocks unbudgeted material requests (qtyPaguRab = 0)', () => {
      const res = evaluateGate2ItemQuota({
        spkId,
        wbsStage: 'Kelistrikan/Hidrolik',
        materialId: 'mat-unbudgeted',
        materialName: 'Relay 24V',
        unit: 'pcs',
        currentRequestQty: 2,
        rabItems: baseRabItems,
      });

      expect(res.qtyPaguRab).toBe(0);
      expect(res.hasRabQuota).toBe(false);
      expect(res.isQtyOverQuota).toBe(true);
      expect(res.overQty).toBe(2);
      expect(res.statusVariant).toBe('danger');
    });
  });

  describe('evaluateGate2TicketQuota', () => {
    it('combines duplicate pending material rows in the same ticket when evaluating batch quota', () => {
      const spkId = 'spk-ticket-1';
      const rab: RabItemGate2[] = [
        {
          id: 'rab-1',
          spk_id: spkId,
          wbs_stage: 'WBS 2: Sasis/Rangka',
          item_type: 'MATERIAL',
          material_id: 'mat-besi',
          description: 'Besi UNP 100',
          quantity: 10,
          cost_price: 200000,
        },
      ];

      const res = evaluateGate2TicketQuota({
        spkId,
        wbsStage: 'WBS 2: Sasis/Rangka',
        pendingItems: [
          { id: 'pi-1', material_id: 'mat-besi', material_name: 'Besi UNP 100', quantity: 6, unit: 'btg', wbs_stage: 'Sasis/Rangka' },
          { id: 'pi-2', material_id: 'mat-besi', material_name: 'Besi UNP 100', quantity: 6, unit: 'btg', wbs_stage: 'Sasis/Rangka' },
        ],
        rabItems: rab,
        approvedReqs: [],
      });

      // Individual rows are 6 <= 10, but combined ticket is 12 > 10!
      expect(res.itemEvaluations['pi-1'].isQtyOverQuota).toBe(false);
      expect(res.itemEvaluations['pi-2'].isQtyOverQuota).toBe(false);
      expect(res.isQtyOverQuota).toBe(true);
      expect(res.primaryOverQuotaItem?.proyeksiTotalQty).toBe(12);
      expect(res.primaryOverQuotaItem?.overQty).toBe(2);
    });
  });
});
