ALTER TABLE public.spk ADD COLUMN IF NOT EXISTS allocation_status text DEFAULT 'COMPLETE';
