## Current Position
- **Sprint**: Sprint 28 — Implement Inventory-driven Auto-Suggest Search for Labor/Jasa in RAB Calculator
- **Status**: Sprint Completed ✅
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness

## Last Session Summary
Sprint 28 Completed (2026-10-17).
- Refactored `RabCalculator.tsx` to introduce inventory-driven auto-suggest search for "NAMA JASA / PEKERJAAN TUKANG".
- Applied strict keyword-based filtering (`LABOR_KEYWORDS = ['jasa', 'ongkos', 'borongan', 'tukang', 'upah', 'tenaga']` or `category === 'jasa' | 'labor'`) ensuring physical goods (e.g. steel plates, electrodes, consumables) are strictly excluded.
- Implemented full keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`), focus trigger, and click-outside dismissal for the floating auto-suggest dropdown.
- Configured selection handler to auto-fill the labor task name and default the rate (`selling_price || cost_price || unit_price`), while preserving Service Advisor flexibility to modify the cost or enter custom non-catalog work names.
- Expanded `RabCalculatorLabor.test.tsx` with dedicated unit tests validating keyword filtering, physical item exclusion, rate auto-fill, and fallback prompts.
- Successfully verified 94/94 Vitest tests passing, 0 linter errors, and clean production build.

## Blockers
None.
