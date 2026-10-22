export interface ItemSourceInfo {
  sourceType: 'RAB' | 'CHANGE_ORDER' | 'DIRECT' | 'PACKAGE';
  packageName?: string | null;
}

export interface ResolvedItemSource {
  label: string;
  badgeClass: string;
  sourceType: 'RAB' | 'CHANGE_ORDER' | 'DIRECT' | 'PACKAGE';
  packageName: string | null;
}

/**
 * Normalizes package name string by stripping extra wrapping or brackets.
 */
export function cleanPackageName(name?: string | null): string | null {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (!trimmed) return null;

  // Extract from format: [Paket: XYZ] or Paket: XYZ
  const match = trimmed.match(/^(?:\[\s*)?Paket:\s*([^\]]+?)(?:\s*\])?$/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  return trimmed.replace(/^\[+|\]+$/g, '').trim();
}

/**
 * Extracts package name from notes if formatted like '[Paket: Nama Paket]'
 */
export function extractPackageFromNotes(notes?: string | null): string | null {
  if (!notes || typeof notes !== 'string') return null;
  const match = notes.match(/\[Paket:\s*([^\]]+)\]/i) || notes.match(/Paket:\s*([^\r\n,;]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

/**
 * Resolves source origin (RAB, Change Order, Package, or Direct)
 * and returns formatted display label and CSS badge classes.
 */
export function resolveItemSource(item: any, req?: any): ResolvedItemSource {
  if (!item && !req) {
    return {
      label: '📋 RAB',
      badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
      sourceType: 'RAB',
      packageName: null,
    };
  }

  // 1. Cek apakah item berasal dari paket barang jadi (BOM / Assembly List)
  const directPackage =
    item?.package_name ||
    item?.package_source_name ||
    item?.product_packages?.name ||
    item?.product_package?.name ||
    item?.rab_items?.product_packages?.name ||
    item?.rab_items?.product_package?.name ||
    req?.package_name ||
    req?.product_packages?.name;

  let packageName = cleanPackageName(directPackage);

  // Jika belum ketemu dari field objek, periksa field catatan (notes)
  if (!packageName) {
    const notePackage =
      extractPackageFromNotes(item?.notes) ||
      extractPackageFromNotes(item?.rab_items?.notes) ||
      extractPackageFromNotes(item?.change_order_items?.notes) ||
      extractPackageFromNotes(req?.notes);
    if (notePackage) {
      packageName = cleanPackageName(notePackage);
    }
  }

  if (packageName) {
    return {
      label: `📦 Paket: ${packageName}`,
      badgeClass: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
      sourceType: 'PACKAGE',
      packageName,
    };
  }

  // 2. Cek apakah berasal dari Change Order (Adendum)
  const isChangeOrder = Boolean(
    item?.change_order_id ||
    item?.change_order_item_id ||
    item?.change_order_items ||
    item?.source_type === 'CHANGE_ORDER' ||
    item?.sourceType === 'CHANGE_ORDER' ||
    item?.is_change_order ||
    req?.is_change_order ||
    req?.change_order_id
  );

  if (isChangeOrder) {
    return {
      label: '🔄 Change Order',
      badgeClass: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
      sourceType: 'CHANGE_ORDER',
      packageName: null,
    };
  }

  // 3. Cek apakah pengeluaran/permintaan langsung (Direct / Manual)
  const isDirect = Boolean(
    item?.source_type === 'DIRECT' ||
    item?.sourceType === 'DIRECT' ||
    item?.is_manual ||
    item?.isManual
  );

  if (isDirect) {
    return {
      label: '⚡ Langsung',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      sourceType: 'DIRECT',
      packageName: null,
    };
  }

  // 4. Default: Dari estimasi RAB awal
  return {
    label: '📋 RAB',
    badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    sourceType: 'RAB',
    packageName: null,
  };
}

/**
 * Resolves source origin specifically from a material issue record (which may have
 * nested material_requisition_items, material_requisitions, spk, or audit_notes).
 */
export function extractIssueSource(issue: any): ResolvedItemSource {
  if (!issue) return resolveItemSource(null);
  const mrItem = Array.isArray(issue.material_requisition_items)
    ? issue.material_requisition_items[0]
    : issue.material_requisition_items;
  const mr = Array.isArray(issue.material_requisitions)
    ? issue.material_requisitions[0]
    : issue.material_requisitions;

  const mergedItem = {
    ...issue,
    ...mrItem,
    rab_items: mrItem?.rab_items || issue.rab_items,
    change_order_items: mrItem?.change_order_items || issue.change_order_items,
    product_packages: mrItem?.product_packages || issue.product_packages,
    notes: mrItem?.notes || issue.audit_notes || issue.notes,
  };
  return resolveItemSource(mergedItem, mr || issue.spk);
}

