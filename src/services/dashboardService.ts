import { supabase } from '../lib/supabaseClient';

export interface SpkFinancialMetrics {
  rabHpp: number;
  coHpp: number;
  totalHpp: number;
  sellingPriceAwal: number;
  coRevenue: number;
  totalTagihan: number;
  materialIssuedCost: number;
  laborActualCost: number;
  fohActualCost: number;
  totalRealisasiAktual: number;
  varianceAmount: number; // totalHpp - totalRealisasiAktual (positive = underbudget, negative = overbudget)
  variancePercentage: number; // ((totalRealisasiAktual - totalHpp) / totalHpp) * 100
  isOverbudget: boolean;
}

export interface DashboardSpkItem {
  id: string;
  spk_no: string;
  customer_name: string;
  customer_phone?: string | null;
  vehicle_plate?: string | null;
  vehicle_model?: string | null;
  vehicle_vin?: string | null;
  vehicle_engine?: string | null;
  status: string;
  qc_status?: string | null;
  wbs_status?: string | null;
  is_overbudget?: boolean | null;
  material_gate_status?: string | null;
  total_estimated_cost?: number | string | null;
  total_selling_price?: number | string | null;
  final_bill_amount?: number | string | null;
  created_at: string;
  updated_at?: string | null;
  notes?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  cancelled_by_profile?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
  [key: string]: any;
  rab_estimations?: any[];
  inventory_transactions?: any[];
  material_issues?: any[];
  spk_amendments?: any[];
  change_orders?: any[];
  spk_borongan?: any[];
  spk_overhead_logs?: any[];
  financials: SpkFinancialMetrics;
  total_hpp: number;
  total_tagihan: number;
  total_realisasi_aktual: number;
}

/**
 * Menghitung metrik finansial komprehensif per SPK:
 * 1. Total HPP (Modal = RAB Cost + CO Cost)
 * 2. Total Tagihan (Revenue = Nilai Kontrak Awal + CO Selling Price)
 * 3. Realisasi Biaya Aktual (Material Approved + Borongan Labor + Overhead FOH)
 * 4. Indikator Varian & Overbudget Real-time
 */
export function calculateSpkFinancialMetrics(spk: any): SpkFinancialMetrics {
  // 1. Total HPP (Modal = RAB Cost + CO Cost)
  const rabHpp = Number(
    spk?.total_estimated_cost || 
    spk?.rab_estimations?.[0]?.total_estimated_cost || 
    0
  );

  // Ambil change orders jika ada, fallback ke spk_amendments
  const coSource = Array.isArray(spk?.change_orders) && spk.change_orders.length > 0
    ? spk.change_orders
    : (Array.isArray(spk?.spk_amendments) ? spk.spk_amendments : []);

  const coHpp = coSource
    .filter((co: any) => co && (co.status === 'APPROVED' || String(co.status).toUpperCase() === 'APPROVED'))
    .reduce((sum: number, co: any) => {
      const cost = Number(co.total_cost || co.cost_amount || co.cost_adjustment || 0);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);

  const totalHpp = rabHpp + coHpp;

  // 2. Total Tagihan (Revenue = Quotation/Kontrak Awal + CO Selling Price)
  const sellingPriceAwal = Number(
    spk?.total_selling_price || 
    spk?.final_bill_amount || 
    spk?.invoices?.[0]?.total_amount || 
    (rabHpp > 0 ? rabHpp * 1.25 : 0)
  );

  const coRevenue = coSource
    .filter((co: any) => co && (co.status === 'APPROVED' || String(co.status).toUpperCase() === 'APPROVED'))
    .reduce((sum: number, co: any) => {
      const revenue = Number(co.total_amount || co.selling_price || 0);
      return sum + (isNaN(revenue) ? 0 : revenue);
    }, 0);

  const totalTagihan = sellingPriceAwal + coRevenue;

  // 3. Realisasi Biaya Aktual (Material Approved + Borongan Labor + Overhead FOH)
  let materialIssuedCost = 0;
  if (Array.isArray(spk?.material_issues) && spk.material_issues.length > 0) {
    materialIssuedCost = spk.material_issues.reduce((sum: number, issue: any) => {
      if (!issue) return sum;
      const explicitTotal = Number(issue.total_cost);
      if (!isNaN(explicitTotal) && explicitTotal > 0) return sum + explicitTotal;
      const qty = Number(issue.quantity || 0);
      const price = Number(issue.unit_price || 0);
      return sum + (qty * price);
    }, 0);
  } else if (Array.isArray(spk?.inventory_transactions) && spk.inventory_transactions.length > 0) {
    materialIssuedCost = spk.inventory_transactions.reduce((acc: number, curr: any) => {
      if (!curr) return acc;
      if (curr.materials?.is_customer_supplied === true) return acc;
      const price = curr.custom_unit_price !== null && curr.custom_unit_price !== undefined
        ? Number(curr.custom_unit_price)
        : Number(curr.materials?.unit_price || 0);
      const qty = Number(curr.quantity_issued || 0);
      return acc + (qty * (isNaN(price) ? 0 : price));
    }, 0);
  }

  const laborActualCost = (Array.isArray(spk?.spk_borongan) ? spk.spk_borongan : [])
    .filter((b: any) => b && b.status !== 'CANCELLED' && b.status !== 'CUT_OFF')
    .reduce((sum: number, b: any) => {
      const val = Number(b.contract_value !== undefined && b.contract_value !== null ? b.contract_value : b.total_amount || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

  const fohActualCost = (Array.isArray(spk?.spk_overhead_logs) ? spk.spk_overhead_logs : [])
    .reduce((sum: number, foh: any) => {
      if (!foh) return sum;
      const explicitTotal = Number(foh.total_amount);
      if (!isNaN(explicitTotal) && explicitTotal > 0) return sum + explicitTotal;
      const qty = Number(foh.frequency_qty || 0);
      const rate = Number(foh.rate_per_unit || 0);
      return sum + (qty * rate);
    }, 0);

  const totalRealisasiAktual = materialIssuedCost + laborActualCost + fohActualCost;

  // 4. Varian & Overbudget Status
  const varianceAmount = totalHpp - totalRealisasiAktual;
  const variancePercentage = totalHpp > 0 ? ((totalRealisasiAktual - totalHpp) / totalHpp) * 100 : 0;
  const isOverbudget = totalHpp > 0 ? (totalRealisasiAktual > totalHpp) : (spk?.is_overbudget === true);

  return {
    rabHpp,
    coHpp,
    totalHpp,
    sellingPriceAwal,
    coRevenue,
    totalTagihan,
    materialIssuedCost,
    laborActualCost,
    fohActualCost,
    totalRealisasiAktual,
    varianceAmount,
    variancePercentage,
    isOverbudget,
  };
}

export const dashboardService = {
  /**
   * Menghitung metrik finansial SPK
   */
  calculateSpkFinancialMetrics,

  /**
   * Mengambil daftar SPK untuk Owner Dashboard beserta agregasi metrik finansial lengkap
   */
  async fetchOwnerDashboardSpks(): Promise<DashboardSpkItem[]> {
    let spkRows: any[] = [];

    // Coba query komprehensif relasi terlebih dahulu
    const { data, error } = await supabase.from('spk').select(`
      *,
      cancelled_by_profile:profiles!cancelled_by ( id, full_name, role ),
      rab_estimations ( total_estimated_cost, total_labor_cost, total_overhead_cost ),
      inventory_transactions ( quantity_issued, custom_unit_price, materials ( unit_price, is_customer_supplied ) ),
      spk_amendments ( id, description, cost_adjustment, status, created_at, spk_id ),
      change_orders ( id, co_number, total_amount, cost_adjustment, status ),
      spk_borongan ( id, contract_value, total_amount, status ),
      spk_overhead_logs ( id, total_amount, frequency_qty, rate_per_unit ),
      invoices ( id, status, total_amount, dp_amount )
    `).order('created_at', { ascending: false });

    if (error) {
      console.warn('Comprehensive SPK fetch encountered issue, falling back to progressive query:', error.message);
      const fallbackRes = await supabase.from('spk').select(`
        *,
        cancelled_by_profile:profiles!cancelled_by ( id, full_name, role ),
        rab_estimations ( total_estimated_cost, total_labor_cost, total_overhead_cost ),
        inventory_transactions ( quantity_issued, custom_unit_price, materials ( unit_price, is_customer_supplied ) ),
        spk_amendments ( id, description, cost_adjustment, status, created_at, spk_id )
      `).order('created_at', { ascending: false });

      if (fallbackRes.error) {
        console.error('Fatal error fetching SPKs:', fallbackRes.error);
        throw fallbackRes.error;
      }
      spkRows = fallbackRes.data || [];

      // Pengayaan data paralel untuk relasi opsional
      try {
        const spkIds = spkRows.map(s => s.id).filter(Boolean);
        if (spkIds.length > 0) {
          const [coRes, borongRes, ohlRes, invRes] = await Promise.allSettled([
            supabase.from('change_orders').select('*').in('spk_id', spkIds),
            supabase.from('spk_borongan').select('*').in('spk_id', spkIds),
            supabase.from('spk_overhead_logs').select('*').in('spk_id', spkIds),
            supabase.from('invoices').select('id, spk_id, status, total_amount, dp_amount').in('spk_id', spkIds),
          ]);

          const coMap: Record<string, any[]> = {};
          if (coRes.status === 'fulfilled' && coRes.value.data) {
            coRes.value.data.forEach((co: any) => {
              if (!coMap[co.spk_id]) coMap[co.spk_id] = [];
              coMap[co.spk_id].push(co);
            });
          }

          const borongMap: Record<string, any[]> = {};
          if (borongRes.status === 'fulfilled' && borongRes.value.data) {
            borongRes.value.data.forEach((b: any) => {
              if (!borongMap[b.spk_id]) borongMap[b.spk_id] = [];
              borongMap[b.spk_id].push(b);
            });
          }

          const ohlMap: Record<string, any[]> = {};
          if (ohlRes.status === 'fulfilled' && ohlRes.value.data) {
            ohlRes.value.data.forEach((f: any) => {
              if (!ohlMap[f.spk_id]) ohlMap[f.spk_id] = [];
              ohlMap[f.spk_id].push(f);
            });
          }

          const invMap: Record<string, any[]> = {};
          if (invRes.status === 'fulfilled' && invRes.value.data) {
            invRes.value.data.forEach((inv: any) => {
              if (!invMap[inv.spk_id]) invMap[inv.spk_id] = [];
              invMap[inv.spk_id].push(inv);
            });
          }

          spkRows = spkRows.map(s => ({
            ...s,
            change_orders: coMap[s.id] || s.change_orders || [],
            spk_borongan: borongMap[s.id] || s.spk_borongan || [],
            spk_overhead_logs: ohlMap[s.id] || s.spk_overhead_logs || [],
            invoices: invMap[s.id] || s.invoices || [],
          }));
        }
      } catch (enrichErr) {
        console.warn('Optional financial table enrichment error:', enrichErr);
      }
    } else {
      spkRows = data || [];
    }

    return spkRows.map(spk => {
      const financials = calculateSpkFinancialMetrics(spk);
      const invoice = Array.isArray(spk.invoices) && spk.invoices.length > 0 ? spk.invoices[0] : null;
      const paymentStatus = spk.payment_status || (invoice?.status === 'LUNAS' ? 'PAID' : (invoice?.status || 'UNPAID'));
      const dpAmount = Number(spk.dp_amount !== undefined && spk.dp_amount !== null ? spk.dp_amount : (invoice?.dp_amount || 0));

      return {
        ...spk,
        payment_status: paymentStatus,
        dp_amount: dpAmount,
        financials,
        total_hpp: financials.totalHpp,
        total_tagihan: financials.totalTagihan,
        total_realisasi_aktual: financials.totalRealisasiAktual,
        is_overbudget: financials.isOverbudget || spk.is_overbudget === true,
      };
    });
  },
};
