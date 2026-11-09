-- ==============================================================================
-- Migration: 20261109010000_add_spk_isolation_flags_and_views.sql
-- Description: Implement SPK Soft-Isolation & Financial Exclusion
--              1. Add isolation flags & audit columns on public.spk
--              2. RPC function set_spk_isolation_status restricted to Owner role
--              3. Update view_spk_job_profitability and view_wbs_cost_variance
--                 to automatically exclude is_hidden = TRUE or is_test = TRUE
-- ==============================================================================

-- 1. Tambah kolom isolasi dan audit trail pada public.spk
ALTER TABLE public.spk
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS hidden_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS hidden_reason text;

CREATE INDEX IF NOT EXISTS idx_spk_isolation ON public.spk (is_hidden, is_test);

-- 2. RPC Function: Pembatasan hak akses eksklusif Owner
CREATE OR REPLACE FUNCTION public.set_spk_isolation_status(
  p_spk_ids uuid[],
  p_is_hidden boolean,
  p_is_test boolean,
  p_reason text DEFAULT 'Uji Coba Sistem / Isolasi Finansial'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$ 
DECLARE 
  v_user_role user_role; 
BEGIN 
  SELECT role INTO v_user_role FROM public.profiles WHERE id = auth.uid();    
  IF v_user_role IS NULL OR v_user_role != 'owner'::user_role THEN 
    RAISE EXCEPTION 'Akses ditolak: Hanya Owner yang berhak mengisolasi atau menyembunyikan SPK.'; 
  END IF;    
  UPDATE public.spk 
  SET 
    is_hidden = p_is_hidden, 
    is_test = p_is_test, 
    hidden_at = CASE WHEN p_is_hidden THEN now() ELSE NULL END, 
    hidden_by = CASE WHEN p_is_hidden THEN auth.uid() ELSE NULL END, 
    hidden_reason = CASE WHEN p_is_hidden THEN p_reason ELSE NULL END 
  WHERE id = ANY(p_spk_ids); 
END; 
$$;

GRANT EXECUTE ON FUNCTION public.set_spk_isolation_status TO authenticated;

-- 3. Drop dependent views first
DROP VIEW IF EXISTS public.view_corporate_monthly_pnl CASCADE;
DROP VIEW IF EXISTS public.view_spk_job_profitability CASCADE;

-- Recreate view_spk_job_profitability (Kecualikan Draft, PENDING_PAYMENT, SPK Tersembunyi, dan Uji Coba)
CREATE OR REPLACE VIEW public.view_spk_job_profitability AS
WITH all_items AS (
  -- 1. Item dari RAB Awal
  SELECT 
    ri.spk_id,
    ri.package_id,
    ri.package_name,
    ri.item_type,
    ri.quantity,
    ri.unit_price,
    ri.cost_price AS estimated_cost,
    CASE 
      WHEN ri.item_type = 'MATERIAL' AND mi.unit_cost IS NOT NULL THEN mi.unit_cost
      WHEN ri.item_type = 'MATERIAL' AND m.cost_price IS NOT NULL AND m.cost_price > 0 THEN m.cost_price
      ELSE ri.cost_price
    END AS effective_cost,
    (ri.package_id IS NOT NULL OR (ri.package_name IS NOT NULL AND ri.package_name <> '') OR ri.description ILIKE 'Paket:%') AS is_package
  FROM public.rab_items ri
  LEFT JOIN public.materials m ON ri.material_id = m.id
  LEFT JOIN LATERAL (
    SELECT unit_price AS unit_cost FROM public.material_issues 
    WHERE spk_id = ri.spk_id AND material_id = ri.material_id 
    ORDER BY created_at DESC LIMIT 1
  ) mi ON true

  UNION ALL

  -- 2. Item dari Approved Change Orders
  SELECT 
    co.spk_id,
    coi.package_source_id AS package_id,
    coi.package_name,
    coi.item_type,
    coi.quantity,
    coi.unit_price,
    coi.cost_price AS estimated_cost,
    CASE 
      WHEN coi.item_type = 'MATERIAL' AND mi.unit_cost IS NOT NULL THEN mi.unit_cost
      WHEN coi.item_type = 'MATERIAL' AND m.cost_price IS NOT NULL AND m.cost_price > 0 THEN m.cost_price
      ELSE coi.cost_price
    END AS effective_cost,
    (coi.package_source_id IS NOT NULL OR (coi.package_name IS NOT NULL AND coi.package_name <> '')) AS is_package
  FROM public.change_order_items coi
  JOIN public.change_orders co ON coi.change_order_id = co.id
  LEFT JOIN public.materials m ON coi.material_id = m.id
  LEFT JOIN LATERAL (
    SELECT unit_price AS unit_cost FROM public.material_issues 
    WHERE spk_id = co.spk_id AND material_id = coi.material_id 
    ORDER BY created_at DESC LIMIT 1
  ) mi ON true
  WHERE co.status = 'APPROVED'
),
spk_summary AS (
  SELECT 
    spk_id,
    COALESCE(SUM(quantity * unit_price), 0) AS total_revenue,
    COALESCE(SUM(quantity * estimated_cost), 0) AS initial_cogs,
    COALESCE(SUM(quantity * effective_cost), 0) AS actual_cogs,
    -- Component Breakdown
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN quantity * effective_cost ELSE 0 END), 0) AS actual_material_cost,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * effective_cost ELSE 0 END), 0) AS actual_labor_cost,
    COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN quantity * effective_cost ELSE 0 END), 0) AS actual_overhead_cost,
    -- Package vs Granular Pillars
    COALESCE(SUM(CASE WHEN is_package THEN quantity * unit_price ELSE 0 END), 0) AS package_revenue,
    COALESCE(SUM(CASE WHEN is_package THEN quantity * effective_cost ELSE 0 END), 0) AS package_cogs,
    COALESCE(SUM(CASE WHEN NOT is_package AND item_type = 'MATERIAL' THEN quantity * unit_price ELSE 0 END), 0) AS granular_mat_revenue,
    COALESCE(SUM(CASE WHEN NOT is_package AND item_type = 'MATERIAL' THEN quantity * effective_cost ELSE 0 END), 0) AS granular_mat_cogs,
    COALESCE(SUM(CASE WHEN NOT is_package AND item_type = 'LABOR' THEN quantity * unit_price ELSE 0 END), 0) AS granular_labor_revenue,
    COALESCE(SUM(CASE WHEN NOT is_package AND item_type = 'LABOR' THEN quantity * effective_cost ELSE 0 END), 0) AS granular_labor_cogs,
    COALESCE(SUM(CASE WHEN NOT is_package AND item_type = 'OVERHEAD' THEN quantity * unit_price ELSE 0 END), 0) AS granular_foh_revenue,
    COALESCE(SUM(CASE WHEN NOT is_package AND item_type = 'OVERHEAD' THEN quantity * effective_cost ELSE 0 END), 0) AS granular_foh_cogs
  FROM all_items
  GROUP BY spk_id
)
SELECT 
  s.id AS spk_id,
  COALESCE(s.spk_number, s.spk_no) AS spk_number,
  s.customer_name,
  s.vehicle_plate,
  s.status::text AS spk_status,
  s.created_at AS registration_date,
  COALESCE(s.status::text, 'ACTIVE') AS payment_status,
  s.is_profit_locked,
  s.bast_date,

  -- Breakdown Komponen & 4 Pilar Profit Segregation
  COALESCE(sm.package_revenue, 0) AS package_revenue,
  COALESCE(sm.package_cogs, 0) AS package_cogs,
  (COALESCE(sm.package_revenue, 0) - COALESCE(sm.package_cogs, 0)) AS package_profit,
  COALESCE(sm.granular_mat_revenue, 0) AS granular_mat_revenue,
  COALESCE(sm.granular_mat_cogs, 0) AS granular_mat_cogs,
  (COALESCE(sm.granular_mat_revenue, 0) - COALESCE(sm.granular_mat_cogs, 0)) AS granular_material_profit,
  COALESCE(sm.granular_labor_revenue, 0) AS granular_labor_revenue,
  COALESCE(sm.granular_labor_cogs, 0) AS granular_labor_cogs,
  (COALESCE(sm.granular_labor_revenue, 0) - COALESCE(sm.granular_labor_cogs, 0)) AS granular_labor_profit,
  COALESCE(sm.granular_foh_revenue, 0) AS granular_foh_revenue,
  COALESCE(sm.granular_foh_cogs, 0) AS granular_foh_cogs,
  (COALESCE(sm.granular_foh_revenue, 0) - COALESCE(sm.granular_foh_cogs, 0)) AS granular_overhead_profit,

  -- Pendapatan (Omzet)
  CASE 
    WHEN s.is_profit_locked = TRUE AND s.locked_revenue IS NOT NULL THEN s.locked_revenue
    ELSE COALESCE(sm.total_revenue, 0)
  END AS total_revenue,

  -- HPP Komponen
  COALESCE(sm.actual_material_cost, 0) AS actual_material_cost,
  COALESCE(sm.actual_labor_cost, 0) AS actual_labor_cost,
  COALESCE(sm.actual_overhead_cost, 0) AS actual_overhead_cost,

  -- HPP Modal Awal
  COALESCE(sm.initial_cogs, 0) AS initial_cogs,

  -- HPP Modal Aktual
  CASE 
    WHEN s.is_profit_locked = TRUE AND s.locked_cogs IS NOT NULL THEN s.locked_cogs
    ELSE COALESCE(sm.actual_cogs, 0)
  END AS total_cogs,

  -- Laba Bersih Operasional Proyek
  CASE 
    WHEN s.is_profit_locked = TRUE AND s.locked_profit IS NOT NULL THEN s.locked_profit
    ELSE (COALESCE(sm.total_revenue, 0) - COALESCE(sm.actual_cogs, 0))
  END AS gross_profit,

  -- Persentase Margin
  CASE 
    WHEN s.is_profit_locked = TRUE AND s.locked_margin_pct IS NOT NULL THEN s.locked_margin_pct
    WHEN COALESCE(sm.total_revenue, 0) > 0 THEN 
      ROUND(((COALESCE(sm.total_revenue, 0) - COALESCE(sm.actual_cogs, 0)) / COALESCE(sm.total_revenue, 0) * 100)::numeric, 2)
    ELSE 0
  END AS gross_margin_percentage,

  -- Snapshot locked fields
  s.locked_revenue,
  s.locked_cogs,
  s.locked_profit,
  s.locked_margin_pct,
  s.final_revenue,
  s.final_cogs,
  s.final_profit

FROM public.spk s
LEFT JOIN spk_summary sm ON s.id = sm.spk_id
WHERE UPPER(s.status::text) NOT IN ('DRAFT', 'PENDING_PAYMENT')
  AND s.is_hidden = FALSE
  AND s.is_test = FALSE;

GRANT SELECT ON public.view_spk_job_profitability TO authenticated, anon;

-- Recreate view_corporate_monthly_pnl (depends on view_spk_job_profitability)
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
  FROM public.view_spk_job_profitability
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
  FROM public.operating_expenses
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
  END AS net_profit_margin_percentage
FROM monthly_revenue_cogs m
FULL OUTER JOIN monthly_opex o ON m.report_month = o.report_month
ORDER BY report_month DESC;

GRANT SELECT ON public.view_corporate_monthly_pnl TO authenticated, anon;

-- 4. Recreate view_wbs_cost_variance with pure live database aggregation and soft-isolation exclusion
DROP VIEW IF EXISTS public.view_wbs_cost_variance CASCADE;

CREATE VIEW public.view_wbs_cost_variance AS
WITH consolidated_budget AS (
  -- 1. Pagu dari RAB Awal
  SELECT 
    spk_id,
    COALESCE(wbs_stage, wbs_category_to_stage(wbs_category)) AS wbs_stage,
    item_type,
    quantity,
    cost_price
  FROM public.rab_items
  WHERE cost_price > 0
  
  UNION ALL
  
  -- 2. Pagu dari Amandemen Change Order (Khusus yang APPROVED)
  SELECT 
    co.spk_id,
    COALESCE(coi.wbs_stage, 'WBS 1: Pembongkaran') AS wbs_stage,
    coi.item_type,
    coi.quantity,
    coi.cost_price
  FROM public.change_order_items coi
  JOIN public.change_orders co ON coi.change_order_id = co.id
  WHERE co.status = 'APPROVED' AND coi.cost_price > 0
),
pagu_per_wbs AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN quantity * cost_price ELSE 0 END), 0) AS total_material_budget,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * cost_price ELSE 0 END), 0) AS total_labor_budget,
    COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN quantity * cost_price ELSE 0 END), 0) AS total_overhead_budget
  FROM consolidated_budget
  GROUP BY spk_id, wbs_stage
),
realisasi_material AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(quantity * COALESCE(custom_unit_price, unit_price, 0)), 0) AS actual_material_spent
  FROM public.goods_issues
  WHERE status IS NULL OR UPPER(status) NOT IN ('VOIDED', 'CANCELLED')
  GROUP BY spk_id, wbs_stage
),
realisasi_labor AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(COALESCE(contract_value, total_amount, 0)), 0) AS actual_labor_spent
  FROM public.spk_borongan
  WHERE UPPER(status::text) NOT IN ('CANCELLED')
  GROUP BY spk_id, wbs_stage
),
realisasi_overhead AS (
  SELECT 
    spk_id,
    wbs_stage,
    COALESCE(SUM(total_amount), 0) AS actual_overhead_spent
  FROM public.spk_overhead_logs
  GROUP BY spk_id, wbs_stage
),
stages AS (
  SELECT spk_id, wbs_stage FROM pagu_per_wbs
  UNION
  SELECT spk_id, wbs_stage FROM realisasi_material
  UNION
  SELECT spk_id, wbs_stage FROM realisasi_labor
  UNION
  SELECT spk_id, wbs_stage FROM realisasi_overhead
)
SELECT 
  s.id AS spk_id,
  COALESCE(s.spk_number, s.spk_no) AS spk_number,
  s.customer_name,
  s.vehicle_plate,
  st.wbs_stage,
  
  -- Pagu HPP
  COALESCE(p.total_material_budget, 0) AS total_material_budget,
  COALESCE(p.total_labor_budget, 0) AS total_labor_budget,
  COALESCE(p.total_overhead_budget, 0) AS total_overhead_budget,
  (COALESCE(p.total_material_budget, 0) + COALESCE(p.total_labor_budget, 0) + COALESCE(p.total_overhead_budget, 0)) AS total_wbs_budget,

  -- Realisasi Fisik Lapangan
  COALESCE(rm.actual_material_spent, 0) AS actual_material_spent,
  COALESCE(rl.actual_labor_spent, 0) AS actual_labor_spent,
  COALESCE(ro.actual_overhead_spent, 0) AS actual_overhead_spent,
  (COALESCE(rm.actual_material_spent, 0) + COALESCE(rl.actual_labor_spent, 0) + COALESCE(ro.actual_overhead_spent, 0)) AS total_actual_wbs_spent,

  -- Varian Dinamis (Pagu - Realisasi)
  (COALESCE(p.total_material_budget, 0) - COALESCE(rm.actual_material_spent, 0)) AS material_variance,
  (COALESCE(p.total_labor_budget, 0) - COALESCE(rl.actual_labor_spent, 0)) AS labor_variance,
  (COALESCE(p.total_overhead_budget, 0) - COALESCE(ro.actual_overhead_spent, 0)) AS overhead_variance,
  ((COALESCE(p.total_material_budget, 0) + COALESCE(p.total_labor_budget, 0) + COALESCE(p.total_overhead_budget, 0)) - 
   (COALESCE(rm.actual_material_spent, 0) + COALESCE(rl.actual_labor_spent, 0) + COALESCE(ro.actual_overhead_spent, 0))) AS total_wbs_variance,

  -- Status Otomatis
  CASE 
    WHEN (COALESCE(p.total_material_budget, 0) - COALESCE(rm.actual_material_spent, 0)) < 0 
      OR (COALESCE(p.total_labor_budget, 0) - COALESCE(rl.actual_labor_spent, 0)) < 0 
      OR (COALESCE(p.total_overhead_budget, 0) - COALESCE(ro.actual_overhead_spent, 0)) < 0 
    THEN 'OVERBUDGET'
    ELSE 'HEMAT / DALAM BATAS'
  END AS wbs_budget_status

FROM stages st
JOIN public.spk s ON st.spk_id = s.id
LEFT JOIN pagu_per_wbs p ON st.spk_id = p.spk_id AND st.wbs_stage = p.wbs_stage
LEFT JOIN realisasi_material rm ON st.spk_id = rm.spk_id AND st.wbs_stage = rm.wbs_stage
LEFT JOIN realisasi_labor rl ON st.spk_id = rl.spk_id AND st.wbs_stage = rl.wbs_stage
LEFT JOIN realisasi_overhead ro ON st.spk_id = ro.spk_id AND st.wbs_stage = ro.wbs_stage
WHERE UPPER(s.status::text) NOT IN ('DRAFT', 'PENDING_PAYMENT')
  AND s.is_hidden = FALSE
  AND s.is_test = FALSE;

GRANT SELECT ON public.view_wbs_cost_variance TO authenticated;

