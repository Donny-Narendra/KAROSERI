import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RabCalculator } from '../RabCalculator';
import { parseDecimal } from '../../utils/numberUtils';

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
                total_material_cost: 0,
                total_labor_cost: 0,
                total_overhead_cost: 0,
                total_estimated_cost: 0,
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
              data: [],
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
      { id: 'mat-1', name: 'Plat Bordes 2.3mm', unit_price: 300000, cost_price: 240000, category: 'BAHAN BAKU' },
      { id: 'mat-2', name: 'Kawat Las RD-260', unit_price: 50000, cost_price: 40000, category: 'CONSUMABLE' },
      { id: 'mat-3', name: 'Cat Polyurethane', unit_price: 150000, cost_price: 120000, category: 'CAT' },
      { id: 'labor-1', name: 'Jasa Tukang Las Sasis', selling_price: 500000, cost_price: 400000, unit_price: 500000, category: 'JASA' },
    ]),
  },
}));

vi.mock('../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn().mockResolvedValue([]),
  },
}));

describe('Unit Tests: parseDecimal helper', () => {
  it('correctly parses numbers and strings with dot or comma decimal separators', () => {
    expect(parseDecimal(1.5)).toBe(1.5);
    expect(parseDecimal('1.5')).toBe(1.5);
    expect(parseDecimal('1,5')).toBe(1.5);
    expect(parseDecimal('0.5')).toBe(0.5);
    expect(parseDecimal('0,5')).toBe(0.5);
    expect(parseDecimal('2,75')).toBe(2.75);
    expect(parseDecimal(0)).toBe(0);
    expect(parseDecimal('0')).toBe(0);
    expect(parseDecimal('')).toBe(0);
    expect(parseDecimal(null)).toBe(0);
    expect(parseDecimal(undefined)).toBe(0);
    expect(parseDecimal('invalid')).toBe(0);
  });
});

describe('Component: RabCalculator (Decimal Precision and Auto-Select on Focus)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('configures step="any" and min="0" on QTY and WBS allocation inputs', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Bahan Baku (Material)')).toBeInTheDocument();
    });

    const qtyInput = screen.getByLabelText(/Qty \(Bahan\)/i) as HTMLInputElement;
    expect(qtyInput).toHaveAttribute('step', 'any');
    expect(qtyInput).toHaveAttribute('min', '0');

    const wbs1Input = screen.getByLabelText(/Alokasi Bahan WBS 1: Pembongkaran/i) as HTMLInputElement;
    expect(wbs1Input).toHaveAttribute('step', 'any');
    expect(wbs1Input).toHaveAttribute('min', '0');

    // Switch to Labor mode and verify Labor inputs have step="any" and min="0"
    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));
    const laborWbs1 = screen.getByLabelText(/Alokasi WBS 1: Pembongkaran/i) as HTMLInputElement;
    expect(laborWbs1).toHaveAttribute('step', 'any');
    expect(laborWbs1).toHaveAttribute('min', '0');
  });

  it('triggers auto-select on focus for QTY and WBS inputs in Material form', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Bahan Baku (Material)')).toBeInTheDocument();
    });

    const qtyInput = screen.getByLabelText(/Qty \(Bahan\)/i) as HTMLInputElement;
    const selectSpy = vi.spyOn(qtyInput, 'select');
    fireEvent.focus(qtyInput);
    expect(selectSpy).toHaveBeenCalled();

    const wbs1Input = screen.getByLabelText(/Alokasi Bahan WBS 1: Pembongkaran/i) as HTMLInputElement;
    const wbsSelectSpy = vi.spyOn(wbs1Input, 'select');
    fireEvent.focus(wbs1Input);
    expect(wbsSelectSpy).toHaveBeenCalled();
  });

  it('triggers auto-select on focus for Labor WBS allocation inputs and cost input', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    const laborWbs1 = screen.getByLabelText(/Alokasi WBS 1: Pembongkaran/i) as HTMLInputElement;
    const wbsSelectSpy = vi.spyOn(laborWbs1, 'select');
    fireEvent.focus(laborWbs1);
    expect(wbsSelectSpy).toHaveBeenCalled();

    const costInput = screen.getByPlaceholderText('Tarif yang ditagihkan di SPK...') as HTMLInputElement;
    const costSelectSpy = vi.spyOn(costInput, 'select');
    fireEvent.focus(costInput);
    expect(costSelectSpy).toHaveBeenCalled();
  });

  it('accepts decimal QTY = 1.5, validates WBS 2 = 1 and WBS 3 = 0.5, displays Sesuai / Pas (0.00), and adds to RAB', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Bahan Baku (Material)')).toBeInTheDocument();
    });

    // Pick material from autocomplete
    const materialInput = screen.getByPlaceholderText('Cari material gudang...');
    fireEvent.focus(materialInput);
    fireEvent.change(materialInput, { target: { value: 'Bordes' } });

    await waitFor(() => {
      expect(screen.getByText('Plat Bordes 2.3mm')).toBeInTheDocument();
    });
    fireEvent.mouseDown(screen.getByText('Plat Bordes 2.3mm'));

    // Set QTY = 1.5
    const qtyInput = screen.getByLabelText(/Qty \(Bahan\)/i);
    fireEvent.change(qtyInput, { target: { value: '1.5' } });

    // Status badge before full allocation
    expect(screen.getByText('Sisa: 1.50')).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Tambah Bahan ke RAB/i });
    expect(submitBtn).toBeDisabled();

    // Allocate WBS 2 = 1 and WBS 3 = 0.5
    const wbs2Input = screen.getByLabelText(/Alokasi Bahan WBS 2: Sasis\/Rangka/i);
    const wbs3Input = screen.getByLabelText(/Alokasi Bahan WBS 3: Dinding\/Fabrikasi/i);
    fireEvent.change(wbs2Input, { target: { value: '1' } });
    expect(screen.getByText('Sisa: 0.50')).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    fireEvent.change(wbs3Input, { target: { value: '0.5' } });

    // Status badge should show Sesuai / Pas (0.00)
    expect(screen.getByText('Sesuai / Pas (0.00)')).toBeInTheDocument();
    expect(submitBtn).toBeEnabled();

    // Submit item
    fireEvent.submit(submitBtn.closest('form')!);

    // Verify items added to table with precision
    await waitFor(() => {
      expect(screen.getAllByText('Plat Bordes 2.3mm').length).toBeGreaterThanOrEqual(2);
    });

    // Check quantities in table
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0.5')).toBeInTheDocument();

    // Subtotal for 0.5 * 300000 = 150000
    expect(screen.getByText('Rp 150.000')).toBeInTheDocument();
    // Subtotal and unit price for 1 * 300000 = 300000
    expect(screen.getAllByText('Rp 300.000').length).toBeGreaterThanOrEqual(1);
  });

  it('supports decimal inputs with comma notation (e.g. 1,5 and 0,5)', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Bahan Baku (Material)')).toBeInTheDocument();
    });

    // Pick material
    const materialInput = screen.getByPlaceholderText('Cari material gudang...');
    fireEvent.focus(materialInput);
    fireEvent.change(materialInput, { target: { value: 'Kawat' } });

    await waitFor(() => {
      expect(screen.getByText('Kawat Las RD-260')).toBeInTheDocument();
    });
    fireEvent.mouseDown(screen.getByText('Kawat Las RD-260'));

    // Input QTY with comma notation: "1,5"
    const qtyInput = screen.getByLabelText(/Qty \(Bahan\)/i);
    Object.defineProperty(qtyInput, 'value', { value: '1,5', writable: true, configurable: true });
    fireEvent.change(qtyInput, { target: { value: '1,5' } });

    // Allocate WBS 1 = 1, WBS 2 = 0,5
    const wbs1Input = screen.getByLabelText(/Alokasi Bahan WBS 1: Pembongkaran/i);
    const wbs2Input = screen.getByLabelText(/Alokasi Bahan WBS 2: Sasis\/Rangka/i);
    Object.defineProperty(wbs1Input, 'value', { value: '1', writable: true, configurable: true });
    fireEvent.change(wbs1Input, { target: { value: '1' } });
    Object.defineProperty(wbs2Input, 'value', { value: '0,5', writable: true, configurable: true });
    fireEvent.change(wbs2Input, { target: { value: '0,5' } });

    // Should recognize balance
    expect(screen.getByText('Sesuai / Pas (0.00)')).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Tambah Bahan ke RAB/i });
    expect(submitBtn).toBeEnabled();

    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(screen.getAllByText('Kawat Las RD-260').length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByText('0.5')).toBeInTheDocument();
  });

  it('supports decimal precision in Labor tab multi-WBS allocations (e.g. 0.5 lot and 1.5 lot)', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    const nameInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis');
    fireEvent.change(nameInput, { target: { value: 'Jasa Las Custom Rangka' } });

    const costInput = screen.getByPlaceholderText('Tarif yang ditagihkan di SPK...');
    fireEvent.change(costInput, { target: { value: '400000' } });

    // Set Target Qty = 2 to match multi-stage allocations (1.5 + 0.5)
    const targetQtyInput = screen.getByLabelText(/Target Qty/i);
    fireEvent.change(targetQtyInput, { target: { value: '2' } });

    // Set WBS 1 = 0, WBS 2 = 1.5, WBS 3 = 0.5 (or 0,5)
    const wbs1Input = screen.getByLabelText(/Alokasi WBS 1: Pembongkaran/i);
    const wbs2Input = screen.getByLabelText(/Alokasi WBS 2: Sasis\/Rangka/i);
    const wbs3Input = screen.getByLabelText(/Alokasi WBS 3: Dinding\/Fabrikasi/i);

    fireEvent.change(wbs1Input, { target: { value: '0' } });
    fireEvent.change(wbs2Input, { target: { value: '1.5' } });
    fireEvent.change(wbs3Input, { target: { value: '0.5' } });

    // TOTAL QTY should show 2
    expect(screen.getByText('2')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Tambah Jasa ke RAB/i });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Jasa Las Custom Rangka').length).toBe(2);
    });

    // Check quantities in table: 1.5 lot and 0.5 lot
    expect(screen.getByText('1.5 lot')).toBeInTheDocument();
    expect(screen.getByText('0.5 lot')).toBeInTheDocument();

    // Subtotal 1.5 * 400000 = 600000, 0.5 * 400000 = 200000
    expect(screen.getByText('Rp 600.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 200.000')).toBeInTheDocument();
  });
});
