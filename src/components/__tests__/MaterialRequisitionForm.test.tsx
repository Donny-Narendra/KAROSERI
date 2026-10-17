import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MaterialRequisitionForm } from '../MaterialRequisitionForm';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'mandor@test.com' },
    profile: { id: 'test-user-id', full_name: 'Mandor Test', role: 'mandor' },
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

describe('Component: MaterialRequisitionForm (Strict MATERIAL Filter)', () => {
  const mockSpkId = 'spk-uuid-123';
  const mockWbsCategory = 'WBS 1: Pembongkaran';
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupSupabaseMock = (rabItemsData: any[], masterMaterials: any[] = [], existingRequisitions: any[] = []) => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'new-req-uuid-1' },
          error: null,
        }),
      }),
    });

    const mockItemsInsert = vi.fn().mockResolvedValue({ data: [], error: null });

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
        const queryObj: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockImplementation((_condition: string) => {
            // Simulate PostgREST filtering for item_type.eq.MATERIAL,item_type.is.null
            const filtered = rabItemsData.filter(
              (item) => item.item_type === 'MATERIAL' || item.item_type === null || item.item_type === undefined
            );
            return Promise.resolve({ data: filtered, error: null });
          }),
          then: vi.fn().mockImplementation((fn: any) =>
            Promise.resolve({ data: rabItemsData, error: null }).then(fn)
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
    { id: 'mat-2', name: 'Kawat Las RB-26', unit: 'kg', unit_price: 45000, current_stock: 20 },
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
      id: 'rab-item-mat-legacy',
      description: 'Kawat Las RB-26',
      item_type: null, // Legacy unclassified item (treated as MATERIAL)
      quantity: 2,
      unit: 'kg',
      item_total: 90000,
      unit_price: 45000,
      wbs_category: 'Pembongkaran',
      material_id: 'mat-2',
      materials: { id: 'mat-2', name: 'Kawat Las RB-26', unit: 'kg', unit_price: 45000, current_stock: 20 },
    },
    {
      id: 'rab-item-labor-1',
      description: 'materias tes tukang 1',
      item_type: 'LABOR',
      quantity: 1,
      unit: 'hari',
      item_total: 150000,
      unit_price: 150000,
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

  it('exclusively shows MATERIAL items (and legacy null items) in Alokasi RAB, excluding LABOR and OVERHEAD', async () => {
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

    // Check that MATERIAL item (AMPLAS 100) appears
    expect(screen.getByText('AMPLAS 100')).toBeInTheDocument();

    // Check that legacy null item (Kawat Las RB-26) appears
    expect(screen.getByText('Kawat Las RB-26')).toBeInTheDocument();

    // Check that LABOR item (materias tes tukang 1) DOES NOT appear
    expect(screen.queryByText('materias tes tukang 1')).not.toBeInTheDocument();

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

    // Now on the right panel, only "Kawat Las RB-26" remains, badge should be 1
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
      expect(screen.getByText('Kawat Las RB-26')).toBeInTheDocument();
    });

    // Click on "Kawat Las RB-26" to highlight it
    const kawatRow = screen.getByText('Kawat Las RB-26').closest('div[class*="cursor-pointer"]');
    fireEvent.click(kawatRow!);

    // Click << button
    const moveButton = screen.getByTitle('Pindahkan item yang disorot ke Daftar Permintaan (<<)');
    expect(moveButton).not.toBeDisabled();
    fireEvent.click(moveButton);

    // Kawat Las is now in left panel
    await waitFor(() => {
      const leftPanel = screen.getByText('Daftar Permintaan Material').closest('.md\\:col-span-5') as HTMLElement;
      expect(within(leftPanel).getByText('Kawat Las RB-26')).toBeInTheDocument();
    });

    // Counter badge on right decreases to 1
    const headerElement = screen.getByText('Alokasi RAB (WBS Terkait)').closest('div');
    expect(within(headerElement!).getByText('1')).toBeInTheDocument();

    // Now click the returned button >>
    const returnButton = screen.getByTitle('Kembalikan item yang disorot ke Daftar RAB (>>)');
    expect(returnButton).not.toBeDisabled();
    fireEvent.click(returnButton);

    // Kawat Las should be back on right, badge returns to 2
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

  it('client-side filter strictly catches and strips LABOR and OVERHEAD if returned by query', async () => {
    // Custom mock where .or does NOT filter, returning all records to simulate raw client-side defense
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
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ data: sampleMixedRabItems, error: null }), // returns unfiltered
        } as any;
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
    });

    // Despite rab_items query returning all mixed items, client-side filter excludes LABOR & OVERHEAD
    expect(screen.queryByText('materias tes tukang 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Listrik')).not.toBeInTheDocument();

    const headerElement = screen.getByText('Alokasi RAB (WBS Terkait)').closest('div');
    expect(within(headerElement!).getByText('2')).toBeInTheDocument();
  });
});

