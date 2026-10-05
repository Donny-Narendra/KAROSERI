ALTER TABLE public.rab_items
ADD COLUMN package_id uuid REFERENCES public.product_packages(id) ON DELETE SET NULL;
