---
phase: 73
plan: refactor-right-panel-recent-approved-materials-stock-audit
wave: 1
gap_closure: true
---

# Gap Closure: Refactor UI Panel Kanan: Mengganti Widget "Low Stock Warnings" Menjadi "Riwayat Approval & Dampak Stok" di Halaman /warehouse

## Problem
1. Pada kolom samping kanan halaman `/warehouse` (tepat di bawah widget "Filter Berdasarkan SPK"), sebelumnya diisi oleh widget statis "Low Stock Warnings" yang kurang memberikan konteks operasional real-time bagi petugas gudang saat memproses persetujuan material mandor.
2. Petugas gudang memerlukan visibilitas langsung terhadap dampak persetujuan pengeluaran barang terhadap saldo fisik material di gudang (Audit Pergerakan Stok: Stok Sebelum, Kuantitas yang Disetujui/Dikeluarkan, dan Sisa Stok Fisik).
3. Data audit tersebut harus terupdate secara real-time tepat setelah petugas menekan tombol "Approve" pada kartu permintaan material ("Pending Requisitions (Mandor)").

## Root Cause
1. Kolom kanan belum memiliki komponen pemantauan riwayat approval material dan dampak pergerakan stok.
2. Handler approval di `RequisitionApproval.tsx` sebelumnya hanya mengurangi stok di database tanpa mencatat snapshot `stock_before` dan `stock_after` pada transaksi inventaris maupun menyalurkan data snapshot tersebut ke state dashboard.
3. Database belum memiliki kolom snapshot `stock_before` dan `stock_after` pada tabel `inventory_transactions`.

## Tasks

<task type="auto">
  <name>Task 1: Pembuatan Skrip Migrasi SQL Snapshot Stok</name>
  <files>supabase/migrations/20261014_add_stock_audit_snapshot.sql</files>
  <action>
    - Buat skrip migrasi SQL `supabase/migrations/20261014_add_stock_audit_snapshot.sql`.
    - Tambahkan kolom `stock_before NUMERIC DEFAULT 0` dan `stock_after NUMERIC DEFAULT 0` ke tabel `public.inventory_transactions` dan `public.goods_issues` secara idempotent menggunakan blok `DO $$ BEGIN ... END $$;`.
    - Tambahkan indeks komposit `idx_inventory_transactions_recent_audit` pada `(issued_at DESC)` untuk optimasi kueri riwayat audit terbaru.
  </action>
  <verify>Skrip migrasi SQL tersimpan di berkas supabase/migrations/ dan siap dieksekusi secara manual oleh pengguna di SQL Editor Supabase.</verify>
  <done>Berkas migrasi supabase/migrations/20261014_add_stock_audit_snapshot.sql berhasil dibuat.</done>
</task>

<task type="auto">
  <name>Task 2: Penyiapan Snapshot Stok pada Handler Approval di RequisitionApproval.tsx</name>
  <files>src/components/RequisitionApproval.tsx</files>
  <action>
    - Perbarui handler approval `executeConfirmedAction` saat `type === 'APPROVE'`.
    - Ambil nilai `stock_before` dari stok material saat ini (`materials.current_stock`).
    - Hitung `stock_after = Math.max(0, stock_before - requested_qty)`.
    - Perbarui `materials.current_stock` dan sertakan `stock_before` serta `stock_after` pada payload `inventory_transactions`.
    - Sediakan mekanisme defensive retry jika migrasi database belum dieksekusi agar proses approval tetap berjalan normal.
    - Kirimkan data audit snapshot ke parent melalui callback `onApprovalRecorded?.(recordedAudits)`.
  </action>
  <verify>Handler approval mencatat snapshot sebelum dan sesudah secara akurat dan menyalurkannya via callback.</verify>
  <done>Logika pencatatan snapshot stok dan callback onApprovalRecorded berhasil diintegrasikan di RequisitionApproval.tsx.</done>
</task>

<task type="auto">
  <name>Task 3: Pembuatan Komponen RecentApprovedMaterials.tsx & Integrasi di WarehouseDashboard.tsx</name>
  <files>src/components/RecentApprovedMaterials.tsx, src/pages/WarehouseDashboard.tsx</files>
  <action>
    - Buat komponen `RecentApprovedMaterials.tsx`:
      * Header: Ikon `PackageCheck`, Judul "Riwayat Approval & Stok", Badge jumlah item.
      * Kontainer scrollable vertikal (`max-h-[340px] overflow-y-auto space-y-2.5 p-3.5 scrollbar-thin`).
      * Header Item: Nama material tebal, satuan, dan badge nomor SPK (`SPK-5902`).
      * Grid 3 Kolom Dampak Stok:
        - Sebelum: Nilai stok awal (teks abu-abu netral).
        - Disetujui: Nilai qty keluar (teks merah dengan tanda minus: `-0.4 pcs`).
        - Sisa Stok: Nilai sisa stok akhir setelah approval (teks hijau tebal).
      * Timestamp persetujuan dengan badge highlight berkedip halus ("• Baru Saja Diapprove") untuk item yang baru saja disetujui.
      * Empty state ramah saat belum ada approval baru-baru ini.
    - Pada `WarehouseDashboard.tsx`:
      * Gantikan blok kontainer "Low Stock Warnings" dengan `<RecentApprovedMaterials />`.
      * Kelola state `recentApprovals` dan handler `handleApprovalRecorded` untuk sinkronisasi instan saat tombol Approve diklik.
  </action>
  <verify>Panel kanan menampilkan riwayat approval material dan dampak stok yang terupdate secara real-time dan persisten dari database.</verify>
  <done>Komponen RecentApprovedMaterials berhasil dibuat dan diintegrasikan menggantikan Low Stock Warnings di WarehouseDashboard.tsx.</done>
</task>
