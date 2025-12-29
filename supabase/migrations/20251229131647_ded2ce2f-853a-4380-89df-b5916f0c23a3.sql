-- Criar tabela para feriados locais cadastrados pelo usuário
CREATE TABLE public.local_holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  day integer NOT NULL CHECK (day >= 1 AND day <= 31),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NULL, -- NULL significa que se repete todo ano, valor específico significa feriado único
  location text NOT NULL DEFAULT 'tres_rios',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.local_holidays ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - todos podem ver, apenas managers podem editar
CREATE POLICY "Authenticated users can view local_holidays"
  ON public.local_holidays
  FOR SELECT
  USING (true);

CREATE POLICY "Managers can insert local_holidays"
  ON public.local_holidays
  FOR INSERT
  WITH CHECK (can_manage_celebrations(auth.uid()));

CREATE POLICY "Managers can update local_holidays"
  ON public.local_holidays
  FOR UPDATE
  USING (can_manage_celebrations(auth.uid()));

CREATE POLICY "Managers can delete local_holidays"
  ON public.local_holidays
  FOR DELETE
  USING (can_manage_celebrations(auth.uid()));

-- Índice para busca por mês
CREATE INDEX idx_local_holidays_month ON public.local_holidays(month);