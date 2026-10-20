import { supabase } from '../lib/supabaseClient';

export interface DbRabItemRecord {
  id: string;
  rab_estimation_id?: string;
  spk_id?: string;
  wbs_category: string;
  wbs_stage?: string | null;
  item_type?: 'MATERIAL' | 'LABOR' | 'OVERHEAD' | string | null;
  description?: string | null;
  material_name?: string | null;
  material_id?: string | null;
  package_id?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  notes?: string | null;
  unit_price?: number | string | null;
  cost_price?: number | string | null;
  labor_hours?: number | string | null;
  labor_rate?: number | string | null;
  overhead_hours?: number | string | null;
  overhead_rate?: number | string | null;
  item_total?: number | string | null;
  subtotal?: number | string | null;
  is_locked?: boolean | null;
}

export interface RabItem {
  id: string;
  wbsCategory: string;
  type: 'material' | 'labor' | 'overhead';
  description: string;
  qty: number;
  unit?: string;
  notes?: string;
  unitPrice: number;
  costPrice?: number;
  subtotal?: number;
  isLocked?: boolean;
  packageId?: string;
  materialId?: string;
}

export interface RabEstimationSummary {
  id: string;
  spk_id: string;
  total_material_cost: number;
  total_labor_cost: number;
  total_overhead_cost: number;
  total_estimated_cost: number;
}

export interface RabSpkDetails {
  id: string;
  spk_no: string;
  customer_name: string;
  customer_phone?: string | null;
  vehicle_plate: string;
  vehicle_vin?: string | null;
  vin_chassis?: string | null;
  vehicle_model?: string | null;
  vehicle_brand?: string | null;
  status: string;
  total_estimated_cost?: number | null;
  dp_amount?: number | null;
  target_date?: string | null;
  is_pricing_locked?: boolean | null;
  allocation_status?: 'PARTIAL' | 'COMPLETE' | null;
  locked_at?: string | null;
}

export class RabService {
  private async safeSingle<T>(query: any): Promise<{ data: T | null; error: any }> {
    try {
      if (query && typeof query.maybeSingle === 'function') {
        return await query.maybeSingle();
      }
      if (query && typeof query.single === 'function') {
        return await query.single();
      }
      return await query;
    } catch (err) {
      return { data: null, error: err };
    }
  }

  /**
   * Mengambil atau membuat header rab_estimations untuk SPK yang diberikan
   */
  async ensureRabEstimation(spkId: string): Promise<string> {
    const { data: existing } = await this.safeSingle<RabEstimationSummary>(
      supabase.from('rab_estimations').select('id').eq('spk_id', spkId)
    );

    if (existing?.id) {
      return existing.id;
    }

    const { data: created, error } = await supabase
      .from('rab_estimations')
      .insert({
        spk_id: spkId,
        total_material_cost: 0,
        total_labor_cost: 0,
        total_overhead_cost: 0,
        total_estimated_cost: 0
      })
      .select('id')
      .single();

    if (error) {
      const { data: retry } = await this.safeSingle<RabEstimationSummary>(
        supabase.from('rab_estimations').select('id').eq('spk_id', spkId)
      );
      if (retry?.id) return retry.id;
      throw error;
    }
    return created.id;
  }

  /**
   * Memuat data RAB (header estimasi, detail SPK, dan rincian item)
   * Dilengkapi fallback query spk_id jika query rab_estimation_id kosong.
   */
  async loadRabItems(spkId: string): Promise<{
    estimation: RabEstimationSummary | null;
    spk: RabSpkDetails | null;
    items: RabItem[];
  }> {
    if (!spkId) return { estimation: null, spk: null, items: [] };

    // 1. Ambil detail SPK
    const { data: spkData } = await this.safeSingle<RabSpkDetails>(
      supabase.from('spk').select('*').eq('id', spkId)
    );

    // 2. Ambil rab_estimations
    const { data: estData } = await this.safeSingle<RabEstimationSummary>(
      supabase.from('rab_estimations').select('*').eq('spk_id', spkId)
    );

    let itemsData: DbRabItemRecord[] = [];
    let estimationId = estData?.id;

    // 3. Ambil rab_items berdasarkan rab_estimation_id
    if (estimationId) {
      const { data: itemsByEst } = await supabase
        .from('rab_items')
        .select('*')
        .eq('rab_estimation_id', estimationId);
      if (itemsByEst && itemsByEst.length > 0) {
        itemsData = itemsByEst as DbRabItemRecord[];
      }
    }

    // 4. Fallback jika items kosong: ambil langsung berdasarkan spk_id
    if (itemsData.length === 0) {
      const { data: itemsBySpk } = await supabase
        .from('rab_items')
        .select('*')
        .eq('spk_id', spkId);
      if (itemsBySpk && itemsBySpk.length > 0) {
        itemsData = itemsBySpk as DbRabItemRecord[];

        // Jika estimation belum ada, buatkan dan bind ke rab_items
        if (!estimationId) {
          const { data: newEst } = await supabase
            .from('rab_estimations')
            .insert({
              spk_id: spkId,
              total_material_cost: 0,
              total_labor_cost: 0,
              total_overhead_cost: 0,
              total_estimated_cost: 0
            })
            .select('id')
            .maybeSingle();

          if (newEst?.id) {
            estimationId = newEst.id;
            await supabase
              .from('rab_items')
              .update({ rab_estimation_id: estimationId })
              .eq('spk_id', spkId);
          }
        }
      }
    }

    // 5. Normalisasi ke model RabItem
    const items: RabItem[] = itemsData.map((dbItem) => {
      let type: 'material' | 'labor' | 'overhead' = 'material';
      let qty = 0;
      let unitPrice = Number(dbItem.unit_price) || 0;
      const costPrice = Number(dbItem.cost_price) || 0;

      const laborHours = Number(dbItem.labor_hours || 0);
      const overheadHours = Number(dbItem.overhead_hours || 0);

      if (dbItem.item_type === 'LABOR' || laborHours > 0 || Number(dbItem.labor_rate || 0) > 0) {
        type = 'labor';
        qty = Number(dbItem.quantity) || laborHours || 1;
        unitPrice = Number(dbItem.unit_price) || Number(dbItem.labor_rate) || 0;
        if (unitPrice === 0 && Number(dbItem.item_total || 0) > 0) {
          unitPrice = Number(dbItem.item_total) / qty;
        }
      } else if (dbItem.item_type === 'OVERHEAD' || overheadHours > 0) {
        type = 'overhead';
        qty = Number(dbItem.quantity) || (overheadHours > 0 ? overheadHours / 8 : 1);
        unitPrice = Number(dbItem.unit_price) || (Number(dbItem.overhead_rate) * 8) || 0;
        if (unitPrice === 0 && Number(dbItem.item_total || 0) > 0) {
          unitPrice = Number(dbItem.item_total) / qty;
        }
      } else {
        type = 'material';
        qty = Number(dbItem.quantity || 0);
        if (unitPrice === 0 && Number(dbItem.item_total || 0) > 0) {
          unitPrice = Number(dbItem.item_total) / (Number(dbItem.quantity) || 1);
        }
      }

      // Normalisasi WBS 4 (Pengecatan <-> Cat/Finishing)
      const rawCat = dbItem.wbs_category || 'Pembongkaran';
      const normalizedCategory = (rawCat === 'Pengecatan' || rawCat.toLowerCase().includes('cat'))
        ? 'Cat/Finishing'
        : rawCat;

      return {
        id: dbItem.id,
        wbsCategory: normalizedCategory,
        type,
        description: dbItem.material_name || dbItem.description || '',
        qty,
        unit: dbItem.unit || (type === 'labor' ? 'lot' : type === 'overhead' ? 'hari' : 'pcs'),
        notes: dbItem.notes || (type === 'labor' && dbItem.description && dbItem.description !== dbItem.material_name ? dbItem.description : undefined),
        unitPrice,
        costPrice,
        subtotal: Number(dbItem.subtotal) || (qty * unitPrice),
        isLocked: Boolean(dbItem.is_locked),
        packageId: dbItem.package_id || undefined,
        materialId: dbItem.material_id || undefined
      };
    });

    return {
      estimation: estData as RabEstimationSummary | null,
      spk: spkData as unknown as RabSpkDetails | null,
      items
    };
  }

  /**
   * Menyimpan rincian item ke rab_items secara langsung (persistensi permanen).
   * Memastikan kolom tidak valid (seperti waste_factor) tidak dikirimkan.
   */
  async insertRabItems(
    spkId: string,
    itemsToInsert: Array<{
      wbsCategory: string;
      type: 'material' | 'labor' | 'overhead';
      description: string;
      qty: number;
      unit?: string;
      unitPrice: number;
      costPrice?: number;
      notes?: string;
      materialId?: string;
      packageId?: string;
    }>
  ): Promise<RabItem[]> {
    if (!spkId || itemsToInsert.length === 0) return [];
    const estimationId = await this.ensureRabEstimation(spkId);

    const rows = itemsToInsert.map(item => {
      const itemType = (item.type ? item.type.toUpperCase() : 'MATERIAL') as 'MATERIAL' | 'LABOR' | 'OVERHEAD';
      const unitPrice = Number(item.unitPrice) || 0;
      const costPrice = item.costPrice !== undefined
        ? Number(item.costPrice)
        : (itemType === 'LABOR' || itemType === 'OVERHEAD' ? unitPrice : Math.round(unitPrice * 0.8));
      const qty = Number(item.qty) || 0;
      const itemTotal = Math.round(qty * unitPrice);

      const rawCat = item.wbsCategory || 'Pembongkaran';
      const normalizedCategory = (rawCat === 'Pengecatan' || rawCat.toLowerCase().includes('cat'))
        ? 'Cat/Finishing'
        : rawCat;

      return {
        rab_estimation_id: estimationId,
        spk_id: spkId,
        wbs_category: normalizedCategory,
        item_type: itemType,
        material_name: item.description,
        description: item.notes || item.description,
        quantity: qty,
        unit: item.unit || (itemType === 'LABOR' ? 'lot' : itemType === 'OVERHEAD' ? 'hari' : 'pcs'),
        notes: item.notes || null,
        unit_price: unitPrice,
        cost_price: costPrice,
        labor_hours: itemType === 'LABOR' ? qty : 0,
        labor_rate: itemType === 'LABOR' ? unitPrice : 0,
        overhead_hours: itemType === 'OVERHEAD' ? qty * 8 : 0,
        overhead_rate: itemType === 'OVERHEAD' ? (unitPrice / 8) : 0,
        item_total: itemTotal,
        subtotal: itemTotal,
        package_id: item.packageId || null,
        material_id: itemType === 'MATERIAL' && item.materialId ? item.materialId : null,
        is_locked: false
      };
    });

    const { data: inserted, error } = await supabase
      .from('rab_items')
      .insert(rows)
      .select();

    if (error) {
      console.error('Error inserting rab_items in RabService:', error);
      throw error;
    }

    // Sinkronkan akumulasi pagu secara otomatis
    await this.syncRabTotals(spkId, estimationId);

    return (inserted || []).map((dbItem: DbRabItemRecord) => ({
      id: dbItem.id,
      wbsCategory: dbItem.wbs_category,
      type: (dbItem.item_type || 'material').toLowerCase() as 'material' | 'labor' | 'overhead',
      description: dbItem.material_name || dbItem.description || '',
      qty: Number(dbItem.quantity),
      unit: dbItem.unit || undefined,
      notes: dbItem.notes || undefined,
      unitPrice: Number(dbItem.unit_price),
      costPrice: Number(dbItem.cost_price),
      subtotal: Number(dbItem.subtotal) || (Number(dbItem.quantity) * Number(dbItem.unit_price)),
      isLocked: Boolean(dbItem.is_locked),
      packageId: dbItem.package_id || undefined,
      materialId: dbItem.material_id || undefined
    }));
  }

  /**
   * Menghapus 1 baris item RAB secara permanen
   */
  async deleteRabItem(spkId: string, itemId: string): Promise<void> {
    const estimationId = await this.ensureRabEstimation(spkId);
    const { error } = await supabase
      .from('rab_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting rab_item:', error);
      throw error;
    }

    await this.syncRabTotals(spkId, estimationId);
  }

  /**
   * Menghapus seluruh item dari paket tertentu (digunakan saat re-alokasi paket)
   */
  async deletePackageRabItems(spkId: string, packageId: string): Promise<void> {
    const estimationId = await this.ensureRabEstimation(spkId);
    const { error } = await supabase
      .from('rab_items')
      .delete()
      .eq('rab_estimation_id', estimationId)
      .eq('package_id', packageId);

    if (error) {
      console.error('Error deleting package rab_items:', error);
      throw error;
    }

    await this.syncRabTotals(spkId, estimationId);
  }

  /**
   * Menyinkronkan ulang total kalkulasi RAB ke tabel rab_estimations dan spk
   */
  async syncRabTotals(spkId: string, estimationId?: string): Promise<{
    material: number;
    labor: number;
    overhead: number;
    grandTotal: number;
  }> {
    const estId = estimationId || await this.ensureRabEstimation(spkId);

    const { data: items, error } = await supabase
      .from('rab_items')
      .select('item_type, item_total, quantity, unit_price')
      .eq('rab_estimation_id', estId);

    if (error) {
      console.error('Error querying items for syncRabTotals:', error);
      throw error;
    }

    let totalMaterial = 0;
    let totalLabor = 0;
    let totalOverhead = 0;

    (items || []).forEach(row => {
      const val = Number(
        row.item_total !== null && row.item_total !== undefined 
          ? row.item_total 
          : (Number(row.quantity || 0) * Number(row.unit_price || 0))
      );
      const type = (row.item_type || 'MATERIAL').toUpperCase();
      if (type === 'LABOR') {
        totalLabor += val;
      } else if (type === 'OVERHEAD') {
        totalOverhead += val;
      } else {
        totalMaterial += val;
      }
    });

    const grandTotal = totalMaterial + totalLabor + totalOverhead;

    await supabase
      .from('rab_estimations')
      .update({
        total_material_cost: totalMaterial,
        total_labor_cost: totalLabor,
        total_overhead_cost: totalOverhead,
        total_estimated_cost: grandTotal
      })
      .eq('id', estId);

    await supabase
      .from('spk')
      .update({
        total_estimated_cost: grandTotal
      })
      .eq('id', spkId);

    return { material: totalMaterial, labor: totalLabor, overhead: totalOverhead, grandTotal };
  }

  /**
   * Simpan snapshot lengkap RAB (bulk upsert / replace)
   */
  async saveFullRabEstimation(
    spkId: string,
    items: RabItem[],
    allocationStatus?: string
  ): Promise<void> {
    const estimationId = await this.ensureRabEstimation(spkId);

    // Hapus item lama yang ada di estimasi ini
    const { error: delError } = await supabase
      .from('rab_items')
      .delete()
      .eq('rab_estimation_id', estimationId);

    if (delError) {
      console.error('Error removing old rab_items:', delError);
      throw delError;
    }

    if (items.length > 0) {
      const rows = items.map(item => {
        const itemType = (item.type ? item.type.toUpperCase() : 'MATERIAL') as 'MATERIAL' | 'LABOR' | 'OVERHEAD';
        const unitPrice = Number(item.unitPrice) || 0;
        const costPrice = item.costPrice !== undefined
          ? Number(item.costPrice)
          : (itemType === 'LABOR' || itemType === 'OVERHEAD' ? unitPrice : Math.round(unitPrice * 0.8));
        const qty = Number(item.qty) || 0;
        const itemTotal = Math.round(qty * unitPrice);

        const rawCat = item.wbsCategory || 'Pembongkaran';
        const normalizedCategory = (rawCat === 'Pengecatan' || rawCat.toLowerCase().includes('cat'))
          ? 'Cat/Finishing'
          : rawCat;

        return {
          rab_estimation_id: estimationId,
          spk_id: spkId,
          wbs_category: normalizedCategory,
          item_type: itemType,
          material_name: item.description,
          description: item.notes || item.description,
          quantity: qty,
          unit: item.unit || (itemType === 'LABOR' ? 'lot' : itemType === 'OVERHEAD' ? 'hari' : 'pcs'),
          notes: item.notes || null,
          unit_price: unitPrice,
          cost_price: costPrice,
          labor_hours: itemType === 'LABOR' ? qty : 0,
          labor_rate: itemType === 'LABOR' ? unitPrice : 0,
          overhead_hours: itemType === 'OVERHEAD' ? qty * 8 : 0,
          overhead_rate: itemType === 'OVERHEAD' ? (unitPrice / 8) : 0,
          item_total: itemTotal,
          subtotal: itemTotal,
          package_id: item.packageId || null,
          material_id: itemType === 'MATERIAL' && item.materialId ? item.materialId : null,
          is_locked: false
        };
      });

      const { error: insError } = await supabase
        .from('rab_items')
        .insert(rows);

      if (insError) {
        console.error('Error inserting rab_items in saveFullRabEstimation:', insError);
        throw insError;
      }
    }

    await this.syncRabTotals(spkId, estimationId);

    if (allocationStatus) {
      await supabase
        .from('spk')
        .update({ allocation_status: allocationStatus })
        .eq('id', spkId);
    }
  }
}

export const rabService = new RabService();
