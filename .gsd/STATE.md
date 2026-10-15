## Current Position
- **Sprint**: Sprint 6 (Implement dynamic tiered Gate 2 budget warning on Warehouse Mandor Requests)
- **Status**: Sprint completed
- **Milestone**: (paused while sprint is active - Phase 75 completed)

## Last Session Summary
1. Komponen Pagu Gate 2 Dinamis Berjenjang (`src/components/RequisitionApproval.tsx`):
   - Diperluas dengan kalkulasi komitmen material SPK riil secara konkruen (`Promise.all`):
     - `approvedReqCost`: Total pengeluaran requisition yang telah disetujui (`status = 'APPROVED'`).
     - `boronganMaterialCost`: Total biaya material teralokasi pada penugasan SPK Borongan aktif (`status NOT IN ('CANCELLED', 'CUT_OFF')`).
     - `directIssueCost`: Total pengeluaran material langsung via tab "Issue Material" (`inventory_transactions` di mana `requisition_id IS NULL` dan `status != 'VOID'`).
     - `currentTicketCost`: Total estimasi biaya requisition pada tiket yang sedang dibuka (`req.totalRequisitionCost`).
     - `rabBudgetLimit`: Pagu anggaran material SPK dari `rab_estimations.total_material_cost` (dengan fallback kalkulasi item atau `spk.total_estimated_cost`).
     - Formula:
       `projectedTotal = approvedReqCost + boronganMaterialCost + directIssueCost + currentTicketCost`
       `isOverBudget = projectedTotal > rabBudgetLimit`
2. Tampilan Notifikasi Dinamis (UI Banner):
   - **Kondisi Normal / Aman (`!isOverBudget`)**:
     - Styling hijau: `bg-emerald-950/40 border border-emerald-800 text-emerald-200`.
     - Teks pesan: *"Pagu Gate 2 (Aman): Total permintaan saat ini (Rp {currentTicketCost}) masih berada dalam kuota RAB. Akumulasi komitmen: Rp {projectedTotal} dari total pagu Rp {rabBudgetLimit} (Sisa Pagu: Rp {rabBudgetLimit - projectedTotal})."*
     - Rincian komitmen: Menampilkan sub-ringkasan Requisition Disetujui, SPK Borongan, dan Direct Issue.
   - **Kondisi Melebihi Anggaran (`isOverBudget`)**:
     - Styling merah tegas: `bg-rose-950/70 border border-rose-600 text-rose-200`.
     - Teks pesan: *"PERINGATAN PAGU GATE 2 (OVER BUDGET): Menyetujui requisition ini (Rp {currentTicketCost}) akan menyebabkan total pengeluaran material (Rp {projectedTotal}) MELEBIHI pagu RAB (Rp {rabBudgetLimit}) sebesar Rp {projectedTotal - rabBudgetLimit}. Pastikan sudah ada persetujuan Change Order / SPK Tambahan dari Service Advisor sebelum menyetujui."*
     - Tombol Approve beraksen amber dengan ikon peringatan, dan modal konfirmasi memberikan pesan tegas over budget.
3. Kualitas & Validasi:
   - `npm run build`: Berhasil 100% (0 error).
   - `npm run lint`: Berhasil 100% (0 error).
   - Verifikasi data live Supabase: Terverifikasi akurat pada SPK-1157, RK071026-05, SPK-5902, dan SPK-6633.

## Blockers
None.

## Next Steps
1. Buka dashboard Petugas Gudang di `/warehouse` pada tab **"Mandor Requests"**.
2. Amati tiket permintaan material:
   - Jika kuota aman, banner hijau menampilkan perbandingan komitmen terhadap pagu RAB beserta sisa kuota.
   - Jika tiket menyebabkan over budget, banner merah tegas memperingatkan selisih kelebihan pagu dan kewajiban Change Order.

