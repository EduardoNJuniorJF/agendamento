-- Criar tabela para armazenar saldo de abonos por tipo para cada usuário
CREATE TABLE public.user_bonus_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bonus_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, bonus_type)
);

-- Enable RLS
ALTER TABLE public.user_bonus_balances ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (mesmas regras do time_bank - apenas dev pode modificar)
CREATE POLICY "Authenticated users can view user_bonus_balances"
ON public.user_bonus_balances
FOR SELECT
USING (true);

CREATE POLICY "Only dev can insert user_bonus_balances"
ON public.user_bonus_balances
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Only dev can update user_bonus_balances"
ON public.user_bonus_balances
FOR UPDATE
USING (has_role(auth.uid(), 'dev'::app_role))
WITH CHECK (has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Only dev can delete user_bonus_balances"
ON public.user_bonus_balances
FOR DELETE
USING (has_role(auth.uid(), 'dev'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_bonus_balances_updated_at
BEFORE UPDATE ON public.user_bonus_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_time_bank_updated_at();

-- Função para upsert de abonos por tipo
CREATE OR REPLACE FUNCTION public.upsert_bonus_balance(
  p_user_id UUID,
  p_bonus_type TEXT,
  p_quantity_change INTEGER,
  p_description TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Inserir ou atualizar o saldo de abonos por tipo
  INSERT INTO public.user_bonus_balances (user_id, bonus_type, quantity)
  VALUES (p_user_id, p_bonus_type, p_quantity_change)
  ON CONFLICT (user_id, bonus_type)
  DO UPDATE SET
    quantity = user_bonus_balances.quantity + p_quantity_change,
    updated_at = now();

  -- Registrar a transação no time_bank_transactions
  INSERT INTO public.time_bank_transactions (
    user_id,
    hours_change,
    bonus_change,
    description,
    transaction_type,
    created_by
  )
  VALUES (
    p_user_id,
    0,
    p_quantity_change,
    COALESCE(p_description, 'Abono ' || p_bonus_type || ': ' || 
      CASE WHEN p_quantity_change >= 0 THEN '+' ELSE '' END || p_quantity_change::text),
    CASE WHEN p_quantity_change >= 0 THEN 'credit_bonus' ELSE 'debit_bonus' END,
    p_created_by
  );
END;
$$;