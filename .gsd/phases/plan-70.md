---
phase: 70
plan: refactor-spk-filter-list-box-sidebar-warehouse
wave: 1
gap_closure: true
---

# Refactor: Memindahkan Filter SPK Tab "Mandor Requests" Menjadi List Box Vertikal Lengkap di Panel Samping Kanan pada /warehouse

## Problem
1. Tombol filter pills horizontal di header panel "Pending Requisitions (Mandor)" membuat header terlihat padat, sempit, dan kurang ergonomis saat jumlah SPK aktif bertambah.
2. Informasi pada filter pills sebelumnya terbatas hanya nomor SPK dan angka counter tanpa menampilkan nama pelanggan / proyek untuk membantu petugas gudang mengidentifikasi unit fisik kendaraan dengan cepat.
3. Panel samping kanan (di atas Low Stock Warnings) pada `/warehouse` belum dimanfaatkan secara optimal saat tab "Mandor Requests" aktif.

## Root Cause
1. Penempatan kontrol filter sebelumnya berada di baris header tabel kiri yang ruang horizontalnya terbatas.
2. Belum ada komponen dedicated List Box vertikal yang menyajikan informasi komprehensif kartu SPK (Nomor SPK, Nama Pelanggan/Unit, dan Badge Counter Pending) dengan scrollable view dan highlight aktif yang tegas.

## Tasks

<task type="auto">
  <name>Task 1: Pembuatan Komponen SpkFilterListBox.tsx</name>
  <files>src/components/SpkFilterListBox.tsx</files>
  <action>
    - Buat komponen `SpkFilterListBox` dengan antarmuka:
      * Header bertajuk "Filter Berdasarkan SPK" dengan ikon filter dan badge jumlah SPK aktif.
      * Container scrollable vertikal (`max-h-[550px] overflow-y-auto space-y-2 p-3 scrollbar-thin`).
      * Item 1 (Default): "Semua SPK", subteks informatif, dan badge total seluruh pending.
      * Item 2..N: Kartu SPK dengan baris atas memuat Nomor SPK dan badge status pending, baris bawah memuat nama pelanggan/deskripsi dan indikator aktif.
      * Styling dark industrial RobelKaroseri dengan highlight oranye tegas (`border-primary bg-primary/10 shadow-sm ring-1 ring-primary`) saat kartu SPK aktif dipilih.
  </action>
  <verify>Komponen me-render daftar kartu SPK dengan transisi hover dan visual state aktif yang jelas.</verify>
  <done>Komponen src/components/SpkFilterListBox.tsx berhasil dibuat.</done>
</task>

<task type="auto">
  <name>Task 2: Refactor RequisitionApproval.tsx & Pembersihan Header</name>
  <files>src/components/RequisitionApproval.tsx</files>
  <action>
    - Hapus seluruh elemen filter pill horizontal dari header panel "Pending Requisitions (Mandor)".
    - Kembalikan header kiri ke format clean: Icon ClipboardList, Judul "Pending Requisitions (Mandor)", dan badge total counter.
    - Tambahkan badge tag kecil informasi filter aktif beserta tombol reset cepat jika sedang memfilter SPK tertentu.
    - Terima props `selectedSpkFilter`, `onResetFilter`, dan callback `onSpkSummaryChange` untuk menyalurkan daftar SPK unik ke komponen induk `WarehouseDashboard`.
    - Saring daftar permintaan secara reaktif dan sediakan empty state ramah dengan tombol "Tampilkan Semua SPK" jika SPK yang dipilih tidak memiliki pending lagi.
  </action>
  <verify>Header panel kiri kembali bersih dan kartu permintaan tersaring reaktif mengikuti pilihan di sidebar kanan.</verify>
  <done>Pembersihan header dan refactor props di RequisitionApproval.tsx selesai.</done>
</task>

<task type="auto">
  <name>Task 3: Integrasi Sidebar Kanan di WarehouseDashboard.tsx</name>
  <files>src/pages/WarehouseDashboard.tsx</files>
  <action>
    - Tambahkan state `selectedSpkFilter` dan `spkFilterList` di `WarehouseDashboard.tsx`.
    - Teruskan state dan handler ke `RequisitionApproval`.
    - Pada kolom sidebar kanan, render `SpkFilterListBox` tepat di atas widget "Low Stock Warnings" ketika `activeTab === 'requisition'`.
    - Pastikan counter total pending pada badge tab tetap konsisten mencerminkan seluruh antrean gudang.
  </action>
  <verify>Saat tab Mandor Requests aktif, List Box SPK muncul di panel kanan dan mengontrol penyaringan data panel kiri dengan sekali klik.</verify>
  <done>Integrasi sidebar kanan di WarehouseDashboard.tsx selesai.</done>
</task>
