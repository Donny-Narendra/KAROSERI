-- Migration to add assignment_letter_no to spk_borongan
ALTER TABLE public.spk_borongan 
ADD COLUMN IF NOT EXISTS assignment_letter_no text;
