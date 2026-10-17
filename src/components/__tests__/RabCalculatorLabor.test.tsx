import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
      { id: 'mat-1', name: 'Plat Besi 3mm', unit_price: 250000, cost_price: 200000 },
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
    expect(screen.getByLabelText(/Tahapan WBS/i)).toBeInTheDocument();
    expect(screen.getByText(/Estimasi Biaya Jasa \/ Upah/i)).toBeInTheDocument();
    expect(screen.getByText(/Catatan \/ Scope Pekerjaan/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tambah Jasa ke RAB/i })).toBeInTheDocument();

    // Verify Material Autocomplete is hidden in Labor mode
    expect(screen.queryByPlaceholderText('Cari material gudang...')).not.toBeInTheDocument();

    // Verify Waste Factor is NOT displayed for Labor
    expect(screen.queryByText('Waste Factor (%)')).not.toBeInTheDocument();
  });

  it('successfully adds a labor item to the RAB table with correct badge and subtotal', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa / Tukang (Labor)')).toBeInTheDocument();
    });

    // Switch to labor mode
    fireEvent.click(screen.getByText('Jasa / Tukang (Labor)'));

    // Fill in dedicated labor form
    const nameInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis, Ongkos Borongan Dempul & Cat, Jasa Bongkar');
    fireEvent.change(nameInput, { target: { value: 'Jasa Borongan Las Sasis' } });

    const wbsSelect = screen.getByLabelText(/Tahapan WBS/i);
    fireEvent.change(wbsSelect, { target: { value: 'Sasis/Rangka' } });

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
    const nameInput = screen.getByPlaceholderText('misal: Jasa Tukang Las Sasis, Ongkos Borongan Dempul & Cat, Jasa Bongkar') as HTMLInputElement;
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
});

