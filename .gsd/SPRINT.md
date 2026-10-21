# Sprint 67 — Dynamic Expense Categories Management for Company OPEX Logging

> **Duration**: 2026-10-21 to 2026-10-21
> **Status**: In Progress 🟡

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
  - Penambahan fungsi service: `getCategories(includeInactive?: boolean)`, `createCategory(payload)`, `updateCategory(id, payload)`, dan `toggleCategoryActive(id, isActive)`.
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
  - Menyediakan file alias `OpexLoggingModal.tsx` untuk kompatibilitas penuh.
- **Testing & Empirical Validation**:
  - Unit tests untuk `operatingExpenseService` category methods.
  - Component tests untuk `ExpenseCategoryManagerModal.tsx` (render, add, edit, toggle).
  - Component tests untuk `OperatingExpenseManagerModal.tsx` (dropdown dynamic loading, button trigger).
  - Validasi penuh terhadap seluruh test suite Vitest, Oxlint (0 errors/warnings), TypeScript compilation (`tsc -b`), dan Vite build.

### Explicitly Excluded
- Mengubah rumus kalkulasi COGS / HPP pada Job Order SPK.
- Menghapus transaksi historis pengeluaran OPEX yang telah tercatat sebelumnya.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Database Migration `20261029010000_create_expense_categories_table.sql` | Antigravity | ⬜ Todo | 0.4h |
| 2. Update Types & Service Layer in `operatingExpenseService.ts` | Antigravity | ⬜ Todo | 0.5h |
| 3. Create `ExpenseCategoryManagerModal.tsx` Component | Antigravity | ⬜ Todo | 0.8h |
| 4. Integrate Category Manager into `OperatingExpenseManagerModal.tsx` & alias `OpexLoggingModal.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 5. Component / Unit Testing & Empirical Validation (Vitest, Oxlint, `tsc -b`, Build) | Antigravity | ⬜ Todo | 0.6h |

## Daily Log

### 2026-10-21
- Sprint 66 archived to `.gsd/sprints/sprint-66-implement-7-day-post-bast-expiration-for-public-progress-tracking-page.md`.
- Sprint 67 initialized: Dynamic Expense Categories Management for Company OPEX Logging.
