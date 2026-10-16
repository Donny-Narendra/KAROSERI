## Current Position
- **Sprint**: Sprint 15 — Audit and Verification of Core Business Recommendations Implementation
- **Status**: Sprint completed ✅
- **Milestone**: Core Business Recommendations Verification & Audit [COMPLETED]

## Last Session Summary
Codebase mapping complete (2026-10-16).
- **54 components identified** (9 role dashboards/pages, 45 UI/operational/finance components)
- **37 dependencies analyzed** (20 production, 17 development)
- **6 technical debt / audit items tracked** (Component tests, PostgreSQL handover trigger lock, Executive KPI COGS split, orphaned server dependencies, any casts, localization)
- **Test suite verified**: 26 Vitest tests passing (`npm test`), Oxlint 0 errors, TypeScript `tsc -b` clean.
- Updated `.gsd/ARCHITECTURE.md` and `.gsd/STACK.md`.

### Sprint 15 Audit Baseline Findings
1. **Audit Check 1 (Dashboard Eksekutif Finansial)**:
   - Status: **PARSIAL**.
   - Terpasang di `/finance-reports` (`FinancialReportsPage.tsx`) dan `JobProfitabilityTab.tsx`. Ke-4 metrik ada di tabel detail dan footer total.
   - Celah: `ExecutiveKpiCards.tsx` dan RPC `get_financial_executive_summary` saat ini menggabungkan Biaya Bahan dan Borongan Mandor ke dalam satu metrik `total_cogs`, bukan 2 kartu KPI terpisah.
2. **Audit Check 2 (HPP vs Harga Jual Master Material)**:
   - Status: **SUDAH DITERAPKAN (LENGKAP DI DB, TYPES, DAN UI)**.
   - Kolom `cost_price` dan `selling_price` terpasang di `materials`, `rab_items`, `change_order_items`, `material_requisition_items`.
   - UI `InventoryManager.tsx` menyediakan 2 input terpisah: "Harga Modal / HPP" dan "Harga Jual Patokan".
   - Catatan: Margin bahan vs jasa di level invoice konsumen masih turnkey/gabungan.
3. **Audit Check 3 (Billing Handover Lock)**:
   - Status: **PARSIAL**.
   - Di UI `KasirDashboard.tsx`, tombol "Release Vehicle & Print BAST" memiliki hard-gate `disabled` dengan ikon gembok jika status bukan `LUNAS`.
   - Di database view `view_project_receivables`, terdapat klasifikasi `UNIT SELESAI (TERTAHAN PELUNASAN)`.
   - Celah: Belum ada database trigger (`BEFORE UPDATE ON public.spk`) di PostgreSQL yang secara absolut memblokir status `COMPLETED` jika tagihan belum lunas.

## Blockers
None.

## Recommended Follow-up Actions
1. **Peningkatan Executive KPI Cards & RPC**: Menambahkan metrik terpisah untuk Total Biaya Material Terpakai (Goods Issued) dan Total Biaya Borongan Mandor pada RPC `get_financial_executive_summary` dan `ExecutiveKpiCards.tsx`.
2. **Database Trigger Billing Handover Lock**: Membuat migration trigger PostgreSQL `trg_enforce_handover_billing_lock` pada tabel `public.spk`.
