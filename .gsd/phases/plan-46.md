---
phase: 46
plan: fix-bast-print-single-page
wave: 1
gap_closure: true
---

# Fix: Perbaikan Print Layout 1 Halaman A4 Dokumen BAST di /kasir

## Problem
Pada modal "Pratinjau Berita Acara Serah Terima (BAST)" di `/kasir`, dokumen yang seharusnya pas 1 lembar A4 justru dicetak menjadi 3 halaman di print preview browser:
- Halaman 1 kosong/blank.
- Halaman 2 isi surat baru dimulai dari setengah kertas ke bawah.
- Halaman 3 memuat sisa dokumen yang terpotong.

## Root Cause
1. Kontainer modal mewarisi `position: fixed`, `top: 50%`, margin luar, atau flex-center dari backdrop modal ke dalam media cetak.
2. Elemen root aplikasi (`#root`) di luar BAST masih memakan flow tinggi kertas (invisible layout height) karena hanya menggunakan `visibility: hidden` tanpa `display: none`.
3. Padding, jarak font, atau margin tabel BAST belum dikompresi agar muat dalam batas 1 halaman A4 portrait (`min-h-[290mm]` dan padding berlebih memicu page break).

## Tasks

<task type="auto">
  <name>Isolasi DOM Cetak #print-root dan React Portal</name>
  <files>index.html, src/components/BastModal.tsx</files>
  <action>
  - Tambahkan container `<div id="print-root"></div>` pada `index.html` sejajar dengan `#root`.
  - Pasang `createPortal` dari `react-dom` pada `src/components/BastModal.tsx` agar modal dimount ke `#print-root` (dengan fallback dinamis ke `document.body` jika kontainer belum ada di DOM).
  </action>
  <verify>Modal BAST ter-portal ke dalam `#print-root` di luar hierarki `#root`.</verify>
  <done>DOM cetak terisolasi dari flow dashboard utama aplikasi.</done>
</task>

<task type="auto">
  <name>Penerapan CSS Cetak @media print Presisi 1 Halaman</name>
  <files>src/index.css, src/components/BastModal.tsx</files>
  <action>
  - Perbarui CSS `@media print` di `src/index.css` dan embedded style di `BastModal.tsx`:
    - `html, body { height: auto !important; overflow: visible !important; background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; }`
    - `body > *:not(#print-root) { display: none !important; }`
    - `.modal-backdrop, header, nav, button, .no-print { display: none !important; }`
    - `#printable-bast { display: block !important; visibility: visible !important; position: static !important; transform: none !important; width: 100% !important; max-width: 100% !important; margin: 0 auto !important; padding: 8mm 12mm !important; box-shadow: none !important; border: none !important; page-break-inside: avoid !important; break-inside: avoid !important; }`
    - `@page { size: A4 portrait; margin: 8mm; }`
  - Netralkan seluruh wrapper modal (`#bast-modal-backdrop` dan inner modal card) saat print agar tidak mewarisi flex centering, transforms, fixed positioning, atau padding.
  </action>
  <verify>Halaman 1 blank dan offset vertikal hilang sepenuhnya karena `#root` disembunyikan (`display: none !important`) dan posisi modal direset ke `static`.</verify>
  <done>Print flow bebas dari invisible layout height dan overflow modal.</done>
</task>

<task type="auto">
  <name>Kompresi Vertikal dan Typography Dokumen BAST Pas 1 Lembar A4</name>
  <files>src/components/BastModal.tsx</files>
  <action>
  - Hapus atau sesuaikan `min-h-[290mm]` pada media cetak (`print:min-h-0 print:h-auto`).
  - Optimalkan margin dan padding:
    - Kop surat: padding bottom dan margin bottom dipersempit.
    - Judul dokumen dan nomor surat: margin atas-bawah dirampingkan.
    - Paragraf serah terima: ukuran font `text-[11px]` - `text-[11.5px]`, spasi baris compact.
    - Tabel spesifikasi: padding sel `py-1 px-3`, border solid rapi.
    - Box status QC & Keuangan: padding `p-2` compact.
    - Kolom pengesahan tanda tangan: tinggi `h-24` (bukan `h-28`), margin top dirampingkan.
  - Berikan rule `break-inside: avoid` pada seluruh seksi dokumen.
  </action>
  <verify>Seluruh isi dokumen BAST pas 1 lembar A4 portrait tanpa tumpah ke halaman kedua.</verify>
  <done>Dokumen BAST tercetak presisi 1 lembar A4 portrait siap tanda tangan.</done>
</task>

<task type="auto">
  <name>Verifikasi dan Build Validation</name>
  <files>None</files>
  <action>
  - Jalankan `npm run build` dan `npx oxlint` untuk memastikan validitas TypeScript dan build bundle.
  </action>
  <verify>Build lolos tanpa type error atau linter warning.</verify>
  <done>Perbaikan siap dieksekusi dan diverifikasi.</done>
</task>
