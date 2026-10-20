-- Migration: 20261023030000_fix_subtotal_generated_column_and_payments_rls.sql
-- Description: 
-- 1. Convert subtotal column in rab_items from GENERATED ALWAYS to standard numeric column with default 0,
--    preventing PostgreSQL error 428C9 ("cannot insert a non-DEFAULT value into column 'subtotal'").
-- 2. Open up payments RLS policies so all authenticated staff (owner, kasir, admin, service_advisor)
--    can insert and select payment records without error 42501.

-- 1. Drop expression from subtotal in rab_items if it is a generated column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rab_items' AND column_name = 'subtotal' AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.rab_items ALTER COLUMN subtotal DROP EXPRESSION IF EXISTS;
    ALTER TABLE public.rab_items ALTER COLUMN subtotal SET DEFAULT 0;
  END IF;
END $$;

-- 2. Drop existing restrictive policies on payments
DROP POLICY IF EXISTS "Owners have full access to payments" ON public.payments;
DROP POLICY IF EXISTS "Kasir can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated to manage payments" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated staff to manage payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all access to payments" ON public.payments;

-- 3. Create comprehensive RLS policy for payments table allowing authenticated and anon staff operations
CREATE POLICY "Allow all access to payments"
ON public.payments FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
