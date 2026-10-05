---
phase: 20
plan: fix-rab-export
wave: 1
gap_closure: true
---

# Fix: Ganti Import Template dengan Fitur Export XLSX dan PDF pada RAB Calculator

## Problem
Tombol "Download Template" dan "Import Excel" sudah tidak relevan karena penyusunan RAB kini terintegrasi langsung dengan pemilihan Paket Barang Jadi (BOM) dan penguraian WBS.

## Root Cause
Fitur penyusunan RAB sudah berkembang menggunakan modul Paket Barang Jadi, sehingga import/export template lama (untuk estimasi manual) tidak diperlukan lagi dan harus diganti dengan fungsi export laporan (XLSX dan PDF/Cetak) untuk konsumen.

## Tasks

<task type="auto">
  <name>Gantikan tombol import template dengan Export XLSX dan fungsi Export PDF di RabCalculator</name>
  <files>src/components/RabCalculator.tsx, src/utils/rabExport.ts</files>
  <action>
    1. Buka `src/components/RabCalculator.tsx`.
    2. Hapus elemen tombol "Download Template" dan "Import Excel" beserta state/modal filenya.
    3. Buat file helper utilitas `src/utils/rabExport.ts`:
       - Fungsi `exportRabToExcel(spkDetails, rabItems, totals)` menggunakan library `xlsx`:
         * Susun worksheet dengan informasi unit di bagian atas.
         * Tulis tabel data terurut per tahapan WBS.
         * Berikan baris Subtotal dan Grand Total dengan format angka Rupiah.
         * Trigger download: `RAB_[NoSPK]_[NamaKonsumen].xlsx`.
       - Fungsi `printRabQuotation(spkDetails, rabItems, totals)`:
         * Sediakan layout cetak printable yang menyembunyikan navigasi dashboard/sidebar.
         * Tambahkan area tanda tangan: "Dibuat oleh (Service Advisor)" dan "Disetujui oleh (Konsumen)".
         * Panggil `window.print()`.
    4. Pasang kedua tombol di header RabCalculator:
       - Tombol hijau/outline: `<button onClick={handleExportXlsx}>Export XLSX</button>`
       - Tombol oranye/biru: `<button onClick={handlePrintPdf}>Export PDF / Cetak</button>`
  </action>
  <verify>Jalankan oxlint / npm run build, buka halaman /advisor pada SPK-1527, pastikan tombol download/import template hilang, klik tombol Export XLSX untuk mengunduh file spreadsheet, dan klik Export PDF untuk memunculkan dialog cetak penawaran.</verify>
  <done>Service Advisor dapat mengekspor penawaran RAB ke format XLSX dan mencetak/menyimpan PDF resmi untuk konsumen.</done>
</task>
