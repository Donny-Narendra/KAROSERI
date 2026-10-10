---
phase: 37
plan: warehouse-quick-restock-audit
wave: 1
gap_closure: true
---

# Fix: Restocking Cepat Material Inventory dengan Pencatatan Audit Log di /warehouse

## Problem
Petugas gudang (warehouse) membutuhkan fitur restocking praktis untuk menambahkan stok barang beserta catatan (audit log) yang terhubung langsung pada ID pengguna mereka, namun saat ini fungsi ini belum terintegrasi di halaman /warehouse.

## Root Cause
- Skema audit log belum mengizinkan aksi `RESTOCK` dan role gudang belum diberikan izin RLS.
- Antarmuka restocking belum tersedia di komponen manajemen gudang.

## Tasks

<task type="auto">
  <name>Update Skema Audit Log & RLS</name>
  <files>supabase/migrations/</files>
  <action>Buat file migrasi baru (misal `20261010093000_update_inventory_audit_logs.sql`) untuk menghapus dan memperbarui (recreate) CONSTRAINT `action_type` pada tabel `inventory_audit_logs` agar memperbolehkan `'RESTOCK'`. Tambahkan juga policy RLS untuk tabel tersebut yang mengizinkan role `petugas_gudang` untuk `SELECT` dan `INSERT` log audit.</action>
  <verify>Migrasi berhasil dibuat tanpa error syntax SQL dan role `petugas_gudang` ditambahkan pada RLS.</verify>
</task>

<task type="auto">
  <name>Service Mutasi Restock</name>
  <files>src/services/inventoryService.ts</files>
  <action>Buat fungsi mutasi stok `restockMaterial(materialId, quantity, notes)` yang melakukan update penambahan ke tabel `materials` (`current_stock = current_stock + quantity`) dan menyimpan log ke `inventory_audit_logs` (action_type: 'RESTOCK'). Pastikan user id diambil dari session autentikasi aktif.</action>
  <verify>Fungsi `restockMaterial` lolos TypeScript check.</verify>
</task>

<task type="auto">
  <name>UI Restock Modal & Log View di /warehouse</name>
  <files>src/components/InventoryManager.tsx, src/components/MaterialAutocomplete.tsx</files>
  <action>Tambahkan tombol aksi "Restock / Tambah Stok Masuk" di toolbar atas tabel inventory (pada `InventoryManager.tsx`). Buat modal Restock Material dengan input pencarian material (menggunakan atau mengadopsi `MaterialAutocomplete`), readonly stok saat ini, input jumlah penambahan, dan catatan opsional. Sertakan juga cara untuk melihat log.</action>
  <verify>UI modal berhasil dirender, interaktif, dan lolos kompilasi TS.</verify>
</task>

<task type="auto">
  <name>Verifikasi dan Type Checking</name>
  <files>package.json</files>
  <action>Jalankan `npm run build` dan `npx oxlint` untuk mengecek error.</action>
  <verify>Tidak ada error pada type checking dan linter.</verify>
</task>
