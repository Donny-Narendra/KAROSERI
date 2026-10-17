## Current Position
- **Sprint**: Sprint 23 — Fix Zero Labor Budget and Enable LABOR Item Entry in RAB Calculator
- **Status**: Sprint in progress 🟡
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness (Sprint active)

## Last Session Summary
Sprint 22 Completed (2026-10-17).
- Archived Sprint 22 to `.gsd/sprints/sprint-22-align-react-i18next-localization.md`.
- Expanded symmetric localization catalogs in `src/locales/id.json` and `src/locales/en.json` (11 namespaces: common, roles, auth, admin, settings, cancellations, spk, wbs, warehouse, cashier, finance).
- Built reusable, persistent `LanguageSwitcher.tsx` with segmented pill and dropdown options.
- Localized key views: `LoginPage.tsx`, `AdminDashboardPage.tsx`, and `AdminSettingsPage.tsx`.
- Created component test suite `src/components/__tests__/LanguageSwitcher.test.tsx` (5 tests passing).
- All 71 tests passing across 9 test files (`npm test`), zero TypeScript errors (`tsc -b`), zero linter errors (`npm run lint`), and clean production build (`npm run build`).

## Active Plan & Waves
Sprint 23 in progress:
- Replacing generated `item_type` column on `rab_items` with standard `VARCHAR(20) DEFAULT 'MATERIAL'`.
- Backfilling historical labor items across `rab_items` and `change_order_items`.
- Enabling explicit LABOR item entry and BOM package allocation in `RabCalculator` and `PackageAllocationModal`.
- Synchronizing labor budgets in `rab_estimations` and `view_wbs_cost_variance`.

## Blockers
None.
