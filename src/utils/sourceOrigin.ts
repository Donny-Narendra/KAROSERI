export interface SourceOriginResult {
  origin: 'RAB' | 'Change Order';
  typeLabel: string;
  fullLabel: string;
  badgeClass: string;
}

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
    const cleaned = match[1].trim();
    return cleaned || null;
  }

  const stripped = trimmed.replace(/^\[+|\]+$/g, '').trim();
  return stripped || null;
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
 * Resolves detailed source origin with explicit document origin prefix ("RAB" or "Change Order")
 * and entry type ("Paket: <Name>" or "Granular" for non-packaged/loose items).
 */
export function resolveDetailedSource(
  item: any,
  req?: any,
  spkPackageMap?: Map<string, string> | Record<string, string> | null
): SourceOriginResult {
  // 1. Tentukan Asal Dokumen: Change Order vs RAB
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
  const origin: 'RAB' | 'Change Order' = isChangeOrder ? 'Change Order' : 'RAB';

  // Helper untuk lookup paket dari spkPackageMap (baik jika Map atau Record)
  const lookupPackage = (matId?: string | null, wbs?: string | null): string | null => {
    if (!matId) return null;
    const mapObj = spkPackageMap || item?.spkPackageMap || req?.spkPackageMap;
    if (!mapObj) return null;

    if (mapObj instanceof Map) {
      if (wbs && mapObj.has(`${matId}_${wbs}`)) {
        return mapObj.get(`${matId}_${wbs}`) || null;
      }
      return mapObj.get(matId) || null;
    }
    if (typeof mapObj === 'object') {
      const rec = mapObj as Record<string, string>;
      if (wbs && rec[`${matId}_${wbs}`]) {
        return rec[`${matId}_${wbs}`] || null;
      }
      return rec[matId] || null;
    }
    return null;
  };

  const mrItem = Array.isArray(item?.material_requisition_items)
    ? item.material_requisition_items[0]
    : item?.material_requisition_items;

  const matId = item?.material_id || mrItem?.material_id || req?.material_id;
  const wbsStage = item?.wbs_stage || item?.wbs_category || mrItem?.wbs_stage || req?.wbs_category || req?.wbs_stage;
  const packageFromLookup = lookupPackage(matId, wbsStage);

  // 2. Tentukan Apakah Paket atau Granular
  // Penelusuran Nama Paket (Package Origin Resolver):
  // a. Prioritas 1: Baca langsung kolom package_name pada record transaksi
  // b. Prioritas 2: Baca material_requisition_items.package_name melalui relasi requisition_item_id
  // c. Prioritas 3: Cari kecocokan di rab_items milik SPK dan WBS tersebut di mana material_id sama dan package_id IS NOT NULL,
  //    atau ambil dari lookup spkPackageMap
  // d. Fallback: Jika benar-benar tidak terikat dengan paket manapun di RAB, barulah beri label Granular
  const rawPackageName =
    item?.package_name ||
    mrItem?.package_name ||
    item?.product_packages?.name ||
    mrItem?.product_packages?.name ||
    item?.package_source_name ||
    item?.product_package?.name ||
    mrItem?.product_package?.name ||
    item?.rab_items?.product_packages?.name ||
    item?.rab_items?.product_package?.name ||
    mrItem?.rab_items?.product_packages?.name ||
    mrItem?.rab_items?.product_package?.name ||
    packageFromLookup ||
    req?.package_name ||
    req?.product_packages?.name ||
    extractPackageFromNotes(item?.notes) ||
    extractPackageFromNotes(mrItem?.notes) ||
    extractPackageFromNotes(item?.rab_items?.notes) ||
    extractPackageFromNotes(mrItem?.rab_items?.notes) ||
    extractPackageFromNotes(item?.change_order_items?.notes) ||
    extractPackageFromNotes(mrItem?.change_order_items?.notes) ||
    extractPackageFromNotes(req?.notes);

  // Bersihkan teks "Paket: " jika sudah ada sebelumnya agar tidak dobel
  let cleanName: string | null = null;
  if (rawPackageName && typeof rawPackageName === 'string') {
    cleanName = cleanPackageName(rawPackageName);
    if (cleanName) {
      cleanName = cleanName.replace(/^Paket:\s*/i, '').trim();
    }
  }

  if (cleanName) {
    const typeLabel = `Paket: ${cleanName}`;
    const fullLabel = `${origin} • ${typeLabel}`;
    const badgeClass = isChangeOrder
      ? 'bg-purple-950/70 text-purple-300 border border-purple-600/50'
      : 'bg-amber-950/70 text-amber-300 border border-amber-600/50';

    return { origin, typeLabel, fullLabel, badgeClass };
  }

  // Jika tidak memakai paket (lepas / manual / granular)
  const typeLabel = 'Granular';
  const fullLabel = `${origin} • Granular`;
  const badgeClass = isChangeOrder
    ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-600/50'
    : 'bg-blue-950/70 text-blue-300 border border-blue-600/50';

  return { origin, typeLabel, fullLabel, badgeClass };
}

/**
 * Resolves source origin and returns formatted display label and CSS badge classes.
 * Preserves compatibility with existing components by providing both `label` and `fullLabel`.
 */
export function resolveItemSource(
  item: any,
  req?: any,
  spkPackageMap?: Map<string, string> | Record<string, string> | null
): ResolvedItemSource & SourceOriginResult {
  const detailed = resolveDetailedSource(item, req, spkPackageMap);
  const isPackage = detailed.typeLabel.startsWith('Paket:');
  const packageName = isPackage ? detailed.typeLabel.replace(/^Paket:\s*/i, '').trim() : null;

  return {
    ...detailed,
    label: detailed.fullLabel,
    sourceType: detailed.origin === 'Change Order' ? 'CHANGE_ORDER' : (isPackage ? 'PACKAGE' : 'RAB'),
    packageName,
  };
}

/**
 * Resolves source origin specifically from a material issue record (which may have
 * nested material_requisition_items, material_requisitions, spk, or audit_notes).
 */
export function extractIssueSource(
  issue: any,
  spkPackageMap?: Map<string, string> | Record<string, string> | null
): SourceOriginResult & ResolvedItemSource {
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
  return resolveItemSource(mergedItem, mr || issue.spk, spkPackageMap || issue.spkPackageMap);
}
