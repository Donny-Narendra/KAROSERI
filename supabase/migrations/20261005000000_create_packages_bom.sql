-- Tabel Master Paket Barang Jadi
CREATE TABLE public.product_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    selling_price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS untuk product_packages
ALTER TABLE public.product_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read product_packages" ON public.product_packages FOR SELECT USING (true);
CREATE POLICY "Allow insert product_packages" ON public.product_packages FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner', 'petugas_gudang')
);
CREATE POLICY "Allow update product_packages" ON public.product_packages FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner', 'petugas_gudang')
);
CREATE POLICY "Allow delete product_packages" ON public.product_packages FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner', 'petugas_gudang')
);

-- Tabel Detail Komponen (BOM)
CREATE TABLE public.package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.product_packages(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('MATERIAL', 'LABOR')),
    material_id UUID REFERENCES public.materials(id),
    labor_name TEXT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    cost_per_unit NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraint: Jika MATERIAL, material_id wajib ada. Jika LABOR, labor_name wajib ada.
    CONSTRAINT valid_item_details CHECK (
        (item_type = 'MATERIAL' AND material_id IS NOT NULL AND labor_name IS NULL) OR
        (item_type = 'LABOR' AND labor_name IS NOT NULL AND material_id IS NULL)
    )
);

-- RLS untuk package_items
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read package_items" ON public.package_items FOR SELECT USING (true);
CREATE POLICY "Allow insert package_items" ON public.package_items FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner', 'petugas_gudang')
);
CREATE POLICY "Allow update package_items" ON public.package_items FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner', 'petugas_gudang')
);
CREATE POLICY "Allow delete package_items" ON public.package_items FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner', 'petugas_gudang')
);
