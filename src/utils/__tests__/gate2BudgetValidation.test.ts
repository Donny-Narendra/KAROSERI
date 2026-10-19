import { describe, it, expect } from 'vitest';
import {
  normalizeWbsStage,
  matchWbsStage,
  getWbsMaterialBudget,
  getWbsMaterialCommitted,
  evaluateGate2Budget,
  type RabItemGate2,
  type ChangeOrderItemGate2,
  type ApprovedRequisitionGate2,
  type DirectIssueGate2
} from '../gate2BudgetValidation';

describe('gate2BudgetValidation Unit Tests', () => {
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

  describe('getWbsMaterialBudget', () => {
    const mockRabItems: RabItemGate2[] = [
      // WBS 1: Pembongkaran
      {
        id: 'rab-1',
        spk_id: 'SPK-2668',
        wbs_stage: 'WBS 1: Pembongkaran',
        wbs_category: 'Pembongkaran',
        item_type: 'MATERIAL',
        description: 'material tes 2',
        quantity: 1,
        unit_price: 55000,
        item_total: 55000
      },
      {
        id: 'rab-2',
        spk_id: 'SPK-2668',
        wbs_stage: 'WBS 1: Pembongkaran',
        wbs_category: 'Pembongkaran',
        item_type: 'LABOR', // Labor MUST be ignored
        description: 'TUKANG RANGKA BAK',
        quantity: 0.3,
        unit_price: 1000000,
        item_total: 300000
      },
      {
        id: 'rab-3',
        spk_id: 'SPK-2668',
        wbs_stage: 'WBS 1: Pembongkaran',
        wbs_category: 'Pembongkaran',
        item_type: 'OVERHEAD', // Overhead MUST be ignored
        description: 'LISTRIK',
        quantity: 0.2,
        unit_price: 150000,
        item_total: 30000
      },
      {
        id: 'rab-4',
        spk_id: 'SPK-2668',
        wbs_stage: 'WBS 1: Pembongkaran',
        wbs_category: 'Pembongkaran',
        item_type: 'OVERHEAD', // Overhead MUST be ignored
        description: 'sewa kompressor',
        quantity: 0.2,
        unit_price: 100000,
        item_total: 20000
      },
      // WBS 2: Sasis/Rangka
      {
        id: 'rab-5',
        spk_id: 'SPK-2668',
        wbs_stage: 'WBS 2: Sasis/Rangka',
        wbs_category: 'Sasis/Rangka',
        item_type: 'MATERIAL',
        description: 'material tes 2',
        quantity: 1,
        unit_price: 55000,
        item_total: 55000
      }
    ];

    it('calculates pure material budget strictly for WBS 1, ignoring LABOR and OVERHEAD', () => {
      const wbs1Budget = getWbsMaterialBudget('SPK-2668', 'Pembongkaran', mockRabItems);
      // Only rab-1 is MATERIAL: 1 * 55,000 = 55,000
      expect(wbs1Budget).toBe(55000);
    });

    it('calculates global SPK material budget when stage is not specified', () => {
      const globalBudget = getWbsMaterialBudget('SPK-2668', null, mockRabItems);
      // rab-1 (55,000) + rab-5 (55,000) = 110,000
      expect(globalBudget).toBe(110000);
    });

    it('incorporates approved Change Order material allocations into WBS budget', () => {
      const mockCoItems: ChangeOrderItemGate2[] = [
        {
          id: 'co-1',
          spk_id: 'SPK-2668',
          wbs_stage: 'WBS 1: Pembongkaran',
          item_type: 'MATERIAL',
          quantity: 2,
          unit_price: 25000, // 50,000
          subtotal: 50000
        },
        {
          id: 'co-2',
          spk_id: 'SPK-2668',
          wbs_stage: 'WBS 1: Pembongkaran',
          item_type: 'LABOR', // Labor CO ignored
          quantity: 1,
          unit_price: 100000,
          subtotal: 100000
        }
      ];

      const expandedBudget = getWbsMaterialBudget('SPK-2668', 'Pembongkaran', mockRabItems, mockCoItems);
      // RAB 55,000 + CO Material 50,000 = 105,000
      expect(expandedBudget).toBe(105000);
    });
  });

  describe('getWbsMaterialCommitted', () => {
    it('accurately accumulates approved requisition costs for the target WBS stage', () => {
      const mockApprovedReqs: ApprovedRequisitionGate2[] = [
        {
          id: 'req-1',
          spk_id: 'SPK-2668',
          wbs_category: 'Pembongkaran',
          material_requisition_items: [
            {
              id: 'item-1',
              wbs_stage: 'Pembongkaran',
              quantity: 1,
              unit_price: 30000,
              subtotal: 30000
            }
          ]
        },
        {
          id: 'req-2',
          spk_id: 'SPK-2668',
          wbs_category: 'Sasis/Rangka',
          material_requisition_items: [
            {
              id: 'item-2',
              wbs_stage: 'Sasis/Rangka',
              quantity: 1,
              unit_price: 55000,
              subtotal: 55000
            }
          ]
        }
      ];

      const mockDirectIssues: DirectIssueGate2[] = [
        {
          id: 'dir-1',
          spk_id: 'SPK-2668',
          wbs_stage: 'Pembongkaran',
          quantity_issued: 2,
          custom_unit_price: 5000,
          status: 'ISSUED'
        }
      ];

      const res = getWbsMaterialCommitted('SPK-2668', 'Pembongkaran', mockApprovedReqs, mockDirectIssues);
      expect(res.approvedReqCost).toBe(30000);
      expect(res.directIssueCost).toBe(10000);
      expect(res.totalCommitted).toBe(40000);
    });
  });

  describe('evaluateGate2Budget (End-to-End Evaluation)', () => {
    const spk2668RabItems: RabItemGate2[] = [
      // WBS 1: Pembongkaran (Rp 55.000 material)
      {
        id: 'rab-mat-1',
        spk_id: 'ee645058-cc8f-4151-9edb-0ee667e5e154',
        wbs_stage: 'WBS 1: Pembongkaran',
        wbs_category: 'Pembongkaran',
        item_type: 'MATERIAL',
        description: 'material tes 2',
        quantity: 1,
        unit_price: 55000,
        item_total: 55000
      },
      // Jasa Borongan in WBS 1: Pembongkaran (Rp 300.000)
      {
        id: 'rab-lab-1',
        spk_id: 'ee645058-cc8f-4151-9edb-0ee667e5e154',
        wbs_stage: 'WBS 1: Pembongkaran',
        wbs_category: 'Pembongkaran',
        item_type: 'LABOR',
        description: 'TUKANG RANGKA BAK',
        quantity: 0.3,
        unit_price: 1000000,
        item_total: 300000
      },
      // Overhead in WBS 1: Pembongkaran (Rp 50.000)
      {
        id: 'rab-oh-1',
        spk_id: 'ee645058-cc8f-4151-9edb-0ee667e5e154',
        wbs_stage: 'WBS 1: Pembongkaran',
        wbs_category: 'Pembongkaran',
        item_type: 'OVERHEAD',
        description: 'LISTRIK',
        quantity: 0.2,
        unit_price: 150000,
        item_total: 30000
      }
    ];

    it('evaluates SPK-2668 WBS 1 requisition (Rp 55.000) as VALID GREEN without overbudget error', () => {
      const result = evaluateGate2Budget({
        spkId: 'ee645058-cc8f-4151-9edb-0ee667e5e154',
        wbsStage: 'Pembongkaran',
        currentTicketCost: 55000,
        rabItems: spk2668RabItems,
        approvedReqs: [],
        directIssues: []
      });

      expect(result.wbsBudgetLimit).toBe(55000);
      expect(result.approvedReqCost).toBe(0);
      expect(result.directIssueCost).toBe(0);
      expect(result.projectedTotal).toBe(55000);
      expect(result.remainingQuota).toBe(0);
      expect(result.overAmount).toBe(0);
      expect(result.isOverBudget).toBe(false);
      expect(result.statusBadge.variant).toBe('success');
      expect(result.statusBadge.title).toContain('Pagu Gate 2 (Aman');
    });

    it('triggers Over-Budget warning when ticket cost exceeds remaining WBS budget', () => {
      const result = evaluateGate2Budget({
        spkId: 'ee645058-cc8f-4151-9edb-0ee667e5e154',
        wbsStage: 'Pembongkaran',
        currentTicketCost: 80000, // Exceeds 55,000 by 25,000
        rabItems: spk2668RabItems,
        approvedReqs: [],
        directIssues: []
      });

      expect(result.wbsBudgetLimit).toBe(55000);
      expect(result.projectedTotal).toBe(80000);
      expect(result.overAmount).toBe(25000);
      expect(result.remainingQuota).toBe(0);
      expect(result.isOverBudget).toBe(true);
      expect(result.statusBadge.variant).toBe('danger');
      expect(result.statusBadge.title).toContain('PERINGATAN PAGU GATE 2 (OVER BUDGET)');
    });

    it('handles unbudgeted material request when WBS budget is 0', () => {
      const result = evaluateGate2Budget({
        spkId: 'ee645058-cc8f-4151-9edb-0ee667e5e154',
        wbsStage: 'Kelistrikan/Hidrolik',
        currentTicketCost: 50000,
        rabItems: spk2668RabItems, // No materials budgeted for Kelistrikan in this subset
        approvedReqs: [],
        directIssues: []
      });

      expect(result.wbsBudgetLimit).toBe(0);
      expect(result.hasWbsBudget).toBe(false);
      expect(result.isOverBudget).toBe(true);
      expect(result.overAmount).toBe(50000);
      expect(result.statusBadge.variant).toBe('danger');
    });
  });
});
