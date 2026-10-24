## Current Position
- **Sprint**: Sprint 89 — Synchronize Financial Quotation and Cost Breakdown Between RAB Perubahan and Kasir Billing
- **Status**: Sprint in progress
- **Milestone**: Core Business Recommendations Hardening — Enterprise Production Readiness (paused for sprint)

## Last Session Summary
Sprint 89 created:
- Goal: Synchronize financial quotation (selling price) and internal cost breakdown (COGS/HPP) between Service Advisor ("RAB Perubahan" tab) and Kasir (Billing Calculator) using SSOT.
- Scope: Incorporate approved Change Orders HPP into Kasir Internal Cost panel, distribute package selling price proportionally to component breakdown rows, reconcile Total Harga Jual and Total Modal HPP between both views.

## Next Up
- Execute Task 1: Incorporate approved Change Orders HPP into Kasir Internal Cost panel (`billingService.ts` / `KasirDashboard.tsx`).
