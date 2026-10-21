import type { ProductPackage } from '../types/package';
import type { ChangeOrderItemType } from '../types/database';
import { resolveItemType } from './itemClassification';

export const WBS_STAGES = [
  'WBS 1: Pembongkaran',
  'WBS 2: Sasis/Rangka',
  'WBS 3: Dinding/Fabrikasi',
  'WBS 4: Cat/Finishing',
  'WBS 5: Kelistrikan/Hidrolik',
];

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
  notes?: string;
}

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
  packageMultiplier: number = 1
): ExplodedChangeOrderItem[] => {
  if (!pkg.items || pkg.items.length === 0) return [];
  const multiplier = Math.max(0.01, packageMultiplier || 1);

  // 1. Calculate total BOM HPP of the package (single unit)
  const totalBomHpp = pkg.items.reduce((sum, item) => {
    const cost = Number(item.cost_per_unit || item.material?.cost_price || 0);
    return sum + (Number(item.quantity || 0) * cost);
  }, 0);

  // Margin ratio: if package has selling_price and HPP > 0, distribute selling price proportional to HPP
  const marginRatio = totalBomHpp > 0 && Number(pkg.selling_price || 0) > 0 
    ? Number(pkg.selling_price) / totalBomHpp 
    : 1;

  const result: ExplodedChangeOrderItem[] = [];

  pkg.items.forEach((item, itemIdx) => {
    const rawType = item.item_type || item.material?.item_type;
    const itemName = item.labor_name || item.material?.name || (item as any).name || 'Item Paket';
    const resolvedType = resolveItemType(rawType, item.material?.item_type, itemName);
    const itemType: ChangeOrderItemType = resolvedType === 'LABOR' 
      ? 'LABOR' 
      : resolvedType === 'OVERHEAD' 
        ? 'OVERHEAD' 
        : 'MATERIAL';

    const unit = item.material?.unit || (itemType === 'LABOR' ? 'jam' : itemType === 'OVERHEAD' ? 'hari' : 'pcs');
    const materialId = itemType === 'MATERIAL' 
      ? (item.material_id || item.material?.id || null) 
      : (itemType === 'LABOR' ? (item.material_id || null) : null);

    const costPrice = Number(item.cost_per_unit || item.material?.cost_price || 0);

    // Calculate unit selling price:
    let unitPrice = 0;
    if (totalBomHpp > 0 && Number(pkg.selling_price || 0) > 0) {
      unitPrice = Math.round(costPrice * marginRatio);
    } else if (item.material?.selling_price && Number(item.material.selling_price) > 0) {
      unitPrice = Number(item.material.selling_price);
    } else if (Number(pkg.selling_price || 0) > 0 && Number(item.quantity || 0) > 0) {
      unitPrice = Math.round(Number(pkg.selling_price) / pkg.items!.length / Number(item.quantity));
    } else {
      unitPrice = costPrice;
    }

    const note = `[Paket: ${pkg.name}]`;

    if (targetWbsMode === 'MULTI' && item.default_wbs_allocation && Object.keys(item.default_wbs_allocation).length > 0) {
      const nonZeroEntries = Object.entries(item.default_wbs_allocation).filter(([, q]) => Number(q) > 0);
      if (nonZeroEntries.length > 0) {
        nonZeroEntries.forEach(([stageKey, allocQty], subIdx) => {
          const wbsStage = mapToWbsStage(stageKey, singleWbsStage);
          result.push({
            id: `draft-pkg-${Date.now()}-${itemIdx}-${subIdx}-${Math.random().toString(36).substring(2, 6)}`,
            wbs_stage: wbsStage,
            item_type: itemType,
            material_id: materialId,
            item_name: itemName,
            quantity: Number((Number(allocQty) * multiplier).toFixed(2)),
            unit,
            unit_price: unitPrice,
            cost_price: costPrice,
            notes: note
          });
        });
        return;
      }
    }

    // Default to Single WBS Stage or fallback
    const wbsStage = targetWbsMode === 'MULTI' && (item as any).wbs_stage 
      ? mapToWbsStage((item as any).wbs_stage, singleWbsStage)
      : singleWbsStage;

    result.push({
      id: `draft-pkg-${Date.now()}-${itemIdx}-${Math.random().toString(36).substring(2, 6)}`,
      wbs_stage: wbsStage,
      item_type: itemType,
      material_id: materialId,
      item_name: itemName,
      quantity: Number((Number(item.quantity || 0) * multiplier).toFixed(2)),
      unit,
      unit_price: unitPrice,
      cost_price: costPrice,
      notes: note
    });
  });

  return result;
};
