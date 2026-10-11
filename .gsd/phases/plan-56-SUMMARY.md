# Plan 56 Summary: Gap Closure - Perbaikan Render Kartu Material Alokasi RAB vs Form Dropdown Ekstra pada Daftar Permintaan Material di Mandor

## Overview
Menyelesaikan bug tampilan pada modal "Minta Material (Requisition)" di halaman `/mandor`, di mana item material yang sudah dipindahkan dari Alokasi RAB (seperti "KARPET SLEBOR" dengan Qty 0.1 pcs pada SPK-5902 WBS Pembongkaran) atau tercatat di database sebelumnya ditampilkan secara keliru sebagai baris form input ekstra dengan dropdown `-- Pilih dari Master Material --`.

## Changes Made
1. **Pemisahan Logika Render di Kotak Kiri ("Daftar Permintaan Material")**:
   - Menetapkan kondisi yang ketat untuk formulir dropdown penambahan ekstra: `!item.isPersisted && item.isManual && (!item.name || !item.name.trim())`. Form dropdown ekstra baru hanya muncul jika Mandor menekan tombol `+ Add Item` dan belum menentukan material dari master.
   - Untuk seluruh item lainnya (item alokasi RAB, item riwayat yang tersimpan di DB, atau item ekstra yang sudah dipilih materialnya), dirender sebagai kartu material statis dengan:
     - Nama material tebal (`font-bold`): `{item.name || 'Material Tanpa Nama'}`.
     - Badge status: `TERCATAT` / `DISETUJUI` (amber jika `isPersisted`) atau `BARU` (emerald jika penambahan baru).
     - Badge sumber: `RAB` (blue) jika berasal dari alokasi RAB / tersambung ke `sourceRabId`, atau `Ekstra` (purple) jika material tambahan di luar RAB.
     - Estimasi biaya & subtotal yang akurat dengan format mata uang rupiah.
     - Kuantitas dan unit (`0.1 pcs`), terkunci untuk item tersimpan.
     - Tombol hapus / pengembalian ke RAB dengan dialog konfirmasi.

2. **Hydration Mapping & Re-ordering**:
   - Menata ulang urutan fetching di `loadInitialData()` sehingga `masterMaterials` dan `rab_items` (`sourceList`) dimuat sebelum hydration `material_requisitions`.
   - Mencocokkan item requisition tersimpan dengan `sourceList` menggunakan `rab_item_id` dan pencocokan nama normal (`normalizeText`).
   - Menyambungkan relasi RAB (`sourceRabId`), mengisi unit price dan subtotal dari RAB jika `item.materials` bernilai null, serta menandai `isManual: false` dan `isPersisted: true`.

3. **Verifikasi**:
   - `npx oxlint` lolos dengan 0 error.
   - `npm run build` sukses 100%.
   - Simulasi database membuktikan record "KARPET SLEBOR" pada SPK-5902 Pembongkaran ter-hydrate secara akurat sebagai kartu tetap (`isNewUnselectedExtra: false`), dengan subtotal Rp 5.000 dan badge `TERCATAT` + `RAB`.
