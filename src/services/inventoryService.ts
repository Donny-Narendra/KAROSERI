import { supabase } from '../lib/supabaseClient';

export interface Material {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  waste_factor_percentage: number;
  current_stock: number;
  minimum_stock: number;
  is_customer_supplied?: boolean;
}

export const inventoryService = {
  async getMaterials() {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data as Material[];
  },

  async addMaterial(material: Omit<Material, 'id'>) {
    const { data, error } = await supabase
      .from('materials')
      .insert([material])
      .select()
      .single();
      
    if (error) throw error;
    return data as Material;
  },

  async updateMaterial(id: string, material: Partial<Omit<Material, 'id'>>) {
    const { data, error } = await supabase
      .from('materials')
      .update(material)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data as Material;
  },

  async checkMaterialUsage(id: string) {
    const { count, error } = await supabase
      .from('inventory_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('material_id', id);
      
    if (error) throw error;
    return (count || 0) > 0;
  },

  async deleteMaterial(id: string) {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
