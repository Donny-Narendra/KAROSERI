# Sprint 16 — Enforce PostgreSQL Hard-Gate Trigger for SPK Billing Handover Lock (Priority 1)

> **Duration**: 2026-10-16 to 2026-10-16
> **Status**: Completed ✅

## Goal
Implement absolute PostgreSQL database trigger hard-gate enforcement on `public.spk` (`trg_enforce_handover_billing_lock`), rolling back and raising exceptions on any query attempting to update SPK status to `COMPLETED` when the associated final billing document (`final_billing`) does not exist or has an unpaid balance.

## Scope

### Included
- **Step 1: Database Migration File (`supabase/migrations/20261016030000_enforce_handover_billing_trigger.sql`)**:
  - Implement `check_spk_completion_billing_status()` PL/pgSQL function with `SECURITY DEFINER`.
  - Validate that billing document exists in `public.final_billing`.
  - Validate that payment status is `'LUNAS'`, `'PAID'`, or `total_paid >= total_bill`.
  - Attach `BEFORE UPDATE ON public.spk` trigger `trg_enforce_handover_billing_lock`.
- **Step 2: Client & Service Guard Mirror (`src/utils/billingHandoverGate.ts`)**:
  - Mirror validation logic and trigger metadata for UI and service layer checks.
- **Step 3: Empirical Vitest Test Suite (`src/utils/__tests__/billingHandoverLockTrigger.test.ts`)**:
  - Validate SQL migration semantics, trigger structure, and exception strings.
  - Test all edge cases (missing invoice, unpaid, draft, lunas, paid, non-completed transitions, already completed SPK, identifier fallback).
- **Step 4: System Verification & Documentation**:
  - Run `npm test`, `npm run lint`, and `npm run build`.
  - Update `.gsd/ARCHITECTURE.md`, `.gsd/STATE.md`, and `.gsd/SPRINT.md`.

### Explicitly Excluded
- Modifying historical completed SPK records.
- Interfering with other operational status transitions (`CANCELLED`, `ACTIVE`, `PENDING_PAYMENT`).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create PostgreSQL Migration `20261016030000_enforce_handover_billing_trigger.sql` | Antigravity | ✅ Done | 0.3h |
| 2. Implement Client-Side Validation Mirror (`billingHandoverGate.ts`) | Antigravity | ✅ Done | 0.2h |
| 3. Create Unit Test Suite (`billingHandoverLockTrigger.test.ts`) | Antigravity | ✅ Done | 0.3h |
| 4. Verify Build, Lints, and Test Pass Rates | Antigravity | ✅ Done | 0.2h |
| 5. Update Documentation & Architecture Debt Checklist | Antigravity | ✅ Done | 0.1h |

## Daily Log

### 2026-10-16
- Initialized Sprint 16 to enforce PostgreSQL hard-gate trigger for SPK billing handover lock.
- Created `supabase/migrations/20261016030000_enforce_handover_billing_trigger.sql` with `check_spk_completion_billing_status()` function and `trg_enforce_handover_billing_lock` trigger.
- Created `src/utils/billingHandoverGate.ts` reflecting the exact gate rules for client-side and service usage.
- Created `src/utils/__tests__/billingHandoverLockTrigger.test.ts` testing 10 distinct gate validation scenarios.
- Executed `npm test` (36 tests passing), `npm run lint` (0 errors), and `npm run build` (`tsc -b && vite build` passing).
- Updated `.gsd/ARCHITECTURE.md` and `.gsd/STATE.md`.
