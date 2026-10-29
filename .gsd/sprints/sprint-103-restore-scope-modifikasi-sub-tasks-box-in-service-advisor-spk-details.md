# Sprint 103 — Restore Scope Modifikasi / Sub Tasks Box in Service Advisor SPK Details

> **Duration**: 2026-10-29 to 2026-10-29
> **Status**: Completed ✓

## Goal
Mengembalikan kotak kontainer "SCOPE MODIFIKASI / SUB TASKS:" pada halaman Service Advisor (sub-bagian "SPK Details" di `SpkCredentialSection.tsx` / `SpkDetailHeader.tsx`) tepat di atas baris Dokumentasi Surat Kesepakatan Kerja, dengan parser data fleksibel yang mendukung `string[]`, string JSON, maupun delimiter teks, serta penanganan fallback informatif saat belum ada sub task yang diisi.

## Scope

### Included
- **Task 1: Audit & Kembalikan Render Kotak Sub Tasks di `SpkCredentialSection.tsx` / `SpkDetailHeader.tsx`**
  - Mengimplementasikan helper normalisasi `sub_tasks` fleksibel:
    * Mendukung `string[]` (disaring dari nilai null/kosong via `filter(Boolean)`).
    * Mendukung string JSON (diparse dengan `JSON.parse` menjadi array atau fallback).
    * Mendukung string biasa (dipisahkan baris baru `\n` atau koma `,`).
  - Mengembalikan blok JSX kontainer `SCOPE MODIFIKASI / SUB TASKS:` tepat di antara grid 6 kolom identitas kendaraan dan blok `SpkAgreementPhotos` (Dokumentasi Surat Kesepakatan Kerja).
  - Menampilkan badge tugas berstyling slate solid (`px-2.5 py-1 text-xs font-semibold bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-md shadow-sm`).
  - Menyediakan teks status fallback informatif ketika array sub task kosong: `Belum ada rincian scope modifikasi. Klik "Edit Credential" untuk menambahkan sub task.` tanpa menyembunyikan kontainer kartu.
- **Task 2: Pengujian Unit & Verifikasi Regresi**
  - Menambahkan unit test komprehensif di `src/components/__tests__/SpkForm.test.tsx` untuk menguji:
    1. Render sub tasks dari data bertipe `string[]`.
    2. Render sub tasks dari data bertipe string JSON `["Task 1", "Task 2"]`.
    3. Render sub tasks dari data string biasa dipisahkan koma/enter.
    4. Render pesan fallback saat `sub_tasks` kosong, null, atau tidak didefinisikan.
    5. Hierarki posisi kotak Scope Modifikasi berada di atas Dokumentasi Surat Kesepakatan Kerja.
  - Menjalankan test suite Vitest (76 file pengujian, 564 test lulus 100%), `npx oxlint` (0 error), dan `npm run build` (sukses).

### Explicitly Excluded
- Mengubah fungsi upload dan lightbox foto berkas kesepakatan kerja pada `SpkAgreementPhotos.tsx`.
- Mengubah skema database Supabase atau RPC backend.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Audit & Kembalikan Render Kotak Sub Tasks di `SpkCredentialSection.tsx` | Antigravity | ✅ Done | 0.3 |
| Task 2: Pengujian Unit & Verifikasi Regresi | Antigravity | ✅ Done | 0.2 |

## Daily Log

### 2026-10-29
- Sprint 103 selesai:
  1. `src/components/SpkCredentialSection.tsx`:
     - Menambahkan helper normalisasi data `parsedSubTasks` yang aman dan fleksibel untuk menangani array string, JSON string, maupun teks dengan delimiter koma atau enter.
     - Mengembalikan kontainer kartu `SCOPE MODIFIKASI / SUB TASKS:` dengan styling tema slate tegas (`bg-slate-950/60 border border-slate-800/90 rounded-lg p-3`).
     - Menyediakan teks fallback informatif `Belum ada rincian scope modifikasi. Klik "Edit Credential" untuk menambahkan sub task.` ketika data sub task belum terisi (kontainer tidak lagi menghilang).
     - Menempatkan blok Scope Modifikasi tepat di bawah grid 6 kolom identitas kendaraan dan di atas komponen `SpkAgreementPhotos` (Dokumentasi Surat Kesepakatan Kerja).
  2. `src/components/__tests__/SpkForm.test.tsx`:
     - Menambahkan 5 pengujian baru yang menguji array string, format JSON, format delimiter teks biasa, pesan fallback ketika kosong, serta penegasan urutan DOM posisi visual hierarkis.
  3. Verifikasi & Build:
     - 76 test files (564 tests) lulus 100%.
     - `npx oxlint` lulus dengan 0 error (9 warnings fast-refresh yang telah ada sebelumnya).
     - `npm run build` sukses dikompilasi tanpa kendala.

