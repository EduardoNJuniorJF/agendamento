-- Adiciona coluna para armazenar os dias de afastamento (Atestado/Licença Médica)
ALTER TABLE public.time_off ADD COLUMN IF NOT EXISTS leave_days INTEGER DEFAULT NULL;

-- Comentário para documentar o uso da coluna
COMMENT ON COLUMN public.time_off.leave_days IS 'Número de dias de afastamento (usado para Atestado e Licença Médica)';