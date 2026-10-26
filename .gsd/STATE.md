## Current Position
- **Sprint**: Sprint 99 — Fix Missing SPK in Cashier Pending DP Queue Due to Draft Status or Vehicle Grouping
- **Status**: Sprint completed ✓
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
- Sprint 98 archived to `.gsd/sprints/sprint-98-fix-kpi-margin-badge-overflow-on-desktop-viewport-in-executive-dashboard.md`.
- Sprint 99 completed:
  * Implemented `fetchPendingDpSpk` in `src/services/billingService.ts` querying `spk` where `status IN ('DRAFT', 'PENDING_PAYMENT')` and `dp_amount.is.null,dp_amount.eq.0`.
  * Refactored `KasirDashboard.tsx`:
    - Removed `s.allocationStatus !== 'PARTIAL'` filter which excluded DRAFT SPKs that had partial allocations (e.g. SPK-4417).
    - Updated `displayedSpks` to filter `(DRAFT_STATUSES as readonly string[]).includes(s.status) && Number(s.dpAmount || 0) === 0`.
    - Maintained unique identification purely by Primary Key `id` / `dbId` and `spk_no`, ensuring distinct SPKs sharing the same customer and plate (e.g. SPK-4417 and SPK-9519) appear side-by-side without deduplication or grouping.
  * Enhanced `DownPaymentModal.tsx` `contractTotal` check with resilient fallbacks.
  * Added unit tests in `src/services/__tests__/billingService.test.ts` and regression tests in `src/pages/__tests__/KasirDashboardDpHistory.test.tsx`.
  * Verified all 73 Vitest suites (533 tests) passed.
  * `npx oxlint` passed with 0 errors.
  * `npm run build` compiled successfully without errors.

## Next Up
- Sprint 99 ready to close or proceed with next request.
