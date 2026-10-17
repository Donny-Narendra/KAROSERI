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
            single: vi.fn().mockResolvedValue({ data: { bay_hourly_rate: 200000 }, error: null }),
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
              data: [
                {
                  id: 'init-item-1',
                  wbs_category: 'Pembongkaran',
                  item_type: 'MATERIAL',
                  material_name: 'Item Inisial Material',
                  quantity: 1,
                  unit_price: 100000,
                  cost_price: 80000,
                  item_total: 100000,
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
    getMaterials: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn().mockResolvedValue([]),
  },
}));

describe('Component: RabCalculator (Overhead Label Terminology)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders updated Overhead labels: FREKWENSI DALAM PROYEK INI and BAY RATE / FREKWENSI', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Bahan Baku (Material)')).toBeInTheDocument();
    });

    // In Material mode, labels are Qty (Bahan) and Harga Satuan Bahan
    expect(screen.getByText(/Qty \(Bahan\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Harga Satuan Bahan/i)).toBeInTheDocument();

    // Switch to Overhead mode
    const overheadToggle = screen.getByRole('button', { name: /Overhead/i });
    fireEvent.click(overheadToggle);

    // Verify Overhead labels are updated to FREKWENSI DALAM PROYEK INI and BAY RATE / FREKWENSI
    expect(screen.getByText('FREKWENSI DALAM PROYEK INI')).toBeInTheDocument();
    expect(screen.getByText('BAY RATE / FREKWENSI')).toBeInTheDocument();

    // Verify old labels DAYS (HARI KERJA) and BAY RATE / HARI are no longer rendered
    expect(screen.queryByText(/DAYS \(HARI KERJA\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/BAY RATE \/ HARI/i)).not.toBeInTheDocument();
  });

  it('configures step="any", min="0", and auto-select on focus for overhead frequency and rate inputs', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Overhead/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Overhead/i }));

    const freqInput = screen.getByLabelText(/FREKWENSI DALAM PROYEK INI/i) as HTMLInputElement;
    expect(freqInput).toHaveAttribute('step', 'any');
    expect(freqInput).toHaveAttribute('min', '0');

    const rateInput = screen.getByLabelText(/BAY RATE \/ FREKWENSI/i) as HTMLInputElement;
    expect(rateInput).toHaveAttribute('step', 'any');
    expect(rateInput).toHaveAttribute('min', '0');

    // Test auto-select on focus
    const freqSelectSpy = vi.spyOn(freqInput, 'select');
    fireEvent.focus(freqInput);
    expect(freqSelectSpy).toHaveBeenCalled();

    const rateSelectSpy = vi.spyOn(rateInput, 'select');
    fireEvent.focus(rateInput);
    expect(rateSelectSpy).toHaveBeenCalled();
  });

  it('accurately calculates overhead estimation with decimal frequency (e.g. 0.5) and rate (1600000)', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Item Inisial Material')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Overhead/i }));

    // Fill in overhead description
    const descInput = screen.getByPlaceholderText(/e\.g\. Workshop Bay Overhead/i);
    fireEvent.change(descInput, { target: { value: 'Sewa Alat Khusus & Genset' } });

    // Set frequency to 0.5
    const freqInput = screen.getByLabelText(/FREKWENSI DALAM PROYEK INI/i);
    fireEvent.change(freqInput, { target: { value: '0.5' } });

    // Set bay rate to 1,600,000
    const rateInput = screen.getByLabelText(/BAY RATE \/ FREKWENSI/i);
    fireEvent.change(rateInput, { target: { value: '1600000' } });

    // Allocate 0.5 to WBS 1: Pembongkaran
    const wbs1Input = screen.getByLabelText(/Alokasi Bahan WBS 1: Pembongkaran/i);
    fireEvent.change(wbs1Input, { target: { value: '0.5' } });

    // Submit overhead item
    const submitBtn = screen.getByRole('button', { name: /Tambah Overhead ke RAB/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.submit(submitBtn.closest('form')!);

    // Verify item in estimation table
    await waitFor(() => {
      expect(screen.getByText('Sewa Alat Khusus & Genset')).toBeInTheDocument();
    });

    expect(screen.getByText(/\[ OVERHEAD \]/i)).toBeInTheDocument();
    // 0.5 * 1,600,000 = 800,000 (appears in table row subtotal and footer KPI)
    expect(screen.getAllByText('Rp 800.000').length).toBeGreaterThanOrEqual(1);
  });

  it('accurately calculates overhead estimation with integer frequency (e.g. 2) and rate (1600000)', async () => {
    render(<RabCalculator spkId="spk-test-1" />);

    await waitFor(() => {
      expect(screen.getByText('Item Inisial Material')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Overhead/i }));

    const descInput = screen.getByPlaceholderText(/e\.g\. Workshop Bay Overhead/i);
    fireEvent.change(descInput, { target: { value: 'Uji Coba & Sertifikasi Karoseri' } });

    // Set frequency to 2
    const freqInput = screen.getByLabelText(/FREKWENSI DALAM PROYEK INI/i);
    fireEvent.change(freqInput, { target: { value: '2' } });

    // Set bay rate to 1,600,000
    const rateInput = screen.getByLabelText(/BAY RATE \/ FREKWENSI/i);
    fireEvent.change(rateInput, { target: { value: '1600000' } });

    // Allocate 1 to WBS 1 and 1 to WBS 2
    const wbs1Input = screen.getByLabelText(/Alokasi Bahan WBS 1: Pembongkaran/i);
    fireEvent.change(wbs1Input, { target: { value: '1' } });
    const wbs2Input = screen.getByLabelText(/Alokasi Bahan WBS 2: Sasis\/Rangka/i);
    fireEvent.change(wbs2Input, { target: { value: '1' } });

    // Submit overhead item
    const submitBtn = screen.getByRole('button', { name: /Tambah Overhead ke RAB/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.submit(submitBtn.closest('form')!);

    // Verify item in estimation table (2 rows created, 1 for each allocated WBS)
    await waitFor(() => {
      expect(screen.getAllByText('Uji Coba & Sertifikasi Karoseri').length).toBe(2);
    });

    // 2 * 1,600,000 = 3,200,000 (appears in table row subtotal and footer KPI)
    expect(screen.getAllByText('Rp 3.200.000').length).toBeGreaterThanOrEqual(1);
  });
});
