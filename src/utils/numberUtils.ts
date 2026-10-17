/**
 * Safely parses a number or string into a decimal float,
 * normalizing comma (',') decimal separators to standard dot ('.').
 *
 * @param val Number, string, null, or undefined
 * @returns Parsed number, or 0 if invalid/empty
 */
export const parseDecimalValue = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  // Ganti karakter koma ',' menjadi titik '.'
  const normalized = String(val).replace(',', '.').trim();
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

export const parseDecimal = parseDecimalValue;
