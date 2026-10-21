import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { SpkBoronganPanel } from '../SpkBoronganPanel';
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

describe('Component: SpkBoronganPanel (Strict LABOR Filter)', () => {
  const mockSpkId = 'spk-uuid-123';
  const mockWbsCategory = 'WBS 1: Pembongkaran';
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupSupabaseMock = (
    rabItemsData: any[], 
    existingAssignments: any[] = [],
    changeOrderItemsData: any[] = []
  ) => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              spk_no: 'SPK/2026/001',
              customer_name: 'PT Karoseri Hebat',
              vehicle_plate: 'B 1234 XYZ',
            },
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

      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          then: vi.fn().mockImplementation((fn: any) =>
            Promise.resolve({ data: [], error: null }).then(fn)
          ),
        } as any;
      }

      if (table === 'spk_borongan') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockResolvedValue({
            data: existingAssignments,
            error: null,
          }),
          then: vi.fn().mockImplementation((fn: any) =>
            Promise.resolve({ data: existingAssignments, error: null }).then(fn)
          ),
        } as any;
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

      if (table === 'rab_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col: string, val: any) => {
            if (col === 'item_type') {
              const filtered = rabItemsData.filter((i) => i.item_type === val);
              return Promise.resolve({ data: filtered, error: null });
            }
            return {
              eq: vi.fn().mockImplementation((subCol: string, subVal: any) => {
                if (subCol === 'item_type') {
                  const filtered = rabItemsData.filter((i) => i.item_type === subVal);
                  return Promise.resolve({ data: filtered, error: null });
                }
                return Promise.resolve({ data: rabItemsData, error: null });
              }),
            };
          }),
        } as any;
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      } as any;
    });
  };

  it('exclusively shows LABOR items and queries with item_type = "LABOR", filtering out MATERIAL & Overhead', async () => {
    const mixedRabItems = [
      {
        id: 'rab-item-labor-1',
        description: 'Jasa Las Rangka Karoseri',
        item_type: 'LABOR',
        quantity: 1,
        unit: 'lot',
        item_total: 850000,
        unit_price: 850000,
        wbs_category: 'Pembongkaran',
        materials: null,
      },
      {
        id: 'rab-item-mat-1',
        description: 'AMPLAS 100',
        item_type: 'MATERIAL',
        quantity: 10,
        unit: 'lembar',
        item_total: 50000,
        unit_price: 5000,
        wbs_category: 'Pembongkaran',
        materials: { id: 'mat-1', name: 'AMPLAS 100', unit: 'lembar', unit_price: 5000 },
      },
      {
        id: 'rab-item-overhead-1',
        description: 'Listrik & Utilitas Bengkel',
        item_type: 'MATERIAL',
        quantity: 1,
        unit: 'lot',
        item_total: 200000,
        unit_price: 200000,
        wbs_category: 'Pembongkaran',
        materials: null,
      },
    ];

    setupSupabaseMock(mixedRabItems);

    render(
      <SpkBoronganPanel
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Jasa Las Rangka Karoseri')).toBeInTheDocument();
    });

    // Material and Overhead MUST NOT be displayed
    expect(screen.queryByText('AMPLAS 100')).not.toBeInTheDocument();
    expect(screen.queryByText('Listrik & Utilitas Bengkel')).not.toBeInTheDocument();

    // Verify header and badge
    expect(screen.getByText('Panduan Pagu Jasa / Pekerjaan (RAB)')).toBeInTheDocument();
    expect(screen.getByText('Khusus Jasa / Borongan')).toBeInTheDocument();
    expect(screen.getByText('1 Tersedia')).toBeInTheDocument();
    expect(screen.getByText('Pagu Jasa/Pekerjaan Tersedia:')).toBeInTheDocument();
  });

  it('auto-fills "Tugas / Uraian Pekerjaan" and "Nilai Kontrak Borongan (Rp)" when clicking "<<"', async () => {
    const laborItems = [
      {
        id: 'rab-item-labor-2',
        description: 'materias tes tukang 1',
        item_type: 'LABOR',
        quantity: 1,
        unit: 'lot',
        item_total: 500000,
        unit_price: 500000,
        wbs_category: 'Pembongkaran',
        materials: null,
      },
      {
        id: 'rab-item-labor-3',
        description: 'Jasa Ketok Pintu Depan',
        item_type: 'LABOR',
        quantity: 2,
        unit: 'pintu',
        item_total: 600000,
        unit_price: 300000,
        wbs_category: 'Pembongkaran',
        materials: null,
      },
    ];

    setupSupabaseMock(laborItems);

    render(
      <SpkBoronganPanel
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('materias tes tukang 1')).toBeInTheDocument();
      expect(screen.getByText('Jasa Ketok Pintu Depan')).toBeInTheDocument();
    });

    expect(screen.getByText('2 Tersedia')).toBeInTheDocument();

    // Click transfer "<<" on "materias tes tukang 1"
    const transferButtons = screen.getAllByTitle("Pindahkan ke form penugasan (<<)");
    expect(transferButtons.length).toBe(2);

    fireEvent.click(transferButtons[0]);

    // Check taskDescription and contractValue form inputs
    const taskInput = screen.getByPlaceholderText('Contoh: TUKANG LAS DUDUKAN SLEBOR...') as HTMLTextAreaElement;
    expect(taskInput.value).toBe('materias tes tukang 1');

    const contractInput = screen.getByPlaceholderText('0') as HTMLInputElement;
    expect(contractInput.value).toBe('500000');

    // The transferred item is hidden from the list, counter becomes 1
    expect(screen.getByText('1 Tersedia')).toBeInTheDocument();
    expect(screen.getByText('Auto-Fill RAB')).toBeInTheDocument();

    // Click Reset
    const resetButton = screen.getByTitle('Batal transfer & kembalikan item ke Panduan Pagu Jasa / Pekerjaan');
    fireEvent.click(resetButton);

    // Form inputs cleared and item restored
    expect(taskInput.value).toBe('');
    expect(contractInput.value).toBe('');
    expect(screen.getByText('2 Tersedia')).toBeInTheDocument();
  });

  it('renders clean empty state when no labor items exist for WBS stage', async () => {
    setupSupabaseMock([]);

    render(
      <SpkBoronganPanel
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Tidak ada pagu pekerjaan/jasa tersisa untuk WBS ini.')).toBeInTheDocument();
    });

    expect(screen.getByText('0 Tersedia')).toBeInTheDocument();
  });

  it('filters labor items by text search input', async () => {
    const laborItems = [
      {
        id: 'rab-item-labor-1',
        description: 'Tukang Las Chasis',
        item_type: 'LABOR',
        quantity: 1,
        unit: 'lot',
        item_total: 750000,
        unit_price: 750000,
        wbs_category: 'Pembongkaran',
      },
      {
        id: 'rab-item-labor-2',
        description: 'Tukang Dempul Halus',
        item_type: 'LABOR',
        quantity: 1,
        unit: 'lot',
        item_total: 400000,
        unit_price: 400000,
        wbs_category: 'Pembongkaran',
      },
    ];

    setupSupabaseMock(laborItems);

    render(
      <SpkBoronganPanel
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Tukang Las Chasis')).toBeInTheDocument();
      expect(screen.getByText('Tukang Dempul Halus')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Cari nama pekerjaan/jasa...');
    fireEvent.change(searchInput, { target: { value: 'Chasis' } });

    expect(screen.getByText('Tukang Las Chasis')).toBeInTheDocument();
    expect(screen.queryByText('Tukang Dempul Halus')).not.toBeInTheDocument();
    expect(screen.getByText('1 Tersedia')).toBeInTheDocument();
  });

  it('excludes labor items that are already actively assigned in spk_borongan', async () => {
    const laborItems = [
      {
        id: 'rab-item-labor-assigned',
        description: 'Pekerjaan Kelistrikan Body',
        item_type: 'LABOR',
        quantity: 1,
        unit: 'lot',
        item_total: 900000,
        unit_price: 900000,
        wbs_category: 'Pembongkaran',
      },
      {
        id: 'rab-item-labor-free',
        description: 'Pekerjaan Plafon Interior',
        item_type: 'LABOR',
        quantity: 1,
        unit: 'lot',
        item_total: 350000,
        unit_price: 350000,
        wbs_category: 'Pembongkaran',
      },
    ];

    const activeAssignments = [
      {
        id: 'spk-b-1',
        worker_name: 'Pak Slamet Listrik',
        task_description: 'Pekerjaan Kelistrikan Body',
        contract_value: 900000,
        status: 'ACTIVE',
        rab_item_id: 'rab-item-labor-assigned',
        wbs_category: 'Pembongkaran',
        created_at: new Date().toISOString(),
      },
    ];

    setupSupabaseMock(laborItems, activeAssignments);

    render(
      <SpkBoronganPanel
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(within(table).getByText('Pekerjaan Plafon Interior')).toBeInTheDocument();
      expect(within(table).queryByText('Pekerjaan Kelistrikan Body')).not.toBeInTheDocument();
    });

    // The assigned labor item should be excluded from available list (1 remaining)
    expect(screen.getByText('1 Tersedia')).toBeInTheDocument();
  });

  it('merges approved Change Order LABOR items into the guide panel with [CO] badge and auto-fills assignment form when transferred', async () => {
    const mockCoLaborItems = [
      {
        id: 'co-labor-item-1',
        change_order_id: 'co-hdr-1',
        spk_id: mockSpkId,
        item_name: 'Jasa Las Tambahan Dudukan Slebor',
        quantity: 1,
        unit: 'lot',
        unit_price: 350000,
        subtotal: 350000,
        wbs_stage: 'Pembongkaran',
        item_type: 'LABOR',
        change_orders: { status: 'APPROVED', co_number: 'CO-001' },
      },
    ];

    let capturedInsertPayload: any = null;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              spk_no: 'SPK/2026/001',
              customer_name: 'PT Karoseri Hebat',
              vehicle_plate: 'B 1234 XYZ',
            },
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

      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          then: vi.fn().mockImplementation((fn: any) =>
            Promise.resolve({ data: [], error: null }).then(fn)
          ),
        } as any;
      }

      if (table === 'spk_borongan') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockImplementation((payload: any) => {
            capturedInsertPayload = payload;
            return Promise.resolve({ data: null, error: null });
          }),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
          then: vi.fn().mockImplementation((fn: any) =>
            Promise.resolve({ data: [], error: null }).then(fn)
          ),
        } as any;
      }

      if (table === 'change_order_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: vi.fn().mockImplementation((fn: any) =>
            Promise.resolve({ data: mockCoLaborItems, error: null }).then(fn)
          ),
        } as any;
      }

      if (table === 'rab_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        } as any;
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      } as any;
    });

    render(
      <SpkBoronganPanel
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    // Verify [CO] badge and item name appear in guide table
    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(within(table).getByText('[CO]')).toBeInTheDocument();
      expect(within(table).getByText('Jasa Las Tambahan Dudukan Slebor')).toBeInTheDocument();
      expect(within(table).getByText(/Rp\s*350\.000/i)).toBeInTheDocument();
    });

    // Transfer item via transfer button (<<)
    const transferBtn = screen.getByTitle("Pindahkan ke form penugasan (<<)");
    fireEvent.click(transferBtn);

    // Form inputs should be filled
    expect(screen.getByText('Auto-Fill Change Order')).toBeInTheDocument();
    const taskInput = screen.getByPlaceholderText(/Contoh: TUKANG LAS DUDUKAN SLEBOR/i) as HTMLTextAreaElement;
    expect(taskInput.value).toBe('[CO] Jasa Las Tambahan Dudukan Slebor');

    const contractInput = screen.getByPlaceholderText('0') as HTMLInputElement;
    expect(contractInput.value).toBe('350000');

    // Fill worker name and submit
    const workerInput = screen.getByPlaceholderText(/Contoh: Adi Las, Budi Ketok/i);
    fireEvent.change(workerInput, { target: { value: 'Budi Santoso' } });

    const submitBtn = screen.getByRole('button', { name: /Buat SPK Borongan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(capturedInsertPayload).not.toBeNull();
      expect(capturedInsertPayload).toEqual(
        expect.objectContaining({
          spk_id: mockSpkId,
          wbs_category: 'Pembongkaran',
          worker_name: 'Budi Santoso',
          task_description: '[CO] Jasa Las Tambahan Dudukan Slebor',
          contract_value: 350000,
          status: 'ACTIVE',
          rab_item_id: null,
          change_order_item_id: 'co-labor-item-1',
        })
      );
    });
  });

  it('excludes approved Change Order LABOR items that are already assigned via change_order_item_id', async () => {
    const mockCoLaborItems = [
      {
        id: 'co-labor-assigned-1',
        change_order_id: 'co-hdr-1',
        spk_id: mockSpkId,
        item_name: 'Jasa Las Tambahan Dudukan Slebor',
        quantity: 1,
        unit: 'lot',
        unit_price: 350000,
        subtotal: 350000,
        wbs_stage: 'Pembongkaran',
        item_type: 'LABOR',
        change_orders: { status: 'APPROVED', co_number: 'CO-001' },
      },
    ];

    const activeAssignments = [
      {
        id: 'spk-b-assigned-1',
        worker_name: 'Budi Santoso',
        task_description: '[CO] Jasa Las Tambahan Dudukan Slebor',
        contract_value: 350000,
        status: 'ACTIVE',
        change_order_item_id: 'co-labor-assigned-1',
        rab_item_id: null,
        wbs_category: 'Pembongkaran',
        created_at: new Date().toISOString(),
      },
    ];

    setupSupabaseMock([], activeAssignments, mockCoLaborItems);

    render(
      <SpkBoronganPanel
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    // The assigned Change Order item should be excluded from available list (0 Tersedia)
    await waitFor(() => {
      expect(screen.getByText('0 Tersedia')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByText('Tidak ada pagu pekerjaan/jasa tersisa untuk WBS ini.')).toBeInTheDocument();
    });
  });

  it('renders "Tenggat Waktu / Tanggal Deadline Pengerjaan" input on new assignment form and persists deadline_date in insert payload', async () => {
    let capturedInsertPayload: any = null;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              spk_no: 'SPK/2026/001',
              customer_name: 'PT Karoseri Hebat',
              vehicle_plate: 'B 1234 XYZ',
            },
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

      if (table === 'material_requisitions' || table === 'change_order_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          then: vi.fn().mockImplementation((fn: any) =>
            Promise.resolve({ data: [], error: null }).then(fn)
          ),
        } as any;
      }

      if (table === 'spk_borongan') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockImplementation((payload: any) => {
            capturedInsertPayload = payload;
            return Promise.resolve({ data: null, error: null });
          }),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
          then: vi.fn().mockImplementation((fn: any) =>
            Promise.resolve({ data: [], error: null }).then(fn)
          ),
        } as any;
      }

      if (table === 'rab_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        } as any;
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      } as any;
    });

    render(
      <SpkBoronganPanel
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    // Wait for initial load to finish
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Buat SPK Borongan/i })).toBeInTheDocument();
    });

    // Verify deadline input is present
    const deadlineLabel = screen.getByText('Tenggat Waktu / Tanggal Deadline Pengerjaan');
    expect(deadlineLabel).toBeInTheDocument();

    const deadlineInput = screen.getByLabelText(/Tenggat Waktu \/ Tanggal Deadline Pengerjaan/i) as HTMLInputElement;
    expect(deadlineInput).toBeInTheDocument();
    expect(deadlineInput.type).toBe('date');

    // Fill form fields
    const workerInput = screen.getByPlaceholderText(/Contoh: Adi Las, Budi Ketok/i);
    fireEvent.change(workerInput, { target: { value: 'Joko Las' } });

    const taskInput = screen.getByPlaceholderText(/Contoh: TUKANG LAS DUDUKAN SLEBOR/i);
    fireEvent.change(taskInput, { target: { value: 'Pengelasan Sasis Utama' } });

    const contractInput = screen.getByPlaceholderText('0');
    fireEvent.change(contractInput, { target: { value: '1250000' } });

    fireEvent.change(deadlineInput, { target: { value: '2026-10-30' } });
    expect(deadlineInput.value).toBe('2026-10-30');

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Buat SPK Borongan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(capturedInsertPayload).not.toBeNull();
      expect(capturedInsertPayload).toEqual(
        expect.objectContaining({
          spk_id: mockSpkId,
          wbs_category: 'Pembongkaran',
          worker_name: 'Joko Las',
          task_description: 'Pengelasan Sasis Utama',
          contract_value: 1250000,
          deadline_date: '2026-10-30',
          status: 'ACTIVE',
        })
      );
    });

    // Form should be reset after submission
    await waitFor(() => {
      expect(deadlineInput.value).toBe('');
    });
  });

  it('displays formatted deadline date on worker cards in "Riwayat Penugasan SPK-B" and "-" when not set', async () => {
    const assignmentsWithDeadline = [
      {
        id: 'spk-b-1',
        worker_name: 'Rudi Cat',
        task_description: 'Pengecatan Dasar Epoxy',
        contract_value: 750000,
        status: 'ACTIVE',
        deadline_date: '2026-10-28',
        wbs_category: 'Pembongkaran',
        created_at: '2026-10-21T08:00:00Z',
      },
      {
        id: 'spk-b-2',
        worker_name: 'Bambang Dempul',
        task_description: 'Dempul Halus Body Kanan',
        contract_value: 500000,
        status: 'ACTIVE',
        deadline_date: null,
        wbs_category: 'Pembongkaran',
        created_at: '2026-10-21T09:00:00Z',
      },
    ];

    setupSupabaseMock([], assignmentsWithDeadline);

    render(
      <SpkBoronganPanel
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Rudi Cat')).toBeInTheDocument();
      expect(screen.getByText('Bambang Dempul')).toBeInTheDocument();
    });

    // Verify first worker shows formatted deadline date
    expect(screen.getByText('28 Oktober 2026')).toBeInTheDocument();

    // Verify "Tenggat Waktu:" label is rendered for both workers
    const deadlineLabels = screen.getAllByText('Tenggat Waktu:');
    expect(deadlineLabels.length).toBe(2);

    // Verify second worker without deadline shows '-'
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('includes official deadline date row in printable work order document when Cetak is clicked', async () => {
    const singleAssignment = [
      {
        id: 'spk-b-print-1',
        worker_name: 'Hadi Ketok',
        task_description: 'Perbaikan Plat Pintu Belakang',
        contract_value: 800000,
        status: 'ACTIVE',
        deadline_date: '2026-11-05',
        assignment_letter_no: 'ST-BORONG/SPK-001/WBS-1/01',
        wbs_category: 'Pembongkaran',
        created_at: '2026-10-21T10:00:00Z',
      },
    ];

    setupSupabaseMock([], singleAssignment);

    let printedHtmlContent = '';
    const mockPrintWindow = {
      document: {
        write: vi.fn().mockImplementation((html: string) => {
          printedHtmlContent = html;
        }),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
    };

    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as any);

    render(
      <SpkBoronganPanel
        spkId={mockSpkId}
        wbsCategory={mockWbsCategory}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Hadi Ketok')).toBeInTheDocument();
    });

    const printButton = screen.getByTitle('Cetak Surat Tugas');
    fireEvent.click(printButton);

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(mockPrintWindow.document.write).toHaveBeenCalled();

    // Verify that printed HTML includes Tenggat Waktu / Deadline and formatted date
    expect(printedHtmlContent).toContain('Tenggat Waktu / Deadline');
    expect(printedHtmlContent).toContain('5 November 2026');

    openSpy.mockRestore();
  });
});

