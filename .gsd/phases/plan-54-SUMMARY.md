# Phase 54 Summary: Resolusi Foreign Key Mapping material_id pada Submit Requisition Material Mandor

## Hasil Eksekusi & Bukti Empiris

1. **Migrasi Skema Database (`material_requisition_items`)**:
   - Kolom `material_id` berhasil diubah menjadi nullable (`DROP NOT NULL`), sehingga aman untuk item kustom, non-stok, maupun item alokasi RAB yang belum memiliki master di katalog `materials`.
   - Menambahkan kolom `rab_item_id uuid REFERENCES public.rab_items(id) ON DELETE SET NULL` dengan indeks `idx_material_req_items_rab_item_id`.
   - Menambahkan kolom snapshot `material_name text` dan `unit text`.
   - File migrasi: `supabase/migrations/20261011203500_update_material_requisition_items_schema.sql` diaplikasikan ke database PostgreSQL dengan status sukses 100%.

2. **Perbaikan Frontend Payload Requisition (`MaterialRequisitionForm.tsx`)**:
   - Memperbaiki pemetaan `RabSourceItem` agar tidak lagi melakukan fallback ke `item.id` (primary key `rab_items`) yang memicu foreign key violation.
   - Menggunakan pencocokan nama material master secara toleran (`normalizeText`) dan menetapkan `material_id: matchedMat?.id || item.material_id || null`.
   - Memetakan payload `itemsToInsert`:
     - `material_id: item.materialId || null`
     - `rab_item_id: item.sourceRabId || null`
     - `material_name: item.name || 'Material Tanpa Nama'`
     - `quantity: Number(item.quantity) || 1`
     - `unit: item.unit || 'pcs'`

3. **Sinkronisasi Cross-Module**:
   - `src/utils/rabItemAllocation.ts`: Mendukung pencocokan `rab_item_id` dan `material_name` pada nested `material_requisition_items` maupun Set ID.
   - `src/components/SpkBoronganPanel.tsx`: Mengambil `rab_item_id` dan `material_name` pada kueri Requisition untuk konsistensi mutual exclusion.
   - `src/components/RequisitionApproval.tsx`: Mengambil `rab_item_id`, `material_name`, dan `unit`. Menyaring `transactions` di `handleApprove` hanya untuk item yang memiliki `material_id` valid, serta menampilkan nama dan satuan item dengan fallback ke `material_name`/`unit`.

4. **Verifikasi & Build Validation**:
   - `npx oxlint`: 0 error.
   - `npm run build`: Berhasil 100% tanpa error kompilasi TypeScript maupun Vite bundler.
   - Pengujian real database (SPK-5902, "KARPET SLEBOR"):
     - Case A (Item dengan material catalog terhubung): Berhasil di-insert dengan `material_id` valid dan `rab_item_id`.
     - Case B (Item kustom dengan `material_id = null`): Berhasil di-insert tanpa error foreign key constraint.
     - Kueri Warehouse Approval: Menampilkan data dengan relasi utuh.

5. **Commit Git**:
   - `fix(mandor): resolve material_id foreign key mapping on material requisition submit` (commit `9a238b0`)
