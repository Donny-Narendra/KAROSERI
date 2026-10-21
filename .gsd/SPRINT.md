# Sprint 63 — Implement Granular Item-Level Material Approval in Warehouse Mandor Requests

> **Duration**: 2026-10-21 to 2026-10-22
> **Status**: In Progress

## Goal
Implementasi persetujuan pengeluaran material tingkat baris item mandiri (granular item-level material approval) pada modul Warehouse Mandor Requests (`RequisitionApproval.tsx`, `WarehouseDashboard.tsx`, dan migrasi database Supabase), memungkinkan petugas gudang menyetujui atau menahan/menolak masing-masing barang secara mandiri, mencatat pengeluaran barang (Goods Issue) dan pemotongan stok per item secara atomik, memperbarui status requisition induk menjadi `PARTIALLY_ISSUED` atau `COMPLETED`, serta mempertahankan tombol shortcut [Approve Semua].

## Scope

### Included
- **Migrasi Database & RPC (`supabase/migrations/20261026010000_item_level_requisition_approval.sql`)**:
  - Penambahan enum value `PARTIALLY_ISSUED` dan `COMPLETED` pada tipe `requisition_status` PostgreSQL jika ada.
  - Memastikan kolom `status` pada tabel `material_requisition_items` bertipe `VARCHAR(20)` / `TEXT` dengan default `'PENDING'`.
  - Fungsi RPC `approve_single_requisition_item(p_requisition_item_id UUID, p_approved_by UUID)`:
    - Atomik update status item menjadi `APPROVED`.
    - Mengurangi `current_stock` pada master `materials` secara aman.
    - Mencatat baris transaksi pengeluaran fisik ke `inventory_transactions` dengan relasi `requisition_id`, `requisition_item_id`, `material_id`, kuantitas, harga snapshot, dan profil petugas.
    - Evaluasi sisa pending item pada requisition induk: jika 0 set ke `COMPLETED`, jika masih ada set ke `PARTIALLY_ISSUED`.
  - Fungsi RPC `reject_single_requisition_item(p_requisition_item_id UUID, p_rejected_by UUID)`:
    - Atomik update status item menjadi `REJECTED`.
    - Evaluasi sisa item untuk menentukan status requisition induk (`REJECTED`, `PARTIALLY_ISSUED`, atau `COMPLETED`).
  - Grant akses execute RPC untuk role `authenticated`.
- **Pembaruan Komponen UI `RequisitionApproval.tsx`**:
  - Perbarui fetch query pending requisition: `.in('status', ['PENDING', 'PARTIALLY_ISSUED'])`.
  - Perbarui fetch query approved requisitions untuk Gate 2 evaluation: `.in('status', ['APPROVED', 'COMPLETED', 'PARTIALLY_ISSUED', 'ISSUED'])` dan hanya akumulasikan subtotal item dengan `status === 'APPROVED'`.
  - Tambahkan kolom aksi pada tabel item rincian material:
    - Tombol [Approve Item] per baris untuk menyetujui item tertentu.
    - Tombol [Reject / Hold Item] per baris untuk menolak item tertentu.
    - Status badge untuk item yang telah berstatus `APPROVED` (hijau) atau `REJECTED` (merah).
  - Modal konfirmasi persetujuan item tunggal dengan evaluasi Gate 2 budget per item.
  - Mempertahankan tombol [Approve Semua] di footer kartu untuk menyetujui sekaligus seluruh item yang masih berstatus `PENDING`.
  - Mempertahankan tombol [Reject Semua] di footer kartu untuk menolak sekaligus sisa item yang belum disetujui.
  - Tampilkan badge indikator status pada kartu tiket requisition: "Pending" atau "Sebagian Dirilis (Partially Issued)".
- **Penyesuaian Dashboard & Pending Counters**:
  - `WarehouseDashboard.tsx` & `ServiceAdvisorDashboard.tsx`: hitung tiket dengan status `in('status', ['PENDING', 'PARTIALLY_ISSUED'])`.
- **Testing & Empirical Validation**:
  - Unit & component tests di `src/components/__tests__/RequisitionApprovalGate2.test.tsx` (atau test file pelengkap):
    1. Render tombol aksi item-level pada baris material.
    2. Eksekusi single-item approve memperbarui status item dan status requisition menjadi `PARTIALLY_ISSUED`.
    3. Eksekusi single-item reject memperbarui status item menjadi `REJECTED`.
    4. Shortcut [Approve Semua] tetap berfungsi menyetujui seluruh sisa pending item.
  - Validasi seluruh test suite Vitest (257+ passing), linter Oxlint (0 warning), dan build Vite/TypeScript.

### Explicitly Excluded
- Mengubah alur pengajuan requisition dari sisi Mandor (`MaterialRequisitionForm.tsx`).
- Mengubah logika perhitungan biaya riil SPK pada invoice Kasir / laporan keuangan.

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create SQL Migration & Atomic RPC Procedures (`20261026010000_item_level_requisition_approval.sql`) | Antigravity | ⬜ Todo | 0.4h |
| 2. Implement Item-Level Approval & Partial Status in `RequisitionApproval.tsx` | Antigravity | ⬜ Todo | 0.8h |
| 3. Update Pending Count Queries in `WarehouseDashboard.tsx` & `ServiceAdvisorDashboard.tsx` | Antigravity | ⬜ Todo | 0.2h |
| 4. Add Comprehensive Component & Unit Tests | Antigravity | ⬜ Todo | 0.5h |
| 5. Empirical Validation (Vitest test suite, Oxlint 0 warnings, TypeScript build) | Antigravity | ⬜ Todo | 0.3h |

## Daily Log

### 2026-10-21
- Sprint 62 archived.
- Sprint 63 created for Granular Item-Level Material Approval in Warehouse Mandor Requests.
- Codebase audited: verified `material_requisition_items` schema, `material_requisitions` statuses, `inventory_transactions` relationships, and Gate 2 budget evaluation logic.
