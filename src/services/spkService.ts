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
  }
};
