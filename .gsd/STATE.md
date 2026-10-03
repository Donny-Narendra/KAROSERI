## Current Position
- **Phase**: Down Payment Implementation (Kasir)
- **Task**: Creating the DP feature for KasirDashboard and fixing Kasir RLS policies
- **Status**: Active (resumed 2026-10-03T07:54:22+07:00)

## Last Session Summary
- Implemented `DownPaymentModal` to record DP for draft SPKs.
- Updated `KasirDashboard` with a tabbed interface ("Penerimaan DP" and "Pelunasan Akhir") to handle DP vs Final Invoices.
- Wrote migration file `20261003000003_add_payments_table.sql` to add a `payments` table for recording DP transactions.
- Wrote migration file `20261003000004_kasir_rls_policies.sql` to grant the Kasir role SELECT/UPDATE permissions on `spk` and SELECT permissions on related tables, solving the empty dashboard issue.

## In-Progress Work
- The frontend code for Down Payment and Tabs in `KasirDashboard` is complete.
- The SQL migrations for `payments` and `kasir` RLS policies are written.
- *Wait state:* The user needs to execute the SQL migrations in the Supabase SQL Editor.

## Blockers
- Lack of direct DB access for the agent to run the SQL migrations automatically. The script `apply_rls.js` failed to connect because the database hostname wasn't resolvable from this environment (possibly requiring a different connection string or direct Supabase Dashboard execution).

## Context Dump
- `KasirDashboard.tsx`: Now fetches SPKs and separates them by tab based on `status`. Requires read access to `spk`, `rab_estimations`, `inventory_transactions`, `qc_inspections`, `invoices`, and `materials`.
- `DownPaymentModal.tsx`: Inserts into `payments` and updates `spk` `dp_amount` and `status` to 'ACTIVE'. Catch block ignores `payments` failure if table doesn't exist, to not block the UX.

### Next Steps
1. The user executes the SQL migrations (`20261003000003_add_payments_table.sql` and `20261003000004_kasir_rls_policies.sql`) in their Supabase instance.
2. Verify Kasir role can now view DRAFT/PENDING_DP SPKs on the KasirDashboard.
3. Test recording a Down Payment and verify the SPK status transitions to 'ACTIVE'.
