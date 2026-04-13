
-- Table for granular per-user, per-page permission overrides
CREATE TABLE public.user_page_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_name text NOT NULL,
  can_access boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, page_name)
);

-- Enable RLS
ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

-- Only dev can manage permissions
CREATE POLICY "Dev can select user_page_permissions"
  ON public.user_page_permissions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'dev') OR auth.uid() = user_id);

CREATE POLICY "Dev can insert user_page_permissions"
  ON public.user_page_permissions FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'dev'));

CREATE POLICY "Dev can update user_page_permissions"
  ON public.user_page_permissions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'dev'))
  WITH CHECK (has_role(auth.uid(), 'dev'));

CREATE POLICY "Dev can delete user_page_permissions"
  ON public.user_page_permissions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'dev'));

-- Function to check if user has page-level override
CREATE OR REPLACE FUNCTION public.get_page_permission(_user_id uuid, _page_name text)
RETURNS TABLE(can_access boolean, can_edit boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT can_access, can_edit
  FROM public.user_page_permissions
  WHERE user_id = _user_id AND page_name = _page_name
  LIMIT 1;
$$;
