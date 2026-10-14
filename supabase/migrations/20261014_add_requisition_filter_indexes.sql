-- ============================================================================
-- Migrasi: Indeks Komposit untuk Filter & Query Cepat Requisition di Gudang
-- File: supabase/migrations/20261014_add_requisition_filter_indexes.sql
-- ============================================================================

-- Tambahkan indeks komposit pada material_requisitions untuk query filter cepat di portal gudang
CREATE INDEX IF NOT EXISTS idx_material_requisitions_spk_status 
ON public.material_requisitions (spk_id, status);

CREATE INDEX IF NOT EXISTS idx_material_requisition_items_req_status 
ON public.material_requisition_items (requisition_id, status);
