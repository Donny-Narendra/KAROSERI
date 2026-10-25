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

    // Mock direct supabase query for expense_categories and operating_expenses
    const orderMock = vi.fn().mockResolvedValue({ data: mockCategories, error: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock, delete: deleteMock } as any);

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

  it('triggers onExpenseChanged when a new expense item is successfully created', async () => {
    const onExpenseChanged = vi.fn();
    vi.mocked(operatingExpenseService.createExpense).mockResolvedValue({
      id: 'exp-new',
      expense_date: '2026-10-25',
      effective_month: '2026-10-01',
      category_id: 'cat-1',
      category_name: 'Amortisasi Sewa Tempat & Gedung',
      description: 'Sewa gedung workshop',
      amount: 15_000_000,
      payment_method: 'TRANSFER',
    });

    render(
      <OperatingExpenseManagerModal 
        isOpen={true} 
        onClose={vi.fn()} 
        currentMonth="2026-10" 
        onExpenseChanged={onExpenseChanged} 
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Amortisasi Sewa Tempat & Gedung' })).toBeInTheDocument();
    });

    const descInput = screen.getByPlaceholderText(/Beli Token Listrik/i);
    const amountInput = screen.getByPlaceholderText('0');

    fireEvent.change(descInput, { target: { value: 'Sewa gedung workshop' } });
    fireEvent.change(amountInput, { target: { value: '15000000' } });

    const submitBtn = screen.getByText('Simpan Pengeluaran');
    const form = submitBtn.closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(onExpenseChanged).toHaveBeenCalled();
    });
  });

  it('executes delete, updates local list state, and triggers onExpenseChanged callback', async () => {
    const onExpenseChanged = vi.fn();
    const mockExistingExpenses = [
      {
        id: 'exp-delete-1',
        expense_date: '2026-10-15',
        effective_month: '2026-10-01',
        category_id: 'cat-2',
        category_name: 'Gaji & Tunjangan Staf Tetap',
        description: 'Gaji mekanik bulan Oktober',
        amount: 8_500_000,
        payment_method: 'TRANSFER' as const,
        created_at: '2026-10-15T10:00:00Z',
      },
    ];

    vi.mocked(operatingExpenseService.getExpensesByMonth).mockResolvedValue(mockExistingExpenses);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }) }) }),
      delete: deleteMock,
    } as any);

    render(
      <OperatingExpenseManagerModal 
        isOpen={true} 
        onClose={vi.fn()} 
        currentMonth="2026-10" 
        onExpenseChanged={onExpenseChanged} 
      />
    );

    // Switch to 'list' view tab
    const viewListBtn = await screen.findByText(/Daftar Pengeluaran/i);
    fireEvent.click(viewListBtn);

    await waitFor(() => {
      expect(screen.getByText('Gaji mekanik bulan Oktober')).toBeInTheDocument();
    });

    // Click delete button
    const deleteBtn = screen.getByTitle('Hapus Transaksi');
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalledWith('Apakah Anda yakin ingin menghapus catatan pengeluaran ini?');

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalled();
      expect(deleteEqMock).toHaveBeenCalledWith('id', 'exp-delete-1');
      expect(onExpenseChanged).toHaveBeenCalled();
      // Item should be removed from local state list
      expect(screen.queryByText('Gaji mekanik bulan Oktober')).not.toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });
});
