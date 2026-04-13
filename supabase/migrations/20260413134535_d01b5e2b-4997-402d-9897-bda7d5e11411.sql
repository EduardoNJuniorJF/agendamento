
-- Drop existing restrictive policies on implantation_clients
DROP POLICY IF EXISTS "Dev can delete implantation_clients" ON public.implantation_clients;
DROP POLICY IF EXISTS "Dev can insert implantation_clients" ON public.implantation_clients;
DROP POLICY IF EXISTS "Dev can select implantation_clients" ON public.implantation_clients;
DROP POLICY IF EXISTS "Dev can update implantation_clients" ON public.implantation_clients;

-- Drop existing restrictive policies on implantation_projects
DROP POLICY IF EXISTS "Dev can delete implantation_projects" ON public.implantation_projects;
DROP POLICY IF EXISTS "Dev can insert implantation_projects" ON public.implantation_projects;
DROP POLICY IF EXISTS "Dev can select implantation_projects" ON public.implantation_projects;
DROP POLICY IF EXISTS "Dev can update implantation_projects" ON public.implantation_projects;

-- Helper function to check implantation access (dev or Comercial sector)
CREATE OR REPLACE FUNCTION public.can_access_implantation(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'dev'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND sector = 'Comercial'
  )
$$;

-- New policies for implantation_clients
CREATE POLICY "Dev and Comercial can select implantation_clients"
ON public.implantation_clients FOR SELECT TO authenticated
USING (can_access_implantation(auth.uid()));

CREATE POLICY "Dev and Comercial can insert implantation_clients"
ON public.implantation_clients FOR INSERT TO authenticated
WITH CHECK (can_access_implantation(auth.uid()));

CREATE POLICY "Dev and Comercial can update implantation_clients"
ON public.implantation_clients FOR UPDATE TO authenticated
USING (can_access_implantation(auth.uid()))
WITH CHECK (can_access_implantation(auth.uid()));

CREATE POLICY "Dev and Comercial can delete implantation_clients"
ON public.implantation_clients FOR DELETE TO authenticated
USING (can_access_implantation(auth.uid()));

-- New policies for implantation_projects
CREATE POLICY "Dev and Comercial can select implantation_projects"
ON public.implantation_projects FOR SELECT TO authenticated
USING (can_access_implantation(auth.uid()));

CREATE POLICY "Dev and Comercial can insert implantation_projects"
ON public.implantation_projects FOR INSERT TO authenticated
WITH CHECK (can_access_implantation(auth.uid()));

CREATE POLICY "Dev and Comercial can update implantation_projects"
ON public.implantation_projects FOR UPDATE TO authenticated
USING (can_access_implantation(auth.uid()))
WITH CHECK (can_access_implantation(auth.uid()));

CREATE POLICY "Dev and Comercial can delete implantation_projects"
ON public.implantation_projects FOR DELETE TO authenticated
USING (can_access_implantation(auth.uid()));
