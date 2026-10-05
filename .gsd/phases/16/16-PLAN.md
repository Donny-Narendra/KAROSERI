---
phase: 16
plan: 1
wave: 1
---

# Plan 16.1: Pemecahan Kuota Material ke WBS 1-5 pada RAB Calculator

## Objective
Implementasikan Fitur Pilih Paket Barang Jadi & Pemecahan Kuota Material ke WBS 1-5 pada RAB Calculator.

## Context
- `src/components/RabCalculator.tsx`
- `src/pages/AdvisorDashboard.tsx`
- `src/components/PackageAllocationModal.tsx`

## Tasks

<task type="auto">
  <name>Buat komponen modal alokasi paket BOM ke WBS (PackageAllocationModal)</name>
  <files>src/components/PackageAllocationModal.tsx</files>
  <action>
    1. Buat komponen `PackageAllocationModal.tsx`:
       - Props: `packageData: ProductPackageWithItems`, `isOpen: boolean`, `onClose: () => void`, `onApply: (allocatedItems: RabItemPayload[]) => void`.
    2. Render daftar material dalam bentuk kartu/tabel alokasi interaktif:
       - Header baris: Nama Material, Satuan, Total Kuota, dan Badge "Sisa: X".
       - Sediakan 5 kolom input angka untuk masing-masing tahapan WBS (WBS 1..5).
    3. Pasang validasi reaktif:
       - Hitung sisa kuota per baris material. Jika sisa === 0 beri badge hijau (PASSED), jika sisa > 0 atau < 0 beri badge peringatan (merah/oranye).
       - Validasi form secara global: Tombol "Terapkan ke RAB" hanya aktif jika SEMUA material teralokasi 100% (sisa = 0).
    4. Format output data menjadi array baris RAB:
       Setiap kuantitas > 0 di WBS tertentu menghasilkan 1 baris objek `rab_items` dengan `wbs_category` yang dipilih.
  </action>
  <verify>Jalankan oxlint / npm run build untuk memastikan tidak ada kesalahan tipe TypeScript.</verify>
  <done>Komponen pembagian kuota material ke WBS siap diintegrasikan.</done>
</task>

<task type="auto">
  <name>Integrasikan pemilih paket dan modal alokasi pada RabCalculator</name>
  <files>src/components/RabCalculator.tsx, src/pages/AdvisorDashboard.tsx</files>
  <action>
    1. Pada `RabCalculator.tsx`:
       - Tambahkan tombol "Pilih dari Paket Barang Jadi (BOM)" di bagian atas tabel input item.
       - Ambil daftar paket dari tabel `product_packages` (beserta join `package_items`).
    2. Saat paket dipilih oleh Service Advisor, buka `PackageAllocationModal`.
    3. Saat event `onApply` dipicu dari modal:
       - Masukkan seluruh item material yang telah dipecah per WBS ke dalam state `rab_items`.
       - Masukkan juga item komponen jasa (labor) dari paket ke WBS yang sesuai.
       - Perbarui akumulasi subtotal biaya material, jasa, dan grand total RAB secara otomatis.
  </action>
  <verify>Buka /advisor, buka pembuatan RAB, klik tombol Pilih Paket Barang Jadi, pilih satu paket, pecah kuota material (misal amplas 10 lembar dibagi ke WBS 1-5), pastikan badge sisa berkurang dan baris terpecah masuk ke tabel RAB.</verify>
  <done>RAB Calculator berhasil mengurai kuota material paket barang jadi ke masing-masing WBS 1 sampai 5 secara presisi.</done>
</task>

## Success Criteria
- [ ] Sisa kuota berkurang secara visual setiap kali angka diinputkan pada kolom WBS 1..5.
- [ ] Baris tabel RAB menampilkan kategori WBS yang sesuai dengan alokasi yang ditentukan oleh Service Advisor.
