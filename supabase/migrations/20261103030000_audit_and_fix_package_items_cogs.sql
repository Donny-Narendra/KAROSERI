-- ==============================================================================
-- MIGRATION: 20261103030000_audit_and_fix_package_items_cogs.sql
-- Description:
--   Audit dan sinkronisasi Biaya Satuan (cost_per_unit) komponen paket barang jadi
--   (package_items) bertipe MATERIAL agar sama persis dengan Harga Modal / HPP
--   (materials.cost_price), serta menghitung ulang akumulasi HPP paket
--   (product_packages.calculated_cogs).
--
-- Catatan Skema:
--   - Kolom Biaya Satuan pada tabel public.package_items di PostgreSQL adalah
--     `cost_per_unit` (dalam terminologi UI / bisnis disebut `unit_cost` / Biaya Satuan).
--   - Subtotal biaya dihitung on-the-fly: (quantity * cost_per_unit).
-- ==============================================================================

-- 1. Query Audit (Melihat daftar komponen yang tidak sesuai sebelum di-update)
-- SELECT 
--   p.name AS nama_paket,
--   m.name AS nama_material,
--   pi.cost_per_unit AS biaya_satuan_saat_ini,
--   m.cost_price AS hpp_inventaris_sebenarnya,
--   m.selling_price AS harga_jual_inventaris,
--   (pi.cost_per_unit - m.cost_price) AS selisih_penyimpangan
-- FROM public.package_items pi
-- JOIN public.product_packages p ON p.id = pi.package_id
-- JOIN public.materials m ON m.id = pi.material_id
-- WHERE pi.item_type = 'MATERIAL' 
--   AND pi.cost_per_unit IS DISTINCT FROM m.cost_price;

-- 2. Koreksi Otomatis: Setel cost_per_unit mengikuti cost_price inventaris
UPDATE public.package_items pi
SET 
  cost_per_unit = m.cost_price
FROM public.materials m
WHERE pi.material_id = m.id
  AND pi.item_type = 'MATERIAL'
  AND pi.cost_per_unit IS DISTINCT FROM m.cost_price;

-- 3. Hitung Ulang Total Akumulasi HPP pada Header Paket Barang Jadi
UPDATE public.product_packages p
SET calculated_cogs = sub.total_cogs
FROM (
  SELECT 
    package_id, 
    COALESCE(SUM(quantity * cost_per_unit), 0) AS total_cogs
  FROM public.package_items
  GROUP BY package_id
) sub
WHERE p.id = sub.package_id;
