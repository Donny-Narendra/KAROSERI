import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditDpModal } from '../EditDpModal';
import { supabase } from '../../../lib/supabaseClient';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'kasir-user-123', email: 'kasir@robelkaroseri.com' },
    profile: { id: 'kasir-user-123', full_name: 'Dewi Kasir', role: 'kasir' },
    signOut: vi.fn(),
  }),
}));

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Component: EditDpModal (Audit Trail & Down Payment Adjustment)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    spkId: 'spk-uuid-8209',
    spkNo: 'SPK-8209',
    customerName: 'PT Mandiri Sejahtera',
    currentDp: 500000,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<EditDpModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/Koreksi Nominal Uang Muka \(DP\)/i)).not.toBeInTheDocument();
  });

  it('renders modal with SPK information, current DP, and Audit Trail notice', () => {
    render(<EditDpModal {...defaultProps} />);

    expect(screen.getByText(/Koreksi Nominal Uang Muka \(DP\)/i)).toBeInTheDocument();
    expect(screen.getByText('SPK-8209')).toBeInTheDocument();
    expect(screen.getByText('PT Mandiri Sejahtera')).toBeInTheDocument();
    expect(screen.getByText(/Nominal DP Sebelumnya:/i)).toBeInTheDocument();
    expect(screen.getByText('Rp 500.000')).toBeInTheDocument();
    expect(screen.getByText(/Prinsip Audit Trail Permanen \(Immutable Log\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simpan Koreksi DP/i })).toBeDisabled();
  });

  it('dynamically calculates and displays correction difference (+ / -)', () => {
    render(<EditDpModal {...defaultProps} />);

    const newDpInput = screen.getByPlaceholderText(/Contoh: 1500000/i);

    // Increase DP from 500.000 to 1.500.000 (diff: +1.000.000)
    fireEvent.change(newDpInput, { target: { value: '1500000' } });
    expect(screen.getByText('+ Rp 1.000.000')).toBeInTheDocument();

    // Decrease DP from 500.000 to 300.000 (diff: -200.000)
    fireEvent.change(newDpInput, { target: { value: '300000' } });
    expect(screen.getByText('Rp -200.000')).toBeInTheDocument();
  });

  it('enforces validation rules: submit is disabled until new DP > 0, != current DP, and reason >= 10 chars', () => {
    render(<EditDpModal {...defaultProps} />);

    const newDpInput = screen.getByPlaceholderText(/Contoh: 1500000/i);
    const reasonInput = screen.getByPlaceholderText(/bukti transfer mutasi/i);
    const submitBtn = screen.getByRole('button', { name: /Simpan Koreksi DP/i });

    // Initial state: disabled
    expect(submitBtn).toBeDisabled();

    // Set same amount: still disabled
    fireEvent.change(newDpInput, { target: { value: '500000' } });
    fireEvent.change(reasonInput, { target: { value: 'Koreksi salah transfer mutasi bank BCA' } });
    expect(submitBtn).toBeDisabled();

    // Set different amount but short reason (< 10 chars): still disabled
    fireEvent.change(newDpInput, { target: { value: '1500000' } });
    fireEvent.change(reasonInput, { target: { value: 'Salah' } });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText('5/10 karakter')).toBeInTheDocument();

    // Set valid reason (>= 10 chars): now enabled
    fireEvent.change(reasonInput, { target: { value: 'Koreksi salah ketik kasir, sesuai bukti mutasi BCA' } });
    expect(submitBtn).toBeEnabled();
  });

  it('submits adjustment to dp_adjustments and updates spk table', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'adj-uuid-1',
            spk_id: 'spk-uuid-8209',
            spk_no: 'SPK-8209',
            old_amount: 500000,
            new_amount: 1500000,
            difference: 1000000,
            reason: 'Koreksi salah ketik kasir, sesuai bukti mutasi BCA',
            adjusted_by_user_id: 'kasir-user-123',
            adjusted_by_name: 'Dewi Kasir',
            adjusted_by_role: 'kasir',
            created_at: '2026-10-30T09:00:00Z',
          },
          error: null,
        }),
      }),
    });

    const mockUpdateSpk = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      or: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const mockUpdatePayments = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'dp_adjustments') {
        return { insert: mockInsert } as any;
      }
      if (table === 'spk') {
        return { update: mockUpdateSpk } as any;
      }
      if (table === 'payments') {
        return { update: mockUpdatePayments } as any;
      }
      return {} as any;
    });

    render(<EditDpModal {...defaultProps} />);

    const newDpInput = screen.getByPlaceholderText(/Contoh: 1500000/i);
    const reasonInput = screen.getByPlaceholderText(/bukti transfer mutasi/i);
    const submitBtn = screen.getByRole('button', { name: /Simpan Koreksi DP/i });

    fireEvent.change(newDpInput, { target: { value: '1500000' } });
    fireEvent.change(reasonInput, { target: { value: 'Koreksi salah ketik kasir, sesuai bukti mutasi BCA' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          spk_id: 'spk-uuid-8209',
          spk_no: 'SPK-8209',
          old_amount: 500000,
          new_amount: 1500000,
          difference: 1000000,
          reason: 'Koreksi salah ketik kasir, sesuai bukti mutasi BCA',
          adjusted_by_name: 'Dewi Kasir',
          adjusted_by_role: 'kasir',
        })
      );
    });

    expect(mockUpdateSpk).toHaveBeenCalledWith(
      expect.objectContaining({
        dp_amount: 1500000,
        down_payment_amount: 1500000,
      })
    );

    expect(defaultProps.onSuccess).toHaveBeenCalledWith(
      1500000,
      expect.objectContaining({
        new_amount: 1500000,
        reason: 'Koreksi salah ketik kasir, sesuai bukti mutasi BCA',
      })
    );
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when "Batal" or close icon button is clicked', () => {
    render(<EditDpModal {...defaultProps} />);

    const cancelBtn = screen.getByRole('button', { name: /^Batal$/i });
    fireEvent.click(cancelBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    const closeIconBtn = screen.getByRole('button', { name: /Tutup modal koreksi DP/i });
    fireEvent.click(closeIconBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(2);
  });
});
