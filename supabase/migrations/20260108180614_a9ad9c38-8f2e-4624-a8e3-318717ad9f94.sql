-- Create time_bank table for tracking employee hours and bonuses
CREATE TABLE public.time_bank (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  accumulated_hours numeric NOT NULL DEFAULT 0,
  bonuses numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_time_bank UNIQUE (user_id)
);

-- Create time_bank_transactions table for tracking all hour/bonus changes
CREATE TABLE public.time_bank_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hours_change numeric NOT NULL DEFAULT 0,
  bonus_change numeric NOT NULL DEFAULT 0,
  description text,
  transaction_type text NOT NULL DEFAULT 'credit', -- 'credit', 'debit_hours', 'debit_bonus'
  related_time_off_id uuid REFERENCES public.time_off(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.time_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_bank_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_bank - Only dev can modify, authenticated can view
CREATE POLICY "Authenticated users can view time_bank"
ON public.time_bank
FOR SELECT
USING (true);

CREATE POLICY "Only dev can insert time_bank"
ON public.time_bank
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'dev'));

CREATE POLICY "Only dev can update time_bank"
ON public.time_bank
FOR UPDATE
USING (has_role(auth.uid(), 'dev'))
WITH CHECK (has_role(auth.uid(), 'dev'));

CREATE POLICY "Only dev can delete time_bank"
ON public.time_bank
FOR DELETE
USING (has_role(auth.uid(), 'dev'));

-- RLS policies for time_bank_transactions - Only dev can modify, authenticated can view
CREATE POLICY "Authenticated users can view time_bank_transactions"
ON public.time_bank_transactions
FOR SELECT
USING (true);

CREATE POLICY "Only dev can insert time_bank_transactions"
ON public.time_bank_transactions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'dev'));

CREATE POLICY "Only dev can delete time_bank_transactions"
ON public.time_bank_transactions
FOR DELETE
USING (has_role(auth.uid(), 'dev'));

-- Add columns to time_off table for tracking if it's bonus-based and the reason
ALTER TABLE public.time_off 
ADD COLUMN IF NOT EXISTS is_bonus_time_off boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS bonus_reason text;

-- Create trigger to update updated_at on time_bank
CREATE OR REPLACE FUNCTION public.update_time_bank_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_time_bank_updated_at
BEFORE UPDATE ON public.time_bank
FOR EACH ROW
EXECUTE FUNCTION public.update_time_bank_updated_at();

-- Create function to add or update time bank for a user
CREATE OR REPLACE FUNCTION public.upsert_time_bank(
  p_user_id uuid,
  p_hours_change numeric DEFAULT 0,
  p_bonus_change numeric DEFAULT 0,
  p_description text DEFAULT NULL,
  p_transaction_type text DEFAULT 'credit',
  p_related_time_off_id uuid DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update the time_bank record
  INSERT INTO public.time_bank (user_id, accumulated_hours, bonuses)
  VALUES (p_user_id, p_hours_change, p_bonus_change)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    accumulated_hours = time_bank.accumulated_hours + p_hours_change,
    bonuses = time_bank.bonuses + p_bonus_change,
    updated_at = now();
  
  -- Record the transaction
  INSERT INTO public.time_bank_transactions (
    user_id, 
    hours_change, 
    bonus_change, 
    description, 
    transaction_type,
    related_time_off_id,
    created_by
  )
  VALUES (
    p_user_id, 
    p_hours_change, 
    p_bonus_change, 
    p_description, 
    p_transaction_type,
    p_related_time_off_id,
    p_created_by
  );
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_time_bank_user_id ON public.time_bank(user_id);
CREATE INDEX IF NOT EXISTS idx_time_bank_transactions_user_id ON public.time_bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_time_bank_transactions_created_at ON public.time_bank_transactions(created_at DESC);