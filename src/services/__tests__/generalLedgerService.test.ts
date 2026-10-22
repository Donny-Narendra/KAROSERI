import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generalLedgerService } from '../generalLedgerService';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id' } } }),
    },
  },
}));

describe('Service: generalLedgerService (T-Model Accounting & Cash Ledger)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Balance CRUD', () => {
    it('returns null when initial_balances table has no records', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await generalLedgerService.getInitialBalance();
      expect(result).toBeNull();
    });

    it('returns formatted initial balance record when present', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'ib-1',
            cash_bank: '50000000',
            inventory_value: '30000000',
            equipment_value: '100000000',
            supplies_value: '10000000',
            payables: '20000000',
            initial_equity: '170000000',
            is_locked: false,
            created_at: '2026-10-01T00:00:00Z',
          },
          error: null,
        }),
      };
      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await generalLedgerService.getInitialBalance();
      expect(result).not.toBeNull();
      expect(result?.cash_bank).toBe(50000000);
      expect(result?.inventory_value).toBe(30000000);
      expect(result?.equipment_value).toBe(100000000);
      expect(result?.supplies_value).toBe(10000000);
      expect(result?.payables).toBe(20000000);
      expect(result?.initial_equity).toBe(170000000);
      expect(result?.is_locked).toBe(false);
    });

    it('throws error when trying to modify a locked initial balance', async () => {
      // Mock existing locked balance
      const mockQueryGet = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'ib-locked',
            cash_bank: 50000000,
            is_locked: true,
          },
          error: null,
        }),
      };
      (supabase.from as any).mockReturnValue(mockQueryGet);

      await expect(
        generalLedgerService.saveInitialBalance({
          cash_bank: 60000000,
          inventory_value: 0,
          equipment_value: 0,
          supplies_value: 0,
          payables: 0,
        })
      ).rejects.toThrow('Saldo awal bengkel telah dikunci');
    });
  });

  describe('Cash Ledger Transactions', () => {
    it('creates cash transaction with correct payload and user attribution', async () => {
      const mockInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'tx-1',
            transaction_date: '2026-10-22',
            direction: 'IN',
            category: 'CAPITAL_INJECTION',
            amount: 25000000,
            payment_method: 'TRANSFER',
            description: 'Setoran Modal Tambahan Pemilik',
            receipt_no: 'KW-001',
            created_by: 'mock-user-id',
            created_at: '2026-10-22T06:00:00Z',
          },
          error: null,
        }),
      };
      (supabase.from as any).mockReturnValue(mockInsert);

      const res = await generalLedgerService.createCashTransaction({
        transaction_date: '2026-10-22',
        direction: 'IN',
        category: 'CAPITAL_INJECTION',
        amount: 25000000,
        payment_method: 'TRANSFER',
        description: 'Setoran Modal Tambahan Pemilik',
        receipt_no: 'KW-001',
      });

      expect(res.id).toBe('tx-1');
      expect(res.amount).toBe(25000000);
      expect(res.category).toBe('CAPITAL_INJECTION');
    });

    it('filters cash ledger transactions by direction and search query', async () => {
      const rawTxList = [
        {
          id: '1',
          transaction_date: '2026-10-20',
          direction: 'IN',
          category: 'CAPITAL_INJECTION',
          amount: 50000000,
          payment_method: 'TRANSFER',
          description: 'Setoran Modal Awal',
          receipt_no: 'KW-101',
          created_at: '2026-10-20T00:00:00Z',
        },
        {
          id: '2',
          transaction_date: '2026-10-21',
          direction: 'OUT',
          category: 'EQUIPMENT_PURCHASE',
          amount: 15000000,
          payment_method: 'TRANSFER',
          description: 'Beli mesin las inverter 400A',
          receipt_no: 'KW-102',
          created_at: '2026-10-21T00:00:00Z',
        },
      ];

      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((col, val) => {
          return {
            ...mockQuery,
            then: (resolve: any) => resolve({ data: rawTxList.filter((x: any) => x[col] === val), error: null }),
          };
        }),
      };
      // Default resolve
      mockQuery.then = (resolve: any) => resolve({ data: rawTxList, error: null });

      (supabase.from as any).mockReturnValue(mockQuery);

      const searchResult = await generalLedgerService.getCashTransactions({
        searchQuery: 'mesin las',
      });

      expect(searchResult.length).toBe(1);
      expect(searchResult[0].description).toContain('mesin las');
    });
  });

  describe('Accounting Model T & Double-Entry Aggregation', () => {
    it('computes 100% balanced Model T metrics (Aktiva == Pasiva) with real-time components', async () => {
      // Setup mock data for each table:
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'initial_balances') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'ib-1',
                cash_bank: 100000000,       // Kas Awal: 100jt
                inventory_value: 50000000,   // Inventaris Awal: 50jt
                equipment_value: 200000000,  // Mesin Awal: 200jt
                supplies_value: 20000000,    // Perlengkapan Awal: 20jt
                payables: 70000000,          // Hutang Awal: 70jt
                initial_equity: 300000000,   // Ekuitas: (100+50+200+20) - 70 = 300jt
                is_locked: true,
                created_at: '2026-10-01T00:00:00Z',
              },
              error: null,
            }),
          };
        }

        if (table === 'cash_ledger_transactions') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: (resolve: any) =>
              resolve({
                data: [
                  // Setoran Modal Tambahan (+50jt)
                  { id: 'c1', transaction_date: '2026-10-05', direction: 'IN', category: 'CAPITAL_INJECTION', amount: 50000000, payment_method: 'TRANSFER', description: 'Setoran modal tambahan' },
                  // Beli Peralatan Baru (-30jt, Peralatan +30jt)
                  { id: 'c2', transaction_date: '2026-10-10', direction: 'OUT', category: 'EQUIPMENT_PURCHASE', amount: 30000000, payment_method: 'TRANSFER', description: 'Beli mesin bending' },
                  // Penarikan Prive (-10jt, Modal -10jt)
                  { id: 'c3', transaction_date: '2026-10-15', direction: 'OUT', category: 'PRIVE_WITHDRAWAL', amount: 10000000, payment_method: 'TRANSFER', description: 'Prive owner' },
                  // Pembayaran Cicilan Hutang (-20jt, Hutang -20jt)
                  { id: 'c4', transaction_date: '2026-10-18', direction: 'OUT', category: 'DEBT_REPAYMENT', amount: 20000000, payment_method: 'TRANSFER', description: 'Bayar hutang tempo' },
                ],
                error: null,
              }),
          };
        }

        if (table === 'payments') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { amount: 60000000, payment_type: 'DP' },
                { amount: 40000000, payment_type: 'FINAL' },
              ],
              error: null,
            }),
          };
        }

        if (table === 'spk') {
          return {
            select: vi.fn().mockReturnThis(),
            neq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'spk-completed',
                  spk_no: 'SPK-001',
                  status: 'COMPLETED',
                  total_selling_price: 150000000,
                  total_estimated_cost: 100000000,
                  dp_amount: 50000000,
                  spk_amendments: [],
                },
                {
                  id: 'spk-active',
                  spk_no: 'SPK-002',
                  status: 'ACTIVE',
                  total_selling_price: 120000000,
                  total_estimated_cost: 80000000,
                  dp_amount: 50000000,
                  spk_amendments: [],
                },
              ],
              error: null,
            }),
          };
        }

        if (table === 'spk_borongan') {
          return {
            select: vi.fn().mockReturnThis(),
            neq: vi.fn().mockResolvedValue({
              data: [
                { spk_id: 'spk-completed', contract_value: 20000000, status: 'COMPLETED' },
                { spk_id: 'spk-active', contract_value: 15000000, status: 'ACTIVE' },
              ],
              error: null,
            }),
          };
        }

        if (table === 'inventory_transactions') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { spk_id: 'spk-completed', quantity_issued: 5, custom_unit_price: 6000000, materials: { is_customer_supplied: false } },
                { spk_id: 'spk-active', quantity_issued: 3, custom_unit_price: 5000000, materials: { is_customer_supplied: false } },
              ],
              error: null,
            }),
          };
        }

        if (table === 'materials') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { id: 'm1', current_stock: 10, unit_price: 4000000 }, // Stok gudang fisik = 40jt
              ],
              error: null,
            }),
          };
        }

        if (table === 'operating_expenses') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { amount: 15000000 }, // OPEX = 15jt
              ],
              error: null,
            }),
          };
        }

        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: (resolve: any) => resolve({ data: [], error: null }),
        };
      });

      const metrics = await generalLedgerService.getGeneralLedgerMetrics();

      expect(metrics.hasInitialBalance).toBe(true);
      expect(metrics.initialBalance?.initial_equity).toBe(300000000);

      // Verifikasi Sisi Aktiva
      expect(metrics.aktiva.equipmentValue).toBe(230000000); // 200jt awal + 30jt beli baru
      expect(metrics.aktiva.suppliesValue).toBe(20000000);   // 20jt awal
      expect(metrics.aktiva.physicalInventory).toBe(5000000); // 50jt awal - 45jt issued
      expect(metrics.aktiva.wipValue).toBe(30000000); // SPK aktif: 15jt material + 15jt active labor
      expect(metrics.aktiva.receivables).toBe(50000000); // SPK completed (150jt) - Total Kas In SPK (100jt) = 50jt

      // Verifikasi Sisi Pasiva
      expect(metrics.pasiva.payables).toBe(50000000); // 70jt awal - 20jt bayar cicilan
      expect(metrics.pasiva.totalModalLama).toBe(350000000); // 300jt initial + 50jt injection
      expect(metrics.pasiva.prive).toBe(10000000); // 10jt

      // HPP Completed = Borongan (20jt) + Material (30jt) = 50jt
      expect(metrics.pasiva.hppCompletedSpk).toBe(50000000);
      // Net Profit = Revenue (150jt) - HPP (50jt) - OPEX (15jt) = 85jt
      expect(metrics.pasiva.netProfit).toBe(85000000);
      // Modal Baru = Modal Lama (350jt) + Net Profit (85jt) - Prive (10jt) = 425jt
      expect(metrics.pasiva.modalBaru).toBe(425000000);
      // Total Pasiva = Hutang (50jt) + Modal Baru (425jt) = 475jt
      expect(metrics.pasiva.totalPasiva).toBe(475000000);

      // Verifikasi Keseimbangan Model T (AKTIVA == PASIVA)
      expect(metrics.isBalanced).toBe(true);
      expect(Math.abs(metrics.balanceDiff)).toBeLessThan(1);
    });
  });
});
