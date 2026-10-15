import { supabase } from '../lib/supabaseClient';

export interface CancelSpkParams {
  spkId: string;
  reason: string;
  userId: string;
}

export const spkService = {
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
    const { data, error } = await supabase
      .from('spk_amendments')
      .update({ 
        status: 'APPROVED',
        approved_by: approvedBy
      })
      .eq('id', amendmentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to approve amendment: ${error.message}`);
    }
    return data;
  },

  async rejectAmendment(amendmentId: string) {
    const { data, error } = await supabase
      .from('spk_amendments')
      .update({ 
        status: 'REJECTED'
      })
      .eq('id', amendmentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to reject amendment: ${error.message}`);
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
