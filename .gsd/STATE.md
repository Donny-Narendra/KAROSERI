## Current Position
- **Phase**: 12 (completed)
- **Task**: All tasks complete
- **Status**: Verified

## Last Session Summary
Phase 12 executed successfully. 1 plan, 1 task completed. Fitur penyelarasan nama kolom database pada template excel berhasil diimplementasikan.

## In-Progress Work
- None.

## Blockers
- None.

## Context Dump
### Decisions Made
- Used Supabase's `in` delete clause with Postgres FK error catching (`23503`) to reject deletion if materials are referenced elsewhere.
- Kept the UI in sync with table filtering and checkall/uncheckall patterns.
- Extracted RecentMaterialIssues into its own component for modularity.
- Implemented robust UI for editing `custom_unit_price` and reflecting real costs in Kasir and Admin dashboards.
- Modifikasi format ekspor XLSX untuk menyertakan row ke-2 yang memuat nama kunci database.
- Parser import diperbarui untuk menangani baik row label teks UI maupun kunci database, serta melewati (skip) nama kunci tersebut.

### Files of Interest
- `src/utils/excelExport.ts`
- `src/components/ImportInventoryModal.tsx`

## Next Steps
1. /complete-milestone — Complete the milestone since all current roadmap phases are done.
