import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ManageExpenseCategoriesModal } from '../ManageExpenseCategoriesModal';
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
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    toggleCategoryActive: vi.fn(),
  },
}));

describe('Component: ManageExpenseCategoriesModal', () => {
  const mockCategories: ExpenseCategory[] = [
    {
      id: 'cat-1',
      name: 'Amortisasi Sewa Tempat & Gedung',
      description: 'Sewa bengkel & gedung',
      is_active: true,
    },
    {
      id: 'cat-2',
      name: 'Gaji & Tunjangan Staf Tetap',
      description: 'Gaji bulanan non-borongan',
      is_active: true,
    },
    {
      id: 'cat-3',
      name: 'Kategori Nonaktif Lama',
      description: 'Sudah tidak dipakai',
      is_active: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      profile: { role: 'owner' },
    });
    vi.mocked(operatingExpenseService.getCategories).mockResolvedValue(mockCategories);

    // Default supabase check count
    const orMock = vi.fn().mockResolvedValue({ count: 0, error: null });
    const selectMock = vi.fn().mockReturnValue({ or: orMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);
  });

  it('1. Tampilkan daftar kategori beban aktif beserta statusnya', async () => {
    render(<ManageExpenseCategoriesModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Kelola Kategori Beban')).toBeInTheDocument();
    });

    expect(screen.getByText('Amortisasi Sewa Tempat & Gedung')).toBeInTheDocument();
    expect(screen.getByText('Gaji & Tunjangan Staf Tetap')).toBeInTheDocument();
    expect(screen.getByText('Kategori Nonaktif Lama')).toBeInTheDocument();

    const activeBadges = screen.getAllByText('Aktif');
    expect(activeBadges.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Nonaktif')).toBeInTheDocument();
  });

  it('2. Form penambahan kategori baru: Input Nama, Deskripsi, dan tombol + Simpan Kategori Baru', async () => {
    const onUpdated = vi.fn();
    vi.mocked(operatingExpenseService.createCategory).mockResolvedValue({
      id: 'cat-new-bbm',
      name: 'BBM Operasional Truk Bengkel',
      description: 'Solar armada operasional',
      is_active: true,
    });

    render(<ManageExpenseCategoriesModal isOpen={true} onClose={vi.fn()} onCategoriesUpdated={onUpdated} />);

    await waitFor(() => {
      expect(screen.getByText('Tambah Kategori Baru')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('misal: BBM Operasional Truk Bengkel');
    const descInput = screen.getByPlaceholderText('misal: Pembelian solar armada penjemputan');

    fireEvent.change(nameInput, { target: { value: 'BBM Operasional Truk Bengkel' } });
    fireEvent.change(descInput, { target: { value: 'Solar armada operasional' } });

    const submitBtn = screen.getByText('+ Simpan Kategori Baru');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(operatingExpenseService.createCategory).toHaveBeenCalledWith({
        name: 'BBM Operasional Truk Bengkel',
        description: 'Solar armada operasional',
      });
      expect(onUpdated).toHaveBeenCalledWith('cat-new-bbm');
    });
  });

  it('3. Tombol aksi per baris: Edit nama kategori', async () => {
    const onUpdated = vi.fn();
    vi.mocked(operatingExpenseService.updateCategory).mockResolvedValue({
      id: 'cat-1',
      name: 'Amortisasi Sewa Gedung Baru',
      description: 'Sewa bengkel & gedung',
      is_active: true,
    });

    render(<ManageExpenseCategoriesModal isOpen={true} onClose={vi.fn()} onCategoriesUpdated={onUpdated} />);

    await waitFor(() => {
      expect(screen.getByText('Amortisasi Sewa Tempat & Gedung')).toBeInTheDocument();
    });

    const editBtns = screen.getAllByTitle('Edit nama kategori');
    fireEvent.click(editBtns[0]);

    const editInput = screen.getByDisplayValue('Amortisasi Sewa Tempat & Gedung');
    fireEvent.change(editInput, { target: { value: 'Amortisasi Sewa Gedung Baru' } });

    const saveBtn = screen.getByText('Simpan');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(operatingExpenseService.updateCategory).toHaveBeenCalledWith('cat-1', {
        name: 'Amortisasi Sewa Gedung Baru',
        description: 'Sewa bengkel & gedung',
      });
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  it('4. Tombol aksi per baris: Hapus / Nonaktifkan kategori dengan peringatan jika sudah dipakai pada transaksi OPEX', async () => {
    // Mock that category is used in 5 transactions
    const orMock = vi.fn().mockResolvedValue({ count: 5, error: null });
    const selectMock = vi.fn().mockReturnValue({ or: orMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onUpdated = vi.fn();

    vi.mocked(operatingExpenseService.toggleCategoryActive).mockResolvedValue({
      id: 'cat-1',
      name: 'Amortisasi Sewa Tempat & Gedung',
      is_active: false,
    });

    render(<ManageExpenseCategoriesModal isOpen={true} onClose={vi.fn()} onCategoriesUpdated={onUpdated} />);

    await waitFor(() => {
      expect(screen.getByText('Amortisasi Sewa Tempat & Gedung')).toBeInTheDocument();
    });

    const deactivateBtn = screen.getAllByTitle('Hapus / Nonaktifkan kategori')[0];
    fireEvent.click(deactivateBtn);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      const confirmArg = confirmSpy.mock.calls[0][0];
      expect(confirmArg).toContain('PERINGATAN: Kategori "Amortisasi Sewa Tempat & Gedung" sudah digunakan pada 5 transaksi OPEX');
      expect(operatingExpenseService.toggleCategoryActive).toHaveBeenCalledWith('cat-1', false);
      expect(onUpdated).toHaveBeenCalled();
    });
  });
});
