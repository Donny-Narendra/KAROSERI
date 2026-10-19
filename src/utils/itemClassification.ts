export type MasterItemType = 'MATERIAL' | 'LABOR' | 'OVERHEAD';

/**
 * Checks if a name or description contains common labor/jasa keywords.
 */
export const isLaborKeyword = (name?: string | null): boolean => {
  if (!name) return false;
  return /tukang|jasa|labor|ongkos|borongan|upah/i.test(name);
};

/**
 * Checks if a name or description contains common overhead/FOH keywords.
 */
export const isOverheadKeyword = (name?: string | null): boolean => {
  if (!name) return false;
  return /overhead|listrik|sewa bay|bay rate|sewa kompressor|kompresor|sewa/i.test(name);
};

/**
 * Resolves item type prioritising explicit item_type, then material item_type,
 * then falling back to keyword heuristics (LABOR -> OVERHEAD -> MATERIAL).
 */
export const resolveItemType = (
  explicitType?: string | null,
  materialType?: string | null,
  nameOrCategory?: string | null
): MasterItemType => {
  const upperExplicit = explicitType?.toUpperCase();
  if (upperExplicit === 'LABOR' || upperExplicit === 'OVERHEAD' || upperExplicit === 'MATERIAL') {
    return upperExplicit as MasterItemType;
  }
  const upperMaterial = materialType?.toUpperCase();
  if (upperMaterial === 'LABOR' || upperMaterial === 'OVERHEAD' || upperMaterial === 'MATERIAL') {
    return upperMaterial as MasterItemType;
  }
  if (isLaborKeyword(nameOrCategory)) {
    return 'LABOR';
  }
  if (isOverheadKeyword(nameOrCategory)) {
    return 'OVERHEAD';
  }
  return 'MATERIAL';
};
