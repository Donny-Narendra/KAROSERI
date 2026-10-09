---
phase: 32
plan: wbs-qc-draft-restriction
wave: 1
gap_closure: true
---

# Fix: Batasi Akses Modul WBS dan QC untuk SPK DRAFT

## Problem
Tim lapangan (Mandor), QC (Service Advisor/Owner) dapat melihat dan mengakses modul WBS dan QC Inspection untuk SPK yang masih berstatus 'DRAFT'. Padahal SPK 'DRAFT' berarti kesepakatan harga dan DP belum final. Hal ini berpotensi membingungkan tim produksi dan menimbulkan pengerjaan sebelum disetujui.

## Root Cause
Query list SPK untuk tampilan WBS dan QC belum mengecualikan status `DRAFT`. Selain itu, tidak ada validasi level komponen atau RLS database yang secara aktif memblokir insert/update pada tabel `wbs_checklists` atau `qc_inspections` apabila SPK terkait masih `DRAFT`.

## Tasks

<task type="auto">
  <name>Filter Query List SPK (WBS & QC)</name>
  <files>src/pages/MandorDashboard.tsx, src/components/QcInspectionForm.tsx (if applicable)</files>
  <action>Perbarui query fetch SPK (khususnya di `MandorDashboard.tsx` atau tempat lain yang memunculkan SPK untuk diproses WBS/QC) agar menyaring status DRAFT dengan `.neq('status', 'DRAFT')` atau memastikan hanya mengambil status aktif/in-progress.</action>
  <verify>SPK berstatus DRAFT tidak lagi muncul di Mandor Dashboard.</verify>
  <done>Query berhasil difilter dan tampilan tidak memuat DRAFT SPK.</done>
</task>

<task type="auto">
  <name>Route Guard & Component Protection</name>
  <files>src/components/WbsChecklist.tsx, src/components/QcInspectionForm.tsx, src/pages/ServiceAdvisorDashboard.tsx</files>
  <action>Beri validasi di `WbsChecklist.tsx` dan `QcInspectionForm.tsx`. Jika komponen menerima `spkId`, ambil detail status SPK. Bila statusnya `DRAFT`, render sebuah peringatan/alert yang menyatakan bahwa WBS/QC tidak dapat diakses sampai SPK disetujui, dan sembunyikan form input.</action>
  <verify>Bila SPK DRAFT dipaksa dirender dengan komponen tersebut, UI akan memblokir dan menampilkan warning.</verify>
  <done>UI Component Guard berfungsi dengan baik, form hilang jika status = DRAFT.</done>
</task>

<task type="auto">
  <name>Keamanan Data RLS (Supabase)</name>
  <files>supabase/migrations/</files>
  <action>Buat file migrasi untuk memperketat Row Level Security (RLS) pada `wbs_checklists` dan `qc_inspections` agar menolak (reject) aksi INSERT dan UPDATE apabila SPK terkait berstatus 'DRAFT'. Hal ini melindungi dari pemanggilan API/URL langsung.</action>
  <verify>Migrasi berhasil diaplikasikan dan RLS membatasi modifikasi untuk SPK DRAFT.</verify>
  <done>RLS rules created to enforce DRAFT restriction on backend.</done>
</task>
