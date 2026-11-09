import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpkIsolationManagerModal } from '../SpkIsolationManagerModal';
import { supabase } from '../../../lib/supabaseClient';

const mockSpkList = [
  {
    id: 'spk-uuid-1',
    spk_no: 'SPK-2026-001',
    customer_name: 'Budi Santoso',
    vehicle_plate: 'B 1234 CD',
    status: 'ACTIVE',
    is_hidden: false,
    is_test: false,
    hidden_at: null,
    hidden_reason: null,
    created_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 'spk-uuid-2',
    spk_no: 'SPK-2026-002',
    customer_name: 'PT Karoseri Uji',
    vehicle_plate: 'B 9999 TEST',
    status: 'COMPLETED',
    is_hidden: true,
    is_test: true,
    hidden_at: '2026-11-02T12:00:00Z',
    hidden_reason: 'Uji Coba Sistem / Isolasi Finansial',
    created_at: '2026-11-02T10:00:00Z',
  },
];

vi.mock('../../../lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
});

describe('Component: SpkIsolationManagerModal (SPK Soft-Isolation & Safe Data Hiding)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockQueryBuilder = {
      order: vi.fn().mockResolvedValue({
        data: mockSpkList,
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue(mockQueryBuilder),
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <SpkIsolationManagerModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal with SPK list, status badges, and disabled action buttons initially', async () => {
    render(<SpkIsolationManagerModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Manajemen Isolasi SPK (Soft-Isolation)')).toBeInTheDocument();
    expect(screen.getByText('Khusus Owner')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('SPK-2026-001')).toBeInTheDocument();
      expect(screen.getByText('SPK-2026-002')).toBeInTheDocument();
    });

    expect(screen.getByText('NORMAL')).toBeInTheDocument();
    expect(screen.getByText('TERISOLASI')).toBeInTheDocument();

    const isolateBtn = screen.getByRole('button', { name: /Sembunyikan & Isolasi/i });
    const restoreBtn = screen.getByRole('button', { name: /Pulihkan ke Sistem/i });
    expect(isolateBtn).toBeDisabled();
    expect(restoreBtn).toBeDisabled();
  });

  it('allows selecting rows and enables action buttons', async () => {
    render(<SpkIsolationManagerModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SPK-2026-001')).toBeInTheDocument();
    });

    const row1 = screen.getByText('SPK-2026-001').closest('tr')!;
    fireEvent.click(row1);

    expect(screen.getByText(/1 SPK dipilih/i)).toBeInTheDocument();

    const isolateBtn = screen.getByRole('button', { name: /Sembunyikan & Isolasi/i });
    expect(isolateBtn).not.toBeDisabled();
  });

  it('opens confirmation modal and enforces typing "KONFIRMASI" before enabling execution', async () => {
    render(<SpkIsolationManagerModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SPK-2026-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('SPK-2026-001').closest('tr')!);

    const isolateBtn = screen.getByRole('button', { name: /Sembunyikan & Isolasi/i });
    fireEvent.click(isolateBtn);

    expect(screen.getByText(/Konfirmasi Isolasi Finansial \(1 SPK\)/i)).toBeInTheDocument();

    const execBtn = screen.getByRole('button', { name: /Eksekusi Isolasi/i });
    expect(execBtn).toBeDisabled();

    const confirmInput = screen.getByPlaceholderText('Ketik KONFIRMASI');
    fireEvent.change(confirmInput, { target: { value: 'konfirmasi' } }); // lowercase
    expect(execBtn).toBeDisabled();

    fireEvent.change(confirmInput, { target: { value: 'KONFIRMASI' } }); // exact
    expect(execBtn).not.toBeDisabled();
  });

  it('executes set_spk_isolation_status RPC with is_hidden = true and is_test = true when isolating', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: null,
    });

    const handleSuccess = vi.fn();
    render(
      <SpkIsolationManagerModal isOpen={true} onClose={vi.fn()} onSuccess={handleSuccess} />
    );

    await waitFor(() => {
      expect(screen.getByText('SPK-2026-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('SPK-2026-001').closest('tr')!);
    fireEvent.click(screen.getByRole('button', { name: /Sembunyikan & Isolasi/i }));

    const confirmInput = screen.getByPlaceholderText('Ketik KONFIRMASI');
    fireEvent.change(confirmInput, { target: { value: 'KONFIRMASI' } });

    fireEvent.click(screen.getByRole('button', { name: /Eksekusi Isolasi/i }));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('set_spk_isolation_status', {
        p_spk_ids: ['spk-uuid-1'],
        p_is_hidden: true,
        p_is_test: true,
        p_reason: 'Uji Coba Sistem / Isolasi Finansial',
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('executes set_spk_isolation_status RPC with is_hidden = false and is_test = false when restoring', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: null,
    });

    const handleSuccess = vi.fn();
    render(
      <SpkIsolationManagerModal isOpen={true} onClose={vi.fn()} onSuccess={handleSuccess} />
    );

    await waitFor(() => {
      expect(screen.getByText('SPK-2026-002')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('SPK-2026-002').closest('tr')!);
    fireEvent.click(screen.getByRole('button', { name: /Pulihkan ke Sistem/i }));

    const confirmInput = screen.getByPlaceholderText('Ketik KONFIRMASI');
    fireEvent.change(confirmInput, { target: { value: 'KONFIRMASI' } });

    fireEvent.click(screen.getByRole('button', { name: /Eksekusi Pemulihan/i }));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('set_spk_isolation_status', {
        p_spk_ids: ['spk-uuid-2'],
        p_is_hidden: false,
        p_is_test: false,
        p_reason: 'Dipulihkan ke sistem',
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('displays error banner if RPC returns permission error (Akses ditolak)', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: { message: 'Akses ditolak: Hanya Owner yang berhak mengisolasi atau menyembunyikan SPK.' },
    });

    render(<SpkIsolationManagerModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SPK-2026-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('SPK-2026-001').closest('tr')!);
    fireEvent.click(screen.getByRole('button', { name: /Sembunyikan & Isolasi/i }));

    const confirmInput = screen.getByPlaceholderText('Ketik KONFIRMASI');
    fireEvent.change(confirmInput, { target: { value: 'KONFIRMASI' } });

    fireEvent.click(screen.getByRole('button', { name: /Eksekusi Isolasi/i }));

    await waitFor(() => {
      expect(screen.getByText(/Akses ditolak: Hanya Owner yang berhak/i)).toBeInTheDocument();
    });
  });
});
