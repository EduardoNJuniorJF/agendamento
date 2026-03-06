
CREATE TABLE public.implantation_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text,
  name text NOT NULL,
  group_name text,
  profile text,
  project_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.implantation_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dev can select implantation_clients" ON public.implantation_clients
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'dev'));

CREATE POLICY "Dev can insert implantation_clients" ON public.implantation_clients
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'dev'));

CREATE POLICY "Dev can update implantation_clients" ON public.implantation_clients
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'dev')) WITH CHECK (has_role(auth.uid(), 'dev'));

CREATE POLICY "Dev can delete implantation_clients" ON public.implantation_clients
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'dev'));
