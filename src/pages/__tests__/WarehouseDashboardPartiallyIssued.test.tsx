import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WarehouseDashboard } from '../WarehouseDashboard';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-wh-101', email: 'gudang@robelkaroseri.com' },
    profile: { id: 'user-wh-101', full_name: 'Budi Gudang', role: 'petugas_gudang' },
    signOut: vi.fn(),
  }),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock child components that are not under direct test to keep dashboard tests light
vi.mock('../../components/GoodsIssueForm', () => ({
  GoodsIssueForm: () => <div data-testid="goods-issue-form">GoodsIssueForm</div>,
}));

vi.mock('../../components/GoodsReturnForm', () => ({
  GoodsReturnForm: () => <div data-testid="goods-return-form">GoodsReturnForm</div>,
}));

vi.mock('../../components/InventoryManager', () => ({
  InventoryManager: () => <div data-testid="inventory-manager">InventoryManager</div>,
}));

vi.mock('../../components/PackageManager', () => ({
  PackageManager: () => <div data-testid="package-manager">PackageManager</div>,
}));

vi.mock('../../components/RecentMaterialIssues', () => ({
  RecentMaterialIssues: () => <div data-testid="recent-material-issues">RecentMaterialIssues</div>,
}));

vi.mock('../../components/RecentApprovedMaterials', () => ({
  RecentApprovedMaterials: () => <div data-testid="recent-approved-materials">RecentApprovedMaterials</div>,
}));

vi.mock('../../components/RequisitionApproval', () => ({
  RequisitionApproval: ({ onSpkSummaryChange }: any) => {
    // Simulate RequisitionApproval mounting and reporting summary to dashboard
    return (
      <div data-testid="requisition-approval-mock">
        <button
          onClick={() => {
            onSpkSummaryChange?.([
              {
                spkId: 'spk-uuid-7080',
                spkNo: 'SPK-7080',
                customerName: 'PT Mitra Tangki Abadi',
                vehiclePlate: 'B 7080 KRO',
                subTasks: ['Bongkar Tangki'],
                count: 2
              }
            ]);
          }}
        >
          Simulate Summary Change
        </button>
      </div>
    );
  },
}));

describe('Page: WarehouseDashboard (Requisition Query & Sidebar Counter Integration)', () => {
  const mockRequisitionsData = [
    {
      id: 'req-7080',
      spk_id: 'spk-uuid-7080',
      status: 'PARTIALLY_ISSUED',
      wbs_category: 'Pembongkaran',
      spk: {
        id: 'spk-uuid-7080',
        spk_no: 'SPK-7080',
        customer_name: 'PT Mitra Tangki Abadi',
        vehicle_plate: 'B 7080 KRO',
        sub_tasks: ['Bongkar Tangki']
      },
      material_requisition_items: [
        { id: 'item-1', status: 'APPROVED', quantity: 5 },
        { id: 'item-2', status: 'PENDING', quantity: 50 },
        { id: 'item-3', status: 'PENDING', quantity: 10 }
      ]
    },
    {
      id: 'req-1020',
      spk_id: 'spk-uuid-1020',
      status: 'PENDING',
      wbs_category: 'Fabrikasi',
      spk: {
        id: 'spk-uuid-1020',
        spk_no: 'SPK-1020',
        customer_name: 'CV Armada Sukses',
        vehicle_plate: 'L 1020 AS',
        sub_tasks: ['Rangka Bawah']
      },
      material_requisition_items: [
        { id: 'item-4', status: 'PENDING', quantity: 12 }
      ]
    },
    {
      id: 'req-9999',
      spk_id: 'spk-uuid-9999',
      status: 'PARTIALLY_ISSUED',
      wbs_category: 'Finishing',
      spk: {
        id: 'spk-uuid-9999',
        spk_no: 'SPK-9999',
        customer_name: 'PT Selesai',
        vehicle_plate: 'B 9999 FIN'
      },
      material_requisition_items: [
        { id: 'item-5', status: 'APPROVED', quantity: 1 },
        { id: 'item-6', status: 'REJECTED', quantity: 2 }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockImplementation((col: string, values: string[]) => {
              if (col === 'status') {
                expect(values).toContain('PENDING');
                expect(values).toContain('PARTIALLY_ISSUED');
                return {
                  order: vi.fn().mockResolvedValue({
                    data: mockRequisitionsData,
                    error: null
                  })
                };
              }
              return { order: vi.fn().mockResolvedValue({ data: [], error: null }) };
            })
          })
        } as any;
      }

      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      } as any;
    });
  });

  it('fetches requisitions with PENDING and PARTIALLY_ISSUED status and calculates pending items counter', async () => {
    render(<WarehouseDashboard />);

    // Total pending items = 2 (SPK-7080) + 1 (SPK-1020) + 0 (SPK-9999 has no pending items) = 3
    await waitFor(() => {
      // SPK-7080 with 2 pending items
      expect(screen.getByText('SPK-7080')).toBeInTheDocument();
      expect(screen.getByText('2 Pending')).toBeInTheDocument();

      // SPK-1020 with 1 pending item
      expect(screen.getByText('SPK-1020')).toBeInTheDocument();
      expect(screen.getByText('1 Pending')).toBeInTheDocument();

      // SPK-9999 has 0 pending items, so it should NOT be in the sidebar
      expect(screen.queryByText('SPK-9999')).not.toBeInTheDocument();
    });

    // Sidebar "Semua SPK" should display total 3 pending items
    expect(screen.getByText('3 Pending')).toBeInTheDocument();
  });
});
