-- ==============================================================================
-- MIGRATION: 20261030010000_general_ledger_t_model.sql
-- Description: Modul Buku Besar & Kas Akuntansi Model T (T-Account Balance Sheet)
-- 1. Tabel Saldo Awal Bengkel (initial_balances)
-- 2. Tabel Buku Kas Masuk & Kas Keluar Non-SPK (cash_ledger_transactions)
-- 3. Row Level Security (RLS) & Grants
-- ==============================================================================

-- 1. TABEL SALDO AWAL BENGKEL (initial_balances)
CREATE TABLE IF NOT EXISTS public.initial_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_bank NUMERIC(15, 2) NOT NULL DEFAULT 0,
  inventory_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  equipment_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  supplies_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  payables NUMERIC(15, 2) NOT NULL DEFAULT 0,
  initial_equity NUMERIC(15, 2) GENERATED ALWAYS AS (
    (cash_bank + inventory_value + equipment_value + supplies_value) - payables
  ) STORED,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABEL BUKU KAS MASUK / KELUAR NON-SPK (cash_ledger_transactions)
CREATE TABLE IF NOT EXISTS public.cash_ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  category TEXT NOT NULL CHECK (category IN (
    'EQUIPMENT_PURCHASE',  -- Beli Peralatan/Mesin (Aktiva Bertambah, Kas Berkurang)
    'SUPPLIES_PURCHASE',   -- Beli Perlengkapan Pabrik (Aktiva Perlengkapan Bertambah, Kas Berkurang)
    'PRIVE_WITHDRAWAL',    -- Tarik Prive Pemilik (Kas Berkurang, Modal Berkurang)
    'DEBT_RECEIVED',       -- Tambah Pinjaman/Hutang (Kas Bertambah, Pasiva Hutang Bertambah)
    'DEBT_REPAYMENT',      -- Bayar Cicilan Hutang (Kas Berkurang, Pasiva Hutang Berkurang)
    'CAPITAL_INJECTION',   -- Tambah Setoran Modal Pemilik (Kas Bertambah, Modal Bertambah)
    'OTHER_INCOME'         -- Pendapatan Lain-lain Non-SPK (Kas Bertambah, Modal/Laba Bertambah)
  )),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'TRANSFER' CHECK (payment_method IN ('TRANSFER', 'CASH')),
  description TEXT NOT NULL,
  receipt_no TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES UNTUK PERFORMA AGREGASI
CREATE INDEX IF NOT EXISTS idx_cash_ledger_date ON public.cash_ledger_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_direction ON public.cash_ledger_transactions(direction);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_category ON public.cash_ledger_transactions(category);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.initial_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_ledger_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "initial_balances_owner_kasir_select" ON public.initial_balances;
DROP POLICY IF EXISTS "initial_balances_owner_kasir_insert" ON public.initial_balances;
DROP POLICY IF EXISTS "initial_balances_owner_kasir_update" ON public.initial_balances;
DROP POLICY IF EXISTS "initial_balances_owner_kasir_all" ON public.initial_balances;

DROP POLICY IF EXISTS "cash_ledger_owner_kasir_all" ON public.cash_ledger_transactions;
DROP POLICY IF EXISTS "cash_ledger_public_read" ON public.cash_ledger_transactions;

-- RLS untuk initial_balances: Role 'owner' dan 'kasir'
CREATE POLICY "initial_balances_owner_kasir_all" ON public.initial_balances
  FOR ALL
  TO authenticated, anon
  USING (
    auth.role() = 'authenticated' OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner', 'kasir')
  )
  WITH CHECK (
    auth.role() = 'authenticated' OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner', 'kasir')
  );

-- RLS untuk cash_ledger_transactions: Role 'owner' dan 'kasir'
CREATE POLICY "cash_ledger_owner_kasir_all" ON public.cash_ledger_transactions
  FOR ALL
  TO authenticated, anon
  USING (
    auth.role() = 'authenticated' OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner', 'kasir')
  )
  WITH CHECK (
    auth.role() = 'authenticated' OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner', 'kasir')
  );

-- GRANTS KE AUTHENTICATED & ANON
GRANT ALL ON public.initial_balances TO authenticated, anon;
GRANT ALL ON public.cash_ledger_transactions TO authenticated, anon;

-- NOTIFIKASI POSTGREST RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
