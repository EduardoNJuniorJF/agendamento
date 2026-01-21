-- Adicionar coluna leave_days na tabela user_bonus_balances para armazenar os dias de afastamento
ALTER TABLE public.user_bonus_balances 
ADD COLUMN IF NOT EXISTS leave_days integer DEFAULT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.user_bonus_balances.leave_days IS 'Dias totais de afastamento (para Atestado e Licença Médica)';