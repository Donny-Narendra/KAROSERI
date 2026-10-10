-- Migration to add task_description to spk_borongan
ALTER TABLE public.spk_borongan ADD COLUMN IF NOT EXISTS task_description text;

-- Update RLS if necessary. The existing RLS should already cover INSERT/SELECT/UPDATE for spk_borongan,
-- but just in case, we will ensure that mandor can access it. (Assuming policies are already set on the table level)
