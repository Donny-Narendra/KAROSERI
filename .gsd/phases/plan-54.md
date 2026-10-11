---
phase: 54
plan: fix-requisition-material-id-foreign-key
wave: 1
gap_closure: true
---

# Fix: Resolusi Foreign Key Mapping material_id pada Submit Requisition Material Mandor

## Problem
Pada modal "Minta Material (Requisition)" di `/mandor`, saat mengajukan permintaan material (misal: "KARPET SLEBOR"), muncul error:
`insert or update on table 'material_requisition_items' violates foreign key constraint 'material_requisition_items_material_id_fkey'`.

## Root Cause
1. Frontend submit handler (`MaterialRequisitionForm.tsx`) memetakan `material_id` menggunakan `item.id` (yang merupakan primary key dari tabel `rab_items`) apabila item tidak memiliki relasi master `materials`, bukan foreign key asli ke tabel `materials`.
2. Kolom `material_requisition_items.material_id` di database memiliki constraint `NOT NULL` dan foreign key ke `materials(id)`. Ketika item merupakan non-stok/kustom atau item RAB yang belum memiliki master di `materials`, insersi gagal karena string kosong / primary key `rab_items` tidak terdaftar di `materials`.
3. Kolom `material_requisition_items` belum memiliki `rab_item_id`, `material_name`, dan `unit` untuk menyimpan data item kustom/RAB secara persisten tanpa bergantung mutlak pada tabel `materials`.

## Tasks

<task type="auto">
  <name>Task 1: Migrasi Skema Database material_requisition_items</name>
  <files>supabase/migrations/20261011203500_update_material_requisition_items_schema.sql, apply_migration.cjs</files>
  <action>
    1. Buat file migrasi SQL `supabase/migrations/20261011203500_update_material_requisition_items_schema.sql`:
       - `ALTER TABLE public.material_requisition_items ALTER COLUMN material_id DROP NOT NULL;`
       - `ALTER TABLE public.material_requisition_items ADD COLUMN IF NOT EXISTS rab_item_id uuid REFERENCES public.rab_items(id) ON DELETE SET NULL;`
       - `ALTER TABLE public.material_requisition_items ADD COLUMN IF NOT EXISTS material_name text;`
       - `ALTER TABLE public.material_requisition_items ADD COLUMN IF NOT EXISTS unit text;`
       - `CREATE INDEX IF NOT EXISTS idx_material_req_items_rab_item_id ON public.material_requisition_items(rab_item_id);`
    2. Jalankan migrasi ke PostgreSQL via script migrasi.
  </action>
  <verify>Kolom `material_id` menjadi nullable, kolom `rab_item_id`, `material_name`, `unit` berhasil ditambahkan dan terverifikasi di information_schema.</verify>
  <done>Tabel `material_requisition_items` mendukung item dengan `material_id` nullable dan referensi `rab_item_id` eksplisit.</done>
</task>

<task type="auto">
  <name>Task 2: Audit & Perbaikan Payload Submit Requisition pada MaterialRequisitionForm.tsx</name>
  <files>src/components/MaterialRequisitionForm.tsx</files>
  <action>
    1. Perbaiki mapping `RabSourceItem` di `MaterialRequisitionForm.tsx`:
       - Jangan pernah melakukan fallback `materialId` ke `item.id` (primary key dari `rab_items`).
       - Gunakan pencocokan master materials yang toleran (case-insensitive & trimmed) dengan fallback ke `null`.
       - Pastikan `sourceRabId` selalu menyimpan `item.id` (RAB item ID).
    2. Perbaiki fungsi `handleSubmit`:
       - Petakan `itemsToInsert` dengan:
         `requisition_id: reqData.id`
         `material_id: item.materialId || null`
         `rab_item_id: item.sourceRabId || null`
         `material_name: item.name || 'Material Tanpa Nama'`
         `quantity: Number(item.quantity) || 1`
         `unit: item.unit || 'pcs'`
       - Validasi bahwa minimal 1 item dipilih dengan kuantitas > 0.
       - Tangani item manual tanpa error.
    3. Update kueri pengecekan requisition eksisting untuk menyertakan `rab_item_id` dan `material_name`.
  </action>
  <verify>Submit requisition dengan item dari RAB maupun manual berhasil di-insert ke database tanpa foreign key error.</verify>
  <done>Payload submit requisition memetakan `material_id`, `rab_item_id`, `material_name`, dan `unit` dengan akurat.</done>
</task>

<task type="auto">
  <name>Task 3: Penyelarasan Cross-Module (rabItemAllocation, SpkBoronganPanel, RequisitionApproval)</name>
  <files>src/utils/rabItemAllocation.ts, src/components/SpkBoronganPanel.tsx, src/components/RequisitionApproval.tsx</files>
  <action>
    1. Pada `src/utils/rabItemAllocation.ts`:
       - Dukung pengecekan `rab_item_id` dan nama material pada sub-item `material_requisition_items`.
    2. Pada `src/components/SpkBoronganPanel.tsx`:
       - Perbarui query `material_requisition_items` untuk mengambil `rab_item_id` dan `material_name` agar sinkronisasi eksklusi berjalan sempurna.
    3. Pada `src/components/RequisitionApproval.tsx`:
       - Tampilkan nama material dan unit dengan fallback ke `item.material_name` dan `item.unit` jika `item.materials` bernilai null.
       - Hanya insert ke `inventory_transactions` untuk item yang memiliki `material_id` valid.
  </action>
  <verify>Modul gudang dan mandor berjalan harmonis tanpa runtime error saat memproses requisition item tanpa master material.</verify>
  <done>Integrasi antarmuka gudang dan SPK borongan sinkron dengan skema requisition baru.</done>
</task>

<task type="auto">
  <name>Task 4: Verifikasi Build, Linting, dan Atomic Commit</name>
  <files>None</files>
  <action>
    1. Jalankan `npx oxlint` dan pastikan 0 error.
    2. Jalankan `npm run build` dan pastikan sukses 100%.
    3. Uji alur data submit requisition secara programatik / real database test untuk memastikan record tersimpan dengan benar.
    4. Buat commit atomik: `fix(mandor): resolve material_id foreign key mapping on material requisition submit`.
  </action>
  <verify>Build lolos, linter bersih, dan pengujian database membuktikan insersi sukses tanpa pelanggaran foreign key.</verify>
  <done>Kode siap produksi dan terdokumentasi rapi di git.</done>
</task>
