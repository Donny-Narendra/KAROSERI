import { supabase } from '../lib/supabaseClient';
import type { ProductPackage, PackageItem } from '../types/package';

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
        package_id: newPackage.id
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
        package_id: id
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
}

export const packageService = new PackageService();
