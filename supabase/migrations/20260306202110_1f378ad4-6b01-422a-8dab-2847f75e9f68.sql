
-- Create implantation_projects table
CREATE TABLE public.implantation_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.implantation_clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  profile text,
  project_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.implantation_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies (same as implantation_clients - dev only)
CREATE POLICY "Dev can select implantation_projects" ON public.implantation_projects
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Dev can insert implantation_projects" ON public.implantation_projects
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Dev can update implantation_projects" ON public.implantation_projects
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'dev'::app_role))
  WITH CHECK (has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Dev can delete implantation_projects" ON public.implantation_projects
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'dev'::app_role));

-- Migrate existing data: create a project for each client that has project_data
INSERT INTO public.implantation_projects (client_id, name, profile, project_data)
SELECT id, name, profile, project_data
FROM public.implantation_clients
WHERE project_data IS NOT NULL AND project_data != '{}'::jsonb;
