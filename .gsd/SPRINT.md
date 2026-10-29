# Sprint 100 — Add Compact Down Payment Receipt Download Button in Cashier Modal

> **Duration**: 2026-10-29 to 2026-10-29
> **Status**: In Progress

## Goal
Tambahkan tombol aksi baru "Download Kuitansi Ringkas" pada header modal `DpReceiptPrintModal.tsx` di kasir, yang memungkinkan pengguna mengunduh kuitansi DP dalam format PDF versi ringkas murni sebagai bukti penerimaan setoran uang muka (menghilangkan baris "Total Estimasi Nilai Kontrak SPK" dan "Sisa Estimasi Tagihan Pelunasan"), sementara tombol "Download PDF" lengkap dan "Cetak Kuitansi" tetap berfungsi normal.

## Scope

### Included
- **Task 1: Perbarui Header & Tombol Aksi di `DpReceiptPrintModal.tsx`**
  - Tambahkan tombol "Download Kuitansi Ringkas" (warna biru dengan icon `FileDown`) di sebelah kiri tombol "Download PDF" (warna hijau) dan "Cetak Kuitansi" (warna oranye).
  - Berikan styling konsisten, responsif, dan feedback loading spinner saat proses download berlangsung.
- **Task 2: Modifikasi Generator PDF & Logika Filter Baris Ringkas**
  - Update `handleDownloadPdf` untuk menerima parameter `{ isCompact?: boolean }`.
  - Berikan class identifier `.row-total-kontrak` dan `.row-sisa-tagihan` pada baris terkait di tabel rincian DP, serta dukung rendering kondisional `!isCompactMode` (melalui prop opsional `isCompact?: boolean`).
  - Pada mode compact (`isCompact: true`), bersihkan elemen `.row-total-kontrak` dan `.row-sisa-tagihan` pada `clonedDoc` di hook `onclone` html2canvas sebelum dikonversi ke PDF.
  - Berikan penamaan file yang jelas: `Kuitansi-DP-Ringkas-${spkNo}.pdf` untuk ringkas dan `Kuitansi-DP-${spkNo}.pdf` untuk lengkap.
- **Task 3: Pengujian & Verifikasi Komponen**
  - Perbarui unit test di `src/components/finance/__tests__/DpReceiptPrintModal.test.tsx` untuk memvalidasi:
    1. Keberadaan 3 tombol aksi di header modal.
    2. Aksi "Download Kuitansi Ringkas" memanggil `html2pdf` dengan filename ringkas dan memfilter baris total kontrak & sisa tagihan pada `onclone`.
    3. Aksi "Download PDF" mempertahankan 6 baris lengkap.
    4. Prop `isCompact={true}` menyembunyikan kedua baris secara kondisional dari DOM render.
  - Jalankan `npm test`, `npx oxlint`, dan `npm run build`.

### Explicitly Excluded
- Mengubah alur kerja pencatatan uang muka di kasir atau database schema.
- Mengubah fungsi cetak browser bawaan `window.print()` untuk tombol "Cetak Kuitansi".

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Perbarui Header & Tombol Aksi di `DpReceiptPrintModal.tsx` | Claude | ⬜ Todo | 0.5 |
| Task 2: Modifikasi Generator PDF & Logika Filter Baris Ringkas | Claude | ⬜ Todo | 0.5 |
| Task 3: Pengujian & Verifikasi Komponen | Claude | ⬜ Todo | 0.5 |

## Daily Log

### 2026-10-29
- Sprint 100 dibuat.
- Mengarsipkan Sprint 99 ke `.gsd/sprints/`.
- Memulai implementasi Task 1 & Task 2 pada `DpReceiptPrintModal.tsx`.
