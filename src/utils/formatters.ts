import { formatIdrCurrency } from './financialCalculations';

/**
 * Format currency amount to Indonesian Rupiah (e.g. "Rp 50.000.000")
 */
export const formatRupiah = (amount: number): string => {
  return formatIdrCurrency(amount);
};

export { formatIdrCurrency };
