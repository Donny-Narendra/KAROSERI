---
phase: 21
plan: fix-approval-change-orders
wave: 1
gap_closure: true
---

# Fix: Implementasi Approval Workflow untuk Change Orders (Amandemen SPK)

## Problem
Pengajuan amandemen baru (misal: "tambah foto di belakan bak +Rp 500.000") tersimpan dengan status 'Pending'. Secara aturan bisnis, amandemen ini memerlukan persetujuan agar dapat masuk ke kalkulasi tagihan akhir kasir dan lembar kerja mandor. Saat ini belum tersedia tombol aksi persetujuan (Approve / Reject) di antarmuka Owner atau Service Advisor.

## Root Cause
- UI komponen Change Orders belum memiliki aksi Approve/Reject
- Backend service untuk mengubah status amandemen dan log approved_by belum ada
- Kalkulasi di KasirDashboard mungkin belum secara eksplisit memastikan hanya change orders yang APPROVED yang masuk hitungan penagihan (atau bila sudah, perlu dipastikan ulang).

## Tasks

<task type="auto">
  <name>Tambahkan aksi Approve dan Reject pada Change Orders SPK</name>
  <files>src/pages/OwnerDashboard.tsx, src/pages/AdvisorDashboard.tsx, src/services/spkService.ts, src/pages/KasirDashboard.tsx</files>
  <action>
    1. Buat fungsi helper di `src/services/spkService.ts`:
       `approveAmendment(amendmentId: string, approvedBy: string)` yang memperbarui `status = 'APPROVED'` dan `approved_by` di tabel `spk_amendments`.
       `rejectAmendment(amendmentId: string)` yang memperbarui `status = 'REJECTED'`.
    2. Pada UI Change Orders (di `AdvisorDashboard.tsx` atau tab persetujuan `OwnerDashboard.tsx` bila ada):
       - Jika user memiliki wewenang (role 'owner' atau 'advisor' dengan syarat tertentu), render tombol "Approve" (hijau) dan "Reject" (merah) di samping badge 'Pending'.
       - Saat di-approve, panggil `approveAmendment` dan ubah badge menjadi 'Approved' (hijau) pada state lokal atau refetch.
    3. Pastikan `KasirDashboard.tsx` (atau `spkService.ts` yang melayani tagihan) menjumlahkan seluruh amandemen yang berstatus 'APPROVED' ke dalam tagihan final.
  </action>
  <verify>Jalankan oxlint / npm run build. Klik tombol Approve pada amandemen "tambah foto di belakan bak", pastikan status berubah menjadi Approved dan tercatat di kalkulasi akhir SPK.</verify>
  <done>Change order dapat disetujui secara resmi dan nominalnya masuk ke penagihan proyek.</done>
</task>
