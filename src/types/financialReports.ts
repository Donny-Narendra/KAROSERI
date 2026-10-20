/**
 * Data Contracts for Supabase PostgreSQL Financial Reporting Views & RPC Helpers
 * Single source of truth for RobelKaroseri financial analytics & owner/cashier dashboard.
 */

export interface SpkOverheadLog {
  id: string;
  spk_id: string;
  wbs_stage: string;
  overhead_name: string;
  frequency_qty: number;
  rate_per_unit: number;
  total_amount: number;
  notes?: string | null;
  recorded_at: string;
  created_by?: string | null;
  rab_item_id?: string | null;
  change_order_item_id?: string | null;
}

export interface CreateSpkOverheadLogPayload {
  spk_id: string;
  wbs_stage: string;
  overhead_name: string;
  frequency_qty: number;
  rate_per_unit: number;
  notes?: string | null;
  recorded_at?: string;
  created_by?: string | null;
  rab_item_id?: string | null;
  change_order_item_id?: string | null;
}

export interface SpkJobProfitabilityItem {
  spk_id: string;
  spk_number: string;
  customer_name: string;
  customer_phone?: string;
  vehicle_plate?: string;
  spk_status: string;
  registration_date: string;
  target_date?: string;
  total_revenue: number;
  actual_material_cost: number;
  actual_labor_cost: number;
  actual_overhead_cost: number;
  total_cogs: number;
  gross_profit: number;
  gross_margin_percentage: number;
  payment_status: 'UNBILLED' | 'DRAFT' | 'PARTIAL' | 'PAID' | string;
}
export type SpkJobProfitability = SpkJobProfitabilityItem;

export interface WbsCostVarianceItem {
  spk_id: string;
  spk_number: string;
  customer_name: string;
  vehicle_plate?: string;
  wbs_stage: string;
  total_material_budget: number;
  actual_material_spent: number;
  material_variance: number;
  total_labor_budget: number;
  actual_labor_spent: number;
  labor_variance: number;
  total_overhead_budget: number;
  actual_overhead_spent: number;
  overhead_variance: number;
}
export type WbsCostVariance = WbsCostVarianceItem;

export interface InventoryValuation {
  material_id: string;
  material_name: string;
  category: string;
  unit: string;
  current_stock: number;
  cost_price_hpp: number;
  standard_selling_price: number;
  total_inventory_valuation_hpp: number;
  total_inventory_market_value: number;
  last_inventory_update: string;
}

export interface ProjectReceivable {
  spk_id: string;
  spk_number: string;
  customer_name: string;
  customer_phone?: string;
  vehicle_plate?: string;
  spk_status: string;
  qc_status?: string;
  billing_id: string;
  invoice_number: string;
  total_billing_amount: number;
  dp_paid: number;
  additional_paid: number;
  outstanding_balance: number;
  payment_status: string;
  invoice_date: string;
  receivable_aging_days: number;
  handover_clearance_status: 'LUNAS (SIAP HANDOVER)' | 'UNIT SELESAI (TERTAHAN PELUNASAN)' | 'PENGERJAAN BERJALAN' | string;
}

export interface FinancialExecutiveSummary {
  total_projects: number;
  total_revenue: number;
  total_actual_material_cost: number;
  total_actual_labor_cost: number;
  total_actual_overhead_cost: number;
  total_cogs: number;
  total_gross_profit: number;
  average_gross_margin: number;
  total_inventory_valuation: number;
  total_inventory_market_value: number;
  total_outstanding_receivables: number;
  units_pending_handover: number;
}

export interface FinancialReportFilter {
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  spkStatus?: string;
  paymentStatus?: string;
  wbsStage?: string;
}

export interface DateRangeFilter {
  startDate?: string | null;
  endDate?: string | null;
}

export interface SpkJobProfitabilityFilter extends DateRangeFilter {
  search?: string;
  searchQuery?: string;
  spkStatus?: string;
  paymentStatus?: string;
}

export interface WbsCostVarianceFilter {
  spkId?: string;
  spkNumber?: string;
  wbsStage?: string;
  search?: string;
  searchQuery?: string;
  overBudgetOnly?: boolean;
}

export interface InventoryValuationFilter {
  category?: string;
  search?: string;
  searchQuery?: string;
  lowStockOnly?: boolean;
}

export interface ProjectReceivableFilter {
  search?: string;
  searchQuery?: string;
  paymentStatus?: string;
  handoverClearanceStatus?: string;
  unpaidOnly?: boolean;
  minAgingDays?: number;
}

// ==============================================================================
// FINANCIAL INTEGRITY AUDIT & SANITY CHECK (STEP 4)
// ==============================================================================

export interface FinancialSanityAuditResult {
  is_healthy: boolean;
  over_budget_count: number;
  over_budget_items: Array<{
    spk_id: string;
    spk_number: string;
    customer_name: string;
    wbs_stage: string;
    total_material_budget: number;
    actual_material_spent: number;
    overspend_amount: number;
  }>;
  negative_margin_count: number;
  negative_margin_items: Array<{
    spk_id: string;
    spk_number: string;
    customer_name: string;
    total_revenue: number;
    total_cogs: number;
    gross_profit: number;
    gross_margin_percentage: number;
  }>;
  unbilled_completed_count: number;
  unbilled_completed_items: Array<{
    spk_id: string;
    spk_number: string;
    customer_name: string;
    vehicle_plate: string;
  }>;
  critical_receivables_count: number;
  critical_receivables_items: Array<{
    spk_id: string;
    spk_number: string;
    customer_name: string;
    outstanding_balance: number;
    receivable_aging_days: number;
  }>;
}

export type FinancialSanityCheckResult = FinancialSanityAuditResult;
export type OverBudgetAnomaly = FinancialSanityAuditResult['over_budget_items'][number];
export type NegativeMarginAnomaly = FinancialSanityAuditResult['negative_margin_items'][number];
export type UnbilledCompletedAnomaly = FinancialSanityAuditResult['unbilled_completed_items'][number];
export type CriticalReceivableAnomaly = FinancialSanityAuditResult['critical_receivables_items'][number];

// ==============================================================================
// PERIODIC OPEX & CORPORATE P&L CONTRACTS (SPRINT 42)
// ==============================================================================

export interface OperatingExpenseCategory {
  id: string;
  name: string;
  code: string;
  default_period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | string;
}

export interface OperatingExpense {
  id: string;
  expense_date: string;
  effective_month: string;
  category_id?: string | null;
  category_name: string;
  description: string;
  amount: number;
  payment_method: 'CASH' | 'TRANSFER' | string;
  receipt_ref?: string | null;
  created_at?: string;
  created_by?: string | null;
}

export interface CreateOperatingExpensePayload {
  expense_date: string;
  effective_month: string;
  category_id?: string | null;
  category_name: string;
  description: string;
  amount: number;
  payment_method?: 'CASH' | 'TRANSFER' | string;
  receipt_ref?: string | null;
  created_by?: string | null;
}

export interface OperatingExpenseFilter {
  effectiveMonth?: string;
  categoryName?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export interface CorporateMonthlyPnl {
  report_month: string;
  total_spk_count: number;
  total_revenue: number;
  total_material_cogs: number;
  total_labor_cogs: number;
  total_foh_cogs: number;
  total_cogs: number;
  gross_profit: number;
  total_opex: number;
  net_operating_profit: number;
  net_margin_percentage: number;
  opex_salary: number;
  opex_utility: number;
  opex_rent: number;
  opex_amenities: number;
  opex_others: number;
}

export interface CorporateMonthlyPnlFilter {
  startMonth?: string;
  endMonth?: string;
}


