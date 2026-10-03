## Current Position
- **Phase**: 8 (Material Requisition & SPK Borongan)
- **Task**: Plan 8.5 Completed. Phase 8 is complete.
- **Status**: Active

## Last Session Summary
- Executed Plan 8.5: SPK Borongan Management. Added `SpkBoronganPanel` for assigning workers, opname fisik cut-off, and integrated it into the Mandor WBS checklist.

## In-Progress Work
- None.
- Files modified: `KasirDashboard.tsx`, `AdminDashboardPage.tsx`.
- Tests status: `npm run build` passed.

## Blockers
- None.

## Context Dump
### Decisions Made
- `material_requisitions` table added for Mandor requests.
- `spk_borongan` table added for worker assignments per WBS.
- `is_customer_supplied` boolean added to `materials` for items with zero cost.
- Running execution in Inline mode since `invoke_subagent` is not available.
- Updated costing logic across dashboards to accurately reflect Rp0 material costs for customer-supplied items.

## Next Steps
1. /execute 8.5 (to execute Plan 8.5: SPK Borongan Management)
