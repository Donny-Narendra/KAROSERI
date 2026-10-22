import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResetSimulationModal } from '../ResetSimulationModal';
import { supabase } from '../../../lib/supabaseClient';

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('Component: ResetSimulationModal (Owner Fresh State Simulation Reset)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ResetSimulationModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal with warning details, data lists, and disabled reset button initially', () => {
    render(<ResetSimulationModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Reset Seluruh Transaksi Simulasi')).toBeInTheDocument();
    expect(screen.getByText(/Data Dihapus Bersih/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Aman Dilindungi/i)).toBeInTheDocument();

    const resetButton = screen.getByRole('button', { name: /Hapus Semua Transaksi & Reset/i });
    expect(resetButton).toBeDisabled();
  });

  it('keeps button disabled when typed confirmation does not match "RESET SIMULASI"', () => {
    render(<ResetSimulationModal isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Ketik RESET SIMULASI di sini/i);
    const resetButton = screen.getByRole('button', { name: /Hapus Semua Transaksi & Reset/i });

    fireEvent.change(input, { target: { value: 'reset' } });
    expect(resetButton).toBeDisabled();

    fireEvent.change(input, { target: { value: 'RESET' } });
    expect(resetButton).toBeDisabled();

    fireEvent.change(input, { target: { value: 'reset simulasi' } }); // lowercase
    expect(resetButton).toBeDisabled();
  });

  it('enables the button when exact string "RESET SIMULASI" is entered', () => {
    render(<ResetSimulationModal isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Ketik RESET SIMULASI di sini/i);
    const resetButton = screen.getByRole('button', { name: /Hapus Semua Transaksi & Reset/i });

    fireEvent.change(input, { target: { value: 'RESET SIMULASI' } });
    expect(resetButton).not.toBeDisabled();
  });

  it('invokes supabase.rpc("reset_all_simulation_transactions") and calls onSuccess after success', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: { success: true, message: 'Transaksi berhasil dibersihkan' },
      error: null,
    });

    const handleSuccess = vi.fn();
    render(
      <ResetSimulationModal isOpen={true} onClose={vi.fn()} onSuccess={handleSuccess} />
    );

    const input = screen.getByPlaceholderText(/Ketik RESET SIMULASI di sini/i);
    fireEvent.change(input, { target: { value: 'RESET SIMULASI' } });

    const resetButton = screen.getByRole('button', { name: /Hapus Semua Transaksi & Reset/i });
    fireEvent.click(resetButton);

    expect(supabase.rpc).toHaveBeenCalledWith('reset_all_simulation_transactions');

    await waitFor(() => {
      expect(screen.getByText(/Transaksi berhasil dibersihkan/i)).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(handleSuccess).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });

  it('displays error banner if RPC returns an error', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: { message: 'Database connection timeout' },
    });

    render(<ResetSimulationModal isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Ketik RESET SIMULASI di sini/i);
    fireEvent.change(input, { target: { value: 'RESET SIMULASI' } });

    const resetButton = screen.getByRole('button', { name: /Hapus Semua Transaksi & Reset/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText(/Database connection timeout/i)).toBeInTheDocument();
    });
  });
});
