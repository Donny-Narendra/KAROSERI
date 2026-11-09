import { supabase } from '../lib/supabaseClient';
import { cleanPackageName } from '../utils/sourceOrigin';

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
  is_test?: boolean;
  is_hidden?: boolean;
  hidden_at?: string | null;
  hidden_by?: string | null;
  hidden_reason?: string | null;
  [key: string]: any;
  rab_estimations?: any[];
  rab_items?: any[];
  inventory_transactions?: any[];
  material_issues?: any[];
  spk_amendments?: any[];
  change_orders?: any[];
  spk_borongan?: any[];
  spk_overhead_logs?: any[];
  financials: SpkFinancialMetrics;
  total_hpp: number;
  total_cogs?: number;
  initial_cogs?: number;
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
export function calculateSpkFinancialMetrics(spk: any, packagesCatalog?: any[]): SpkFinancialMetrics {
  // 1. Total HPP (Modal = RAB Cost + CO Cost)
  let rabHpp = 0;
  const rabItems = Array.isArray(spk?.rab_items) ? spk.rab_items : [];

  if (rabItems.length > 0) {
    rabHpp = rabItems.reduce((sum: number, item: any) => {
      const q = Number(item.quantity ?? item.labor_hours ?? (item.overhead_hours ? Number(item.overhead_hours) / 8 : 1)) || 1;
      let c = Number(item.cost_price || 0);
      if (item.effective_cost !== undefined && item.effective_cost !== null) {
        c = Number(item.effective_cost);
      } else if (item.item_type === 'MATERIAL') {
        const matCost = Number(item.materials?.cost_price || item.material?.cost_price || 0);
        if (matCost > c) c = matCost;
      }
      return sum + (q * c);
    }, 0);
  } else {
    rabHpp = Number(
      spk?.total_cogs ||
      spk?.total_estimated_cost || 
      spk?.rab_estimations?.[0]?.total_estimated_cost || 
      0
    );
  }

  // Ambil change orders jika ada, fallback ke spk_amendments
  const coSource = Array.isArray(spk?.change_orders) && spk.change_orders.length > 0
    ? spk.change_orders
    : (Array.isArray(spk?.spk_amendments) ? spk.spk_amendments : []);

  const approvedCos = coSource.filter(
    (co: any) => co && (co.status === 'APPROVED' || String(co.status).toUpperCase() === 'APPROVED')
  );

  const coHpp = approvedCos.reduce((sum: number, co: any) => {
    const coItems = Array.isArray(co.change_order_items)
      ? co.change_order_items
      : (Array.isArray(co.items) ? co.items : []);

    if (coItems.length > 0) {
      const itemsHpp = coItems.reduce((itemSum: number, item: any) => {
        const q = Number(item.quantity || 1);
        let c = Number(item.cost_price || 0);
        if (item.effective_cost !== undefined && item.effective_cost !== null) {
          c = Number(item.effective_cost);
        } else if (item.item_type === 'MATERIAL') {
          const matCost = Number(item.materials?.cost_price || item.material?.cost_price || 0);
          if (matCost > c) c = matCost;
        }
        return itemSum + (q * c);
      }, 0);
      return sum + itemsHpp;
    }
    const cost = Number(co.total_cost || co.cost_amount || co.cost_adjustment || 0);
    return sum + (isNaN(cost) ? 0 : cost);
  }, 0);

  const totalHpp = (spk?.total_cogs !== undefined && spk?.total_cogs !== null && !isNaN(Number(spk.total_cogs)) && Number(spk.total_cogs) > 0)
    ? Number(spk.total_cogs)
    : (rabHpp + coHpp);

  // 2. Total Tagihan (Revenue = Quotation/Kontrak Awal + CO Selling Price)
  let sellingPriceAwal = 0;
  if (rabItems.length > 0) {
    const uniquePackages = new Map<string, number>();
    let nonPackageAmount = 0;

    rabItems.forEach((item: any) => {
      const pkgId = item.package_id || item.package_source_id;
      const pkgName = item.package_name || item.product_packages?.name;
      const pkgKey = pkgId || (pkgName ? cleanPackageName(pkgName) : null);

      if (pkgKey) {
        let pkgSellingPrice = Number(item.product_packages?.selling_price || 0);
        if (!pkgSellingPrice && packagesCatalog) {
          const matched = packagesCatalog.find((p: any) => 
            (pkgId && p.id === pkgId) || 
            (pkgName && p.name === pkgName) || 
            (pkgName && cleanPackageName(p.name) === cleanPackageName(pkgName))
          );
          if (matched) pkgSellingPrice = Number(matched.selling_price || 0);
        }
        if (pkgSellingPrice > 0) {
          uniquePackages.set(pkgKey, pkgSellingPrice);
        } else {
          // Fallback: If package has no bundle-level selling price (or package not cataloged),
          // preserve granular item pricing instead of dropping the item
          const q = Number(item.quantity ?? item.labor_hours ?? (item.overhead_hours ? Number(item.overhead_hours) / 8 : 1)) || 1;
          const u = Number(item.unit_price || 0);
          const sub = Number(item.subtotal ?? item.item_total ?? (q * u));
          nonPackageAmount += isNaN(sub) ? 0 : sub;
        }
      } else {
        const q = Number(item.quantity ?? item.labor_hours ?? (item.overhead_hours ? Number(item.overhead_hours) / 8 : 1)) || 1;
        const u = Number(item.unit_price || 0);
        const sub = Number(item.subtotal ?? item.item_total ?? (q * u));
        nonPackageAmount += isNaN(sub) ? 0 : sub;
      }
    });

    let packageSellingTotal = 0;
    uniquePackages.forEach((price) => {
      packageSellingTotal += price;
    });

    sellingPriceAwal = packageSellingTotal + nonPackageAmount;
  }

  // Fallback if no rab_items or calculated 0
  if (sellingPriceAwal === 0) {
    sellingPriceAwal = Number(
      spk?.total_selling_price || 
      spk?.final_bill_amount || 
      spk?.invoices?.[0]?.total_amount || 
      (rabHpp > 0 ? rabHpp * 1.25 : 0)
    );
  }

  const coRevenue = approvedCos.reduce((sum: number, co: any) => {
    const revenue = Number(co.total_amount ?? co.selling_price ?? co.cost_adjustment ?? 0);
    return sum + (isNaN(revenue) ? 0 : revenue);
  }, 0);

  let totalTagihan = sellingPriceAwal + coRevenue;
  // If close to nearest thousand (within 10 rupiah due to integer division rounding in component exploded prices)
  if (totalTagihan > 0 && Math.abs(totalTagihan - Math.round(totalTagihan / 1000) * 1000) <= 10) {
    totalTagihan = Math.round(totalTagihan / 1000) * 1000;
  }

  const explicitRevenue = Number(spk?.total_revenue ?? spk?.total_tagihan ?? 0);
  if (explicitRevenue > 0) {
    totalTagihan = explicitRevenue;
  }

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
  async fetchOwnerDashboardSpks(options?: { showHidden?: boolean }): Promise<DashboardSpkItem[]> {
    let spkRows: any[] = [];
    let packagesList: any[] = [];

    try {
      const { data: pkgs } = await supabase
        .from('product_packages')
        .select('id, name, selling_price');
      if (pkgs) packagesList = pkgs;
    } catch (pkgErr) {
      console.warn('Could not fetch product_packages in dashboardService:', pkgErr);
    }

    // Coba query komprehensif relasi terlebih dahulu
    let query = supabase.from('spk').select(`
      *,
      cancelled_by_profile:profiles!cancelled_by ( id, full_name, role ),
      rab_estimations ( id, total_estimated_cost, total_labor_cost, total_overhead_cost ),
      rab_items (
        id,
        spk_id,
        material_id,
        package_id,
        package_name,
        item_type,
        quantity,
        cost_price,
        unit_price,
        subtotal,
        item_total,
        materials:material_id ( id, name, cost_price, unit_price ),
        product_packages:package_id ( id, name, selling_price )
      ),
      inventory_transactions ( quantity_issued, custom_unit_price, materials ( unit_price, is_customer_supplied ) ),
      material_issues ( id, quantity, unit_price, total_cost, wbs_stage, material_id ),
      spk_amendments ( id, description, cost_adjustment, status, created_at, spk_id ),
      change_orders (
        id,
        co_number,
        total_amount,
        cost_adjustment,
        status,
        change_order_items ( id, quantity, cost_price, unit_price, subtotal, package_name, package_source_id )
      ),
      spk_borongan ( id, contract_value, total_amount, status ),
      spk_overhead_logs ( id, total_amount, frequency_qty, rate_per_unit ),
      invoices ( id, status, total_amount, dp_amount )
    `);

    if (!options?.showHidden) {
      if (typeof (query as any).eq === 'function') {
        query = (query as any).eq('is_hidden', false);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('Comprehensive SPK fetch encountered issue, falling back to progressive query:', error.message);
      let fallbackQuery = supabase.from('spk').select(`
        *,
        cancelled_by_profile:profiles!cancelled_by ( id, full_name, role ),
        rab_estimations ( id, total_estimated_cost, total_labor_cost, total_overhead_cost ),
        inventory_transactions ( quantity_issued, custom_unit_price, materials ( unit_price, is_customer_supplied ) ),
        spk_amendments ( id, description, cost_adjustment, status, created_at, spk_id )
      `);

      if (!options?.showHidden) {
        if (typeof (fallbackQuery as any).eq === 'function') {
          fallbackQuery = (fallbackQuery as any).eq('is_hidden', false);
        }
      }

      const fallbackRes = await fallbackQuery.order('created_at', { ascending: false });

      if (fallbackRes.error) {
        console.error('Fatal error fetching SPKs:', fallbackRes.error);
        throw fallbackRes.error;
      }
      spkRows = fallbackRes.data || [];

      // Pengayaan data paralel untuk relasi opsional
      try {
        const spkIds = spkRows.map(s => s.id).filter(Boolean);
        if (spkIds.length > 0) {
          const [rabItemsRes, coRes, borongRes, ohlRes, matIssuesRes, invRes] = await Promise.allSettled([
            supabase.from('rab_items').select('*, product_packages:package_id ( id, name, selling_price )').in('spk_id', spkIds),
            supabase.from('change_orders').select('*, change_order_items (*)').in('spk_id', spkIds),
            supabase.from('spk_borongan').select('*').in('spk_id', spkIds),
            supabase.from('spk_overhead_logs').select('*').in('spk_id', spkIds),
            supabase.from('material_issues').select('*').in('spk_id', spkIds),
            supabase.from('invoices').select('id, spk_id, status, total_amount, dp_amount').in('spk_id', spkIds),
          ]);

          const rabItemsMap: Record<string, any[]> = {};
          if (rabItemsRes.status === 'fulfilled' && rabItemsRes.value.data) {
            rabItemsRes.value.data.forEach((item: any) => {
              if (!rabItemsMap[item.spk_id]) rabItemsMap[item.spk_id] = [];
              rabItemsMap[item.spk_id].push(item);
            });
          }

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

          const matIssuesMap: Record<string, any[]> = {};
          if (matIssuesRes.status === 'fulfilled' && matIssuesRes.value.data) {
            matIssuesRes.value.data.forEach((mi: any) => {
              if (!matIssuesMap[mi.spk_id]) matIssuesMap[mi.spk_id] = [];
              matIssuesMap[mi.spk_id].push(mi);
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
            rab_items: rabItemsMap[s.id] || s.rab_items || [],
            change_orders: coMap[s.id] || s.change_orders || [],
            spk_borongan: borongMap[s.id] || s.spk_borongan || [],
            spk_overhead_logs: ohlMap[s.id] || s.spk_overhead_logs || [],
            material_issues: matIssuesMap[s.id] || s.material_issues || [],
            invoices: invMap[s.id] || s.invoices || [],
          }));
        }
      } catch (enrichErr) {
        console.warn('Optional financial table enrichment error:', enrichErr);
      }
    } else {
      spkRows = data || [];
    }

    // Query view_spk_job_profitability to synchronize dynamic actual COGS
    const profitabilityMap = new Map<string, any>();
    try {
      const { data: profData } = await supabase
        .from('view_spk_job_profitability')
        .select('*');
      if (profData) {
        profData.forEach((p: any) => {
          if (p.spk_id) profitabilityMap.set(p.spk_id, p);
          if (p.spk_number) profitabilityMap.set(p.spk_number, p);
        });
      }
    } catch (profErr) {
      console.warn('Could not query view_spk_job_profitability in dashboardService:', profErr);
    }

    return spkRows.map(spk => {
      const prof = profitabilityMap.get(spk.id) || profitabilityMap.get(spk.spk_no) || profitabilityMap.get(spk.spk_number);
      const totalCogs = prof?.total_cogs !== undefined && prof?.total_cogs !== null 
        ? Number(prof.total_cogs)
        : (spk.total_cogs !== undefined && spk.total_cogs !== null ? Number(spk.total_cogs) : undefined);
      const initialCogs = prof?.initial_cogs !== undefined && prof?.initial_cogs !== null
        ? Number(prof.initial_cogs)
        : (spk.initial_cogs !== undefined && spk.initial_cogs !== null ? Number(spk.initial_cogs) : Number(spk.total_estimated_cost || 0));
      const totalRevenue = prof?.total_revenue !== undefined && prof?.total_revenue !== null
        ? Number(prof.total_revenue)
        : (spk.total_tagihan !== undefined && spk.total_tagihan !== null ? Number(spk.total_tagihan) : undefined);

      const enrichedSpk = {
        ...spk,
        ...(totalCogs !== undefined ? { total_cogs: totalCogs } : {}),
        ...(totalRevenue !== undefined ? { total_revenue: totalRevenue, total_tagihan: totalRevenue } : {}),
        initial_cogs: initialCogs,
      };

      const financials = calculateSpkFinancialMetrics(enrichedSpk, packagesList);
      const invoice = Array.isArray(spk.invoices) && spk.invoices.length > 0 ? spk.invoices[0] : null;
      const paymentStatus = spk.payment_status || (invoice?.status === 'LUNAS' ? 'PAID' : (invoice?.status || 'UNPAID'));
      const dpAmount = Number(spk.dp_amount !== undefined && spk.dp_amount !== null ? spk.dp_amount : (invoice?.dp_amount || 0));

      const finalTotalHpp = totalCogs ?? financials.totalHpp;
      const finalTotalTagihan = totalRevenue ?? financials.totalTagihan;

      return {
        ...spk,
        payment_status: paymentStatus,
        dp_amount: dpAmount,
        financials: {
          ...financials,
          totalHpp: finalTotalHpp,
          totalTagihan: finalTotalTagihan,
        },
        total_cogs: finalTotalHpp,
        initial_cogs: initialCogs || financials.rabHpp,
        total_hpp: finalTotalHpp,
        total_tagihan: finalTotalTagihan,
        total_realisasi_aktual: financials.totalRealisasiAktual,
        is_overbudget: financials.isOverbudget || spk.is_overbudget === true,
      };
    });
  },

  /**
   * Alias fetchActiveSpkMonitoring for owner dashboard monitoring
   */
  async fetchActiveSpkMonitoring(options?: { showHidden?: boolean }): Promise<DashboardSpkItem[]> {
    return this.fetchOwnerDashboardSpks(options);
  },
};

