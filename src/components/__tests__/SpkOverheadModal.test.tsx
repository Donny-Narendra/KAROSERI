import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpkOverheadModal } from '../SpkOverheadModal';
import { financialReportsService } from '../../services/financialReportsService';

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
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          spk_no: 'SPK-2026-009',
          vehicle_plate: 'B 9988 XYZ',
          customer_name: 'PT Logistik Mandiri',
        },
        error: null,
      }),
    })),
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

  const mockExistingLogs = [
    {
      id: 'log-1',
      spk_id: 'spk-test-1',
      wbs_stage: 'Cat/Finishing',
      overhead_name: 'Pemakaian Oven Spray Booth 4 Jam',
      frequency_qty: 4,
      rate_per_unit: 150000,
      total_amount: 600000,
      notes: 'Pengecatan bak dump',
      recorded_at: '2026-10-18T00:30:00Z',
      created_by: 'mandor-user-001',
    },
    {
      id: 'log-2',
      spk_id: 'spk-test-1',
      wbs_stage: 'Dinding/Fabrikasi',
      overhead_name: 'Listrik Las Fabrikasi Lembur',
      frequency_qty: 5,
      rate_per_unit: 50000,
      total_amount: 250000,
      notes: 'Lembur rangka samping',
      recorded_at: '2026-10-18T01:00:00Z',
      created_by: 'mandor-user-001',
    },
  ];

  it('renders modal with SPK details, quick presets, and existing logs', async () => {
    vi.mocked(financialReportsService.getSpkOverheadLogs).mockResolvedValue(mockExistingLogs);

    render(
      <SpkOverheadModal
        isOpen={true}
        onClose={vi.fn()}
        spkId="spk-test-1"
        spkNumber="SPK-2026-009"
        vehiclePlate="B 9988 XYZ"
        customerName="PT Logistik Mandiri"
        defaultCategory="Cat/Finishing"
      />
    );

    // Header & Meta
    expect(screen.getByText('Pencatatan Overhead Pabrik (FOH)')).toBeInTheDocument();
    expect(screen.getByText('SPK-2026-009')).toBeInTheDocument();
    expect(screen.getByText('B 9988 XYZ')).toBeInTheDocument();
    expect(screen.getByText('PT Logistik Mandiri')).toBeInTheDocument();

    // Quick presets
    expect(screen.getByText('Oven Spray Booth & Gas')).toBeInTheDocument();
    expect(screen.getByText('Listrik Mesin Las & Fabrikasi')).toBeInTheDocument();
    expect(screen.getByText('Kompresor & Alat Pneumatik')).toBeInTheDocument();
    expect(screen.getByText('Sewa Derek / Crane Angkat')).toBeInTheDocument();

    // Wait for existing logs table
    await waitFor(() => {
      expect(screen.getByText('Pemakaian Oven Spray Booth 4 Jam')).toBeInTheDocument();
      expect(screen.getByText('Listrik Las Fabrikasi Lembur')).toBeInTheDocument();
    });

    // Total FOH check: 600000 + 250000 = 850000
    expect(screen.getByText('Riwayat Pembebanan Overhead Proyek (2)')).toBeInTheDocument();
  });

  it('applies quick preset when clicked and updates calculation preview', async () => {
    vi.mocked(financialReportsService.getSpkOverheadLogs).mockResolvedValue([]);

    render(
      <SpkOverheadModal
        isOpen={true}
        onClose={vi.fn()}
        spkId="spk-test-1"
      />
    );

    const presetBtn = screen.getByText('Oven Spray Booth & Gas');
    fireEvent.click(presetBtn);

    // Form inputs should be populated
    const nameInput = screen.getByPlaceholderText(/Contoh: Oven Spray Booth Jam Lembur/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Oven Spray Booth & Gas');

    // 4 jam * 150.000 = Rp 600.000
    expect(screen.getAllByText(/600\.000/).length).toBeGreaterThan(0);
  });

  it('submits a new overhead log and refreshes list', async () => {
    vi.mocked(financialReportsService.getSpkOverheadLogs).mockResolvedValue([]);
    vi.mocked(financialReportsService.createSpkOverheadLog).mockResolvedValue({
      id: 'log-new',
      spk_id: 'spk-test-1',
      wbs_stage: 'Sasis/Rangka',
      overhead_name: 'Kompresor Angin Shift 2',
      frequency_qty: 6,
      rate_per_unit: 35000,
      total_amount: 210000,
      notes: 'Bantu pembongkaran baut roda',
      recorded_at: '2026-10-18T01:10:00Z',
      created_by: 'mandor-user-001',
    });

    const onUpdateMock = vi.fn();

    render(
      <SpkOverheadModal
        isOpen={true}
        onClose={vi.fn()}
        spkId="spk-test-1"
        onOverheadUpdated={onUpdateMock}
      />
    );

    // Fill form
    const nameInput = screen.getByPlaceholderText(/Contoh: Oven Spray Booth Jam Lembur/i);
    fireEvent.change(nameInput, { target: { value: 'Kompresor Angin Shift 2' } });

    const qtyInput = screen.getByPlaceholderText('1');
    fireEvent.change(qtyInput, { target: { value: '6' } });

    const rateInput = screen.getByPlaceholderText('Rp 0');
    fireEvent.change(rateInput, { target: { value: '35000' } });

    const notesInput = screen.getByPlaceholderText(/Pemakaian spray booth shift malam/i);
    fireEvent.change(notesInput, { target: { value: 'Bantu pembongkaran baut roda' } });

    // Submit
    const submitBtn = screen.getByText('Simpan Catatan Overhead');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(financialReportsService.createSpkOverheadLog).toHaveBeenCalledWith(
        expect.objectContaining({
          spk_id: 'spk-test-1',
          overhead_name: 'Kompresor Angin Shift 2',
          frequency_qty: 6,
          rate_per_unit: 35000,
          notes: 'Bantu pembongkaran baut roda',
          created_by: 'mandor-user-001',
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
        onOverheadUpdated={onUpdateMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pemakaian Oven Spray Booth 4 Jam')).toBeInTheDocument();
    });

    // Find and click delete button for log-1
    const deleteButtons = screen.getAllByTitle('Hapus pembebanan overhead');
    fireEvent.click(deleteButtons[0]);

    // Confirmation modal should be opened
    expect(screen.getByText('Hapus Catatan Overhead?')).toBeInTheDocument();
    expect(screen.getByText(/Apakah Anda yakin ingin menghapus catatan overhead/i)).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByText('Ya, Hapus');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(financialReportsService.deleteSpkOverheadLog).toHaveBeenCalledWith('log-1');
      expect(onUpdateMock).toHaveBeenCalled();
    });
  });
});
