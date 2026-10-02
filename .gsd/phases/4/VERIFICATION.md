## Phase 4 Verification

### Must-Haves
- [x] Pembayaran DP mengubah status SPK — VERIFIED (evidence: `KasirDashboard.tsx` `handleRecordDP` updates `spk` table setting status to 'ACTIVE')
- [x] Laporan QC tersimpan ke database — VERIFIED (evidence: `QcInspectionForm.tsx` inserts into `qc_inspections` table and includes `uji_kelistrikan`)
- [x] Bill akhir berdasarkan real cost — VERIFIED (evidence: `KasirDashboard.tsx` `fetchSpks` calculates actual material and labor cost by querying `inventory_transactions` and `rab_estimations`)

### Verdict: PASS
