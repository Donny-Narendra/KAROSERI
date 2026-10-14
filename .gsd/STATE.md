## Current Position
- **Phase**: 67 (Gap Closure: Indikator & Rincian Alokasi Material WBS Belum Diminta pada Header Kartu WBS di /service-advisor)
- **Task**: Implementation in progress (awaiting manual review, test, & git commit by user)
- **Status**: Implemented & Ready for Manual Verification

## Last Session Summary
Phase 67 diimplementasikan sesuai seluruh spesifikasi dan batasan instruksi pengguna:
1. `src/components/WbsPendingMaterialModal.tsx`:
   - Dibuat modal dialog quick popover interaktif untuk menampilkan rincian alokasi material RAB yang belum diajukan di Requisition maupun SPK Borongan.
   - Header modal dilengkapi badge peringatan amber, nama kategori WBS, dan tombol penutup (X).
   - Stat bar ringkasan menampilkan total item tertunda dan total estimasi biaya tertunda.
   - Tabel ringkas memuat kolom: `Nama Material`, `Qty Belum Diambil`, dan `Estimasi Biaya` (dalam format Rupiah presisi).
   - Tombol pintas cepat "Buka Minta Material" yang langsung menutup popover dan membuka modal Material Requisition untuk WBS tersebut.
2. `src/components/WbsChecklist.tsx`:
   - Integrasi shared utility `isRabItemAllocated` dari `src/utils/rabItemAllocation.ts`.
   - Implementasi fungsi kalkulasi `fetchMaterialAllocations` yang mengevaluasi `rab_items` terhadap `material_requisitions` aktif dan `spk_borongan` aktif.
   - Integrasi badge status interaktif pada baris header masing-masing tahapan WBS tepat di sebelah kiri tombol "SPK Borongan":
     * Jika `pendingCount > 0`: Badge peringatan amber `[ ⚠️ {pendingCount} Material Belum Diminta ]` (cursor-pointer).
     * Jika `pendingCount === 0` dan ada RAB: Badge hijau netral `[ ✓ Semua Material Terdistribusi ]`.
     * Jika belum ada RAB: Badge minimalis `[ Belum Ada RAB ]`.
   - Mengaitkan klik badge peringatan untuk menampilkan `WbsPendingMaterialModal`.
   - Sinkronisasi refresh data alokasi otomatis saat modal Requisition atau Borongan ditutup.
3. Kepatuhan Batasan & Quality:
   - Tanpa verifikasi otomatis (no auto-verify).
   - Tanpa git commit otomatis (no auto-commit).
   - Tanpa eksekusi langsung migrasi Supabase (tidak ada perubahan skema database baru yang diperlukan karena tabel `rab_items`, `material_requisitions`, dan `spk_borongan` sudah terdaftar).

## Blockers
None.

## Next Steps
1. Pengguna login ke aplikasi dengan akun `service_advisor` atau `owner`.
2. Pengguna membuka halaman `/service-advisor` dan memilih SPK aktif yang memiliki estimasi RAB.
3. Pengguna memilih tab **WBS & QC**:
   - Periksa header masing-masing kartu tahapan WBS (misal: "WBS 1: Pembongkaran").
   - Pastikan terdapat badge di sebelah kiri tombol "SPK Borongan" (misal: `⚠️ 2 Material Belum Diminta` atau `✓ Semua Material Terdistribusi`).
4. Klik pada badge `Material Belum Diminta`:
   - Pastikan muncul modal ringkas yang memuat tabel: Nama Material, Qty Belum Diambil, dan Estimasi Biaya.
   - Klik tombol **Buka Minta Material** pada modal, pastikan modal tertutup dan modal form "Minta Material" langsung terbuka untuk kategori WBS tersebut.
5. Pengguna melakukan review visual, pengujian manual, dan git commit.
