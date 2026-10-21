# Sprint 67 — Dynamic Expense Categories Management for Company OPEX Logging

> **Duration**: 2026-10-21 to 2026-10-21
> **Status**: Completed ✅

## Goal
Menyediakan master kategori beban operasional dinamis `expense_categories` di database PostgreSQL dengan seeding awal 6 kategori bawaan, mengintegrasikan dropdown dinamis pada modal pencatatan OPEX, serta menghadirkan modal pengelolaan kategori (tambah pos baru, edit nama/deskripsi, dan aktif/nonaktifkan pos akun) untuk Owner dan Kasir guna mencegah bias pengeluaran di pos "Lain-lain / Tak Terduga".

## Scope

### Included
- **Database Migration (`supabase/migrations/20261029010000_create_expense_categories_table.sql`)**:
  - Pembuatan tabel master `public.expense_categories` (id UUID PK, name TEXT UNIQUE, description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at, updated_at).
  - Seeding 6 kategori awal bawaan: 'Amortisasi Sewa Tempat & Gedung', 'Gaji & Tunjangan Staf Tetap', 'Kebersihan & Keamanan (Amenities)', 'Pemeliharaan Alat & Mesin Fasilitas', 'Token Listrik & Utilitas Bengkel', 'Lain-lain / Tak Terduga'.
  - Penambahan kolom `category_id UUID REFERENCES public.expense_categories(id)` pada tabel transaksi opex dengan idempotency checks.
  - RLS policies & GRANT ALL untuk authenticated user serta SELECT untuk anon.
- **Service Layer & Data Contracts (`src/types/operatingExpenses.ts` & `src/services/operatingExpenseService.ts`)**:
  - Penambahan contract `ExpenseCategory` dengan properti `description`, `is_active`, `created_at`, `updated_at`.
  - Penambahan payload contracts: `CreateExpenseCategoryPayload` dan `UpdateExpenseCategoryPayload`.
  - Penambahan fungsi service: `getCategories(includeInactive?: boolean)`, `createCategory(payload)`, `updateCategory(id, payload)`, dan `toggleCategoryActive(id, isActive)` dengan fallback mulus ke `operating_expense_categories`.
  - Penyesuaian `financialReportsService.getOperatingExpenseCategories`.
- **Komponen Modal Pengelolaan Kategori (`src/components/finance/ExpenseCategoryManagerModal.tsx`)**:
  - Modal manajemen kategori beban dengan visual bertema RobelKaroseri industrial dark mode.
  - Pencarian / filter kategori secara live.
  - Formulir penambahan kategori baru (validasi unik & deskripsi).
  - Fitur inline edit nama & deskripsi pos beban.
  - Toggle aktif / nonaktifkan pos akun untuk mencegah penggunaan kategori lama tanpa merusak data historis.
  - Batasan otorisasi hak akses khusus role Owner dan Kasir (`useAuth`).
- **Integrasi Modal Pencatatan OPEX (`OperatingExpenseManagerModal.tsx` & `OpexLoggingModal.tsx`)**:
  - Tombol aksi `Kelola Kategori` di sebelah label dropdown Kategori Beban.
  - Dropdown hanya menyajikan kategori beban yang berstatus aktif (`is_active !== false`).
  - Sinkronisasi otomatis (auto-reload categories) saat modal kelola ditutup atau kategori baru dibuat.
  - Menyediakan file alias `OpexLoggingModal.tsx` dan `OpexExpenseModal.tsx` untuk kompatibilitas penuh.
- **Testing & Empirical Validation**:
  - Unit tests di `src/services/__tests__/operatingExpenseService.test.ts` (8/8 tests passing).
  - Component tests di `src/components/finance/__tests__/ExpenseCategoryManagerModal.test.tsx` (6/6 tests passing).
  - Component tests di `src/components/finance/__tests__/OperatingExpenseManagerModal.test.tsx` (4/4 tests passing).
  - Validasi penuh terhadap seluruh test suite Vitest (47 test suites, 315 tests passing), Oxlint (0 warning/error across 177 files), validasi tipe TypeScript (`tsc -b`), dan Vite production build (733ms).

### Explicitly Excluded
- Mengubah rumus kalkulasi COGS / HPP pada Job Order SPK.
- Menghapus transaksi historis pengeluaran OPEX yang telah tercatat sebelumnya.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Database Migration `20261029010000_create_expense_categories_table.sql` | Antigravity | ✅ Done | 0.4h |
| 2. Update Types & Service Layer in `operatingExpenseService.ts` | Antigravity | ✅ Done | 0.5h |
| 3. Create `ExpenseCategoryManagerModal.tsx` Component | Antigravity | ✅ Done | 0.8h |
| 4. Integrate Category Manager into `OperatingExpenseManagerModal.tsx` & alias `OpexLoggingModal.tsx` | Antigravity | ✅ Done | 0.5h |
| 5. Component / Unit Testing & Empirical Validation (Vitest, Oxlint, `tsc -b`, Build) | Antigravity | ✅ Done | 0.6h |

## Daily Log

### 2026-10-21
- Sprint 66 archived to `.gsd/sprints/sprint-66-implement-7-day-post-bast-expiration-for-public-progress-tracking-page.md`.
- Sprint 67 initialized: Dynamic Expense Categories Management for Company OPEX Logging.
- Task 1: Created database migration `supabase/migrations/20261029010000_create_expense_categories_table.sql` with table definition, seeding for initial 6 categories, idempotency checks for `category_id` in opex tables, and authenticated RLS permissions.
- Task 2: Updated contracts in `src/types/operatingExpenses.ts` and `src/types/financialReports.ts` (`description`, `is_active`, `CreateExpenseCategoryPayload`, `UpdateExpenseCategoryPayload`). Implemented `getCategories`, `createCategory`, `updateCategory`, and `toggleCategoryActive` in `src/services/operatingExpenseService.ts` with error handling and fallback logic.
- Task 3: Created `src/components/finance/ExpenseCategoryManagerModal.tsx` featuring real-time search, category addition, inline edit, status toggle, and role-based access for Owner/Kasir.
- Task 4: Integrated `ExpenseCategoryManagerModal` into `src/components/finance/OperatingExpenseManagerModal.tsx` with "Kelola Kategori" button, active-only category dropdown filtering, and auto-reload on mutation. Created alias `OpexLoggingModal.tsx` and consolidated `OpexExpenseModal.tsx`.
- Task 5: Added comprehensive test suites:
  - `src/services/__tests__/operatingExpenseService.test.ts` (8 tests passing)
  - `src/components/finance/__tests__/ExpenseCategoryManagerModal.test.tsx` (6 tests passing)
  - `src/components/finance/__tests__/OperatingExpenseManagerModal.test.tsx` (4 tests passing)
  - Full Vitest suite: 47/47 files passed, 315/315 tests passing (100%).
  - Oxlint: 0 warnings, 0 errors across 177 files.
  - TypeScript: Clean compilation (`tsc -b`).
  - Production build: Succeeded in 733ms (`npm run build`).

## Retrospective (end of sprint)

### What Went Well
- Master dynamic category table `expense_categories` with fallback to `operating_expense_categories` ensures zero downtime or breakage across development, test, and production environments.
- Soft-toggle activation (`is_active: false`) protects accounting historical integrity so previous OPEX transactions remain intact and valid even when pos akun categories are retired.
- Quick direct access from within the OPEX modal allows Owner and Kasir to seamlessly define ad-hoc operational expenses as recurring accounts without navigating away.

### What Could Improve
- Future enhancements could provide category color badges or icons for visual grouping in monthly financial charts.

### Action Items
- None; all features implemented, tested, and empirically verified.
