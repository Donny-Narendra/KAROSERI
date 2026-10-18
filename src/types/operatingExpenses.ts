/**
 * Data Contracts for Periodic Operating Expenses (OPEX),
 * Corporate P&L Analytics, and Smart Sales Target Solver (CVP) Engine.
 * RobelKaroseri Industrial Vehicle Body Manufacturer.
 */

export interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  default_period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | string;
}

export interface OperatingExpenseItem {
  id: string;
  expense_date: string;
  effective_month: string; // YYYY-MM-01
  category_id?: string | null;
  category_name: string;
  description: string;
  amount: number;
  payment_method: 'CASH' | 'TRANSFER' | string;
  receipt_ref?: string | null;
  created_at?: string;
  created_by?: string | null;
}

export interface CreateExpensePayload {
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

export interface MonthlyCorporatePnL {
  report_month: string; // YYYY-MM-01
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

export interface TargetSolverResult {
  /** Biaya Tetap (FC) */
  fixedCosts: number;
  /** Rasio Margin Kontribusi (CMR %) */
  contributionMarginRatio: number;
  /** Break-Even Point (BEP) dalam Rupiah */
  bepRevenue: number;
  /** Break-Even Point (BEP) dalam Unit SPK */
  bepUnits: number;
  /** Target Laba Bersih yang diinginkan */
  targetProfit: number;
  /** Target Omzet Minimal */
  targetRevenue: number;
  /** Target Unit SPK Minimal */
  targetUnits: number;
  /** Rekomendasi Kapasitas / Throughput Mingguan (unit/minggu) */
  weeklyThroughputUnits: number;
  /** Omzet Aktual Bulan Berjalan */
  actualRevenue: number;
  /** Persentase Pencapaian (%) */
  achievementPercentage: number;
  /** Status Pencapaian & Diagnostik */
  statusMessage: string;
}
