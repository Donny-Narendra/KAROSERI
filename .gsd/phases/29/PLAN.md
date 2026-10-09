---
phase: 29
plan: fix-kasir-billing-paket-bom
wave: 1
gap_closure: true
---

# Fix: Perbaikan Kalkulasi Total Harga Jual Paket BOM pada Kasir

## Problem
Pada halaman `/kasir` (Billing) SPK-5902, "Paket Assembly List" masih menampilkan Rp 0,00 dan "Total Harga Jual" jatuh ke nilai fallback HPP (Rp 583.100,00). Nilai seharusnya adalah Rp 1.000.000,00 yang berasal dari kolom `product_packages.selling_price`.

## Root Cause
Terdapat masalah dalam data fetching relasi Supabase untuk menarik harga jual dari `product_packages` melalui `rab_items`, dan mekanisme fallback/kalkulasi di komponen Kasir/Billing yang mengabaikan `selling_price` dari paket BOM.

## Tasks

<task type="auto">
  <name>Fix kasir billing calculation for packages</name>
  <files>src/pages/Kasir/*.tsx, src/services/billingService.ts, src/services/spkService.ts, supabase/migrations/*.sql</files>
  <action>
1. Audit Data Fetching & Query Supabase:
   - Telusuri query/service pengambilan data SPK di halaman `/kasir` (misal di `src/pages/Kasir/` atau `src/services/billingService.ts` / `spkService.ts`).
   - Pastikan query menarik relasi nested:
     `rab_estimations(rab_items(package_id, product_packages(id, name, selling_price)))`
     serta `spk_amendments(cost_adjustment, status)`.
2. Validasi Penyimpanan Data (Data Linkage):
   - Periksa saat SPK menyertakan Paket Barang Jadi: pastikan `rab_items.package_id` terisi dengan ID dari `product_packages`.
3. Logika Kalkulasi (Unique Package Summation):
   - Karena satu paket memiliki banyak item di `rab_items`, ekstrak daftar `package_id` unik agar `selling_price` tidak terhitung ganda:
     `totalPackageSellingPrice = sum(unique product_packages.selling_price)`
   - Hitung item di luar paket (extra item): `rab_items` di mana `package_id IS NULL`.
   - Hitung penyesuaian harga / Change Order dari `spk_amendments` yang berstatus `'APPROVED'`.
   - Formula Total Harga Jual:
     `Total Tagihan = totalPackageSellingPrice + extraItemCost + totalApprovedAmendments + manualAdjustment`
   - Hapus mekanisme fallback yang menampilkan `actual_cost` atau `total_estimated_cost` sebagai `Total Harga Jual` jika paket terdeteksi bernilai Rp 0.
4. Tampilan UI Kasir:
   - "Paket Assembly List" harus menampilkan hasil penjumlahan `selling_price` paket (Rp 1.000.000,00 untuk DUDUKAN SLEBOR).
   - Kartu SPK di sebelah kiri ("Harga Jual (Quotation)") dan kartu kanan ("Total Harga Jual") harus selaras menampilkan nominal hasil perhitungan di atas.
5. Verifikasi & Type Checking:
   - Jalankan `npm run build` dan `npx oxlint` untuk memastikan tidak ada type error.
   - Buat commit atomik: `fix(billing): link product_packages selling_price through rab_items to calculate customer billing`.
  </action>
  <verify>Halaman kasir menampilkan Total Harga Jual yang sesuai dengan akumulasi product_packages.selling_price ditambah item tambahan dan amandemen, serta tidak lagi menggunakan fallback ke HPP ketika paket bernilai 0.</verify>
  <done>Mekanisme fallback terhapus, kalkulasi mengandalkan selling_price paket BOM dari Supabase dan type checks lulus.</done>
</task>
