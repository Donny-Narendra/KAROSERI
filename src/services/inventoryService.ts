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
  },

  async bulkSyncMaterials(inserts: Omit<Material, 'id'>[], updates: (Partial<Omit<Material, 'id'>> & { id: string })[]) {
    // Perform bulk updates
    if (updates.length > 0) {
      for (const update of updates) {
        const { error } = await supabase
          .from('materials')
          .update(update)
          .eq('id', update.id);
        if (error) throw error;
      }
    }
    
    // Perform bulk inserts
    if (inserts.length > 0) {
      const { error } = await supabase
        .from('materials')
        .insert(inserts);
      if (error) throw error;
    }
  },

  async bulkDeleteMaterials(ids: string[]) {
    if (!ids || ids.length === 0) return;
    
    const { error } = await supabase
      .from('materials')
      .delete()
      .in('id', ids);
      
    if (error) {
      if (error.code === '23503') {
        throw new Error('Beberapa material tidak dapat dihapus karena sudah digunakan dalam transaksi SPK');
      }
      throw error;
    }
  },

  async deleteIssuesAndRevertStock(issueIds: string[]) {
    if (!issueIds || issueIds.length === 0) return;
    
    // First, fetch the issues to get quantities and material_ids
    const { data: issues, error: fetchError } = await supabase
      .from('inventory_transactions')
      .select('id, material_id, quantity_issued, spk_id')
      .in('id', issueIds);
      
    if (fetchError) throw fetchError;
    if (!issues || issues.length === 0) return;

    // Check if SPK is COMPLETED. If so, throw error.
    // Assuming SPK status check can be done here or handled individually. 
    // For simplicity, we assume we can fetch spk status.
    const spkIds = [...new Set(issues.map(i => i.spk_id))];
    const { data: spks, error: spkError } = await supabase
      .from('spk')
      .select('id, status')
      .in('id', spkIds);
      
    if (spkError) throw spkError;
    const completedSpks = spks?.filter(s => s.status === 'COMPLETED').map(s => s.id) || [];
    const violatingIssues = issues.filter(i => completedSpks.includes(i.spk_id));
    
    if (violatingIssues.length > 0) {
      throw new Error('Sebagian transaksi tidak dapat dihapus karena SPK sudah berstatus COMPLETED.');
    }

    // Prepare material updates to revert stock
    // Aggregate by material_id in case multiple issues use same material
    const materialRefunds: Record<string, number> = {};
    for (const issue of issues) {
      materialRefunds[issue.material_id] = (materialRefunds[issue.material_id] || 0) + issue.quantity_issued;
    }

    // We need to fetch current stock to add to it because Supabase RPC might not be available
    const { data: materials, error: matError } = await supabase
      .from('materials')
      .select('id, current_stock')
      .in('id', Object.keys(materialRefunds));
      
    if (matError) throw matError;

    // Perform bulk update of materials
    for (const mat of (materials || [])) {
      const refundQty = materialRefunds[mat.id] || 0;
      const { error: updateError } = await supabase
        .from('materials')
        .update({ current_stock: Number(mat.current_stock) + refundQty })
        .eq('id', mat.id);
      if (updateError) throw updateError;
    }

    // Now delete the issues
    const { error: deleteError } = await supabase
      .from('inventory_transactions')
      .delete()
      .in('id', issueIds);
      
    if (deleteError) throw deleteError;
  },

  async updateIssuePrice(issueId: string, customUnitPrice: number | null, newQuantity?: number) {
    const updateData: any = { custom_unit_price: customUnitPrice };
    
    if (newQuantity !== undefined) {
      // Logic for changing quantity requires reverting old quantity and subtracting new quantity
      // To simplify, we will only allow changing price, or if quantity is changed we do the stock math
      // Wait, the plan asks: "Jika kuantitas berubah, sesuaikan selisihnya ke materials.current_stock"
      const { data: oldIssue, error: fetchError } = await supabase
        .from('inventory_transactions')
        .select('quantity_issued, material_id')
        .eq('id', issueId)
        .single();
        
      if (fetchError) throw fetchError;
      
      const diff = oldIssue.quantity_issued - newQuantity;
      if (diff !== 0) {
        const { data: material, error: matError } = await supabase
          .from('materials')
          .select('current_stock')
          .eq('id', oldIssue.material_id)
          .single();
          
        if (matError) throw matError;
        
        const { error: updateMatError } = await supabase
          .from('materials')
          .update({ current_stock: Number(material.current_stock) + diff })
          .eq('id', oldIssue.material_id);
          
        if (updateMatError) throw updateMatError;
      }
      
      updateData.quantity_issued = newQuantity;
    }
    
    const { error } = await supabase
      .from('inventory_transactions')
      .update(updateData)
      .eq('id', issueId);
      
    if (error) throw error;
  },

  async getIssuedMaterialsBySpk(spkId: string) {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('material_id, quantity_issued')
      .eq('spk_id', spkId);
      
    if (error) throw error;
    
    const totals: Record<string, number> = {};
    if (data) {
      data.forEach((tx: any) => {
        totals[tx.material_id] = (totals[tx.material_id] || 0) + Number(tx.quantity_issued);
      });
    }
    return totals;
  }
};
