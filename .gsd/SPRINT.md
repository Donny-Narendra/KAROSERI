# Sprint 64 — Add Completion Deadline to SPK-Borongan Assignment Form and Official Work Order Print View

> **Duration**: 2026-10-21 to 2026-10-21
> **Status**: Completed

## Goal
Menambahkan input dan penyimpanan tenggat waktu pengerjaan (deadline date) pada form penugasan SPK Borongan, menampilkannya pada kartu riwayat pekerja borongan, serta menyertakannya secara resmi pada dokumen cetak Surat Tugas Pengerjaan Borongan saat dicetak oleh mandor.

## Scope

### Included
- **Migrasi Database (`supabase/migrations/20261027010000_add_deadline_to_spk_borongan.sql`)**:
  - Menambahkan kolom `deadline_date DATE` pada tabel `public.spk_borongan` secara idempoten (`IF NOT EXISTS`).
- **TypeScript Interface Alignment (`src/types/database.ts` & `src/components/SpkBoronganPanel.tsx`)**:
  - Menambahkan properti `deadline_date?: string | null` ke tipe `SpkBoronganRecord` dan interface `SpkBorongan`.
- **UI Form "Penugasan Baru SPK-B" (`src/components/SpkBoronganPanel.tsx`)**:
  - Menambahkan state `deadlineDate` dan input type `date` dengan label "Tenggat Waktu / Tanggal Deadline Pengerjaan".
  - Menyertakan nilai `deadline_date: deadlineDate ? deadlineDate : null` saat melakukan insert ke Supabase `spk_borongan`.
  - Mereset field `deadlineDate` ke nilai kosong setelah berhasil submit.
- **UI "Riwayat Penugasan SPK-B" Card (`src/components/SpkBoronganPanel.tsx`)**:
  - Menampilkan baris "Tenggat Waktu:" pada kartu penugasan pekerja dengan format tanggal bahasa Indonesia yang rapi (contoh: "28 Oktober 2026") dan badge highlight amber dengan icon kalender, serta fallback `-` jika belum ditentukan.
- **Cetak Surat Tugas Resmi (`src/components/SpkBoronganPanel.tsx`)**:
  - Menambahkan baris "Tenggat Waktu / Deadline" di Bagian B "DETAIL PENUGASAN BORONGAN" pada template cetak HTML popup.
- **Testing & Empirical Validation**:
  - Menambahkan unit dan component tests di `src/components/__tests__/SpkBoronganPanel.test.tsx`:
    1. Render input tanggal deadline pada form penugasan baru.
    2. Verifikasi payload insert ke tabel `spk_borongan` menyertakan `deadline_date`.
    3. Verifikasi penampilan tanggal deadline pada kartu riwayat penugasan pekerja.
    4. Verifikasi tanggal deadline tercetak di dokumen Surat Tugas resmi.
  - Validasi penuh terhadap seluruh test suite Vitest (40 test suites, 267 tests passing), Oxlint (0 warning/error), validasi tipe TypeScript (`tsc -b`), dan Vite build.

### Explicitly Excluded
- Mengubah alur persetujuan material / warehouse requisition approval.
- Mengubah alur billing invoice kasir atau perhitungan biaya SPK di modul keuangan.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL Migration (`20261027010000_add_deadline_to_spk_borongan.sql`) & Update TypeScript Types | Antigravity | ✅ Done | 0.3h |
| 2. Add Deadline Date Input & Insert Logic in `SpkBoronganPanel.tsx` | Antigravity | ✅ Done | 0.5h |
| 3. Render Deadline Date on Assignment History Cards | Antigravity | ✅ Done | 0.3h |
| 4. Include Deadline Date in Work Order Print View Window | Antigravity | ✅ Done | 0.3h |
| 5. Add Comprehensive Tests in `SpkBoronganPanel.test.tsx` | Antigravity | ✅ Done | 0.5h |
| 6. Empirical Validation (Vitest test suite, Oxlint 0 warnings, TypeScript build) | Antigravity | ✅ Done | 0.3h |

## Daily Log

### 2026-10-21
- Sprint 63 archived to `.gsd/sprints/sprint-63-implement-granular-item-level-material-approval-in-warehouse-mandor-requests.md`.
- Sprint 64 created for adding completion deadline to SPK-Borongan assignment form, history cards, and official print view.
- Task 1: Created `supabase/migrations/20261027010000_add_deadline_to_spk_borongan.sql` adding column `deadline_date DATE` to `spk_borongan`. Updated `SpkBoronganRecord` in `src/types/database.ts` and `SpkBorongan` in `src/components/SpkBoronganPanel.tsx`.
- Task 2: Added `deadlineDate` state, `<input type="date" />` with label "Tenggat Waktu / Tanggal Deadline Pengerjaan", insert payload mapping, and reset logic in `SpkBoronganPanel.tsx`.
- Task 3: Added formatted deadline display with calendar icon and timezone-safe Indonesian date formatting on assignment history cards in `SpkBoronganPanel.tsx`.
- Task 4: Included "Tenggat Waktu / Deadline" row under Section B of printable work order popup in `SpkBoronganPanel.tsx`.
- Task 5: Added 3 comprehensive component/unit tests in `src/components/__tests__/SpkBoronganPanel.test.tsx` (10/10 tests passing).
- Task 6: Empirical validation complete: 40/40 test suites passing, 267/267 tests passing (100%), Oxlint 0 warnings/errors across 165 files, clean `tsc -b` compilation, and Vite build in 502ms.

## Retrospective (end of sprint)

### What Went Well
- Timezone-safe Indonesian date parsing utility avoids UTC-offset shifts regardless of user browser timezone.
- The new input seamlessly integrates with auto-filled RAB/Change-Order tasks while maintaining complete backwards compatibility.
- Official print view now includes clear contractual deadline documentation for external contractors.

### What Could Improve
- Could add deadline sorting/warning indicators if a deadline has lapsed in future sprints.

### Action Items
- None; fully complete and production-ready.

---

*Last updated: 2026-10-21*
