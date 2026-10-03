-- ==============================================================================
-- 1. Enums
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requisition_status') THEN
        CREATE TYPE requisition_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'spk_borongan_status') THEN
        CREATE TYPE spk_borongan_status AS ENUM ('ACTIVE', 'CUT_OFF', 'COMPLETED');
    END IF;
END$$;

-- ==============================================================================
-- 2. Alter materials
-- ==============================================================================
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS is_customer_supplied BOOLEAN DEFAULT false;

-- ==============================================================================
-- 3. material_requisitions Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.material_requisitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spk_id uuid REFERENCES public.spk(id) ON DELETE CASCADE NOT NULL,
  wbs_category wbs_category NOT NULL,
  requested_by uuid REFERENCES public.profiles(id) NOT NULL,
  status requisition_status DEFAULT 'PENDING' NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. material_requisition_items Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.material_requisition_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_id uuid REFERENCES public.material_requisitions(id) ON DELETE CASCADE NOT NULL,
  material_id uuid REFERENCES public.materials(id) NOT NULL,
  quantity numeric(10,2) DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 5. spk_borongan Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.spk_borongan (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spk_id uuid REFERENCES public.spk(id) ON DELETE CASCADE NOT NULL,
  wbs_category wbs_category NOT NULL,
  worker_name text NOT NULL,
  contract_value numeric(15,2) DEFAULT 0 NOT NULL,
  status spk_borongan_status DEFAULT 'ACTIVE' NOT NULL,
  progress_percentage numeric(5,2) DEFAULT 0 NOT NULL,
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 6. Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.material_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spk_borongan ENABLE ROW LEVEL SECURITY;

-- Owner can do all
CREATE POLICY "Owners have full access to material_requisitions"
  ON public.material_requisitions FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

CREATE POLICY "Owners have full access to material_requisition_items"
  ON public.material_requisition_items FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

CREATE POLICY "Owners have full access to spk_borongan"
  ON public.spk_borongan FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

-- Mandor access
CREATE POLICY "Mandor can manage material_requisitions"
  ON public.material_requisitions FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mandor' );

CREATE POLICY "Mandor can manage material_requisition_items"
  ON public.material_requisition_items FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mandor' );

CREATE POLICY "Mandor can manage spk_borongan"
  ON public.spk_borongan FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mandor' );

-- Gudang access
CREATE POLICY "Gudang can manage material_requisitions"
  ON public.material_requisitions FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'petugas_gudang' );

CREATE POLICY "Gudang can manage material_requisition_items"
  ON public.material_requisition_items FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'petugas_gudang' );
