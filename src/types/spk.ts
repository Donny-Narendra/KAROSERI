import type { SpkStatus } from './database';

export interface AgreementPhoto {
  url?: string;
  secure_url: string;
  public_id: string;
  format?: string;
  bytes?: number;
  uploaded_at?: string;
  [key: string]: any;
}

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
  qc_status?: 'PENDING' | 'PASS' | 'FAIL';
  final_qc_checklist?: string[];
  customer_phone?: string;
  vehicle_plate?: string;
  vehicle_vin?: string;
  vehicle_engine?: string;
  vin_chassis?: string;
  engine_number?: string;
  vehicle_model?: string;
  vehicle_brand?: string;
  target_date?: string;
  sub_tasks?: string[];
  agreement_photos?: AgreementPhoto[];
  pending_requisitions_count?: number;
  [key: string]: any;
}
