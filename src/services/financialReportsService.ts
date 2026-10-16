import { supabase } from '../lib/supabaseClient';
import type {
  SpkJobProfitability,
  WbsCostVariance,
  InventoryValuation,
  ProjectReceivable,
  FinancialExecutiveSummary,
  FinancialReportFilter,
  DateRangeFilter,
  SpkJobProfitabilityFilter,
  WbsCostVarianceFilter,
  InventoryValuationFilter,
  ProjectReceivableFilter,
} from '../types/financialReports';

export const financialReportsService = {
  /**
   * 1. Ambil ringkasan eksekutif KPI keuangan dalam satu panggilan efisien (RPC)
   */
  async getExecutiveSummary(filter?: DateRangeFilter | FinancialReportFilter): Promise<FinancialExecutiveSummary> {
    try {
      const { data, error } = await supabase.rpc('get_financial_executive_summary', {
        start_date: filter?.startDate || null,
        end_date: filter?.endDate || null,
      });

      if (error) {
        console.error('Error fetching financial executive summary:', error);
        throw new Error(`Gagal memuat ringkasan eksekutif: ${error.message}`);
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
    } catch (err: any) {
      console.error('financialReportsService.getExecutiveSummary exception:', err);
      throw err;
    }
  },

  /**
   * 2. Laporan Laba Rugi per Proyek SPK (Job Profitability)
   */
  async getSpkJobProfitability(
    filter?: SpkJobProfitabilityFilter | FinancialReportFilter
  ): Promise<SpkJobProfitability[]> {
    try {
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

      const s = (filter?.searchQuery || (filter as any)?.search || '').trim();
      if (s) {
        query = query.or(`spk_number.ilike.%${s}%,customer_name.ilike.%${s}%,vehicle_plate.ilike.%${s}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching job profitability report:', error);
        throw new Error(`Gagal memuat laporan laba rugi proyek: ${error.message}`);
      }

      return (data || []).map((row: any) => ({
        spk_id: row.spk_id,
        spk_number: row.spk_number,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone || undefined,
        vehicle_plate: row.vehicle_plate || undefined,
        spk_status: row.spk_status,
        registration_date: row.registration_date,
        target_date: row.target_date || undefined,
        total_revenue: Number(row.total_revenue || 0),
        actual_material_cost: Number(row.actual_material_cost || 0),
        actual_labor_cost: Number(row.actual_labor_cost || 0),
        total_cogs: Number(row.total_cogs || 0),
        gross_profit: Number(row.gross_profit || 0),
        gross_margin_percentage: Number(row.gross_margin_percentage || 0),
        payment_status: row.payment_status,
      }));
    } catch (err: any) {
      console.error('financialReportsService.getSpkJobProfitability exception:', err);
      throw err;
    }
  },

  /**
   * 3. Laporan Analisis Varian Anggaran WBS (RAB vs Realisasi Aktual)
   */
  async getWbsCostVariance(
    filter?: WbsCostVarianceFilter | FinancialReportFilter
  ): Promise<WbsCostVariance[]> {
    try {
      let query = supabase
        .from('view_wbs_cost_variance')
        .select('*')
        .order('spk_number', { ascending: true })
        .order('wbs_stage', { ascending: true });

      if ((filter as any)?.spkId) {
        query = query.eq('spk_id', (filter as any).spkId);
      }

      if ((filter as any)?.spkNumber) {
        query = query.eq('spk_number', (filter as any).spkNumber);
      }

      if (filter?.wbsStage && filter.wbsStage !== 'ALL') {
        query = query.eq('wbs_stage', filter.wbsStage);
      }

      const s = (filter?.searchQuery || (filter as any)?.search || '').trim();
      if (s) {
        query = query.or(`spk_number.ilike.%${s}%,customer_name.ilike.%${s}%,vehicle_plate.ilike.%${s}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching WBS cost variance report:', error);
        throw new Error(`Gagal memuat laporan varian WBS: ${error.message}`);
      }

      let formatted = (data || []).map((row: any) => ({
        spk_id: row.spk_id,
        spk_number: row.spk_number,
        customer_name: row.customer_name,
        vehicle_plate: row.vehicle_plate || undefined,
        wbs_stage: row.wbs_stage,
        total_material_budget: Number(row.total_material_budget || 0),
        actual_material_spent: Number(row.actual_material_spent || 0),
        material_variance: Number(row.material_variance || 0),
        total_labor_budget: Number(row.total_labor_budget || 0),
        actual_labor_spent: Number(row.actual_labor_spent || 0),
        labor_variance: Number(row.labor_variance || 0),
      }));

      if ((filter as any)?.overBudgetOnly) {
        formatted = formatted.filter(
          item => item.material_variance < 0 || item.labor_variance < 0
        );
      }

      return formatted;
    } catch (err: any) {
      console.error('financialReportsService.getWbsCostVariance exception:', err);
      throw err;
    }
  },

  /**
   * 4. Laporan Valuasi Mutasi & Persediaan Gudang
   */
  async getInventoryValuation(
    filter?: InventoryValuationFilter | FinancialReportFilter
  ): Promise<InventoryValuation[]> {
    try {
      let query = supabase
        .from('view_inventory_valuation')
        .select('*')
        .order('total_inventory_valuation_hpp', { ascending: false });

      if ((filter as any)?.category && (filter as any).category !== 'ALL') {
        query = query.eq('category', (filter as any).category);
      }

      const s = (filter?.searchQuery || (filter as any)?.search || '').trim();
      if (s) {
        query = query.ilike('material_name', `%${s}%`);
      }

      if ((filter as any)?.lowStockOnly) {
        query = query.lte('current_stock', 5);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching inventory valuation report:', error);
        throw new Error(`Gagal memuat laporan valuasi persediaan: ${error.message}`);
      }

      return (data || []).map((row: any) => ({
        material_id: row.material_id,
        material_name: row.material_name,
        category: row.category,
        unit: row.unit,
        current_stock: Number(row.current_stock || 0),
        cost_price_hpp: Number(row.cost_price_hpp || 0),
        standard_selling_price: Number(row.standard_selling_price || 0),
        total_inventory_valuation_hpp: Number(row.total_inventory_valuation_hpp || 0),
        total_inventory_market_value: Number(row.total_inventory_market_value || 0),
        last_inventory_update: row.last_inventory_update,
      }));
    } catch (err: any) {
      console.error('financialReportsService.getInventoryValuation exception:', err);
      throw err;
    }
  },

  /**
   * 5. Laporan Piutang Proyek & Kontrol Serah Terima (Aging Receivables)
   */
  async getProjectReceivables(
    filter?: ProjectReceivableFilter | FinancialReportFilter
  ): Promise<ProjectReceivable[]> {
    try {
      let query = supabase
        .from('view_project_receivables')
        .select('*')
        .order('receivable_aging_days', { ascending: false })
        .order('invoice_date', { ascending: false });

      if (filter?.paymentStatus && filter.paymentStatus !== 'ALL') {
        query = query.eq('payment_status', filter.paymentStatus);
      }

      if ((filter as any)?.handoverClearanceStatus && (filter as any).handoverClearanceStatus !== 'ALL') {
        query = query.eq('handover_clearance_status', (filter as any).handoverClearanceStatus);
      }

      if ((filter as any)?.unpaidOnly) {
        query = query.gt('outstanding_balance', 0);
      }

      if ((filter as any)?.minAgingDays !== undefined && (filter as any).minAgingDays > 0) {
        query = query.gte('receivable_aging_days', (filter as any).minAgingDays);
      }

      const s = (filter?.searchQuery || (filter as any)?.search || '').trim();
      if (s) {
        query = query.or(
          `spk_number.ilike.%${s}%,customer_name.ilike.%${s}%,vehicle_plate.ilike.%${s}%,invoice_number.ilike.%${s}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching project receivables report:', error);
        throw new Error(`Gagal memuat laporan piutang proyek: ${error.message}`);
      }

      return (data || []).map((row: any) => ({
        spk_id: row.spk_id,
        spk_number: row.spk_number,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone || undefined,
        vehicle_plate: row.vehicle_plate || undefined,
        spk_status: row.spk_status,
        qc_status: row.qc_status || undefined,
        billing_id: row.billing_id,
        invoice_number: row.invoice_number,
        total_billing_amount: Number(row.total_billing_amount || 0),
        dp_paid: Number(row.dp_paid || 0),
        additional_paid: Number(row.additional_paid || 0),
        outstanding_balance: Number(row.outstanding_balance || 0),
        payment_status: row.payment_status,
        invoice_date: row.invoice_date,
        receivable_aging_days: Number(row.receivable_aging_days || 0),
        handover_clearance_status: row.handover_clearance_status,
      }));
    } catch (err: any) {
      console.error('financialReportsService.getProjectReceivables exception:', err);
      throw err;
    }
  },
};
