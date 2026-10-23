export type UserRole = 'owner' | 'service_advisor' | 'mandor' | 'petugas_gudang' | 'kasir';
export type SpkStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type WbsCategory = 'Pembongkaran' | 'Sasis/Rangka' | 'Dinding/Fabrikasi' | 'Cat/Finishing' | 'Kelistrikan/Hidrolik';
export type ChecklistStatus = 'PENDING' | 'PASS' | 'FAIL';
export type RequisitionStatus = 'PENDING' | 'PARTIALLY_ISSUED' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
export type RequisitionItemStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type SpkBoronganStatus = 'ACTIVE' | 'CUT_OFF' | 'COMPLETED';

export interface SpkBoronganRecord {
  id: string;
  spk_id: string;
  wbs_category: string;
  worker_name: string;
  task_description?: string;
  contract_value: number;
  status: SpkBoronganStatus;
  progress_percentage?: number;
  assignment_letter_no?: string;
  material_id?: string | null;
  rab_item_id?: string | null;
  change_order_item_id?: string | null;
  deadline_date?: string | null;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface SpkRecord {
  id: string;
  spk_no: string;
  customer_name: string;
  vehicle_plate: string;
  status: SpkStatus;
  target_date?: string | null;
  total_estimated_cost: number;
  dp_amount: number;
  created_by: string;
  created_at: string;
  is_pricing_locked?: boolean;
  locked_at?: string | null;
  locked_by?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  vehicle_vin?: string | null;
  vehicle_engine?: string | null;
  vehicle_model?: string | null;
  vehicle_brand?: string | null;
  allocation_status?: string | null;
  qc_status?: string;
  customer_phone?: string | null;
  released_at?: string | null;
}

export interface RabItemRecord {
  id: string;
  rab_estimation_id: string;
  spk_id?: string;
  wbs_category: WbsCategory;
  item_type?: 'MATERIAL' | 'LABOR' | 'OVERHEAD';
  material_id?: string | null;
  material_name?: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  subtotal?: number;
  is_locked?: boolean;
  labor_hours?: number;
  labor_rate?: number;
  overhead_hours?: number;
  overhead_rate?: number;
  item_total?: number;
  description?: string;
  unit?: string;
  notes?: string | null;
  wbs_stage?: string;
  package_id?: string | null;
  /** @deprecated Waste factor is permanently eliminated from calculations and schema */
  waste_factor?: number;
  created_at?: string;
}

export interface MaterialRequisitionItemRecord {
  id: string;
  requisition_id: string;
  material_id?: string | null;
  material_name?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  cost_price: number;
  subtotal: number;
  status?: string;
  wbs_stage?: string;
  created_at?: string;
}

export type ChangeOrderStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type ChangeOrderItemType = 'MATERIAL' | 'LABOR' | 'OVERHEAD';

export interface ChangeOrderRecord {
  id: string;
  spk_id: string;
  co_number?: string;
  description: string;
  cost_adjustment: number;
  total_amount?: number;
  status: ChangeOrderStatus;
  approved_at?: string | null;
  approved_by?: string | null;
  created_by?: string | null;
  created_at: string;
  items?: ChangeOrderItemRecord[];
}

export interface ChangeOrderItemRecord {
  id: string;
  change_order_id: string;
  spk_id: string;
  wbs_stage: string;
  item_type: ChangeOrderItemType;
  material_id?: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number; // Snapshot selling price
  cost_price: number; // Snapshot warehouse HPP
  subtotal?: number;  // Generated (quantity * unit_price)
  package_source_id?: string | null;
  package_instance_id?: string | null;
  package_name?: string | null;
  notes?: string | null;
  created_at?: string;
}

export * from './financialReports';
