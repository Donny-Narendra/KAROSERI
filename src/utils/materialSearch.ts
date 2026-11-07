export interface SearchableMaterial {
  id?: string;
  material_id?: string;
  name: string;
  barcode?: string | null;
  code?: string | null;
  unit?: string;
  current_stock?: number;
  cost_price?: number;
  selling_price?: number;
  [key: string]: any;
}

/**
 * Universal dual-mode (Name or Barcode) search filter for materials.
 * Supports case-insensitive substring matching on name, barcode, and code.
 * Prioritizes exact and prefix barcode matches at the top of results.
 */
export function searchMaterials<T extends SearchableMaterial>(materials: T[], rawQuery: string): T[] {
  if (!rawQuery || !rawQuery.trim()) return materials.slice(0, 50);
  const q = rawQuery.toLowerCase().trim();

  const matched = materials.filter(item => {
    const matchName = item.name ? item.name.toLowerCase().includes(q) : false;
    const matchBarcode = item.barcode ? item.barcode.toLowerCase().includes(q) : false;
    const matchCode = item.code ? item.code.toLowerCase().includes(q) : false;
    return matchName || matchBarcode || matchCode;
  });

  return matched.sort((a, b) => {
    const aBarcodeExact = a.barcode && a.barcode.toLowerCase() === q;
    const bBarcodeExact = b.barcode && b.barcode.toLowerCase() === q;
    if (aBarcodeExact && !bBarcodeExact) return -1;
    if (!aBarcodeExact && bBarcodeExact) return 1;

    const aBarcodeStarts = a.barcode && a.barcode.toLowerCase().startsWith(q);
    const bBarcodeStarts = b.barcode && b.barcode.toLowerCase().startsWith(q);
    if (aBarcodeStarts && !bBarcodeStarts) return -1;
    if (!aBarcodeStarts && bBarcodeStarts) return 1;

    const aNameExact = a.name && a.name.toLowerCase() === q;
    const bNameExact = b.name && b.name.toLowerCase() === q;
    if (aNameExact && !bNameExact) return -1;
    if (!aNameExact && bNameExact) return 1;

    const aNameStarts = a.name && a.name.toLowerCase().startsWith(q);
    const bNameStarts = b.name && b.name.toLowerCase().startsWith(q);
    if (aNameStarts && !bNameStarts) return -1;
    if (!aNameStarts && bNameStarts) return 1;

    return 0;
  });
}

export const filterMaterialsByNameOrBarcode = searchMaterials;

/**
 * Searches for an exact barcode match (case-insensitive, trimmed).
 * Used for instant barcode scanner gun selection on Enter key.
 */
export function findExactBarcodeMatch<T extends SearchableMaterial>(
  materials: T[],
  rawQuery: string
): T | undefined {
  if (!rawQuery || !rawQuery.trim()) return undefined;
  const q = rawQuery.toLowerCase().trim();
  return materials.find(m => m.barcode && m.barcode.toLowerCase() === q);
}
