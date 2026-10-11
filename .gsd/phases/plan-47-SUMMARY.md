---
phase: 47
plan: fix-bast-split-print-and-download-buttons
completed_at: 2026-10-11T15:39:00+07:00
duration_minutes: 5
---

# Summary: Pemisahan Tombol Aksi Cetak Dokumen dan Download PDF pada Modal BAST di /kasir

## Results
- 3 tasks completed
- All verifications passed

## Tasks Completed
| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Instalasi Library PDF Client-Side (jspdf & html2canvas) | 3293bc7 | ✅ |
| 2 | Pemisahan Tombol Header Toolbar & Implementasi Download PDF di BastModal.tsx | 3293bc7 | ✅ |
| 3 | Verifikasi, Type Checking, dan Build Validation | 3293bc7 | ✅ |

## Deviations Applied
- Penempatan deklarasi hook `useState` untuk state `isDownloadingPdf` diletakkan di baris atas sebelum conditional return `if (!isOpen || !spk) return null;` untuk mematuhi Rules of Hooks React.

## Files Changed
- `package.json` & `package-lock.json` - Ditambahkan dependensi `jspdf` (^4.2.1) dan `html2canvas` (^1.4.1).
- `src/components/BastModal.tsx` - Pemisahan toolbar modal menjadi dua tombol berdampingan: tombol "Download PDF" (aksen emerald dengan icon `Download` dan state `Loader2` saat proses rendering client-side berlangsung) serta tombol "Cetak Dokumen" (aksen oranye dengan icon `Printer` untuk dialog `window.print()`). Kedua tombol memiliki class `no-print` dan penamaan file unduhan otomatis `BAST-{spk_no}.pdf`.

## Verification
- Pemisahan Tombol Aksi: ✅ Passed (Tombol "Download PDF" dan "Cetak Dokumen" berdiri sendiri dan tersusun rapi berdampingan di header modal sebelum tombol close)
- Ekspor PDF Client-Side: ✅ Passed (Rendering `#printable-bast` menggunakan `html2canvas` 2x scale dan konversi `jsPDF` portrait A4 dengan auto-fit 1 lembar)
- Dialog Cetak Fisik: ✅ Passed (Tombol "Cetak Dokumen" memicu `window.print()` standar browser dengan tata letak A4 portrait 1 halaman)
- Styling no-print: ✅ Passed (Kedua tombol memiliki class `no-print` sehingga tidak ikut tercetak)
- TypeScript & Linter Check: ✅ Passed (`npx oxlint` 0 error)
- Vite Production Build: ✅ Passed (`npm run build` sukses)
