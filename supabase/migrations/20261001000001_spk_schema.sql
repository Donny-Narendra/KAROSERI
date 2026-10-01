-- ==============================================================================
-- 1. Enum spk_status
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'spk_status') THEN
        CREATE TYPE spk_status AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'CANCELLED');
    END IF;
END$$;

-- ==============================================================================
-- 2. spk Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.spk (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spk_no text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  vehicle_plate text NOT NULL,
  status spk_status NOT NULL DEFAULT 'DRAFT',
  target_date date,
  total_estimated_cost numeric(15,2) DEFAULT 0,
  dp_amount numeric(15,2) DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. spk_assets Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.spk_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spk_id uuid REFERENCES public.spk(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  description text,
  uploaded_by uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. spk_amendments Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.spk_amendments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spk_id uuid REFERENCES public.spk(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  cost_adjustment numeric(15,2) DEFAULT 0,
  approved_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 5. Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.spk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spk_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spk_amendments ENABLE ROW LEVEL SECURITY;

-- Owner can do everything. Service Advisor can manage SPK, assets, and request amendments.
CREATE POLICY "Owners have full access to SPK"
  ON public.spk FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

CREATE POLICY "Service Advisors can manage SPK"
  ON public.spk FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'service_advisor' );

CREATE POLICY "Owners have full access to SPK Assets"
  ON public.spk_assets FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

CREATE POLICY "Service Advisors can manage SPK Assets"
  ON public.spk_assets FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'service_advisor' );

CREATE POLICY "Owners have full access to SPK Amendments"
  ON public.spk_amendments FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

CREATE POLICY "Service Advisors can view and create SPK Amendments"
  ON public.spk_amendments FOR SELECT
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'service_advisor' );

CREATE POLICY "Service Advisors can insert SPK Amendments"
  ON public.spk_amendments FOR INSERT
  WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'service_advisor' );
