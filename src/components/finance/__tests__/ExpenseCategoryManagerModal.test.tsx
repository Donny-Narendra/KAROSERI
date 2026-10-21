import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ExpenseCategoryManagerModal } from '../ExpenseCategoryManagerModal';
import { operatingExpenseService } from '../../../services/operatingExpenseService';
import type { ExpenseCategory } from '../../../types/operatingExpenses';

const mockUseAuth = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../../services/operatingExpenseService', () => ({
  operatingExpenseService: {
    getCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    toggleCategoryActive: vi.fn(),
  },
}));

describe('Component: ExpenseCategoryManagerModal', () => {
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
      description: 'Gaji bulanan non borongan',
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
      profile: { role: 'kasir' },
    });
    vi.mocked(operatingExpenseService.getCategories).mockResolvedValue(mockCategories);
  });

  it('renders modal with category list and status badges', async () => {
    render(<ExpenseCategoryManagerModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Kelola Master Kategori Beban OPEX')).toBeInTheDocument();
    });

    expect(screen.getByText('Amortisasi Sewa Tempat & Gedung')).toBeInTheDocument();
    expect(screen.getByText('Gaji & Tunjangan Staf Tetap')).toBeInTheDocument();
    expect(screen.getByText('Kategori Nonaktif Lama')).toBeInTheDocument();

    // Verify badges
    const activeBadges = screen.getAllByText('Aktif');
    expect(activeBadges.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Nonaktif')).toBeInTheDocument();
  });

  it('filters category items when search query is typed', async () => {
    render(<ExpenseCategoryManagerModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Amortisasi Sewa Tempat & Gedung')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Cari pos akun kategori...');
    fireEvent.change(searchInput, { target: { value: 'Gaji' } });

    expect(screen.getByText('Gaji & Tunjangan Staf Tetap')).toBeInTheDocument();
    expect(screen.queryByText('Amortisasi Sewa Tempat & Gedung')).not.toBeInTheDocument();
  });

  it('allows authorized user to add a new category', async () => {
    const onUpdated = vi.fn();
    vi.mocked(operatingExpenseService.createCategory).mockResolvedValue({
      id: 'cat-new',
      name: 'Bahan Bakar Solar Genset',
      description: 'Solar pabrik',
      is_active: true,
    });

    render(<ExpenseCategoryManagerModal isOpen={true} onClose={vi.fn()} onCategoriesUpdated={onUpdated} />);

    await waitFor(() => {
      expect(screen.getByText('Tambah Kategori')).toBeInTheDocument();
    });

    // Click Tambah Kategori to open form
    fireEvent.click(screen.getByText('Tambah Kategori'));

    expect(screen.getByText('Input Kategori Beban Baru')).toBeInTheDocument();

    // Fill inputs
    const nameInput = screen.getByPlaceholderText('e.g. Bahan Bakar & Solar Genset Pabrik');
    const descInput = screen.getByPlaceholderText('e.g. Pembelian solar genset dan pelumas mesin');

    fireEvent.change(nameInput, { target: { value: 'Bahan Bakar Solar Genset' } });
    fireEvent.change(descInput, { target: { value: 'Solar pabrik' } });

    // Submit form
    fireEvent.click(screen.getByText('Simpan Kategori'));

    await waitFor(() => {
      expect(operatingExpenseService.createCategory).toHaveBeenCalledWith({
        name: 'Bahan Bakar Solar Genset',
        description: 'Solar pabrik',
      });
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  it('allows authorized user to edit an existing category', async () => {
    const onUpdated = vi.fn();
    vi.mocked(operatingExpenseService.updateCategory).mockResolvedValue({
      id: 'cat-1',
      name: 'Amortisasi Sewa Tempat Revisi',
      description: 'Sewa baru',
      is_active: true,
    });

    render(<ExpenseCategoryManagerModal isOpen={true} onClose={vi.fn()} onCategoriesUpdated={onUpdated} />);

    await waitFor(() => {
      expect(screen.getByText('Amortisasi Sewa Tempat & Gedung')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Edit Nama & Deskripsi');
    fireEvent.click(editButtons[0]);

    // Inline edit input should be rendered
    const editNameInput = screen.getByDisplayValue('Amortisasi Sewa Tempat & Gedung');
    fireEvent.change(editNameInput, { target: { value: 'Amortisasi Sewa Tempat Revisi' } });

    const saveButton = screen.getByText('Simpan');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(operatingExpenseService.updateCategory).toHaveBeenCalledWith('cat-1', {
        name: 'Amortisasi Sewa Tempat Revisi',
        description: 'Sewa bengkel & gedung',
      });
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  it('allows authorized user to toggle active/inactive status', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onUpdated = vi.fn();
    vi.mocked(operatingExpenseService.toggleCategoryActive).mockResolvedValue({
      id: 'cat-1',
      name: 'Amortisasi Sewa Tempat & Gedung',
      is_active: false,
    });

    render(<ExpenseCategoryManagerModal isOpen={true} onClose={vi.fn()} onCategoriesUpdated={onUpdated} />);

    await waitFor(() => {
      expect(screen.getByText('Amortisasi Sewa Tempat & Gedung')).toBeInTheDocument();
    });

    // Click Nonaktifkan on first item
    const toggleButton = screen.getAllByTitle('Nonaktifkan Pos Akun')[0];
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(operatingExpenseService.toggleCategoryActive).toHaveBeenCalledWith('cat-1', false);
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  it('displays read-only warning and hides modification buttons for unauthorized roles (e.g. mandor)', async () => {
    mockUseAuth.mockReturnValue({
      profile: { role: 'mandor' },
    });

    render(<ExpenseCategoryManagerModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Hanya Owner dan Kasir yang memiliki izin/i)).toBeInTheDocument();
    });

    // Edit and toggle buttons should not be present
    expect(screen.queryByText('Tambah Kategori')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Edit Nama & Deskripsi')).not.toBeInTheDocument();
  });
});
