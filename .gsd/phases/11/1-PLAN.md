---
phase: 11
plan: 1
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20261004000000_add_custom_unit_price_to_inventory_transactions.sql
  - src/pages/WarehouseDashboard.tsx
  - src/components/RecentMaterialIssues.tsx
  - src/services/inventoryService.ts
autonomous: true

must_haves:
  truths:
    - "Kolom custom_unit_price berhasil ditambahkan ke tabel inventory_transactions"
    - "Stok barang berhasil dikembalikan (refund) jika pengeluaran dibatalkan"
    - "Nilai custom_unit_price dapat diubah per SPK dan terbaca saat agregasi penagihan"
  artifacts:
    - "src/components/RecentMaterialIssues.tsx"
---

# Plan 11.1: Seleksi Hapus (Void Issue) & Edit Harga Khusus pada Recent Material Issues

<objective>
Menambahkan kemampuan membatalkan pengeluaran material (void) beserta pengembalian stok barang dan pengaturan harga kustom per transaksi SPK.
</objective>

<context>
Load for context:
- src/components/RecentMaterialIssues.tsx
- src/services/inventoryService.ts
</context>

<tasks>

<task type="auto">
  <name>Migrasi penambahan kolom custom_unit_price pada inventory_transactions</name>
  <files>supabase/migrations/20261004000000_add_custom_unit_price_to_inventory_transactions.sql</files>
  <action>
    1. Buat migrasi SQL:
       ```sql
       ALTER TABLE public.inventory_transactions 
       ADD COLUMN IF NOT EXISTS custom_unit_price numeric DEFAULT NULL;
       ```
    2. Pastikan RLS policy tabel inventory_transactions mengizinkan operasi UPDATE dan DELETE untuk role 'petugas_gudang', 'admin', dan 'owner'.
  </action>
  <verify>Jalankan migrasi di Supabase dan pastikan kolom custom_unit_price terbuat dengan benar.</verify>
  <done>Database siap menampung harga kustom per transaksi SPK.</done>
</task>

<task type="auto">
  <name>Implementasi Checkbox Seleksi, Revert Stock saat Delete, dan Modal Edit Harga</name>
  <files>src/pages/WarehouseDashboard.tsx, src/components/RecentMaterialIssues.tsx, src/services/inventoryService.ts</files>
  <action>
    1. Perbarui komponen daftar "Recent Material Issues":
       - Tambahkan kolom Checkbox di paling kiri setiap baris transaksi pengeluaran beserta checkbox "Select All" di header.
       - Tambahkan tombol "Hapus Pengeluaran Terpilih ({count})" yang hanya aktif saat ada baris yang dicentang.
       - Tambahkan kolom Aksi dengan tombol "Edit" di setiap baris.
    2. Implementasikan fungsi Revert Stock & Delete di inventoryService:
       - Saat menghapus transaksi, jalankan transaksi atomik atau batch:
         `UPDATE materials SET current_stock = current_stock + qty WHERE id = material_id;`
         `DELETE FROM inventory_transactions WHERE id IN (selected_ids);`
       - Beri notifikasi toast sukses dan refresh daftar riwayat pengeluaran serta stok gudang.
    3. Buat Modal Edit Transaksi Pengeluaran:
       - Input: `custom_unit_price` (Rp) dan jumlah pengeluaran.
       - Jika kuantitas berubah, sesuaikan selisihnya ke `materials.current_stock`.
       - Simpan pembaruan ke `inventory_transactions`.
    4. Pastikan query penagihan Kasir membaca `COALESCE(it.custom_unit_price, m.unit_price)` saat menghitung total biaya aktual material.
  </action>
  <verify>Jalankan oxlint / npm run build, buka /warehouse, centang transaksi di Recent Material Issues, hapus dan pastikan stok di tabel materials bertambah kembali sesuai jumlah yang dihapus; coba edit harga dan pastikan harga baru tersimpan.</verify>
  <done>Petugas gudang dapat membatalkan pengeluaran barang yang salah serta menyesuaikan harga material per SPK.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Checkbox seleksi massal muncul di tabel Recent Material Issues.
- [ ] Pembatalan transaksi mengembalikan angka stok fisik material secara otomatis.
- [ ] Modal edit harga berfungsi menyimpan harga kustom untuk SPK terkait tanpa mengubah harga master.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
