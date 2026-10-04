---
phase: 13
plan: 1
wave: 1
depends_on: []
files_modified: [
  "supabase/migrations/20261005000000_create_packages_bom.sql",
  "src/pages/WarehouseDashboard.tsx",
  "src/components/PackageManager.tsx",
  "src/services/packageService.ts"
]
autonomous: true
user_setup: []
must_haves:
  truths:
    - "Schema database product_packages dan package_items berhasil dimigrasikan"
    - "UI PackageManager dapat menambah, merinci, dan menyimpan BOM"
    - "Total HPP dikalkulasi otomatis dari bahan + jasa"
  artifacts:
    - "Tabel product_packages dan package_items pada Supabase"
    - "Sub-tab Paket Barang Jadi pada WarehouseDashboard"
---

# Plan 13.1: Skema Database & BOM Builder untuk Paket Barang Jadi

<objective>
Mengimplementasikan struktur database dan UI dasar untuk membuat Bill of Materials (BOM) / template resep Paket Barang Jadi.
Purpose: Memungkinkan Gudang dan Admin menjual barang yang terdiri dari gabungan material dan jasa (assembly kits), dengan kalkulasi HPP yang akurat secara real-time.
Output: Tabel Supabase baru, Service API untuk paket, dan antarmuka BOM Builder di dashboard Gudang.
</objective>

<context>
Load for context:
- `src/pages/WarehouseDashboard.tsx`
- `src/services/inventoryService.ts`
- `src/types/database.ts`
</context>

<tasks>

<task type="auto">
  <name>Migrasi skema database tabel product_packages dan package_items</name>
  <files>supabase/migrations/20261005000000_create_packages_bom.sql</files>
  <action>
    Buat tabel `product_packages` (`id`, `name`, `selling_price`, `created_at`) dan `package_items` (`id`, `package_id`, `item_type`, `material_id`, `labor_name`, `quantity`, `cost_per_unit`).
    Tambahkan foreign key ke `product_packages` (ON DELETE CASCADE) dan `materials`.
    Tambahkan RLS policy agar role `petugas_gudang`, `admin`, dan `owner` bisa SELECT, INSERT, UPDATE, DELETE.
    AVOID: Melupakan constraint check pada `item_type` (hanya boleh 'MATERIAL' atau 'LABOR').
  </action>
  <verify>Jalankan migrasi di Supabase dan pastikan tidak ada error PostgreSQL syntax.</verify>
  <done>Relasi tabel terbentuk dengan RLS terkonfigurasi.</done>
</task>

<task type="auto">
  <name>Buat Layanan Service (packageService) dan Tipe Data</name>
  <files>src/services/packageService.ts, src/types/package.ts</files>
  <action>
    Buat definisi interface TypeScript untuk `ProductPackage` dan `PackageItem`.
    Buat class service yang menggunakan client supabase untuk operasi CRUD (getPackages, getPackageItems, createPackageWithItems, updatePackageWithItems, deletePackage).
  </action>
  <verify>Tidak ada error linting pada `packageService.ts`.</verify>
  <done>Logika Supabase terabstraksi di dalam satu service file.</done>
</task>

<task type="auto">
  <name>Buat UI Manajemen Paket Barang Jadi (BOM Builder)</name>
  <files>src/pages/WarehouseDashboard.tsx, src/components/PackageManager.tsx</files>
  <action>
    Tambahkan sub-tab baru "Paket Barang Jadi (BOM)" di `WarehouseDashboard.tsx`.
    Buat `PackageManager.tsx` untuk mengelola daftar paket.
    Sediakan modal *builder* di mana pengguna bisa menambahkan komponen `MATERIAL` (pilih dari dropdown yang me-load dari `inventoryService`) atau `LABOR` (input teks biasa).
    Hitung HPP aktual (Total dari `quantity * cost_per_unit`) dan margin keuntungan.
    AVOID: Menyimpan material_id yang invalid saat item_type = 'LABOR'.
  </action>
  <verify>Jalankan `npm run build` dan pastikan tidak ada error TS/React.</verify>
  <done>Petugas dapat melihat, menambah, merinci komponen BOM, dan menyimpannya.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Migrasi berhasil dijalankan (oleh pengguna/otomatis).
- [ ] UI PackageManager muncul di Warehouse Dashboard.
- [ ] Kalkulasi HPP dan Margin di form builder berjalan reaktif sesuai input qty dan cost.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
