---
phase: 51
plan: fix-spk-borongan-cancellation-and-material-transfer
wave: 1
gap_closure: true
---

# Fix: Pembatalan Penugasan SPK-B, Filter Eksklusi Requisition, dan Transfer Interaktif Material RAB ke Form SPK-B

## Problem
Pada modal "SPK Borongan" (`src/components/SpkBoronganPanel.tsx`) di Mandor Terminal:
1. **Tidak Ada Opsi Pembatalan Penugasan**: Mandor tidak dapat membatalkan atau menghapus penugasan pekerja (misal: pekerja berhalangan hadir atau salah input) yang sudah dibuat, sehingga alokasi pekerjaan terkunci tanpa jalan keluar.
2. **Tidak Ada Filter Eksklusi Requisition**: Panduan Material RAB menampilkan seluruh material WBS tanpa menyaring item yang sebenarnya sudah diajukan pengeluarannya di modul "Minta Material (Requisition)". Hal ini berisiko terjadinya duplikasi permintaan barang atau kebingungan antara alokasi barang borongan dan barang gudang.
3. **Input Penugasan Manual Terpisah dari Panduan Material**: Mandor harus mengetik ulang uraian pekerjaan dan menginput nominal kontrak secara manual meskipun item pekerjaan/material tersebut sudah tertera di daftar Panduan Material (RAB).

## Root Cause
`SpkBoronganPanel.tsx` belum mengintegrasikan handler penghapusan/pembatalan baris `spk_borongan`, belum melakukan cross-check query ke tabel `material_requisitions`/`material_requisition_items`, dan belum menghubungkan baris Panduan Material RAB dengan state form penugasan baru.

## Tasks

<task type="auto">
  <name>Task 1: Handler Pembatalan/Penghapusan Penugasan pada Riwayat SPK-B</name>
  <files>src/components/SpkBoronganPanel.tsx</files>
  <action>
    1. Implementasikan fungsi `handleCancelAssignment(recordId: string)` dengan konfirmasi dialog (`window.confirm`).
    2. Hapus record dari tabel `spk_borongan` di Supabase (`.delete().eq('id', recordId)`).
    3. Tambahkan tombol "Batalkan" dengan ikon Trash/X beraksen merah/rose pada tiap kartu riwayat penugasan pekerja di kotak riwayat.
    4. Refresh daftar penugasan (`fetchRecords()`) dan refresh data alokasi material.
  </action>
  <verify>Kartu penugasan yang dibatalkan terhapus dari Supabase dan UI riwayat terupdate seketika.</verify>
  <done>Fitur pembatalan penugasan SPK-B terpasang dengan konfirmasi aman.</done>
</task>

<task type="auto">
  <name>Task 2: Filter Eksklusi Material yang Sudah Diajukan di Requisition</name>
  <files>src/components/SpkBoronganPanel.tsx</files>
  <action>
    1. Tambahkan query fetching ke tabel `material_requisitions` join `material_requisition_items` untuk SPK aktif dan WBS aktif (status !== 'REJECTED').
    2. Kumpulkan daftar ID material atau nama material yang telah diajukan ke logistik gudang.
    3. Filter daftar `rabMaterials` di panel Panduan Material agar mengecualikan material yang sudah masuk ke daftar requisition aktif, serta material yang sedang aktif ditugaskan di SPK-B.
    4. Tampilkan counter/info jumlah item yang tersedia untuk borongan setelah dieksklusi.
  </action>
  <verify>Material yang sudah diajukan via modul Minta Material tidak muncul ganda pada daftar Panduan Material RAB SPK-B.</verify>
  <done>Eksklusi material requisition terintegrasi sempurna.</done>
</task>

<task type="auto">
  <name>Task 3: Transfer Interaktif Material dari Panduan RAB ke Form Penugasan Baru dengan Kemampuan Rollback</name>
  <files>src/components/SpkBoronganPanel.tsx</files>
  <action>
    1. Tambahkan state `selectedRabItemForAssignment: RabMaterial | null`.
    2. Tambahkan aksi transfer saat baris Panduan Material di-double-click atau diklik tombol `<<`:
       - Otomatis mengisi `taskDescription` dengan nama material (misal: "TUKANG LAS DUDUKAN SLEBOR").
       - Otomatis mengisi `contractValue` dengan nilai Subtotal RAB terkait.
       - Sembunyikan item yang terpilih dari daftar Panduan Material.
    3. Sediakan tombol "Reset / Batal Transfer" pada form Penugasan Baru SPK-B untuk mengosongkan form dan mengembalikan item tersebut ke daftar Panduan Material.
    4. Setelah penugasan berhasil dibuat (`handleCreate`), reset state `selectedRabItemForAssignment`.
  </action>
  <verify>Double-click atau transfer memindahkan data RAB ke form penugasan baru dan tombol reset mengembalikannya ke tabel RAB.</verify>
  <done>Transfer interaktif dua arah selesai diimplementasikan.</done>
</task>

<task type="auto">
  <name>Task 4: Verifikasi, Type Checking, dan Build Validation</name>
  <files>src/components/SpkBoronganPanel.tsx</files>
  <action>
    1. Pastikan seluruh tipe TypeScript valid dan tidak ada regresi.
    2. Jalankan `npx oxlint` dan `npm run build` untuk memverifikasi nol kesalahan kompilasi.
    3. Buat commit atomik: `feat(mandor): implement spk-b assignment cancellation, requisition exclusion filter, and interactive material transfer`.
  </action>
  <verify>`npm run build` dan `npx oxlint` berhasil 100% tanpa error.</verify>
  <done>Verifikasi tuntas dan commit atomik tersimpan.</done>
</task>
