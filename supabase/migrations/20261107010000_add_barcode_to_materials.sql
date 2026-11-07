-- Tambahkan kolom barcode pada tabel materials
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Buat indeks untuk mempercepat pencarian via scanner / autocomplete
CREATE INDEX IF NOT EXISTS idx_materials_barcode ON public.materials(barcode);

-- Berikan hak akses
GRANT SELECT, INSERT, UPDATE ON public.materials TO authenticated;
