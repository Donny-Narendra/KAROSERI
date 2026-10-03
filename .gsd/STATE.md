## Current Position
- **Phase**: 8 (Material Requisition & SPK Borongan)
- **Task**: Bug fix for Goods Issue dropdown
- **Status**: Active (resumed 2026-10-03T16:59:41+07:00)

## Last Session Summary
- Fixed `GoodsIssueForm.tsx` and `GoodsReturnForm.tsx` to correctly fetch ACTIVE SPKs and specific columns.
- Added RLS policies for `petugas_gudang` to access `spk`, `materials`, `rab_estimations`, and `rab_items`.

## In-Progress Work
- None.

## Blockers
- None.

## Context Dump
### Decisions Made
- Replaced `.neq('status', 'CANCELLED')` with `.eq('status', 'ACTIVE')` in dropdowns.
- Created `20261003000007_warehouse_rls_policies.sql`.

### Files of Interest
- `src/components/GoodsIssueForm.tsx`
- `src/components/GoodsReturnForm.tsx`
- `supabase/migrations/20261003000007_warehouse_rls_policies.sql`

## Next Steps
1. The user must manually apply `20261003000007_warehouse_rls_policies.sql` in Supabase SQL Editor.
2. Review the system and run `/complete-milestone` to archive the current milestone.
3. Plan next milestone with `/new-milestone` if applicable.
