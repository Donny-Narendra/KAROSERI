import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const env = fs.readFileSync('.env.local', 'utf-8');
const dbUrlMatch = env.match(/DATABASE_URL=(.*)/);

const client = new Client({
  connectionString: dbUrlMatch[1],
});

async function run() {
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          spk_id UUID NOT NULL REFERENCES public.spk(id) ON DELETE CASCADE,
          payment_type TEXT NOT NULL CHECK (payment_type IN ('DP', 'FINAL', 'INSTALLMENT')),
          amount NUMERIC(15,2) NOT NULL DEFAULT 0,
          payment_method TEXT NOT NULL,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
          created_by UUID REFERENCES auth.users(id)
      );

      ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "Owners have full access to payments" ON public.payments FOR ALL USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Kasir can manage payments" ON public.payments FOR ALL USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      -- Kasir access to spk
      DO $$ BEGIN
        CREATE POLICY "Kasir can read spk" ON public.spk FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Kasir can update spk" ON public.spk FOR UPDATE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      -- Kasir access to rab_estimations
      DO $$ BEGIN
        CREATE POLICY "Kasir can read rab_estimations" ON public.rab_estimations FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      -- Kasir access to inventory_transactions
      DO $$ BEGIN
        CREATE POLICY "Kasir can read inventory_transactions" ON public.inventory_transactions FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      -- Kasir access to materials
      DO $$ BEGIN
        CREATE POLICY "Kasir can read materials" ON public.materials FOR SELECT USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    console.log('Successfully updated RLS policies and created payments table.');
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}
run();
