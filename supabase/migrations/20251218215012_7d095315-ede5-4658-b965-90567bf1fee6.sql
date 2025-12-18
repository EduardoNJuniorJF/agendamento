-- Função para obter o setor do usuário
CREATE OR REPLACE FUNCTION public.get_user_sector(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sector
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- Função para verificar se o usuário pode ver/gerenciar calendário/agendamentos
-- Comercial: CRUD completo / Administrativo: Apenas visualizar / Suporte e Desenvolvimento: Sem acesso
CREATE OR REPLACE FUNCTION public.can_access_calendar(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND sector IN ('Comercial', 'Administrativo')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'dev'
  )
$$;

-- Função para verificar se o usuário pode editar calendário/agendamentos
-- Comercial Admin e User: CRUD / Administrativo: Não pode editar / Suporte e Desenvolvimento: Sem acesso
CREATE OR REPLACE FUNCTION public.can_edit_calendar(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND sector = 'Comercial'
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'dev'
  )
$$;

-- Função para verificar se o usuário pode acessar a página de Frota
-- Comercial: Acesso / Administrativo: Apenas visualizar / Suporte e Desenvolvimento: Sem acesso
CREATE OR REPLACE FUNCTION public.can_access_fleet(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND sector IN ('Comercial', 'Administrativo')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'dev'
  )
$$;

-- Função para verificar se o usuário pode editar Frota
-- Apenas Comercial Admin pode editar
CREATE OR REPLACE FUNCTION public.can_edit_fleet(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = _user_id
    AND p.sector = 'Comercial'
    AND ur.role IN ('admin', 'dev')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'dev'
  )
$$;

-- Função para verificar se o usuário pode acessar Bonificação
-- Comercial: Acesso / Administrativo: Apenas visualizar e imprimir / Suporte e Desenvolvimento: Sem acesso
CREATE OR REPLACE FUNCTION public.can_access_bonus(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND sector IN ('Comercial', 'Administrativo')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'dev'
  )
$$;

-- Função para verificar se o usuário pode editar configurações de Bonificação
-- Apenas Comercial Admin pode editar configurações
CREATE OR REPLACE FUNCTION public.can_edit_bonus(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = _user_id
    AND p.sector = 'Comercial'
    AND ur.role IN ('admin', 'dev')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'dev'
  )
$$;