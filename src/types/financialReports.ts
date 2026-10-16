/**
 * Data Contracts for Supabase PostgreSQL Financial Reporting Views
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
  handover_clearance_status: string;
}
