-- ==============================================================================
-- 1. Enum wbs_category
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wbs_category') THEN
        CREATE TYPE wbs_category AS ENUM ('Pembongkaran', 'Sasis/Rangka', 'Dinding/Fabrikasi', 'Cat/Finishing', 'Kelistrikan/Hidrolik');
    END IF;
END$$;

-- ==============================================================================
-- 2. materials Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  unit_price numeric(15,2) DEFAULT 0,
  waste_factor_percentage numeric(5,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. rab_estimations Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rab_estimations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spk_id uuid REFERENCES public.spk(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_material_cost numeric(15,2) DEFAULT 0,
  total_labor_cost numeric(15,2) DEFAULT 0,
  total_estimated_cost numeric(15,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. rab_items Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rab_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rab_estimation_id uuid REFERENCES public.rab_estimations(id) ON DELETE CASCADE NOT NULL,
  wbs_category wbs_category NOT NULL,
  material_id uuid REFERENCES public.materials(id),
  quantity numeric(10,2) DEFAULT 0,
  labor_hours numeric(10,2) DEFAULT 0,
  labor_rate numeric(15,2) DEFAULT 0,
  item_total numeric(15,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 5. Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rab_estimations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rab_items ENABLE ROW LEVEL SECURITY;

-- Owner can do everything. Service Advisor can manage rab.
CREATE POLICY "Owners have full access to materials"
  ON public.materials FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

CREATE POLICY "Service Advisors can read materials"
  ON public.materials FOR SELECT
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'service_advisor' );

CREATE POLICY "Owners have full access to rab_estimations"
  ON public.rab_estimations FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

CREATE POLICY "Service Advisors can manage rab_estimations"
  ON public.rab_estimations FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'service_advisor' );

CREATE POLICY "Owners have full access to rab_items"
  ON public.rab_items FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

CREATE POLICY "Service Advisors can manage rab_items"
  ON public.rab_items FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'service_advisor' );
