---
phase: 74
plan: fix-stock-snapshot-audit-fallback-zero-warehouse
wave: 1
gap_closure: true
---

# Gap Closure: Bugfix Logika: Perbaikan Nilai "Sebelum" dan "Sisa Stok" Menjadi 0 pada Widget "Riwayat Approval & Stok" di /warehouse

## Problem
1. Pada widget panel kanan "Riwayat Approval & Stok" di `/warehouse`, kartu riwayat transaksi lama (misal: "MATA GERINDA POTONG") menampilkan:
   SEBELUM: 0, DISETUJUI: -3, SISA STOK: 0.
2. Padahal stok aktual material tersebut pada tabel inventaris gudang tercatat masih ada (misal: 20 PCS).
3. Hal ini terjadi karena saat migrasi penambahan kolom dijalankan (`ADD COLUMN ... DEFAULT 0`), baris transaksi lama diisi dengan default `0`. Logika rendering sebelumnya menganggap `0` sebagai snapshot valid (`0 !== null`), sehingga mengabaikan perhitungan dinamis berdasarkan `materials.current_stock`.
4. Selain itu, form pengeluaran langsung (`GoodsIssueForm.tsx`) sebelumnya belum menyertakan `stock_before` dan `stock_after` pada saat insert ke tabel transaksi inventaris.

## Root Cause
1. Logika pemetaan di `RecentApprovedMaterials.tsx` hanya memeriksa `tx.stock_after !== null && tx.stock_after !== undefined`, tanpa mendeteksi apakah kedua nilai tersebut bernilai dummy `0` akibat `DEFAULT 0` migrasi database.
2. `GoodsIssueForm.tsx` belum mencatat snapshot `stock_before` dan `stock_after` sebelum mengurangi stok fisik di tabel `materials`.

## Tasks

<task type="auto">
  <name>Task 1: Perbaikan Fallback Cerdas di RecentApprovedMaterials.tsx</name>
  <files>src/components/RecentApprovedMaterials.tsx</files>
  <action>
    - Ubah logika penentuan `hasValidSnapshot`: jika `stock_before === 0` dan `stock_after === 0` sementara `current_stock > 0` atau `qty > 0`, sistem mengenali data tersebut sebagai transaksi lama tanpa snapshot riil.
    - Terapkan fallback dinamis:
      * `stockAfter = currentMatStock`
      * `stockBefore = currentMatStock + qty`
    - Hanya gunakan nilai riil dari database jika snapshot valid tercatat.
  </action>
  <verify>Kartu riwayat lama (seperti Mata Gerinda Potong) tidak lagi menampilkan angka 0, melainkan angka riil yang konsisten (Sebelum: 23, Disetujui: -3, Sisa Stok: 20).</verify>
  <done>Logika fallback dinamis di RecentApprovedMaterials.tsx selesai diperbaiki.</done>
</task>

<task type="auto">
  <name>Task 2: Penyesuaian Pencatatan Snapshot di GoodsIssueForm.tsx & RequisitionApproval.tsx</name>
  <files>src/components/GoodsIssueForm.tsx, src/components/RequisitionApproval.tsx</files>
  <action>
    - Pada `GoodsIssueForm.tsx`: Ambil stok fisik aktual terbaru dari database sebelum pengurangan, hitung `stockBefore` dan `stockAfter`, simpan ke `inventory_transactions` dengan mekanisme fallback retry, lalu sesuaikan `materials.current_stock`.
    - Pada `RequisitionApproval.tsx`: Pastikan pemetaan `spk_id` menggunakan `requisition.spk?.id || requisition.spk_id` secara defensif.
  </action>
  <verify>Transaksi pengeluaran langsung via GoodsIssueForm kini otomatis mencatat snapshot stok sebelum dan sesudah.</verify>
  <done>Pencatatan snapshot stok di GoodsIssueForm.tsx dan RequisitionApproval.tsx telah diselaraskan.</done>
</task>

<task type="auto">
  <name>Task 3: Pembuatan Skrip Backfill Database SQL</name>
  <files>supabase/migrations/20261014_backfill_stock_audit_snapshot.sql</files>
  <action>
    - Buat skrip migrasi `supabase/migrations/20261014_backfill_stock_audit_snapshot.sql`.
    - Lakukan update kalkulasi rekonsiliasi pada baris lama di `inventory_transactions` di mana `stock_before = 0` dan `stock_after = 0`.
  </action>
  <verify>Skrip SQL tersimpan di direktori migrasi dan siap dieksekusi secara manual oleh pengguna di SQL Editor Supabase.</verify>
  <done>Berkas migrasi backfill database berhasil dibuat.</done>
</task>
