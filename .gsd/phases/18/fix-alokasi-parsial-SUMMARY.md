# Summary: Fix Alokasi Parsial

- Diperbarui `PackageAllocationModal.tsx` agar mengizinkan penyimpanan jika tidak ada sisa negatif, dengan total yang tidak 0.
- Menambahkan status warning ketika sisa kuota parsial (masih ada yang > 0).
- Memperbarui signature `onApply` untuk mengembalikan `isComplete`.
- `RabCalculator.tsx` kini melacak status alokasi BOM ('COMPLETE' atau 'PARTIAL') per SPK di tabel `spk.allocation_status`.
