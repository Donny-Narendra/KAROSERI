import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpkForm } from '../SpkForm';
import { SpkCredentialSection } from '../SpkCredentialSection';
import { supabase } from '../../lib/supabaseClient';
import { spkService } from '../../services/spkService';

// Mock CloudinaryUploader to keep tests lightweight
vi.mock('../ui/CloudinaryUploader', () => ({
  CloudinaryUploader: () => <div data-testid="mock-cloudinary-uploader" />,
}));

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      id: 'sa-user-99',
      full_name: 'Antigravity Service Advisor',
      role: 'service_advisor',
    },
  }),
}));

// Mock Supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock spkService
vi.mock('../../services/spkService', () => ({
  spkService: {
    updateSpkCredentials: vi.fn(),
  },
}));

describe('Component: SpkForm (Vehicle Model Field & Payload Binding)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders VEHICLE MODEL input field with proper label and placeholder', () => {
    render(<SpkForm />);

    expect(screen.getByText(/vehicle model/i)).toBeInTheDocument();
    const modelInput = screen.getByPlaceholderText(/hino dutro 130 hd/i);
    expect(modelInput).toBeInTheDocument();
    expect(modelInput).toHaveValue('');
  });

  it('binds vehicle model input state and includes vehicle_model in Supabase INSERT payload', async () => {
    let capturedPayload: any = null;

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockImplementation((payload) => {
        capturedPayload = payload;
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'spk-new-1', ...payload },
              error: null,
            }),
          }),
        };
      }),
    } as any);

    const onSuccessMock = vi.fn();
    render(<SpkForm onSuccess={onSuccessMock} />);

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/target date/i), {
      target: { value: '2026-11-15' },
    });
    fireEvent.change(screen.getByPlaceholderText(/pt logistik indo/i), {
      target: { value: 'PT Sumber Berkah Armada' },
    });
    fireEvent.change(screen.getByPlaceholderText(/b 1234 cd/i), {
      target: { value: 'B 9988 XYZ' },
    });

    // Fill in Vehicle Model
    const modelInput = screen.getByPlaceholderText(/hino dutro 130 hd/i);
    fireEvent.change(modelInput, {
      target: { value: 'Hino Dutro 130 HD' },
    });

    // Fill in VIN and Engine
    fireEvent.change(screen.getByPlaceholderText(/mh123456789/i), {
      target: { value: 'MHF130HD123456' },
    });
    fireEvent.change(screen.getByPlaceholderText(/4d56-12345/i), {
      target: { value: 'W04D-98765' },
    });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /register spk/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    // Verify Supabase insert payload contains vehicle_model
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.vehicle_model).toBe('Hino Dutro 130 HD');
    expect(capturedPayload.vehicle_plate).toBe('B 9988 XYZ');
    expect(capturedPayload.customer_name).toBe('PT Sumber Berkah Armada');
    expect(capturedPayload.vin_chassis).toBe('MHF130HD123456');
    expect(capturedPayload.engine_number).toBe('W04D-98765');
    expect(capturedPayload.created_by).toBe('sa-user-99');

    // Verify form resets vehicle model
    expect(modelInput).toHaveValue('');
  });

  it('correctly inserts SPK with specific model "Mitsubishi Fuso Canter 125 PS" into public.spk payload', async () => {
    let capturedPayload: any = null;

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockImplementation((payload) => {
        capturedPayload = payload;
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'spk-test-fuso-1', ...payload },
              error: null,
            }),
          }),
        };
      }),
    } as any);

    const onSuccessMock = vi.fn();
    render(<SpkForm onSuccess={onSuccessMock} />);

    fireEvent.change(screen.getByLabelText(/target date/i), {
      target: { value: '2026-11-30' },
    });
    fireEvent.change(screen.getByPlaceholderText(/pt logistik indo/i), {
      target: { value: 'CV Ekspedisi Lancar Jaya' },
    });
    fireEvent.change(screen.getByPlaceholderText(/b 1234 cd/i), {
      target: { value: 'W 8899 UY' },
    });
    fireEvent.change(screen.getByPlaceholderText(/hino dutro 130 hd \/ canter fe 74/i), {
      target: { value: 'Mitsubishi Fuso Canter 125 PS' },
    });
    fireEvent.change(screen.getByPlaceholderText(/4d56-12345/i), {
      target: { value: '4D34-T7788' },
    });

    const submitBtn = screen.getByRole('button', { name: /register spk/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.vehicle_model).toBe('Mitsubishi Fuso Canter 125 PS');
    expect(capturedPayload.vehicle_engine).toBe('4D34-T7788');
    expect(capturedPayload.vehicle_plate).toBe('W 8899 UY');
  });

  it('populates initial vehicle model in edit mode and updates through spkService', async () => {
    const initialSpk = {
      id: 'spk-edit-1',
      spk_no: 'SPK-7788',
      customer_name: 'PT Mitra Tangguh',
      vehicle_plate: 'L 1234 AB',
      vehicle_model: 'Mitsubishi Canter FE 74 HD',
      vin_chassis: 'MKC74HD998877',
      engine_number: '4D34-55443',
      target_date: '2026-12-01',
      vehicle_number: 'L 1234 AB',
      status: 'ACTIVE' as const,
      created_at: '2026-10-15T10:00:00Z',
    };

    vi.mocked(spkService.updateSpkCredentials).mockResolvedValue({} as any);

    const onSuccessMock = vi.fn();
    render(<SpkForm initialData={initialSpk} isEditMode={true} onSuccess={onSuccessMock} />);

    // Should populate vehicle model
    const modelInput = screen.getByPlaceholderText(/hino dutro 130 hd/i);
    expect(modelInput).toHaveValue('Mitsubishi Canter FE 74 HD');

    // Edit vehicle model
    fireEvent.change(modelInput, {
      target: { value: 'Mitsubishi Canter FE 84 G' },
    });

    // Submit update
    const submitBtn = screen.getByRole('button', { name: /simpan perubahan/i });
    fireEvent.click(submitBtn);

    // Modal confirmation opens
    const confirmBtn = screen.getByRole('button', { name: /ya, simpan perubahan/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(spkService.updateSpkCredentials).toHaveBeenCalledTimes(1);
    });

    expect(spkService.updateSpkCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        spkNo: 'SPK-7788',
        vehicleModel: 'Mitsubishi Canter FE 84 G',
        vehiclePlate: 'L 1234 AB',
      })
    );
  });
});

describe('Component: SpkCredentialSection (Vehicle Model Display & Edit)', () => {
  const mockSpk = {
    id: 'spk-cred-1',
    spk_no: 'SPK-9001',
    customer_name: 'PT Karoseri Megah',
    vehicle_plate: 'N 5566 KL',
    vehicle_model: 'Isuzu Giga FVR 34 P',
    vin_chassis: 'ISZ34P112233',
    engine_number: '6HK1-88776',
    target_date: '2026-11-20',
    vehicle_number: 'N 5566 KL',
    status: 'ACTIVE' as const,
    created_at: '2026-10-18T09:00:00Z',
  };

  it('displays Model Kendaraan in view mode', () => {
    render(<SpkCredentialSection spk={mockSpk} onUpdated={vi.fn()} />);

    expect(screen.getByText('Model Kendaraan')).toBeInTheDocument();
    expect(screen.getByText('Isuzu Giga FVR 34 P')).toBeInTheDocument();
  });

  it('allows editing Vehicle Model in SpkCredentialSection edit mode', async () => {
    vi.mocked(spkService.updateSpkCredentials).mockResolvedValue({} as any);
    const onUpdatedMock = vi.fn();

    render(<SpkCredentialSection spk={mockSpk} onUpdated={onUpdatedMock} initialEditMode={true} />);

    const modelInput = screen.getByPlaceholderText(/hino dutro 130 hd/i);
    expect(modelInput).toHaveValue('Isuzu Giga FVR 34 P');

    fireEvent.change(modelInput, {
      target: { value: 'Isuzu Giga FVM 34 U' },
    });

    const saveBtn = screen.getByRole('button', { name: /simpan perubahan/i });
    fireEvent.click(saveBtn);

    const confirmBtn = screen.getByRole('button', { name: /ya, simpan perubahan/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(spkService.updateSpkCredentials).toHaveBeenCalledTimes(1);
    });

    expect(spkService.updateSpkCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        spkNo: 'SPK-9001',
        vehicleModel: 'Isuzu Giga FVM 34 U',
      })
    );
  });

  it('renders Dokumentasi Surat Kesepakatan Kerja section in view mode', () => {
    render(<SpkCredentialSection spk={mockSpk} onUpdated={vi.fn()} />);

    expect(screen.getByText('Dokumentasi Surat Kesepakatan Kerja')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unggah Dokumen/i })).toBeInTheDocument();
  });

  describe('Scope Modifikasi / Sub Tasks Box', () => {
    it('renders sub tasks badges when sub_tasks is string array', () => {
      const spkWithArray = {
        ...mockSpk,
        sub_tasks: ['Potong Sasis 50cm', 'Box Aluminium', 'Tes'],
      };
      render(<SpkCredentialSection spk={spkWithArray} onUpdated={vi.fn()} />);

      expect(screen.getByText('SCOPE MODIFIKASI / SUB TASKS:')).toBeInTheDocument();
      expect(screen.getByText('Potong Sasis 50cm')).toBeInTheDocument();
      expect(screen.getByText('Box Aluminium')).toBeInTheDocument();
      expect(screen.getByText('Tes')).toBeInTheDocument();
    });

    it('parses and renders sub tasks when sub_tasks is JSON string', () => {
      const spkWithJson = {
        ...mockSpk,
        sub_tasks: '["Dump Truck Kit", "Hidrolik PTO"]' as any,
      };
      render(<SpkCredentialSection spk={spkWithJson} onUpdated={vi.fn()} />);

      expect(screen.getByText('SCOPE MODIFIKASI / SUB TASKS:')).toBeInTheDocument();
      expect(screen.getByText('Dump Truck Kit')).toBeInTheDocument();
      expect(screen.getByText('Hidrolik PTO')).toBeInTheDocument();
    });

    it('parses comma and newline separated string sub_tasks', () => {
      const spkWithString = {
        ...mockSpk,
        sub_tasks: 'Instalasi Tangki, Pengecatan Full Oven\nKelistrikan' as any,
      };
      render(<SpkCredentialSection spk={spkWithString} onUpdated={vi.fn()} />);

      expect(screen.getByText('SCOPE MODIFIKASI / SUB TASKS:')).toBeInTheDocument();
      expect(screen.getByText('Instalasi Tangki')).toBeInTheDocument();
      expect(screen.getByText('Pengecatan Full Oven')).toBeInTheDocument();
      expect(screen.getByText('Kelistrikan')).toBeInTheDocument();
    });

    it('renders informative fallback when sub_tasks is empty or null without hiding the container', () => {
      const spkEmpty = {
        ...mockSpk,
        sub_tasks: [],
      };
      render(<SpkCredentialSection spk={spkEmpty} onUpdated={vi.fn()} />);

      expect(screen.getByText('SCOPE MODIFIKASI / SUB TASKS:')).toBeInTheDocument();
      expect(
        screen.getByText(/Belum ada rincian scope modifikasi. Klik "Edit Credential" untuk menambahkan sub task./i)
      ).toBeInTheDocument();
    });

    it('maintains correct DOM order: 6-column grid -> Scope Modifikasi -> Dokumentasi Surat Kesepakatan Kerja', () => {
      const spkWithSubTasks = {
        ...mockSpk,
        sub_tasks: ['Pemasangan Karoseri Box'],
      };
      render(<SpkCredentialSection spk={spkWithSubTasks} onUpdated={vi.fn()} />);

      const gridCol = screen.getByText('Pelanggan');
      const scopeModif = screen.getByText('SCOPE MODIFIKASI / SUB TASKS:');
      const docHeader = screen.getByText('Dokumentasi Surat Kesepakatan Kerja');

      expect(gridCol).toBeInTheDocument();
      expect(scopeModif).toBeInTheDocument();
      expect(docHeader).toBeInTheDocument();

      // Check document position hierarchy
      expect(gridCol.compareDocumentPosition(scopeModif) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(scopeModif.compareDocumentPosition(docHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});
