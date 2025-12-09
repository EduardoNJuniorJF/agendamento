-- Fix get_upcoming_vacation_reminders function to use user_id instead of agent_id
-- and join with profiles table instead of agents
CREATE OR REPLACE FUNCTION public.get_upcoming_vacation_reminders()
 RETURNS TABLE(agent_id uuid, agent_name text, start_date date, days_until_start integer, reminder_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    v.user_id as agent_id,
    COALESCE(p.full_name, p.email) as agent_name,
    v.start_date,
    (v.start_date - CURRENT_DATE)::integer as days_until_start,
    CASE 
      WHEN (v.start_date - CURRENT_DATE) <= 30 AND (v.start_date - CURRENT_DATE) > 0 THEN '30_days'
      WHEN (v.start_date - CURRENT_DATE) <= 60 AND (v.start_date - CURRENT_DATE) > 30 THEN '60_days'
      ELSE 'none'
    END as reminder_type
  FROM public.vacations v
  JOIN public.profiles p ON v.user_id = p.id
  WHERE v.start_date > CURRENT_DATE
    AND (v.start_date - CURRENT_DATE) <= 60
  ORDER BY v.start_date;
END;
$function$;

-- Add INSERT policy for profiles table (needed when deleting users with cascade)
CREATE POLICY "Service role can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- Add DELETE policy for profiles table
CREATE POLICY "Service role can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (true);