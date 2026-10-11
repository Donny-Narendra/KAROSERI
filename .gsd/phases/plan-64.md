---
phase: 64
plan: fix-warehouse-goods-issue-material-autocomplete
wave: 1
gap_closure: true
---

# Fix: Mengganti Dropdown "Select Material" Menjadi Search Autocomplete Berbasis Keyboard di Halaman /warehouse (Tab Goods Issue / Issue Material)

## Problem
Pada halaman `/warehouse` tab "Issue Material (Goods Issue)", pemilihan material tambahan di luar RAB (atau material dalam katalog gudang) saat ini masih menggunakan elemen `<select>` HTML standar ("Select Material: -- Choose Material --"). Banyaknya master material bengkel membuat proses pencarian via dropdown menjadi lambat dan kurang ergonomis bagi petugas gudang yang membutuhkan entri data cepat menggunakan keyboard.

## Root Cause
1. `src/components/GoodsIssueForm.tsx`: Menggunakan elemen `<select>` native untuk memilih `masterMaterials`.
2. Belum ada komponen autocomplete teks interaktif yang mendukung pencarian real-time case-insensitive serta navigasi keyboard (ArrowDown, ArrowUp, Enter, Escape).
3. Field "Request Quantity" belum memiliki indikator visual satuan unit material di samping input serta belum terhubung dengan perpindahan fokus otomatis saat material selesai dipilih via keyboard.

## Tasks

<task type="auto">
  <name>Task 1: Pembuatan Komponen MaterialSearchAutocomplete</name>
  <files>src/components/MaterialSearchAutocomplete.tsx</files>
  <action>
    - Buat komponen `MaterialSearchAutocomplete` yang menerima:
      * `materials`: array master material dengan properti `id`, `name`, `unit`, `current_stock`, `code`, `is_rab`, `has_been_issued`.
      * `selectedMaterialId`: string UUID material terpilih.
      * `onSelect`: callback handler pemilihan material.
      * `disabled`: boolean (nonaktif saat SPK belum dipilih).
      * `placeholder`: "Cari bahan baku, profil besi, sparepart, atau kustom...".
      * `onEnterFocusNext`: callback untuk memindahkan fokus kursor ke input kuantitas.
    - Implementasikan filter pencarian case-insensitive real-time berdasarkan nama material dan kode barang.
    - Implementasikan navigasi keyboard:
      * ArrowDown: navigasi highlight ke item saran berikutnya (dengan auto-scroll).
      * ArrowUp: navigasi highlight ke item saran sebelumnya (dengan auto-scroll).
      * Enter: memilih item yang sedang disorot, mengisi nilai material, menutup popup saran, dan memindahkan fokus kursor ke input kuantitas.
      * Escape: menutup popup daftar saran dan mengembalikan teks pencarian ke nama material yang sedang terpilih.
    - Implementasikan penutupan dropdown saat klik di luar area (click-outside listener via mousedown).
    - Desain floating list bergaya modern dark mode RobelKaroseri:
      * Background `bg-slate-900`, border `border-slate-700`, bayangan mendalam `shadow-2xl`.
      * Item aktif/hover: `bg-orange-500/20 text-orange-300 border-l-2 border-orange-500`.
      * Informasi ringkas tiap baris: Nama Material, badge RAB (jika masuk RAB), badge Sudah Diambil (jika pernah di-issue), serta stok tersedia dan satuannya (`Stok: X unit`).
  </action>
  <verify>Komponen me-render input pencarian, dropdown saran melayang, kontrol keyboard, dan preview stok tanpa error.</verify>
  <done>Komponen autocomplete master material siap digunakan pada form Goods Issue gudang.</done>
</task>

<task type="auto">
  <name>Task 2: Integrasi Komponen Autocomplete di GoodsIssueForm</name>
  <files>src/components/GoodsIssueForm.tsx</files>
  <action>
    - Gantikan elemen native `<select>` pada field "Select Material" dengan `MaterialSearchAutocomplete`.
    - Petakan master material ke dalam format opsi autocomplete beserta indikator `is_rab` dan `has_been_issued`.
    - Buat `requestQtyInputRef` dan hubungkan dengan callback `onEnterFocusNext` dari autocomplete.
    - Tambahkan indikator satuan (unit badge) di samping input "Request Quantity".
    - Bersihkan nilai input kuantitas dan pilihan material saat SPK berganti untuk mencegah ketidaksinkronan data.
  </action>
  <verify>Pencarian material, seleksi keyboard, auto-focus ke kuantitas, dan payload material_id UUID berjalan sempurna.</verify>
  <done>Halaman /warehouse tab Issue Material telah menggunakan autocomplete search berbasis keyboard.</done>
</task>
