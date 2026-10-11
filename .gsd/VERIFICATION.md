## Phase 53 Verification: Sinkronisasi Mutual Exclusion Material Antara Requisition dan SPK Borongan di Mandor

### Must-Haves
- [x] Skema / Data Tracking Penggunaan Item: Penambahan tracking `material_id` / `rab_item_id` pada tabel `public.spk_borongan` dan penyimpanan referensi saat transfer dari RAB — VERIFIED (evidence: Migrasi `20261011201500_add_material_tracking_to_spk_borongan.sql` sukses diterapkan ke database dengan indeks dan backfill data; `SpkBoronganPanel.tsx` menyimpan `material_id` dan `rab_item_id` saat `handleCreate`).
- [x] Utilitas Shared Availability Filter (`isRabItemAllocated`): Normalisasi teks case-insensitive, substring matching deskripsi tugas, dan validasi ID material cross-module — VERIFIED (evidence: File `src/utils/rabItemAllocation.ts` lulus unit test komprehensif untuk pencocokan ID, status exclusions, dan substring matching mandor notes).
- [x] Terapkan Filter di Kedua Modal: Saring panel "Alokasi RAB (WBS Terkait)" pada `MaterialRequisitionForm.tsx` dan panel "Panduan Material (RAB)" pada `SpkBoronganPanel.tsx` beserta counter reaktif — VERIFIED (evidence: Kedua modal mengimpor dan menerapkan `isRabItemAllocated`; pengujian langsung dengan database real memvalidasi bahwa "TUKANG LAS DUDUKAN SLEBOR" pada SPK-5902 Pembongkaran tereksklusi dari kedua panel).
- [x] Verifikasi Type Checking, Build, dan Linting — VERIFIED (evidence: `npm run build` berhasil 100% tanpa error dalam 474ms; `npx oxlint` 0 error).

### Verdict: PASS
