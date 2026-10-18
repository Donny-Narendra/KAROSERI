import { supabase } from '../lib/supabaseClient';
import type { 
  OperatingExpenseItem, 
  ExpenseCategory, 
  MonthlyCorporatePnL,
  CreateExpensePayload 
} from '../types/operatingExpenses';

export const operatingExpenseService = {
  /**
   * Mengambil master kategori beban operasional berkala
   */
  async getCategories(): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from('operating_expense_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching expense categories:', error);
      throw new Error(`Gagal mengambil master kategori beban: ${error.message}`);
    }

    return (data || []) as ExpenseCategory[];
  },

  /**
   * Mengambil data pengeluaran operasional berkala berdasarkan bulan buku (YYYY-MM atau YYYY-MM-01)
   */
  async getExpensesByMonth(month: string): Promise<OperatingExpenseItem[]> {
    const effectiveMonth = month.length === 7 ? `${month}-01` : month.slice(0, 10);

    const { data, error } = await supabase
      .from('operating_expenses')
      .select('*')
      .eq('effective_month', effectiveMonth)
      .order('expense_date', { ascending: false });

    if (error) {
      console.error(`Error fetching expenses for month ${month}:`, error);
      throw new Error(`Gagal mengambil data pengeluaran operasional: ${error.message}`);
    }

    return ((data || []) as any[]).map(row => ({
      ...row,
      amount: Number(row.amount || 0),
    })) as OperatingExpenseItem[];
  },

  /**
   * Mencatat pengeluaran operasional berkala baru
   */
  async createExpense(payload: CreateExpensePayload): Promise<OperatingExpenseItem> {
    const effectiveMonth = payload.effective_month.length === 7 
      ? `${payload.effective_month}-01` 
      : payload.effective_month.slice(0, 10);

    const { data, error } = await supabase
      .from('operating_expenses')
      .insert({
        expense_date: payload.expense_date,
        effective_month: effectiveMonth,
        category_id: payload.category_id || null,
        category_name: payload.category_name,
        description: payload.description,
        amount: payload.amount,
        payment_method: payload.payment_method || 'TRANSFER',
        receipt_ref: payload.receipt_ref || null,
        created_by: payload.created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating operating expense:', error);
      throw new Error(`Gagal mencatat pengeluaran operasional: ${error.message}`);
    }

    return {
      ...(data as any),
      amount: Number(data.amount || 0),
    } as OperatingExpenseItem;
  },

  /**
   * Menghapus catatan pengeluaran operasional
   */
  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase
      .from('operating_expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting operating expense:', error);
      throw new Error(`Gagal menghapus pengeluaran operasional: ${error.message}`);
    }
  },

  /**
   * Mengambil data Laporan Laba Rugi Komprehensif Perusahaan dari view_corporate_monthly_pnl
   */
  async getCorporatePnL(year?: number): Promise<MonthlyCorporatePnL[]> {
    let query = supabase
      .from('view_corporate_monthly_pnl')
      .select('*')
      .order('report_month', { ascending: false });

    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      query = query.gte('report_month', startDate).lte('report_month', endDate);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching corporate PnL:', error);
      throw new Error(`Gagal mengambil laporan laba rugi perusahaan: ${error.message}`);
    }

    return ((data || []) as any[]).map(row => ({
      report_month: typeof row.report_month === 'string' ? row.report_month.slice(0, 10) : new Date(row.report_month).toISOString().slice(0, 10),
      total_spk_count: Number(row.total_spk_count || 0),
      total_revenue: Number(row.total_revenue || 0),
      total_material_cogs: Number(row.total_material_cogs || 0),
      total_labor_cogs: Number(row.total_labor_cogs || 0),
      total_foh_cogs: Number(row.total_foh_cogs || 0),
      total_cogs: Number(row.total_cogs || 0),
      gross_profit: Number(row.gross_profit || 0),
      total_opex: Number(row.total_opex || 0),
      net_operating_profit: Number(row.net_operating_profit || 0),
      net_margin_percentage: Number(row.net_margin_percentage || 0),
      opex_salary: Number(row.opex_salary || 0),
      opex_utility: Number(row.opex_utility || 0),
      opex_rent: Number(row.opex_rent || 0),
      opex_amenities: Number(row.opex_amenities || 0),
      opex_others: Number(row.opex_others || 0),
    })) as MonthlyCorporatePnL[];
  },
};
