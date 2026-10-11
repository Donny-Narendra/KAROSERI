---
phase: 55
plan: fix-persist-requisition-items-confirmation-removal
wave: 1
gap_closure: true
---

# Fix: Persistensi Daftar Permintaan Material dan Dialog Konfirmasi Pengembalian di Mandor

## Problem
Pada modal "Minta Material (Requisition)" di `/mandor`:
1. Kotak Kiri ("Daftar Permintaan Material") saat ini menjadi kosong setiap kali modal ditutup dan dibuka kembali, sehingga mandor tidak dapat melihat riwayat material apa saja yang sudah diajukan untuk tahapan WBS aktif tersebut.
2. Tombol hapus/kembali (ikon tong sampah atau tombol transfer `>>`) di Kotak Kiri langsung menghapus item tanpa konfirmasi, yang berpotensi memicu pembatalan tidak disengaja terhadap permintaan material yang sudah tercatat.

## Root Cause
1. Data requisition eksisting dari Supabase hanya diekstraksi ID-nya untuk daftar eksklusi `usedRequisitionItemIds`, namun tidak pernah di-hydrate ke dalam state `selectedItems`.
2. Handler `handleMoveBackToAvailable` tidak membedakan antara item lokal sementara dan item yang sudah tersimpan di database (`material_requisition_items`), serta tidak memiliki prompt/dialog konfirmasi pengguna.

## Tasks

<task type="auto">
  <name>Task 1: Hydration Data Permintaan Material Eksisting ke Kotak Kiri</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Perluas interface `RequisitionItem`:
       - Tambahkan properti `isPersisted?: boolean;`, `dbRequisitionItemId?: string;`, `dbRequisitionId?: string;`, `status?: string;`.
    2. Pada `loadInitialData()`:
       - Ambil detail requisition aktif beserta relasi `material_requisition_items` dan `materials`.
       - Petakan record database menjadi `RequisitionItem` dengan flag `isPersisted: true`.
       - Inisialisasi `selectedItems` dengan item-item tersimpan tersebut.
    3. Perbarui rendering UI Kotak Kiri:
       - Tampilkan badge status (`DIAJUKAN` / `PENDING` atau status aktual) untuk item yang tersimpan.
       - Tampilkan badge `BARU` untuk item yang baru dipindahkan secara lokal.
       - Lock input kuantitas untuk item yang sudah berstatus tersimpan agar tidak terjadi desinkronisasi sebelum pembatalan formal.
  </action>
  <verify>Saat modal dibuka pada SPK dan WBS yang sudah memiliki requisition, daftar material yang telah diajukan tampil lengkap di Kotak Kiri.</verify>
  <done>Kotak Kiri ter-hydrate dengan data requisition tersimpan dari Supabase.</done>
</task>

<task type="auto">
  <name>Task 2: Dialog Konfirmasi Penghapusan / Pengembalian Material</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Buat state dialog konfirmasi: `confirmItemToRemove: RequisitionItem | null`.
    2. Modifikasi handler tombol hapus (ikon tong sampah), double-click pada item Kotak Kiri, dan tombol transfer `>>`:
       - Buka dialog konfirmasi dengan pesan:
         *"Apakah Anda yakin ingin membatalkan permintaan material [{nama_material}]? Material akan dikembalikan ke daftar Alokasi RAB."*
    3. Implementasikan fungsi eksekusi pembatalan (`handleExecuteRemove`):
       - Jika pengguna memilih "Batal": dialog ditutup tanpa perubahan.
       - Jika pengguna memilih "Ya, Kembalikan":
         - Jika item sudah tersimpan di database (`dbRequisitionItemId`):
           - Hapus record dari `material_requisition_items` di Supabase.
           - Jika parent `material_requisitions` tidak lagi memiliki item, bersihkan atau batalkan header requisition tersebut.
           - Hapus ID terkait dari `usedRequisitionItemIds`.
         - Hapus item dari `selectedItems`.
         - Item otomatis kembali muncul di Kotak Kanan ("Alokasi RAB").
  </action>
  <verify>Item tidak terhapus langsung melainkan memunculkan dialog konfirmasi. Saat dikonfirmasi, item dihapus dari Supabase (jika tersimpan) dan kembali muncul di Kotak Kanan.</verify>
  <done>Dialog konfirmasi dan pembatalan record Supabase terintegrasi dengan mulus.</done>
</task>

<task type="auto">
  <name>Task 3: Penyempurnaan Alur Submit Requisition</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Pada fungsi `handleSubmit`:
       - Filter hanya item baru yang belum tersimpan: `const newItemsToInsert = validItems.filter(item => !item.isPersisted);`.
       - Jika tidak ada item baru yang perlu diajukan, beri notifikasi informatif bahwa semua item sudah tersimpan.
       - Insert hanya item baru ke `material_requisitions` dan `material_requisition_items`.
    2. Perbarui label dan counter tombol Submit:
       - Tampilkan jumlah item baru yang siap diajukan (misal: `Submit Requisition (1 baru)`).
  </action>
  <verify>Submit requisition hanya menambahkan record baru ke database tanpa menduplikasi record yang sudah ada.</verify>
  <done>Submit requisition cerdas dan efisien hanya memproses penambahan baru.</done>
</task>

<task type="auto">
  <name>Task 4: Verifikasi & Atomic Commit</name>
  <files>None</files>
  <action>
    1. Jalankan `npx oxlint` dan pastikan 0 error.
    2. Jalankan `npm run build` dan pastikan sukses 100%.
    3. Uji alur data secara menyeluruh dengan simulasi database riil.
    4. Buat commit atomik: `feat(mandor): persist requisition items list and add confirmation dialog on item removal`.
  </action>
  <verify>Build dan linting lolos, fungsionalitas persistensi dan dialog konfirmasi terverifikasi.</verify>
  <done>Kode terverifikasi dan terdokumentasi di repositori.</done>
</task>
