---
phase: 68
plan: fix-void-material-issue-rollback-to-mandor-requests
wave: 1
gap_closure: true
---

# Fix: Void Recent Material Issue Mengembalikan Permintaan ke Tab Mandor Requests dan Menyesuaikan Stok Material di /warehouse

## Problem
1. Transaksi pengeluaran barang yang di-void berisiko terhapus permanen dari basis data tanpa memulihkan status permintaan asal pada `material_requisitions`.
2. Mandor dan Petugas Gudang kehilangan jejak permintaan tersebut sehingga tidak bisa melakukan approval ulang jika pembatalan terjadi akibat ketidaksengajaan.
3. Konfirmasi void belum terstandarisasi sepenuhnya menggunakan dialog internal `ConfirmationModal` dengan teks kepastian pemulihan stok dan antrean permintaan.
4. Data antrean dan counter badge pada tab "Mandor Requests" tidak tersinkronisasi secara langsung saat transaksi di-void di tabel "Recent Material Issues".

## Root Cause
1. Logika `deleteIssuesAndRevertStock` pada `inventoryService.ts` sebelumnya hanya mengembalikan `current_stock` dan menghapus transaksi dari `inventory_transactions`, tanpa mengembalikan status `material_requisitions` dan `material_requisition_items` ke `PENDING`.
2. Belum ada fungsi database RPC terpadu (`void_material_issue`) yang membungkus pengembalian stok fisik, pengembalian status requisition ke `PENDING`, dan pembatalan transaksi aktif dalam satu transaksi atomik.
3. Tabel `inventory_transactions` belum menyimpan relasi `requisition_id` dan `requisition_item_id` saat approval di `RequisitionApproval.tsx`.
4. Komponen `RecentMaterialIssues.tsx` belum mengoper callback sukses ke `WarehouseDashboard.tsx` untuk me-refresh antrean dan badge counter "Mandor Requests".

## Tasks

<task type="auto">
  <name>Task 1: Penyiapan Berkas Migrasi SQL (RPC & DDL Rollback)</name>
  <files>supabase/migrations/20261014_void_material_issue_rollback.sql</files>
  <action>
    - Tambahkan kolom relasi `requisition_id`, `requisition_item_id`, dan `status` pada tabel `public.inventory_transactions`.
    - Tambahkan kolom `status` pada tabel `public.material_requisition_items`.
    - Buat fungsi database RPC `public.void_material_issue(p_issue_id UUID)` yang:
      * Mengambil transaksi issue dan memvalidasi keberadaan data.
      * Mengembalikan stok fisik pada tabel `materials` (`current_stock = current_stock + qty`).
      * Mencari relasi requisition terkait (langsung via kolom relasi maupun fallback SPK + material aktif).
      * Mengubah status item dan header pada `material_requisitions` kembali ke `PENDING`.
      * Menghapus baris transaksi aktif pada `inventory_transactions`.
    - Buat fungsi RPC batch `public.void_material_issues(p_issue_ids UUID[])`.
    - Berikan izin eksekusi (`GRANT EXECUTE`) kedua fungsi RPC kepada peran `authenticated`.
  </action>
  <verify>Berkas migrasi SQL siap dieksekusi secara manual oleh pengguna di Supabase SQL Editor.</verify>
  <done>Berkas supabase/migrations/20261014_void_material_issue_rollback.sql berhasil dibuat.</done>
</task>

<task type="auto">
  <name>Task 2: Integrasi Handler & Fallback pada inventoryService.ts</name>
  <files>src/services/inventoryService.ts</files>
  <action>
    - Perbarui method `deleteIssuesAndRevertStock`:
      * Panggil RPC `void_material_issues` atau `void_material_issue`.
      * Sediakan mekanisme fallback mutasi Supabase client-side yang mengembalikan stok `materials`, mengubah status `material_requisitions` dan `material_requisition_items` ke `PENDING`, serta menghapus transaksi issue dari `inventory_transactions` secara aman jika RPC belum dieksekusi di database.
  </action>
  <verify>Void transaksi memicu RPC dan fallback dengan benar mengembalikan stok serta status PENDING permintaan.</verify>
  <done>Integrasi inventoryService.ts selesai.</done>
</task>

<task type="auto">
  <name>Task 3: Standarisasi UI ConfirmationModal & Aksi Void di RecentMaterialIssues.tsx</name>
  <files>src/components/RecentMaterialIssues.tsx</files>
  <action>
    - Hubungkan tombol "Void X Transaksi" dengan `ConfirmationModal`:
      * Judul: "Konfirmasi Void Pengeluaran Material"
      * Pesan: "Apakah Anda yakin ingin membatalkan pengeluaran material ini? Stok akan dikembalikan dan item ini akan muncul kembali di tab Permintaan Mandor untuk diapprove ulang."
      * Tombol: "Ya, Void Transaksi" (`variant: 'danger'`) dan "Batal".
    - Tambahkan tombol pintas void per baris (ikon Trash) di kolom Aksi tabel Recent Material Issues.
    - Tambahkan props `onSuccess?: () => void` dan panggil setelah void berhasil dieksekusi.
    - Tampilkan notifikasi feedback modal sukses informatif.
  </action>
  <verify>Dialog konfirmasi custom muncul dengan teks sesuai spesifikasi dan tidak menggunakan dialog browser.</verify>
  <done>Komponen RecentMaterialIssues.tsx terbarui dan terintegrasi.</done>
</task>

<task type="auto">
  <name>Task 4: Sinkronisasi Tab Mandor Requests di WarehouseDashboard.tsx & RequisitionApproval.tsx</name>
  <files>src/pages/WarehouseDashboard.tsx, src/components/RequisitionApproval.tsx</files>
  <action>
    - Di `WarehouseDashboard.tsx`:
      * Tambahkan state dan query `pendingReqCount` untuk menghitung jumlah permintaan mandor berstatus `PENDING`.
      * Tampilkan badge counter peringatan pada tab button "Mandor Requests" jika `pendingReqCount > 0`.
      * Hubungkan callback `onSuccess` dari `RecentMaterialIssues` untuk memicu pembaruan `refreshKey`, `fetchMaterials`, dan `fetchPendingReqCount`.
      * Teruskan `refreshKey` ke komponen `RequisitionApproval`.
    - Di `RequisitionApproval.tsx`:
      * Dengarkan perubahan `refreshKey` pada `useEffect` agar antrean permintaan mandor langsung me-refresh otomatis saat ada issue yang di-void.
      * Saat approve: simpan relasi `requisition_id` dan `requisition_item_id` pada transaksi inventaris, serta kurangi stok fisik `materials` agar siklus stok tetap seimbang.
  </action>
  <verify>Setelah void, counter pada tab Mandor Requests langsung bertambah dan item permintaan langsung muncul kembali di antrean approval.</verify>
  <done>Sinkronisasi dashboard gudang dan approval mandor selesai.</done>
</task>
