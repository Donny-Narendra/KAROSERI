/**
 * Gate 2 Warehouse Approval Budget Guard
 * Exclusively validates physical material items against WBS-specific RAB material allocations.
 * Excludes labor (SPK Borongan) and factory overhead (SPK Overhead Logs).
 */

export interface RabItemGate2 {
  id?: string;
  spk_id?: string;
  wbs_stage?: string | null;
  wbs_category?: string | null;
  item_type?: string | null;
  quantity?: number;
  unit_price?: number;
  cost_price?: number;
  item_total?: number;
  description?: string;
  material_id?: string | null;
}

export interface ChangeOrderItemGate2 {
  id?: string;
  spk_id?: string;
  wbs_stage?: string | null;
  item_type?: string | null;
  quantity?: number;
  unit_price?: number;
  cost_price?: number;
  subtotal?: number;
  material_id?: string | null;
  item_name?: string;
}

export interface MaterialRequisitionItemGate2 {
  id?: string;
  material_id?: string | null;
  quantity?: number;
  unit_price?: number;
  subtotal?: number;
  wbs_stage?: string | null;
  materials?: {
    unit_price?: number;
  } | null;
}

export interface ApprovedRequisitionGate2 {
  id?: string;
  spk_id?: string;
  wbs_category?: string | null;
  material_requisition_items?: MaterialRequisitionItemGate2[];
}

export interface DirectIssueGate2 {
  id?: string;
  spk_id?: string;
  material_id?: string | null;
  quantity_issued?: number;
  custom_unit_price?: number;
  materials?: {
    unit_price?: number;
  } | null;
  status?: string;
  wbs_stage?: string | null;
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

/**
 * Calculates the material budget for a specific WBS stage (or entire SPK if no stage given).
 * Includes ONLY items with item_type === 'MATERIAL' or null/undefined (defensive legacy).
 * Strictly excludes LABOR and OVERHEAD.
 * Also includes approved Change Order material items.
 */
export function getWbsMaterialBudget(
  spkId: string,
  wbsStage: string | null | undefined,
  rabItems: RabItemGate2[],
  approvedCoItems?: ChangeOrderItemGate2[]
): number {
  const normStage = normalizeWbsStage(wbsStage);

  // 1. RAB Items: filter by SPK, pure MATERIAL item_type, and matching WBS stage
  const filteredRab = rabItems.filter(item => {
    if (item.spk_id && item.spk_id !== spkId) return false;
    
    // Strict item_type check: ONLY MATERIAL
    const type = (item.item_type || '').toUpperCase();
    if (type && type !== 'MATERIAL') return false;

    // Stage check: if normStage is provided, must match
    if (normStage) {
      const itemStageNorm = normalizeWbsStage(item.wbs_stage || item.wbs_category);
      if (itemStageNorm && itemStageNorm !== normStage) return false;
    }

    return true;
  });

  const rabBudget = filteredRab.reduce((sum, item) => {
    const itemTotal = Number(item.item_total);
    if (!isNaN(itemTotal) && itemTotal > 0) {
      return sum + itemTotal;
    }
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price ?? item.cost_price ?? 0);
    return sum + (qty * price);
  }, 0);

  // 2. Approved Change Order material items
  let coBudget = 0;
  if (approvedCoItems && approvedCoItems.length > 0) {
    const filteredCo = approvedCoItems.filter(ci => {
      if (ci.spk_id && ci.spk_id !== spkId) return false;
      const type = (ci.item_type || '').toUpperCase();
      if (type && type !== 'MATERIAL') return false;

      if (normStage) {
        const coStageNorm = normalizeWbsStage(ci.wbs_stage);
        if (coStageNorm && coStageNorm !== normStage) return false;
      }

      return true;
    });

    coBudget = filteredCo.reduce((sum, ci) => {
      const subtotal = Number(ci.subtotal);
      if (!isNaN(subtotal) && subtotal > 0) {
        return sum + subtotal;
      }
      const qty = Number(ci.quantity) || 0;
      const price = Number(ci.unit_price ?? ci.cost_price ?? 0);
      return sum + (qty * price);
    }, 0);
  }

  return rabBudget + coBudget;
}

/**
 * Calculates previously committed/approved material costs for a specific WBS stage.
 * Sums approved material requisition items + direct material issues.
 * Labor and overhead logs are completely excluded.
 */
export function getWbsMaterialCommitted(
  spkId: string,
  wbsStage: string | null | undefined,
  approvedReqs: ApprovedRequisitionGate2[],
  directIssues: DirectIssueGate2[] = [],
  rabItems?: RabItemGate2[]
): {
  approvedReqCost: number;
  directIssueCost: number;
  totalCommitted: number;
} {
  const normStage = normalizeWbsStage(wbsStage);

  // 1. Approved Material Requisitions
  let approvedReqCost = 0;
  approvedReqs
    .filter(req => !req.spk_id || req.spk_id === spkId)
    .forEach(req => {
      const reqNorm = normalizeWbsStage(req.wbs_category);
      (req.material_requisition_items || []).forEach(item => {
        const itemNorm = normalizeWbsStage(item.wbs_stage);
        // If stage filtering is active, match either item-level stage or req-level category
        if (normStage) {
          const matches = (itemNorm && itemNorm === normStage) || (!itemNorm && reqNorm === normStage);
          if (!matches) return;
        }

        const sub = Number(item.subtotal || 0);
        if (sub > 0) {
          approvedReqCost += sub;
        } else {
          const qty = Number(item.quantity || 0);
          const price = Number(item.unit_price ?? item.materials?.unit_price ?? 0);
          approvedReqCost += (qty * price);
        }
      });
    });

  // 2. Direct Material Issues
  let directIssueCost = 0;
  directIssues
    .filter(issue => {
      if (issue.spk_id && issue.spk_id !== spkId) return false;
      if (issue.status === 'VOID') return false;

      if (normStage) {
        // If issue has direct wbs_stage
        if (issue.wbs_stage) {
          return normalizeWbsStage(issue.wbs_stage) === normStage;
        }
        // Fallback: match via rabItems material_id if available
        if (rabItems && issue.material_id) {
          const matchedRab = rabItems.find(r => 
            r.material_id === issue.material_id && 
            normalizeWbsStage(r.wbs_stage || r.wbs_category) === normStage
          );
          if (!matchedRab) return false;
        }
      }

      return true;
    })
    .forEach(issue => {
      const qty = Number(issue.quantity_issued || 0);
      const price = Number(issue.custom_unit_price ?? issue.materials?.unit_price ?? 0);
      directIssueCost += (qty * price);
    });

  return {
    approvedReqCost,
    directIssueCost,
    totalCommitted: approvedReqCost + directIssueCost
  };
}

export interface Gate2EvaluationResult {
  isOverBudget: boolean;
  overAmount: number;
  remainingQuota: number;
  projectedTotal: number;
  wbsBudgetLimit: number;
  approvedReqCost: number;
  directIssueCost: number;
  currentTicketCost: number;
  wbsStageName: string;
  hasWbsBudget: boolean;
  statusBadge: {
    title: string;
    description: string;
    variant: 'success' | 'danger';
  };
}

/**
 * Comprehensive Gate 2 evaluation for a pending requisition against its WBS material budget.
 */
export function evaluateGate2Budget(params: {
  spkId: string;
  wbsStage?: string | null;
  currentTicketCost: number;
  rabItems: RabItemGate2[];
  approvedCoItems?: ChangeOrderItemGate2[];
  approvedReqs: ApprovedRequisitionGate2[];
  directIssues?: DirectIssueGate2[];
}): Gate2EvaluationResult {
  const {
    spkId,
    wbsStage,
    currentTicketCost,
    rabItems,
    approvedCoItems = [],
    approvedReqs,
    directIssues = []
  } = params;

  const wbsStageName = wbsStage?.trim() || 'Tahapan WBS';
  const wbsBudgetLimit = getWbsMaterialBudget(spkId, wbsStage, rabItems, approvedCoItems);
  const { approvedReqCost, directIssueCost, totalCommitted } = getWbsMaterialCommitted(
    spkId,
    wbsStage,
    approvedReqs,
    directIssues,
    rabItems
  );

  const projectedTotal = totalCommitted + currentTicketCost;
  const hasWbsBudget = wbsBudgetLimit > 0;
  
  // Overbudget condition:
  // If budget limit > 0, check if projected total exceeds it
  // If budget limit == 0 and cost > 0, it indicates an unbudgeted material request
  const isOverBudget = hasWbsBudget ? (projectedTotal > wbsBudgetLimit) : (projectedTotal > 0);
  const overAmount = Math.max(0, projectedTotal - wbsBudgetLimit);
  const remainingQuota = Math.max(0, wbsBudgetLimit - projectedTotal);

  const statusBadge = isOverBudget
    ? {
        title: `PERINGATAN PAGU GATE 2 (OVER BUDGET):`,
        description: `Menyetujui requisition ini (Rp ${currentTicketCost.toLocaleString('id-ID')}) akan menyebabkan total pengeluaran material ${wbsStageName} (Rp ${projectedTotal.toLocaleString('id-ID')}) MELEBIHI pagu material RAB WBS (Rp ${wbsBudgetLimit.toLocaleString('id-ID')}) sebesar Rp ${overAmount.toLocaleString('id-ID')}. Pastikan sudah ada persetujuan Change Order / SPK Tambahan dari Service Advisor sebelum menyetujui.`,
        variant: 'danger' as const
      }
    : {
        title: `Pagu Gate 2 (Aman — Sesuai Alokasi RAB ${wbsStageName}):`,
        description: `Total permintaan saat ini (Rp ${currentTicketCost.toLocaleString('id-ID')}) masih berada dalam kuota pagu material WBS. Akumulasi komitmen: Rp ${projectedTotal.toLocaleString('id-ID')} dari pagu WBS Rp ${wbsBudgetLimit.toLocaleString('id-ID')} (Sisa Pagu WBS: Rp ${remainingQuota.toLocaleString('id-ID')}).`,
        variant: 'success' as const
      };

  return {
    isOverBudget,
    overAmount,
    remainingQuota,
    projectedTotal,
    wbsBudgetLimit,
    approvedReqCost,
    directIssueCost,
    currentTicketCost,
    wbsStageName,
    hasWbsBudget,
    statusBadge
  };
}
