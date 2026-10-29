# Sprint 102 — Ensure Public Tracking PDF Export Renders Complete Text and All Uploaded Images Across Pages

> **Duration**: 2026-10-29 to 2026-10-29
> **Status**: Completed ✓

## Goal
Menyempurnakan fungsi "Unduh PDF" pada halaman pelacakan publik (`/tracking/:spk_no`) agar menghasilkan dokumen PDF lengkap berformat A4 potret multi-halaman yang memuat seluruh teks informasi identitas SPK, tanggal registrasi, nopol, model unit, scope sub tasks, dokumen surat kesepakatan kerja, bar progres keseluruhan, rincian tahapan WBS (1 s/d 5) beserta catatan mandor, dan seluruh gambar/foto dokumentasi hasil pekerjaan tiap tahapan WBS secara rapi tanpa terpotong batas halaman, bersih berlatar putih hemat tinta, serta aman dari isu CORS Cloudinary dan style proxying Tailwind v4 modern color formats.

## Scope

### Included
- **Task 1: Buat Template Cetak Bersih / Print Area di `PublicProgressTracking.tsx`**
  - Buat kontainer dokumen laporan `#tracking-pdf-report` dengan styling clean white printable sheet (`bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-xl space-y-6 border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none`).
  - KOP Laporan resmi ROBELKAROSERI: judul, sub-judul modifikasi komersial, nomor SPK tebal, dan tanggal cetak format Indonesia.
  - Rincian Data Kendaraan & Konsumen terstruktur: Pelanggan, Nomor SPK, No. HP, Nomor Polisi, Model Kendaraan, VIN, Nomor Mesin, Tanggal Registrasi, Target Selesai, dan tag Scope Modifikasi / Sub Tasks.
  - Galeri Surat Kesepakatan Kerja: menampilkan seluruh lembar foto kesepakatan dengan `getOptimizedImageUrl(url, 600)`, `crossOrigin="anonymous"`, border rapi, caption nomor berkas, serta interaksi klik perbesar lightbox di layar (`data-testid="agreement-thumbnail-{idx}"`).
  - Bar progres penyelesaian keseluruhan (% Total Progres WBS).
  - Rincian 5 Tahapan WBS: Kartu `break-inside-avoid`, judul tahapan, badge progres %, kotak Catatan Mandor / Progres Terkini (atau placeholder netral jika belum ada catatan), serta galeri foto dokumentasi pekerjaan dalam grid 3 kolom proporsional dengan gambar tajam 600px `crossOrigin="anonymous"` dan caption foto.
  - Footer resmi RobelKaroseri.
- **Task 2: Implementasikan Generator PDF yang Memuat Semua Gambar via `html2pdf.js` & `createStyleProxy`**
  - Handler `handleDownloadPdf` dengan status loading `isGeneratingPdf` pada tombol "Unduh PDF" (animasi `Loader2` dan teks "Menyiapkan PDF...").
  - Mekanisme preload gambar (`waitForImages`): memastikan semua elemen `<img>` di dalam `#tracking-pdf-report` selesai dimuat (`img.complete` / `onload`) sebelum kanvas di-render.
  - Style proxying via `createStyleProxy` dari `src/utils/pdfExportUtils.ts` untuk mengonversi sintaks warna Tailwind v4 (`oklch`, `color-mix`, `lab`) ke RGB standar agar `html2canvas` tidak mengalami crash CSS parsing.
  - Konfigurasi `html2pdf` optimal: margin 10mm (`[10, 10, 10, 10]`), filename `Laporan-Progres-${safeSpkNo}.pdf`, `html2canvas` (`scale: 2`, `useCORS: true`, `allowTaint: false`, `logging: false`, `letterRendering: true`, `backgroundColor: '#ffffff'`), `jsPDF` (`unit: 'mm'`, `format: 'a4'`, `orientation: 'portrait'`), dan `pagebreak` (`mode: ['avoid-all', 'css', 'legacy']`, `avoid: ['.break-inside-avoid', 'tr', '.wbs-card']`).
  - Pembersihan otomatis overlay `html2pdf__overlay` dan fallback elegan `window.print()` jika terjadi kendala rendering.
- **Task 3: Pengaturan CSS `@media print` Cadangan & Pengujian Komprehensif**
  - Aturan CSS `@media print` terisolasi: menyembunyikan navbar dan elemen luar, memprioritaskan `#tracking-pdf-report` agar cetak fisik / browser print dialog menghasilkan lembar A4 portrait bersih tanpa memboroskan tinta latar belakang.
  - Perbarui dan tambahkan pengujian unit di `src/pages/__tests__/PublicProgressTracking.test.tsx` untuk memvalidasi:
    1. Render KOP, kredensial SPK, sub tasks, dan galeri dokumen kesepakatan 600px.
    2. Render tahapan WBS 1 s/d 5 lengkap dengan foto dokumentasi ber-atribut `crossOrigin="anonymous"`.
    3. Trigger `html2pdf` dengan konfigurasi lengkap saat tombol "Unduh PDF" diklik.
    4. Indikator loading tombol saat proses generasi PDF berjalan.
    5. Fallback ke `window.print()` saat `html2pdf` mengalami error.
  - Jalankan test suite Vitest, `npx oxlint`, dan `npm run build`.

### Explicitly Excluded
- Mengubah skema database PostgreSQL `spk`, `wbs_checklists`, atau `spk_assets`.
- Mengubah durasi masa tenggang 7 hari purnajual (grace period) yang telah teruji pada Sprint 66.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Buat Template Cetak Bersih / Print Area di `PublicProgressTracking.tsx` | Antigravity | ✅ Done | 0.5 |
| Task 2: Implementasikan Generator PDF yang Memuat Semua Gambar via `html2pdf.js` & `createStyleProxy` | Antigravity | ✅ Done | 0.5 |
| Task 3: Pengaturan CSS `@media print` Cadangan & Pengujian Komprehensif | Antigravity | ✅ Done | 0.5 |

## Daily Log

### 2026-10-29
- Sprint 102 selesai:
  1. `src/pages/PublicProgressTracking.tsx`:
     - Menghadirkan template lembar cetak bersih berlatar putih `#tracking-pdf-report` (`bg-white text-slate-900`) yang ramah cetak dan hemat tinta.
     - Menyusun KOP Laporan RobelKaroseri resmi dengan nomor SPK dan tanggal cetak format Indonesia.
     - Menyusun grid informasi identitas SPK & kendaraan (Nomor SPK, Pelanggan, No HP, Plat Nomor, Model Unit, VIN, Nomor Mesin, Tgl Registrasi, Target Selesai, Scope Sub Tasks).
     - Menyusun galeri dokumen Surat Kesepakatan Kerja dengan gambar tajam 600px, atribut `crossOrigin="anonymous"`, dan tetap mendukung interaksi pratinjau Lightbox modal.
     - Menyusun diagram penyelesaian keseluruhan (% Total Progres WBS).
     - Menyusun kartu rincian tiap tahapan WBS (1 s/d 5) dengan badge persentase, box Catatan Mandor / Progres Terkini (atau placeholder netral jika belum ada catatan), kartu dilindungi `.break-inside-avoid` dan `.wbs-card`, serta galeri foto dokumentasi tiap tahapan dalam grid 3 kolom proporsional ber-atribut `crossOrigin="anonymous"` dan caption foto.
     - Mengimplementasikan `handleDownloadPdf` dengan `html2pdf.js`:
       * Preload gambar (`waitForImages`) memastikan setiap `<img>` di `#tracking-pdf-report` selesai dimuat sebelum capture kanvas.
       * Style proxying via `createStyleProxy` untuk mencegah crash CSS parsing akibat warna modern Tailwind v4 (`oklch`, `color-mix`, `lab`).
       * Parameter A4 potret: margin 10mm, skala tajam 2x, `useCORS: true`, dan `pagebreak.avoid` pada `.break-inside-avoid`, `tr`, dan `.wbs-card`.
       * State `isGeneratingPdf` dengan indikator `Loader2` berputar pada tombol "Unduh PDF".
       * Fallback otomatis ke `window.print()` jika kanvas gagal di-render.
     - Menambahkan aturan `@media print` cadangan yang menyembunyikan elemen body lain dan memfokuskan `#tracking-pdf-report` untuk cetak browser.
  2. `src/pages/__tests__/PublicProgressTracking.test.tsx`:
     - Memperbarui pengujian untuk resolusi gambar dokumen kesepakatan 600px.
     - Menambahkan test suite PDF generation: memvalidasi panggilan `html2pdf` dengan parameter A4, margin 10mm, filename `Laporan-Progres-${spk_no}.pdf`, target `#tracking-pdf-report`, verifikasi `crossOrigin="anonymous"`, dan fallback error handling ke `window.print()`.
  3. Verifikasi:
     - 76 berkas pengujian Vitest (559 tests) lulus 100%.
     - `npx oxlint` lulus dengan 0 error.
     - `npm run build` sukses dikompilasi tanpa kendala.
