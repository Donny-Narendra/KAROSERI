---
phase: 15
plan: fix-bom-access
wave: 1
gap_closure: true
---

# Fix: Perluasan Akses Modul Paket Barang Jadi (BOM) ke Role Owner dan Service Advisor

## Problem
Modul "Paket Barang Jadi (BOM)" (`src/components/PackageManager.tsx`) saat ini baru terpasang di Dashboard Petugas Gudang (`/warehouse`). Namun owner dan service advisor juga memerlukannya.

## Root Cause
Awalnya fitur hanya dibuat untuk role petugas_gudang.

## Tasks

<task type="auto">
  <name>Perbarui RLS policy paket BOM dan pasang PackageManager pada Owner dan Advisor Dashboard</name>
  <files>supabase/migrations/20261005010000_extend_package_bom_rbac.sql, src/pages/OwnerDashboard.tsx, src/pages/AdvisorDashboard.tsx, src/components/PackageManager.tsx</files>
  <action>
    1. Buat file migrasi SQL `supabase/migrations/20261005010000_extend_package_bom_rbac.sql`:
       - Berikan izin penuh pada `product_packages` dan `package_items` untuk authenticated users dengan role in ('owner', 'service_advisor', 'petugas_gudang').
    2. Di `src/pages/OwnerDashboard.tsx`:
       - Tambahkan tab navigasi "Paket Produk (BOM)".
       - Render komponen `<PackageManager />` di tab tersebut.
    3. Di `src/pages/AdvisorDashboard.tsx`:
       - Tambahkan tab navigasi "Katalog Paket (BOM)".
       - Render komponen `<PackageManager />` di tab tersebut.
    4. Pastikan komponen `PackageManager.tsx` fleksibel menerima role props jika ada batasan tertentu (atau terbuka penuh untuk ketiga role tersebut).
  </action>
  <verify>Jalankan oxlint / npm run build, login berturut-turut sebagai Owner dan Service Advisor, buka tab Paket Produk / Katalog Paket, pastikan daftar paket dan tombol "Buat Paket Baru" dapat diakses serta berfungsi normal.</verify>
  <done>Role Owner dan Service Advisor dapat membuat dan mengelola paket barang jadi untuk inovasi produk bengkel.</done>
</task>
