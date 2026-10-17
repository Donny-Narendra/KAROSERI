-- ==============================================================================
-- MIGRATION: 20261017010000_add_unit_notes_to_rab_items.sql
-- Description: Add optional unit and notes columns to rab_items table
-- ==============================================================================

ALTER TABLE public.rab_items 
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'lot',
ADD COLUMN IF NOT EXISTS notes TEXT;
