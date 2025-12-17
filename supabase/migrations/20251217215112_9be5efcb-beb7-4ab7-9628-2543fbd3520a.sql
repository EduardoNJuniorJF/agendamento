-- Drop existing policies for birthdays
DROP POLICY IF EXISTS "Only dev can delete birthdays" ON public.birthdays;
DROP POLICY IF EXISTS "Only dev can insert birthdays" ON public.birthdays;
DROP POLICY IF EXISTS "Only dev can update birthdays" ON public.birthdays;
DROP POLICY IF EXISTS "Only dev can view birthdays" ON public.birthdays;

-- Drop existing policies for seasonal_dates
DROP POLICY IF EXISTS "Only dev can delete seasonal_dates" ON public.seasonal_dates;
DROP POLICY IF EXISTS "Only dev can insert seasonal_dates" ON public.seasonal_dates;
DROP POLICY IF EXISTS "Only dev can update seasonal_dates" ON public.seasonal_dates;
DROP POLICY IF EXISTS "Only dev can view seasonal_dates" ON public.seasonal_dates;

-- Create function to check if user can manage celebrations
CREATE OR REPLACE FUNCTION public.can_manage_celebrations(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if user is dev
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'dev'
  ) OR EXISTS (
    -- Check if user is admin AND has sector Comercial or Administrativo
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id 
      AND ur.role = 'admin'
      AND p.sector IN ('Comercial', 'Administrativo')
  )
$$;

-- Create new policies for birthdays - everyone can view
CREATE POLICY "Authenticated users can view birthdays" 
ON public.birthdays 
FOR SELECT 
USING (true);

-- Managers can insert birthdays
CREATE POLICY "Managers can insert birthdays" 
ON public.birthdays 
FOR INSERT 
WITH CHECK (can_manage_celebrations(auth.uid()));

-- Managers can update birthdays
CREATE POLICY "Managers can update birthdays" 
ON public.birthdays 
FOR UPDATE 
USING (can_manage_celebrations(auth.uid()));

-- Managers can delete birthdays
CREATE POLICY "Managers can delete birthdays" 
ON public.birthdays 
FOR DELETE 
USING (can_manage_celebrations(auth.uid()));

-- Create new policies for seasonal_dates - everyone can view
CREATE POLICY "Authenticated users can view seasonal_dates" 
ON public.seasonal_dates 
FOR SELECT 
USING (true);

-- Managers can insert seasonal_dates
CREATE POLICY "Managers can insert seasonal_dates" 
ON public.seasonal_dates 
FOR INSERT 
WITH CHECK (can_manage_celebrations(auth.uid()));

-- Managers can update seasonal_dates
CREATE POLICY "Managers can update seasonal_dates" 
ON public.seasonal_dates 
FOR UPDATE 
USING (can_manage_celebrations(auth.uid()));

-- Managers can delete seasonal_dates
CREATE POLICY "Managers can delete seasonal_dates" 
ON public.seasonal_dates 
FOR DELETE 
USING (can_manage_celebrations(auth.uid()));