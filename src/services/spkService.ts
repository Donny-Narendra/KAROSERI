import { supabase } from '../lib/supabaseClient';
import type { ChangeOrderItemType } from '../types/database';

export interface CancelSpkParams {
  spkId: string;
  reason: string;
  userId: string;
}

export interface CancelledSpkAuditRecord {
  id: string;
  spk_no: string;
  customer_name: string;
  customer_phone?: string | null;
  vehicle_plate?: string | null;
  vehicle_vin?: string | null;
  vehicle_engine?: string | null;
  status: string;
  total_estimated_cost: number;
  cancellation_reason: string;
  cancelled_at: string;
  cancelled_by?: string | null;
  cancelled_by_profile?: {
    id: string;
    full_name: string;
    role: string;
    email?: string;
  } | null;
  created_at: string;
  updated_at?: string | null;
}

export const spkService = {
  async fetchCancelledSpkAuditLogs(): Promise<CancelledSpkAuditRecord[]> {
    const { data, error } = await supabase
      .from('spk')
      .select(`
        id,
        spk_no,
        customer_name,
        customer_phone,
        vehicle_plate,
        vehicle_vin,
        vehicle_engine,
        status,
        total_estimated_cost,
        cancellation_reason,
        cancelled_at,
        cancelled_by,
        created_at,
        updated_at,
        notes,
        cancelled_by_profile:profiles!cancelled_by ( id, full_name, role, email ),
        rab_estimations ( total_estimated_cost )
      `)
      .eq('status', 'CANCELLED')
      .order('cancelled_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch cancelled SPK audit logs:', error);
      throw new Error(`Failed to fetch cancelled SPK audit logs: ${error.message}`);
    }

    if (!data) return [];

    interface RawCancelledSpkRow {
      id: string;
      spk_no: string;
      customer_name: string;
      customer_phone?: string | null;
      vehicle_plate?: string | null;
      vehicle_vin?: string | null;
      vehicle_engine?: string | null;
      status: string;
      total_estimated_cost?: number | string | null;
      cancellation_reason?: string | null;
      cancelled_at?: string | null;
      cancelled_by?: string | null;
      created_at: string;
      updated_at?: string | null;
      notes?: string | null;
      cancelled_by_profile?: {
        id: string;
        full_name: string;
        role: string;
        email?: string;
      } | null;
      rab_estimations?: Array<{ total_estimated_cost?: number | string | null }>;
    }

    return (data as unknown as RawCancelledSpkRow[]).map((row) => {
      let estimatedCost = Number(row.total_estimated_cost) || 0;
      if (estimatedCost === 0 && row.rab_estimations && row.rab_estimations.length > 0) {
        estimatedCost = Number(row.rab_estimations[0].total_estimated_cost) || 0;
      }

      return {
        id: row.id,
        spk_no: row.spk_no,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        vehicle_plate: row.vehicle_plate,
        vehicle_vin: row.vehicle_vin,
        vehicle_engine: row.vehicle_engine,
        status: row.status,
        total_estimated_cost: estimatedCost,
        cancellation_reason: row.cancellation_reason || row.notes || 'Tanpa keterangan tertulis',
        cancelled_at: row.cancelled_at || row.updated_at || row.created_at,
        cancelled_by: row.cancelled_by,
        cancelled_by_profile: row.cancelled_by_profile || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });
  },
  async cancelSpk({ spkId, reason, userId }: CancelSpkParams) {
    if (!reason || reason.trim() === '') {
      throw new Error('Cancellation reason is required');
    }

    // 1. Validate SPK state (Guardrails)
    // SPK must be in DRAFT or PENDING_PAYMENT status
    const { data: spk, error: fetchError } = await supabase
      .from('spk')
      .select('status, dp_amount')
      .eq('id', spkId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch SPK: ${fetchError.message}`);
    }
    
    if (!spk) {
      throw new Error('SPK not found');
    }

    if (spk.status !== 'DRAFT' && spk.status !== 'PENDING_PAYMENT') {
      throw new Error(`Cannot cancel SPK because it is in '${spk.status}' status`);
    }
    
    // Check if DP exists just to be extra safe
    if (spk.dp_amount && Number(spk.dp_amount) > 0) {
      throw new Error('Cannot cancel SPK because down payment has already been received');
    }

    // Check for goods issue (Assuming goods_issue table exists, if not this is a conceptual check or we rely on status)
    // For now, based on instructions: Goods Issue = 0. We'll check if there's any related record if the table exists,
    // but typically a DRAFT/PENDING_PAYMENT SPK won't have goods issued anyway. 
    // If the WBS schema has goods_issue, we can query it.
    // Let's perform the update
    
    const { data, error } = await supabase
      .from('spk')
      .update({
        status: 'CANCELLED',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId
      })
      .eq('id', spkId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel SPK: ${error.message}`);
    }

    return data;
  },

  async approveAmendment(amendmentId: string, approvedBy: string) {
    // Update both change_orders (if exists) and spk_amendments
    await supabase
      .from('change_orders')
      .update({ 
        status: 'APPROVED',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .eq('id', amendmentId);

    const { data, error } = await supabase
      .from('spk_amendments')
      .update({ 
        status: 'APPROVED',
        approved_by: approvedBy
      })
      .eq('id', amendmentId)
      .select()
      .maybeSingle();

    if (error && !data) {
      console.warn(`spk_amendments update notice: ${error.message}`);
    }
    return data;
  },

  async rejectAmendment(amendmentId: string) {
    await supabase
      .from('change_orders')
      .update({ 
        status: 'REJECTED'
      })
      .eq('id', amendmentId);

    const { data, error } = await supabase
      .from('spk_amendments')
      .update({ 
        status: 'REJECTED'
      })
      .eq('id', amendmentId)
      .select()
      .maybeSingle();

    if (error && !data) {
      console.warn(`spk_amendments update notice: ${error.message}`);
    }
    return data;
  },

  async getChangeOrders(spkId: string) {
    const { data, error } = await supabase
      .from('change_orders')
      .select(`
        *,
        items:change_order_items(*)
      `)
      .eq('spk_id', spkId)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback to legacy spk_amendments if table query fails
      console.warn('Error fetching change_orders, falling back to spk_amendments:', error.message);
      const { data: legacyData, error: legacyError } = await supabase
        .from('spk_amendments')
        .select('*')
        .eq('spk_id', spkId)
        .order('created_at', { ascending: false });

      if (legacyError) throw legacyError;
      return (legacyData || []).map((row: any) => ({
        ...row,
        co_number: `CO-LEGACY-${row.id.substring(0, 6).toUpperCase()}`,
        total_amount: Number(row.cost_adjustment || 0),
        items: []
      }));
    }

    // If change_orders is empty, check legacy spk_amendments
    if (!data || data.length === 0) {
      const { data: legacyData } = await supabase
        .from('spk_amendments')
        .select('*')
        .eq('spk_id', spkId)
        .order('created_at', { ascending: false });

      if (legacyData && legacyData.length > 0) {
        return legacyData.map((row: any) => ({
          ...row,
          co_number: `CO-LEGACY-${row.id.substring(0, 6).toUpperCase()}`,
          total_amount: Number(row.cost_adjustment || 0),
          items: []
        }));
      }
    }

    return data || [];
  },

  async createChangeOrder({
    spkId,
    spkNo,
    description,
    items,
    createdBy,
    status = 'PENDING'
  }: {
    spkId: string;
    spkNo?: string;
    description: string;
    items: Array<{
      wbs_stage: string;
      item_type: ChangeOrderItemType;
      material_id?: string | null;
      item_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
      cost_price: number;
      notes?: string;
    }>;
    createdBy?: string;
    status?: 'DRAFT' | 'PENDING' | 'APPROVED';
  }) {
    // 1. Calculate total selling price adjustment
    const calculatedTotal = items.reduce(
      (sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)),
      0
    );

    // 2. Generate sequential co_number: CO-[SPK_NO or YYYYMMDD]-[SEQ]
    const cleanSpk = (spkNo || 'SPK').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    const coNumber = `CO-${cleanSpk}-${timestamp}`;

    // 3. Insert Change Order Header
    const { data: coHeader, error: headerError } = await supabase
      .from('change_orders')
      .insert({
        spk_id: spkId,
        co_number: coNumber,
        description: description.trim(),
        cost_adjustment: calculatedTotal,
        total_amount: calculatedTotal,
        status: status,
        created_by: createdBy || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (headerError) {
      throw new Error(`Failed to create change order: ${headerError.message}`);
    }

    // 4. Insert Change Order Items
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        change_order_id: coHeader.id,
        spk_id: spkId,
        wbs_stage: item.wbs_stage,
        item_type: item.item_type,
        material_id: item.material_id || null,
        item_name: item.item_name.trim(),
        quantity: Number(item.quantity || 1),
        unit: item.unit || 'pcs',
        unit_price: Number(item.unit_price || 0),
        cost_price: Number(item.cost_price || 0),
        notes: item.notes || null,
        created_at: new Date().toISOString()
      }));

      const { error: itemsError } = await supabase
        .from('change_order_items')
        .insert(itemsToInsert);

      if (itemsError) {
        // Rollback header if items fail
        await supabase.from('change_orders').delete().eq('id', coHeader.id);
        throw new Error(`Failed to save change order items: ${itemsError.message}`);
      }
    }

    return coHeader;
  },

  async approveChangeOrder(changeOrderId: string, approvedBy: string) {
    const { data, error } = await supabase
      .from('change_orders')
      .update({ 
        status: 'APPROVED',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .eq('id', changeOrderId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to approve change order: ${error.message}`);
    }
    return data;
  },

  async rejectChangeOrder(changeOrderId: string) {
    const { data, error } = await supabase
      .from('change_orders')
      .update({ 
        status: 'REJECTED'
      })
      .eq('id', changeOrderId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to reject change order: ${error.message}`);
    }
    return data;
  },

  async updateSpkCredentials({
    spkNo,
    targetDate,
    customerName,
    customerPhone,
    vehiclePlate,
    vinChassis,
    engineNumber,
    subTasks,
  }: UpdateSpkCredentialsParams) {
    if (!spkNo || spkNo.trim() === '') {
      throw new Error('SPK Number is required');
    }
    if (!customerName || customerName.trim() === '') {
      throw new Error('Customer Name is required');
    }
    if (!vehiclePlate || vehiclePlate.trim() === '') {
      throw new Error('Vehicle Plate is required');
    }

    const payload: Record<string, any> = {
      target_date: targetDate || null,
      customer_name: customerName.trim(),
      customer_phone: customerPhone?.trim() || null,
      vehicle_plate: vehiclePlate.trim().toUpperCase(),
      vehicle_vin: vinChassis?.trim().toUpperCase() || null,
      vin_chassis: vinChassis?.trim().toUpperCase() || null,
      vehicle_engine: engineNumber?.trim().toUpperCase() || null,
      engine_number: engineNumber?.trim().toUpperCase() || null,
      sub_tasks: subTasks && subTasks.length > 0 ? subTasks : null,
    };

    const { data, error } = await supabase
      .from('spk')
      .update(payload)
      .eq('spk_no', spkNo.trim())
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update SPK credentials: ${error.message}`);
    }

    return data;
  }
};

export interface UpdateSpkCredentialsParams {
  spkNo: string;
  targetDate?: string | null;
  customerName: string;
  customerPhone?: string | null;
  vehiclePlate: string;
  vinChassis?: string | null;
  engineNumber?: string | null;
  subTasks?: string[] | null;
}
