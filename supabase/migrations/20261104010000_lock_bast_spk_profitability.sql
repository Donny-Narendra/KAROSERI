-- ==============================================================================
-- MIGRATION: 20261104010000_lock_bast_spk_profitability.sql
-- Description: Enforce permanent profit & financial snapshot locking upon BAST / COMPLETED handover.
--              Freezes revenue, COGS, and gross profit so future inventory price updates
--              do not alter historical financial figures.
-- ==============================================================================

-- 1. Tambahkan kolom pengunci snapshot finansial pada tabel spk
ALTER TABLE public.spk
ADD COLUMN IF NOT EXISTS is_profit_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bast_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS locked_revenue NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS locked_cogs NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS locked_profit NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS locked_margin_pct NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS final_revenue NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS final_cogs NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS final_profit NUMERIC(15, 2);

-- 2. Drop dependent views first
DROP VIEW IF EXISTS public.view_corporate_monthly_pnl CASCADE;
DROP VIEW IF EXISTS public.view_spk_job_profitability CASCADE;

-- 3. Recreate View view_spk_job_profitability dengan prioritas nilai locked jika is_profit_locked = TRUE
CREATE OR REPLACE VIEW public.view_spk_job_profitability AS
WITH rab_pkg AS (
  SELECT 
    ri.spk_id,
    ri.package_id,
    COALESCE(MAX(pp.selling_price), SUM(ri.quantity * ri.unit_price)) AS pkg_selling_price,
    SUM(ri.quantity * ri.cost_price) AS pkg_cogs,
    SUM(CASE WHEN ri.item_type = 'MATERIAL' THEN ri.quantity * ri.cost_price ELSE 0 END) AS pkg_mat_cogs,
    SUM(CASE WHEN ri.item_type = 'LABOR' THEN ri.quantity * ri.cost_price ELSE 0 END) AS pkg_labor_cogs,
    SUM(CASE WHEN ri.item_type = 'OVERHEAD' THEN ri.quantity * ri.cost_price ELSE 0 END) AS pkg_foh_cogs
  FROM public.rab_items ri
  LEFT JOIN public.product_packages pp ON ri.package_id = pp.id
  WHERE ri.package_id IS NOT NULL
  GROUP BY ri.spk_id, ri.package_id, COALESCE(ri.package_name, '')
),
co_pkg AS (
  SELECT 
    co.spk_id,
    coi.package_source_id AS package_id,
    COALESCE(MAX(pp.selling_price), SUM(coi.quantity * coi.unit_price)) AS pkg_selling_price,
    SUM(coi.quantity * coi.cost_price) AS pkg_cogs,
    SUM(CASE WHEN coi.item_type = 'MATERIAL' THEN coi.quantity * coi.cost_price ELSE 0 END) AS pkg_mat_cogs,
    SUM(CASE WHEN coi.item_type = 'LABOR' THEN coi.quantity * coi.cost_price ELSE 0 END) AS pkg_labor_cogs,
    SUM(CASE WHEN coi.item_type = 'OVERHEAD' THEN coi.quantity * coi.cost_price ELSE 0 END) AS pkg_foh_cogs
  FROM public.change_order_items coi
  JOIN public.change_orders co ON coi.change_order_id = co.id
  LEFT JOIN public.product_packages pp ON coi.package_source_id = pp.id
  WHERE co.status = 'APPROVED' AND (coi.package_source_id IS NOT NULL OR coi.package_name IS NOT NULL)
  GROUP BY co.spk_id, coi.package_source_id, COALESCE(coi.package_instance_id::text, coi.package_name, '')
),
package_summary AS (
  SELECT 
    spk_id,
    COALESCE(SUM(pkg_selling_price), 0) AS package_revenue,
    COALESCE(SUM(pkg_cogs), 0) AS package_cogs,
    COALESCE(SUM(pkg_mat_cogs), 0) AS pkg_material_cogs,
    COALESCE(SUM(pkg_labor_cogs), 0) AS pkg_labor_cogs,
    COALESCE(SUM(pkg_foh_cogs), 0) AS pkg_foh_cogs
  FROM (
    SELECT * FROM rab_pkg
    UNION ALL
    SELECT * FROM co_pkg
  ) all_pkg
  GROUP BY spk_id
),
granular_items AS (
  SELECT 
    spk_id,
    item_type,
    quantity,
    unit_price,
    cost_price
  FROM public.rab_items
  WHERE package_id IS NULL AND (package_name IS NULL OR package_name = '')
  UNION ALL
  SELECT 
    co.spk_id,
    coi.item_type,
    coi.quantity,
    coi.unit_price,
    coi.cost_price
  FROM public.change_order_items coi
  JOIN public.change_orders co ON coi.change_order_id = co.id
  WHERE co.status = 'APPROVED' AND coi.package_source_id IS NULL AND (coi.package_name IS NULL OR coi.package_name = '')
),
granular_summary AS (
  SELECT 
    spk_id,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN quantity * unit_price ELSE 0 END), 0) AS granular_mat_revenue,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * unit_price ELSE 0 END), 0) AS granular_labor_revenue,
    COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN quantity * unit_price ELSE 0 END), 0) AS granular_foh_revenue,
    COALESCE(SUM(CASE WHEN item_type = 'MATERIAL' THEN quantity * cost_price ELSE 0 END), 0) AS granular_mat_cogs,
    COALESCE(SUM(CASE WHEN item_type = 'LABOR' THEN quantity * cost_price ELSE 0 END), 0) AS granular_labor_cogs,
    COALESCE(SUM(CASE WHEN item_type = 'OVERHEAD' THEN quantity * cost_price ELSE 0 END), 0) AS granular_foh_cogs
  FROM granular_items
  GROUP BY spk_id
)
SELECT 
  s.id AS spk_id,
  COALESCE(s.spk_number, s.spk_no) AS spk_number,
  s.customer_name,
  s.vehicle_plate,
  s.status::text AS spk_status,
  s.created_at AS registration_date,

  -- Breakdown Komponen & 4 Pilar Profit Segregation
  COALESCE(ps.package_revenue, 0) AS package_revenue,
  COALESCE(ps.package_cogs, 0) AS package_cogs,
  (COALESCE(ps.package_revenue, 0) - COALESCE(ps.package_cogs, 0)) AS package_profit,
  COALESCE(gs.granular_mat_revenue, 0) AS granular_mat_revenue,
  COALESCE(gs.granular_mat_cogs, 0) AS granular_mat_cogs,
  (COALESCE(gs.granular_mat_revenue, 0) - COALESCE(gs.granular_mat_cogs, 0)) AS granular_material_profit,
  COALESCE(gs.granular_labor_revenue, 0) AS granular_labor_revenue,
  COALESCE(gs.granular_labor_cogs, 0) AS granular_labor_cogs,
  (COALESCE(gs.granular_labor_revenue, 0) - COALESCE(gs.granular_labor_cogs, 0)) AS granular_labor_profit,
  COALESCE(gs.granular_foh_revenue, 0) AS granular_foh_revenue,
  COALESCE(gs.granular_foh_cogs, 0) AS granular_foh_cogs,
  (COALESCE(gs.granular_foh_revenue, 0) - COALESCE(gs.granular_foh_cogs, 0)) AS granular_overhead_profit,

  -- 1. Total Omzet / Pendapatan Konsolidasi (Prioritaskan nilai snapshot jika dikunci)
  CASE 
    WHEN s.is_profit_locked = TRUE AND s.locked_revenue IS NOT NULL THEN s.locked_revenue
    ELSE (COALESCE(ps.package_revenue, 0) + COALESCE(gs.granular_mat_revenue, 0) + COALESCE(gs.granular_labor_revenue, 0) + COALESCE(gs.granular_foh_revenue, 0))
  END AS total_revenue,

  -- 2. HPP per Kategori Komprehensif (Paket + Granular)
  (COALESCE(ps.pkg_material_cogs, 0) + COALESCE(gs.granular_mat_cogs, 0)) AS actual_material_cost,
  (COALESCE(ps.pkg_labor_cogs, 0) + COALESCE(gs.granular_labor_cogs, 0)) AS actual_labor_cost,
  (COALESCE(ps.pkg_foh_cogs, 0) + COALESCE(gs.granular_foh_cogs, 0)) AS actual_overhead_cost,

  -- 3. Total HPP (COGS) (Prioritaskan nilai snapshot jika dikunci)
  CASE 
    WHEN s.is_profit_locked = TRUE AND s.locked_cogs IS NOT NULL THEN s.locked_cogs
    ELSE (COALESCE(ps.package_cogs, 0) + COALESCE(gs.granular_mat_cogs, 0) + COALESCE(gs.granular_labor_cogs, 0) + COALESCE(gs.granular_foh_cogs, 0))
  END AS total_cogs,

  -- 4. Laba Kotor (Gross Profit) & Persentase (Prioritaskan nilai snapshot jika dikunci)
  CASE 
    WHEN s.is_profit_locked = TRUE AND s.locked_profit IS NOT NULL THEN s.locked_profit
    ELSE ((COALESCE(ps.package_revenue, 0) + COALESCE(gs.granular_mat_revenue, 0) + COALESCE(gs.granular_labor_revenue, 0) + COALESCE(gs.granular_foh_revenue, 0)) -
          (COALESCE(ps.package_cogs, 0) + COALESCE(gs.granular_mat_cogs, 0) + COALESCE(gs.granular_labor_cogs, 0) + COALESCE(gs.granular_foh_cogs, 0)))
  END AS gross_profit,

  CASE 
    WHEN s.is_profit_locked = TRUE AND s.locked_margin_pct IS NOT NULL THEN s.locked_margin_pct
    WHEN (COALESCE(ps.package_revenue, 0) + COALESCE(gs.granular_mat_revenue, 0) + COALESCE(gs.granular_labor_revenue, 0) + COALESCE(gs.granular_foh_revenue, 0)) > 0 THEN
      ROUND((((COALESCE(ps.package_revenue, 0) + COALESCE(gs.granular_mat_revenue, 0) + COALESCE(gs.granular_labor_revenue, 0) + COALESCE(gs.granular_foh_revenue, 0)) -
              (COALESCE(ps.package_cogs, 0) + COALESCE(gs.granular_mat_cogs, 0) + COALESCE(gs.granular_labor_cogs, 0) + COALESCE(gs.granular_foh_cogs, 0))) /
             (COALESCE(ps.package_revenue, 0) + COALESCE(gs.granular_mat_revenue, 0) + COALESCE(gs.granular_labor_revenue, 0) + COALESCE(gs.granular_foh_revenue, 0)) * 100)::numeric, 2)
    ELSE 0
  END AS gross_margin_percentage,

  COALESCE(s.status::text, 'ACTIVE') AS payment_status,
  s.is_profit_locked,
  s.bast_date,
  s.locked_revenue,
  s.locked_cogs,
  s.locked_profit,
  s.locked_margin_pct,
  s.final_revenue,
  s.final_cogs,
  s.final_profit

FROM public.spk s
LEFT JOIN package_summary ps ON s.id = ps.spk_id
LEFT JOIN granular_summary gs ON s.id = gs.spk_id
WHERE UPPER(s.status::text) NOT IN ('DRAFT', 'PENDING_PAYMENT');

GRANT SELECT ON public.view_spk_job_profitability TO authenticated, anon;

-- 4. Recreate view_corporate_monthly_pnl (depends on view_spk_job_profitability)
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

-- 5. Trigger Function: Bekukan Laba-Rugi saat SPK berubah menjadi COMPLETED / BAST
CREATE OR REPLACE FUNCTION public.freeze_spk_financials_on_bast()
RETURNS TRIGGER AS $$
DECLARE
  v_revenue NUMERIC(15, 2);
  v_cogs NUMERIC(15, 2);
  v_profit NUMERIC(15, 2);
  v_margin NUMERIC(5, 2);
BEGIN
  -- Trigger aktif jika status berubah menjadi COMPLETED, HANDED_OVER, atau BAST dan belum pernah dikunci
  IF (UPPER(NEW.status::text) IN ('COMPLETED', 'HANDED_OVER', 'BAST') 
      AND (OLD.status IS NULL OR UPPER(OLD.status::text) NOT IN ('COMPLETED', 'HANDED_OVER', 'BAST'))) 
     AND (NEW.is_profit_locked IS NOT TRUE) THEN

    -- Ambil nilai finansial dari view laba rugi proyek
    SELECT 
      COALESCE(total_revenue, 0),
      COALESCE(total_cogs, 0),
      COALESCE(gross_profit, 0),
      COALESCE(gross_margin_percentage, 0)
    INTO v_revenue, v_cogs, v_profit, v_margin
    FROM public.view_spk_job_profitability
    WHERE spk_id = NEW.id;

    -- Jika view belum menghitung, fallback ke perhitungan konsolidasi riil
    IF v_revenue IS NULL OR v_revenue = 0 THEN
      SELECT COALESCE(SUM(quantity * unit_price), 0) INTO v_revenue FROM public.rab_items WHERE spk_id = NEW.id;
      SELECT COALESCE(SUM(quantity * cost_price), 0) INTO v_cogs FROM public.rab_items WHERE spk_id = NEW.id;
      v_profit := v_revenue - v_cogs;
      v_margin := CASE WHEN v_revenue > 0 THEN ROUND((v_profit / v_revenue * 100)::numeric, 2) ELSE 0 END;
    END IF;

    NEW.is_profit_locked := TRUE;
    NEW.bast_date := COALESCE(NEW.bast_date, NOW());
    NEW.locked_revenue := v_revenue;
    NEW.locked_cogs := v_cogs;
    NEW.locked_profit := v_profit;
    NEW.locked_margin_pct := v_margin;
    NEW.final_revenue := v_revenue;
    NEW.final_cogs := v_cogs;
    NEW.final_profit := v_profit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_freeze_spk_financials_on_bast ON public.spk;
CREATE TRIGGER trg_freeze_spk_financials_on_bast
BEFORE INSERT OR UPDATE OF status ON public.spk
FOR EACH ROW
EXECUTE FUNCTION public.freeze_spk_financials_on_bast();

-- 6. Backfill SPK yang sudah berstatus BAST / COMPLETED sebelumnya
UPDATE public.spk s
SET 
  is_profit_locked = TRUE,
  bast_date = COALESCE(s.bast_date, s.created_at),
  locked_revenue = sub.total_revenue,
  locked_cogs = sub.total_cogs,
  locked_profit = sub.gross_profit,
  locked_margin_pct = sub.gross_margin_percentage,
  final_revenue = sub.total_revenue,
  final_cogs = sub.total_cogs,
  final_profit = sub.gross_profit
FROM (
  SELECT spk_id, total_revenue, total_cogs, gross_profit, gross_margin_percentage
  FROM public.view_spk_job_profitability
) sub
WHERE s.id = sub.spk_id
  AND UPPER(s.status::text) IN ('COMPLETED', 'HANDED_OVER', 'BAST')
  AND s.is_profit_locked IS NOT TRUE;
