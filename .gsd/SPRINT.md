# Sprint 89 — Synchronize Financial Quotation and Cost Breakdown Between RAB Perubahan and Kasir Billing

> **Duration**: 2026-10-24 to 2026-10-24
> **Status**: In Progress

## Goal
Harmonize financial quotation (selling price) and internal cost breakdown (COGS/HPP) between Service Advisor ("RAB Perubahan" tab) and Kasir (Billing Calculator) using the Single Source of Truth (SSOT) principle, eliminating mathematical discrepancies across contract packages, granular items, and approved change orders.

## Scope

### Included
- **Task 1: Harmonize Sales & COGS Formulas in `billingService.ts` & `KasirDashboard.tsx`**
  - Incorporate approved Change Orders HPP (Material, Labor, Overhead) into the Kasir `Internal Cost (Modal)` panel.
  - Calculate `Actual Material Cost = Initial Material Cost + coMaterialCost`.
  - Calculate `Actual Labor Cost = Initial Labor Cost + coLaborCost`.
  - Calculate `Actual Overhead Cost = Initial Overhead Cost + coOverheadCost`.
  - Calculate `Total Modal (HPP) = Actual Material Cost + Actual Labor Cost + Actual Overhead Cost`.
  - Reconcile `Total Harga Jual` with base quotation and approved change orders.
- **Task 2: Proportional Package Selling Price Breakdown in `RabCalculator.tsx` & `RabPerubahanTab.tsx`**
  - Distribute package selling price (`package.selling_price`) proportionally to component breakdown rows based on BOM cost weights:
    $$\text{component.unit\_price} = \frac{\text{component.cost\_price}}{\text{totalCost}} \times \text{package.selling\_price}$$
  - Ensure `RabPerubahanTab.tsx` respects the true package selling price (or scales package components) so $\sum \text{Subtotal RAB Awal} + \sum \text{Subtotal Approved Change Orders}$ exactly matches `Total Harga Jual` in Kasir.
  - Reconcile `RabCalculator.tsx`, `PackageAllocationModal.tsx`, and `packageService.ts` when BOM explosion occurs.
- **Task 3: Synchronize Gross Profit & Margin Indicators across Kasir and RAB Perubahan**
  - In Kasir: $\text{Gross Profit} = \text{Total Harga Jual} - \text{Total Modal (HPP)}$.
  - In RAB Perubahan: $\text{Total Estimasi Profit} = \text{Total Quotation Jual (Revisi)} - \text{Total Modal HPP}$.
  - Ensure 4-pillar margins and totals match across both pages.
- **Task 4: Automated Testing & Verification**
  - Add unit tests in `billingService.test.ts`, `KasirChangeOrderBreakdown.test.tsx`, `RabPerubahanTab.test.tsx`, and `packageAssemblyImport.test.ts`.
  - Verify SPK-3093 scenarios (Total Harga Jual Rp 5.321.998, Total Modal HPP Rp 3.065.264, Gross Profit Rp 2.256.734).
  - Verify Down Payment & remaining bill calculations.
  - Run linting (`oxlint`) and production build (`npm run build`).

### Explicitly Excluded
- Database schema changes (calculations are handled in frontend service and presentation layers).
- Altering previously issued finalized invoices in `invoices` table.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| Task 1: Incorporate approved Change Orders HPP into Kasir Internal Cost panel (`billingService.ts` / `KasirDashboard.tsx`) | Claude | ⬜ Todo | 0.5 |
| Task 2: Distribute package selling price proportionally and reconcile header totals in `RabCalculator.tsx`, `PackageAllocationModal.tsx`, and `RabPerubahanTab.tsx` | Claude | ⬜ Todo | 0.75 |
| Task 3: Align Gross Profit & 4-Pillar metrics between Kasir and RAB Perubahan | Claude | ⬜ Todo | 0.5 |
| Task 4: Automated testing, SPK-3093 verification, linting, and production build | Claude | ⬜ Todo | 0.5 |

## Daily Log

### 2026-10-24
- Sprint created. Scope and objectives verified.
