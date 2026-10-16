# Sprint 14 — Implement Financial Reporting Export & Printable PDF Engine (Step 5)

> **Duration**: 2026-10-16 to 2026-10-16
> **Status**: In Progress 🟡

## Goal
Implement client-side financial document export engine (Excel .xlsx & CSV) and formal printable PDF document generator (`@media print` / formal A4 layout) with executive summaries, detail tables, and official verification signature blocks for `/finance-reports`.

## Scope

### Included
- **Wave 1: Export Engine Utility (`src/utils/exportFinancialReports.ts`)**:
  - `exportToExcel(reportType, data, filter)`: Exports active tab dataset to styled `.xlsx` or `.csv` using `xlsx` with standardized Indonesian financial headers.
  - `exportFullFinancialWorkbook(allReportsData, executiveSummary)`: Exports all 4 financial reports into a single comprehensive multi-sheet Excel workbook (`Laba Rugi SPK`, `Varian Anggaran WBS`, `Valuasi Persediaan`, `Piutang & Aging`).
  - Standardized naming convention: `RobelKaroseri_[NamaLaporan]_[YYYYMMDD].xlsx`.
  - Number formatting for monetary values and percentages.
- **Wave 2: Formal Printable PDF Engine (`src/components/finance/FinancialPrintReport.tsx`)**:
  - Modal pratinjau cetak dan mode cetak langsung (`window.print()`).
  - Formal corporate letterhead: `ROBELKAROSERI - INDUSTRIAL VEHICLE MODIFICATION`.
  - Formal document title: `LAPORAN EVALUASI FINANSIAL & OPERASIONAL PROYEK`.
  - Document metadata: Tanggal Cetak (WIB), Dicetak Oleh (Nama & Role), Periode Filter.
  - Ringkasan Eksekutif KPI dalam tabel terstruktur ramah cetak.
  - Tabel rincian data laporan aktif dengan styling kontras tinggi (clean borders, compact 9-10pt typography).
  - Kolom tanda tangan resmi: Disiapkan Oleh (Kasir / Finance) & Disetujui Oleh (Pemilik Bengkel / Owner).
  - Print styling CSS (`@media print`): Auto-hide non-printable elements (navbar, headers, filter bar, dark background, buttons) and clean page breaks.
- **Wave 3: UI Integration on `/finance-reports` (`src/pages/FinancialReportsPage.tsx` & tabs)**:
  - Header Action buttons next to Global Filter Bar:
    - Dropdown button **"Ekspor Excel"** (*Download Sheet Ini* atau *Download Semua Laporan (Full Workbook)*).
    - Primary button **"Cetak Dokumen / Simpan PDF"** membuka dialog cetak formal.
  - Tab level quick CSV / Excel export trigger buttons on `JobProfitabilityTab`, `WbsCostVarianceTab`, `InventoryValuationTab`, `ReceivablesAgingTab`.
- **Quality Gates & Empirical Verification**:
  - Unit tests for export data mapping and workbook construction.
  - TypeScript build (`npm run build`).
  - Linting (`npm run lint`).
  - Git commit: `feat(finance): implement step 5 financial document export and printable PDF engine`.

### Explicitly Excluded
- Backend server-side PDF generation daemon (client-side browser native rendering with high DPI is prioritized for instantaneous output).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Build export engine utility `src/utils/exportFinancialReports.ts` | Antigravity | ⬜ Todo | 0.4h |
| 2. Build formal printable component `src/components/finance/FinancialPrintReport.tsx` | Antigravity | ⬜ Todo | 0.5h |
| 3. Integrate export & print triggers in `FinancialReportsPage.tsx` & tabs | Antigravity | ⬜ Todo | 0.4h |
| 4. Create unit tests for export mappings & workbook generation | Antigravity | ⬜ Todo | 0.3h |
| 5. Run test suite, production build & linter verification | Antigravity | ⬜ Todo | 0.2h |

## Daily Log

### 2026-10-16
- Archived Sprint 13 to `.gsd/sprints/sprint-13-implement-financial-reconciliation-and-data-integrity-audit.md`.
- Initialized Sprint 14 for Financial Reporting Export & Printable PDF Engine (Step 5).
