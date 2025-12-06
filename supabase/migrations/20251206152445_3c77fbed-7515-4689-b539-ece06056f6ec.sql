-- Add receives_bonus column to agents table
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS receives_bonus boolean DEFAULT true;

-- Add sector column to profiles table for user registration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sector text;