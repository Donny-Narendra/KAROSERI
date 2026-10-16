# Sprint 7 — Enable Warehouse Operations on Service Advisor Portal with Audit Logging

> **Duration**: 2026-10-16 to 2026-10-17
> **Status**: In Progress

## Goal
Enable Service Advisor (SA) with backup operational authority to execute core warehouse activities (Issue Material directly to SPK, Return Material, and Mandor Requisition verification & approval) from the Service Advisor portal, enforced with complete audit trails (`user_id`, `user_name`, `user_role`, `timestamp`, and execution context notes) and aligned database schema and RLS policies.

## Scope

### Included
- **Database Schema & Audit Logging**:
  - Add audit columns to `inventory_transactions`:
    - `issued_by_user_id` UUID REFERENCES auth.users(id)
    - `issued_by_name` VARCHAR(100)
    - `issued_by_role` VARCHAR(50)
    - `audit_notes` TEXT
    - `processed_by_user_id` UUID REFERENCES auth.users(id)
    - `processed_by_name` VARCHAR(100)
    - `processed_by_role` VARCHAR(50)
  - Add audit columns to `material_requisitions`:
    - `approved_by_user_id` UUID REFERENCES auth.users(id)
    - `approved_by_name` VARCHAR(100)
    - `approved_by_role` VARCHAR(50)
    - `approved_at` TIMESTAMPTZ
    - `audit_notes` TEXT
  - Provide table/view aliases `material_issues`, `material_returns`, and `mandor_requisitions` with identical audit columns to ensure full compatibility with SQL specifications.
  - Create migration script in `supabase/migrations/20261016_enable_sa_warehouse_ops_audit.sql` and apply via database client.
- **Row Level Security (RLS) Synchronization**:
  - Allow `service_advisor` role to INSERT, UPDATE, SELECT on `inventory_transactions`.
  - Allow `service_advisor` role to UPDATE stock on `materials` for issue/return adjustments.
  - Verify and ensure complete access for `service_advisor` on `material_requisitions` and `material_requisition_items`.
- **Component Audit Logging Instrumentation**:
  - `GoodsIssueForm.tsx`: Capture `user.id`, `profile.full_name`, `profile.role`, and automatic `audit_notes` (e.g. "Diproses oleh Service Advisor (Backup Gudang)").
  - `GoodsReturnForm.tsx`: Capture `user.id`, `profile.full_name`, `profile.role`, and automatic `audit_notes`.
  - `RequisitionApproval.tsx`: Capture `approved_by_user_id`, `approved_by_name`, `approved_by_role`, `approved_at`, `audit_notes`, and propagate executor details into `inventory_transactions`.
- **Service Advisor Portal Integration**:
  - In `ServiceAdvisorDashboard.tsx`, expand navigation to support Warehouse Backup Operations:
    - Tab "Operasional Gudang (Backup)" featuring Issue Material, Return Material, Mandor Requests with pending counter, and Warehouse Audit Trail.
    - Banner/indicator alerting that operations are logged under the SA's identity with backup accountability.
- **Verification & QA**:
  - Verify TypeScript compilation (`npm run build`).
  - Verify ESLint check (`npm run lint`).
  - Test transactions and verify audit fields in Supabase / PostgreSQL.

### Explicitly Excluded
- Changing Gate 2 budget calculations or validation rules.
- Modifying inventory pricing logic outside audit metadata.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Create and execute PostgreSQL migration for audit logging schema and RLS policies | Antigravity | ⬜ Todo | 0.5h |
| Instrument `GoodsIssueForm.tsx` and `GoodsReturnForm.tsx` with audit metadata | Antigravity | ⬜ Todo | 0.5h |
| Instrument `RequisitionApproval.tsx` with approver audit trail and transaction metadata | Antigravity | ⬜ Todo | 0.5h |
| Integrate Warehouse Operations tab and backup execution UI in `ServiceAdvisorDashboard.tsx` | Antigravity | ⬜ Todo | 0.5h |
| Verify TypeScript compilation (`npm run build`), ESLint (`npm run lint`), and empirical database validation | Antigravity | ⬜ Todo | 0.5h |

## Daily Log

### 2026-10-16
- Sprint 7 initialized based on user request.
- Completed and archived Sprint 6 to `.gsd/sprints/sprint-6-implement-dynamic-tiered-gate-2-budget-warning.md`.
- Analyzed existing database schema, RLS policies, and warehouse components.
- Identified missing RLS write permissions for `service_advisor` on `inventory_transactions` and `materials`.
