import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('Component: ExpenseCategoryManagerModal (Alias Compatibility)', () => {
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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      profile: { role: 'owner' },
    });
    vi.mocked(operatingExpenseService.getCategories).mockResolvedValue(mockCategories);
  });

  it('renders correctly via alias ExpenseCategoryManagerModal', async () => {
    render(<ExpenseCategoryManagerModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Kelola Kategori Beban')).toBeInTheDocument();
    });

    expect(screen.getByText('Amortisasi Sewa Tempat & Gedung')).toBeInTheDocument();
    expect(screen.getByText('Gaji & Tunjangan Staf Tetap')).toBeInTheDocument();
  });
});
