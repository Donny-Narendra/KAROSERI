import { supabase } from '../lib/supabaseClient';

export interface DPHistoryRecord {
  spk_id: string;
  spk_no: string;
  customer_name: string;
  vehicle_plate: string;
  dp_amount: number;
  payment_method: string;
  notes: string;
  payment_date: string;
}

export const fetchDPHistory = async (): Promise<DPHistoryRecord[]> => {
  const { data, error } = await supabase.from('spk').select(`
    id,
    spk_no,
    customer_name,
    vehicle_plate,
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
  .in('status', ['ACTIVE', 'READY_FOR_HANDOVER', 'COMPLETED']);

  if (error) {
    console.error('Error fetching DP history:', error);
    return [];
  }

  const history: DPHistoryRecord[] = [];
  data.forEach((spk: any) => {
    const payment = spk.payments && spk.payments.length > 0 
      ? spk.payments.sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      : null;
      
    history.push({
      spk_id: spk.id,
      spk_no: spk.spk_no,
      customer_name: spk.customer_name,
      vehicle_plate: spk.vehicle_plate,
      dp_amount: spk.dp_amount,
      payment_method: payment ? payment.payment_method : 'Transfer Bank',
      notes: payment ? (payment.notes || '-') : '-',
      payment_date: payment ? payment.created_at : new Date().toISOString(),
    });
  });

  return history.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
};
