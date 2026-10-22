---
phase: 76
plan: fix-requisition-reject-hold-return-to-rab
wave: 1
gap_closure: true
---

# Gap Closure: Perbaikan Bug Requisition Reject/Hold: Otomatis Mengembalikan Material yang Ditolak Gudang ke Panel "Alokasi RAB" di /mandor

## Problem
1. Pada halaman `/warehouse` (tab Mandor Requests, kartu Pending Requisitions), ketika petugas gudang menolak item material dengan tombol "✕ Tolak / Hold", item tersebut memang hilang dari antrean pending gudang.
2. Namun di halaman `/mandor` pada modal "Minta Material (Requisition)", material yang ditolak tersebut masih tersangkut di Kotak Kiri ("Daftar Permintaan Material") dan TIDAK kembali ke Kotak Kanan ("Alokasi RAB (WBS Terkait)").
3. Akibatnya, mandor tidak mengetahui status penolakan barang tersebut dan tidak bisa mengajukannya kembali karena kuota item di Kotak Kanan terkunci hilang dari daftar.

## Root Cause
1. Query hydration di `MaterialRequisitionForm.tsx` tidak menyertakan kolom `status` pada relasi `material_requisition_items`, dan menggunakan fallback `status: req.status || 'PENDING'`. Karena tiket induk berstatus `PARTIALLY_ISSUED`, item yang ditolak tetap dianggap aktif.
2. Filter pengecualian Kotak Kanan `persistedSourceIds` didasarkan pada seluruh item di `persistedItems` tanpa menyaring item berstatus `REJECTED` atau `CANCELLED`.
3. Fungsi `isRabItemAllocated` di `src/utils/rabItemAllocation.ts` tidak memeriksa status `subItem.status`, sehingga item yang ditolak di requisition tetap ditandai sebagai `allocated`.
4. RPC database penolakan item belum mencakup parameter alasan penolakan (`p_reason`) dan penyesuaian status header otomatis ke `'REJECTED'` jika seluruh item ditolak.

## Tasks

<task type="auto">
  <name>Task 1: Perbaiki Handler Reject/Hold di Warehouse dan Buat RPC Rejection Bersih</name>
  <files>supabase/migrations/20261022020000_handle_reject_requisition_item.sql, src/components/RequisitionApproval.tsx</files>
  <action>
    - Buat skrip migrasi `supabase/migrations/20261022020000_handle_reject_requisition_item.sql` yang mendefinisikan RPC `reject_single_requisition_item(p_requisition_item_id, p_rejected_by, p_reason)`.
    - Evaluasi header requisition: jika seluruh item REJECTED, ubah status menjadi 'REJECTED'; jika sisa pending 0 dan ada yang APPROVED, ubah menjadi 'COMPLETED'; jika masih ada sisa pending, ubah menjadi 'PARTIALLY_ISSUED'.
    - Hubungkan tombol "✕ Tolak / Hold" di `RequisitionApproval.tsx` untuk menyertakan `p_reason: rejectNotes` dan perbarui fallback reaktif.
  </action>
  <verify>Tombol Tolak / Hold mengubah status item menjadi REJECTED dan memperbarui antrean gudang.</verify>
  <done>Logika penolakan item di warehouse telah tersimpan dengan status REJECTED yang valid dan disinkronkan ke dokumen induk.</done>
</task>

<task type="auto">
  <name>Task 2: Sinkronisasi Filter Requisition dan Alokasi RAB di Modal Minta Material Mandor</name>
  <files>src/components/MaterialRequisitionForm.tsx, src/utils/rabItemAllocation.ts, src/components/WbsChecklist.tsx, src/components/SpkBoronganPanel.tsx</files>
  <action>
    - Perbaiki query hydration di `MaterialRequisitionForm.tsx` untuk menyeleksi kolom `status` pada `material_requisition_items`.
    - Filter Kotak Kiri ("Daftar Permintaan Material"): lewati item berstatus `REJECTED` atau `CANCELLED` agar tidak dimasukkan ke `persistedItems`.
    - Filter Kotak Kanan ("Alokasi RAB WBS Terkait"): item yang di-Reject tidak masuk ke `persistedSourceIds` sehingga otomatis kembali tersedia di daftar item yang bisa diminta mandor.
    - Perbarui `isRabItemAllocated` di `src/utils/rabItemAllocation.ts` untuk memeriksa `subItem.status !== 'REJECTED' && subItem.status !== 'CANCELLED'`.
    - Tambahkan seleksi kolom `status` pada query `WbsChecklist.tsx` dan `SpkBoronganPanel.tsx`.
    - Counter badge jumlah item di header kotak kiri (`selectedItems.length`) dan kotak kanan (`availableItems.length`) terbarui secara reaktif.
  </action>
  <verify>Buka /mandor pada WBS terkait: pastikan barang yang ditolak gudang telah keluar dari kotak kiri dan kembali tampil di kotak kanan.</verify>
  <done>Material yang ditolak gudang langsung pulih dan siap diajukan kembali oleh mandor.</done>
</task>
