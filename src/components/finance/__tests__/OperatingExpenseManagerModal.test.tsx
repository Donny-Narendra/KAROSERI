import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { OperatingExpenseManagerModal } from '../OperatingExpenseManagerModal';
import { OpexLoggingModal } from '../OpexLoggingModal';
import { operatingExpenseService } from '../../../services/operatingExpenseService';
import { supabase } from '../../../lib/supabaseClient';
import type { ExpenseCategory } from '../../../types/operatingExpenses';

const mockUseAuth = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../../services/operatingExpenseService', () => ({
  operatingExpenseService: {
    getCategories: vi.fn(),
    getExpensesByMonth: vi.fn(),
    createExpense: vi.fn(),
    deleteExpense: vi.fn(),
  },
}));

describe('Component: OperatingExpenseManagerModal & OpexLoggingModal', () => {
  const mockCategories: ExpenseCategory[] = [
    {
      id: 'cat-1',
      name: 'Amortisasi Sewa Tempat & Gedung',
      is_active: true,
    },
    {
      id: 'cat-2',
      name: 'Gaji & Tunjangan Staf Tetap',
      is_active: true,
    },
    {
      id: 'cat-3',
      name: 'Token Listrik & Utilitas Bengkel',
      is_active: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      profile: { role: 'kasir' },
    });

    // Mock direct supabase query for expense_categories
    const orderMock = vi.fn().mockResolvedValue({ data: mockCategories, error: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

    vi.mocked(operatingExpenseService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(operatingExpenseService.getExpensesByMonth).mockResolvedValue([]);
  });

  it('renders modal with dynamic categories populated in dropdown and + Tambah Kategori Baru option', async () => {
    render(<OperatingExpenseManagerModal isOpen={true} onClose={vi.fn()} defaultMonth="2026-10" />);

    await waitFor(() => {
      expect(screen.getByText('Pencatatan Biaya Operasional Berkala (OPEX)')).toBeInTheDocument();
    });

    // Check that dropdown contains dynamic categories
    expect(screen.getByRole('option', { name: 'Amortisasi Sewa Tempat & Gedung' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Gaji & Tunjangan Staf Tetap' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Token Listrik & Utilitas Bengkel' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '+ Tambah Kategori Baru...' })).toBeInTheDocument();
  });

  it('displays "⚙ Kelola Kategori" button and opens category manager modal when clicked', async () => {
    render(<OperatingExpenseManagerModal isOpen={true} onClose={vi.fn()} defaultMonth="2026-10" />);

    await waitFor(() => {
      expect(screen.getByText(/⚙ Kelola Kategori/i)).toBeInTheDocument();
    });

    const manageBtn = screen.getByText(/⚙ Kelola Kategori/i);
    fireEvent.click(manageBtn);

    await waitFor(() => {
      expect(screen.getByText('Kelola Kategori Beban')).toBeInTheDocument();
    });
  });

  it('automatically opens category manager modal when __ADD_NEW__ option is selected', async () => {
    render(<OperatingExpenseManagerModal isOpen={true} onClose={vi.fn()} defaultMonth="2026-10" />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: '+ Tambah Kategori Baru...' })).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '__ADD_NEW__' } });

    await waitFor(() => {
      expect(screen.getByText('Kelola Kategori Beban')).toBeInTheDocument();
    });
  });

  it('OpexLoggingModal alias renders properly with the same behavior', async () => {
    render(<OpexLoggingModal isOpen={true} onClose={vi.fn()} defaultMonth="2026-10" />);

    await waitFor(() => {
      expect(screen.getByText('Pencatatan Biaya Operasional Berkala (OPEX)')).toBeInTheDocument();
      expect(screen.getByText(/⚙ Kelola Kategori/i)).toBeInTheDocument();
    });
  });

  it('allows filling expense form and submitting new periodic OPEX', async () => {
    const onExpenseAdded = vi.fn();
    vi.mocked(operatingExpenseService.createExpense).mockResolvedValue({
      id: 'exp-1',
      expense_date: '2026-10-21',
      effective_month: '2026-10-01',
      category_id: 'cat-3',
      category_name: 'Token Listrik & Utilitas Bengkel',
      description: 'Beli token listrik 500rb',
      amount: 500_000,
      payment_method: 'TRANSFER',
    });

    render(
      <OperatingExpenseManagerModal 
        isOpen={true} 
        onClose={vi.fn()} 
        defaultMonth="2026-10" 
        onExpenseAdded={onExpenseAdded} 
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Token Listrik & Utilitas Bengkel' })).toBeInTheDocument();
    });

    // Select category
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'cat-3' } });

    // Fill description and amount
    const descInput = screen.getByPlaceholderText(/Beli Token Listrik/i);
    const amountInput = screen.getByPlaceholderText('0');

    fireEvent.change(descInput, { target: { value: 'Beli token listrik 500rb' } });
    fireEvent.change(amountInput, { target: { value: '500000' } });

    // Submit form directly
    const submitBtn = screen.getByText('Simpan Pengeluaran');
    const form = submitBtn.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(operatingExpenseService.createExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          category_id: 'cat-3',
          category_name: 'Token Listrik & Utilitas Bengkel',
          description: 'Beli token listrik 500rb',
          amount: 500_000,
        })
      );
      expect(onExpenseAdded).toHaveBeenCalled();
    });
  });
});
