## Phase 18 Verification

### Must-Haves
- [x] Buka kunci tombol Terapkan ke RAB untuk alokasi parsial di PackageAllocationModal — VERIFIED (evidence: Code di `PackageAllocationModal.tsx` menggunakan `hasNegativeRemainder || totalAllocatedSum === 0` sebagai `disabled` button condition)
- [x] Proteksi filter antrean SPK Kasir dari RAB alokasi parsial — VERIFIED (evidence: `KasirDashboard.tsx` memfilter `displayedSpks` menggunakan `s.allocationStatus !== 'PARTIAL'`)

### Verdict: PASS
