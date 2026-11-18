/**
 * Gate 2 Warehouse Approval Quota Guard (Quantity-Based)
 *
 * Segregation of Duties:
 * - Warehouse (/warehouse) strictly controls physical quantities issued (Qty)
 *   against WBS-specific RAB + Approved Change Order material allocations (+ waste factor).
 * - Supplier purchase price (cost_price) fluctuations do NOT block warehouse approvals
 *   as long as physical quantity is within quota; price variance is displayed
 *   as a non-blocking audit notice and recorded honestly in /finance-reports.
 * - Excludes LABOR and OVERHEAD items exclusively.
 */

export const GATE2_QTY_EPSILON = 0.001;

export interface RabItemGate2 {
  id?: string;
  spk_id?: string;
  wbs_stage?: string | null;
  wbs_category?: string | null;
  item_type?: string | null;
  quantity?: number;
  waste_percentage?: number | null;
  waste_factor_percentage?: number | null;
  unit?: string | null;
  unit_price?: number;
  cost_price?: number;
  item_total?: number;
  description?: string;
  material_name?: string;
  material_id?: string | null;
  package_id?: string | null;
  package_name?: string | null;
  materials?: {
    id?: string;
    name?: string | null;
    unit?: string | null;
    cost_price?: number | null;
    unit_price?: number | null;
    waste_factor_percentage?: number | null;
  } | null;
}

export interface ChangeOrderItemGate2 {
  id?: string;
  spk_id?: string;
  wbs_stage?: string | null;
  item_type?: string | null;
  quantity?: number;
  waste_percentage?: number | null;
  waste_factor_percentage?: number | null;
  unit?: string | null;
  unit_price?: number;
  cost_price?: number;
  subtotal?: number;
  material_id?: string | null;
  item_name?: string;
  package_source_id?: string | null;
  package_name?: string | null;
  materials?: {
    id?: string;
    name?: string | null;
    unit?: string | null;
    cost_price?: number | null;
    unit_price?: number | null;
    waste_factor_percentage?: number | null;
  } | null;
}

export interface MaterialRequisitionItemGate2 {
  id?: string;
  material_id?: string | null;
  rab_item_id?: string | null;
  change_order_item_id?: string | null;
  material_name?: string | null;
  quantity?: number;
  unit?: string | null;
  unit_price?: number;
  cost_price?: number;
  subtotal?: number;
  wbs_stage?: string | null;
  status?: string | null;
  materials?: {
    id?: string;
    name?: string | null;
    unit?: string | null;
    unit_price?: number | null;
    cost_price?: number | null;
    waste_factor_percentage?: number | null;
  } | null;
}

export interface ApprovedRequisitionGate2 {
  id?: string;
  spk_id?: string;
  wbs_category?: string | null;
  status?: string | null;
  material_requisition_items?: MaterialRequisitionItemGate2[];
}

export interface DirectIssueGate2 {
  id?: string;
  spk_id?: string;
  material_id?: string | null;
  material_name?: string | null;
  quantity_issued?: number;
  quantity?: number;
  custom_unit_price?: number;
  materials?: {
    id?: string;
    name?: string | null;
    unit_price?: number | null;
    cost_price?: number | null;
  } | null;
  status?: string | null;
  wbs_stage?: string | null;
}

export interface MasterMaterialGate2 {
  id: string;
  name?: string | null;
  unit?: string | null;
  cost_price?: number | null;
  unit_price?: number | null;
  waste_factor_percentage?: number | null;
}

export interface Gate2ItemEvaluationResult {
  qtyPaguRab: number;
  qtySudahKeluar: number;
  qtyPermintaanSaatIni: number;
  proyeksiTotalQty: number;
  remainingQtyQuota: number;
  overQty: number;
  isQtyOverQuota: boolean;
  hasRabQuota: boolean;
  satuan: string;
  wbsStageName: string;
  materialName: string;

  // Informative Rupiah price fluctuation tracking (non-blocking)
  paguRupiahRab: number;
  aktualRupiah: number;
  costVarianceRp: number;
  rabUnitCost: number;
  aktualUnitCost: number;

  // Alias for non-blocking compatibility
  isOverBudget: boolean;
  statusVariant: 'success' | 'info' | 'danger';
  statusBadge: {
    title: string;
    description: string;
    variant: 'success' | 'info' | 'danger';
  };
}

export interface Gate2TicketEvaluationResult {
  isQtyOverQuota: boolean;
  isOverBudget: boolean;
  wbsStageName: string;
  displayProjectedQty: number;
  displayQuotaQty: number;
  displayUnit: string;
  paguRupiahRab: number;
  aktualRupiah: number;
  costVarianceRp: number;
  primaryOverQuotaItem: Gate2ItemEvaluationResult | null;
  overQuotaItems: Gate2ItemEvaluationResult[];
  groupedEvaluations: Gate2ItemEvaluationResult[];
  itemEvaluations: Record<string, Gate2ItemEvaluationResult>;
  statusVariant: 'success' | 'info' | 'danger';
  statusBadge: {
    title: string;
    description: string;
    variant: 'success' | 'info' | 'danger';
  };
}

/**
 * Formats a quantity cleanly up to 3 decimal places without trailing floating-point noise.
 */
export function formatGate2Qty(val: number): string {
  if (!Number.isFinite(val)) return '0';
  const rounded = Math.round(val * 1000) / 1000;
  return String(Number(rounded.toFixed(3)));
}

/**
 * Normalizes WBS stage/category name for flexible matching.
 * e.g. "WBS 1: Pembongkaran" -> "pembongkaran"
 * "Pembongkaran" -> "pembongkaran"
 * "WBS 2: Sasis/Rangka" -> "sasis rangka"
 */
export function normalizeWbsStage(stage?: string | null): string {
  if (!stage) return '';
  return stage
    .replace(/^WBS\s*\d+:\s*/i, '')
    .toLowerCase()
    .replace(/[^\w\s\d]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if two stage representations point to the same WBS stage.
 */
export function matchWbsStage(stageA?: string | null, stageB?: string | null): boolean {
  if (!stageA || !stageB) return false;
  const normA = normalizeWbsStage(stageA);
  const normB = normalizeWbsStage(stageB);
  if (!normA || !normB) return false;
  return normA === normB;
}

function stripPackageLabel(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/^(?:Bagian dari paket:\s*)?(?:\[?Paket:\s*[^\]]+\]?\s*[-:]?\s*)/i, '')
    .trim();
}

function normalizeMaterialKey(str?: string | null): string {
  const cleaned = stripPackageLabel(str);
  if (!cleaned) return '';
  return cleaned
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\w\s\d]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSameMaterialTarget(params: {
  targetMaterialId?: string | null;
  targetMaterialName?: string | null;
  targetRabItemId?: string | null;
  targetChangeOrderItemId?: string | null;
  recordMaterialId?: string | null;
  recordName?: string | null;
  recordRabItemId?: string | null;
  recordChangeOrderItemId?: string | null;
}): boolean {
  const {
    targetMaterialId,
    targetMaterialName,
    targetRabItemId,
    targetChangeOrderItemId,
    recordMaterialId,
    recordName,
    recordRabItemId,
    recordChangeOrderItemId,
  } = params;

  if (targetMaterialId && recordMaterialId) {
    return targetMaterialId === recordMaterialId;
  }

  if (targetRabItemId && recordRabItemId && targetRabItemId === recordRabItemId) {
    return true;
  }

  if (targetChangeOrderItemId && recordChangeOrderItemId && targetChangeOrderItemId === recordChangeOrderItemId) {
    return true;
  }

  // Fallback when material_id is missing on either side (legacy rows / BOM descriptions / tests)
  const normTarget = normalizeMaterialKey(targetMaterialName);
  const normRecord = normalizeMaterialKey(recordName);
  if (normTarget && normRecord) {
    return normTarget === normRecord;
  }

  return false;
}

/**
 * Evaluates Gate 2 Quantity Quota & informative price variance for a single material item
 * within a specific SPK and WBS stage.
 */
export function evaluateGate2ItemQuota(params: {
  spkId: string;
  wbsStage?: string | null;
  materialId?: string | null;
  materialName?: string | null;
  rabItemId?: string | null;
  changeOrderItemId?: string | null;
  unit?: string | null;
  currentRequestQty: number;
  currentInventoryCostPrice?: number | null;
  rabItems: RabItemGate2[];
  approvedCoItems?: ChangeOrderItemGate2[];
  approvedReqs?: ApprovedRequisitionGate2[];
  directIssues?: DirectIssueGate2[];
  masterMaterials?: MasterMaterialGate2[];
}): Gate2ItemEvaluationResult {
  const {
    spkId,
    wbsStage,
    materialId,
    materialName,
    rabItemId,
    changeOrderItemId,
    unit,
    currentRequestQty,
    currentInventoryCostPrice,
    rabItems,
    approvedCoItems = [],
    approvedReqs = [],
    directIssues = [],
    masterMaterials = [],
  } = params;

  const normStage = normalizeWbsStage(wbsStage);
  const wbsStageName = wbsStage?.trim() || 'Tahapan WBS';
  const normTargetName = normalizeMaterialKey(materialName);

  const matchedMaster = masterMaterials.find(m => {
    if (materialId && m.id === materialId) return true;
    return Boolean(normTargetName && normalizeMaterialKey(m.name) === normTargetName);
  });

  const resolvedMaterialId = materialId || matchedMaster?.id || null;
  const displayName = materialName?.trim() || matchedMaster?.name?.trim() || 'Material';
  const satuan = unit?.trim() || matchedMaster?.unit?.trim() || 'pcs';

  // 1. Calculate qtyPaguRab from rab_items + approved change_order_items (MATERIAL only)
  let qtyPaguRab = 0;
  let totalRabBaselineValue = 0;
  let hasExplicitCostPrice = false;

  rabItems.forEach(ri => {
    if (ri.spk_id && ri.spk_id !== spkId) return;

    const type = (ri.item_type || '').toUpperCase();
    if (type && type !== 'MATERIAL') return;

    if (normStage) {
      const itemStageNorm = normalizeWbsStage(ri.wbs_stage || ri.wbs_category);
      if (itemStageNorm && itemStageNorm !== normStage) return;
    }

    const recordName = ri.material_name || stripPackageLabel(ri.description) || ri.description || '';
    const matches = isSameMaterialTarget({
      targetMaterialId: resolvedMaterialId,
      targetMaterialName: displayName,
      targetRabItemId: rabItemId,
      recordMaterialId: ri.material_id || ri.materials?.id,
      recordName,
      recordRabItemId: ri.id,
    });
    if (!matches) return;

    const rawQty = Number(ri.quantity || 0);
    const wastePct = Number(
      ri.waste_percentage ??
        ri.waste_factor_percentage ??
        ri.materials?.waste_factor_percentage ??
        matchedMaster?.waste_factor_percentage ??
        0
    );
    const effectiveQty = rawQty * (1 + wastePct / 100);
    qtyPaguRab += effectiveQty;

    const explicitCost = Number(ri.cost_price || 0);
    if (explicitCost > 0) hasExplicitCostPrice = true;
    const fallbackUnitPrice =
      Number(ri.unit_price || 0) > 0
        ? Number(ri.unit_price)
        : rawQty > 0 && Number(ri.item_total || 0) > 0
          ? Number(ri.item_total) / rawQty
          : 0;
    const unitCost = explicitCost > 0 ? explicitCost : fallbackUnitPrice;
    totalRabBaselineValue += effectiveQty * unitCost;
  });

  approvedCoItems.forEach(ci => {
    if (ci.spk_id && ci.spk_id !== spkId) return;

    const type = (ci.item_type || '').toUpperCase();
    if (type && type !== 'MATERIAL') return;

    if (normStage) {
      const coStageNorm = normalizeWbsStage(ci.wbs_stage);
      if (coStageNorm && coStageNorm !== normStage) return;
    }

    const matches = isSameMaterialTarget({
      targetMaterialId: resolvedMaterialId,
      targetMaterialName: displayName,
      targetChangeOrderItemId: changeOrderItemId,
      recordMaterialId: ci.material_id || ci.materials?.id,
      recordName: ci.item_name,
      recordChangeOrderItemId: ci.id,
    });
    if (!matches) return;

    const rawQty = Number(ci.quantity || 0);
    const wastePct = Number(
      ci.waste_percentage ??
        ci.waste_factor_percentage ??
        ci.materials?.waste_factor_percentage ??
        matchedMaster?.waste_factor_percentage ??
        0
    );
    const effectiveQty = rawQty * (1 + wastePct / 100);
    qtyPaguRab += effectiveQty;

    const explicitCost = Number(ci.cost_price || 0);
    if (explicitCost > 0) hasExplicitCostPrice = true;
    const fallbackUnitPrice =
      Number(ci.unit_price || 0) > 0
        ? Number(ci.unit_price)
        : rawQty > 0 && Number(ci.subtotal || 0) > 0
          ? Number(ci.subtotal) / rawQty
          : 0;
    const unitCost = explicitCost > 0 ? explicitCost : fallbackUnitPrice;
    totalRabBaselineValue += effectiveQty * unitCost;
  });

  // 2. Calculate qtySudahKeluar from approved requisitions + direct issues
  let qtySudahKeluar = 0;

  approvedReqs
    .filter(req => !req.spk_id || req.spk_id === spkId)
    .forEach(req => {
      const reqStageNorm = normalizeWbsStage(req.wbs_category);
      (req.material_requisition_items || []).forEach(subItem => {
        const subStatus = (subItem.status || '').toUpperCase();
        if (subStatus === 'REJECTED' || subStatus === 'CANCELLED') return;
        if (req.status === 'PARTIALLY_ISSUED' && subStatus !== 'APPROVED' && subStatus !== 'ISSUED') {
          return;
        }

        if (normStage) {
          const itemStageNorm = normalizeWbsStage(subItem.wbs_stage);
          const stageMatches =
            (itemStageNorm && itemStageNorm === normStage) ||
            (!itemStageNorm && reqStageNorm === normStage);
          if (!stageMatches) return;
        }

        const matches = isSameMaterialTarget({
          targetMaterialId: resolvedMaterialId,
          targetMaterialName: displayName,
          targetRabItemId: rabItemId,
          targetChangeOrderItemId: changeOrderItemId,
          recordMaterialId: subItem.material_id || subItem.materials?.id,
          recordName: subItem.material_name || subItem.materials?.name,
          recordRabItemId: subItem.rab_item_id,
          recordChangeOrderItemId: subItem.change_order_item_id,
        });
        if (!matches) return;

        qtySudahKeluar += Number(subItem.quantity || 0);
      });
    });

  directIssues
    .filter(issue => {
      if (issue.spk_id && issue.spk_id !== spkId) return false;
      const st = (issue.status || '').toUpperCase();
      if (st === 'VOID' || st === 'VOIDED' || st === 'CANCELLED') return false;

      if (normStage && issue.wbs_stage) {
        if (normalizeWbsStage(issue.wbs_stage) !== normStage) return false;
      }

      return isSameMaterialTarget({
        targetMaterialId: resolvedMaterialId,
        targetMaterialName: displayName,
        recordMaterialId: issue.material_id || issue.materials?.id,
        recordName: issue.material_name || issue.materials?.name,
      });
    })
    .forEach(issue => {
      qtySudahKeluar += Number(issue.quantity_issued ?? issue.quantity ?? 0);
    });

  // 3. Projection & EPSILON check
  const qtyPermintaanSaatIni = Math.max(0, Number(currentRequestQty || 0));
  const proyeksiTotalQty = qtySudahKeluar + qtyPermintaanSaatIni;
  const hasRabQuota = qtyPaguRab > 0;
  const isQtyOverQuota = (proyeksiTotalQty - qtyPaguRab) > GATE2_QTY_EPSILON;
  const overQty = isQtyOverQuota ? Math.max(0, proyeksiTotalQty - qtyPaguRab) : 0;
  const remainingQtyQuota = Math.max(0, qtyPaguRab - proyeksiTotalQty);

  // 4. Informative HPP Price Fluctuation (NEVER blocks approval/issue)
  const rabUnitCost = qtyPaguRab > 0 ? totalRabBaselineValue / qtyPaguRab : 0;
  const masterCostCandidate = Number(
    (currentInventoryCostPrice && currentInventoryCostPrice > 0 ? currentInventoryCostPrice : 0) ||
      (matchedMaster?.cost_price && matchedMaster.cost_price > 0 ? matchedMaster.cost_price : 0)
  );

  let aktualUnitCost = rabUnitCost;
  if (masterCostCandidate > 0) {
    aktualUnitCost = masterCostCandidate;
  } else if (!hasExplicitCostPrice && matchedMaster?.unit_price && Number(matchedMaster.unit_price) > 0) {
    aktualUnitCost = Number(matchedMaster.unit_price);
  }

  const evalQtyForCost = proyeksiTotalQty > 0 ? proyeksiTotalQty : qtyPaguRab;
  const paguRupiahRab = evalQtyForCost * rabUnitCost;
  const aktualRupiah = evalQtyForCost * aktualUnitCost;
  const rawCostVariance = aktualRupiah - paguRupiahRab;
  // Ignore sub-1 Rupiah floating point jitter
  const costVarianceRp = Math.abs(rawCostVariance) < 1 ? 0 : rawCostVariance;

  const projStr = formatGate2Qty(proyeksiTotalQty);
  const paguStr = formatGate2Qty(qtyPaguRab);
  const overStr = formatGate2Qty(overQty);

  let statusVariant: 'success' | 'info' | 'danger' = 'success';
  let statusBadge: Gate2ItemEvaluationResult['statusBadge'];

  if (isQtyOverQuota) {
    statusVariant = 'danger';
    statusBadge = {
      title: '🚫 PERINGATAN GATE 2 (OVER QUOTA KUANTITAS):',
      description: `Permintaan ini menyebabkan total pengambilan (${projStr} ${satuan}) MELEBIHI kuota RAB (${paguStr} ${satuan}) sebesar +${overStr} ${satuan}. Membutuhkan otorisasi Owner atau Change Order dari Service Advisor.`,
      variant: 'danger',
    };
  } else if (costVarianceRp > 0) {
    statusVariant = 'info';
    statusBadge = {
      title: `ℹ Kuantitas Sesuai Kuota RAB (${projStr} / ${paguStr} ${satuan}).`,
      description: `Catatan Audit: Terjadi penyesuaian harga HPP gudang (+Rp ${Math.round(costVarianceRp).toLocaleString('id-ID')}) dari estimasi awal RAB.`,
      variant: 'info',
    };
  } else {
    statusVariant = 'success';
    statusBadge = {
      title: `✓ Kuota Kuantitas Sesuai RAB (${wbsStageName}):`,
      description: `${projStr} / ${paguStr} ${satuan} (Aman untuk dirilis).`,
      variant: 'success',
    };
  }

  return {
    qtyPaguRab,
    qtySudahKeluar,
    qtyPermintaanSaatIni,
    proyeksiTotalQty,
    remainingQtyQuota,
    overQty,
    isQtyOverQuota,
    hasRabQuota,
    satuan,
    wbsStageName,
    materialName: displayName,
    paguRupiahRab,
    aktualRupiah,
    costVarianceRp,
    rabUnitCost,
    aktualUnitCost,
    isOverBudget: isQtyOverQuota,
    statusVariant,
    statusBadge,
  };
}

/**
 * Evaluates Gate 2 Quantity Quota for an entire Mandor Requisition ticket.
 * Aggregates duplicate pending material lines in the same ticket + WBS stage
 * so batch approval ("Approve Semua") cannot bypass per-item quotas.
 */
export function evaluateGate2TicketQuota(params: {
  spkId: string;
  wbsStage?: string | null;
  pendingItems: MaterialRequisitionItemGate2[];
  rabItems: RabItemGate2[];
  approvedCoItems?: ChangeOrderItemGate2[];
  approvedReqs: ApprovedRequisitionGate2[];
  directIssues?: DirectIssueGate2[];
  masterMaterials?: MasterMaterialGate2[];
}): Gate2TicketEvaluationResult {
  const {
    spkId,
    wbsStage,
    pendingItems,
    rabItems,
    approvedCoItems = [],
    approvedReqs,
    directIssues = [],
    masterMaterials = [],
  } = params;

  const wbsStageName = wbsStage?.trim() || 'Tahapan WBS';
  const itemEvaluations: Record<string, Gate2ItemEvaluationResult> = {};

  // Group pending items by (normalizedWbsStage, materialKey) for cumulative batch validation
  const groups = new Map<
    string,
    {
      wbsStage: string | null | undefined;
      materialId: string | null;
      materialName: string;
      rabItemId: string | null;
      changeOrderItemId: string | null;
      unit: string;
      totalQty: number;
      currentInventoryCostPrice: number | null;
    }
  >();

  pendingItems.forEach((item, idx) => {
    const itemStage = item.wbs_stage || wbsStage || null;
    const normItemStage = normalizeWbsStage(itemStage);
    const matName = item.material_name || item.materials?.name || 'Material';
    const matUnit = item.unit || item.materials?.unit || 'pcs';
    const matCost = item.materials?.cost_price ? Number(item.materials.cost_price) : null;

    // Evaluate individual item row
    const itemEval = evaluateGate2ItemQuota({
      spkId,
      wbsStage: itemStage,
      materialId: item.material_id || item.materials?.id || null,
      materialName: matName,
      rabItemId: item.rab_item_id || null,
      changeOrderItemId: item.change_order_item_id || null,
      unit: matUnit,
      currentRequestQty: Number(item.quantity || 0),
      currentInventoryCostPrice: matCost,
      rabItems,
      approvedCoItems,
      approvedReqs,
      directIssues,
      masterMaterials,
    });

    const itemKey = item.id || `item-${idx}`;
    itemEvaluations[itemKey] = itemEval;

    const matGroupKey =
      item.material_id ||
      item.materials?.id ||
      normalizeMaterialKey(matName) ||
      item.rab_item_id ||
      item.change_order_item_id ||
      itemKey;
    const fullGroupKey = `${normItemStage}::${matGroupKey}`;

    const existing = groups.get(fullGroupKey);
    if (existing) {
      existing.totalQty += Number(item.quantity || 0);
      if (!existing.currentInventoryCostPrice && matCost) {
        existing.currentInventoryCostPrice = matCost;
      }
    } else {
      groups.set(fullGroupKey, {
        wbsStage: itemStage,
        materialId: item.material_id || item.materials?.id || null,
        materialName: matName,
        rabItemId: item.rab_item_id || null,
        changeOrderItemId: item.change_order_item_id || null,
        unit: matUnit,
        totalQty: Number(item.quantity || 0),
        currentInventoryCostPrice: matCost,
      });
    }
  });

  const groupedEvaluations: Gate2ItemEvaluationResult[] = Array.from(groups.values()).map(g =>
    evaluateGate2ItemQuota({
      spkId,
      wbsStage: g.wbsStage,
      materialId: g.materialId,
      materialName: g.materialName,
      rabItemId: g.rabItemId,
      changeOrderItemId: g.changeOrderItemId,
      unit: g.unit,
      currentRequestQty: g.totalQty,
      currentInventoryCostPrice: g.currentInventoryCostPrice,
      rabItems,
      approvedCoItems,
      approvedReqs,
      directIssues,
      masterMaterials,
    })
  );

  const overQuotaItems = groupedEvaluations.filter(g => g.isQtyOverQuota);
  const isQtyOverQuota = overQuotaItems.length > 0;
  const primaryOverQuotaItem = overQuotaItems[0] || null;

  const paguRupiahRab = groupedEvaluations.reduce((sum, g) => sum + g.paguRupiahRab, 0);
  const aktualRupiah = groupedEvaluations.reduce((sum, g) => sum + g.aktualRupiah, 0);
  const rawTicketVariance = aktualRupiah - paguRupiahRab;
  const costVarianceRp = Math.abs(rawTicketVariance) < 1 ? 0 : rawTicketVariance;

  const displayProjectedQty = groupedEvaluations.reduce((sum, g) => sum + g.proyeksiTotalQty, 0);
  const displayQuotaQty = groupedEvaluations.reduce((sum, g) => sum + g.qtyPaguRab, 0);
  const uniqueUnits = new Set(groupedEvaluations.map(g => g.satuan.toLowerCase()));
  const displayUnit =
    groupedEvaluations.length === 1
      ? groupedEvaluations[0].satuan
      : uniqueUnits.size === 1 && groupedEvaluations.length > 0
        ? groupedEvaluations[0].satuan
        : 'unit';

  const projStr = formatGate2Qty(displayProjectedQty);
  const paguStr = formatGate2Qty(displayQuotaQty);

  let statusVariant: 'success' | 'info' | 'danger' = 'success';
  let statusBadge: Gate2TicketEvaluationResult['statusBadge'];

  if (isQtyOverQuota && primaryOverQuotaItem) {
    statusVariant = 'danger';
    const overProjStr = formatGate2Qty(primaryOverQuotaItem.proyeksiTotalQty);
    const overPaguStr = formatGate2Qty(primaryOverQuotaItem.qtyPaguRab);
    const overDiffStr = formatGate2Qty(primaryOverQuotaItem.overQty);
    statusBadge = {
      title: '🚫 PERINGATAN GATE 2 (OVER QUOTA KUANTITAS):',
      description: `Permintaan ini menyebabkan total pengambilan (${overProjStr} ${primaryOverQuotaItem.satuan}) MELEBIHI kuota RAB (${overPaguStr} ${primaryOverQuotaItem.satuan}) sebesar +${overDiffStr} ${primaryOverQuotaItem.satuan}. Membutuhkan otorisasi Owner atau Change Order dari Service Advisor.`,
      variant: 'danger',
    };
  } else if (costVarianceRp > 0) {
    statusVariant = 'info';
    statusBadge = {
      title: `ℹ Kuantitas Sesuai Kuota RAB (${projStr} / ${paguStr} ${displayUnit}).`,
      description: `Catatan Audit: Terjadi penyesuaian harga HPP gudang (+Rp ${Math.round(costVarianceRp).toLocaleString('id-ID')}) dari estimasi awal RAB.`,
      variant: 'info',
    };
  } else {
    statusVariant = 'success';
    statusBadge = {
      title: `✓ Kuota Kuantitas Sesuai RAB (${wbsStageName}):`,
      description: `${projStr} / ${paguStr} ${displayUnit} (Aman untuk dirilis).`,
      variant: 'success',
    };
  }

  return {
    isQtyOverQuota,
    isOverBudget: isQtyOverQuota,
    wbsStageName,
    displayProjectedQty,
    displayQuotaQty,
    displayUnit,
    paguRupiahRab,
    aktualRupiah,
    costVarianceRp,
    primaryOverQuotaItem,
    overQuotaItems,
    groupedEvaluations,
    itemEvaluations,
    statusVariant,
    statusBadge,
  };
}
