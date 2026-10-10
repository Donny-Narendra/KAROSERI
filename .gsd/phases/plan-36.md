---
phase: 36
plan: service-advisor-inventory-audit
wave: 1
gap_closure: true
---

# Fix: Modul Manajemen Inventory & Audit Log Perubahan di Halaman /service-advisor

## Problem
Service Advisor dan tim manajemen memerlukan akses untuk memantau dan mengelola stok material langsung dari modul Service Advisor. Namun, untuk menjaga integritas data operasional dan mencegah kecurangan, setiap penambahan, pengurangan stok, atau pengubahan harga/data material wajib mencatat jejak audit (waktu pasti dan siapa user yang melakukan perubahan).

## Root Cause
Modul Service Advisor belum memiliki fitur akses manajemen inventaris material beserta log jejak audit untuk setiap perubahannya (stok dan harga).

## Tasks

<task type="auto">
  <name>Skema Database & Audit Logging (Supabase)</name>
  <files>supabase/migrations/</files>
  <action>Buat file migrasi baru (misal `20261010000000_inventory_audit_logs.sql`) untuk membuat tabel `inventory_audit_logs` (id, material_id, action_type, previous_data, new_data, notes, changed_by, created_at). Tambahkan RLS policy untuk tabel tersebut agar `service_advisor` dan `owner` dapat membaca dan menyisipkan log audit.</action>
  <verify>Tabel `inventory_audit_logs` terbentuk dengan RLS yang benar.</verify>
</task>

<task type="auto">
  <name>Service Layer Audit Logging</name>
  <files>src/services/inventoryService.ts</files>
  <action>Buat/update file di `src/services/` dengan helper untuk update inventory material yang sekaligus membungkus mutasi data `materials` dan mencatat insert ke `inventory_audit_logs` (menggunakan RPC atau multiple inserts dalam 1 service call dari client side, dengan user ID dari `auth.user.id`). Sediakan juga fungsi untuk query riwayat audit log material beserta relasi `profiles (full_name, role)`.</action>
  <verify>Fungsi update inventory dan fetch audit logs tersedia untuk digunakan UI tanpa error TypeScript.</verify>
</task>

<task type="auto">
  <name>UI Inventory Tab di Service Advisor</name>
  <files>src/pages/ServiceAdvisorDashboard.tsx, src/components/SAInventoryPanel.tsx</files>
  <action>Tambahkan tab/menu "Inventory" pada halaman Service Advisor. Buat komponen Daftar Material yang menampilkan stok, harga, satuan. Tambahkan tombol aksi "Sesuaikan Stok" dan "Edit Material" dengan modal form terkait yang mewajibkan input "Alasan / Catatan Perubahan". Buat juga komponen Log Riwayat (Audit Trail) untuk menampilkan tabel/timeline log (waktu, nama pengubah, jenis perubahan, catatan).</action>
  <verify>Tab Inventory berjalan, modal form dapat menyimpan perubahan stok/harga dan menyisipkan audit log. Audit trail tertampil benar.</verify>
</task>

<task type="auto">
  <name>Verifikasi dan Type Checking</name>
  <files>package.json</files>
  <action>Jalankan `npm run build` dan `npx oxlint` untuk memastikan tidak ada kesalahan build atau tipe data TypeScript. Perbaiki jika ada error.</action>
  <verify>Build dan linting lulus 100%.</verify>
</task>
