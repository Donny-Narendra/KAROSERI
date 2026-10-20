# Sprint 54 — Add Printable Down Payment Invoice Receipt in Cashier DP Modal and History

> **Duration**: 2026-10-20 to 2026-10-21
> **Status**: In Progress

## Goal
Implement a professional printable Down Payment Receipt (Invoice DP) modal and print actions in Kasir (`/kasir`), enabling cashiers to instantly preview and print official RobelKaroseri A4 down payment receipts upon recording a DP and anytime from the DP Received History tab.

## Scope

### Included
- **Indonesian Currency to Words Utility (`src/utils/terbilang.ts`)**:
  - Convert any nominal Rupiah into clean, grammatically correct Indonesian words ("Terbilang").
- **Printable DP Invoice Receipt Component (`src/components/finance/DpReceiptPrintModal.tsx`)**:
  - Formal RobelKaroseri header kop: "ROBELKAROSERI - BUKTI PENERIMAAN UANG MUKA (INVOICE DP)".
  - Official Receipt No: `DP/{spk_number}/{YYYYMMDD}`.
  - Payment date and time formatting in ID locale.
  - Customer information: Customer name, SPK No, Vehicle Plate, Vehicle Model / VIN.
  - Itemized payment summary:
    - Total Estimasi Nilai Kontrak SPK
    - Nominal Uang Muka (DP) yang Dibayarkan (Rupiah & Terbilang)
    - Metode Pembayaran (Transfer Bank / Tunai / Giro)
    - Catatan / Referensi Bukti Bayar
    - Sisa Estimasi Tagihan Pelunasan
  - Dual signature section: Kasir Penerima & Pihak Penyetor.
  - Action buttons: "Cetak Kuitansi" (`window.print()`) and "Tutup".
  - Clean single-page `@media print` styling leveraging `#print-root`.
- **Down Payment Modal Integration (`src/components/DownPaymentModal.tsx`)**:
  - Success notification after DP recording with dual actions: `[ Cetak Bukti Bayar / Invoice DP ]` and `[ Selesai ]`.
  - Seamlessly opens `DpReceiptPrintModal` on cashier confirmation.
- **DP History Tab Integration (`src/components/DpHistoryList.tsx` & `src/services/billingService.ts`)**:
  - Enriched `DPHistoryRecord` data contract with contract estimates and vehicle details.
  - Updated "Cetak Kuitansi DP" button to open the official `DpReceiptPrintModal`.
- **Automated Verification & Tests**:
  - Unit tests for `terbilang.ts`.
  - Component tests for `DpReceiptPrintModal.tsx`, `DownPaymentModal.tsx`, and `DpHistoryList.tsx`.
  - Oxlint and Vite production build verification.

### Explicitly Excluded
- Modifying final bill generation rules (Gate 3 QC pass requirements).
- Changing backend database schemas (uses existing `payments` and `spk` fields).

## Tasks

| Task | Assignee | Status | Est. Hours |
|------|----------|--------|------------|
| 1. Create Indonesian number-to-words utility (`src/utils/terbilang.ts`) & unit tests | Antigravity | ⏳ In Progress | 0.3h |
| 2. Create `DpReceiptPrintModal.tsx` print template component | Antigravity | ⬜ Todo | 0.5h |
| 3. Integrate receipt print flow into `DownPaymentModal.tsx` | Antigravity | ⬜ Todo | 0.4h |
| 4. Integrate receipt print modal into `DpHistoryList.tsx` & update `billingService.ts` | Antigravity | ⬜ Todo | 0.3h |
| 5. Automated testing, quality verification, and git commit | Antigravity | ⬜ Todo | 0.4h |

## Daily Log

### 2026-10-20
- Initialized Sprint 54: Add Printable Down Payment Invoice Receipt in Cashier DP Modal and History.
- Updated `.gsd/STATE.md` to reflect active Sprint 54.
