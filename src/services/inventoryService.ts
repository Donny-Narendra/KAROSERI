import { supabase } from '../lib/supabaseClient';

export interface Material {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  cost_price?: number;
  selling_price?: number;
  category?: string;
  waste_factor_percentage: number;
  current_stock: number;
  minimum_stock: number;
  is_customer_supplied?: boolean;
}

export interface InventoryAuditLog {
  id: string;
  material_id: string;
  action_type: 'STOCK_ADJUSTMENT' | 'PRICE_CHANGE' | 'DETAIL_UPDATE' | 'MATERIAL_CREATE' | 'RESTOCK';
  previous_data: any;
  new_data: any;
  notes: string;
  changed_by: string;
  created_at: string;
  profiles?: {
    full_name: string;
    role: string;
  };
  materials?: {
    name: string;
    unit: string;
  } | null;
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

  async updateMaterialWithAudit(
    id: string, 
    material: Partial<Omit<Material, 'id'>>, 
    actionType: 'STOCK_ADJUSTMENT' | 'PRICE_CHANGE' | 'DETAIL_UPDATE',
    notes: string,
    previousData: Partial<Material>
  ) {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    // Perform the update on material
    const { data: updatedMaterial, error: updateError } = await supabase
      .from('materials')
      .update(material)
      .eq('id', id)
      .select()
      .single();
      
    if (updateError) throw updateError;

    // Log the audit
    const { error: auditError } = await supabase
      .from('inventory_audit_logs')
      .insert([{
        material_id: id,
        action_type: actionType,
        previous_data: previousData,
        new_data: material,
        notes: notes,
        changed_by: userData.user.id
      }]);
      
    if (auditError) throw auditError;
    
    return updatedMaterial as Material;
  },

  async restockMaterial(materialId: string, addedQuantity: number, notes?: string) {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    // Fetch current material to get the old stock
    const { data: currentMaterial, error: fetchError } = await supabase
      .from('materials')
      .select('current_stock')
      .eq('id', materialId)
      .single();

    if (fetchError) throw fetchError;

    const oldStock = Number(currentMaterial.current_stock);
    const newStock = oldStock + addedQuantity;

    // Perform the update on material
    const { data: updatedMaterial, error: updateError } = await supabase
      .from('materials')
      .update({ current_stock: newStock })
      .eq('id', materialId)
      .select()
      .single();
      
    if (updateError) throw updateError;

    // Log the audit
    const { error: auditError } = await supabase
      .from('inventory_audit_logs')
      .insert([{
        material_id: materialId,
        action_type: 'RESTOCK',
        previous_data: { current_stock: oldStock },
        new_data: { current_stock: newStock, added_quantity: addedQuantity },
        notes: notes || '',
        changed_by: userData.user.id
      }]);
      
    if (auditError) throw auditError;
    
    return updatedMaterial as Material;
  },

  async getMaterialAuditLogs(materialId?: string) {
    let query = supabase
      .from('inventory_audit_logs')
      .select('*, profiles(full_name, role), materials(name, unit)')
      .order('created_at', { ascending: false });

    if (materialId) {
      query = query.eq('material_id', materialId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as InventoryAuditLog[];
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
    
    // First, fetch the issues to get quantities, material_ids, and relation info
    const { data: issues, error: fetchError } = await supabase
      .from('inventory_transactions')
      .select('id, material_id, quantity_issued, spk_id, requisition_id, requisition_item_id')
      .in('id', issueIds);
      
    if (fetchError) throw fetchError;
    if (!issues || issues.length === 0) return;

    // Check if SPK is COMPLETED. If so, throw error.
    const spkIds = [...new Set(issues.map(i => i.spk_id).filter(Boolean))];
    if (spkIds.length > 0) {
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
    }

    // 1. Try batch RPC void_material_issues first
    let rpcSuccess = false;
    try {
      const { data: batchRes, error: batchErr } = await supabase.rpc('void_material_issues', {
        p_issue_ids: issueIds
      });
      if (!batchErr && batchRes && batchRes.success) {
        rpcSuccess = true;
      }
    } catch (e) {
      console.warn('Batch RPC void_material_issues unavailable, falling back:', e);
    }

    // 2. If batch RPC not available, try individual void_material_issue RPC calls
    if (!rpcSuccess) {
      let allSingleOk = true;
      for (const id of issueIds) {
        try {
          const { data: singleRes, error: singleErr } = await supabase.rpc('void_material_issue', {
            p_issue_id: id
          });
          if (singleErr || !singleRes?.success) {
            allSingleOk = false;
            break;
          }
        } catch {
          allSingleOk = false;
          break;
        }
      }
      if (allSingleOk && issueIds.length > 0) {
        rpcSuccess = true;
      }
    }

    // 3. Fallback to client-side transactional steps if RPC is not yet executed in Supabase SQL editor
    if (!rpcSuccess) {
      // Revert physical stock in materials
      const materialRefunds: Record<string, number> = {};
      for (const issue of issues) {
        if (issue.material_id) {
          materialRefunds[issue.material_id] = (materialRefunds[issue.material_id] || 0) + Number(issue.quantity_issued || 0);
        }
      }

      if (Object.keys(materialRefunds).length > 0) {
        const { data: materials, error: matError } = await supabase
          .from('materials')
          .select('id, current_stock')
          .in('id', Object.keys(materialRefunds));
          
        if (matError) throw matError;

        for (const mat of (materials || [])) {
          const refundQty = materialRefunds[mat.id] || 0;
          const { error: updateError } = await supabase
            .from('materials')
            .update({ current_stock: Number(mat.current_stock || 0) + refundQty })
            .eq('id', mat.id);
          if (updateError) throw updateError;
        }
      }

      // Restore requisition status to PENDING for each issue
      for (const issue of issues) {
        let targetReqId = issue.requisition_id;
        let targetReqItemId = issue.requisition_item_id;

        // Fallback: If not explicitly linked, find approved requisition for this SPK and material
        if (!targetReqId && issue.spk_id && issue.material_id) {
          const { data: reqs } = await supabase
            .from('material_requisitions')
            .select(`
              id,
              material_requisition_items ( id, material_id )
            `)
            .eq('spk_id', issue.spk_id)
            .eq('status', 'APPROVED')
            .order('updated_at', { ascending: false })
            .limit(1);

          if (reqs && reqs.length > 0) {
            targetReqId = reqs[0].id;
            const matchedItem = reqs[0].material_requisition_items?.find((m: any) => m.material_id === issue.material_id);
            if (matchedItem) {
              targetReqItemId = matchedItem.id;
            }
          }
        }

        if (targetReqItemId) {
          await supabase
            .from('material_requisition_items')
            .update({ status: 'PENDING' })
            .eq('id', targetReqItemId);
        }

        if (targetReqId) {
          await supabase
            .from('material_requisitions')
            .update({ status: 'PENDING' })
            .eq('id', targetReqId);
        }
      }

      // Delete the issues from inventory_transactions
      const { error: deleteError } = await supabase
        .from('inventory_transactions')
        .delete()
        .in('id', issueIds);
        
      if (deleteError) throw deleteError;
    }
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
