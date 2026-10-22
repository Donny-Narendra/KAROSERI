import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RequisitionApproval } from '../RequisitionApproval';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-wh-101', email: 'gudang@robelkaroseri.com' },
    profile: { id: 'user-wh-101', full_name: 'Pak Gudang', role: 'petugas_gudang' },
    signOut: vi.fn(),
  }),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Component: RequisitionApproval (Partially Issued Requisitions & Sidebar Counter Sync)', () => {
  const spkId7080 = 'spk-uuid-7080';

  const mockPartiallyIssuedRequisition = {
    id: 'req-spk-7080-uuid',
    spk_id: spkId7080,
    wbs_category: 'Pembongkaran',
    status: 'PARTIALLY_ISSUED',
    notes: 'Pembongkaran bodi dan tangki SPK-7080',
    created_at: '2026-10-22T08:30:00.000Z',
    spk: {
      id: spkId7080,
      spk_no: 'SPK-7080',
      spk_number: 'SPK-7080',
      customer_name: 'PT Mitra Tangki Abadi',
      vehicle_plate: 'B 7080 KRO',
      sub_tasks: ['Bongkar Tangki', 'Perbaikan Sasis'],
      total_estimated_cost: 5000000
    },
    profiles: {
      full_name: 'Mandor Joko'
    },
    material_requisition_items: [
      {
        id: 'item-7080-1',
        material_id: 'mat-plat-uuid',
        material_name: 'Plat Besi 3mm',
        quantity: 5,
        unit: 'lbr',
        unit_price: 350000,
        subtotal: 1750000,
        wbs_stage: 'Pembongkaran',
        status: 'APPROVED'
      },
      {
        id: 'item-7080-2',
        material_id: 'mat-baut-uuid',
        material_name: 'Baut Baja M12',
        quantity: 50,
        unit: 'pcs',
        unit_price: 5000,
        subtotal: 250000,
        wbs_stage: 'Pembongkaran',
        status: 'PENDING'
      },
      {
        id: 'item-7080-3',
        material_id: 'mat-kawat-uuid',
        material_name: 'Kawat Las RB-26',
        quantity: 10,
        unit: 'kg',
        unit_price: 45000,
        subtotal: 450000,
        wbs_stage: 'Pembongkaran',
        status: 'PENDING'
      }
    ]
  };

  let updateReqItemMock: any;
  let updateReqMock: any;
  let insertTxMock: any;
  let updateMaterialMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    updateReqItemMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    updateReqMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    insertTxMock = vi.fn().mockResolvedValue({ data: null, error: null });

    updateMaterialMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { success: false, message: 'Fallback to JS' },
      error: null
    } as any);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockImplementation(() => ({
            in: vi.fn().mockImplementation((col: string, values: string[]) => {
              if (col === 'status') {
                expect(values).toContain('PENDING');
                expect(values).toContain('PARTIALLY_ISSUED');
                return {
                  order: vi.fn().mockResolvedValue({
                    data: [mockPartiallyIssuedRequisition],
                    error: null
                  })
                };
              }
              return {
                in: vi.fn().mockResolvedValue({ data: [], error: null })
              };
            })
          })),
          update: updateReqMock,
          insert: vi.fn().mockResolvedValue({ data: null, error: null })
        } as any;
      }

      if (table === 'material_requisition_items') {
        return {
          update: updateReqItemMock
        } as any;
      }

      if (table === 'materials') {
        return {
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation((_col: string, val: string) => ({
              single: vi.fn().mockResolvedValue({
                data: { id: val, name: 'Material Stock', unit: 'pcs', current_stock: 100 },
                error: null
              })
            })),
            then: (resolve: any) => resolve({
              data: [
                { id: 'mat-plat-uuid', name: 'Plat Besi 3mm', unit: 'lbr', unit_price: 350000, current_stock: 20 },
                { id: 'mat-baut-uuid', name: 'Baut Baja M12', unit: 'pcs', unit_price: 5000, current_stock: 500 },
                { id: 'mat-kawat-uuid', name: 'Kawat Las RB-26', unit: 'kg', unit_price: 45000, current_stock: 80 }
              ],
              error: null
            })
          })),
          update: updateMaterialMock
        } as any;
      }

      if (table === 'inventory_transactions') {
        return {
          insert: insertTxMock,
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        } as any;
      }

      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{
                spk_id: spkId7080,
                total_material_cost: 10000000,
                total_estimated_cost: 10000000,
                rab_items: [
                  {
                    id: 'rab-item-1',
                    description: 'Material Pembongkaran',
                    quantity: 1,
                    unit_price: 10000000,
                    cost_price: 8000000,
                    item_total: 10000000,
                    wbs_category: 'Pembongkaran',
                    wbs_stage: 'Pembongkaran',
                    item_type: 'material'
                  }
                ]
              }],
              error: null
            })
          })
        } as any;
      }

      if (table === 'change_orders' || table === 'mandor_requisitions') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              then: (resolve: any) => resolve({ data: [], error: null })
            }))
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null })
        } as any;
      }

      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      } as any;
    });
  });

  it('renders SPK-7080 with PARSIAL badge showing remaining 2 pending items, and reports count to onSpkSummaryChange', async () => {
    const onSpkSummaryChangeMock = vi.fn();

    render(
      <RequisitionApproval
        onSpkSummaryChange={onSpkSummaryChangeMock}
      />
    );

    // 1. SPK-7080 should appear on the dashboard
    await waitFor(() => {
      expect(screen.getByText('SPK-7080')).toBeInTheDocument();
    });

    // 2. Customer and WBS stage verification
    expect(screen.getByText('(PT Mitra Tangki Abadi)')).toBeInTheDocument();
    expect(screen.getAllByText('Pembongkaran')[0]).toBeInTheDocument();

    // 3. Status badge must display PARSIAL with remaining 2 pending items
    expect(screen.getByText(/PARSIAL \(Sisa 2 Item Belum Disetujui\)/i)).toBeInTheDocument();

    // 4. Approved item (Plat Besi 3mm) must have "✓ Dirilis" badge
    expect(screen.getByText('Plat Besi 3mm')).toBeInTheDocument();
    expect(screen.getByText(/✓ Dirilis/i)).toBeInTheDocument();

    // 5. Pending items (Baut Baja M12, Kawat Las RB-26) must have active action buttons
    expect(screen.getByText('Baut Baja M12')).toBeInTheDocument();
    expect(screen.getByText('Kawat Las RB-26')).toBeInTheDocument();

    const approveButtons = screen.getAllByRole('button', { name: /rilis \/ approve/i });
    expect(approveButtons).toHaveLength(2);

    const rejectButtons = screen.getAllByRole('button', { name: /tolak \/ hold/i });
    expect(rejectButtons).toHaveLength(2);

    // 6. onSpkSummaryChange must receive count = 2 (remaining pending items, not 1 document)
    await waitFor(() => {
      expect(onSpkSummaryChangeMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            spkNo: 'SPK-7080',
            count: 2
          })
        ])
      );
    });
  });

  it('approving one of the pending items preserves PARTIALLY_ISSUED status and decreases pending item count', async () => {
    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('SPK-7080')).toBeInTheDocument();
    });

    // Approve Baut Baja M12 (first active approve button)
    const approveItemBtn = screen.getAllByRole('button', { name: /rilis \/ approve/i })[0];
    fireEvent.click(approveItemBtn);

    // Modal confirmation opens
    expect(screen.getByRole('heading', { name: /Rilis \/ Approve/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Baut Baja M12/i)[0]).toBeInTheDocument();

    // Confirm approval
    const confirmBtn = screen.getByRole('button', { name: /Ya, Rilis \/ Approve Item/i });
    fireEvent.click(confirmBtn);

    // Verify item status update to APPROVED
    await waitFor(() => {
      expect(updateReqItemMock).toHaveBeenCalledWith({ status: 'APPROVED' });
    });

    // Verify stock deduction on materials (100 in stock - 50 requested = 50)
    expect(updateMaterialMock).toHaveBeenCalledWith(expect.objectContaining({
      current_stock: 50
    }));

    // Verify parent status updated to PARTIALLY_ISSUED (1 item Kawat Las still pending)
    expect(updateReqMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 'PARTIALLY_ISSUED'
    }));

    // Success feedback modal
    expect(await screen.findByText('Item Disetujui')).toBeInTheDocument();
  });

  it('automatically hides requisition when pendingItems.length === 0', async () => {
    // Mock requisition where all items are already APPROVED
    const fullyApprovedRequisition = {
      ...mockPartiallyIssuedRequisition,
      id: 'req-completed-uuid',
      status: 'COMPLETED',
      material_requisition_items: [
        {
          id: 'item-7080-1',
          material_name: 'Plat Besi 3mm',
          quantity: 5,
          unit: 'lbr',
          unit_price: 350000,
          subtotal: 1750000,
          status: 'APPROVED'
        },
        {
          id: 'item-7080-2',
          material_name: 'Baut Baja M12',
          quantity: 50,
          unit: 'pcs',
          unit_price: 5000,
          subtotal: 250000,
          status: 'APPROVED'
        }
      ]
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockImplementation(() => ({
            in: vi.fn().mockImplementation((col: string) => {
              if (col === 'status') {
                return {
                  order: vi.fn().mockResolvedValue({
                    data: [fullyApprovedRequisition],
                    error: null
                  })
                };
              }
              return { in: vi.fn().mockResolvedValue({ data: [], error: null }) };
            })
          }))
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockImplementation(() => ({
            is: vi.fn().mockResolvedValue({ data: [], error: null }),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
            then: (resolve: any) => resolve({ data: [], error: null })
          }))
        })
      } as any;
    });

    const onSpkSummaryChangeMock = vi.fn();

    render(
      <RequisitionApproval
        onSpkSummaryChange={onSpkSummaryChangeMock}
      />
    );

    // Card should NOT be rendered since pendingItems.length === 0
    await waitFor(() => {
      expect(screen.getByText(/No pending material requisitions/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('SPK-7080')).not.toBeInTheDocument();

    // Summary should be empty array
    expect(onSpkSummaryChangeMock).toHaveBeenCalledWith([]);
  });
});
