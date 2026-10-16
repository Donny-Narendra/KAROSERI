-- ==============================================================================
-- FINANCIAL REPORTING EXECUTIVE SUMMARY RPC UPDATE (DECOUPLE MATERIAL & LABOR)
-- ROBELKAROSERI WORKSHOP MANAGEMENT SYSTEM
-- File: supabase/migrations/20261016040000_decouple_executive_kpi_rpc.sql
-- ==============================================================================

-- Perbarui RPC get_financial_executive_summary agar mengekspos rincian biaya material dan borongan secara independen
CREATE OR REPLACE FUNCTION get_financial_executive_summary(
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_summary JSON;
BEGIN
  WITH filtered_spk AS (
    SELECT * FROM view_spk_job_profitability
    WHERE (start_date IS NULL OR registration_date >= start_date)
      AND (end_date IS NULL OR registration_date <= end_date)
  ),
  inventory_stat AS (
    SELECT 
      COALESCE(SUM(total_inventory_valuation_hpp), 0) AS total_inventory_hpp,
      COALESCE(SUM(total_inventory_market_value), 0) AS total_inventory_market
    FROM view_inventory_valuation
  ),
  receivables_stat AS (
    SELECT 
      COALESCE(SUM(outstanding_balance), 0) AS total_outstanding,
      COUNT(CASE WHEN handover_clearance_status = 'UNIT SELESAI (TERTAHAN PELUNASAN)' THEN 1 END) AS pending_handover_count
    FROM view_project_receivables
  )
  SELECT json_build_object(
    'total_projects', COUNT(f.spk_id),
    'total_revenue', COALESCE(SUM(f.total_revenue), 0),
    'total_actual_material_cost', COALESCE(SUM(f.actual_material_cost), 0),
    'total_actual_labor_cost', COALESCE(SUM(f.actual_labor_cost), 0),
    'total_cogs', COALESCE(SUM(f.total_cogs), 0),
    'total_gross_profit', COALESCE(SUM(f.gross_profit), 0),
    'average_gross_margin', CASE 
      WHEN COALESCE(SUM(f.total_revenue), 0) > 0 THEN 
        ROUND((SUM(f.gross_profit) / SUM(f.total_revenue) * 100)::numeric, 2)
      ELSE 0 
    END,
    'total_inventory_valuation', (SELECT total_inventory_hpp FROM inventory_stat),
    'total_inventory_market_value', (SELECT total_inventory_market FROM inventory_stat),
    'total_outstanding_receivables', (SELECT total_outstanding FROM receivables_stat),
    'units_pending_handover', (SELECT pending_handover_count FROM receivables_stat)
  ) INTO v_summary
  FROM filtered_spk f;

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_financial_executive_summary TO authenticated;
