# Sprint 19 — Clean Up Orphaned Backend Dependencies and Dead Scripts (Priority 4)

> **Duration**: 2026-10-17 to 2026-10-17
> **Status**: Completed ✅

## Goal
Purge obsolete and unused backend dependencies (`express`, `cors`, `multer`, `pg`, `@types/express`, `@types/cors`, `@types/multer`) and the dead `"server": "tsx server/index.ts"` script from `package.json` to reflect the pure client-first Supabase BaaS architecture, reduce package footprint, and eliminate architectural technical debt.

## Scope

### Included
- **Package Purge**:
  - Uninstalled `express`, `cors`, `multer`, `pg`.
  - Uninstalled devDependencies `@types/express`, `@types/cors`, `@types/multer`.
  - Removed 103 transitive packages from `node_modules` and pruned `package-lock.json`.
- **Scripts & Files Cleanup**:
  - Removed `"server": "tsx server/index.ts"` from `package.json`.
  - Removed obsolete scratch script `apply_rls.js`.
- **Documentation & Architecture Alignment**:
  - Updated `.gsd/ARCHITECTURE.md` resolving the "Orphaned Backend Dependencies" technical debt item.
  - Updated `.gsd/STACK.md` updating production (16) and development (17) dependencies inventory.
  - Updated `.gsd/STATE.md` with sprint progress and baseline status.
- **Verification**:
  - Run full test suite (`npm test`: 60/60 tests passing across 7 suites).
  - Run linter (`npm run lint`: 0 errors).
  - Run production build (`npm run build`: bundled cleanly with 0 errors).

### Explicitly Excluded
- Modifying Supabase Edge Functions in `supabase/functions/` (which run on Deno).
- Changing active client-side packages (`@supabase/supabase-js`, `xlsx`, `jspdf`, `lucide-react`, etc.).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Remove dead `"server"` script from `package.json` | Antigravity | ✅ Done | 0.1h |
| 2. Uninstall orphaned backend packages via npm | Antigravity | ✅ Done | 0.2h |
| 3. Validate test suite, linting, and production build | Antigravity | ✅ Done | 0.2h |
| 4. Update ARCHITECTURE.md, STACK.md, and STATE.md | Antigravity | ✅ Done | 0.1h |

## Daily Log

### 2026-10-17
- Initialized Sprint 19 to clean up orphaned backend dependencies and dead scripts.
- Archived Sprint 18 to `.gsd/sprints/sprint-18-implement-component-level-testing-with-react-testing-library.md`.
- Uninstalled `express`, `cors`, `multer`, `pg`, `@types/express`, `@types/cors`, `@types/multer` (103 packages removed).
- Removed dead `"server": "tsx server/index.ts"` script from `package.json`.
- Removed obsolete `apply_rls.js` script.
- Verified test suite (`npm test`: 60 tests passing across 7 files).
- Verified linter (`npm run lint`: 0 errors).
- Verified production build (`npm run build`: `tsc -b && vite build` passing).
- Updated `.gsd/ARCHITECTURE.md`, `.gsd/STACK.md`, and `.gsd/STATE.md`.
