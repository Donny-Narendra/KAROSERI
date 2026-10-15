-- Migration: Add vin_chassis and engine_number columns to spk and create spk_orders view compatibility
ALTER TABLE public.spk 
ADD COLUMN IF NOT EXISTS vin_chassis TEXT,
ADD COLUMN IF NOT EXISTS engine_number TEXT;

-- Backfill data from vehicle_vin and vehicle_engine
UPDATE public.spk 
SET 
  vin_chassis = COALESCE(vin_chassis, vehicle_vin),
  engine_number = COALESCE(engine_number, vehicle_engine);

-- Trigger to keep vehicle_vin / vin_chassis and vehicle_engine / engine_number in sync
CREATE OR REPLACE FUNCTION public.sync_spk_vehicle_ident_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vin_chassis IS NOT NULL AND (OLD IS NULL OR NEW.vin_chassis IS DISTINCT FROM OLD.vin_chassis) THEN
    NEW.vehicle_vin := NEW.vin_chassis;
  ELSIF NEW.vehicle_vin IS NOT NULL THEN
    NEW.vin_chassis := NEW.vehicle_vin;
  END IF;

  IF NEW.engine_number IS NOT NULL AND (OLD IS NULL OR NEW.engine_number IS DISTINCT FROM OLD.engine_number) THEN
    NEW.vehicle_engine := NEW.engine_number;
  ELSIF NEW.vehicle_engine IS NOT NULL THEN
    NEW.engine_number := NEW.vehicle_engine;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_spk_vehicle_ident ON public.spk;
CREATE TRIGGER trg_sync_spk_vehicle_ident
BEFORE INSERT OR UPDATE ON public.spk
FOR EACH ROW
EXECUTE FUNCTION public.sync_spk_vehicle_ident_columns();

-- Create or replace spk_orders view for compatibility with systems referring to spk_orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spk_orders' AND table_type = 'BASE TABLE') THEN
    CREATE OR REPLACE VIEW public.spk_orders AS SELECT * FROM public.spk;
  END IF;
END $$;
