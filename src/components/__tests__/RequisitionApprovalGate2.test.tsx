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

describe('Component: RequisitionApproval (Quantity-Based Gate 2 & Non-Blocking HPP Variance)', () => {
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
      total_estimated_cost: 2415000,
    },
    profiles: {
      full_name: 'Mandor WBS',
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
        wbs_stage: 'Pembongkaran',
      },
    ],
  };

  const mockRabEstimation = {
    spk_id: spkId,
    total_material_cost: 265000,
    total_labor_cost: 1900000,
    total_overhead_cost: 250000,
    total_estimated_cost: 2415000,
    rab_items: [
      {
        id: 'ca7e1cb3-fbe7-4e24-b8c9-97e1e6bcf968',
        description: 'material tes 2',
        quantity: 1,
        unit_price: 55000,
        cost_price: 44000,
        item_total: 55000,
        wbs_category: 'Pembongkaran',
        wbs_stage: 'WBS 1: Pembongkaran',
        item_type: 'MATERIAL',
      },
      {
        id: 'lab-wbs-1',
        description: 'TUKANG RANGKA BAK',
        quantity: 0.3,
        unit_price: 1000000,
        cost_price: 1000000,
        item_total: 300000,
        wbs_category: 'Pembongkaran',
        wbs_stage: 'WBS 1: Pembongkaran',
        item_type: 'LABOR',
      },
      {
        id: 'oh-wbs-1',
        description: 'LISTRIK',
        quantity: 0.2,
        unit_price: 150000,
        cost_price: 150000,
        item_total: 30000,
        wbs_category: 'Pembongkaran',
        wbs_stage: 'WBS 1: Pembongkaran',
        item_type: 'OVERHEAD',
      },
      {
        id: 'mat-wbs-2',
        description: 'material tes 2',
        quantity: 1,
        unit_price: 55000,
        cost_price: 44000,
        item_total: 55000,
        wbs_category: 'Sasis/Rangka',
        wbs_stage: 'WBS 2: Sasis/Rangka',
        item_type: 'MATERIAL',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupSupabaseMock = (
    pendingReqs: any[] = [mockPendingRequisitionWbs1],
    approvedReqs: any[] = [],
    rabEstimation: any = mockRabEstimation,
    masterMaterials: any[] = [
      { id: 'mat-1', name: 'material tes 2', unit: 'pcs', unit_price: 55000, cost_price: 44000, current_stock: 10 },
    ]
  ) => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation((_col: string, val: string) => {
              if (val === 'PENDING') {
                return {
                  order: vi.fn().mockResolvedValue({
                    data: pendingReqs,
                    error: null,
                  }),
                };
              }
              if (val === 'APPROVED') {
                return Promise.resolve({
                  data: approvedReqs,
                  error: null,
                });
              }
              return Promise.resolve({ data: [], error: null });
            }),
            in: vi.fn().mockImplementation((col: string) => {
              if (col === 'status') {
                return {
                  order: vi.fn().mockResolvedValue({
                    data: pendingReqs,
                    error: null,
                  }),
                };
              }
              return {
                eq: vi.fn().mockResolvedValue({
                  data: approvedReqs,
                  error: null,
                }),
                in: vi.fn().mockResolvedValue({
                  data: approvedReqs,
                  error: null,
                }),
              };
            }),
          })),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        } as any;
      }

      if (table === 'material_requisition_items') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        } as any;
      }

      if (table === 'materials') {
        return {
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockResolvedValue({
                data: masterMaterials[0],
                error: null,
              }),
            })),
            then: (resolve: any) =>
              resolve({
                data: masterMaterials,
                error: null,
              }),
          })),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        } as any;
      }

      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [rabEstimation],
              error: null,
            }),
          }),
        } as any;
      }

      if (table === 'inventory_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      }

      if (table === 'change_orders') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
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

  it('Sub-kondisi 1A: renders green Qty-compliant banner and active Approve buttons when Qty and HPP match RAB', async () => {
    setupSupabaseMock();

    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('SPK-2668')).toBeInTheDocument();
    });

    const safeBanner = await screen.findByText(/Kuota Kuantitas Sesuai RAB \(Pembongkaran\): 1 \/ 1 pcs \(Aman untuk dirilis\)\./i);
    expect(safeBanner).toBeInTheDocument();

    expect(screen.queryByText(/PERINGATAN GATE 2 \(OVER QUOTA KUANTITAS\):/i)).not.toBeInTheDocument();

    const approveSemuaButton = screen.getByRole('button', { name: /approve semua/i });
    expect(approveSemuaButton).toBeEnabled();
    expect(approveSemuaButton).toHaveClass('bg-primary');

    const itemApproveBtn = screen.getByRole('button', { name: /rilis \/ approve/i });
    expect(itemApproveBtn).toBeEnabled();
    expect(itemApproveBtn).toHaveClass('bg-emerald-600');
  });

  it('Sub-kondisi 1B (SPK-3538 Pendempulan): shows non-blocking sky-blue audit info banner and keeps Approve buttons ACTIVE when supplier HPP rises but Qty matches RAB', async () => {
    const spk3538Req = {
      id: 'req-3538-dempul',
      spk_id: spkId,
      wbs_category: 'Dinding/Fabrikasi',
      status: 'PENDING',
      created_at: '2026-11-18T08:00:00Z',
      spk: {
        id: spkId,
        spk_no: 'SPK-3538',
        customer_name: 'PT Logistik Nusantara',
      },
      profiles: { full_name: 'Mandor 3' },
      material_requisition_items: [
        {
          id: 'item-dempul-1',
          material_id: 'mat-dempul',
          rab_item_id: 'rab-dempul-3538',
          material_name: 'Dempul Pendempulan',
          quantity: 1,
          unit: 'set',
          unit_price: 330555,
          subtotal: 330555,
          wbs_stage: 'WBS 3: Dinding/Fabrikasi',
          materials: { id: 'mat-dempul', name: 'Dempul Pendempulan', unit: 'set', unit_price: 330555, cost_price: 330555 },
        },
      ],
    };

    const spk3538Rab = {
      spk_id: spkId,
      rab_items: [
        {
          id: 'rab-dempul-3538',
          material_id: 'mat-dempul',
          description: 'Dempul Pendempulan',
          quantity: 1,
          cost_price: 264444, // Initial RAB HPP
          unit_price: 290000,
          item_total: 290000,
          wbs_category: 'Dinding/Fabrikasi',
          wbs_stage: 'WBS 3: Dinding/Fabrikasi',
          item_type: 'MATERIAL',
        },
      ],
    };

    const masters = [
      { id: 'mat-dempul', name: 'Dempul Pendempulan', unit: 'set', unit_price: 330555, cost_price: 330555, current_stock: 5 },
    ];

    setupSupabaseMock([spk3538Req], [], spk3538Rab, masters);

    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('SPK-3538')).toBeInTheDocument();
    });

    // Must display sky-blue info banner (NOT red danger)
    const infoBanner = await screen.findByText(/Kuantitas Sesuai Kuota RAB \(1 \/ 1 set\)\. Catatan Audit: Terjadi penyesuaian harga HPP gudang \(\+Rp 66\.111\) dari estimasi awal RAB\./i);
    expect(infoBanner).toBeInTheDocument();
    expect(screen.queryByText(/PERINGATAN GATE 2 \(OVER QUOTA KUANTITAS\):/i)).not.toBeInTheDocument();

    // Both Approve Semua and item Rilis / Approve MUST be enabled and clickable
    const approveSemuaButton = screen.getByRole('button', { name: /approve semua/i });
    expect(approveSemuaButton).toBeEnabled();
    expect(approveSemuaButton).toHaveClass('bg-primary');

    const itemApproveBtn = screen.getByRole('button', { name: /rilis \/ approve/i });
    expect(itemApproveBtn).toBeEnabled();
    expect(itemApproveBtn).toHaveClass('bg-emerald-600');
  });

  it('Kondisi 2: displays red Gate 2 Over Quota banner and HARD-LOCKS Approve buttons when requested Qty exceeds RAB quota', async () => {
    // Requesting 2 pcs while RAB quota is 1 pcs
    const overQuotaReq = {
      ...mockPendingRequisitionWbs1,
      id: 'req-overquota',
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
          wbs_stage: 'Pembongkaran',
        },
      ],
    };

    setupSupabaseMock([overQuotaReq]);

    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('SPK-2668')).toBeInTheDocument();
    });

    const warningAlert = await screen.findByText(/PERINGATAN GATE 2 \(OVER QUOTA KUANTITAS\):/i);
    expect(warningAlert).toBeInTheDocument();
    expect(screen.getByText(/MELEBIHI kuota RAB \(1 pcs\) sebesar \+1 pcs/i)).toBeInTheDocument();

    // Hard-Gate: Both Approve Semua and item Rilis / Approve MUST be disabled
    const approveSemuaButton = screen.getByRole('button', { name: /approve semua/i });
    expect(approveSemuaButton).toBeDisabled();

    const itemApproveBtn = screen.getByRole('button', { name: /rilis \/ approve/i });
    expect(itemApproveBtn).toBeDisabled();
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
          status: 'APPROVED',
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
          status: 'PENDING',
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
          status: 'REJECTED',
        },
      ],
    };

    const rabPartial = {
      spk_id: spkId,
      rab_items: [
        { id: 'r1', material_id: 'mat-1', description: 'Plat Besi 2mm', quantity: 5, cost_price: 100000, wbs_stage: 'Pembongkaran', item_type: 'MATERIAL' },
        { id: 'r2', material_id: 'mat-2', description: 'Baut Hex M10', quantity: 50, cost_price: 2000, wbs_stage: 'Pembongkaran', item_type: 'MATERIAL' },
        { id: 'r3', material_id: 'mat-3', description: 'Kabel Ties', quantity: 10, cost_price: 15000, wbs_stage: 'Pembongkaran', item_type: 'MATERIAL' },
      ],
    };

    setupSupabaseMock([multiItemPartialReq], [], rabPartial, [
      { id: 'mat-1', name: 'Plat Besi 2mm', unit: 'lbr', cost_price: 100000, unit_price: 100000, current_stock: 10 },
      { id: 'mat-2', name: 'Baut Hex M10', unit: 'pcs', cost_price: 2000, unit_price: 2000, current_stock: 100 },
      { id: 'mat-3', name: 'Kabel Ties', unit: 'pack', cost_price: 15000, unit_price: 15000, current_stock: 20 },
    ]);

    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('SPK-2668')).toBeInTheDocument();
    });

    expect(screen.getByText(/PARSIAL \(Sisa 1 Item Belum Disetujui\)/i)).toBeInTheDocument();
    expect(screen.getByText(/✓ Dirilis/i)).toBeInTheDocument();
    expect(screen.getByText(/✕ Ditolak/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rilis \/ approve/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /tolak \/ hold/i })).toBeInTheDocument();
    expect(screen.getByText(/Subtotal yang Sudah Dirilis:/i)).toBeInTheDocument();
    expect(screen.getByText(/Subtotal Belum Dirilis \(Pending\):/i)).toBeInTheDocument();
  });
});
