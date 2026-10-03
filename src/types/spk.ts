export type SpkStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'ACTIVE' | 'CANCELLED' | 'UNPAID' | 'COMPLETED' | 'active';

export interface Spk {
  id: string;
  spk_no: string;
  customer_name: string;
  vehicle_number: string;
  status: SpkStatus;
  created_at: string;
  dp_amount?: number;
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  [key: string]: any;
}
