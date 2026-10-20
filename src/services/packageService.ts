import { supabase } from '../lib/supabaseClient';
import type { ProductPackage, PackageItem } from '../types/package';
import { resolveItemType } from '../utils/itemClassification';

class PackageService {
  async getPackages(): Promise<ProductPackage[]> {
    const { data, error } = await supabase
      .from('product_packages')
      .select(`
        *,
        items:package_items (
          *,
          material:materials (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createPackageWithItems(pkg: Omit<ProductPackage, 'id' | 'created_at' | 'items'>, items: Omit<PackageItem, 'id' | 'package_id' | 'created_at' | 'material'>[]): Promise<void> {
    // 1. Insert package
    const { data: newPackage, error: packageError } = await supabase
      .from('product_packages')
      .insert({
        name: pkg.name,
        selling_price: pkg.selling_price
      })
      .select('id')
      .single();

    if (packageError) throw packageError;

    // 2. Insert items
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        ...item,
        package_id: newPackage.id,
        default_wbs_allocation: (item as any).default_wbs_allocation || {}
      }));

      const { error: itemsError } = await supabase
        .from('package_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }
  }

  async updatePackageWithItems(id: string, pkg: Omit<ProductPackage, 'id' | 'created_at' | 'items'>, items: Omit<PackageItem, 'package_id' | 'created_at' | 'material'>[]): Promise<void> {
    // 1. Update package
    const { error: packageError } = await supabase
      .from('product_packages')
      .update({
        name: pkg.name,
        selling_price: pkg.selling_price
      })
      .eq('id', id);

    if (packageError) throw packageError;

    // 2. Delete existing items
    const { error: deleteError } = await supabase
      .from('package_items')
      .delete()
      .eq('package_id', id);

    if (deleteError) throw deleteError;

    // 3. Insert new items
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        item_type: item.item_type,
        material_id: item.material_id,
        labor_name: item.labor_name,
        quantity: item.quantity,
        cost_per_unit: item.cost_per_unit,
        package_id: id,
        default_wbs_allocation: (item as any).default_wbs_allocation || {}
      }));

      const { error: itemsError } = await supabase
        .from('package_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }
  }

  async deletePackage(id: string): Promise<void> {
    // ON DELETE CASCADE will handle deleting package_items
    const { error } = await supabase
      .from('product_packages')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updatePackageItemDefaultAllocation(itemId: string, defaultAllocation: Record<string, number>): Promise<void> {
    if (!itemId) return;
    const { error } = await supabase
      .from('package_items')
      .update({ default_wbs_allocation: defaultAllocation })
      .eq('id', itemId);

    if (error) throw error;
  }

  async importAssemblyToRab(
    spkId: string, 
    packageId: string, 
    defaultWbsStage: string = 'Pembongkaran'
  ): Promise<any[]> {
    const { data: pkg, error: pkgError } = await supabase
      .from('product_packages')
      .select(`
        *,
        items:package_items (
          *,
          material:materials (*)
        )
      `)
      .eq('id', packageId)
      .single();

    if (pkgError) throw pkgError;
    if (!pkg || !pkg.items || pkg.items.length === 0) return [];

    let { data: estData } = await supabase
      .from('rab_estimations')
      .select('id')
      .eq('spk_id', spkId)
      .maybeSingle();

    if (!estData) {
      const { data: newEst, error: estError } = await supabase
        .from('rab_estimations')
        .insert({
          spk_id: spkId,
          total_material_cost: 0,
          total_labor_cost: 0,
          total_overhead_cost: 0,
          total_estimated_cost: 0,
        })
        .select('id')
        .single();
      if (estError) throw estError;
      estData = newEst;
    }

    const rabItemsToInsert = pkg.items.map((pkgItem: any) => {
      const itemName = pkgItem.labor_name || pkgItem.name || pkgItem.material?.name || '';
      const itemType: 'MATERIAL' | 'LABOR' | 'OVERHEAD' = 
        resolveItemType(pkgItem.item_type, pkgItem.material?.item_type, itemName);

      const wbsStage = pkgItem.wbs_stage || defaultWbsStage;
      const unitPrice = Number(pkgItem.cost_per_unit || pkgItem.unit_price || 0);
      const costPrice = Number(
        pkgItem.cost_price !== undefined
          ? pkgItem.cost_price
          : (pkgItem.material?.cost_price !== undefined 
              ? pkgItem.material.cost_price 
              : (itemType === 'LABOR' ? unitPrice : Math.round(unitPrice * 0.8)))
      );
      const qty = Number(pkgItem.quantity || 0);

      return {
        rab_estimation_id: estData!.id,
        spk_id: spkId,
        item_type: itemType,
        wbs_category: wbsStage,
        wbs_stage: wbsStage,
        material_id: itemType === 'MATERIAL' ? (pkgItem.material_id || pkgItem.material?.id || null) : null,
        material_name: itemName,
        description: itemName,
        quantity: qty,
        unit: pkgItem.unit || pkgItem.material?.unit || (itemType === 'LABOR' ? 'lot' : itemType === 'OVERHEAD' ? 'hari' : 'pcs'),
        unit_price: unitPrice,
        cost_price: costPrice,
        labor_hours: itemType === 'LABOR' ? qty : 0,
        labor_rate: itemType === 'LABOR' ? unitPrice : 0,
        overhead_hours: itemType === 'OVERHEAD' ? qty * 8 : 0,
        overhead_rate: itemType === 'OVERHEAD' ? unitPrice / 8 : 0,
        subtotal: qty * unitPrice,
        item_total: qty * unitPrice,
        package_id: packageId,
        is_locked: false,
      };
    });

    const { data: inserted, error: insertError } = await supabase
      .from('rab_items')
      .insert(rabItemsToInsert)
      .select();

    if (insertError) throw insertError;
    return inserted || [];
  }
}

export { isLaborKeyword, isOverheadKeyword, resolveItemType } from '../utils/itemClassification';
export const packageService = new PackageService();

