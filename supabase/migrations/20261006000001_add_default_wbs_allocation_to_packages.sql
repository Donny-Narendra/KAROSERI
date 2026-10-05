ALTER TABLE public.package_items ADD COLUMN IF NOT EXISTS default_wbs_allocation jsonb DEFAULT '{}'::jsonb;
