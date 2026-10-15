export interface RabItemLike {
  id?: string;
  material_id?: string | null;
  materialId?: string | null;
  name?: string | null;
  description?: string | null;
  materials?: {
    id?: string;
    name?: string;
    unit?: string;
    unit_price?: number;
  } | Array<{
    id?: string;
    name?: string;
    unit?: string;
    unit_price?: number;
  }> | null;
  [key: string]: any;
}

export interface RequisitionItemLike {
  id?: string;
  material_id?: string | null;
  materialId?: string | null;
  name?: string | null;
  item_name?: string | null;
  description?: string | null;
  sourceRabId?: string | null;
  tempId?: string | null;
  status?: string | null;
  materials?: {
    id?: string;
    name?: string;
  } | Array<{
    id?: string;
    name?: string;
  }> | null;
  material_requisition_items?: Array<{
    material_id?: string | null;
    rab_item_id?: string | null;
    material_name?: string | null;
    materials?: {
      id?: string;
      name?: string;
    } | Array<{
      id?: string;
      name?: string;
    }> | null;
    [key: string]: any;
  }> | null;
  [key: string]: any;
}

export interface AssignmentLike {
  id?: string;
  material_id?: string | null;
  rab_item_id?: string | null;
  task_description?: string | null;
  status?: string | null;
  [key: string]: any;
}

/**
 * Normalizes text for lenient, case-insensitive comparison
 * Strips out punctuation, collapses whitespaces, and converts to lowercase.
 */
export function normalizeText(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\w\s\d]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a RAB item is already allocated or used in either:
 * 1. Material Requisitions (saved in database or temporarily selected locally)
 * 2. SPK Borongan Assignments (active / non-cutoff / non-cancelled worker assignments)
 *
 * Supports ID matching (material_id, rab_item_id) as well as text/substring matching
 * on task descriptions and item names to account for mandor notes.
 */
export function isRabItemAllocated(
  rabItem: RabItemLike,
  requisitions?: Array<RequisitionItemLike> | Set<string> | null,
  assignments?: Array<AssignmentLike> | null,
  localRequisitions?: Array<RequisitionItemLike> | null
): boolean {
  if (!rabItem) return false;

  const rabMaterialsObj = Array.isArray(rabItem.materials) ? rabItem.materials[0] : rabItem.materials;
  const rabItemId = rabItem.id;
  const materialId = rabMaterialsObj?.id || rabItem.material_id || rabItem.materialId;
  const itemName = (rabMaterialsObj?.name || rabItem.name || rabItem.description || '').trim();
  const normalizedItemName = normalizeText(itemName);

  // 1. Check in Requisitions
  if (requisitions) {
    if (requisitions instanceof Set) {
      if (rabItemId && requisitions.has(rabItemId)) return true;
      if (materialId && requisitions.has(materialId)) return true;
      if (normalizedItemName && (requisitions.has(normalizedItemName) || requisitions.has(itemName.toLowerCase()))) return true;
    } else if (Array.isArray(requisitions)) {
      const matchInReq = requisitions.some((req) => {
        if (!req) return false;
        const status = (req.status || '').toUpperCase();
        if (status === 'CANCELLED' || status === 'REJECTED') return false;

        // If requisition object contains nested items (material_requisition_items)
        if (Array.isArray(req.material_requisition_items) && req.material_requisition_items.length > 0) {
          return req.material_requisition_items.some((subItem) => {
            const subMat = Array.isArray(subItem.materials) ? subItem.materials[0] : subItem.materials;
            const subMatId = subMat?.id || subItem.material_id;
            const subRabId = subItem.rab_item_id;
            if (materialId && subMatId === materialId) return true;
            if (rabItemId && (subMatId === rabItemId || subRabId === rabItemId)) return true;

            const subName = (subMat?.name || subItem.material_name || '').trim();
            const normSubName = normalizeText(subName);
            if (normSubName && normalizedItemName) {
              if (normSubName === normalizedItemName) return true;
              if (normSubName.length >= 4 && normalizedItemName.includes(normSubName)) return true;
              if (normalizedItemName.length >= 4 && normSubName.includes(normalizedItemName)) return true;

              const subWords = normSubName.split(' ').filter(w => w.length >= 3);
              const itemWords = normalizedItemName.split(' ').filter(w => w.length >= 3);
              if (itemWords.length >= 2 && itemWords.every(w => normSubName.includes(w))) return true;
              if (subWords.length >= 2 && subWords.every(w => normalizedItemName.includes(w))) return true;
            }
            return false;
          });
        }

        const reqMat = Array.isArray(req.materials) ? req.materials[0] : req.materials;
        const reqMatId = reqMat?.id || req.material_id || req.materialId;
        const reqRabId = req.sourceRabId || req.tempId || req.id;

        // Check IDs
        if (materialId && (reqMatId === materialId || reqRabId === materialId)) return true;
        if (rabItemId && (reqMatId === rabItemId || reqRabId === rabItemId)) return true;

        // Check Names
        const reqName = (reqMat?.name || req.name || req.item_name || req.description || '').trim();
        const normReqName = normalizeText(reqName);
        if (normReqName && normalizedItemName) {
          if (normReqName === normalizedItemName) return true;
          if (normReqName.length >= 4 && normalizedItemName.includes(normReqName)) return true;
          if (normalizedItemName.length >= 4 && normReqName.includes(normalizedItemName)) return true;

          const reqWords = normReqName.split(' ').filter(w => w.length >= 3);
          const itemWords = normalizedItemName.split(' ').filter(w => w.length >= 3);
          if (itemWords.length >= 2 && itemWords.every(w => normReqName.includes(w))) return true;
          if (reqWords.length >= 2 && reqWords.every(w => normalizedItemName.includes(w))) return true;
        }

        return false;
      });

      if (matchInReq) return true;
    }
  }

  // 2. Check in Local Requisitions (if provided separately, e.g. active form items)
  if (localRequisitions && Array.isArray(localRequisitions)) {
    const matchInLocal = localRequisitions.some((req) => {
      if (!req) return false;
      const reqMat = Array.isArray(req.materials) ? req.materials[0] : req.materials;
      const reqMatId = reqMat?.id || req.material_id || req.materialId;
      const reqRabId = req.sourceRabId || req.tempId || req.id;

      if (materialId && (reqMatId === materialId || reqRabId === materialId)) return true;
      if (rabItemId && (reqMatId === rabItemId || reqRabId === rabItemId)) return true;

      const reqName = (reqMat?.name || req.name || req.item_name || req.description || '').trim();
      const normReqName = normalizeText(reqName);
      if (normReqName && normalizedItemName) {
        if (normReqName === normalizedItemName) return true;
        if (normReqName.length >= 4 && normalizedItemName.includes(normReqName)) return true;
        if (normalizedItemName.length >= 4 && normReqName.includes(normalizedItemName)) return true;

        const reqWords = normReqName.split(' ').filter(w => w.length >= 3);
        const itemWords = normalizedItemName.split(' ').filter(w => w.length >= 3);
        if (itemWords.length >= 2 && itemWords.every(w => normReqName.includes(w))) return true;
        if (reqWords.length >= 2 && reqWords.every(w => normalizedItemName.includes(w))) return true;
      }

      return false;
    });

    if (matchInLocal) return true;
  }

  // 3. Check in SPK Borongan Assignments
  if (assignments && Array.isArray(assignments)) {
    const matchInBorong = assignments.some((borong) => {
      if (!borong) return false;
      const status = (borong.status || '').toUpperCase();
      if (status === 'CANCELLED' || status === 'CUT_OFF') return false;

      // Check explicit IDs
      if (rabItemId && borong.rab_item_id && borong.rab_item_id === rabItemId) return true;
      if (materialId && borong.material_id && borong.material_id === materialId) return true;
      if (rabItemId && borong.material_id && borong.material_id === rabItemId) return true;
      if (materialId && borong.rab_item_id && borong.rab_item_id === materialId) return true;

      // Check Task Description
      const taskDesc = (borong.task_description || '').trim();
      const normTaskDesc = normalizeText(taskDesc);

      if (normTaskDesc && normalizedItemName) {
        // Direct equality
        if (normTaskDesc === normalizedItemName) return true;

        // Task description contains the RAB material name (e.g. "TUKANG LAS DUDUKAN SLEBOR melepas baut yang doll")
        if (normalizedItemName.length >= 4 && normTaskDesc.includes(normalizedItemName)) return true;

        // Material name contains task description if task description is sufficiently specific (>= 6 chars)
        if (normTaskDesc.length >= 6 && normalizedItemName.includes(normTaskDesc)) return true;

        // Multi-word token overlap matching (handles word reordering or worker notes)
        const descWords = normTaskDesc.split(' ').filter(w => w.length >= 3);
        const itemWords = normalizedItemName.split(' ').filter(w => w.length >= 3);
        if (itemWords.length >= 2 && itemWords.every(w => normTaskDesc.includes(w))) return true;
        if (descWords.length >= 2 && descWords.every(w => normalizedItemName.includes(w))) return true;
      }

      return false;
    });

    if (matchInBorong) return true;
  }

  return false;
}
