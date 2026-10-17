import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { RabCalculator } from '../RabCalculator';

// Mock supabase client
vi.mock('../../lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
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
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
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
    ]),
  },
}));

vi.mock('../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn().mockResolvedValue([]),
  },
}));

describe('Component: RabCalculator (Labor Entry & Pagu Jasa)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.getByText('ALOKASI WBS')).toBeInTheDocument();
    expect(screen.getByText('TOTAL QTY')).toBeInTheDocument();
    expect(screen.getByText('WBS 1')).toBeInTheDocument();
    expect(screen.getByText('WBS 2')).toBeInTheDocument();
    expect(screen.getByText('WBS 3')).toBeInTheDocument();
    expect(screen.getByText('WBS 4')).toBeInTheDocument();
    expect(screen.getByText('WBS 5')).toBeInTheDocument();
    expect(screen.getByText('STATUS')).toBeInTheDocument();

    expect(screen.getByText(/Target Qty/i)).toBeInTheDocument();
    expect(screen.getByText(/Estimasi Biaya Jasa \/ Upah/i)).toBeInTheDocument();
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
    const wbs1Input = screen.getByLabelText('Alokasi WBS 1: Pembongkaran');
    const wbs2Input = screen.getByLabelText('Alokasi WBS 2: Sasis/Rangka');
    fireEvent.change(wbs1Input, { target: { value: '0' } });
    fireEvent.change(wbs2Input, { target: { value: '1' } });

    const costInput = screen.getByPlaceholderText('misal: 500000');
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

    const wbs1Input = screen.getByLabelText('Alokasi WBS 1: Pembongkaran');
    const wbs2Input = screen.getByLabelText('Alokasi WBS 2: Sasis/Rangka');
    const wbs3Input = screen.getByLabelText('Alokasi WBS 3: Dinding/Fabrikasi');
    fireEvent.change(wbs1Input, { target: { value: '0' } });
    fireEvent.change(wbs2Input, { target: { value: '1' } });
    fireEvent.change(wbs3Input, { target: { value: '1' } });

    const costInput = screen.getByPlaceholderText('misal: 500000');
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
    expect(screen.getByText('Ringkasan Pagu Biaya per Tahapan WBS:')).toBeInTheDocument();

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
    const costInput = screen.getByPlaceholderText('misal: 500000');
    fireEvent.change(costInput, { target: { value: '450000' } });

    // Submit update
    fireEvent.click(updateBtn);

    // Verify updated amount is in table
    await waitFor(() => {
      expect(screen.getAllByText('Rp 450.000').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('hides Waste Factor (%) input in Material mode and defaults value to 0', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Bahan Baku (Material)')).toBeInTheDocument();
    });

    // Verify Waste Factor (%) label is not rendered in Material mode
    expect(screen.queryByText('Waste Factor (%)')).not.toBeInTheDocument();

    // Verify hidden waste-factor-input exists with value 0
    const hiddenWasteInput = document.getElementById('waste-factor-input') as HTMLInputElement;
    expect(hiddenWasteInput).toBeInTheDocument();
    expect(hiddenWasteInput.value).toBe('0');
  });

  it('filters master inventory materials strictly to labor keywords and excludes physical items from auto-suggest', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    // Switch to labor mode
    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    // Verify auto-suggest badge shows 3 catalog items (excludes Plat Besi, Kawat Las, Thinner)
    await waitFor(() => {
      expect(screen.getByText(/3 katalog jasa/i)).toBeInTheDocument();
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

    const costInput = screen.getByPlaceholderText('misal: 500000') as HTMLInputElement;
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

    const wbs1Input = screen.getByLabelText('Alokasi WBS 1: Pembongkaran');
    const wbs2Input = screen.getByLabelText('Alokasi WBS 2: Sasis/Rangka');

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

    const costInput = screen.getByPlaceholderText('misal: 500000');
    fireEvent.change(costInput, { target: { value: '250000' } });

    const submitBtn = screen.getByRole('button', { name: /Tambah Jasa ke RAB/i });

    // Initially WBS 1 = 1, Target = 1 -> button enabled
    expect(submitBtn).toBeEnabled();

    // Set WBS 1 = 0 -> remaining = 1.00 -> button disabled
    const wbs1Input = screen.getByLabelText('Alokasi WBS 1: Pembongkaran');
    fireEvent.change(wbs1Input, { target: { value: '0' } });
    expect(submitBtn).toBeDisabled();

    // Set WBS 1 = 0.75, WBS 2 = 0.25 -> sum = 1.00 -> button re-enabled
    const wbs2Input = screen.getByLabelText('Alokasi WBS 2: Sasis/Rangka');
    fireEvent.change(wbs1Input, { target: { value: '0.75' } });
    fireEvent.change(wbs2Input, { target: { value: '0.25' } });
    expect(submitBtn).toBeEnabled();

    // Submit and verify addition
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getAllByText('Jasa Setel Pintu').length).toBe(2);
    });
  });
});

