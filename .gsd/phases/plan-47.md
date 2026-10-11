---
phase: 47
plan: fix-bast-split-print-and-download-buttons
wave: 1
gap_closure: true
---

# Fix: Pemisahan Tombol Aksi Cetak Dokumen dan Download PDF pada Modal BAST di /kasir

## Problem
Pada modal "Pratinjau Berita Acara Serah Terima (BAST)" di `/kasir`, tombol aksi di header modal saat ini masih berupa tombol tunggal gabungan berlabel "Cetak Dokumen / Simpan PDF". Tombol ini hanya memanggil `window.print()`, sehingga pengguna yang ingin langsung mengunduh file `.pdf` harus melalui dialog print browser dan memilih opsi "Save as PDF" secara manual. Pengguna menginginkan dua tombol terpisah dengan fungsi spesifik:
1. Tombol **"Download PDF"**: Langsung menghasilkan dan mengunduh berkas file PDF (`BAST-{spk_no}.pdf`) secara otomatis tanpa perlu membuka print dialog browser.
2. Tombol **"Cetak Dokumen"**: Membuka dialog print browser (`window.print()`) untuk mencetak fisik dokumen ke printer.

## Root Cause
1. Antarmuka toolbar header modal `BastModal.tsx` hanya menyediakan satu tombol gabungan `Printer` yang mengeksekusi `window.print()`.
2. Belum terintegrasi library PDF client-side (seperti `jspdf` dan `html2canvas` atau `html2pdf.js`) untuk merender elemen `#printable-bast` ke dalam stream berkas PDF A4 dan memicu file download otomatis ke disk pengguna.

## Tasks

<task type="auto">
  <name>Instalasi Library PDF Client-Side (jspdf & html2canvas)</name>
  <files>package.json</files>
  <action>
  - Pasang dependensi `jspdf` dan `html2canvas`.
  - Pastikan modul dapat diimpor dan dibundle dengan baik oleh Vite & TypeScript tanpa error resolusi modul.
  </action>
  <verify>Dependensi `jspdf` dan `html2canvas` terdaftar di package.json dan package-lock.json.</verify>
  <done>Library rendering dokumen HTML-ke-PDF tersedia untuk digunakan di client-side.</done>
</task>

<task type="auto">
  <name>Pemisahan Tombol Header Toolbar & Implementasi Download PDF di BastModal.tsx</name>
  <files>src/components/BastModal.tsx</files>
  <action>
  - Tambahkan utilitas/handler ekspor PDF di `BastModal.tsx`:
    - Mengambil node DOM `#printable-bast`.
    - Mengonversi elemen menjadi canvas beresolusi tinggi (scale 2, backgroundColor: #ffffff).
    - Memasukkan ke dokumen `jsPDF` ukuran A4 (210 x 297 mm, portrait).
    - Memicu download otomatis dengan penamaan format `BAST-${spkNo}.pdf`.
    - Tambahkan state indikator loading (`isDownloadingPdf`) dengan UI feedback saat proses konversi berlangsung (misal ikon spinner / label "Memproses...").
  - Ubah tombol tunggal header modal menjadi dua tombol berdampingan:
    1. Tombol **"Download PDF"**:
       - Tampilan: Aksen emerald/teal (`bg-emerald-600 hover:bg-emerald-700 text-white`), ikon `Download`, label responsif "Download PDF".
       - Aksi: Memanggil handler ekspor PDF langsung ke file `BAST-${spkNo}.pdf`.
    2. Tombol **"Cetak Dokumen"**:
       - Tampilan: Aksen oranye / netral (`bg-primary hover:bg-primary-hover text-white`), ikon `Printer`, label "Cetak Dokumen".
       - Aksi: Memanggil `window.print()`.
  - Pastikan kedua tombol memiliki class `no-print` dan tertata rapi di sebelah kiri tombol tutup modal (X).
  </action>
  <verify>Header modal memiliki 2 tombol terpisah: "Download PDF" dan "Cetak Dokumen". Saat "Download PDF" diklik, berkas `BAST-{spk_no}.pdf` terunduh. Saat "Cetak Dokumen" diklik, dialog print terbuka.</verify>
  <done>Tombol aksi terpisah dan masing-masing fungsi berjalan sesuai spesifikasi.</done>
</task>

<task type="auto">
  <name>Verifikasi, Type Checking, dan Build Validation</name>
  <files>None</files>
  <action>
  - Jalankan `npm run build` dan `npx oxlint` untuk memastikan tidak ada kesalahan kompilasi, tipe data, atau linting.
  - Verifikasi bahwa kedua tombol responsif dan styling cetak 1 halaman A4 tetap terjaga.
  - Buat commit atomik: `feat(kasir): split bast modal actions into print document and direct pdf download buttons`.
  </action>
  <verify>Build dan linting lulus 100% tanpa error.</verify>
  <done>Fitur siap dirilis ke branch utama.</done>
</task>
