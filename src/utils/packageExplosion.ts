import type { ProductPackage } from '../types/package';
import type { ChangeOrderItemType } from '../types/database';
import { resolveItemType, isLaborKeyword } from './itemClassification';

export const WBS_STAGES = [
  'WBS 1: Pembongkaran',
  'WBS 2: Sasis/Rangka',
  'WBS 3: Dinding/Fabrikasi',
  'WBS 4: Cat/Finishing',
  'WBS 5: Kelistrikan/Hidrolik',
];

export const WBS_COLUMNS = [
  { key: 'wbs1' as const, label: 'WBS 1', fullName: WBS_STAGES[0], category: 'Pembongkaran' },
  { key: 'wbs2' as const, label: 'WBS 2', fullName: WBS_STAGES[1], category: 'Sasis/Rangka' },
  { key: 'wbs3' as const, label: 'WBS 3', fullName: WBS_STAGES[2], category: 'Dinding/Fabrikasi' },
  { key: 'wbs4' as const, label: 'WBS 4', fullName: WBS_STAGES[3], category: 'Cat/Finishing' },
  { key: 'wbs5' as const, label: 'WBS 5', fullName: WBS_STAGES[4], category: 'Kelistrikan/Hidrolik' },
] as const;

export type WbsKey = typeof WBS_COLUMNS[number]['key'];

export interface ExplodedChangeOrderItem {
  id: string;
  wbs_stage: string;
  item_type: ChangeOrderItemType;
  material_id?: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  cost_price: number;
  package_source_id?: string | null;
  package_instance_id?: string | null;
  package_name?: string | null;
  notes?: string;
}

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const mapToWbsStage = (rawStage?: string | null, fallback: string = WBS_STAGES[1]): string => {
  if (!rawStage) return fallback;
  const lower = rawStage.toLowerCase();
  if (lower.includes('pembongkaran')) return WBS_STAGES[0];
  if (lower.includes('sasis') || lower.includes('rangka')) return WBS_STAGES[1];
  if (lower.includes('dinding') || lower.includes('fabrikasi')) return WBS_STAGES[2];
  if (lower.includes('cat') || lower.includes('finishing')) return WBS_STAGES[3];
  if (lower.includes('kelistrikan') || lower.includes('hidrolik')) return WBS_STAGES[4];

  const found = WBS_STAGES.find(s => s.toLowerCase() === lower);
  return found || fallback;
};

export const explodePackageToDraftItems = (
  pkg: ProductPackage,
  targetWbsMode: 'SINGLE' | 'MULTI',
  singleWbsStage: string = WBS_STAGES[1],
  packageMultiplier: number = 1,
  packageInstanceId?: string
): ExplodedChangeOrderItem[] => {
  const rawItems = (pkg as any).package_items || pkg.items || [];
  if (!rawItems || rawItems.length === 0) return [];
  const multiplier = Math.max(0.01, packageMultiplier || 1);
  const instanceId = packageInstanceId || generateUUID();

  // 1. Calculate total BOM HPP of the package (single unit)
  const totalBomHpp = rawItems.reduce((sum: number, item: any) => {
    const mat = item.material || item.materials;
    const cost = Number(item.cost_per_unit || mat?.cost_price || 0);
    return sum + (Number(item.quantity || 0) * cost);
  }, 0);

  // Margin ratio: if package has selling_price and HPP > 0, distribute selling price proportional to HPP
  const marginRatio = totalBomHpp > 0 && Number(pkg.selling_price || 0) > 0 
    ? Number(pkg.selling_price) / totalBomHpp 
    : 1;

  const result: ExplodedChangeOrderItem[] = [];

  rawItems.forEach((item: any) => {
    const mat = item.material || item.materials;
    const rawType = item.item_type || mat?.item_type;
    const rawName = item.name || item.description || item.labor_name || mat?.name || '';
    const resolvedType = resolveItemType(rawType, mat?.item_type, rawName);
    
    // Determine item type with strict OVERHEAD / LABOR precedence
    let itemType: ChangeOrderItemType = 'MATERIAL';
    if (resolvedType === 'OVERHEAD') {
      itemType = 'OVERHEAD';
    } else if (resolvedType === 'LABOR' || (!item.material_id && !mat?.id && (item.labor_name || isLaborKeyword(rawName)))) {
      itemType = 'LABOR';
    } else {
      itemType = 'MATERIAL';
    }

    const itemName = rawName || (itemType === 'LABOR' ? (item.labor_name || 'Jasa / Pekerjaan Paket') : (mat?.name || 'Material Paket'));
    const unit = item.unit || mat?.unit || (itemType === 'LABOR' ? 'jam' : itemType === 'OVERHEAD' ? 'hari' : 'pcs');
    const materialId = itemType === 'MATERIAL' 
      ? (item.material_id || mat?.id || null) 
      : (itemType === 'LABOR' ? (item.material_id || null) : null);

    const costPrice = Number(item.cost_per_unit || mat?.cost_price || 0);

    // Calculate unit selling price:
    let unitPrice = 0;
    if (totalBomHpp > 0 && Number(pkg.selling_price || 0) > 0) {
      unitPrice = Math.round(costPrice * marginRatio);
    } else if (item.unit_price && Number(item.unit_price) > 0) {
      unitPrice = Number(item.unit_price);
    } else if (mat?.selling_price && Number(mat.selling_price) > 0) {
      unitPrice = Number(mat.selling_price);
    } else if (mat?.unit_price && Number(mat.unit_price) > 0) {
      unitPrice = Number(mat.unit_price);
    } else if (Number(pkg.selling_price || 0) > 0 && Number(item.quantity || 0) > 0) {
      unitPrice = Math.round(Number(pkg.selling_price) / rawItems.length / Number(item.quantity));
    } else {
      unitPrice = costPrice;
    }

    const note = `[Paket: ${pkg.name}]`;

    if (targetWbsMode === 'MULTI' && item.default_wbs_allocation && Object.keys(item.default_wbs_allocation).length > 0) {
      const nonZeroEntries = Object.entries(item.default_wbs_allocation).filter(([, q]) => Number(q) > 0);
      if (nonZeroEntries.length > 0) {
        nonZeroEntries.forEach(([stageKey, allocQty]) => {
          const wbsStage = mapToWbsStage(stageKey, singleWbsStage);
          result.push({
            id: generateUUID(),
            wbs_stage: wbsStage,
            item_type: itemType,
            material_id: materialId,
            item_name: itemName,
            quantity: Number((Number(allocQty) * multiplier).toFixed(2)),
            unit,
            unit_price: unitPrice,
            cost_price: costPrice,
            package_source_id: pkg.id,
            package_instance_id: instanceId,
            package_name: pkg.name,
            notes: note
          });
        });
        return;
      }
    }

    // Default to Single WBS Stage or fallback
    const wbsStage = targetWbsMode === 'MULTI' && (item.default_wbs_category || item.wbs_stage)
      ? mapToWbsStage(item.default_wbs_category || item.wbs_stage, singleWbsStage)
      : singleWbsStage;

    result.push({
      id: generateUUID(),
      wbs_stage: wbsStage,
      item_type: itemType,
      material_id: materialId,
      item_name: itemName,
      quantity: Number((Number(item.quantity || 1) * multiplier).toFixed(2)),
      unit,
      unit_price: unitPrice,
      cost_price: costPrice,
      package_source_id: pkg.id,
      package_instance_id: instanceId,
      package_name: pkg.name,
      notes: note
    });
  });

  return result;
};

export const explodePackageWithAllocations = (
  pkg: ProductPackage,
  allocations: Record<string, Record<string, number | string>>,
  _packageMultiplier: number = 1,
  packageInstanceId?: string
): ExplodedChangeOrderItem[] => {
  const rawItems = (pkg as any).package_items || pkg.items || [];
  if (!rawItems || rawItems.length === 0) return [];
  const instanceId = packageInstanceId || generateUUID();

  // 1. Calculate total BOM HPP of the package (single unit)
  const totalBomHpp = rawItems.reduce((sum: number, item: any) => {
    const mat = item.material || item.materials;
    const cost = Number(item.cost_per_unit || mat?.cost_price || 0);
    return sum + (Number(item.quantity || 0) * cost);
  }, 0);

  // Margin ratio: distribute selling price proportional to HPP
  const marginRatio = totalBomHpp > 0 && Number(pkg.selling_price || 0) > 0 
    ? Number(pkg.selling_price) / totalBomHpp 
    : 1;

  const result: ExplodedChangeOrderItem[] = [];

  rawItems.forEach((item: any, itemIdx: number) => {
    const mat = item.material || item.materials;
    const rawType = item.item_type || mat?.item_type;
    const rawName = item.name || item.description || item.labor_name || mat?.name || '';
    const resolvedType = resolveItemType(rawType, mat?.item_type, rawName);
    
    let itemType: ChangeOrderItemType = 'MATERIAL';
    if (resolvedType === 'OVERHEAD') {
      itemType = 'OVERHEAD';
    } else if (resolvedType === 'LABOR' || (!item.material_id && !mat?.id && (item.labor_name || isLaborKeyword(rawName)))) {
      itemType = 'LABOR';
    } else {
      itemType = 'MATERIAL';
    }

    const itemName = rawName || (itemType === 'LABOR' ? (item.labor_name || 'Jasa / Pekerjaan Paket') : (mat?.name || 'Material Paket'));
    const unit = item.unit || mat?.unit || (itemType === 'LABOR' ? 'jam' : itemType === 'OVERHEAD' ? 'hari' : 'pcs');
    const materialId = itemType === 'MATERIAL' 
      ? (item.material_id || mat?.id || null) 
      : (itemType === 'LABOR' ? (item.material_id || null) : null);

    const costPrice = Number(item.cost_per_unit || mat?.cost_price || 0);

    // Calculate unit selling price:
    let unitPrice = 0;
    if (totalBomHpp > 0 && Number(pkg.selling_price || 0) > 0) {
      unitPrice = Math.round(costPrice * marginRatio);
    } else if (item.unit_price && Number(item.unit_price) > 0) {
      unitPrice = Number(item.unit_price);
    } else if (mat?.selling_price && Number(mat.selling_price) > 0) {
      unitPrice = Number(mat.selling_price);
    } else if (mat?.unit_price && Number(mat.unit_price) > 0) {
      unitPrice = Number(mat.unit_price);
    } else if (Number(pkg.selling_price || 0) > 0 && Number(item.quantity || 0) > 0) {
      unitPrice = Math.round(Number(pkg.selling_price) / rawItems.length / Number(item.quantity));
    } else {
      unitPrice = costPrice;
    }

    const note = `Bagian dari paket: [${pkg.name}]`;
    const itemKey = item.id || `pkg-item-${itemIdx}`;
    const itemAlloc = allocations[itemKey] || allocations[item.id] || allocations[itemIdx] || {};

    const stageDefinitions = [
      { key: 'wbs1', stage: WBS_STAGES[0] },
      { key: 'wbs2', stage: WBS_STAGES[1] },
      { key: 'wbs3', stage: WBS_STAGES[2] },
      { key: 'wbs4', stage: WBS_STAGES[3] },
      { key: 'wbs5', stage: WBS_STAGES[4] },
    ];

    stageDefinitions.forEach(({ key, stage }) => {
      const qty = parseFloat(String(itemAlloc[key] ?? itemAlloc[stage] ?? '0')) || 0;
      if (qty > 0) {
        result.push({
          id: generateUUID(),
          wbs_stage: stage,
          item_type: itemType,
          material_id: materialId,
          item_name: itemName,
          quantity: Number(qty.toFixed(2)),
          unit,
          unit_price: unitPrice,
          cost_price: costPrice,
          package_source_id: pkg.id,
          package_instance_id: instanceId,
          package_name: pkg.name,
          notes: note,
        });
      }
    });
  });

  return result;
};

