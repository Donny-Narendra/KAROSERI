-- ==============================================================================
-- Migration: 20261016020000_itemized_change_orders.sql
-- Description: Itemized Change Orders with Point-in-Time Price Snapshot & WBS Allocation
-- ==============================================================================

-- 1. Header Change Order Table
CREATE TABLE IF NOT EXISTS public.change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_id UUID REFERENCES public.spk(id) ON DELETE CASCADE NOT NULL,
  co_number VARCHAR(50),
  description TEXT NOT NULL DEFAULT '',
  cost_adjustment NUMERIC(15, 2) DEFAULT 0,
  total_amount NUMERIC(15, 2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'APPROVED', -- DRAFT, PENDING, APPROVED, REJECTED
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.change_orders
ADD COLUMN IF NOT EXISTS co_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'APPROVED',
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- 2. Detail Item Change Order (Itemized Snapshot)
CREATE TABLE IF NOT EXISTS public.change_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID REFERENCES public.change_orders(id) ON DELETE CASCADE,
  spk_id UUID REFERENCES public.spk(id) ON DELETE CASCADE,
  wbs_stage VARCHAR(50) NOT NULL, -- misal: 'WBS 2: Sasis/Rangka' atau 'Sasis/Rangka'
  item_type VARCHAR(20) DEFAULT 'MATERIAL', -- 'MATERIAL' atau 'LABOR'
  material_id UUID REFERENCES public.materials(id),
  item_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'pcs',
  unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Snapshot harga jual saat CO dibuat
  cost_price NUMERIC(15, 2) DEFAULT 0,         -- Snapshot HPP gudang saat CO dibuat
  subtotal NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security (RLS)
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read/write change_orders" ON public.change_orders;
CREATE POLICY "Allow authenticated read/write change_orders"
ON public.change_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.change_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read/write change_order_items" ON public.change_order_items;
CREATE POLICY "Allow authenticated read/write change_order_items"
ON public.change_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Backward Compatibility Sync with Legacy spk_amendments
-- Keeps spk_amendments updated so Kasir & Admin dashboards reflect approved change orders seamlessly.
CREATE OR REPLACE FUNCTION public.sync_change_order_to_spk_amendments()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.spk_amendments (id, spk_id, description, cost_adjustment, status, approved_by, created_at)
    VALUES (
      NEW.id,
      NEW.spk_id,
      COALESCE(NULLIF(NEW.description, ''), NEW.co_number, 'Change Order'),
      COALESCE(NEW.cost_adjustment, NEW.total_amount, 0),
      COALESCE(NEW.status, 'PENDING'),
      NEW.approved_by,
      COALESCE(NEW.created_at, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      description = EXCLUDED.description,
      cost_adjustment = EXCLUDED.cost_adjustment,
      status = EXCLUDED.status,
      approved_by = EXCLUDED.approved_by;
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE public.spk_amendments
    SET description = COALESCE(NULLIF(NEW.description, ''), NEW.co_number, 'Change Order'),
        cost_adjustment = COALESCE(NEW.cost_adjustment, NEW.total_amount, 0),
        status = COALESCE(NEW.status, 'PENDING'),
        approved_by = NEW.approved_by
    WHERE id = NEW.id;
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM public.spk_amendments WHERE id = OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_change_orders ON public.change_orders;
CREATE TRIGGER trg_sync_change_orders
AFTER INSERT OR UPDATE OR DELETE ON public.change_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_change_order_to_spk_amendments();
