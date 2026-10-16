-- ==============================================================================
-- STEP 4: FINANCIAL SANITY CHECK & INTEGRITY RECONCILIATION RPC
-- ROBELKAROSERI WORKSHOP MANAGEMENT SYSTEM
-- File: supabase/migrations/20261016_financial_sanity_check_rpc.sql
-- ==============================================================================

CREATE OR REPLACE FUNCTION audit_financial_sanity_check()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH over_budget_spk AS (
    SELECT 
      spk_id,
      spk_number,
      customer_name,
      wbs_stage,
      total_material_budget,
      actual_material_spent,
      (actual_material_spent - total_material_budget) AS overspend_amount
    FROM view_wbs_cost_variance
    WHERE actual_material_spent > total_material_budget
  ),
  negative_margin_spk AS (
    SELECT 
      spk_id,
      spk_number,
      customer_name,
      total_revenue,
      total_cogs,
      gross_profit,
      gross_margin_percentage
    FROM view_spk_job_profitability
    WHERE total_revenue > 0 AND gross_profit < 0
  ),
  unbilled_completed_spk AS (
    SELECT 
      s.id AS spk_id,
      s.spk_number,
      s.customer_name,
      s.vehicle_plate
    FROM spk s
    WHERE s.qc_status = 'PASS'
      AND NOT EXISTS (SELECT 1 FROM final_billing b WHERE b.spk_id = s.id)
  ),
  unpaid_handover_risks AS (
    SELECT 
      spk_id,
      spk_number,
      customer_name,
      outstanding_balance,
      receivable_aging_days
    FROM view_project_receivables
    WHERE handover_clearance_status = 'UNIT SELESAI (TERTAHAN PELUNASAN)'
      AND receivable_aging_days > 7
  )
  SELECT json_build_object(
    'is_healthy', (
      (SELECT COUNT(*) FROM over_budget_spk) = 0 AND 
      (SELECT COUNT(*) FROM negative_margin_spk) = 0 AND 
      (SELECT COUNT(*) FROM unbilled_completed_spk) = 0 AND
      (SELECT COUNT(*) FROM unpaid_handover_risks) = 0
    ),
    'over_budget_count', (SELECT COUNT(*) FROM over_budget_spk),
    'over_budget_items', COALESCE((SELECT json_agg(over_budget_spk) FROM over_budget_spk), '[]'::json),
    'negative_margin_count', (SELECT COUNT(*) FROM negative_margin_spk),
    'negative_margin_items', COALESCE((SELECT json_agg(negative_margin_spk) FROM negative_margin_spk), '[]'::json),
    'unbilled_completed_count', (SELECT COUNT(*) FROM unbilled_completed_spk),
    'unbilled_completed_items', COALESCE((SELECT json_agg(unbilled_completed_spk) FROM unbilled_completed_spk), '[]'::json),
    'critical_receivables_count', (SELECT COUNT(*) FROM unpaid_handover_risks),
    'critical_receivables_items', COALESCE((SELECT json_agg(unpaid_handover_risks) FROM unpaid_handover_risks), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION audit_financial_sanity_check TO authenticated;
GRANT EXECUTE ON FUNCTION audit_financial_sanity_check TO service_role;
GRANT EXECUTE ON FUNCTION audit_financial_sanity_check TO anon;
