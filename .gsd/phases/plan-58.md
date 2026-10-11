---
phase: 58
plan: fix-replace-native-confirm-with-custom-modal-warehouse
wave: 1
gap_closure: true
---

# Fix: Mengganti Seluruh Dialog Konfirmasi Native Peramban Menjadi Modal Custom di Halaman /warehouse

## Problem
Pada halaman `/warehouse` (Petugas Gudang / Logistik), aksi-aksi destruktif dan pembatalan (seperti penolakan atau persetujuan pengeluaran barang / Goods Issue pada RequisitionApproval, pembatalan/void pengeluaran material pada RecentMaterialIssues, notifikasi pada GoodsIssueForm dan GoodsReturnForm, serta dialog konfirmasi hapus master material dan paket) masih menggunakan dialog bawaan browser (`window.confirm()` atau `window.alert()`) atau dialog inline non-standar.
Jika pengguna mencentang opsi peramban "Prevent this page from creating additional dialogs", browser akan memblokir dialog konfirmasi seterusnya sehingga aksi operasional logistik gudang terhenti total.

## Root Cause
1. Pemanggilan native `window.confirm()` dan `window.alert()` pada `RequisitionApproval.tsx` untuk alur persetujuan dan penolakan permintaan material mandor.
2. Pemanggilan native `confirm()` dan `alert()` pada `RecentMaterialIssues.tsx` untuk validasi status SPK, pembatalan (void) riwayat pengeluaran barang, dan notifikasi error.
3. Pemanggilan `alert()` pada `GoodsIssueForm.tsx` dan `GoodsReturnForm.tsx` untuk guardrail pencegahan double issue dan status mutasi stok.
4. Komponen `InventoryManager.tsx` dan `PackageManager.tsx` masih menggunakan dialog modal delete inline terpisah yang belum terstandarisasi dengan `ConfirmationModal.tsx`.

## Tasks

<task type="auto">
  <name>Task 1: Refactor RequisitionApproval ke ConfirmationModal</name>
  <files>src/components/RequisitionApproval.tsx</files>
  <action>
    - Ganti `window.confirm` saat Approve dan Reject dengan state-driven `ConfirmationModal`.
    - Ganti `window.alert` untuk status keberhasilan maupun kegagalan mutasi dengan `ConfirmationModal` (variant: 'success' | 'danger' | 'info' dengan `hideCancel: true`).
    - Pastikan eksekusi mutasi Supabase hanya berjalan setelah konfirmasi di modal diklik.
  </action>
  <verify>Tidak ada pemanggilan window.confirm atau alert di RequisitionApproval.tsx.</verify>
  <done>RequisitionApproval sepenuhnya menggunakan ConfirmationModal.</done>
</task>

<task type="auto">
  <name>Task 2: Refactor RecentMaterialIssues ke ConfirmationModal</name>
  <files>src/components/RecentMaterialIssues.tsx</files>
  <action>
    - Ganti `confirm(...)` saat void pengeluaran material dengan `ConfirmationModal` (variant: 'danger', confirmText: 'Ya, Void Transaksi').
    - Ganti `alert(...)` saat validasi SPK COMPLETED atau kegagalan transaksi dengan modal feedback custom (`hideCancel: true`).
  </action>
  <verify>Tidak ada pemanggilan confirm atau alert di RecentMaterialIssues.tsx.</verify>
  <done>RecentMaterialIssues sepenuhnya menggunakan ConfirmationModal.</done>
</task>

<task type="auto">
  <name>Task 3: Refactor GoodsIssueForm dan GoodsReturnForm ke ConfirmationModal</name>
  <files>src/components/GoodsIssueForm.tsx, src/components/GoodsReturnForm.tsx</files>
  <action>
    - Ganti seluruh `alert(...)` di GoodsIssueForm (guardrail double issuance, sukses keluar, gagal keluar) dengan modal notifikasi custom.
    - Ganti seluruh `alert(...)` di GoodsReturnForm (sukses retur, gagal retur) dengan modal notifikasi custom.
  </action>
  <verify>Tidak ada alert di GoodsIssueForm.tsx dan GoodsReturnForm.tsx.</verify>
  <done>GoodsIssueForm dan GoodsReturnForm menggunakan ConfirmationModal.</done>
</task>

<task type="auto">
  <name>Task 4: Standarisasi Dialog Hapus di InventoryManager dan PackageManager</name>
  <files>src/components/InventoryManager.tsx, src/components/PackageManager.tsx</files>
  <action>
    - Ganti modal hapus inline tunggal dan modal bulk delete di `InventoryManager.tsx` dengan komponen `ConfirmationModal`.
    - Ganti modal hapus paket inline di `PackageManager.tsx` dengan komponen `ConfirmationModal`.
  </action>
  <verify>Kedua komponen menggunakan ConfirmationModal terstandarisasi.</verify>
  <done>Manajemen Inventaris dan Paket konsisten menggunakan ConfirmationModal.</done>
</task>
