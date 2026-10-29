import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MaterialRequisitionForm } from '../MaterialRequisitionForm';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id-123', email: 'mandor@karoseri.com' },
  }),
}));

describe('Component: MaterialRequisitionForm (Strict MATERIAL Filter)', () => {
  const mockSpkId = 'spk-uuid-123';
  const mockWbsCategory = 'Pembongkaran';
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupSupabaseMock = (
    rabItemsData: any[] = [],
    masterMaterials: any[] = [],
    existingRequisitions: any[] = [],
    changeOrderItemsData: any[] = []
  ) => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'new-req-uuid', spk_id: mockSpkId, status: 'PENDING' },
          error: null,
        }),
      }),
    });

    const mockItemsInsert = vi.fn().mockResolvedValue({
      data: [{ id: 'item-uuid-1' }],
      error: null,
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { spk_no: 'SPK/2026/001' },
            error: null,
          }),
        } as any;
      }

      if (table === 'materials') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: masterMaterials,
            error: null,
          }),
        } as any;
      }

      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'rab-est-uuid-1' },
            error: null,
          }),
        } as any;
      }

      if (table === 'rab_items') {
        let currentFiltered = [...rabItemsData];
        const queryObj: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col: string, val: any) => {
            if (col === 'item_type') {
              currentFiltered = currentFiltered.filter((item) => item.item_type === val);
            }
            return queryObj;
          }),
          then: vi.fn().mockImplementation((fn: any) =>
            Promise.resolve({ data: currentFiltered, error: null }).then(fn)
          ),
        };
        return queryObj as any;
      }

      if (table === 'change_order_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: vi.fn().mockImplementation((fn: any) =>
            Promise.resolve({ data: changeOrderItemsData, error: null }).then(fn)
          ),
        } as any;
      }

      if (table === 'spk_borongan') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any;
      }

      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          insert: mockInsert,
          then: vi.fn().mockImplementation((fn: any) =>
            Promise.resolve({ data: existingRequisitions, error: null }).then(fn)
          ),
        } as any;
      }

      if (table === 'material_requisition_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: mockItemsInsert,
          delete: vi.fn().mockReturnThis(),
        } as any;
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      } as any;
    });

    return { mockInsert, mockItemsInsert };
  };

  const sampleMasterMaterials = [
    { id: 'mat-1', name: 'AMPLAS 100', unit: 'lembar', unit_price: 5000, current_stock: 50 },
    { id: 'mat-2', name: 'material tes 2', unit: 'pcs', unit_price: 25000, current_stock: 30 },
  ];

  const sampleMixedRabItems = [
    {
      id: 'rab-item-mat-1',
      description: 'AMPLAS 100',
      item_type: 'MATERIAL',
      quantity: 10,
      unit: 'lembar',
      item_total: 50000,
      unit_price: 5000,
      wbs_category: 'Pembongkaran',
      material_id: 'mat-1',
      materials: { id: 'mat-1', name: 'AMPLAS 100', unit: 'lembar', unit_price: 5000, current_stock: 50 },
    },
    {
      id: 'rab-item-mat-2',
      description: 'material tes 2',
      item_type: 'MATERIAL',
      quantity: 5,
      unit: 'pcs',
      item_total: 125000,
      unit_price: 25000,
      wbs_category: 'Pembongkaran',
      material_id: 'mat-2',
      materials: { id: 'mat-2', name: 'material tes 2', unit: 'pcs', unit_price: 25000, current_stock: 30 },
    },
    {
      id: 'rab-item-labor-tukang',
      description: 'TUKANG RANGKA BAK',
      item_type: 'LABOR',
      quantity: 0.3,
      unit: 'pcs',
      item_total: 300000,
      unit_price: 1000000,
      wbs_category: 'Pembongkaran',
      materials: null,
    },
    {
      id: 'rab-item-unclassified-null',
      description: 'Tukang Borongan Tanpa Tipe',
      item_type: null, // Legacy unclassified item (MUST be excluded)
      quantity: 1,
      unit: 'ls',
      item_total: 250000,
      unit_price: 250000,
      wbs_category: 'Pembongkaran',
      materials: null,
    },
    {
      id: 'rab-item-overhead-1',
      description: 'Listrik',
      item_type: 'OVERHEAD',
      quantity: 1,
      unit: 'bulan',
      item_total: 200000,
      unit_price: 200000,
      wbs_category: 'Pembongkaran',
      materials: null,
    },
  ];

  it('exclusively shows pure MATERIAL items in Alokasi RAB, strictly excluding LABOR (TUKANG RANGKA BAK), OVERHEAD, and null legacy items', async () => {
    setupSupabaseMock(sampleMixedRabItems, sampleMasterMaterials);

    render(
      <MaterialRequisitionForm
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    // Wait for the modal content to finish loading
    await waitFor(() => {
      expect(screen.getByText(/Alokasi RAB \((?:WBS|Tahapan) Terkait\)/i)).toBeInTheDocument();
    });

    // Check that pure MATERIAL items appear
    expect(screen.getByText('AMPLAS 100')).toBeInTheDocument();
    expect(screen.getByText('material tes 2')).toBeInTheDocument();

    // Check that LABOR item (TUKANG RANGKA BAK) DOES NOT appear
    expect(screen.queryByText('TUKANG RANGKA BAK')).not.toBeInTheDocument();

    // Check that unclassified null item DOES NOT appear
    expect(screen.queryByText('Tukang Borongan Tanpa Tipe')).not.toBeInTheDocument();

    // Check that OVERHEAD item (Listrik) DOES NOT appear
    expect(screen.queryByText('Listrik')).not.toBeInTheDocument();

    // The counter badge beside "Alokasi RAB (Tahapan Terkait)" should be 2 (only the 2 valid materials)
    const headerElement = screen.getByText(/Alokasi RAB \((?:WBS|Tahapan) Terkait\)/i).closest('div');
    expect(headerElement).toBeInTheDocument();
    const badge = within(headerElement!).getByText('2');
    expect(badge).toBeInTheDocument();

    // Footer should show "2 item tersisa"
    expect(screen.getByText(/2 item tersisa/i)).toBeInTheDocument();
  });

  it('transfers item to left list on double click and decrements counter badge', async () => {
    setupSupabaseMock(sampleMixedRabItems, sampleMasterMaterials);

    render(
      <MaterialRequisitionForm
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('AMPLAS 100')).toBeInTheDocument();
    });

    // Double-click on "AMPLAS 100" to transfer
    const amplasRow = screen.getByText('AMPLAS 100').closest('div[class*="cursor-pointer"]');
    expect(amplasRow).toBeInTheDocument();
    fireEvent.doubleClick(amplasRow!);

    // Now on the right panel, only "material tes 2" remains, badge should be 1
    await waitFor(() => {
      const headerElement = screen.getByText(/Alokasi RAB \((?:WBS|Tahapan) Terkait\)/i).closest('div');
      expect(within(headerElement!).getByText('1')).toBeInTheDocument();
    });

    // "AMPLAS 100" is now in the left panel ("Daftar Permintaan Material")
    const leftPanel = screen.getByText('Daftar Permintaan Material').closest('.md\\:col-span-5') as HTMLElement;
    expect(leftPanel).toBeInTheDocument();
    expect(within(leftPanel).getByText('AMPLAS 100')).toBeInTheDocument();
    expect(screen.getByText(/Siap mengajukan/i)).toBeInTheDocument();
  });

  it('transfers item using << button and returns item using >> button', async () => {
    setupSupabaseMock(sampleMixedRabItems, sampleMasterMaterials);

    render(
      <MaterialRequisitionForm
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('material tes 2')).toBeInTheDocument();
    });

    // Click on "material tes 2" to highlight it
    const mat2Row = screen.getByText('material tes 2').closest('div[class*="cursor-pointer"]');
    fireEvent.click(mat2Row!);

    // Click << button
    const moveButton = screen.getByTitle('Pindahkan item yang disorot ke Daftar Permintaan (<<)');
    expect(moveButton).not.toBeDisabled();
    fireEvent.click(moveButton);

    // material tes 2 is now in left panel
    await waitFor(() => {
      const leftPanel = screen.getByText('Daftar Permintaan Material').closest('.md\\:col-span-5') as HTMLElement;
      expect(within(leftPanel).getByText('material tes 2')).toBeInTheDocument();
    });

    // Counter badge on right decreases to 1
    const headerElement = screen.getByText(/Alokasi RAB \((?:WBS|Tahapan) Terkait\)/i).closest('div');
    expect(within(headerElement!).getByText('1')).toBeInTheDocument();

    // Now click the returned button >>
    const returnButton = screen.getByTitle('Kembalikan item yang disorot ke Daftar RAB (>>)');
    expect(returnButton).not.toBeDisabled();
    fireEvent.click(returnButton);

    // material tes 2 should be back on right, badge returns to 2
    await waitFor(() => {
      expect(within(headerElement!).getByText('2')).toBeInTheDocument();
    });
  });

  it('submits requisition with transferred physical materials preserving material metadata', async () => {
    const { mockInsert, mockItemsInsert } = setupSupabaseMock(sampleMixedRabItems, sampleMasterMaterials);

    render(
      <MaterialRequisitionForm
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('AMPLAS 100')).toBeInTheDocument();
    });

    // Transfer AMPLAS 100
    const amplasRow = screen.getByText('AMPLAS 100').closest('div[class*="cursor-pointer"]');
    fireEvent.doubleClick(amplasRow!);

    // Wait for transfer to update left panel
    await waitFor(() => {
      expect(screen.getByText(/Submit Requisition \(1 baru\)/i)).toBeInTheDocument();
    });

    // Click Submit Requisition
    const submitBtn = screen.getByText(/Submit Requisition \(1 baru\)/i);
    fireEvent.click(submitBtn);

    // Verify insert into material_requisitions and material_requisition_items
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          spk_id: mockSpkId,
          wbs_category: 'Pembongkaran',
          status: 'PENDING',
        })
      );
      expect(mockItemsInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            material_id: 'mat-1',
            material_name: 'AMPLAS 100',
            quantity: 10,
            unit: 'lembar',
            unit_price: 5000,
          }),
        ])
      );
    });
  });

  it('client-side filter strictly catches and strips LABOR (TUKANG RANGKA BAK), OVERHEAD, and null legacy items even if returned unfiltered by DB query', async () => {
    // Custom mock where rab_items query returns all mixed items (simulating unfiltered raw API response)
    const mockRabQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((fn: any) =>
        Promise.resolve({ data: sampleMixedRabItems, error: null }).then(fn)
      ),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { spk_no: 'SPK/2026/001' }, error: null }),
        } as any;
      }
      if (table === 'materials') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: sampleMasterMaterials, error: null }),
        } as any;
      }
      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'rab-est-uuid-1' }, error: null }),
        } as any;
      }
      if (table === 'rab_items') {
        return mockRabQuery as any;
      }
      if (table === 'change_order_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: vi.fn().mockImplementation((fn: any) => Promise.resolve({ data: [], error: null }).then(fn)),
        } as any;
      }
      if (table === 'spk_borongan') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      }
      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          then: vi.fn().mockImplementation((fn: any) => Promise.resolve({ data: [], error: null }).then(fn)),
        } as any;
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() } as any;
    });

    render(
      <MaterialRequisitionForm
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('AMPLAS 100')).toBeInTheDocument();
      expect(screen.getByText('material tes 2')).toBeInTheDocument();
    });

    // Despite rab_items query returning all mixed items, client-side filter strictly excludes LABOR, OVERHEAD, and null
    expect(screen.queryByText('TUKANG RANGKA BAK')).not.toBeInTheDocument();
    expect(screen.queryByText('Tukang Borongan Tanpa Tipe')).not.toBeInTheDocument();
    expect(screen.queryByText('Listrik')).not.toBeInTheDocument();

    const headerElement = screen.getByText(/Alokasi RAB \((?:WBS|Tahapan) Terkait\)/i).closest('div');
    expect(within(headerElement!).getByText('2')).toBeInTheDocument();
  });

  it('loads approved Change Order materials into available list and submits with change_order_item_id and null rab_item_id', async () => {
    const sampleCoItems = [
      {
        id: 'co-item-uuid-1',
        material_id: null,
        item_name: 'material test 1',
        quantity: 2,
        unit: 'pcs',
        unit_price: 15000,
        cost_price: 12000,
        wbs_stage: 'Pembongkaran',
        item_type: 'MATERIAL',
        change_orders: { status: 'APPROVED', co_number: 'CO-SPK2668-1407' },
      },
    ];

    const { mockInsert, mockItemsInsert } = setupSupabaseMock(
      [], // No RAB items
      sampleMasterMaterials,
      [],
      sampleCoItems
    );

    render(
      <MaterialRequisitionForm
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    // Verify Change Order item appears in available items list
    await waitFor(() => {
      expect(screen.getByText('[CO-SPK2668-1407] material test 1')).toBeInTheDocument();
    });

    // Double click to transfer to requisition list
    const coRow = screen.getByText('[CO-SPK2668-1407] material test 1').closest('div[class*="cursor-pointer"]');
    fireEvent.doubleClick(coRow!);

    // Wait for transfer to update left panel
    await waitFor(() => {
      expect(screen.getByText(/Submit Requisition \(1 baru\)/i)).toBeInTheDocument();
      // Should show [CHANGE ORDER] badge in selected list
      expect(screen.getByText('[CHANGE ORDER]')).toBeInTheDocument();
    });

    // Click Submit Requisition
    const submitBtn = screen.getByText(/Submit Requisition \(1 baru\)/i);
    fireEvent.click(submitBtn);

    // Verify insert into material_requisitions and material_requisition_items
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          spk_id: mockSpkId,
          wbs_category: 'Pembongkaran',
          status: 'PENDING',
        })
      );
      // Critical check: rab_item_id MUST be null, change_order_item_id MUST be set!
      expect(mockItemsInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            material_name: '[CO-SPK2668-1407] material test 1',
            rab_item_id: null,
            change_order_item_id: 'co-item-uuid-1',
            quantity: 2,
            unit: 'pcs',
            unit_price: 15000,
          }),
        ])
      );
    });
  });

  it('segregates rab_item_id and change_order_item_id when submitting both RAB and Change Order items together', async () => {
    const sampleCoItems = [
      {
        id: 'co-item-uuid-1',
        material_id: null,
        item_name: 'material test 1',
        quantity: 2,
        unit: 'pcs',
        unit_price: 15000,
        cost_price: 12000,
        wbs_stage: 'Pembongkaran',
        item_type: 'MATERIAL',
        change_orders: { status: 'APPROVED', co_number: 'CO-SPK2668-1407' },
      },
    ];

    const { mockItemsInsert } = setupSupabaseMock(
      [sampleMixedRabItems[0]], // AMPLAS 100
      sampleMasterMaterials,
      [],
      sampleCoItems
    );

    render(
      <MaterialRequisitionForm
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('AMPLAS 100')).toBeInTheDocument();
      expect(screen.getByText('[CO-SPK2668-1407] material test 1')).toBeInTheDocument();
    });

    // Transfer both items
    const amplasRow = screen.getByText('AMPLAS 100').closest('div[class*="cursor-pointer"]');
    fireEvent.doubleClick(amplasRow!);

    const coRow = screen.getByText('[CO-SPK2668-1407] material test 1').closest('div[class*="cursor-pointer"]');
    fireEvent.doubleClick(coRow!);

    await waitFor(() => {
      expect(screen.getByText(/Submit Requisition \(2 baru\)/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByText(/Submit Requisition \(2 baru\)/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockItemsInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          // RAB item: rab_item_id set, change_order_item_id null
          expect.objectContaining({
            material_name: 'AMPLAS 100',
            rab_item_id: 'rab-item-mat-1',
            change_order_item_id: null,
            quantity: 10,
          }),
          // Change Order item: rab_item_id null, change_order_item_id set
          expect.objectContaining({
            material_name: '[CO-SPK2668-1407] material test 1',
            rab_item_id: null,
            change_order_item_id: 'co-item-uuid-1',
            quantity: 2,
          }),
        ])
      );
    });
  });

  it('hydrates persisted Change Order requisition items on left list with [CHANGE ORDER] badge and excludes them from right list', async () => {
    const sampleCoItems = [
      {
        id: 'co-item-uuid-1',
        material_id: null,
        item_name: 'material test 1',
        quantity: 2,
        unit: 'pcs',
        unit_price: 15000,
        cost_price: 12000,
        wbs_stage: 'Pembongkaran',
        item_type: 'MATERIAL',
        change_orders: { status: 'APPROVED', co_number: 'CO-SPK2668-1407' },
      },
    ];

    const sampleExistingRequisitions = [
      {
        id: 'req-existing-uuid-1',
        wbs_category: 'Pembongkaran',
        status: 'PENDING',
        notes: 'Permintaan CO sebelumnya',
        material_requisition_items: [
          {
            id: 'mri-existing-1',
            material_id: null,
            rab_item_id: null,
            change_order_item_id: 'co-item-uuid-1',
            material_name: '[CO-SPK2668-1407] material test 1',
            quantity: 2,
            unit: 'pcs',
            unit_price: 15000,
            subtotal: 30000,
            wbs_stage: 'Pembongkaran',
            materials: null,
          },
        ],
      },
    ];

    setupSupabaseMock(
      [], // No RAB items
      sampleMasterMaterials,
      sampleExistingRequisitions,
      sampleCoItems
    );

    render(
      <MaterialRequisitionForm
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    // Left panel: The persisted item appears with [CHANGE ORDER] and TERCATAT badge
    await waitFor(() => {
      expect(screen.getByText('[CO-SPK2668-1407] material test 1')).toBeInTheDocument();
      expect(screen.getByText('[CHANGE ORDER]')).toBeInTheDocument();
      expect(screen.getByText('TERCATAT')).toBeInTheDocument();
    });

    // Right panel: The item is excluded from initialAvailable and does not appear on right side
    const rightPanelHeader = screen.getByText(/Alokasi RAB \((?:WBS|Tahapan) Terkait\)/i).closest('div');
    expect(within(rightPanelHeader!).getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Semua material telah dipindahkan')).toBeInTheDocument();
  });

  it('excludes REJECTED requisition items from left panel and restores them to right panel (Alokasi RAB)', async () => {
    const sampleExistingRequisitionsWithRejected = [
      {
        id: 'req-existing-uuid-1',
        wbs_category: 'Pembongkaran',
        status: 'PARTIALLY_ISSUED',
        notes: 'Permintaan sebagian ditolak',
        material_requisition_items: [
          {
            id: 'mri-rejected-1',
            status: 'REJECTED',
            material_id: 'mat-1',
            rab_item_id: 'rab-item-mat-1',
            change_order_item_id: null,
            material_name: 'AMPLAS 100',
            quantity: 10,
            unit: 'lembar',
            unit_price: 5000,
            subtotal: 50000,
            wbs_stage: 'Pembongkaran',
            materials: { id: 'mat-1', name: 'AMPLAS 100', unit: 'lembar', unit_price: 5000, current_stock: 50 },
          },
        ],
      },
    ];

    setupSupabaseMock(
      sampleMixedRabItems,
      sampleMasterMaterials,
      sampleExistingRequisitionsWithRejected
    );

    render(
      <MaterialRequisitionForm
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    // Left panel: Empty because the item was REJECTED
    await waitFor(() => {
      expect(screen.getByText('Belum ada material yang diminta')).toBeInTheDocument();
    });

    // Right panel: The rejected item 'AMPLAS 100' is restored and available in Alokasi RAB
    expect(screen.getByText('AMPLAS 100')).toBeInTheDocument();
    const leftPanelHeader = screen.getByText('Daftar Permintaan Material').closest('div');
    expect(within(leftPanelHeader!).getByText('0')).toBeInTheDocument();
  });
});
