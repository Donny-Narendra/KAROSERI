/**
 * Safely parses a number or string into a decimal float,
 * normalizing comma (',') decimal separators to standard dot ('.').
 *
 * @param val Number, string, null, or undefined
 * @returns Parsed number, or 0 if invalid/empty
 */
export const parseDecimal = (val: string | number | undefined | null): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  // Ganti koma ',' menjadi titik '.' untuk standarisasi format desimal lokal
  const normalized = typeof val === 'string' ? val.replace(',', '.') : String(val);
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};
