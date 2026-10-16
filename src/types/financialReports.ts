/**
 * Data Contracts for Supabase PostgreSQL Financial Reporting Views & RPC Helpers
 * Single source of truth for RobelKaroseri financial analytics & owner/cashier dashboard.
 */

export interface SpkJobProfitability {
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
  total_cogs: number;
  gross_profit: number;
  gross_margin_percentage: number;
  payment_status: 'UNBILLED' | 'DRAFT' | 'PARTIAL' | 'PAID' | string;
}

export interface WbsCostVariance {
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
}

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

export interface OverBudgetAnomaly {
  spk_id: string;
  spk_number: string;
  customer_name: string;
  wbs_stage: string;
  total_material_budget: number;
  actual_material_spent: number;
  overspend_amount: number;
}

export interface NegativeMarginAnomaly {
  spk_id: string;
  spk_number: string;
  customer_name: string;
  total_revenue: number;
  total_cogs: number;
  gross_profit: number;
  gross_margin_percentage: number;
}

export interface UnbilledCompletedAnomaly {
  spk_id: string;
  spk_number: string;
  customer_name: string;
  vehicle_plate?: string;
}

export interface CriticalReceivableAnomaly {
  spk_id: string;
  spk_number: string;
  customer_name: string;
  outstanding_balance: number;
  receivable_aging_days: number;
}

export interface FinancialSanityCheckResult {
  is_healthy: boolean;
  over_budget_count: number;
  over_budget_items: OverBudgetAnomaly[];
  negative_margin_count: number;
  negative_margin_items: NegativeMarginAnomaly[];
  unbilled_completed_count: number;
  unbilled_completed_items: UnbilledCompletedAnomaly[];
  critical_receivables_count: number;
  critical_receivables_items: CriticalReceivableAnomaly[];
}

