---
phase: 56
plan: fix-allocated-rab-material-card-render
wave: 1
gap_closure: true
---

# Fix: Perbaikan Render Kartu Material Alokasi RAB vs Form Dropdown Ekstra pada Daftar Permintaan Material di Mandor

## Problem
Pada modal "Minta Material (Requisition)" di halaman `/mandor`:
Item material yang berasal dari alokasi RAB atau riwayat requisition tersimpan di sistem (misal: "KARPET SLEBOR" dengan Qty 0.1 pcs pada SPK-5902 WBS Pembongkaran) saat ini ditampilkan sebagai baris formulir "Pilih Material Ekstra:" dengan dropdown default "-- Pilih dari Master Material --".
Seharusnya, item yang berasal dari alokasi RAB atau riwayat requisition ditampilkan sebagai kartu item tetap/statis dengan nama material ("KARPET SLEBOR"), badge indikator (`RAB` atau `TERCATAT`), kuantitas (0.1 pcs), dan estimasi harga/subtotal yang benar, bukan formulir kosong penambahan ekstra.

## Root Cause
1. **Pemisahan Tipe Item pada UI Render**: Kondisi rendering pada Kotak Kiri menyamaratakan seluruh item yang memiliki `isManual = true` atau `!item.materialId` untuk memunculkan dropdown master material `select`. Padahal item yang tersimpan di database (`isPersisted = true`) atau item yang sudah memiliki nama (`item.name`) seharusnya dirender sebagai kartu material statis.
2. **Hydration Mapping**: Pada `loadInitialData()`, data requisition dari Supabase dimuat sebelum data `rab_items`. Jika item di database tidak memiliki `rab_item_id` atau `material_id` (seperti halnya item custom dari paket RAB), item tersebut salah ditandai sebagai `isManual: true`, harganya menjadi 0, dan karena `material_id`-nya null, memicu render dropdown kosong.

## Tasks

<task type="auto">
  <name>Task 1: Perbaiki Logika Render Item di Kotak Kiri (Daftar Permintaan Material)</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Bedakan dua jenis item pada render list Kotak Kiri:
       a. Item Terpilih / Item RAB / Item Riwayat Tersimpan:
          - Tampilkan nama material secara statis dan tebal: `{item.name}`.
          - Tampilkan badge indikator status (`TERCATAT` / `DIAJUKAN` jika `isPersisted`, atau `BARU` jika belum disimpan).
          - Tampilkan badge sumber (`RAB` jika berasal dari RAB, atau `Ekstra` jika penambahan ekstra).
          - Tampilkan jumlah kuantitas (`{item.quantity} {item.unit || 'pcs'}`) dengan input terkunci jika `isPersisted`.
          - Tampilkan estimasi harga dan subtotal yang akurat.
          - Tombol aksi: ikon tong sampah / hapus dengan dialog konfirmasi pengembalian ke RAB.
       b. Item Ekstra Baru (HANYA jika Mandor menekan tombol "+ Add Item" dan belum memilih material):
          - Evaluasi dengan kondisi ketat: `!item.isPersisted && item.isManual && (!item.name || !item.name.trim())`.
          - Tampilkan dropdown "-- Pilih dari Master Material --" beserta kuantitas.
          - Saat material dipilih, update nama dan harga sehingga otomatis beralih menjadi kartu material statis.
  </action>
  <verify>Kotak Kiri menampilkan "KARPET SLEBOR" sebagai kartu material tetap tebal dan lengkap dengan badge, bukan dropdown select.</verify>
  <done>Logika rendering membedakan dengan tegas antara kartu material tetap dan formulir input ekstra baru.</done>
</task>

<task type="auto">
  <name>Task 2: Perbaiki Urutan dan Hydration Mapping Saat Modal Dibuka</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Susun ulang urutan pemuatan data di `loadInitialData()`:
       - Muat data master materials dan data RAB items terlebih dahulu sebelum memproses existing requisitions.
    2. Perbaiki pemetaan persisted items:
       - Cocokkan item requisition dari database dengan data `rawRabItems`:
         - Pertama via `rab_item_id`.
         - Kedua via pencocokan nama normal (`normalizeText`).
       - Jika cocok dengan RAB:
         - Set `sourceRabId` dengan ID item RAB terkait.
         - Ambil harga satuan dan estimasi subtotal dari RAB jika `item.materials` null.
         - Tandai `isManual: false` dan `isPersisted: true`.
         - Pastikan ID RAB dimasukkan ke `usedRequisitionItemIds` agar tereksklusi dari Kotak Kanan.
       - Jika tidak ada di RAB (ekstra yang tersimpan):
         - Cocokkan dengan `masterMaterials` untuk estimasi harga.
         - Tandai `isManual: true` dan `isPersisted: true`.
       - Pastikan `name` selalu terisi dari `item.material_name || item.materials?.name || ...`.
  </action>
  <verify>Item requisition yang dimuat dari database memiliki nama, kuantitas, harga, dan relasi RAB yang valid, serta ter-hydrate sebagai kartu tetap.</verify>
  <done>Hydration data requisition tersimpan terpetakan dengan lengkap dan presisi.</done>
</task>

<task type="auto">
  <name>Task 3: Verifikasi, Type Checking & Atomic Commit</name>
  <files>None</files>
  <action>
    1. Jalankan `npx oxlint` dan pastikan 0 error.
    2. Jalankan `npm run build` dan pastikan build bersih 100%.
    3. Verifikasi pada SPK-5902 WBS Pembongkaran bahwa "KARPET SLEBOR" tampil sebagai kartu dengan Qty 0.1 pcs dan estimasi Rp 5.000 tanpa dropdown.
    4. Buat commit atomik:
       `fix(mandor): properly render allocated rab material card instead of extra material select in requisition list`.
  </action>
  <verify>Build lolos dan verifikasi modal Minta Material berhasil.</verify>
  <done>Commit tersimpan di repositori git.</done>
</task>
