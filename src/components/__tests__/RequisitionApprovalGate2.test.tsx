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
            in: vi.fn().mockImplementation((col: string, _val: any) => {
              if (col === 'status') {
                return {
                  order: vi.fn().mockResolvedValue({
                    data: pendingReqs,
                    error: null
                  })
                };
              }
              return {
                eq: vi.fn().mockResolvedValue({
                  data: approvedReqs,
                  error: null
                }),
                in: vi.fn().mockResolvedValue({
                  data: approvedReqs,
                  error: null
                })
              };
            })
          })),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        } as any;
      }

      if (table === 'material_requisition_items') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        } as any;
      }

      if (table === 'materials') {
        return {
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'mat-1', name: 'material tes 2', unit: 'pcs', current_stock: 10 },
                error: null
              })
            })),
            then: (resolve: any) => resolve({
              data: [
                { id: 'mat-1', name: 'material tes 2', unit: 'pcs', unit_price: 55000, current_stock: 10 }
              ],
              error: null
            })
          })),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
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
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null })
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
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnThis(),
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

    // Verify Gate 2 Safe Info Badge is displayed for WBS 1
    const safeBadge = await screen.findByText(/Alokasi Sesuai Pagu Material/i);
    expect(safeBadge).toBeInTheDocument();
    expect(safeBadge.textContent).toContain('Pembongkaran: Rp 55.000 / Rp 55.000');

    // Check that NO false-positive over-budget alert is shown
    expect(screen.queryByText(/PERINGATAN PAGU GATE 2 \(OVER BUDGET\):/i)).not.toBeInTheDocument();

    // Verify card footer Approve Semua button is standard primary and NOT amber
    const approveSemuaButton = screen.getByRole('button', { name: /approve semua/i });
    expect(approveSemuaButton).toHaveClass('bg-primary');
    expect(approveSemuaButton).not.toHaveClass('bg-amber-600');
    expect(approveSemuaButton).toHaveAttribute('title', 'Setujui Seluruh Sisa Material Pending Sekaligus');

    // Verify item-level action buttons (Rilis / Approve and Tolak / Hold) are present in the table row
    const itemApproveBtn = screen.getByRole('button', { name: /rilis \/ approve/i });
    expect(itemApproveBtn).toBeInTheDocument();
    const itemRejectBtn = screen.getByRole('button', { name: /tolak \/ hold/i });
    expect(itemRejectBtn).toBeInTheDocument();
  });

  it('shows red/amber Gate 2 warning and amber Approve Semua button when a requisition genuinely exceeds WBS budget', async () => {
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

    // Verify Approve Semua button turns amber
    const approveSemuaButton = screen.getByRole('button', { name: /approve semua/i });
    expect(approveSemuaButton).toHaveClass('bg-amber-600');
    expect(approveSemuaButton).not.toHaveClass('bg-status-success');
  });

  it('renders granular status badges for APPROVED and REJECTED items and PARTIALLY_ISSUED card badge', async () => {
    const multiItemPartialReq = {
      ...mockPendingRequisitionWbs1,
      id: 'req-partial-1',
      status: 'PARTIALLY_ISSUED',
      material_requisition_items: [
        {
          id: 'item-req-approved',
          material_id: 'mat-1',
          material_name: 'Plat Besi 2mm',
          quantity: 5,
          unit: 'lbr',
          unit_price: 100000,
          subtotal: 500000,
          wbs_stage: 'Pembongkaran',
          status: 'APPROVED'
        },
        {
          id: 'item-req-pending',
          material_id: 'mat-2',
          material_name: 'Baut Hex M10',
          quantity: 50,
          unit: 'pcs',
          unit_price: 2000,
          subtotal: 100000,
          wbs_stage: 'Pembongkaran',
          status: 'PENDING'
        },
        {
          id: 'item-req-rejected',
          material_id: 'mat-3',
          material_name: 'Kabel Ties',
          quantity: 10,
          unit: 'pack',
          unit_price: 15000,
          subtotal: 150000,
          wbs_stage: 'Pembongkaran',
          status: 'REJECTED'
        }
      ]
    };

    setupSupabaseMock([multiItemPartialReq]);

    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('SPK-2668')).toBeInTheDocument();
    });

    // Card header should display PARTIALLY_ISSUED badge
    expect(screen.getByText(/Sebagian Dirilis \(Partially Issued\)/i)).toBeInTheDocument();

    // Approved item row should render "✓ Dirilis" badge
    expect(screen.getByText(/✓ Dirilis/i)).toBeInTheDocument();

    // Rejected item row should render "✕ Ditolak" badge
    expect(screen.getByText(/✕ Ditolak/i)).toBeInTheDocument();

    // Pending item row should still have individual Rilis / Approve and Tolak / Hold buttons
    expect(screen.getByRole('button', { name: /rilis \/ approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tolak \/ hold/i })).toBeInTheDocument();

    // Table footer should display subtotals
    expect(screen.getByText(/Subtotal yang Sudah Dirilis:/i)).toBeInTheDocument();
    expect(screen.getByText(/Subtotal Belum Dirilis \(Pending\):/i)).toBeInTheDocument();
  });
});
