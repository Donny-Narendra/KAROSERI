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
  FinancialSanityCheckResult,
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
    })) as WbsCostVariance[];

    if (overBudgetOnly) {
      formatted = formatted.filter(
        item => item.material_variance < 0 || item.labor_variance < 0
      );
    }

    return formatted;
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
  async auditFinancialSanityCheck(): Promise<FinancialSanityCheckResult> {
    const { data, error } = await supabase.rpc('audit_financial_sanity_check');

    if (error) {
      console.error('Error running financial sanity check audit:', error);
      throw new Error(`Gagal menjalankan audit integritas keuangan: ${error.message}`);
    }

    const res = data as any;
    return {
      is_healthy: !!res?.is_healthy,
      over_budget_count: Number(res?.over_budget_count || 0),
      over_budget_items: (res?.over_budget_items || []).map((item: any) => ({
        ...item,
        total_material_budget: Number(item.total_material_budget || 0),
        actual_material_spent: Number(item.actual_material_spent || 0),
        overspend_amount: Number(item.overspend_amount || 0),
      })),
      negative_margin_count: Number(res?.negative_margin_count || 0),
      negative_margin_items: (res?.negative_margin_items || []).map((item: any) => ({
        ...item,
        total_revenue: Number(item.total_revenue || 0),
        total_cogs: Number(item.total_cogs || 0),
        gross_profit: Number(item.gross_profit || 0),
        gross_margin_percentage: Number(item.gross_margin_percentage || 0),
      })),
      unbilled_completed_count: Number(res?.unbilled_completed_count || 0),
      unbilled_completed_items: res?.unbilled_completed_items || [],
      critical_receivables_count: Number(res?.critical_receivables_count || 0),
      critical_receivables_items: (res?.critical_receivables_items || []).map((item: any) => ({
        ...item,
        outstanding_balance: Number(item.outstanding_balance || 0),
        receivable_aging_days: Number(item.receivable_aging_days || 0),
      })),
    };
  },
};
