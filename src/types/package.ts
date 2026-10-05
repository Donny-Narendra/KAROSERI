import type { Material } from '../services/inventoryService';

export interface ProductPackage {
  id: string;
  name: string;
  selling_price: number;
  created_at?: string;
  items?: PackageItem[];
}

export interface PackageItem {
  id?: string;
  package_id?: string;
  item_type: 'MATERIAL' | 'LABOR';
  material_id?: string | null;
  labor_name?: string | null;
  quantity: number;
  cost_per_unit: number;
  created_at?: string;
  material?: Material; // for nested fetching
  default_wbs_allocation?: Record<string, number>;
}
