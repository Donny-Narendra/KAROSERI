import { describe, it, expect } from 'vitest';
import { isRabItemAllocated, normalizeText } from '../rabItemAllocation';

describe('Util: rabItemAllocation (Multi-element 3-Pillar Allocation Matching)', () => {
  it('normalizes text removing symbols, casing, and excessive spaces', () => {
    expect(normalizeText('  LISTRIK -- MESIN   LAS!  ')).toBe('listrik mesin las');
    expect(normalizeText(null)).toBe('');
  });

  it('detects allocated material in material requisitions', () => {
    const rabItem = { id: 'rab-mat-1', material_id: 'mat-1', description: 'Plat Besi 3mm' };
    const requisitions = [
      {
        id: 'req-1',
        material_requisition_items: [
          { rab_item_id: 'rab-mat-1', material_name: 'Plat Besi 3mm' }
        ]
      }
    ];

    expect(isRabItemAllocated(rabItem, requisitions, null, null, null)).toBe(true);
  });

  it('detects allocated labor in active spk borongan assignments', () => {
    const rabItem = { id: 'rab-lab-1', description: 'TUKANG RANGKA BAK', item_type: 'LABOR' };
    const borongans = [
      {
        id: 'spkb-1',
        rab_item_id: 'rab-lab-1',
        task_description: 'TUKANG RANGKA BAK pengerjaan rangka utama',
        status: 'ACTIVE'
      }
    ];

    expect(isRabItemAllocated(rabItem, null, borongans, null, null)).toBe(true);
  });

  it('detects allocated overhead in spk_overhead_logs via rab_item_id', () => {
    const rabItem = { id: 'rab-oh-1', description: 'LISTRIK', item_type: 'OVERHEAD' };
    const overheadLogs = [
      {
        id: 'log-1',
        rab_item_id: 'rab-oh-1',
        overhead_name: 'LISTRIK',
        frequency_qty: 0.2,
      }
    ];

    expect(isRabItemAllocated(rabItem, null, null, null, overheadLogs)).toBe(true);
  });

  it('detects allocated overhead in spk_overhead_logs via name match', () => {
    const rabItem = { id: 'rab-oh-2', description: 'sewa kompressor', item_type: 'OVERHEAD' };
    const overheadLogs = [
      {
        id: 'log-2',
        overhead_name: 'sewa kompressor',
        frequency_qty: 0.2,
      }
    ];

    expect(isRabItemAllocated(rabItem, null, null, null, overheadLogs)).toBe(true);
  });

  it('returns false for unallocated overhead item', () => {
    const rabItem = { id: 'rab-oh-3', description: 'sewa kompressor', item_type: 'OVERHEAD' };
    const overheadLogs = [
      {
        id: 'log-1',
        overhead_name: 'LISTRIK',
        frequency_qty: 0.2,
      }
    ];

    expect(isRabItemAllocated(rabItem, null, null, null, overheadLogs)).toBe(false);
  });
});
