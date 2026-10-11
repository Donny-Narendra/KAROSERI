-- ==============================================================================
-- Migration: Add 'CANCELLED' value to requisition_status enum
-- Description: Allows material requisitions to be cancelled without violating enum constraints
-- Execution: Manual execution in Supabase SQL Editor
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'requisition_status' AND e.enumlabel = 'CANCELLED'
    ) THEN
        ALTER TYPE requisition_status ADD VALUE 'CANCELLED';
    END IF;
END$$;
