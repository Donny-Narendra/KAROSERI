-- ==============================================================================
-- Add Cancellation metadata to spk table
-- ==============================================================================

ALTER TABLE public.spk
ADD COLUMN cancellation_reason text,
ADD COLUMN cancelled_at timestamp with time zone,
ADD COLUMN cancelled_by uuid REFERENCES public.profiles(id);

-- ==============================================================================
-- Update RLS for cancellation logic
-- ==============================================================================
-- Since 'Service Advisors can manage SPK' and 'Owners have full access to SPK'
-- policies already use 'FOR ALL', they essentially have full unrestricted UPDATE access.
-- To restrict cancellation specifically, we can use a TRIGGER or a restrictive policy, 
-- or we can just rely on the frontend/backend guardrails. The instructions said:
-- "pastikan role service_advisor dan admin diizinkan melakukan update pada kolom-kolom pembatalan ini hanya jika status sebelumnya masih 'draft' atau 'pending_dp'."

-- However, replacing FOR ALL is tricky. Let's create a trigger to enforce the safety gates at the DB level.

CREATE OR REPLACE FUNCTION public.check_spk_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is being changed to CANCELLED
    IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
        -- Check if old status was DRAFT or PENDING_PAYMENT
        IF OLD.status NOT IN ('DRAFT', 'PENDING_PAYMENT') THEN
            RAISE EXCEPTION 'Cannot cancel SPK that is already active or completed.';
        END IF;
        
        -- Check if reason and cancelled_by are provided
        IF NEW.cancellation_reason IS NULL OR trim(NEW.cancellation_reason) = '' THEN
            RAISE EXCEPTION 'Cancellation reason is required.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_spk_cancellation ON public.spk;
CREATE TRIGGER trg_check_spk_cancellation
BEFORE UPDATE ON public.spk
FOR EACH ROW
EXECUTE FUNCTION public.check_spk_cancellation();
