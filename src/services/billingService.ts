import { supabase } from '../lib/supabaseClient';

export interface DPHistoryRecord {
  spk_id: string;
  spk_no: string;
  customer_name: string;
  vehicle_plate: string;
  vehicle_vin?: string;
  vehicle_model?: string;
  total_contract_estimate?: number;
  dp_amount: number;
  payment_method: string;
  notes: string;
  payment_date: string;
}

export interface ApprovedChangeOrderItem {
  id?: string;
  item_name: string;
  item_type: 'MATERIAL' | 'LABOR' | 'OVERHEAD' | string;
  wbs_stage: string;
  quantity: number;
  unit: string;
  unit_price: number;
  cost_price?: number;
  subtotal: number;
  notes?: string | null;
}

export interface ApprovedChangeOrder {
  id: string;
  order_number: string;
  co_number: string;
  description: string;
  wbs_stage: string;
  total_amount: number;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  change_order_items: ApprovedChangeOrderItem[];
}

interface RawPaymentRow {
  amount: number | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

interface RawSpkDpRow {
  id: string;
  spk_no: string;
  customer_name: string;
  vehicle_plate: string;
  vehicle_vin?: string | null;
  vehicle_number?: string | null;
  vehicle_engine?: string | null;
  total_estimated_cost?: number | null;
  dp_amount: number | null;
  status: string;
  payments?: RawPaymentRow[] | null;
}

interface RawChangeOrderItemRow {
  id?: string;
  item_name?: string | null;
  item_type?: string | null;
  wbs_stage?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  unit_price?: number | string | null;
  cost_price?: number | string | null;
  subtotal?: number | string | null;
  notes?: string | null;
}

interface RawChangeOrderRow {
  id: string;
  co_number?: string | null;
  description?: string | null;
  total_amount?: number | string | null;
  cost_adjustment?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  change_order_items?: RawChangeOrderItemRow[] | null;
}

interface RawLegacyAmendmentRow {
  id: string;
  spk_id: string;
  description?: string | null;
  cost_adjustment?: number | string | null;
  status?: string | null;
  approved_by?: string | null;
  created_at?: string | null;
}

export const fetchDPHistory = async (): Promise<DPHistoryRecord[]> => {
  const { data, error } = await supabase.from('spk').select(`
    id,
    spk_no,
    customer_name,
    vehicle_plate,
    vehicle_vin,
    vehicle_number,
    vehicle_engine,
    total_estimated_cost,
    dp_amount,
    status,
    payments (
      amount,
      payment_method,
      notes,
      created_at
    )
  `)
  .gt('dp_amount', 0)
  .in('status', ['ACTIVE', 'COMPLETED']);

  if (error) {
    console.error('Error fetching DP history:', error);
    return [];
  }

  const history: DPHistoryRecord[] = [];
  (data as RawSpkDpRow[] | null)?.forEach((spk) => {
    const payment = spk.payments && spk.payments.length > 0 
      ? [...spk.payments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      : null;
      
    history.push({
      spk_id: spk.id,
      spk_no: spk.spk_no,
      customer_name: spk.customer_name,
      vehicle_plate: spk.vehicle_plate,
      vehicle_vin: spk.vehicle_vin || spk.vehicle_number || '-',
      vehicle_model: spk.vehicle_plate,
      total_contract_estimate: Number(spk.total_estimated_cost || 0),
      dp_amount: Number(spk.dp_amount || 0),
      payment_method: payment ? (payment.payment_method || 'Transfer Bank') : 'Transfer Bank',
      notes: payment ? (payment.notes || '-') : '-',
      payment_date: payment ? payment.created_at : new Date().toISOString(),
    });
  });

  return history.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
};

/**
 * Fetch approved change orders (Addendums) for an SPK with full itemized breakdown
 * including item names, item types, WBS stages, quantities, prices, and subtotals.
 */
export const fetchApprovedChangeOrders = async (spkId: string): Promise<ApprovedChangeOrder[]> => {
  if (!spkId) return [];

  try {
    // 1. Primary query: change_orders with nested change_order_items
    const { data, error } = await supabase
      .from('change_orders')
      .select(`
        id,
        co_number,
        description,
        total_amount,
        cost_adjustment,
        status,
        created_at,
        approved_at,
        approved_by,
        change_order_items (
          id,
          item_name,
          item_type,
          wbs_stage,
          quantity,
          unit,
          unit_price,
          cost_price,
          subtotal,
          notes
        )
      `)
      .eq('spk_id', spkId)
      .eq('status', 'APPROVED')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return (data as RawChangeOrderRow[]).map((co) => {
        const rawItems = co.change_order_items || [];
        const items: ApprovedChangeOrderItem[] = rawItems.map((item) => {
          const qty = Number(item.quantity || 1);
          const price = Number(item.unit_price || 0);
          const computedSubtotal = item.subtotal !== null && item.subtotal !== undefined
            ? Number(item.subtotal)
            : qty * price;

          return {
            id: item.id,
            item_name: item.item_name || 'Item Amandemen',
            item_type: item.item_type || 'MATERIAL',
            wbs_stage: item.wbs_stage || 'Umum',
            quantity: qty,
            unit: item.unit || 'pcs',
            unit_price: price,
            cost_price: item.cost_price !== null && item.cost_price !== undefined ? Number(item.cost_price) : undefined,
            subtotal: computedSubtotal,
            notes: item.notes || null,
          };
        });

        const stages = Array.from(new Set(items.map((it) => it.wbs_stage).filter(Boolean)));
        const wbs_stage = stages.length > 0 ? stages.join(', ') : 'Umum';
        const total_amount = Number(
          co.total_amount ?? co.cost_adjustment ?? items.reduce((sum, it) => sum + it.subtotal, 0)
        );
        const order_number = co.co_number || `CO-${co.id.substring(0, 8).toUpperCase()}`;

        return {
          id: co.id,
          order_number,
          co_number: order_number,
          description: co.description || 'Pekerjaan Tambahan (Addendum)',
          wbs_stage,
          total_amount,
          created_at: co.created_at || new Date().toISOString(),
          approved_at: co.approved_at || co.created_at || null,
          approved_by: co.approved_by || null,
          change_order_items: items,
        };
      });
    }

    // 2. Resilient fallback: legacy spk_amendments table if change_orders returns empty
    const { data: legacyData, error: legacyError } = await supabase
      .from('spk_amendments')
      .select('id, spk_id, description, cost_adjustment, status, approved_by, created_at')
      .eq('spk_id', spkId)
      .eq('status', 'APPROVED')
      .order('created_at', { ascending: false });

    if (legacyError || !legacyData) {
      if (error && legacyError) {
        console.warn('Error fetching change_orders and spk_amendments:', error.message, legacyError.message);
      }
      return [];
    }

    return (legacyData as RawLegacyAmendmentRow[]).map((leg) => {
      const coNum = `CO-LEGACY-${leg.id.substring(0, 6).toUpperCase()}`;
      const amount = Number(leg.cost_adjustment || 0);
      return {
        id: leg.id,
        order_number: coNum,
        co_number: coNum,
        description: leg.description || 'Pekerjaan Tambahan (Addendum)',
        wbs_stage: 'Umum',
        total_amount: amount,
        created_at: leg.created_at || new Date().toISOString(),
        approved_at: leg.created_at || null,
        approved_by: leg.approved_by || null,
        change_order_items: [
          {
            item_name: leg.description || 'Penyesuaian Biaya Kontrak',
            item_type: 'MATERIAL',
            wbs_stage: 'Umum',
            quantity: 1,
            unit: 'paket',
            unit_price: amount,
            subtotal: amount,
          },
        ],
      };
    });
  } catch (err) {
    console.error('Unexpected error fetching approved change orders:', err);
    return [];
  }
};
