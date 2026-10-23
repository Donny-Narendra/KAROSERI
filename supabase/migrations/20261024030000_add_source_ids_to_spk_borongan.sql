-- ==============================================================================
-- MIGRATION: 20261024030000_add_source_ids_to_spk_borongan.sql
-- Description: Ensure rab_item_id and change_order_item_id columns exist in spk_borongan
-- ==============================================================================

DO $$ 
BEGIN 
  IF NOT EXISTS ( 
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'spk_borongan' AND column_name = 'rab_item_id' 
  ) THEN 
    ALTER TABLE public.spk_borongan ADD COLUMN rab_item_id UUID REFERENCES public.rab_items(id) ON DELETE SET NULL; 
  END IF;    

  IF NOT EXISTS ( 
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'spk_borongan' AND column_name = 'change_order_item_id' 
  ) THEN 
    ALTER TABLE public.spk_borongan ADD COLUMN change_order_item_id UUID REFERENCES public.change_order_items(id) ON DELETE SET NULL; 
  END IF; 
END $$;

CREATE INDEX IF NOT EXISTS idx_spk_borongan_rab_item_id ON public.spk_borongan(rab_item_id);
CREATE INDEX IF NOT EXISTS idx_spk_borongan_change_order_item_id ON public.spk_borongan(change_order_item_id);
