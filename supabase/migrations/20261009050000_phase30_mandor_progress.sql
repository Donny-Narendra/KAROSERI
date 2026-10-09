-- Add progress percentage to wbs_checklists
ALTER TABLE public.wbs_checklists 
ADD COLUMN IF NOT EXISTS progress_percentage numeric DEFAULT 0 
CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Add wbs_category to spk_assets
ALTER TABLE public.spk_assets 
ADD COLUMN IF NOT EXISTS wbs_category public.wbs_category;
