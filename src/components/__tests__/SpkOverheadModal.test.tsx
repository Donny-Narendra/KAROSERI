import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpkOverheadModal } from '../SpkOverheadModal';
import { financialReportsService } from '../../services/financialReportsService';
import { supabase } from '../../lib/supabaseClient';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'mandor-user-001' },
    profile: {
      id: 'mandor-user-001',
      full_name: 'Pak Mandor Karoseri',
      role: 'mandor',
    },
  }),
}));

// Mock Supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'change_order_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: vi.fn().mockImplementation((fn: any) => Promise.resolve({ data: [], error: null }).then(fn)),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            spk_no: 'SPK-2668',
            vehicle_plate: 'B 3453 iuy',
            customer_name: 'PT. CARAKANUSA TRANSPORTAMA',
          },
          error: null,
        }),
      };
    }),
  },
}));

// Mock financialReportsService
vi.mock('../../services/financialReportsService', () => ({
  financialReportsService: {
    getSpkOverheadLogs: vi.fn(),
    createSpkOverheadLog: vi.fn(),
    deleteSpkOverheadLog: vi.fn(),
  },
}));

describe('Component: SpkOverheadModal (Mandor Floor Terminal Overhead Logging)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRabOverheadItems = [
    {
      id: 'rab-oh-1',
      spk_id: 'spk-test-1',
      wbs_category: 'Pembongkaran',
      material_name: 'LISTRIK',
      quantity: 0.2,
      unit: 'satuan',
      unit_price: 30000,
      item_total: 6000,
      item_type: 'OVERHEAD',
    },
    {
      id: 'rab-oh-2',
      spk_id: 'spk-test-1',
      wbs_category: 'Pembongkaran',
      material_name: 'sewa kompressor',
      quantity: 0.2,
      unit: 'satuan',
      unit_price: 20000,
      item_total: 4000,
      item_type: 'OVERHEAD',
    },
    {
      id: 'rab-oh-3',
      spk_id: 'spk-test-1',
      wbs_category: 'Cat/Finishing',
      material_name: 'Oven Spray Booth & Gas',
      quantity: 4,
      unit: 'jam',
      unit_price: 150000,
      item_total: 600000,
      item_type: 'OVERHEAD',
    },
  ];

  const mockExistingLogs = [
    {
      id: 'log-1',
      spk_id: 'spk-test-1',
      wbs_stage: 'Pembongkaran',
      overhead_name: 'sewa kompressor',
      frequency_qty: 0.2,
      rate_per_unit: 20000,
      total_amount: 4000,
      notes: 'Bongkar bak',
      recorded_at: '2026-10-18T00:30:00Z',
      created_by: 'mandor-user-001',
      rab_item_id: 'rab-oh-2',
    },
  ];

  it('renders dynamic RAB overhead cards for active WBS stage and does not show static presets by default', async () => {
    vi.mocked(financialReportsService.getSpkOverheadLogs).mockResolvedValue([]);

    render(
      <SpkOverheadModal
        isOpen={true}
        onClose={vi.fn()}
        spkId="spk-test-1"
        spkNumber="SPK-2668"
        vehiclePlate="B 3453 iuy"
        customerName="PT. CARAKANUSA TRANSPORTAMA"
        defaultCategory="Pembongkaran"
        rabOverheadItems={mockRabOverheadItems}
      />
    );

    await waitFor(() => {
      expect(financialReportsService.getSpkOverheadLogs).toHaveBeenCalledWith('spk-test-1');
    });

    // Header & Meta
    expect(screen.getByText('Pencatatan Overhead Pabrik (FOH)')).toBeInTheDocument();
    expect(screen.getByText('SPK-2668')).toBeInTheDocument();
    expect(screen.getByText('B 3453 iuy')).toBeInTheDocument();
    expect(screen.getByText('PT. CARAKANUSA TRANSPORTAMA')).toBeInTheDocument();

    // Section header
    expect(screen.getByText(/Alokasi Overhead dari RAB & Change Orders \(Pembongkaran\)/i)).toBeInTheDocument();

    // Dynamic RAB presets for Pembongkaran
    expect(screen.getByText('LISTRIK')).toBeInTheDocument();
    expect(screen.getByText('sewa kompressor')).toBeInTheDocument();

    // Cat/Finishing item should not be shown on Pembongkaran
    expect(screen.queryByText('Oven Spray Booth & Gas')).not.toBeInTheDocument();

    // Hardcoded static preset Sewa Derek / Crane should not appear in dynamic list
    expect(screen.queryByText('Sewa Derek / Crane Angkat')).not.toBeInTheDocument();
  });

  it('applies dynamic RAB preset when clicked and auto-fills form inputs and binds rab_item_id', async () => {
    vi.mocked(financialReportsService.getSpkOverheadLogs).mockResolvedValue([]);

    render(
      <SpkOverheadModal
        isOpen={true}
        onClose={vi.fn()}
        spkId="spk-test-1"
        spkNumber="SPK-2668"
        defaultCategory="Pembongkaran"
        rabOverheadItems={mockRabOverheadItems}
      />
    );

    await waitFor(() => {
      expect(financialReportsService.getSpkOverheadLogs).toHaveBeenCalledWith('spk-test-1');
    });

    // Click LISTRIK preset
    const listrikPresetBtn = screen.getByText('LISTRIK');
    fireEvent.click(listrikPresetBtn);

    // Form inputs should be populated
    const nameInput = screen.getByPlaceholderText(/Contoh: Oven Spray Booth Jam Lembur/i) as HTMLInputElement;
    expect(nameInput.value).toBe('LISTRIK');

    const rateInput = screen.getByPlaceholderText('Rp 0') as HTMLInputElement;
    expect(rateInput.value).toBe('30000');

    const qtyInput = screen.getByPlaceholderText('1') as HTMLInputElement;
    expect(qtyInput.value).toBe('0.2');

    // Indicator of sync with RAB should appear
    expect(screen.getByText(/⚡ RAB Sinkron/i)).toBeInTheDocument();

    // Subtotal: 0.2 * 30000 = Rp 6.000
    expect(screen.getByText(/Rp\s*6\.000/i)).toBeInTheDocument();
  });

  it('correctly calculates remaining quota when overhead is partially or fully logged', async () => {
    vi.mocked(financialReportsService.getSpkOverheadLogs).mockResolvedValue(mockExistingLogs);

    render(
      <SpkOverheadModal
        isOpen={true}
        onClose={vi.fn()}
        spkId="spk-test-1"
        defaultCategory="Pembongkaran"
        rabOverheadItems={mockRabOverheadItems}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('LISTRIK')).toBeInTheDocument();
      expect(screen.getByText('sewa kompressor')).toBeInTheDocument();
    });

    // LISTRIK has not been logged yet: remaining = 0.2
    expect(screen.getAllByText(/0\.2 satuan/i).length).toBeGreaterThan(0);

    // sewa kompressor was logged for 0.2: remaining = 0
    expect(screen.getByText(/0 satuan/i)).toBeInTheDocument();
  });

  it('shows fallback button when stage has no RAB overhead and toggles master presets', async () => {
    vi.mocked(financialReportsService.getSpkOverheadLogs).mockResolvedValue([]);

    render(
      <SpkOverheadModal
        isOpen={true}
        onClose={vi.fn()}
        spkId="spk-test-1"
        defaultCategory="Kelistrikan/Hidrolik"
        rabOverheadItems={mockRabOverheadItems}
      />
    );

    await waitFor(() => {
      expect(financialReportsService.getSpkOverheadLogs).toHaveBeenCalledWith('spk-test-1');
    });

    // Fallback notice
    expect(screen.getByText(/Tidak ada alokasi overhead RAB atau Change Orders untuk tahapan/i)).toBeInTheDocument();
    const fallbackToggleBtn = screen.getByText('Tampilkan Master Preset Gudang (Umum)');
    expect(fallbackToggleBtn).toBeInTheDocument();

    // Click toggle
    fireEvent.click(fallbackToggleBtn);

    // Master presets should now appear
    expect(screen.getByText('Oven Spray Booth & Gas')).toBeInTheDocument();
    expect(screen.getByText('Listrik Mesin Las & Fabrikasi')).toBeInTheDocument();
    expect(screen.getByText('Kompresor & Alat Pneumatik')).toBeInTheDocument();
    expect(screen.getByText('Sewa Derek / Crane Angkat')).toBeInTheDocument();

    // Clicking master preset applies general preset without rab_item_id
    fireEvent.click(screen.getByText('Sewa Derek / Crane Angkat'));
    const nameInput = screen.getByPlaceholderText(/Contoh: Oven Spray Booth Jam Lembur/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Sewa Derek / Crane Angkat');
    expect(screen.queryByText(/⚡ RAB Sinkron/i)).not.toBeInTheDocument();
  });

  it('submits a new overhead log with rab_item_id and refreshes list', async () => {
    vi.mocked(financialReportsService.getSpkOverheadLogs).mockResolvedValue([]);
    vi.mocked(financialReportsService.createSpkOverheadLog).mockResolvedValue({
      id: 'log-new',
      spk_id: 'spk-test-1',
      wbs_stage: 'Pembongkaran',
      overhead_name: 'LISTRIK',
      frequency_qty: 0.2,
      rate_per_unit: 30000,
      total_amount: 6000,
      notes: 'Pemakaian las listrik',
      recorded_at: '2026-10-19T01:10:00Z',
      created_by: 'mandor-user-001',
      rab_item_id: 'rab-oh-1',
    });

    const onUpdateMock = vi.fn();

    render(
      <SpkOverheadModal
        isOpen={true}
        onClose={vi.fn()}
        spkId="spk-test-1"
        defaultCategory="Pembongkaran"
        rabOverheadItems={mockRabOverheadItems}
        onOverheadUpdated={onUpdateMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('LISTRIK')).toBeInTheDocument();
    });

    // Click preset
    fireEvent.click(screen.getByText('LISTRIK'));

    // Submit
    const submitBtn = screen.getByText('Simpan Catatan Overhead');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(financialReportsService.createSpkOverheadLog).toHaveBeenCalledWith(
        expect.objectContaining({
          spk_id: 'spk-test-1',
          overhead_name: 'LISTRIK',
          frequency_qty: 0.2,
          rate_per_unit: 30000,
          wbs_stage: 'Pembongkaran',
          rab_item_id: 'rab-oh-1',
        })
      );
      expect(onUpdateMock).toHaveBeenCalled();
    });
  });

  it('deletes an existing overhead log after confirmation', async () => {
    vi.mocked(financialReportsService.getSpkOverheadLogs).mockResolvedValue(mockExistingLogs);
    vi.mocked(financialReportsService.deleteSpkOverheadLog).mockResolvedValue();

    const onUpdateMock = vi.fn();

    render(
      <SpkOverheadModal
        isOpen={true}
        onClose={vi.fn()}
        spkId="spk-test-1"
        defaultCategory="Pembongkaran"
        rabOverheadItems={mockRabOverheadItems}
        onOverheadUpdated={onUpdateMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('sewa kompressor')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButtons = screen.getAllByTitle('Hapus pembebanan overhead');
    fireEvent.click(deleteButtons[0]);

    // Confirmation modal should be opened
    expect(screen.getByText('Hapus Catatan Overhead?')).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByText('Ya, Hapus');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(financialReportsService.deleteSpkOverheadLog).toHaveBeenCalledWith('log-1');
      expect(onUpdateMock).toHaveBeenCalled();
    });
  });

  it('ingests and renders approved Change Order OVERHEAD items as presets, auto-populates form, and submits with change_order_item_id', async () => {
    vi.mocked(financialReportsService.getSpkOverheadLogs).mockResolvedValue([]);
    vi.mocked(financialReportsService.createSpkOverheadLog).mockResolvedValue({
      id: 'log-co-1',
      spk_id: 'spk-test-1',
      wbs_stage: 'Pembongkaran',
      overhead_name: '[CO] Sewa Crane Darurat',
      frequency_qty: 2,
      rate_per_unit: 250000,
      total_amount: 500000,
      notes: null,
      recorded_at: '2026-10-20T08:00:00Z',
      created_by: 'mandor-user-001',
      rab_item_id: null,
      change_order_item_id: 'co-oh-item-1',
    });

    const mockCoOverheadItem = {
      id: 'co-oh-item-1',
      change_order_id: 'co-header-1',
      spk_id: 'spk-test-1',
      item_name: 'Sewa Crane Darurat',
      quantity: 2,
      unit: 'shift',
      unit_price: 250000,
      cost_price: 200000,
      subtotal: 500000,
      notes: 'Bongkar sasis bengkok darurat',
      wbs_stage: 'Pembongkaran',
      item_type: 'OVERHEAD',
      change_orders: { status: 'APPROVED', co_number: 'CO-001' },
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'change_order_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: vi.fn().mockImplementation((fn: any) =>
            Promise.resolve({ data: [mockCoOverheadItem], error: null }).then(fn)
          ),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            spk_no: 'SPK-2668',
            vehicle_plate: 'B 3453 iuy',
            customer_name: 'PT. CARAKANUSA TRANSPORTAMA',
          },
          error: null,
        }),
      } as any;
    });

    render(
      <SpkOverheadModal
        isOpen={true}
        onClose={vi.fn()}
        spkId="spk-test-1"
        defaultCategory="Pembongkaran"
        rabOverheadItems={[]}
      />
    );

    // Verify [CO] badge and item name appear in dynamic presets
    await waitFor(() => {
      expect(screen.getByText('[CO]')).toBeInTheDocument();
      expect(screen.getByText('[CO] Sewa Crane Darurat')).toBeInTheDocument();
    });

    // Click Change Order preset
    fireEvent.click(screen.getByText('[CO] Sewa Crane Darurat'));

    // Verify inputs auto-populated
    const nameInput = screen.getByPlaceholderText(/Contoh: Oven Spray Booth Jam Lembur/i) as HTMLInputElement;
    expect(nameInput.value).toBe('[CO] Sewa Crane Darurat');

    const rateInput = screen.getByPlaceholderText('Rp 0') as HTMLInputElement;
    expect(rateInput.value).toBe('250000');

    const qtyInput = screen.getByPlaceholderText('1') as HTMLInputElement;
    expect(qtyInput.value).toBe('2');

    // Submit form
    const submitBtn = screen.getByText('Simpan Catatan Overhead');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(financialReportsService.createSpkOverheadLog).toHaveBeenCalledWith(
        expect.objectContaining({
          spk_id: 'spk-test-1',
          overhead_name: '[CO] Sewa Crane Darurat',
          frequency_qty: 2,
          rate_per_unit: 250000,
          wbs_stage: 'Pembongkaran',
          rab_item_id: null,
          change_order_item_id: 'co-oh-item-1',
        })
      );
    });
  });
});
