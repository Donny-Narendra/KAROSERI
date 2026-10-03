# Research: Phase 8 - Material Requisition & SPK Borongan

## 1. Domain Understanding & Requirements

### Mandor Requisition & Warehouse Issue
- **Current Flow:** Petugas Gudang directly inputs `inventory_transactions`.
- **New Flow:** Mandor creates a `material_requisitions` record with multiple `material_requisition_items`. Petugas Gudang views these pending requests and approves them, which automatically creates `inventory_transactions`.

### Customer-Supplied Material
- **Requirement:** Track materials that are supplied by the customer so they aren't billed.
- **Approach:** Add a boolean flag `is_customer_supplied` to the `materials` table. In `KasirDashboard` and `AdminDashboard`, if `is_customer_supplied` is true, the effective cost is 0. Wait, if it's on the material table, the unit_price can just be set to 0. But a flag helps explicitly identify it.

### Manajemen Borongan (SPK-B) per WBS
- **Requirement:** Assign third-party/internal borongan workers per WBS category with a contract value. Support progress tracking, printing SPK-B, and re-assigning (opname fisik) if a worker drops out midway.
- **Approach:**
  - Create table `spk_borongan` with fields: `spk_id`, `wbs_category`, `worker_name`, `contract_value`, `status` (ACTIVE, CUT_OFF, COMPLETED), `progress_percentage`.
  - When Opname Fisik happens (e.g., worker leaves at 40%), the current `spk_borongan` is marked `CUT_OFF` and a new one can be created for the remaining 60%.
  
## 2. Schema Additions Needed

1. **Enum `requisition_status`**: 'PENDING', 'APPROVED', 'REJECTED'
2. **Table `material_requisitions`**:
   - `id` UUID
   - `spk_id` UUID
   - `wbs_category` wbs_category
   - `requested_by` UUID (profile)
   - `status` requisition_status
3. **Table `material_requisition_items`**:
   - `id` UUID
   - `requisition_id` UUID
   - `material_id` UUID
   - `quantity` numeric
4. **Table modifications**:
   - `materials`: Add `is_customer_supplied BOOLEAN DEFAULT false`
5. **Table `spk_borongan`**:
   - `id` UUID
   - `spk_id` UUID
   - `wbs_category` wbs_category
   - `worker_name` text
   - `contract_value` numeric
   - `status` text ('ACTIVE', 'CUT_OFF', 'COMPLETED')
   - `progress_percentage` numeric
   - `created_by` UUID
   - `created_at` timestamp

## 3. Wave Strategy

- **Wave 1:** Database Schema Migrations & Types Updates.
- **Wave 2:** Mandor Features (Material Requisition Form, Assign SPK-Borongan).
- **Wave 3:** Gudang Features (Requisition Approval) & Advanced SPK-B (Opname Fisik & Cetak SPK-B).
