## Current Position
- **Phase**: 6
- **Task**: Planning complete
- **Status**: Ready for execution

## Last Session Summary
Resolved two critical bugs found during the Milestone Gap Analysis:
1. Fixed `22P02` enum error in Mandor Terminal caused by lowercase 'active' status filtering.
2. Fixed Actual Costing calculation in Kasir Dashboard where material/labor cost was returning 0. It now falls back to estimated costs from `rab_estimations` or root `spk`. Added validation and button states for Generate Final Bill and Mark as Paid.

## In-Progress Work
- None.

## Blockers
- None.

## Context Dump
### Current State
- The application handles SPK/RAB, inventory, QC, billing, and now features a fully functional Mandor Dashboard for tracking WBS checklist and QC inspections directly from the workshop floor.
- Kasir dashboard successfully generates final bills with fallback logic if actual materials haven't been issued from inventory.

## Next Steps
1. /execute 6
