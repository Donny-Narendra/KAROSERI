/**
 * Utility for RAB item composite key generation and deduplication.
 * Ensures uniqueness at fetching and client state levels to prevent duplicated rows.
 */

function cleanText(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase();
}

/**
 * Generate a canonical composite key for a RAB item.
 * Supports camelCase (frontend model), snake_case (database record),
 * and joined relations (e.g., product_packages).
 */
export function getRabItemCompositeKey(item: any): string {
  if (!item) return '';

  const estId = cleanText(item.rab_estimation_id || item.rabEstimationId || item.spk_id || item.spkId || '');
  const pkgId = cleanText(
    item.package_id ||
    item.packageId ||
    item.product_packages?.id ||
    item.package_name ||
    item.packageName ||
    ''
  );
  const matId = cleanText(item.material_id || item.materialId || '');
  const desc = cleanText(item.description || item.material_name || '');
  const wbs = cleanText(item.wbs_category || item.wbsCategory || item.wbs_stage || '');
  
  // Normalize item type to uppercase: MATERIAL | LABOR | OVERHEAD
  const rawType = item.item_type || item.type || 'MATERIAL';
  let itemType = String(rawType).trim().toUpperCase();
  if (itemType === 'MATERIAL' && (item.labor_hours || item.labor_rate)) {
    itemType = 'LABOR';
  } else if (itemType === 'MATERIAL' && (item.overhead_hours || item.overhead_rate)) {
    itemType = 'OVERHEAD';
  }

  // Parse numeric values with fallback to 0
  const qty = Number(
    item.quantity ??
    item.qty ??
    item.labor_hours ??
    (item.overhead_hours ? Number(item.overhead_hours) / 8 : undefined) ??
    0
  );

  const unitPrice = Number(
    item.unit_price ??
    item.unitPrice ??
    item.labor_rate ??
    (item.overhead_rate ? Number(item.overhead_rate) * 8 : undefined) ??
    0
  );

  const costPrice = Number(item.cost_price ?? item.costPrice ?? 0);

  // Distinguish source origin if present (e.g., in consolidated views where RAB vs Change Order might share description)
  const sourceOrigin = cleanText(item.source_origin || item.sourceOrigin || '');
  const coId = cleanText(item.change_order_id || item.changeOrderId || '');

  return [
    sourceOrigin,
    coId,
    estId,
    pkgId,
    matId,
    desc,
    wbs,
    itemType,
    Math.round(qty * 100) / 100,
    Math.round(unitPrice),
    Math.round(costPrice)
  ].join('::');
}

export interface DeduplicateOptions<T> {
  keyFn?: (item: T) => string;
  checkIdOnly?: boolean;
}

/**
 * Filter an array of items to enforce uniqueness.
 * Retains the first encountered instance of any duplicated key or identical ID.
 */
export function deduplicateRabItems<T>(
  items: T[],
  options?: DeduplicateOptions<T>
): T[] {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return [];
  }

  const seenKeys = new Set<string>();
  const seenIds = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (!item) continue;

    const itemId = (item as any)?.id;
    const stringId = itemId !== undefined && itemId !== null ? String(itemId).trim() : null;

    // If ID was already seen, it is a guaranteed duplicate
    if (stringId && seenIds.has(stringId)) {
      continue;
    }

    if (options?.checkIdOnly) {
      if (stringId) seenIds.add(stringId);
      result.push(item);
      continue;
    }

    const key = options?.keyFn ? options.keyFn(item) : getRabItemCompositeKey(item);

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    if (stringId) {
      seenIds.add(stringId);
    }
    result.push(item);
  }

  return result;
}
