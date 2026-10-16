# Sprint 22 — Localization Alignment (`react-i18next` Alignment)

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Resolve the final technical debt item in the codebase by aligning `react-i18next` localization. Expand translation catalogs (`id.json` & `en.json`) with symmetric enterprise dictionaries covering all workshop roles, create an interactive `LanguageSwitcher` component, integrate multi-language toggling into key views (`LoginPage`, `AdminDashboardPage`, `AdminSettingsPage`), and verify with automated tests.

## Scope

### Included
- **Translation Catalogs (`src/locales/id.json` & `src/locales/en.json`)**:
  - Build comprehensive, symmetric localization dictionaries across namespaces:
    - `common` (Actions, buttons, dialogs, feedback, pagination)
    - `auth` (Login form, credentials, terminal release, security badges)
    - `roles` (Owner, Service Advisor, Mandor, Petugas Gudang, Kasir, Public)
    - `admin` (Executive KPIs, WIP, Bay metrics, SPK monitoring, change orders)
    - `settings` (User management, workshop config, financial parameters, database)
    - `spk` (SPK lifecycle, status, vehicle credentials, cancellation audit)
    - `wbs` (7 stages of fabrication, quality control, borongan labor)
    - `warehouse` (Inventory catalog, goods issue, requisitions, returns)
    - `cashier` (Down payment, settlement invoices, handover lock, BAST)
    - `finance` (Executive summary, COGS breakdown, margin analysis, sanity audit)
- **Reusable Component (`src/components/LanguageSwitcher.tsx`)**:
  - Quick language toggle button / dropdown with Globe icon.
  - Seamless switching between Indonesian (`id`) and English (`en`).
  - Active language highlighting and persistence in browser `localStorage`.
- **UI Integration**:
  - `src/pages/LoginPage.tsx`: Header language switcher, translated left panel and terminal login form.
  - `src/pages/AdminDashboardPage.tsx`: Top bar language toggle, translated KPI titles, table headers, and tab labels.
  - `src/pages/AdminSettingsPage.tsx`: Synchronized system preferences language select.
- **Automated Tests (`src/components/__tests__/LanguageSwitcher.test.tsx`)**:
  - Unit & component tests for language switcher rendering, click handling, language change emission, and translation resolution.
- **Verification & Documentation**:
  - `npx tsc -b` clean compile.
  - `npm run lint` 0 errors.
  - `npm test` 100% pass across all test suites (71/71 tests passing).
  - `npm run build` production bundle success.
  - Update `.gsd/ARCHITECTURE.md` resolving the "Localization Alignment" technical debt.

### Explicitly Excluded
- Database-stored text content (e.g. user-entered custom customer names or vehicle plate values).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Expand `src/locales/id.json` and `src/locales/en.json` with comprehensive symmetric catalogs | Antigravity | ✅ Done | 0.5h |
| 2. Create `LanguageSwitcher.tsx` component with persistence | Antigravity | ✅ Done | 0.3h |
| 3. Integrate localization into `LoginPage.tsx`, `AdminDashboardPage.tsx`, and `AdminSettingsPage.tsx` | Antigravity | ✅ Done | 0.5h |
| 4. Create automated component tests in `LanguageSwitcher.test.tsx` | Antigravity | ✅ Done | 0.3h |
| 5. Validate full test suite, linting, build, and resolve technical debt in ARCHITECTURE.md | Antigravity | ✅ Done | 0.2h |

## Daily Log

### 2026-10-17
- Archived Sprint 21 to `.gsd/sprints/sprint-21-implement-audit-log-monitoring-for-cancelled-spks.md`.
- Initialized Sprint 22: Localization Alignment (`react-i18next` Alignment).
- Created symmetric translation catalogs in `src/locales/id.json` and `src/locales/en.json` spanning 11 namespaces (`common`, `roles`, `auth`, `admin`, `settings`, `cancellations`, `spk`, `wbs`, `warehouse`, `cashier`, `finance`).
- Developed reusable, persistent `LanguageSwitcher.tsx` supporting both segmented pill button and dropdown variants.
- Integrated `LanguageSwitcher` and localized string mappings into `LoginPage.tsx`, `AdminDashboardPage.tsx`, and `AdminSettingsPage.tsx`.
- Created component test suite `src/components/__tests__/LanguageSwitcher.test.tsx` (5 tests passing).
- Verified full test suite (`npm test`, 71/71 tests passing across 9 test files).
- Verified TypeScript compilation (`npx tsc -b`) and linter (`npm run lint`, 0 errors).
- Validated production build (`npm run build`).
- Marked Localization Alignment as resolved in `.gsd/ARCHITECTURE.md` and updated `.gsd/STACK.md`.
