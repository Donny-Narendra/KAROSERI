-- Create payments table
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

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Owner has full access
CREATE POLICY "Owners have full access to payments"
    ON public.payments FOR ALL
    USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

-- Kasir can manage payments
CREATE POLICY "Kasir can manage payments"
    ON public.payments FOR ALL
    USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
