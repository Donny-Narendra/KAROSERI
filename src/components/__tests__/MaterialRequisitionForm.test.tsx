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
    existingRequisitions: any[] = []
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
            Promise.resolve({ data: [], error: null }).then(fn)
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
      expect(screen.getByText('Alokasi RAB (WBS Terkait)')).toBeInTheDocument();
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

    // The counter badge beside "Alokasi RAB (WBS Terkait)" should be 2 (only the 2 valid materials)
    const headerElement = screen.getByText('Alokasi RAB (WBS Terkait)').closest('div');
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
      const headerElement = screen.getByText('Alokasi RAB (WBS Terkait)').closest('div');
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
    const headerElement = screen.getByText('Alokasi RAB (WBS Terkait)').closest('div');
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

    const headerElement = screen.getByText('Alokasi RAB (WBS Terkait)').closest('div');
    expect(within(headerElement!).getByText('2')).toBeInTheDocument();
  });
});
