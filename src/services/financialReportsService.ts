import { supabase } from '../lib/supabaseClient';
import type {
  SpkJobProfitability,
  WbsCostVariance,
  InventoryValuation,
  ProjectReceivable,
  FinancialExecutiveSummary,
  FinancialReportFilter,
  WbsCostVarianceFilter,
  InventoryValuationFilter,
  ProjectReceivableFilter,
  FinancialSanityAuditResult,
  SpkOverheadLog,
  CreateSpkOverheadLogPayload,
  OperatingExpenseCategory,
  OperatingExpense,
  CreateOperatingExpensePayload,
  OperatingExpenseFilter,
  CorporateMonthlyPnl,
  CorporateMonthlyPnlFilter,
} from '../types/financialReports';

export const financialReportsService = {
  /**
   * Mengambil Ringkasan Eksekutif KPI Keuangan
   */
  async getExecutiveSummary(filter?: { startDate?: string | null; endDate?: string | null }): Promise<FinancialExecutiveSummary> {
    const { data, error } = await supabase.rpc('get_financial_executive_summary', {
      start_date: filter?.startDate || null,
      end_date: filter?.endDate || null,
    });

    if (error) {
      console.error('Error fetching executive summary:', error);
      throw new Error(`Gagal mengambil ringkasan eksekutif: ${error.message}`);
    }

    const res = data as any;
    return {
      total_projects: Number(res?.total_projects || 0),
      total_revenue: Number(res?.total_revenue || 0),
      total_actual_material_cost: Number(res?.total_actual_material_cost || 0),
      total_actual_labor_cost: Number(res?.total_actual_labor_cost || 0),
      total_actual_overhead_cost: Number(res?.total_actual_overhead_cost || 0),
      total_cogs: Number(res?.total_cogs || 0),
      total_gross_profit: Number(res?.total_gross_profit || 0),
      average_gross_margin: Number(res?.average_gross_margin || 0),
      total_inventory_valuation: Number(res?.total_inventory_valuation || 0),
      total_inventory_market_value: Number(res?.total_inventory_market_value || 0),
      total_outstanding_receivables: Number(res?.total_outstanding_receivables || 0),
      units_pending_handover: Number(res?.units_pending_handover || 0),
    };
  },

  /**
   * 1. Mengambil Laporan Laba Rugi per Proyek SPK (Job Profitability)
   */
  async getJobProfitability(filter?: FinancialReportFilter): Promise<SpkJobProfitability[]> {
    let query = supabase
      .from('view_spk_job_profitability')
      .select('*')
      .order('registration_date', { ascending: false });

    if (filter?.startDate) {
      query = query.gte('registration_date', filter.startDate);
    }
    if (filter?.endDate) {
      query = query.lte('registration_date', filter.endDate);
    }
    if (filter?.spkStatus && filter.spkStatus !== 'ALL') {
      query = query.eq('spk_status', filter.spkStatus);
    }
    if (filter?.paymentStatus && filter.paymentStatus !== 'ALL') {
      query = query.eq('payment_status', filter.paymentStatus);
    }
    const search = filter?.searchQuery || (filter as any)?.search;
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      query = query.or(`spk_number.ilike.${q},customer_name.ilike.${q},vehicle_plate.ilike.${q}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching job profitability report:', error);
      throw new Error(`Gagal mengambil data laba rugi proyek: ${error.message}`);
    }

    return ((data || []) as any[]).map(row => ({
      ...row,
      total_revenue: Number(row.total_revenue || 0),
      actual_material_cost: Number(row.actual_material_cost || 0),
      actual_labor_cost: Number(row.actual_labor_cost || 0),
      actual_overhead_cost: Number(row.actual_overhead_cost || 0),
      total_cogs: Number(row.total_cogs || 0),
      gross_profit: Number(row.gross_profit || 0),
      gross_margin_percentage: Number(row.gross_margin_percentage || 0),
    })) as SpkJobProfitability[];
  },

  /**
   * Alias kompatibilitas untuk getJobProfitability
   */
  async getSpkJobProfitability(filter?: FinancialReportFilter): Promise<SpkJobProfitability[]> {
    return this.getJobProfitability(filter);
  },

  /**
   * 2. Mengambil Laporan Analisis Varian Anggaran RAB vs Aktual (per WBS)
   * Mendukung pemanggilan getWbsCostVariance(spkId, wbsStage) maupun getWbsCostVariance(filterObject)
   */
  async getWbsCostVariance(
    spkIdOrFilter?: string | WbsCostVarianceFilter,
    wbsStageParam?: string
  ): Promise<WbsCostVariance[]> {
    let query = supabase
      .from('view_wbs_cost_variance')
      .select('*')
      .order('spk_number', { ascending: false });

    let targetSpkId: string | undefined;
    let targetWbsStage: string | undefined;
    let targetSearch: string | undefined;
    let overBudgetOnly = false;

    if (typeof spkIdOrFilter === 'string') {
      targetSpkId = spkIdOrFilter;
      targetWbsStage = wbsStageParam;
    } else if (spkIdOrFilter && typeof spkIdOrFilter === 'object') {
      targetSpkId = spkIdOrFilter.spkId;
      targetWbsStage = spkIdOrFilter.wbsStage;
      targetSearch = spkIdOrFilter.searchQuery || spkIdOrFilter.search;
      overBudgetOnly = !!spkIdOrFilter.overBudgetOnly;
    }

    if (targetSpkId) {
      query = query.eq('spk_id', targetSpkId);
    }
    if (targetWbsStage && targetWbsStage !== 'ALL') {
      query = query.eq('wbs_stage', targetWbsStage);
    }
    if (targetSearch && targetSearch.trim()) {
      const q = `%${targetSearch.trim()}%`;
      query = query.or(`spk_number.ilike.${q},customer_name.ilike.${q},vehicle_plate.ilike.${q}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching WBS cost variance:', error);
      throw new Error(`Gagal mengambil analisis varian WBS: ${error.message}`);
    }

    let formatted = ((data || []) as any[]).map(row => ({
      ...row,
      total_material_budget: Number(row.total_material_budget || 0),
      actual_material_spent: Number(row.actual_material_spent || 0),
      material_variance: Number(row.material_variance || 0),
      total_labor_budget: Number(row.total_labor_budget || 0),
      actual_labor_spent: Number(row.actual_labor_spent || 0),
      labor_variance: Number(row.labor_variance || 0),
      total_overhead_budget: Number(row.total_overhead_budget || 0),
      actual_overhead_spent: Number(row.actual_overhead_spent || 0),
      overhead_variance: Number(row.overhead_variance || 0),
    })) as WbsCostVariance[];

    if (overBudgetOnly) {
      formatted = formatted.filter(
        item => item.material_variance < 0 || item.labor_variance < 0 || item.overhead_variance < 0
      );
    }

    return formatted;
  },

  /**
   * Mengambil log pembebanan overhead riil proyek SPK
   */
  async getSpkOverheadLogs(spkId: string): Promise<SpkOverheadLog[]> {
    const { data, error } = await supabase
      .from('spk_overhead_logs')
      .select('*')
      .eq('spk_id', spkId)
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error('Error fetching SPK overhead logs:', error);
      throw new Error(`Gagal mengambil log overhead: ${error.message}`);
    }

    return ((data || []) as any[]).map(row => ({
      ...row,
      frequency_qty: Number(row.frequency_qty || 0),
      rate_per_unit: Number(row.rate_per_unit || 0),
      total_amount: Number(row.total_amount || 0),
    })) as SpkOverheadLog[];
  },

  /**
   * Mencatat pembebanan overhead riil baru untuk proyek SPK (Mandor / Supervisor)
   */
  async createSpkOverheadLog(payload: CreateSpkOverheadLogPayload): Promise<SpkOverheadLog> {
    const insertData = {
      spk_id: payload.spk_id,
      wbs_stage: payload.wbs_stage,
      overhead_name: payload.overhead_name,
      frequency_qty: payload.frequency_qty,
      rate_per_unit: payload.rate_per_unit,
      notes: payload.notes || null,
      recorded_at: payload.recorded_at || new Date().toISOString(),
      created_by: payload.created_by || null,
      rab_item_id: payload.rab_item_id || null,
    };

    const { data, error } = await supabase
      .from('spk_overhead_logs')
      .insert([insertData])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating SPK overhead log:', error);
      throw new Error(`Gagal mencatat pembebanan overhead: ${error.message}`);
    }

    return {
      ...data,
      frequency_qty: Number(data.frequency_qty || 0),
      rate_per_unit: Number(data.rate_per_unit || 0),
      total_amount: Number(data.total_amount || 0),
    } as SpkOverheadLog;
  },

  /**
   * Menghapus catatan pembebanan overhead
   */
  async deleteSpkOverheadLog(id: string): Promise<void> {
    const { error } = await supabase
      .from('spk_overhead_logs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting SPK overhead log:', error);
      throw new Error(`Gagal menghapus log overhead: ${error.message}`);
    }
  },

  /**
   * 3. Mengambil Laporan Valuasi Mutasi Persediaan Gudang
   * Mendukung pemanggilan getInventoryValuation(category, searchQuery) maupun getInventoryValuation(filterObject)
   */
  async getInventoryValuation(
    categoryOrFilter?: string | InventoryValuationFilter,
    searchQueryParam?: string
  ): Promise<InventoryValuation[]> {
    let query = supabase
      .from('view_inventory_valuation')
      .select('*')
      .order('total_inventory_valuation_hpp', { ascending: false });

    let targetCategory: string | undefined;
    let targetSearch: string | undefined;
    let lowStockOnly = false;

    if (typeof categoryOrFilter === 'string') {
      targetCategory = categoryOrFilter;
      targetSearch = searchQueryParam;
    } else if (categoryOrFilter && typeof categoryOrFilter === 'object') {
      targetCategory = categoryOrFilter.category;
      targetSearch = categoryOrFilter.searchQuery || categoryOrFilter.search;
      lowStockOnly = !!categoryOrFilter.lowStockOnly;
    }

    if (targetCategory && targetCategory !== 'ALL') {
      query = query.eq('category', targetCategory);
    }
    if (targetSearch && targetSearch.trim()) {
      query = query.ilike('material_name', `%${targetSearch.trim()}%`);
    }
    if (lowStockOnly) {
      query = query.lte('current_stock', 5);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching inventory valuation:', error);
      throw new Error(`Gagal mengambil valuasi persediaan: ${error.message}`);
    }

    return ((data || []) as any[]).map(row => ({
      ...row,
      current_stock: Number(row.current_stock || 0),
      cost_price_hpp: Number(row.cost_price_hpp || 0),
      standard_selling_price: Number(row.standard_selling_price || 0),
      total_inventory_valuation_hpp: Number(row.total_inventory_valuation_hpp || 0),
      total_inventory_market_value: Number(row.total_inventory_market_value || 0),
    })) as InventoryValuation[];
  },

  /**
   * 4. Mengambil Laporan Piutang Proyek & Aging
   * Mendukung pemanggilan getProjectReceivables(onlyOutstanding) maupun getProjectReceivables(filterObject)
   */
  async getProjectReceivables(
    filterOrOnlyOutstanding: boolean | ProjectReceivableFilter = false
  ): Promise<ProjectReceivable[]> {
    let query = supabase
      .from('view_project_receivables')
      .select('*')
      .order('receivable_aging_days', { ascending: false });

    let onlyOutstanding = false;
    let paymentStatus: string | undefined;
    let clearanceStatus: string | undefined;
    let minAging: number | undefined;
    let search: string | undefined;

    if (typeof filterOrOnlyOutstanding === 'boolean') {
      onlyOutstanding = filterOrOnlyOutstanding;
    } else if (typeof filterOrOnlyOutstanding === 'object' && filterOrOnlyOutstanding !== null) {
      onlyOutstanding = !!filterOrOnlyOutstanding.unpaidOnly;
      paymentStatus = filterOrOnlyOutstanding.paymentStatus;
      clearanceStatus = filterOrOnlyOutstanding.handoverClearanceStatus;
      minAging = filterOrOnlyOutstanding.minAgingDays;
      search = filterOrOnlyOutstanding.searchQuery || filterOrOnlyOutstanding.search;
    }

    if (onlyOutstanding) {
      query = query.gt('outstanding_balance', 0);
    }
    if (paymentStatus && paymentStatus !== 'ALL') {
      query = query.eq('payment_status', paymentStatus);
    }
    if (clearanceStatus && clearanceStatus !== 'ALL') {
      query = query.eq('handover_clearance_status', clearanceStatus);
    }
    if (minAging !== undefined && minAging > 0) {
      query = query.gte('receivable_aging_days', minAging);
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      query = query.or(
        `spk_number.ilike.${q},customer_name.ilike.${q},vehicle_plate.ilike.${q},invoice_number.ilike.${q}`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching project receivables:', error);
      throw new Error(`Gagal mengambil daftar piutang proyek: ${error.message}`);
    }

    return ((data || []) as any[]).map(row => ({
      ...row,
      total_billing_amount: Number(row.total_billing_amount || 0),
      dp_paid: Number(row.dp_paid || 0),
      additional_paid: Number(row.additional_paid || 0),
      outstanding_balance: Number(row.outstanding_balance || 0),
      receivable_aging_days: Number(row.receivable_aging_days || 0),
    })) as ProjectReceivable[];
  },

  /**
   * 5. Menjalankan Audit & Rekonsiliasi Integritas Keuangan (Sanity Check)
   */
  async getSanityAudit(): Promise<FinancialSanityAuditResult> {
    const { data, error } = await supabase.rpc('audit_financial_sanity_check');
    if (error) {
      console.error('Error running financial sanity audit:', error);
      throw new Error(`Gagal menjalankan audit integritas keuangan: ${error.message}`);
    }
    return data as FinancialSanityAuditResult;
  },

  /**
   * Alias kompatibilitas untuk getSanityAudit
   */
  async auditFinancialSanityCheck(): Promise<FinancialSanityAuditResult> {
    return this.getSanityAudit();
  },

  /**
   * 6. Mengambil Master Kategori Beban Operasional (OPEX)
   */
  async getOperatingExpenseCategories(): Promise<OperatingExpenseCategory[]> {
    const { data, error } = await supabase
      .from('operating_expense_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching operating expense categories:', error);
      throw new Error(`Gagal mengambil kategori beban operasional: ${error.message}`);
    }

    return (data || []) as OperatingExpenseCategory[];
  },

  /**
   * 7. Mengambil Daftar Transaksi Beban Operasional Berkala (OPEX)
   */
  async getOperatingExpenses(filter?: OperatingExpenseFilter): Promise<OperatingExpense[]> {
    let query = supabase
      .from('operating_expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    if (filter?.effectiveMonth) {
      const monthPrefix = filter.effectiveMonth.length === 7 ? `${filter.effectiveMonth}-01` : filter.effectiveMonth;
      query = query.eq('effective_month', monthPrefix);
    }
    if (filter?.categoryName && filter.categoryName !== 'ALL') {
      query = query.eq('category_name', filter.categoryName);
    }
    if (filter?.startDate) {
      query = query.gte('expense_date', filter.startDate);
    }
    if (filter?.endDate) {
      query = query.lte('expense_date', filter.endDate);
    }
    if (filter?.searchQuery && filter.searchQuery.trim()) {
      const q = `%${filter.searchQuery.trim()}%`;
      query = query.or(`description.ilike.${q},category_name.ilike.${q},receipt_ref.ilike.${q}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching operating expenses:', error);
      throw new Error(`Gagal mengambil data beban operasional: ${error.message}`);
    }

    return ((data || []) as any[]).map(row => ({
      ...row,
      amount: Number(row.amount || 0),
    })) as OperatingExpense[];
  },

  /**
   * 8. Mencatat Beban Operasional Baru
   */
  async createOperatingExpense(payload: CreateOperatingExpensePayload): Promise<OperatingExpense> {
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
      throw new Error(`Gagal mencatat beban operasional: ${error.message}`);
    }

    return {
      ...(data as any),
      amount: Number(data.amount || 0),
    } as OperatingExpense;
  },

  /**
   * 9. Menghapus Catatan Beban Operasional
   */
  async deleteOperatingExpense(id: string): Promise<void> {
    const { error } = await supabase
      .from('operating_expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting operating expense:', error);
      throw new Error(`Gagal menghapus beban operasional: ${error.message}`);
    }
  },

  /**
   * 10. Mengambil Laporan Laba Rugi Komprehensif Perusahaan (Corporate Monthly P&L)
   */
  async getCorporateMonthlyPnl(filter?: CorporateMonthlyPnlFilter): Promise<CorporateMonthlyPnl[]> {
    let query = supabase
      .from('view_corporate_monthly_pnl')
      .select('*')
      .order('report_month', { ascending: false });

    if (filter?.startMonth) {
      const start = filter.startMonth.length === 7 ? `${filter.startMonth}-01` : filter.startMonth;
      query = query.gte('report_month', start);
    }
    if (filter?.endMonth) {
      const end = filter.endMonth.length === 7 ? `${filter.endMonth}-01` : filter.endMonth;
      query = query.lte('report_month', end);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching corporate monthly pnl:', error);
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
    })) as CorporateMonthlyPnl[];
  },
};

