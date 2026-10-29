# Sprint 101 — Reposition Agreement Document Delete Button Below Image Thumbnail with Confirmation Modal

> **Duration**: 2026-10-29 to 2026-10-29
> **Status**: Completed ✓

## Goal
Tingkatkan ergonomi UX pada galeri foto Surat Kesepakatan Kerja di Service Advisor (`SpkAgreementPhotos.tsx`) dengan memisahkan tombol aksi hapus dari thumbnail foto ke baris mandiri di bawah masing-masing gambar dalam susunan vertical card stack, membersihkan overlay mengambang (*floating overlay*) di atas gambar agar thumbnail murni berfungsi untuk pratinjau zoom/lightbox yang aman disentuh pada perangkat layar sentuh/mobile, serta memproteksi penghapusan berkas melalui `ConfirmationModal` internal.

## Scope

### Included
- **Task 1: Pemisahan Tata Letak Kartu Vertikal (Card Stack) & Tombol Hapus Mandiri di `SpkAgreementPhotos.tsx`**
  - Bersihkan tombol silang/sampah yang melayang (*floating overlay*) di atas gambar/thumbnail.
  - Alokasikan seluruh area thumbnail murni sebagai safe touch target interaksi pratinjau zoom/lightbox (`onClick` lightbox, hover visual indicator `Eye`).
  - Rancang susunan kartu vertikal (`w-24 sm:w-28 md:w-32 flex flex-col bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-xs hover:border-slate-700 transition`) dengan kontainer baris bawah terpisah (`border-t border-slate-800`).
  - Di baris bawah, sediakan tombol "Hapus" mandiri dengan ikon `Trash2`, label teks `"Hapus"`, safe touch padding, dan status disable/loading.
  - Untuk mode `readOnly`, tampilkan label nomor foto subtle tanpa tombol aksi interaktif.
- **Task 2: Integrasi Dialog Modal Konfirmasi Pengaman & Mutasi Data**
  - Pasang state `photoToDeleteIndex: number | null` dan `isDeleting: boolean`.
  - Pasang `ConfirmationModal` dengan `title="Hapus Dokumen Kesepakatan?"`, `confirmText="Ya, Hapus Dokumen"`, `cancelText="Batal"`, `variant="danger"`.
  - Pada saat konfirmasi, lakukan penghapusan item dari array `agreement_photos` berdasarkan index dan mutasikan pembaruan ke Supabase via `spkService.updateAgreementPhotos(spk.spk_no, updatedPhotos)`.
  - Panggil callback `onUpdated()` dan tangani pembatalan secara bersih (`setPhotoToDeleteIndex(null)`).
- **Task 3: Pengujian Komponen & Verifikasi Menyeluruh**
  - Perbarui dan tambah pengujian di `src/components/spk/__tests__/SpkAgreementPhotos.test.tsx` untuk memvalidasi:
    1. Area thumbnail murni untuk pratinjau lightbox tanpa floating delete overlay.
    2. Tombol hapus terpisah di baris bawah kartu dengan label "Hapus" dan ikon trash.
    3. Dialog konfirmasi modal terbuka saat tombol hapus diklik, dan tombol batal menutup modal tanpa menghapus.
    4. Konfirmasi modal memicu pembaruan `spkService.updateAgreementPhotos` dengan array foto yang telah dihapus dan memanggil `onUpdated`.
    5. Mode readOnly menyembunyikan tombol hapus dan tombol unggah.
  - Jalankan test suite (76 test suites, 556 tests passed), linter (`npx oxlint`), dan type check/build (`npm run build`).

### Explicitly Excluded
- Mengubah skema database PostgreSQL `spk.agreement_photos`.
- Mengubah alur otentikasi atau upload direct-to-Cloudinary yang telah berjalan optimal.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Pemisahan Tata Letak Kartu Vertikal & Tombol Hapus Mandiri di `SpkAgreementPhotos.tsx` | Antigravity | ✅ Done | 0.5 |
| Task 2: Integrasi Dialog Modal Konfirmasi Pengaman & Mutasi Data | Antigravity | ✅ Done | 0.5 |
| Task 3: Pengujian Komponen & Verifikasi Menyeluruh | Antigravity | ✅ Done | 0.5 |

## Daily Log

### 2026-10-29
- Sprint 101 selesai:
  1. `src/components/spk/SpkAgreementPhotos.tsx`:
     - Menghapus floating gradient overlay yang sebelumnya menumpuk di atas thumbnail foto.
     - Menyusun setiap item dokumen menjadi vertical card stack (`w-24 sm:w-28 md:w-32`) dengan 2 zona interaksi terpisah:
       * **Zona Atas (Thumbnail)**: Murni klik untuk membuka pratinjau penuh/lightbox modal dengan visual indicator `Eye` pada hover.
       * **Zona Bawah (Tombol Aksi Terpisah)**: Baris mandiri berlatar `bg-slate-900/90 border-t border-slate-800` berisi tombol "Hapus" yang jelas, terisolasi, dan aman untuk sentuhan jari (`text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-600 hover:text-white`).
     - Menambahkan proteksi `ConfirmationModal` dengan judul `"Hapus Dokumen Kesepakatan?"`, pesan peringatan permanen, tombol `"Ya, Hapus Dokumen"`, dan tombol `"Batal"`.
     - Penghapusan foto diproteksi berdasarkan indeks kartu dan memutasi database via `spkService.updateAgreementPhotos(spk.spk_no, updatedPhotos)` hanya setelah pengguna menyetujui konfirmasi di modal.
     - Mode `readOnly` mempertahankan proporsi kartu dengan menampilkan label nomor berkas subtle tanpa tombol hapus.
  2. `src/components/spk/__tests__/SpkAgreementPhotos.test.tsx`:
     - Memperbarui dan memverifikasi isolasi area preview gambar dari tombol hapus.
     - Memverifikasi tombol hapus terpisah di baris bawah kartu.
     - Menguji pembukaan modal konfirmasi, penolakan/pembatalan (`Batal`), dan persetujuan penghapusan (`Ya, Hapus Dokumen`).
     - Menguji mode `readOnly` dan direct upload.
  3. Verifikasi:
     - 76 berkas pengujian Vitest (556 tests) lulus 100%.
     - `npx oxlint` lulus dengan 0 errors.
     - `npm run build` sukses tanpa kendala.

