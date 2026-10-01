# Phase 3 Research: WBS & Estimasi RAB Otomatis

## Context
Phase 3 requires the implementation of the core operational engine of the system: the Work Breakdown Structure (WBS) and the RAB (Rencana Anggaran Biaya) Estimator.

## Findings
1. **WBS Structure**: As per `SPEC.md`, there are 5 fixed WBS categories:
   - WBS 1: Pembongkaran
   - WBS 2: Sasis/Rangka
   - WBS 3: Dinding/Fabrikasi
   - WBS 4: Cat/Finishing
   - WBS 5: Kelistrikan/Hidrolik

2. **Schema Needs**:
   - `wbs_items`: To define standard tasks across the 5 WBS categories.
   - `materials`: To define inventory items, unit prices, and standard waste factors.
   - `rab_estimations`: To link an SPK to its estimated cost breakdown (material + labor + overhead).
   - `rab_items`: Line items for a specific `rab_estimations` detailing material/labor, quantity, and cost.

3. **Algorithm**:
   - Estimator calculates: `Total = (Material Quantity * Price * (1 + Waste Factor)) + (Labor Hours * Labor Rate) + Overhead`.
   - Update `total_estimated_cost` on the `spk` table based on this calculation.

4. **Integration**:
   - Built on top of the `spk` schema (`spk_id`).
   - Uses Supabase PostgreSQL for relational schema and calculations.
   - Triggers or RPCs might be useful for recalculating RAB totals.

5. **UI Needs**:
   - `RabCalculator.tsx`: A UI for Service Advisor or Mandor to select WBS items, materials, and labor to auto-calculate the RAB.

## Conclusion
We will build this in 2 waves:
- **Wave 1 (Database)**: Migrations for WBS, materials, and RAB estimation tables.
- **Wave 2 (Frontend)**: React components for selecting WBS items, defining quantities, and calculating the RAB totals.
