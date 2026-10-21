import { describe, it, expect, vi, beforeEach } from 'vitest';
import { operatingExpenseService } from '../operatingExpenseService';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Service: operatingExpenseService (Dynamic Expense Categories)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCategories', () => {
    it('fetches active categories from expense_categories by default', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Gaji Staf', is_active: true },
        { id: 'cat-2', name: 'Token Listrik', is_active: true },
      ];

      const eqMock = vi.fn().mockResolvedValue({ data: mockCategories, error: null });
      const orderMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await operatingExpenseService.getCategories(false);

      expect(supabase.from).toHaveBeenCalledWith('expense_categories');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(orderMock).toHaveBeenCalledWith('name', { ascending: true });
      expect(eqMock).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(mockCategories);
    });

    it('fetches all categories including inactive when includeInactive is true', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Gaji Staf', is_active: true },
        { id: 'cat-2', name: 'Kategori Lama', is_active: false },
      ];

      const orderMock = vi.fn().mockResolvedValue({ data: mockCategories, error: null });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await operatingExpenseService.getCategories(true);

      expect(supabase.from).toHaveBeenCalledWith('expense_categories');
      expect(orderMock).toHaveBeenCalledWith('name', { ascending: true });
      expect(result).toEqual(mockCategories);
    });

    it('gracefully falls back to operating_expense_categories if expense_categories returns error', async () => {
      const fallbackCategories = [
        { id: 'legacy-1', name: 'Legacy Category', default_period: 'MONTHLY' },
      ];

      const eqMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Table does not exist' } });
      const orderMock = vi.fn().mockReturnValue({ eq: eqMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });

      const fallbackOrderMock = vi.fn().mockResolvedValue({ data: fallbackCategories, error: null });
      const fallbackSelectMock = vi.fn().mockReturnValue({ order: fallbackOrderMock });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'expense_categories') {
          return { select: selectMock } as any;
        }
        if (table === 'operating_expense_categories') {
          return { select: fallbackSelectMock } as any;
        }
        return {} as any;
      });

      const result = await operatingExpenseService.getCategories(false);

      expect(supabase.from).toHaveBeenCalledWith('expense_categories');
      expect(supabase.from).toHaveBeenCalledWith('operating_expense_categories');
      expect(result).toEqual([
        { id: 'legacy-1', name: 'Legacy Category', default_period: 'MONTHLY', is_active: true },
      ]);
    });
  });

  describe('createCategory', () => {
    it('creates a new expense category successfully', async () => {
      const createdCategory = {
        id: 'new-cat-1',
        name: 'Bahan Bakar & Solar Genset Pabrik',
        description: 'Solar genset darurat',
        is_active: true,
      };

      const singleMock = vi.fn().mockResolvedValue({ data: createdCategory, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const result = await operatingExpenseService.createCategory({
        name: 'Bahan Bakar & Solar Genset Pabrik',
        description: 'Solar genset darurat',
      });

      expect(supabase.from).toHaveBeenCalledWith('expense_categories');
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Bahan Bakar & Solar Genset Pabrik',
        description: 'Solar genset darurat',
        is_active: true,
      }));
      expect(result).toEqual(createdCategory);
    });

    it('throws validation error when name is empty', async () => {
      await expect(
        operatingExpenseService.createCategory({ name: '   ' })
      ).rejects.toThrow('Nama kategori beban wajib diisi.');
    });

    it('throws friendly message when duplicate unique constraint is violated', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      await expect(
        operatingExpenseService.createCategory({ name: 'Gaji & Tunjangan Staf Tetap' })
      ).rejects.toThrow('Kategori "Gaji & Tunjangan Staf Tetap" sudah terdaftar.');
    });
  });

  describe('updateCategory & toggleCategoryActive', () => {
    it('updates name and description of an existing category', async () => {
      const updatedCategory = {
        id: 'cat-1',
        name: 'Gaji Staf & Lembur Operasional',
        description: 'Gaji staf pabrik dan tunjangan lembur',
        is_active: true,
      };

      const singleMock = vi.fn().mockResolvedValue({ data: updatedCategory, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const result = await operatingExpenseService.updateCategory('cat-1', {
        name: 'Gaji Staf & Lembur Operasional',
        description: 'Gaji staf pabrik dan tunjangan lembur',
      });

      expect(supabase.from).toHaveBeenCalledWith('expense_categories');
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Gaji Staf & Lembur Operasional',
        description: 'Gaji staf pabrik dan tunjangan lembur',
      }));
      expect(eqMock).toHaveBeenCalledWith('id', 'cat-1');
      expect(result).toEqual(updatedCategory);
    });

    it('toggles is_active status when toggleCategoryActive is called', async () => {
      const toggledCategory = {
        id: 'cat-1',
        name: 'Amortisasi Sewa',
        is_active: false,
      };

      const singleMock = vi.fn().mockResolvedValue({ data: toggledCategory, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const result = await operatingExpenseService.toggleCategoryActive('cat-1', false);

      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        is_active: false,
      }));
      expect(eqMock).toHaveBeenCalledWith('id', 'cat-1');
      expect(result).toEqual(toggledCategory);
    });
  });
});
