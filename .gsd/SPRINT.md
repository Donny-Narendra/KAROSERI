# Sprint 64 — Add Completion Deadline to SPK-Borongan Assignment Form and Official Work Order Print View

> **Duration**: 2026-10-21 to 2026-10-22
> **Status**: In Progress

## Goal
Menambahkan input dan penyimpanan tenggat waktu pengerjaan (deadline date) pada form penugasan SPK Borongan, menampilkannya pada kartu riwayat pekerja borongan, serta menyertakannya secara resmi pada dokumen cetak Surat Tugas Pengerjaan Borongan saat dicetak oleh mandor.

## Scope

### Included
- **Migrasi Database (`supabase/migrations/20261027010000_add_deadline_to_spk_borongan.sql`)**:
  - Menambahkan kolom `deadline_date DATE` pada tabel `public.spk_borongan` secara idempoten (IF NOT EXISTS).
- **TypeScript Interface Alignment (`src/types/database.ts` & `src/components/SpkBoronganPanel.tsx`)**:
  - Menambahkan properti `deadline_date?: string | null` ke tipe `SpkBoronganRecord` / interface `SpkBorongan`.
- **UI Form "Penugasan Baru SPK-B" (`src/components/SpkBoronganPanel.tsx`)**:
  - Menambahkan state `deadlineDate` dan input type `date` dengan label "Tenggat Waktu / Tanggal Deadline Pengerjaan".
  - Menyertakan nilai `deadline_date` saat melakukan insert ke Supabase `spk_borongan`.
  - Mereset field `deadlineDate` ke nilai kosong setelah berhasil submit.
- **UI "Riwayat Penugasan SPK-B" Card (`src/components/SpkBoronganPanel.tsx`)**:
  - Menampilkan informasi batas tenggat waktu pengerjaan pada kartu penugasan pekerja dengan format tanggal bahasa Indonesia yang rapi (contoh: "Tenggat: 28 Okt 2026" atau "Deadline: 28 Oktober 2026").
- **Cetak Surat Tugas Resmi (`src/components/SpkBoronganPanel.tsx`)**:
  - Menambahkan baris "Tenggat Waktu / Target Selesai" di Bagian B "DETAIL PENUGASAN BORONGAN" pada template cetak HTML window.
- **Testing & Empirical Validation**:
  - Menambahkan unit dan component tests di `src/components/__tests__/SpkBoronganPanel.test.tsx`:
    1. Render input tanggal deadline pada form penugasan baru.
    2. Verifikasi payload insert ke tabel `spk_borongan` menyertakan `deadline_date`.
    3. Verifikasi penampilan tanggal deadline pada kartu riwayat penugasan pekerja.
    4. Verifikasi tanggal deadline tercetak di dokumen Surat Tugas.
  - Validasi penuh terhadap seluruh test suite Vitest, Oxlint (0 warning/error), validasi tipe TypeScript (`tsc -b`), dan Vite build.

### Explicitly Excluded
- Mengubah alur persetujuan material / warehouse requisition approval.
- Mengubah alur billing invoice kasir atau perhitungan biaya SPK di modul keuangan.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL Migration (`20261027010000_add_deadline_to_spk_borongan.sql`) & Update TypeScript Types | Antigravity | ⬜ Todo | 0.3h |
| 2. Add Deadline Date Input & Insert Logic in `SpkBoronganPanel.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 3. Render Deadline Date on Assignment History Cards | Antigravity | ⬜ Todo | 0.3h |
| 4. Include Deadline Date in Work Order Print View Window | Antigravity | ⬜ Todo | 0.3h |
| 5. Add Comprehensive Tests in `SpkBoronganPanel.test.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 6. Empirical Validation (Vitest test suite, Oxlint 0 warnings, TypeScript build) | Antigravity | ⬜ Todo | 0.3h |

## Daily Log

### 2026-10-21
- Sprint 63 archived to `.gsd/sprints/sprint-63-implement-granular-item-level-material-approval-in-warehouse-mandor-requests.md`.
- Sprint 64 created for adding completion deadline to SPK-Borongan assignment form, history cards, and official print view.

## Risks & Blockers

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing SPK-B records have NULL `deadline_date` | Low | Gracefully handle NULL/empty `deadline_date` with fallback "-" or omission in UI/print |
| User input date timezone shift | Low | Treat YYYY-MM-DD standard date string consistently |

---

*Last updated: 2026-10-21*
