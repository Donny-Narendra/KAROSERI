-- Add current_stock and minimum_stock columns to public.materials
ALTER TABLE public.materials
ADD COLUMN current_stock numeric DEFAULT 0,
ADD COLUMN minimum_stock numeric DEFAULT 0;
