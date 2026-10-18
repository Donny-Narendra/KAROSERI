-- ==============================================================================
-- MIGRATION: 20261018010000_periodic_opex_and_pnl.sql
-- Description: Implement Periodic OPEX Accounting and Corporate Monthly P&L View
-- 1. Master Kategori Biaya Operasional (operating_expense_categories)
-- 2. Transaksi Beban Operasional Berkala (operating_expenses)
-- 3. View Laba Rugi Komprehensif Bulanan (view_corporate_monthly_pnl)
-- ==============================================================================

-- 1. Tabel Master Kategori Biaya Operasional
CREATE TABLE IF NOT EXISTS public.operating_expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- e.g. "Gaji & Upah Tetap", "Listrik & Utilitas", "Sewa Tempat", "Amenities & Kebersihan"
  code VARCHAR(50) UNIQUE NOT NULL,
  default_period VARCHAR(20) DEFAULT 'MONTHLY' -- 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'
);

-- 2. Tabel Transaksi Beban Operasional Berkala
CREATE TABLE IF NOT EXISTS public.operating_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_month DATE NOT NULL, -- Format YYYY-MM-01 untuk agregasi bulanan
  category_id UUID REFERENCES public.operating_expense_categories(id),
  category_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) DEFAULT 'TRANSFER', -- 'CASH', 'TRANSFER'
  receipt_ref VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_opex_effective_month ON public.operating_expenses(effective_month);
CREATE INDEX IF NOT EXISTS idx_opex_category_id ON public.operating_expenses(category_id);

ALTER TABLE public.operating_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read opex_categories" ON public.operating_expense_categories;
CREATE POLICY "Allow authenticated read opex_categories" ON public.operating_expense_categories 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon read opex_categories" ON public.operating_expense_categories;
CREATE POLICY "Allow anon read opex_categories" ON public.operating_expense_categories 
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated full opex" ON public.operating_expenses;
CREATE POLICY "Allow authenticated full opex" ON public.operating_expenses 
  FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon full opex" ON public.operating_expenses;
CREATE POLICY "Allow anon full opex" ON public.operating_expenses 
  FOR ALL TO anon USING (true);

-- Seed Default Categories
INSERT INTO public.operating_expense_categories (name, code, default_period) VALUES
  ('Gaji & Tunjangan Staf Tetap', 'SALARY', 'MONTHLY'),
  ('Token Listrik & Utilitas Bengkel', 'UTILITY_TOKEN', 'MONTHLY'),
  ('Kebersihan & Keamanan (Amenities)', 'AMENITIES', 'MONTHLY'),
  ('Amortisasi Sewa Tempat & Gedung', 'RENT_AMORTIZATION', 'MONTHLY'),
  ('Pemeliharaan Alat & Mesin Fasilitas', 'MAINTENANCE', 'MONTHLY'),
  ('Lain-lain / Tak Terduga', 'MISC', 'MONTHLY')
ON CONFLICT (code) DO NOTHING;

-- 3. View Laba Rugi Komprehensif Bulanan (Corporate P&L)
CREATE OR REPLACE VIEW public.view_corporate_monthly_pnl AS
WITH monthly_revenue_cogs AS (
  SELECT 
    DATE_TRUNC('month', registration_date)::date AS report_month,
    COUNT(spk_id) AS total_spk_count,
    COALESCE(SUM(total_revenue), 0) AS total_revenue,
    COALESCE(SUM(actual_material_cost), 0) AS total_material_cogs,
    COALESCE(SUM(actual_labor_cost), 0) AS total_labor_cogs,
    COALESCE(SUM(actual_overhead_cost), 0) AS total_foh_cogs,
    COALESCE(SUM(total_cogs), 0) AS total_cogs,
    COALESCE(SUM(gross_profit), 0) AS gross_profit
  FROM view_spk_job_profitability
  GROUP BY DATE_TRUNC('month', registration_date)::date
),
monthly_opex AS (
  SELECT 
    effective_month AS report_month,
    COALESCE(SUM(amount), 0) AS total_opex,
    COALESCE(SUM(CASE WHEN category_name ILIKE '%gaji%' THEN amount ELSE 0 END), 0) AS opex_salary,
    COALESCE(SUM(CASE WHEN category_name ILIKE '%listrik%' OR category_name ILIKE '%utilitas%' THEN amount ELSE 0 END), 0) AS opex_utility,
    COALESCE(SUM(CASE WHEN category_name ILIKE '%sewa%' THEN amount ELSE 0 END), 0) AS opex_rent,
    COALESCE(SUM(CASE WHEN category_name ILIKE '%kebersihan%' OR category_name ILIKE '%amenities%' THEN amount ELSE 0 END), 0) AS opex_amenities,
    COALESCE(SUM(CASE WHEN category_name NOT ILIKE '%gaji%' AND category_name NOT ILIKE '%listrik%' AND category_name NOT ILIKE '%sewa%' AND category_name NOT ILIKE '%kebersihan%' THEN amount ELSE 0 END), 0) AS opex_others
  FROM operating_expenses
  GROUP BY effective_month
)
SELECT 
  COALESCE(m.report_month, o.report_month) AS report_month,
  COALESCE(m.total_spk_count, 0) AS total_spk_count,
  COALESCE(m.total_revenue, 0) AS total_revenue,
  COALESCE(m.total_material_cogs, 0) AS total_material_cogs,
  COALESCE(m.total_labor_cogs, 0) AS total_labor_cogs,
  COALESCE(m.total_foh_cogs, 0) AS total_foh_cogs,
  COALESCE(m.total_cogs, 0) AS total_cogs,
  COALESCE(m.gross_profit, 0) AS gross_profit,
  COALESCE(o.total_opex, 0) AS total_opex,
  (COALESCE(m.gross_profit, 0) - COALESCE(o.total_opex, 0)) AS net_operating_profit,
  CASE 
    WHEN COALESCE(m.total_revenue, 0) > 0 THEN 
      ROUND(((COALESCE(m.gross_profit, 0) - COALESCE(o.total_opex, 0)) / m.total_revenue * 100)::numeric, 2)
    ELSE 0 
  END AS net_margin_percentage,
  -- Breakdown OPEX
  COALESCE(o.opex_salary, 0) AS opex_salary,
  COALESCE(o.opex_utility, 0) AS opex_utility,
  COALESCE(o.opex_rent, 0) AS opex_rent,
  COALESCE(o.opex_amenities, 0) AS opex_amenities,
  COALESCE(o.opex_others, 0) AS opex_others
FROM monthly_revenue_cogs m
FULL OUTER JOIN monthly_opex o ON m.report_month = o.report_month;

GRANT SELECT ON public.operating_expense_categories TO authenticated, anon;
GRANT ALL ON public.operating_expenses TO authenticated, anon;
GRANT SELECT ON public.view_corporate_monthly_pnl TO authenticated, anon;
