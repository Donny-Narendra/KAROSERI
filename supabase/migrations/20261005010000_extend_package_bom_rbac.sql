-- Update RLS for product_packages to include owner and service_advisor
DROP POLICY IF EXISTS "Enable all operations for warehouse staff on product_packages" ON public.product_packages;
CREATE POLICY "Enable operations for authorized roles on product_packages" ON public.product_packages
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('petugas_gudang', 'owner', 'service_advisor')
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('petugas_gudang', 'owner', 'service_advisor')
);

-- Update RLS for package_items to include owner and service_advisor
DROP POLICY IF EXISTS "Enable all operations for warehouse staff on package_items" ON public.package_items;
CREATE POLICY "Enable operations for authorized roles on package_items" ON public.package_items
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('petugas_gudang', 'owner', 'service_advisor')
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('petugas_gudang', 'owner', 'service_advisor')
);
