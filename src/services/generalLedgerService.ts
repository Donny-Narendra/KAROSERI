import { supabase } from '../lib/supabaseClient';

export interface InitialBalanceRecord {
  id: string;
  cash_bank: number;
  inventory_value: number;
  equipment_value: number;
  supplies_value: number;
  payables: number;
  initial_equity: number;
  is_locked: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SaveInitialBalancePayload {
  cash_bank: number;
  inventory_value: number;
  equipment_value: number;
  supplies_value: number;
  payables: number;
  is_locked?: boolean;
}

export type CashTransactionCategory =
  | 'EQUIPMENT_PURCHASE'
  | 'SUPPLIES_PURCHASE'
  | 'PRIVE_WITHDRAWAL'
  | 'DEBT_RECEIVED'
  | 'DEBT_REPAYMENT'
  | 'CAPITAL_INJECTION'
  | 'OTHER_INCOME';

export interface CashLedgerTransaction {
  id: string;
  transaction_date: string;
  direction: 'IN' | 'OUT';
  category: CashTransactionCategory;
  amount: number;
  payment_method: 'TRANSFER' | 'CASH';
  description: string;
  receipt_no?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface CreateCashTransactionPayload {
  transaction_date: string;
  direction: 'IN' | 'OUT';
  category: CashTransactionCategory;
  amount: number;
  payment_method: 'TRANSFER' | 'CASH';
  description: string;
  receipt_no?: string | null;
}

export interface CashTransactionFilter {
  startDate?: string;
  endDate?: string;
  direction?: 'ALL' | 'IN' | 'OUT';
  category?: 'ALL' | CashTransactionCategory;
  searchQuery?: string;
}

export interface GeneralLedgerMetrics {
  initialBalance: InitialBalanceRecord | null;
  hasInitialBalance: boolean;

  // AKTIVA (Left Side of Model T)
  aktiva: {
    cashBank: number;
    receivables: number;
    physicalInventory: number;
    wipValue: number;
    suppliesValue: number;
    equipmentValue: number;
    totalAktiva: number;
  };

  // PASIVA (Right Side of Model T)
  pasiva: {
    payables: number;
    initialEquity: number;
    capitalInjections: number;
    totalModalLama: number;
    revenueSpk: number;
    otherIncome: number;
    totalRevenue: number;
    hppCompletedSpk: number;
    totalOpex: number;
    netProfit: number;
    prive: number;
    modalBaru: number;
    totalPasiva: number;
  };

  // Keseimbangan Akuntansi
  balanceDiff: number;
  isBalanced: boolean;

  // Ringkasan Aliran Kas
  cashSummary: {
    initialCash: number;
    totalCashInSpk: number;
    totalCashInNonSpk: number;
    totalCashOutSpk: number;
    totalCashOutOpex: number;
    totalCashOutNonSpk: number;
    totalCashIn: number;
    totalCashOut: number;
    netCashFlow: number;
    endingCash: number;
  };
}

export const generalLedgerService = {
  /**
   * Mengambil saldo awal bengkel terbaru
   */
  async getInitialBalance(): Promise<InitialBalanceRecord | null> {
    const { data, error } = await supabase
      .from('initial_balances')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Gagal memuat initial_balances (mungkin belum migrasi):', error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      cash_bank: Number(data.cash_bank || 0),
      inventory_value: Number(data.inventory_value || 0),
      equipment_value: Number(data.equipment_value || 0),
      supplies_value: Number(data.supplies_value || 0),
      payables: Number(data.payables || 0),
      initial_equity: Number(data.initial_equity || 0),
      is_locked: Boolean(data.is_locked),
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  /**
   * Menyimpan / memperbarui saldo awal bengkel
   */
  async saveInitialBalance(payload: SaveInitialBalancePayload): Promise<InitialBalanceRecord> {
    const current = await this.getInitialBalance();

    if (current && current.is_locked) {
      throw new Error('Saldo awal bengkel telah dikunci dan tidak dapat diubah kembali.');
    }

    if (current?.id) {
      const { data, error } = await supabase
        .from('initial_balances')
        .update({
          cash_bank: payload.cash_bank,
          inventory_value: payload.inventory_value,
          equipment_value: payload.equipment_value,
          supplies_value: payload.supplies_value,
          payables: payload.payables,
          is_locked: payload.is_locked ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', current.id)
        .select()
        .single();

      if (error) throw new Error(`Gagal memperbarui saldo awal: ${error.message}`);
      return {
        ...data,
        cash_bank: Number(data.cash_bank || 0),
        inventory_value: Number(data.inventory_value || 0),
        equipment_value: Number(data.equipment_value || 0),
        supplies_value: Number(data.supplies_value || 0),
        payables: Number(data.payables || 0),
        initial_equity: Number(data.initial_equity || 0),
      };
    } else {
      const { data, error } = await supabase
        .from('initial_balances')
        .insert({
          cash_bank: payload.cash_bank,
          inventory_value: payload.inventory_value,
          equipment_value: payload.equipment_value,
          supplies_value: payload.supplies_value,
          payables: payload.payables,
          is_locked: payload.is_locked ?? false,
        })
        .select()
        .single();

      if (error) throw new Error(`Gagal menyimpan saldo awal: ${error.message}`);
      return {
        ...data,
        cash_bank: Number(data.cash_bank || 0),
        inventory_value: Number(data.inventory_value || 0),
        equipment_value: Number(data.equipment_value || 0),
        supplies_value: Number(data.supplies_value || 0),
        payables: Number(data.payables || 0),
        initial_equity: Number(data.initial_equity || 0),
      };
    }
  },

  /**
   * Mengambil daftar transaksi kas masuk & kas keluar Non-SPK
   */
  async getCashTransactions(filter?: CashTransactionFilter): Promise<CashLedgerTransaction[]> {
    let query = supabase
      .from('cash_ledger_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filter?.direction && filter.direction !== 'ALL') {
      query = query.eq('direction', filter.direction);
    }
    if (filter?.category && filter.category !== 'ALL') {
      query = query.eq('category', filter.category);
    }
    if (filter?.startDate) {
      query = query.gte('transaction_date', filter.startDate);
    }
    if (filter?.endDate) {
      query = query.lte('transaction_date', filter.endDate);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Gagal memuat cash_ledger_transactions:', error.message);
      return [];
    }

    let results = (data || []).map((row: any) => ({
      id: row.id,
      transaction_date: row.transaction_date,
      direction: row.direction as 'IN' | 'OUT',
      category: row.category as CashTransactionCategory,
      amount: Number(row.amount || 0),
      payment_method: row.payment_method as 'TRANSFER' | 'CASH',
      description: row.description,
      receipt_no: row.receipt_no || null,
      created_by: row.created_by || null,
      created_at: row.created_at,
    }));

    if (filter?.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.trim().toLowerCase();
      results = results.filter(
        item =>
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.receipt_no && item.receipt_no.toLowerCase().includes(q))
      );
    }

    return results;
  },

  /**
   * Mencatat mutasi kas masuk / kas keluar Non-SPK baru
   */
  async createCashTransaction(payload: CreateCashTransactionPayload): Promise<CashLedgerTransaction> {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id || null;

    const { data, error } = await supabase
      .from('cash_ledger_transactions')
      .insert({
        transaction_date: payload.transaction_date,
        direction: payload.direction,
        category: payload.category,
        amount: payload.amount,
        payment_method: payload.payment_method,
        description: payload.description,
        receipt_no: payload.receipt_no || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Gagal mencatat transaksi kas: ${error.message}`);
    }

    return {
      id: data.id,
      transaction_date: data.transaction_date,
      direction: data.direction as 'IN' | 'OUT',
      category: data.category as CashTransactionCategory,
      amount: Number(data.amount || 0),
      payment_method: data.payment_method as 'TRANSFER' | 'CASH',
      description: data.description,
      receipt_no: data.receipt_no,
      created_by: data.created_by,
      created_at: data.created_at,
    };
  },

  /**
   * Menghapus transaksi kas non-SPK
   */
  async deleteCashTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('cash_ledger_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Gagal menghapus transaksi kas: ${error.message}`);
    }
  },

  /**
   * Mengumpulkan dan mengagregasi seluruh data Akuntansi Model T secara real-time
   */
  async getGeneralLedgerMetrics(): Promise<GeneralLedgerMetrics> {
    // 1. Ambil Saldo Awal Bengkel
    const initialBalance = await this.getInitialBalance();
    const hasInitialBalance = initialBalance !== null;

    const cashBankAwal = initialBalance ? initialBalance.cash_bank : 0;
    const inventoryAwal = initialBalance ? initialBalance.inventory_value : 0;
    const equipmentAwal = initialBalance ? initialBalance.equipment_value : 0;
    const suppliesAwal = initialBalance ? initialBalance.supplies_value : 0;
    const payablesAwal = initialBalance ? initialBalance.payables : 0;
    const initialEquity = initialBalance ? initialBalance.initial_equity : 0;

    // 2. Transaksi Kas Masuk / Keluar Non-SPK
    const cashLedgerList = await this.getCashTransactions();

    let capitalInjections = 0;
    let debtReceived = 0;
    let otherIncome = 0;
    let equipmentPurchases = 0;
    let suppliesPurchases = 0;
    let priveWithdrawals = 0;
    let debtRepayments = 0;

    for (const tx of cashLedgerList) {
      const amt = Number(tx.amount || 0);
      switch (tx.category) {
        case 'CAPITAL_INJECTION':
          capitalInjections += amt;
          break;
        case 'DEBT_RECEIVED':
          debtReceived += amt;
          break;
        case 'OTHER_INCOME':
          otherIncome += amt;
          break;
        case 'EQUIPMENT_PURCHASE':
          equipmentPurchases += amt;
          break;
        case 'SUPPLIES_PURCHASE':
          suppliesPurchases += amt;
          break;
        case 'PRIVE_WITHDRAWAL':
          priveWithdrawals += amt;
          break;
        case 'DEBT_REPAYMENT':
          debtRepayments += amt;
          break;
        default:
          break;
      }
    }

    const totalCashInNonSpk = capitalInjections + debtReceived + otherIncome;
    const totalCashOutNonSpk = equipmentPurchases + suppliesPurchases + priveWithdrawals + debtRepayments;

    // 3. Kas Masuk SPK & Revenue SPK
    // Ambil data pembayaran SPK dari tabel `payments`
    let totalCashInSpk = 0;
    try {
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, payment_type');

      if (paymentsData && paymentsData.length > 0) {
        totalCashInSpk = paymentsData.reduce((acc, p) => acc + Number(p.amount || 0), 0);
      }
    } catch (err) {
      console.warn('Gagal membaca payments:', err);
    }

    // Ambil SPK untuk revenue, DP fallback, dan status proyek
    let totalRevenueSpk = 0;
    let hppCompletedSpk = 0;
    let totalSpkDpAmount = 0;
    const completedSpkIds = new Set<string>();
    const activeSpkIds = new Set<string>();

    try {
      const { data: spkData } = await supabase
        .from('spk')
        .select(`
          id,
          spk_no,
          status,
          total_selling_price,
          total_estimated_cost,
          dp_amount,
          spk_amendments ( status, cost_adjustment )
        `)
        .neq('status', 'CANCELLED');

      if (spkData) {
        for (const spk of spkData) {
          totalSpkDpAmount += Number(spk.dp_amount || 0);

          // Hitung revenue SPK
          let rabCost = Number(spk.total_estimated_cost || 0);
          let baseSelling = Number(spk.total_selling_price || (rabCost > 0 ? rabCost * 1.25 : 0));
          
          let approvedCoRevenue = 0;
          if (Array.isArray(spk.spk_amendments)) {
            approvedCoRevenue = spk.spk_amendments
              .filter(a => a && a.status === 'APPROVED')
              .reduce((sum, a) => sum + Number(a.cost_adjustment || 0), 0);
          }

          const spkRevenue = baseSelling + approvedCoRevenue;

          if (spk.status === 'COMPLETED') {
            completedSpkIds.add(spk.id);
            totalRevenueSpk += spkRevenue;
          } else {
            activeSpkIds.add(spk.id);
          }
        }
      }
    } catch (err) {
      console.warn('Gagal membaca spk:', err);
    }

    // Defensive fallback jika payments kosong tapi ada DP di spk
    if (totalCashInSpk === 0 && totalSpkDpAmount > 0) {
      totalCashInSpk = totalSpkDpAmount;
    }

    // 4. Biaya Tenaga Kerja Borongan (Labor)
    let totalLaborPaid = 0;
    let completedLaborHpp = 0;
    try {
      const { data: boronganData } = await supabase
        .from('spk_borongan')
        .select('spk_id, contract_value, status')
        .neq('status', 'CUT_OFF');

      if (boronganData) {
        for (const b of boronganData) {
          const val = Number(b.contract_value || 0);
          totalLaborPaid += val;
          if (completedSpkIds.has(b.spk_id)) {
            completedLaborHpp += val;
          }
        }
      }
    } catch (err) {
      console.warn('Gagal membaca spk_borongan:', err);
    }

    // 5. Mutasi Material (Inventory Transactions)
    // Hitung WIP (material issued pada SPK aktif) dan Material HPP (pada SPK completed)
    let totalWipMaterial = 0;
    let completedMaterialHpp = 0;
    let totalMaterialIssuedCost = 0;

    try {
      const { data: invTxData } = await supabase
        .from('inventory_transactions')
        .select(`
          spk_id,
          quantity_issued,
          custom_unit_price,
          materials ( unit_price, is_customer_supplied )
        `);

      if (invTxData) {
        for (const tx of invTxData as any[]) {
          if (tx.materials?.is_customer_supplied === true) continue;
          const qty = Number(tx.quantity_issued || 0);
          const price = tx.custom_unit_price !== null && tx.custom_unit_price !== undefined
            ? Number(tx.custom_unit_price)
            : Number(tx.materials?.unit_price || 0);
          const cost = qty * price;

          totalMaterialIssuedCost += cost;

          if (completedSpkIds.has(tx.spk_id)) {
            completedMaterialHpp += cost;
          } else if (activeSpkIds.has(tx.spk_id)) {
            totalWipMaterial += cost;
          }
        }
      }
    } catch (err) {
      console.warn('Gagal membaca inventory_transactions:', err);
    }

    // 6. Nilai Persediaan Gudang Fisik
    // Persediaan bahan baku fisik di gudang: Saldo Awal - Total Material yang telah dikeluarkan
    let physicalInventoryValuation = 0;
    try {
      const { data: materialsData } = await supabase
        .from('materials')
        .select('id, current_stock, unit_price');

      if (materialsData && materialsData.length > 0) {
        physicalInventoryValuation = materialsData.reduce((acc, m: any) => {
          const stock = Math.max(0, Number(m.current_stock || 0));
          const price = Number(m.unit_price || 0);
          return acc + (stock * price);
        }, 0);
      }
    } catch (err) {
      console.warn('Gagal membaca materials:', err);
    }

    // Jika ada saldo awal gudang, perhitungkan mutasi pengeluaran barang (Inventory Issue)
    if (inventoryAwal > 0) {
      physicalInventoryValuation = Math.max(0, inventoryAwal - totalMaterialIssuedCost);
    }

    // 7. Total OPEX (Beban Operasional Berkala)
    let totalOpex = 0;
    try {
      const { data: opexData } = await supabase
        .from('operating_expenses')
        .select('amount');

      if (opexData) {
        totalOpex = opexData.reduce((acc, o) => acc + Number(o.amount || 0), 0);
      }
    } catch (err) {
      console.warn('Gagal membaca operating_expenses:', err);
    }

    // 8. HPP SPK Selesai (Completed Material + Completed Labor)
    hppCompletedSpk = completedMaterialHpp + completedLaborHpp;

    // 9. Piutang Usaha SPK (Outstanding Invoiced SPK)
    const receivables = Math.max(0, totalRevenueSpk - totalCashInSpk);

    // 10. Nilai Aktiva Lainnya
    const equipmentValue = equipmentAwal + equipmentPurchases;
    const suppliesValue = suppliesAwal + suppliesPurchases;
    
    // WIP (Barang Dalam Proses) = Material dikeluarkan untuk SPK aktif + Upah borongan SPK aktif
    const activeLaborCost = Math.max(0, totalLaborPaid - completedLaborHpp);
    const wipValue = totalWipMaterial + activeLaborCost;

    // 11. Arus Kas Keluar SPK
    // Kas keluar riil SPK = Pembayaran borongan kepada pekerja (Material sudah dibukukan dari aset gudang)
    const totalCashOutSpk = totalLaborPaid;
    const totalCashOutOpex = totalOpex;

    // 12. Saldo Akhir Kas & Bank
    // Ending Cash = Kas Awal + Kas In (SPK + Non-SPK) - Kas Out (SPK + OPEX + Non-SPK)
    const totalCashIn = totalCashInSpk + totalCashInNonSpk;
    const totalCashOut = totalCashOutSpk + totalCashOutOpex + totalCashOutNonSpk;
    const netCashFlow = totalCashIn - totalCashOut;
    let cashBank = cashBankAwal + netCashFlow;

    // Sisi PASIVA:
    // Hutang Usaha / Tempo
    const payables = payablesAwal + debtReceived - debtRepayments;

    // Modal Lama
    const totalModalLama = initialEquity + capitalInjections;

    // Laba Bersih = Total Revenue SPK + Other Income - HPP Proyek Selesai - Total OPEX
    const totalRevenue = totalRevenueSpk + otherIncome;
    const netProfit = totalRevenue - hppCompletedSpk - totalOpex;

    // Prive Pemilik
    const prive = priveWithdrawals;

    // Modal Baru = Modal Lama + Laba Bersih - Prive
    const modalBaru = totalModalLama + netProfit - prive;

    // Total PASIVA = Hutang + Modal Baru
    const totalPasiva = payables + modalBaru;

    // Total AKTIVA = Kas&Bank + Piutang + Persediaan + WIP + Perlengkapan + Peralatan
    // Perhatikan: Dalam double-entry model T, total aktiva harus seimbang dengan pasiva.
    // Jika ada gap pembulatan kecil atau mutasi kas tunai material, hitung totalAktiva:
    const calculatedAktiva = cashBank + receivables + physicalInventoryValuation + wipValue + suppliesValue + equipmentValue;
    
    // Keseimbangan Akuntansi
    const balanceDiff = calculatedAktiva - totalPasiva;
    const isBalanced = Math.abs(balanceDiff) < 1;

    return {
      initialBalance,
      hasInitialBalance,
      aktiva: {
        cashBank,
        receivables,
        physicalInventory: physicalInventoryValuation,
        wipValue,
        suppliesValue,
        equipmentValue,
        totalAktiva: calculatedAktiva,
      },
      pasiva: {
        payables,
        initialEquity,
        capitalInjections,
        totalModalLama,
        revenueSpk: totalRevenueSpk,
        otherIncome,
        totalRevenue,
        hppCompletedSpk,
        totalOpex,
        netProfit,
        prive,
        modalBaru,
        totalPasiva,
      },
      balanceDiff,
      isBalanced,
      cashSummary: {
        initialCash: cashBankAwal,
        totalCashInSpk,
        totalCashInNonSpk,
        totalCashOutSpk,
        totalCashOutOpex,
        totalCashOutNonSpk,
        totalCashIn,
        totalCashOut,
        netCashFlow,
        endingCash: cashBank,
      },
    };
  },
};
