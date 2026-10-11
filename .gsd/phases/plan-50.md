---
phase: 50
plan: fix-requisition-modal-3-column-layout-tablet-desktop
wave: 1
gap_closure: true
---

# Fix: Tata Letak 3 Kolom Bersebelahan (Permintaan | Tombol << & >> | Alokasi RAB) untuk Tampilan Tablet & Desktop di /mandor

## Problem
Pada modal "Minta Material (Requisition)" (`src/components/MaterialRequisitionForm.tsx`), tampilan dual-list saat ini menggunakan breakpoint `lg:` sehingga pada perangkat Tablet (`md:` breakpoint, 768px - 1023px) layout masih tersusun vertikal (bertumpuk). Hal ini menyebabkan mandor di lapangan yang menggunakan tablet industri harus melakukan scroll naik-turun yang merepotkan saat memilih dan memindahkan material antara daftar alokasi RAB dan daftar permintaan.

## Root Cause
Kontainer utama menggunakan `grid grid-cols-1 lg:grid-cols-[1fr,60px,1fr]` yang hanya mengaktifkan tata letak bersebelahan pada resolusi layar laptop/desktop besar (`lg:` >= 1024px), sementara tablet industri mandor berada pada breakpoint `md:`. Selain itu, ketinggian list belum disinkronkan secara konsisten antar kolom.

## Tasks

<task type="auto">
  <name>Task 1: Penataan Layout Grid Responsif 3 Kolom Bersebelahan pada Breakpoint md: (md:grid-cols-12)</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Ubah kontainer pembungkus utama dual-list menjadi layout 12 kolom responsif:
       `grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch`.
    2. Alokasikan pembagian 3 kolom:
       - Kolom 1 (Kiri): `md:col-span-5 flex flex-col` untuk "Daftar Permintaan Material" (termasuk tombol "+ Add Item" dan subtotal estimasi).
       - Kolom 2 (Tengah): `md:col-span-2 flex md:flex-col items-center justify-center gap-3 py-2 self-center` untuk tombol kontrol transfer `<<` (emerald) dan `>>` (rose).
       - Kolom 3 (Kanan): `md:col-span-5 flex flex-col` untuk "Alokasi RAB (WBS Terkait)" (daftar material RAB WBS lengkap dengan Nama, Stok, Qty, Satuan, dan Subtotal).
  </action>
  <verify>Pada breakpoint tablet (`md:` >= 768px) dan desktop, ketiga kolom tersusun bersebelahan dalam 1 baris yang rapi.</verify>
  <done>Layout 3 kolom aktif mulai dari breakpoint `md:`.</done>
</task>

<task type="auto">
  <name>Task 2: Penyeragaman Ketinggian Kontainer, Scrollbar Mandiri, dan Centering Tombol Kontrol</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Samakan tinggi kartu Kolom 1 dan Kolom 3 dengan `h-[420px] md:h-[460px] flex flex-col` sehingga kedua kotak memiliki proporsi yang simetris dan seragam.
    2. Pastikan area daftar item di dalam Kolom 1 dan Kolom 3 memiliki `overflow-y-auto flex-1` dengan scrollbar internal independen.
    3. Posisikan tombol kontrol `<<` dan `>>` di Kolom 2 tepat di tengah-tengah tinggi kartu secara vertikal (`self-center` dengan orientasi vertikal pada `md:`).
    4. Pastikan teks label dan ikon tombol transfer jelas dan intuitif di layar sentuh tablet.
  </action>
  <verify>Kedua kotak kiri dan kanan memiliki ketinggian yang sama persis, scrollbar internal bekerja lancar, dan tombol kontrol berada di tengah vertikal.</verify>
  <done>Desain simetris dan scrollable internal terpasang sempurna.</done>
</task>

<task type="auto">
  <name>Task 3: Verifikasi Interaktivitas Transfer, Validasi TypeScript, dan Build Verification</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Pastikan logika transfer item tetap berjalan sempurna:
       - Klik item di Kolom 3 (RAB) -> klik `<<` -> pindah ke Kolom 1.
       - Klik item di Kolom 1 (Permintaan) -> klik `>>` -> kembali ke Kolom 3.
       - Double-click shortcut kedua arah berfungsi mulus.
       - Tombol "+ Add Item" untuk material ekstra manual tetap dapat digunakan.
    2. Uji submit requisition dan validasi data.
    3. Jalankan `npm run build` dan `npx oxlint` untuk memastikan zero error.
  </action>
  <verify>Build dan linting lulus 100% tanpa error serta interaktivitas transfer teruji.</verify>
  <done>Verifikasi tuntas dan fungsionalitas tervalidasi.</done>
</task>
