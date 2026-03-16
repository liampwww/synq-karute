-- Add staff_advice column to karute_records for AI-generated next-session advice
ALTER TABLE public.karute_records ADD COLUMN IF NOT EXISTS staff_advice text;
