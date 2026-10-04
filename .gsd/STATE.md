## Current Position
- **Phase**: 12 (Planning)
- **Task**: Plan created
- **Status**: Ready for execution

## Last Session Summary
Phase 11 executed successfully. 1 plan, 1 task completed. Fitur Void Issue dan Custom Unit Price pada tabel Recent Material Issues berhasil diimplementasikan. Phase 12 plan added for Excel Column Alignment.

## In-Progress Work
- Phase 12: Penyelarasan Nama Kolom Database pada Download Template Excel Material Inventaris

## Blockers
- None.

## Context Dump
### Decisions Made
- Used Supabase's `in` delete clause with Postgres FK error catching (`23503`) to reject deletion if materials are referenced elsewhere.
- Kept the UI in sync with table filtering and checkall/uncheckall patterns.
- Extracted RecentMaterialIssues into its own component for modularity.
- Implemented robust UI for editing `custom_unit_price` and reflecting real costs in Kasir and Admin dashboards.
- Created Plan 12.1 for aligning Excel download columns with database fields.

### Files of Interest
- `src/utils/excelExport.ts`
- `src/components/InventoryManager.tsx`
- `src/components/ImportInventoryModal.tsx`

## Next Steps
1. Run /execute 12 to implement Excel Column Alignment.
