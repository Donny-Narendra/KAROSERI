---
phase: 63
plan: fix-warehouse-return-material-autocomplete
wave: 1
gap_closure: true
---

# Fix: Mengganti Dropdown "Select Issued Material" Menjadi Search Autocomplete Berbasis Keyboard di Halaman /warehouse (Tab Return Material)

## Problem
Pada halaman `/warehouse` tab "Return Material", pemilihan barang yang hendak dikembalikan sebelumnya menggunakan elemen dropdown `<select>` standar ("Select Issued Material: -- Choose Material to Return --"). Petugas gudang mengalami hambatan kecepatan input data karena harus mencari nama barang secara manual dalam daftar dropdown tanpa dukungan pencarian interaktif dan navigasi keyboard cepat.

## Root Cause
1. `src/components/GoodsReturnForm.tsx`: Menggunakan elemen `<select>` HTML standar untuk memilih `issuedMaterials`.
2. Tidak adanya filter interaktif real-time dan kontrol navigasi keyboard (ArrowDown, ArrowUp, Enter, Escape) untuk memilih material yang telah dikeluarkan pada SPK terpilih.
3. Informasi satuan (`unit`) material belum diikutsertakan dalam query transaksi pengeluaran material (`inventory_transactions`).

## Tasks

<task type="auto">
  <name>Task 1: Pembuatan Komponen IssuedMaterialAutocomplete</name>
  <files>src/components/IssuedMaterialAutocomplete.tsx</files>
  <action>
    - Buat komponen `IssuedMaterialAutocomplete` yang menerima daftar `materials`, `selectedMaterialId`, `onSelect`, `disabled`, `placeholder`, dan `onEnterFocusNext`.
    - Implementasikan filter pencarian case-insensitive real-time berdasarkan `searchQuery`.
    - Implementasikan navigasi keyboard:
      * ArrowDown: navigasi ke item saran berikutnya.
      * ArrowUp: navigasi ke item saran sebelumnya.
      * Enter: memilih item yang disorot dan memicu callback untuk memindahkan fokus ke input Return Quantity.
      * Escape: menutup popup daftar saran dan mengembalikan nilai pencarian.
    - Implementasikan penutupan dropdown saat klik di luar area (click outside via mousedown listener).
    - Desain antarmuka modern dark mode konsisten RobelKaroseri (`bg-slate-900`, `border-slate-700`, highlight `bg-orange-500/20 text-orange-300`, dan badge kuantitas yang dikeluarkan).
  </action>
  <verify>Komponen me-render input pencarian, dropdown saran mengambang, dan kontrol keyboard tanpa error.</verify>
  <done>Komponen autocomplete siap digunakan di form retur gudang.</done>
</task>

<task type="auto">
  <name>Task 2: Integrasi Komponen Autocomplete di GoodsReturnForm</name>
  <files>src/components/GoodsReturnForm.tsx</files>
  <action>
    - Perbarui query `fetchIssuedMaterials` untuk mengambil atribut `unit` dari relasi `materials(id, name, unit)`.
    - Gantikan elemen `<select>` pada field "Select Issued Material" dengan `IssuedMaterialAutocomplete`.
    - Sambungkan callback `onEnterFocusNext` untuk memindahkan fokus langsung ke elemen input `returnQtyInputRef`.
    - Sinkronisasikan batas kuantitas retur maksimum dan tampilkan indikator kuantitas yang dikeluarkan beserta satuannya.
    - Reset pilihan material dan kuantitas retur saat pilihan SPK berubah.
  </action>
  <verify>Pemilihan material melalui pencarian teks dan navigasi keyboard terhubung langsung dengan state form retur.</verify>
  <done>Halaman /warehouse tab Return Material telah menggunakan autocomplete search berbasis keyboard.</done>
</task>
