# Sprint 99 — Fix Missing SPK in Cashier Pending DP Queue Due to Draft Status or Vehicle Grouping

> **Duration**: 2026-10-26 to 2026-10-26
> **Status**: Completed ✓

## Goal
Ensure the Cashier "Menunggu DP" queue in `KasirDashboard.tsx` and `billingService.ts` displays ALL active/pending SPKs that have not paid DP (`status IN ('DRAFT', 'PENDING_PAYMENT')` with `dp_amount = 0`), identified purely by Primary Key `id` / `spk_no` without being filtered out by partial allocation status or vehicle grouping.

## Scope

### Included
- **Task 1: Perbaiki Kueri & Layanan Antrean Menunggu DP di `billingService.ts`**
  - Implement `fetchPendingDpSpk` function querying `spk` table with `.in('status', ['DRAFT', 'PENDING_PAYMENT'])`, `.or('dp_amount.is.null,dp_amount.eq.0')`, and `.order('created_at', { ascending: false })`.
  - Export typescript interfaces (`PendingDpSpkRecord`) and error resilient handling.
- **Task 2: Perbaiki Tampilan Antrean Menunggu DP di `KasirDashboard.tsx`**
  - Remove restrictive `s.allocationStatus !== 'PARTIAL'` filter from `displayedSpks` in "Menunggu DP".
  - Filter "Menunggu DP" strictly by `DRAFT_STATUSES.includes(s.status) && Number(s.dpAmount || 0) === 0`.
  - Ensure SPKs are rendered uniquely by primary key (`id` / `dbId` and `spk_no`), allowing multiple distinct SPKs for the same customer/vehicle plate (e.g. SPK-4417 and SPK-9519) to display independently.
- **Task 3: Testing & Verification**
  - Add comprehensive unit tests in `src/services/__tests__/billingService.test.ts` for `fetchPendingDpSpk`.
  - Add regression tests in `src/pages/__tests__/KasirDashboardDpHistory.test.tsx` verifying:
    * DRAFT SPK with partial allocation status appears in "Menunggu DP".
    * Distinct SPKs sharing the same vehicle plate appear side-by-side without deduplication or grouping.
  - Run full test suite (73 test files, 533 tests passing), linter (`npx oxlint`), and production build (`npm run build`).

### Explicitly Excluded
- Modifying SPK creation logic in Service Advisor.
- Changing final billing or invoice generation workflow.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Perbaiki Kueri & Layanan Antrean Menunggu DP di `billingService.ts` | Claude | ✅ Done | 0.5 |
| Task 2: Perbaiki Tampilan Antrean Menunggu DP di `KasirDashboard.tsx` | Claude | ✅ Done | 0.5 |
| Task 3: Testing & Verification | Claude | ✅ Done | 0.5 |

## Daily Log

### 2026-10-26
- Sprint 99 completed.
- Solved missing SPK in Cashier "Menunggu DP" queue:
  1. `src/services/billingService.ts`: Added and exported `fetchPendingDpSpk()` with `PendingDpSpkRecord` interface, querying `spk` table with `.in('status', ['DRAFT', 'PENDING_PAYMENT'])` and `.or('dp_amount.is.null,dp_amount.eq.0')`.
  2. `src/pages/KasirDashboard.tsx`:
     - Removed restrictive `s.allocationStatus !== 'PARTIAL'` filter which previously masked DRAFT SPKs with partial WBS allocations (such as SPK-4417).
     - Defined module-level constant `DRAFT_STATUSES = ['DRAFT', 'PENDING_PAYMENT']` and updated `displayedSpks` to filter `(DRAFT_STATUSES as readonly string[]).includes(s.status) && Number(s.dpAmount || 0) === 0`.
     - Preserved unique identification via Primary Key `id` / `dbId` and `spk_no`, ensuring distinct SPKs sharing the same customer and plate (e.g. SPK-4417 and SPK-9519) render independently.
  3. `src/components/DownPaymentModal.tsx`: Broadened `contractTotal` fallback to inspect `suggestedAmount`, `spk.totalCost`, `spk.totalEstimatedCost`, and `spk.quotationAmount`.
  4. Added unit and regression tests in `src/services/__tests__/billingService.test.ts` and `src/pages/__tests__/KasirDashboardDpHistory.test.tsx`.
  5. Verified all 73 test suites (533 tests) pass, oxlint reports 0 errors, and `npm run build` succeeds.
