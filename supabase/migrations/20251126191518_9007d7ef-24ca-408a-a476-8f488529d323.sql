-- Fix security warning by setting search_path on the function
DROP FUNCTION IF EXISTS public.get_upcoming_vacation_reminders();

CREATE OR REPLACE FUNCTION public.get_upcoming_vacation_reminders()
RETURNS TABLE (
  agent_id uuid,
  agent_name text,
  start_date date,
  days_until_start integer,
  reminder_type text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.agent_id,
    a.name,
    v.start_date,
    (v.start_date - CURRENT_DATE)::integer as days_until_start,
    CASE 
      WHEN (v.start_date - CURRENT_DATE) <= 30 AND (v.start_date - CURRENT_DATE) > 0 THEN '30_days'
      WHEN (v.start_date - CURRENT_DATE) <= 60 AND (v.start_date - CURRENT_DATE) > 30 THEN '60_days'
      ELSE 'none'
    END as reminder_type
  FROM public.vacations v
  JOIN public.agents a ON v.agent_id = a.id
  WHERE v.start_date > CURRENT_DATE
    AND (v.start_date - CURRENT_DATE) <= 60
  ORDER BY v.start_date;
END;
$$;