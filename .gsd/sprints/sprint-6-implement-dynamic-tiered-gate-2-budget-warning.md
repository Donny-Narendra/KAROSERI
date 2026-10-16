# Sprint 6 — Implement Dynamic Tiered Gate 2 Budget Warning on Warehouse Mandor Requests

> **Duration**: 2026-10-15 to 2026-10-15
> **Status**: Completed

## Goal
Implement a dynamic tiered Gate 2 budget warning banner in the Warehouse Dashboard (`/warehouse` tab "Mandor Requests"). Replace the uniform yellow warning with an intelligent tiered indicator: a reassuring green banner when projected material commitment remains within the RAB quota, and a prominent red warning banner when approving the ticket would cause total material spending to exceed the RAB limit (requiring a Change Order).

## Scope

### Included
- SPK Commitment Cost Accumulation:
  - `approvedReqCost`: Total material cost of approved requisitions for the SPK.
  - `boronganMaterialCost`: Total allocated contract value/cost in active SPK Borongan (`status NOT IN ('CANCELLED', 'CUT_OFF')`) for the SPK.
  - `directIssueCost`: Total material cost issued directly via tab "Issue Material" (`inventory_transactions` where `requisition_id IS NULL` and `status != 'VOID'`) for the SPK.
  - `currentTicketCost`: Total estimated requisition cost on the open ticket (`req.totalRequisitionCost`).
  - `rabBudgetLimit`: Total material budget limit for the SPK from `rab_estimations.total_material_cost` (with fallback to sum of material `rab_items` or `spk.total_estimated_cost`).
  - Formula:
    `projectedTotal = approvedReqCost + boronganMaterialCost + directIssueCost + currentTicketCost`
    `isOverBudget = projectedTotal > rabBudgetLimit`
- Dynamic Tiered UI Banner (`RequisitionApproval.tsx`):
  - Normal / Safe State (`!isOverBudget`):
    - Style: `bg-emerald-950/40 border border-emerald-800 text-emerald-200`
    - Message: *"Pagu Gate 2 (Aman): Total permintaan saat ini (Rp {currentTicketCost}) masih berada dalam kuota RAB. Akumulasi komitmen: Rp {projectedTotal} dari total pagu Rp {rabBudgetLimit} (Sisa Pagu: Rp {rabBudgetLimit - projectedTotal})."*
    - Secondary Breakdown: Requisition Disetujui, SPK Borongan, Direct Issue.
  - Over Budget State (`isOverBudget`):
    - Style: `bg-rose-950/70 border border-rose-600 text-rose-200`
    - Message: *"PERINGATAN PAGU GATE 2 (OVER BUDGET): Menyetujui requisition ini (Rp {currentTicketCost}) akan menyebabkan total pengeluaran material (Rp {projectedTotal}) MELEBIHI pagu RAB (Rp {rabBudgetLimit}) sebesar Rp {projectedTotal - rabBudgetLimit}. Pastikan sudah ada persetujuan Change Order / SPK Tambahan dari Service Advisor sebelum menyetujui."*
    - Secondary Breakdown: Requisition Disetujui, SPK Borongan, Direct Issue.
- Actions & Modal Protection:
  - Approve button adapts with warning alert icon and amber styling when over-budget.
  - Confirmation modal (`ConfirmationModal`) prominently alerts Petugas Gudang with over-budget excess amount and Change Order notice before proceeding.
- Verification & Quality:
  - Run TypeScript build check (`npm run build`).
  - Run ESLint check (`npm run lint`).
  - Empirical verification of calculation against live database SPKs (e.g., SPK-1157, SPK-5902, RK071026-05, SPK-6633).

### Explicitly Excluded
- Changing Gate 2 hard blocking rules in `GoodsIssueForm.tsx` (already enforced).
- Modifying approval submission mechanics outside the banner and budget calculations.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Fetch and compute SPK historical commitment components (`approvedReqCost`, `boronganMaterialCost`, `directIssueCost`, `rabBudgetLimit`) in `RequisitionApproval.tsx` | Antigravity | ✅ Done | 0.5h |
| Implement dynamic tiered UI banner (Emerald for safe, Rose for over-budget) with formatted currency and exact text | Antigravity | ✅ Done | 0.25h |
| Verify reactive update on approval, filter changes, and tab switches | Antigravity | ✅ Done | 0.25h |
| Validate with TypeScript compilation (`npm run build`) and ESLint (`npm run lint`) | Antigravity | ✅ Done | 0.25h |

## Daily Log

### 2026-10-15
- Sprint 6 initialized based on user request.
- Completed and archived Sprint 5 to `.gsd/sprints/sprint-5-fix-zero-price-calculation-mandor-warehouse.md`.
- Inspected database schema and live records for SPK-1157, SPK-5902, RK071026-05:
  - Verified `rab_estimations.total_material_cost` and `rab_items`.
  - Verified `material_requisitions` (`status = 'APPROVED'` and `status = 'PENDING'`).
  - Verified `spk_borongan` (`contract_value` where status is not CANCELLED/CUT_OFF).
  - Verified `inventory_transactions` where `requisition_id IS NULL`.
- Updated `src/components/RequisitionApproval.tsx`:
  - Added `SpkBudgetData` interface and `spkBudgetMap` state.
  - In `fetchRequisitions`: parallelized concurrent queries via `Promise.all` for `rab_estimations`, `material_requisitions (APPROVED)`, `spk_borongan`, and `inventory_transactions (is null requisition_id)`.
  - Computed real commitments: `approvedReqCost`, `boronganMaterialCost`, `directIssueCost`, `currentTicketCost`, `rabBudgetLimit`.
  - Implemented dynamic tiered banner:
    - Safe state (`!isOverBudget`): emerald border and background with ShieldCheck icon, exact message text, and commitment breakdown.
    - Over-budget state (`isOverBudget`): rose border and background with AlertTriangle icon, exact warning message, and Change Order requirement reminder.
  - Enhanced Approve action button and modal dialog to flag over-budget transactions.
  - Cleaned unused object export to fix Vite fast refresh warning.
- Quality Assurance:
  - `npm run build`: Passed with 0 errors.
  - `npm run lint`: Passed with 0 errors.
  - Live database empirical verification verified exact commitments across SPK-1157, RK071026-05, SPK-5902, and SPK-6633.
