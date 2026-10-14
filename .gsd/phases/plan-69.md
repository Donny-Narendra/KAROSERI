---
phase: 69
plan: fix-spk-filter-mandor-requests-warehouse
wave: 1
gap_closure: true
---

# Fix: Menambahkan Filter Pemilihan SPK pada Tab "Mandor Requests" (Pending Requisitions) di /warehouse

## Problem
1. Pada halaman `/warehouse` tab "Mandor Requests", seluruh permintaan material (Pending Requisitions) dari seluruh SPK aktif ditampilkan bertumpuk dalam satu daftar panjang tanpa pemisah.
2. Ketika jumlah permintaan menumpuk (misal: belasan antrean permintaan), petugas gudang mengalami kesulitan dan kewalahan memprioritaskan serta mengelompokkan pengeluaran barang per unit kendaraan.
3. Petugas gudang memerlukan kontrol filter cepat untuk menyaring permintaan berdasarkan nomor SPK tertentu atau menampilkan semua permintaan secara fleksibel.

## Root Cause
1. Komponen `RequisitionApproval.tsx` sebelumnya me-render langsung seluruh array `requisitions` hasil fetch database tanpa menyediakan state pemilihan SPK maupun kontrol UI filter.
2. Belum ada pengelompokan ringkasan (summary) per nomor SPK beserta jumlah item pending masing-masing SPK.
3. Belum ada indeks komposit pada database Supabase (`material_requisitions` dan `material_requisition_items`) untuk mengoptimalkan performa filtering berdasarkan status dan SPK saat beban data meningkat.

## Tasks

<task type="auto">
  <name>Task 1: Penyiapan Berkas Migrasi Indeks Database SQL</name>
  <files>supabase/migrations/20261014_add_requisition_filter_indexes.sql</files>
  <action>
    - Buat skrip migrasi SQL penambahan indeks komposit:
      * `idx_material_requisitions_spk_status` pada `public.material_requisitions(spk_id, status)`.
      * `idx_material_requisition_items_req_status` pada `public.material_requisition_items(requisition_id, status)`.
    - Simpan ke `supabase/migrations/20261014_add_requisition_filter_indexes.sql` untuk dieksekusi manual oleh pengguna di SQL Editor Supabase.
  </action>
  <verify>Berkas migrasi SQL siap dieksekusi tanpa eror di Supabase SQL Editor.</verify>
  <done>Berkas supabase/migrations/20261014_add_requisition_filter_indexes.sql berhasil dibuat.</done>
</task>

<task type="auto">
  <name>Task 2: Implementasi State & Filter Pills di RequisitionApproval.tsx</name>
  <files>src/components/RequisitionApproval.tsx</files>
  <action>
    - Tambahkan state `selectedSpkFilter: string` dengan nilai default `'ALL'`.
    - Ekstrak daftar unik SPK aktif beserta jumlah permintaan per SPK menggunakan `useMemo` (`spkSummary`).
    - Buat daftar permintaan tersaring menggunakan `useMemo` (`filteredRequisitions`).
    - Tambahkan kontrol UI filter pills horizontal di baris header panel "Pending Requisitions (Mandor)" dengan styling dark industrial RobelKaroseri:
      * Tombol filter aktif: `bg-primary text-white font-bold shadow-sm`.
      * Tombol filter tidak aktif: `bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-active`.
      * Opsi 1: `Semua SPK (${totalCount})`.
      * Opsi 2..N: `${spkNumber} (${countPerSpk})`.
    - Buat fallback pesan ramah jika SPK yang dipilih tidak memiliki permintaan pending:
      * "Tidak ada permintaan pending untuk SPK ${selectedSpkFilter}." beserta tombol cepat "Tampilkan Semua SPK".
    - Render `filteredRequisitions` pada daftar kartu permintaan.
  </action>
  <verify>Filter pills muncul di header, responsif, dan menyaring daftar antrean kartu permintaan sesuai nomor SPK yang dipilih.</verify>
  <done>Integrasi kontrol filter SPK pada RequisitionApproval.tsx selesai dan berfungsi optimal.</done>
</task>
