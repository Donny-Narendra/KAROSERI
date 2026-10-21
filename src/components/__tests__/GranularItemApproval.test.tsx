import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RequisitionApproval } from '../RequisitionApproval';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-wh-123', email: 'petugas@gudang.com' },
    profile: { id: 'user-wh-123', full_name: 'Budi Gudang', role: 'petugas_gudang' },
    signOut: vi.fn(),
  }),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Component: RequisitionApproval (Granular Item-Level Material Approval)', () => {
  const spkId = 'spk-test-granular-uuid';

  const mockTwoItemRequisition = {
    id: 'req-batch-101',
    spk_id: spkId,
    wbs_category: 'Pembongkaran',
    status: 'PENDING',
    notes: 'Kebutuhan awal pembongkaran tangki',
    created_at: '2026-10-21T08:00:00.000Z',
    spk: {
      id: spkId,
      spk_no: 'SPK-7879',
      spk_number: 'SPK-7879',
      customer_name: 'PT Karoseri Maju',
      vehicle_plate: 'B 7879 KM',
      sub_tasks: [],
      total_estimated_cost: 1500000
    },
    profiles: {
      full_name: 'Mandor Lapangan'
    },
    material_requisition_items: [
      {
        id: 'item-tes-1',
        material_id: 'mat-uuid-1',
        material_name: 'material tes 1',
        quantity: 2,
        unit: 'btg',
        unit_price: 25000,
        subtotal: 50000,
        wbs_stage: 'Pembongkaran',
        status: 'PENDING'
      },
      {
        id: 'item-tes-2',
        material_id: 'mat-uuid-2',
        material_name: 'material tes 2',
        quantity: 1,
        unit: 'pcs',
        unit_price: 55000,
        subtotal: 55000,
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
      data: { success: false, message: 'RPC mock not configured' },
      error: null
    } as any);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockImplementation(() => ({
            in: vi.fn().mockImplementation((col: string) => {
              if (col === 'status') {
                return {
                  order: vi.fn().mockResolvedValue({
                    data: [mockTwoItemRequisition],
                    error: null
                  })
                };
              }
              return {
                in: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              };
            })
          })),
          update: updateReqMock
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
                data: { id: val, name: val, unit: 'pcs', current_stock: 20 },
                error: null
              })
            })),
            then: (resolve: any) => resolve({
              data: [
                { id: 'mat-uuid-1', name: 'material tes 1', unit: 'btg', unit_price: 25000, current_stock: 20 },
                { id: 'mat-uuid-2', name: 'material tes 2', unit: 'pcs', unit_price: 55000, current_stock: 20 }
              ],
              error: null
            })
          })),
          update: updateMaterialMock
        } as any;
      }

      if (table === 'inventory_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          }),
          insert: insertTxMock
        } as any;
      }

      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  spk_id: spkId,
                  total_material_cost: 500000,
                  total_labor_cost: 0,
                  total_overhead_cost: 0,
                  total_estimated_cost: 500000,
                  rab_items: [
                    {
                      id: 'rab-item-1',
                      description: 'material tes 1',
                      quantity: 5,
                      cost_price: 25000,
                      unit_price: 25000,
                      item_total: 125000,
                      wbs_category: 'Pembongkaran',
                      wbs_stage: 'WBS 1: Pembongkaran',
                      item_type: 'MATERIAL'
                    },
                    {
                      id: 'rab-item-2',
                      description: 'material tes 2',
                      quantity: 5,
                      cost_price: 55000,
                      unit_price: 55000,
                      item_total: 275000,
                      wbs_category: 'Pembongkaran',
                      wbs_stage: 'WBS 1: Pembongkaran',
                      item_type: 'MATERIAL'
                    }
                  ]
                }
              ],
              error: null
            })
          })
        } as any;
      }

      if (table === 'change_orders') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null })
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
  });

  it('renders SPK-7879 with 2 pending item rows and item-level Approve / Tolak buttons', async () => {
    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('SPK-7879')).toBeInTheDocument();
    });

    expect(screen.getByText('material tes 1')).toBeInTheDocument();
    expect(screen.getByText('material tes 2')).toBeInTheDocument();

    // 2 rows of Approve and Tolak buttons
    const approveButtons = screen.getAllByRole('button', { name: /^approve$/i });
    expect(approveButtons).toHaveLength(2);

    const tolakButtons = screen.getAllByRole('button', { name: /^tolak$/i });
    expect(tolakButtons).toHaveLength(2);

    // Card footer should also have Approve Semua and Tolak Semua
    expect(screen.getByRole('button', { name: /approve semua/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tolak semua/i })).toBeInTheDocument();
  });

  it('approving single item triggers confirmation, deducts stock, creates goods issue transaction, and sets parent to PARTIALLY_ISSUED', async () => {
    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('SPK-7879')).toBeInTheDocument();
    });

    // Click Approve on the first item (material tes 1)
    const firstItemApproveBtn = screen.getAllByRole('button', { name: /^approve$/i })[0];
    fireEvent.click(firstItemApproveBtn);

    // Confirmation modal should appear with item name
    expect(screen.getByText('Setujui Pengeluaran Item')).toBeInTheDocument();
    expect(screen.getByText(/Apakah Anda yakin ingin menyetujui material "material tes 1"/i)).toBeInTheDocument();

    // Confirm approval
    const confirmBtn = screen.getByRole('button', { name: /Ya, Setujui Item & Keluarkan/i });
    fireEvent.click(confirmBtn);

    // Verify stock deduction on materials
    await waitFor(() => {
      expect(updateMaterialMock).toHaveBeenCalledWith(expect.objectContaining({
        current_stock: 18 // 20 - 2
      }));
    });

    // Verify item status updated to APPROVED
    expect(updateReqItemMock).toHaveBeenCalledWith({ status: 'APPROVED' });

    // Verify transaction recorded in inventory_transactions
    expect(insertTxMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        spk_id: spkId,
        material_id: 'mat-uuid-1',
        quantity_issued: 2,
        requisition_id: 'req-batch-101',
        requisition_item_id: 'item-tes-1'
      })
    ]));

    // Verify parent requisition status updated to PARTIALLY_ISSUED since 1 item remains pending
    expect(updateReqMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 'PARTIALLY_ISSUED'
    }));

    // Feedback modal should appear
    expect(await screen.findByText('Item Disetujui')).toBeInTheDocument();
  });

  it('rejecting single item triggers confirmation and sets item status to REJECTED', async () => {
    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('SPK-7879')).toBeInTheDocument();
    });

    // Click Tolak on the second item (material tes 2)
    const secondItemRejectBtn = screen.getAllByRole('button', { name: /^tolak$/i })[1];
    fireEvent.click(secondItemRejectBtn);

    // Confirmation modal should appear
    expect(screen.getByText('Tolak Item Material')).toBeInTheDocument();
    expect(screen.getByText(/Apakah Anda yakin ingin menolak material "material tes 2"/i)).toBeInTheDocument();

    // Confirm rejection
    const confirmBtn = screen.getByRole('button', { name: /Ya, Tolak Item/i });
    fireEvent.click(confirmBtn);

    // Verify item status updated to REJECTED
    await waitFor(() => {
      expect(updateReqItemMock).toHaveBeenCalledWith({ status: 'REJECTED' });
    });

    // Feedback modal should appear
    expect(await screen.findByText('Item Ditolak')).toBeInTheDocument();
  });

  it('clicking Approve Semua approves all items, deducts stock, and marks requisition COMPLETED', async () => {
    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('SPK-7879')).toBeInTheDocument();
    });

    // Click Approve Semua on card footer
    const approveSemuaBtn = screen.getByRole('button', { name: /approve semua/i });
    fireEvent.click(approveSemuaBtn);

    // Confirmation modal should appear
    expect(screen.getByText('Setujui Semua Permintaan Material')).toBeInTheDocument();
    expect(screen.getByText(/seluruh sisa permintaan material \(2 item\)/i)).toBeInTheDocument();

    // Confirm approval
    const confirmBtn = screen.getByRole('button', { name: /Ya, Setujui & Keluarkan/i });
    fireEvent.click(confirmBtn);

    // Verify item status updated to APPROVED for both items
    await waitFor(() => {
      expect(updateReqItemMock).toHaveBeenCalledTimes(2);
    });

    // Verify parent requisition status updated to COMPLETED
    expect(updateReqMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 'COMPLETED'
    }));

    // Feedback modal should appear
    expect(await screen.findByText('Persetujuan Berhasil')).toBeInTheDocument();
  });

  it('calls RPC approve_single_requisition_item when procedure is available and succeeds', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: { success: true, message: 'Item berhasil disetujui via RPC', remaining_pending: 1 },
      error: null
    } as any);

    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('SPK-7879')).toBeInTheDocument();
    });

    const firstItemApproveBtn = screen.getAllByRole('button', { name: /^approve$/i })[0];
    fireEvent.click(firstItemApproveBtn);

    const confirmBtn = screen.getByRole('button', { name: /Ya, Setujui Item & Keluarkan/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('approve_single_requisition_item', {
        p_requisition_item_id: 'item-tes-1',
        p_approved_by: 'user-wh-123'
      });
    });

    expect(await screen.findByText('Item Disetujui')).toBeInTheDocument();
  });
});
