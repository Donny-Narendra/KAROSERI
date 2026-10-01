-- ==============================================================================
-- 1. Enum checklist_status
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checklist_status') THEN
        CREATE TYPE checklist_status AS ENUM ('PENDING', 'PASS', 'FAIL');
    END IF;
END$$;

-- ==============================================================================
-- 2. inventory_transactions Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spk_id uuid REFERENCES public.spk(id) ON DELETE CASCADE NOT NULL,
  material_id uuid REFERENCES public.materials(id) NOT NULL,
  quantity_issued numeric(10,2) DEFAULT 0 NOT NULL,
  issued_by uuid REFERENCES public.profiles(id) NOT NULL,
  issued_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. wbs_checklists Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wbs_checklists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spk_id uuid REFERENCES public.spk(id) ON DELETE CASCADE NOT NULL,
  wbs_category wbs_category NOT NULL,
  status checklist_status NOT NULL DEFAULT 'PENDING',
  notes text,
  updated_by uuid REFERENCES public.profiles(id) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(spk_id, wbs_category)
);

-- ==============================================================================
-- 4. Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wbs_checklists ENABLE ROW LEVEL SECURITY;

-- inventory_transactions RLS
CREATE POLICY "Owners have full access to inventory_transactions"
  ON public.inventory_transactions FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

CREATE POLICY "Petugas Gudang can read inventory_transactions"
  ON public.inventory_transactions FOR SELECT
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'petugas_gudang' );

CREATE POLICY "Petugas Gudang can insert inventory_transactions"
  ON public.inventory_transactions FOR INSERT
  WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'petugas_gudang' );

-- wbs_checklists RLS
CREATE POLICY "Owners have full access to wbs_checklists"
  ON public.wbs_checklists FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

CREATE POLICY "Mandor can read wbs_checklists"
  ON public.wbs_checklists FOR SELECT
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mandor' );

CREATE POLICY "Mandor can insert wbs_checklists"
  ON public.wbs_checklists FOR INSERT
  WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mandor' );

CREATE POLICY "Mandor can update wbs_checklists"
  ON public.wbs_checklists FOR UPDATE
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mandor' );
