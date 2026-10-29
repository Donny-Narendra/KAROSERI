import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { RabCalculator } from '../RabCalculator';

const createDefaultFromMock = (table: string) => {
  if (table === 'workshop_settings') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { bay_hourly_rate: 25000 }, error: null }),
    };
  }
  if (table === 'rab_estimations') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'est-test-1',
          total_material_cost: 500000,
          total_labor_cost: 300000,
          total_overhead_cost: 200000,
          total_estimated_cost: 1000000,
        },
        error: null,
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'est-test-1' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
  }
  if (table === 'spk') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'spk-test-1',
          spk_no: 'SPK-TEST-001',
          customer_name: 'PT Karoseri Jaya',
          vehicle_plate: 'B 1234 XYZ',
          status: 'DRAFT',
          is_pricing_locked: false,
        },
        error: null,
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
  }
  if (table === 'rab_items') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'item-1',
            wbs_category: 'Pembongkaran',
            item_type: 'LABOR',
            material_name: 'Jasa Bongkar Bodi Lama',
            quantity: 1,
            unit_price: 300000,
            cost_price: 300000,
            item_total: 300000,
          },
          {
            id: 'item-2',
            wbs_category: 'Sasis/Rangka',
            item_type: 'MATERIAL',
            material_name: 'Plat Besi 3mm',
            quantity: 2,
            unit_price: 250000,
            cost_price: 200000,
            item_total: 500000,
          },
        ],
        error: null,
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
  }
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
};

// Mock supabase client
vi.mock('../../lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn((table: string) => createDefaultFromMock(table)),
    },
  };
});

// Mock services
vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getMaterials: vi.fn().mockResolvedValue([
      { id: 'mat-1', name: 'Plat Besi 3mm', unit_price: 250000, cost_price: 200000, category: 'BAHAN BAKU' },
      { id: 'mat-2', name: 'Kawat Las RD-260', unit_price: 45000, cost_price: 40000, category: 'CONSUMABLE' },
      { id: 'mat-3', name: 'Thinner ND High Gloss', unit_price: 65000, cost_price: 50000, category: 'CAT' },
      { id: 'labor-1', name: 'Jasa Tukang Las Sasis', selling_price: 550000, cost_price: 450000, unit_price: 550000, category: 'JASA' },
      { id: 'labor-2', name: 'Ongkos Borongan Cat Oven', selling_price: 850000, cost_price: 700000, unit_price: 850000, category: 'LABOR' },
      { id: 'labor-3', name: 'Upah Tenaga Bending Plat', selling_price: 350000, cost_price: 300000, unit_price: 350000 },
      { id: 'labor-bemper', name: 'TUKANG LAS BEMPER R25', selling_price: 350000, cost_price: 220000, unit_price: 350000, category: 'JASA' },
    ]),
  },
}));

vi.mock('../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn().mockResolvedValue([]),
  },
}));

describe('Component: RabCalculator (Labor Entry & Pagu Jasa)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { supabase } = await import('../../lib/supabaseClient');
    vi.mocked(supabase.from).mockImplementation(createDefaultFromMock as any);
  });

  it('renders RAB Calculator with item entry toggle: Bahan Baku (Material) and Jasa / Tukang (Labor)', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('RAB Calculator')).toBeInTheDocument();
    });

    expect(screen.getByText('Bahan Baku (Material)')).toBeInTheDocument();
    expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    expect(screen.getAllByText('Overhead').length).toBeGreaterThanOrEqual(1);
  });

  it('displays distinct [ JASA / TUKANG ] badge for labor items and [ MATERIAL ] badge for materials', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa Bongkar Bodi Lama')).toBeInTheDocument();
    });

    // Check badges
    expect(screen.getByText('[ JASA / TUKANG ]')).toBeInTheDocument();
    expect(screen.getByText('[ MATERIAL ]')).toBeInTheDocument();
  });

  it('switches input form to dedicated labor mode when Jasa / Tukang (Labor) toggle is clicked', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Bahan Baku (Material)')).toBeInTheDocument();
    });

    // Click Jasa / Tukang (Labor) toggle
    const laborButton = screen.getByText('Jasa / Tukang (Labor)');
    fireEvent.click(laborButton);

    // Verify input labels changed to dedicated Labor context
    expect(screen.getByText(/Nama Jasa \/ Pekerjaan Tukang/i)).toBeInTheDocument();
    // Verify old dropdown is removed
    expect(screen.queryByLabelText(/Tahapan WBS \*/i)).not.toBeInTheDocument();
    // Verify ALOKASI WBS grid is present
    expect(screen.getByText(/ALOKASI (?:WBS|TAHAPAN)/i)).toBeInTheDocument();
    expect(screen.getByText('TOTAL QTY')).toBeInTheDocument();
    expect(screen.getByText(/(?:WBS|Tahap) 1/i)).toBeInTheDocument();
    expect(screen.getByText(/(?:WBS|Tahap) 2/i)).toBeInTheDocument();
    expect(screen.getByText(/(?:WBS|Tahap) 3/i)).toBeInTheDocument();
    expect(screen.getByText(/(?:WBS|Tahap) 4/i)).toBeInTheDocument();
    expect(screen.getByText(/(?:WBS|Tahap) 5/i)).toBeInTheDocument();
    expect(screen.getByText('STATUS')).toBeInTheDocument();

    expect(screen.getByText(/Target Qty/i)).toBeInTheDocument();
    expect(screen.getByText(/Upah Pokok Tukang \/ Biaya Modal \(HPP\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Tarif Tagih ke Konsumen \(Harga Jual\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Catatan \/ Scope Pekerjaan/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tambah Jasa ke RAB/i })).toBeInTheDocument();

    // Verify Material Autocomplete is hidden in Labor mode
    expect(screen.queryByPlaceholderText('Cari material gudang...')).not.toBeInTheDocument();

    // Verify Waste Factor is NOT displayed for Labor
    expect(screen.queryByText('Waste Factor (%)')).not.toBeInTheDocument();
  });

  it('successfully adds a labor item to the RAB table with correct badge and subtotal via allocation grid', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    // Switch to labor mode
    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    // Fill in dedicated labor form
    const nameInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis');
    fireEvent.change(nameInput, { target: { value: 'Jasa Borongan Las Sasis' } });

    // Set WBS 1 = 0, WBS 2 = 1 via allocation grid
    const wbs1Input = screen.getByLabelText(/Alokasi (?:WBS|Tahapan) 1: Pembongkaran/i);
    const wbs2Input = screen.getByLabelText(/Alokasi (?:WBS|Tahapan) 2: Sasis\/Rangka/i);
    fireEvent.change(wbs1Input, { target: { value: '0' } });
    fireEvent.change(wbs2Input, { target: { value: '1' } });

    const costInput = screen.getByPlaceholderText('Tarif yang ditagihkan di SPK...');
    fireEvent.change(costInput, { target: { value: '500000' } });

    const notesInput = screen.getByPlaceholderText('Keterangan ruang lingkup pekerjaan tukang...');
    fireEvent.change(notesInput, { target: { value: 'Pengelasan crossmember utama' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Tambah Jasa ke RAB/i });
    fireEvent.click(submitBtn);

    // Verify item appeared in table
    await waitFor(() => {
      expect(screen.getByText('Jasa Borongan Las Sasis')).toBeInTheDocument();
    });
    expect(screen.getByText('Scope: Pengelasan crossmember utama')).toBeInTheDocument();
    expect(screen.getAllByText('[ JASA / TUKANG ]').length).toBeGreaterThanOrEqual(2);
  });

  it('supports multi-stage labor allocation (e.g. WBS 2 = 1 and WBS 3 = 1) creating distinct items for each stage', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    // Switch to labor mode
    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    const nameInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis');
    fireEvent.change(nameInput, { target: { value: 'Jasa Perakitan Rangka & Dinding' } });

    // Multi-WBS allocation: set Target Qty = 2, then WBS 1 = 0, WBS 2 = 1, WBS 3 = 1
    const targetQtyInput = screen.getByLabelText(/Target Qty/i);
    fireEvent.change(targetQtyInput, { target: { value: '2' } });

    const wbs1Input = screen.getByLabelText(/Alokasi (?:WBS|Tahapan) 1: Pembongkaran/i);
    const wbs2Input = screen.getByLabelText(/Alokasi (?:WBS|Tahapan) 2: Sasis\/Rangka/i);
    const wbs3Input = screen.getByLabelText(/Alokasi (?:WBS|Tahapan) 3: Dinding\/Fabrikasi/i);
    fireEvent.change(wbs1Input, { target: { value: '0' } });
    fireEvent.change(wbs2Input, { target: { value: '1' } });
    fireEvent.change(wbs3Input, { target: { value: '1' } });

    const costInput = screen.getByPlaceholderText('Tarif yang ditagihkan di SPK...');
    fireEvent.change(costInput, { target: { value: '350000' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Tambah Jasa ke RAB/i });
    fireEvent.click(submitBtn);

    // Verify both items appeared in the table
    await waitFor(() => {
      expect(screen.getAllByText('Jasa Perakitan Rangka & Dinding').length).toBe(2);
    });
  });

  it('shows 3-way cost breakdown (Pagu Material, Pagu Jasa, Overhead) and WBS summary in footer', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pagu Material')).toBeInTheDocument();
    });

    expect(screen.getByText('Pagu Jasa (Labor)')).toBeInTheDocument();
    expect(screen.getAllByText('Overhead').length).toBeGreaterThanOrEqual(1);

    // Verify WBS breakdown header
    expect(screen.getByText(/Ringkasan Pagu Biaya [Pp]er Tahapan:?/i)).toBeInTheDocument();

    // Verify formatted amounts
    expect(screen.getAllByText('Rp 300.000').length).toBeGreaterThanOrEqual(1); // Labor total
    expect(screen.getAllByText('Rp 500.000').length).toBeGreaterThanOrEqual(1); // Material total
  });

  it('allows editing an existing labor item and updates its values in state', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa Bongkar Bodi Lama')).toBeInTheDocument();
    });

    // Find and click edit button for Jasa Bongkar Bodi Lama
    const editButtons = screen.getAllByTitle('Edit item');
    fireEvent.click(editButtons[0]);

    // Verify form switched to labor mode with existing values
    const nameInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis') as HTMLInputElement;
    expect(nameInput.value).toBe('Jasa Bongkar Bodi Lama');

    // Verify update button is displayed
    const updateBtn = screen.getByRole('button', { name: /Update Jasa ke RAB/i });
    expect(updateBtn).toBeInTheDocument();

    // Change cost to 450000
    const costInput = screen.getByPlaceholderText('Tarif yang ditagihkan di SPK...');
    fireEvent.change(costInput, { target: { value: '450000' } });

    // Submit update
    fireEvent.click(updateBtn);

    // Verify updated amount is in table
    await waitFor(() => {
      expect(screen.getAllByText('Rp 450.000').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('completely removes Waste Factor from UI, form inputs, and table headers', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Bahan Baku (Material)')).toBeInTheDocument();
    });

    // Verify Waste Factor (%) label is not rendered in Material mode
    expect(screen.queryByText('Waste Factor (%)')).not.toBeInTheDocument();

    // Verify Waste table column header is not rendered
    expect(screen.queryByRole('columnheader', { name: /^Waste$/i })).not.toBeInTheDocument();

    // Verify hidden waste-factor-input does not exist
    const hiddenWasteInput = document.getElementById('waste-factor-input');
    expect(hiddenWasteInput).toBeNull();
  });

  it('filters master inventory materials strictly to labor keywords and excludes physical items from auto-suggest', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    // Switch to labor mode
    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    // Verify auto-suggest badge shows 4 catalog items (excludes Plat Besi, Kawat Las, Thinner)
    await waitFor(() => {
      expect(screen.getByText(/4 katalog jasa/i)).toBeInTheDocument();
    });

    // Type "las" into labor search input
    const laborInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis');
    fireEvent.focus(laborInput);
    fireEvent.change(laborInput, { target: { value: 'las' } });

    // Suggestion dropdown should show "Jasa Tukang Las Sasis"
    const suggestionsList = screen.getByRole('list');
    expect(within(suggestionsList).getByText('Jasa Tukang Las Sasis')).toBeInTheDocument();

    // Physical items with "las" (e.g. Kawat Las RD-260) or without labor keywords must NOT appear in suggestions
    expect(within(suggestionsList).queryByText('Kawat Las RD-260')).not.toBeInTheDocument();
    expect(within(suggestionsList).queryByText('Plat Besi 3mm')).not.toBeInTheDocument();
    expect(within(suggestionsList).queryByText('Thinner ND High Gloss')).not.toBeInTheDocument();
  });

  it('auto-fills labor name and standard selling/cost rate when a suggestion is clicked', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    const laborInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis') as HTMLInputElement;
    fireEvent.focus(laborInput);
    fireEvent.change(laborInput, { target: { value: 'cat' } });

    // Dropdown shows "Ongkos Borongan Cat Oven"
    const suggestionItem = screen.getByText('Ongkos Borongan Cat Oven');
    expect(suggestionItem).toBeInTheDocument();

    // Select the item via mousedown
    fireEvent.mouseDown(suggestionItem);

    // Verify name and standard rate auto-filled
    expect(laborInput.value).toBe('Ongkos Borongan Cat Oven');

    const costInput = screen.getByPlaceholderText('Tarif yang ditagihkan di SPK...') as HTMLInputElement;
    expect(costInput.value).toBe('850000');
  });

  it('shows fallback notice when searching for a labor item that does not exist in inventory catalog', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    const laborInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis');
    fireEvent.focus(laborInput);
    fireEvent.change(laborInput, { target: { value: 'Jasa Tidak Dikenal 12345' } });

    // Verify fallback prompt appears
    expect(screen.getByText('Tidak ditemukan di master inventaris jasa. Tekan Enter untuk gunakan nama kustom.')).toBeInTheDocument();
  });

  it('verifies Labor WBS STATUS badge dynamically updates: Sisa (red), Sesuai / Pas (green), and Lebih (amber)', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    // By default, Target Qty is 1 and WBS 1 is 1 -> balanced (0.00)
    expect(screen.getByText('Sesuai / Pas (0.00)')).toBeInTheDocument();

    const wbs1Input = screen.getByLabelText(/Alokasi (?:WBS|Tahapan) 1: Pembongkaran/i);
    const wbs2Input = screen.getByLabelText(/Alokasi (?:WBS|Tahapan) 2: Sasis\/Rangka/i);

    // Case 1: Target Qty = 1, WBS 1 = 0, all others = 0 -> Sisa: 1.00 (under-allocated)
    fireEvent.change(wbs1Input, { target: { value: '0' } });
    const sisaBadge = screen.getByText('Sisa: 1.00');
    expect(sisaBadge).toBeInTheDocument();
    expect(sisaBadge.className).toContain('text-rose-400');

    // Case 2: Target Qty = 1, WBS 1 = 0.5, WBS 2 = 0.5 -> Sesuai / Pas (0.00)
    fireEvent.change(wbs1Input, { target: { value: '0.5' } });
    fireEvent.change(wbs2Input, { target: { value: '0.5' } });
    const pasBadge = screen.getByText('Sesuai / Pas (0.00)');
    expect(pasBadge).toBeInTheDocument();
    expect(pasBadge.className).toContain('text-emerald-400');

    // Case 3: Target Qty = 1, WBS 1 = 1, WBS 2 = 0.5 -> Lebih: 0.50 (over-allocated)
    fireEvent.change(wbs1Input, { target: { value: '1' } });
    fireEvent.change(wbs2Input, { target: { value: '0.5' } });
    const lebihBadge = screen.getByText('Lebih: 0.50');
    expect(lebihBadge).toBeInTheDocument();
    expect(lebihBadge.className).toContain('text-amber-400');
  });

  it('guards "+ Tambah Jasa ke RAB" button disabled state strictly until WBS allocation matches Target Qty', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    const nameInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis');
    fireEvent.change(nameInput, { target: { value: 'Jasa Setel Pintu' } });

    const costInput = screen.getByPlaceholderText('Tarif yang ditagihkan di SPK...');
    fireEvent.change(costInput, { target: { value: '250000' } });

    const submitBtn = screen.getByRole('button', { name: /Tambah Jasa ke RAB/i });

    // Initially WBS 1 = 1, Target = 1 -> button enabled
    expect(submitBtn).toBeEnabled();

    // Set WBS 1 = 0 -> remaining = 1.00 -> button disabled
    const wbs1Input = screen.getByLabelText(/Alokasi (?:WBS|Tahapan) 1: Pembongkaran/i);
    fireEvent.change(wbs1Input, { target: { value: '0' } });
    expect(submitBtn).toBeDisabled();

    // Set WBS 1 = 0.75, WBS 2 = 0.25 -> sum = 1.00 -> button re-enabled
    const wbs2Input = screen.getByLabelText(/Alokasi (?:WBS|Tahapan) 2: Sasis\/Rangka/i);
    fireEvent.change(wbs1Input, { target: { value: '0.75' } });
    fireEvent.change(wbs2Input, { target: { value: '0.25' } });
    expect(submitBtn).toBeEnabled();

    // Submit and verify addition
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getAllByText('Jasa Setel Pintu').length).toBe(2);
    });
  });

  it('renders dual financial inputs (Upah Pokok HPP and Tarif Tagih) and displays KUSTOM badge for custom non-inventory labor', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    const nameInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis');
    fireEvent.change(nameInput, { target: { value: 'cak mat tukang ketok' } });

    // Custom labor badge should appear
    expect(screen.getByText('KUSTOM (NON-INVENTARIS)')).toBeInTheDocument();

    // Verify dual financial inputs are present
    const hppInput = screen.getByPlaceholderText('Upah yang dibayar ke tukang...') as HTMLInputElement;
    const jualInput = screen.getByPlaceholderText('Tarif yang ditagihkan di SPK...') as HTMLInputElement;

    expect(hppInput).toBeInTheDocument();
    expect(jualInput).toBeInTheDocument();

    // Enter values
    fireEvent.change(hppInput, { target: { value: '300000' } });
    fireEvent.change(jualInput, { target: { value: '500000' } });

    expect(hppInput.value).toBe('300000');
    expect(jualInput.value).toBe('500000');

    // Live margin indicator: (500000 - 300000) = Rp 200.000 (40%)
    expect(screen.getByText('Proyeksi Margin Jasa:')).toBeInTheDocument();
    expect(screen.getByText(/Rp\s*200\.000\s*\(40%\)/)).toBeInTheDocument();
  });

  it('persists distinct cost_price and unit_price to database with material_id = undefined for custom labor', async () => {
    const { supabase } = await import('../../lib/supabaseClient');
    const mockSelect = vi.fn().mockResolvedValue({
      data: [{
        id: 'persisted-1',
        wbs_category: 'Pembongkaran',
        item_type: 'LABOR',
        material_name: 'Tukang Borongan Pak Joko',
        quantity: 1,
        unit_price: 700000,
        cost_price: 400000,
        subtotal: 700000,
      }],
      error: null,
    });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'rab_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          insert: mockInsert,
        } as any;
      }
      if (table === 'workshop_settings') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { bay_hourly_rate: 25000 }, error: null }) } as any;
      }
      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'est-test-1', total_material_cost: 0, total_labor_cost: 0, total_overhead_cost: 0, total_estimated_cost: 0 }, error: null }),
          upsert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'est-test-1' }, error: null }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        } as any;
      }
      if (table === 'spk') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'spk-test-1', status: 'DRAFT', is_pricing_locked: false }, error: null }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) } as any;
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) } as any;
    });

    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    const nameInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis');
    fireEvent.change(nameInput, { target: { value: 'Tukang Borongan Pak Joko' } });

    const hppInput = screen.getByPlaceholderText('Upah yang dibayar ke tukang...');
    const jualInput = screen.getByPlaceholderText('Tarif yang ditagihkan di SPK...');
    fireEvent.change(hppInput, { target: { value: '400000' } });
    fireEvent.change(jualInput, { target: { value: '700000' } });

    const submitBtn = screen.getByRole('button', { name: /Tambah Jasa ke RAB/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
    });

    const insertedRows = mockInsert.mock.calls[0][0];
    expect(insertedRows[0]).toMatchObject({
      material_name: 'Tukang Borongan Pak Joko',
      unit_price: 700000,
      cost_price: 400000,
      material_id: null,
      item_type: 'LABOR',
    });
  });

  it('pre-fills both cost price and selling price when editing a custom labor item and displays live margin', async () => {
    const { supabase } = await import('../../lib/supabaseClient');
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'rab_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{
                id: 'custom-labor-1',
                wbs_category: 'Pembongkaran',
                item_type: 'LABOR',
                material_name: 'Tukang Cat Semprot Bodi',
                quantity: 1,
                unit_price: 1200000,
                cost_price: 800000,
                item_total: 1200000,
                material_id: null,
              }],
              error: null,
            }),
          }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          insert: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [], error: null }) }),
        } as any;
      }
      if (table === 'workshop_settings') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { bay_hourly_rate: 25000 }, error: null }) } as any;
      }
      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'est-test-1', total_material_cost: 0, total_labor_cost: 1200000, total_overhead_cost: 0, total_estimated_cost: 1200000 }, error: null }),
          upsert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'est-test-1' }, error: null }) }) }),
        } as any;
      }
      if (table === 'spk') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'spk-test-1', status: 'DRAFT', is_pricing_locked: false }, error: null }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) } as any;
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) } as any;
    });

    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Tukang Cat Semprot Bodi')).toBeInTheDocument();
    });

    const editBtn = screen.getByTitle('Edit item');
    fireEvent.click(editBtn);

    // Form switches to labor mode with KUSTOM badge
    expect(screen.getByText('KUSTOM (NON-INVENTARIS)')).toBeInTheDocument();

    const hppInput = screen.getByPlaceholderText('Upah yang dibayar ke tukang...') as HTMLInputElement;
    const jualInput = screen.getByPlaceholderText('Tarif yang ditagihkan di SPK...') as HTMLInputElement;

    expect(hppInput.value).toBe('800000');
    expect(jualInput.value).toBe('1200000');

    // Live margin: 1.200.000 - 800.000 = 400.000 (33%)
    expect(screen.getByText('Proyeksi Margin Jasa:')).toBeInTheDocument();
    expect(screen.getByText(/Rp\s*400\.000\s*\(33%\)/)).toBeInTheDocument();
  });

  it('Verification 1: selects "TUKANG LAS BEMPER R25" from master inventory and auto-populates cost price and selling price', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    const nameInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis');
    fireEvent.focus(nameInput);
    fireEvent.change(nameInput, { target: { value: 'TUKANG LAS BEMPER R25' } });

    // Suggestion dropdown item should appear
    await waitFor(() => {
      expect(screen.getByText('TUKANG LAS BEMPER R25')).toBeInTheDocument();
    });

    // Click the suggestion item
    const suggestionItem = screen.getByText('TUKANG LAS BEMPER R25');
    fireEvent.click(suggestionItem);

    // Verify cost price (220.000) and selling price (350.000) auto-populate
    const hppInput = screen.getByPlaceholderText('Upah yang dibayar ke tukang...') as HTMLInputElement;
    const jualInput = screen.getByPlaceholderText('Tarif yang ditagihkan di SPK...') as HTMLInputElement;

    expect(hppInput.value).toBe('220000');
    expect(jualInput.value).toBe('350000');
  });

  it('Verification 2: enters custom labor "cak mat - las aksesoris tambahan", shows + Rp 150.000 (43%), saves to RAB and renders correctly in table', async () => {
    const { supabase } = await import('../../lib/supabaseClient');
    const mockSelect = vi.fn().mockResolvedValue({
      data: [{
        id: 'persisted-cakmat',
        wbs_category: 'Pembongkaran',
        item_type: 'LABOR',
        material_name: 'cak mat - las aksesoris tambahan',
        quantity: 1,
        unit_price: 350000,
        cost_price: 200000,
        subtotal: 350000,
        material_id: null,
      }],
      error: null,
    });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'rab_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          insert: mockInsert,
        } as any;
      }
      if (table === 'workshop_settings') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { bay_hourly_rate: 25000 }, error: null }) } as any;
      }
      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'est-test-1', total_material_cost: 0, total_labor_cost: 0, total_overhead_cost: 0, total_estimated_cost: 0 }, error: null }),
          upsert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'est-test-1' }, error: null }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        } as any;
      }
      if (table === 'spk') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'spk-test-1', status: 'DRAFT', is_pricing_locked: false }, error: null }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) } as any;
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) } as any;
    });

    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    const nameInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis');
    fireEvent.change(nameInput, { target: { value: 'cak mat - las aksesoris tambahan' } });
    fireEvent.keyDown(nameInput, { key: 'Enter', code: 'Enter' });

    // Mode kustom aktif
    expect(screen.getByText('KUSTOM (NON-INVENTARIS)')).toBeInTheDocument();

    const hppInput = screen.getByPlaceholderText('Upah yang dibayar ke tukang...') as HTMLInputElement;
    const jualInput = screen.getByPlaceholderText('Tarif yang ditagihkan di SPK...') as HTMLInputElement;

    fireEvent.change(hppInput, { target: { value: '200000' } });
    fireEvent.change(jualInput, { target: { value: '350000' } });

    // Pastikan indikator proyeksi margin menampilkan + Rp 150.000 (43%)
    expect(screen.getByText('Proyeksi Margin Jasa:')).toBeInTheDocument();
    expect(screen.getByText('+ Rp 150.000 (43%)')).toBeInTheDocument();

    // Simpan ke RAB
    const submitBtn = screen.getByRole('button', { name: /Tambah Jasa ke RAB/i });
    fireEvent.click(submitBtn);

    // Periksa tabel RAB kanan: Baris baru muncul dengan tipe [ JASA / TUKANG ], HARGA SATUAN: Rp 350.000, dan HARGA MODAL (HPP): Rp 200.000
    await waitFor(() => {
      expect(screen.getByText('cak mat - las aksesoris tambahan')).toBeInTheDocument();
    });

    const row = screen.getByText('cak mat - las aksesoris tambahan').closest('tr');
    expect(row).toBeInTheDocument();
    if (row) {
      expect(within(row).getByText('[ JASA / TUKANG ]')).toBeInTheDocument();
      const cells350k = within(row).getAllByText(/350\.000/);
      expect(cells350k.length).toBe(2); // HARGA SATUAN and SUBTOTAL
      expect(within(row).getByText(/200\.000/)).toBeInTheDocument(); // HARGA MODAL (HPP)
    }
  });

  it('Task 2: aligns right table columns (HARGA SATUAN, HARGA MODAL, SUBTOTAL) and footer modal cost & margin accumulation', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    // Table has loaded item-1 (LABOR: qty 1, unit_price 300000, cost_price 300000)
    // and item-2 (MATERIAL: qty 2, unit_price 250000, cost_price 200000, total 500000)
    await waitFor(() => {
      expect(screen.getByText('Jasa Bongkar Bodi Lama')).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('Harga Satuan')).toBeInTheDocument();
    expect(screen.getByText('Harga Modal (HPP)')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();

    // Total Modal Cost calculation:
    // item-1 (Labor): 1 * 300.000 = 300.000
    // item-2 (Material): 2 * 200.000 = 400.000
    // Total Estimated Cost (RAB Modal) = 700.000
    // Total Harga Jual (Quotation): (1 * 300.000) + (2 * 250.000) = 800.000
    // Margin (Profit): 800.000 - 700.000 = 100.000
    expect(screen.getByText('Total Estimated Cost (RAB Modal)')).toBeInTheDocument();
    expect(screen.getByText('700.000')).toBeInTheDocument();
    expect(screen.getByText('Total Harga Jual (Quotation)')).toBeInTheDocument();
    expect(screen.getByText('800.000')).toBeInTheDocument();
    expect(screen.getByText('Margin (Profit)')).toBeInTheDocument();
    expect(screen.getByText('100.000')).toBeInTheDocument();
  });

  it('Sprint 82: renders 3-pillar segregated profit breakdown cards in RAB Calculator footer', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Sub-Rincian Profitabilitas RAB (3 Pilar):')).toBeInTheDocument();
    });

    expect(screen.getByText(/Profit Paket \(BOM\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Profit Mat\. Granular/i)).toBeInTheDocument();
    expect(screen.getByText(/Profit Jasa & FOH/i)).toBeInTheDocument();
  });
});

