/**
 * Utility to convert numeric amount to Indonesian formal words ("Terbilang").
 * Example: 25000000 -> "Dua Puluh Lima Juta Rupiah"
 */

const SATUAN = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Delapan',
  'Sembilan',
  'Sepuluh',
  'Sebelas',
];

function toWords(num: number): string {
  const n = Math.floor(Math.abs(num));

  if (n < 12) {
    return SATUAN[n];
  }
  if (n < 20) {
    return `${toWords(n - 10)} Belas`;
  }
  if (n < 100) {
    const sisa = n % 10;
    return `${toWords(Math.floor(n / 10))} Puluh${sisa > 0 ? ` ${toWords(sisa)}` : ''}`;
  }
  if (n < 200) {
    const sisa = n - 100;
    return `Seratus${sisa > 0 ? ` ${toWords(sisa)}` : ''}`;
  }
  if (n < 1000) {
    const sisa = n % 100;
    return `${toWords(Math.floor(n / 100))} Ratus${sisa > 0 ? ` ${toWords(sisa)}` : ''}`;
  }
  if (n < 2000) {
    const sisa = n - 1000;
    return `Seribu${sisa > 0 ? ` ${toWords(sisa)}` : ''}`;
  }
  if (n < 1000000) {
    const sisa = n % 1000;
    return `${toWords(Math.floor(n / 1000))} Ribu${sisa > 0 ? ` ${toWords(sisa)}` : ''}`;
  }
  if (n < 1000000000) {
    const sisa = n % 1000000;
    return `${toWords(Math.floor(n / 1000000))} Juta${sisa > 0 ? ` ${toWords(sisa)}` : ''}`;
  }
  if (n < 1000000000000) {
    const sisa = n % 1000000000;
    return `${toWords(Math.floor(n / 1000000000))} Miliar${sisa > 0 ? ` ${toWords(sisa)}` : ''}`;
  }
  if (n < 1000000000000000) {
    const sisa = n % 1000000000000;
    return `${toWords(Math.floor(n / 1000000000000))} Triliun${sisa > 0 ? ` ${toWords(sisa)}` : ''}`;
  }

  return num.toString();
}

/**
 * Returns formatted terbilang string with currency suffix "Rupiah".
 * @param amount Number in IDR
 * @returns Example: "Dua Puluh Juta Rupiah"
 */
export function terbilang(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) {
    return 'Nol Rupiah';
  }

  const prefix = amount < 0 ? 'Minus ' : '';
  const result = toWords(Math.abs(amount)).trim();
  return `${prefix}${result} Rupiah`;
}
