import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RequisitionApproval } from '../RequisitionApproval';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'warehouse-user-id', email: 'gudang@test.com' },
    profile: { id: 'warehouse-user-id', full_name: 'Petugas Gudang', role: 'petugas_gudang' },
    signOut: vi.fn(),
  }),
}));

vi.mock('../../lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe('Component: RequisitionApproval (Gate 2 Material-Only & WBS-Specific Scope)', () => {
  const spkId = 'ee645058-cc8f-4151-9edb-0ee667e5e154';

  const mockPendingRequisitionWbs1 = {
    id: 'req-wbs-1',
    spk_id: spkId,
    wbs_category: 'Pembongkaran',
    status: 'PENDING',
    notes: 'Permintaan material WBS 1',
    created_at: '2026-10-19T08:08:02.008911+00:00',
    spk: {
      id: spkId,
      spk_no: 'SPK-2668',
      spk_number: 'SPK-2668',
      customer_name: 'Budi Santoso',
      vehicle_plate: 'B 2668 KRO',
      sub_tasks: [],
      total_estimated_cost: 2415000
    },
    profiles: {
      full_name: 'Mandor WBS'
    },
    material_requisition_items: [
      {
        id: 'item-req-1',
        material_id: null,
        rab_item_id: 'ca7e1cb3-fbe7-4e24-b8c9-97e1e6bcf968',
        material_name: 'material tes 2',
        quantity: 1,
        unit: 'pcs',
        unit_price: 55000,
        subtotal: 55000,
        wbs_stage: 'Pembongkaran'
      }
    ]
  };

  const mockRabEstimation = {
    spk_id: spkId,
    total_material_cost: 265000,
    total_labor_cost: 1900000,
    total_overhead_cost: 250000,
    total_estimated_cost: 2415000,
    rab_items: [
      // WBS 1: Pure Material (Rp 55.000)
      {
        id: 'ca7e1cb3-fbe7-4e24-b8c9-97e1e6bcf968',
        description: 'material tes 2',
        quantity: 1,
        unit_price: 55000,
        cost_price: 44000,
        item_total: 55000,
        wbs_category: 'Pembongkaran',
        wbs_stage: 'WBS 1: Pembongkaran',
        item_type: 'MATERIAL'
      },
      // WBS 1: Labor (Rp 300.000) - MUST BE EXCLUDED FROM GATE 2 MATERIAL LIMIT
      {
        id: 'lab-wbs-1',
        description: 'TUKANG RANGKA BAK',
        quantity: 0.3,
        unit_price: 1000000,
        cost_price: 1000000,
        item_total: 300000,
        wbs_category: 'Pembongkaran',
        wbs_stage: 'WBS 1: Pembongkaran',
        item_type: 'LABOR'
      },
      // WBS 1: Overhead (Rp 30.000) - MUST BE EXCLUDED FROM GATE 2 MATERIAL LIMIT
      {
        id: 'oh-wbs-1',
        description: 'LISTRIK',
        quantity: 0.2,
        unit_price: 150000,
        cost_price: 150000,
        item_total: 30000,
        wbs_category: 'Pembongkaran',
        wbs_stage: 'WBS 1: Pembongkaran',
        item_type: 'OVERHEAD'
      },
      // WBS 2: Material (Rp 55.000) - BELONGS TO WBS 2, MUST NOT INTERFERE WITH WBS 1
      {
        id: 'mat-wbs-2',
        description: 'material tes 2',
        quantity: 1,
        unit_price: 55000,
        cost_price: 44000,
        item_total: 55000,
        wbs_category: 'Sasis/Rangka',
        wbs_stage: 'WBS 2: Sasis/Rangka',
        item_type: 'MATERIAL'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupSupabaseMock = (pendingReqs: any[] = [mockPendingRequisitionWbs1], approvedReqs: any[] = []) => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation((_col: string, val: string) => {
              if (val === 'PENDING') {
                return {
                  order: vi.fn().mockResolvedValue({
                    data: pendingReqs,
                    error: null
                  })
                };
              }
              if (val === 'APPROVED') {
                return Promise.resolve({
                  data: approvedReqs,
                  error: null
                });
              }
              return Promise.resolve({ data: [], error: null });
            }),
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: approvedReqs,
                error: null
              })
            })
          }))
        } as any;
      }

      if (table === 'materials') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              { id: 'mat-1', name: 'material tes 2', unit: 'pcs', unit_price: 55000 }
            ],
            error: null
          })
        } as any;
      }

      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [mockRabEstimation],
              error: null
            })
          })
        } as any;
      }

      if (table === 'inventory_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        } as any;
      }

      if (table === 'change_orders') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        } as any;
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      } as any;
    });
  };

  it('renders SPK-2668 WBS 1 requisition with VALID GREEN status without false-positive over-budget warning', async () => {
    setupSupabaseMock();

    render(<RequisitionApproval />);

    // Wait for requisitions to load
    await waitFor(() => {
      expect(screen.getByText('SPK-2668')).toBeInTheDocument();
    });

    // Check WBS stage and item details
    expect(screen.getAllByText('Pembongkaran').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('material tes 2')).toBeInTheDocument();

    // Verify Gate 2 Safe Banner is displayed for WBS 1
    const safeBanner = await screen.findByText(/Pagu Gate 2/i);
    expect(safeBanner).toBeInTheDocument();
    expect(safeBanner.textContent).toContain('Aman');

    // Check that NO false-positive over-budget alert is shown
    expect(screen.queryByText(/PERINGATAN PAGU GATE 2 \(OVER BUDGET\):/i)).not.toBeInTheDocument();

    // Verify Approve button is green (bg-status-success) and NOT amber (bg-amber-600)
    const approveButton = screen.getByRole('button', { name: /approve/i });
    expect(approveButton).toHaveClass('bg-status-success');
    expect(approveButton).not.toHaveClass('bg-amber-600');
    expect(approveButton).toHaveAttribute('title', 'Setujui Permintaan Material (Sesuai Alokasi RAB WBS)');
  });

  it('shows red/amber Gate 2 warning and amber Approve button when a requisition genuinely exceeds WBS budget', async () => {
    // Requisition requesting 2 pcs of material tes 2 = Rp 110,000 (exceeding WBS 1 budget of Rp 55,000)
    const overBudgetReq = {
      ...mockPendingRequisitionWbs1,
      id: 'req-overbudget',
      material_requisition_items: [
        {
          id: 'item-req-over',
          material_id: null,
          rab_item_id: 'ca7e1cb3-fbe7-4e24-b8c9-97e1e6bcf968',
          material_name: 'material tes 2',
          quantity: 2,
          unit: 'pcs',
          unit_price: 55000,
          subtotal: 110000,
          wbs_stage: 'Pembongkaran'
        }
      ]
    };

    setupSupabaseMock([overBudgetReq]);

    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('SPK-2668')).toBeInTheDocument();
    });

    // Verify Over-Budget warning appears
    const warningAlert = await screen.findByText(/PERINGATAN PAGU GATE 2 \(OVER BUDGET\):/i);
    expect(warningAlert).toBeInTheDocument();

    // Verify Approve button turns amber
    const approveButton = screen.getByRole('button', { name: /approve/i });
    expect(approveButton).toHaveClass('bg-amber-600');
    expect(approveButton).not.toHaveClass('bg-status-success');
  });
});
