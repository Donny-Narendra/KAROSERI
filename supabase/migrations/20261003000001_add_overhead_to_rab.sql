ALTER TABLE public.rab_estimations
ADD COLUMN total_overhead_cost numeric DEFAULT 0;

ALTER TABLE public.rab_items
ADD COLUMN overhead_hours numeric DEFAULT 0,
ADD COLUMN overhead_rate numeric DEFAULT 0,
ADD COLUMN description text;
