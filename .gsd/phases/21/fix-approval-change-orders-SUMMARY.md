# fix-approval-change-orders Summary

## Completed Tasks

1. **Tambahkan aksi Approve dan Reject pada Change Orders SPK**
   - Ditambahkan helper `approveAmendment` dan `rejectAmendment` ke dalam `src/services/spkService.ts`.
   - Diperbarui `src/components/AmendmentManager.tsx` untuk menggunakan helper tersebut dalam logika persetujuan (Approve/Reject).
   - Diperbarui `AmendmentManager.tsx` agar Service Advisor (`isSA`) juga bisa melakukan Approve/Reject layaknya Owner.
   - Diperbarui query Supabase pada `src/pages/KasirDashboard.tsx` (`fetchSpks`) untuk memuat data amandemen terkait SPK, menghitung total biaya dari amandemen berstatus `APPROVED`, dan menampilkannya sebagai `amendmentCost` di ringkasan biaya akhir (Cost Breakdown dan Total Final).

## Next Steps

1. Jalankan `/verify` untuk memastikan bahwa fitur approve/reject dan penambahan biaya di kasir sudah berjalan dengan benar.
