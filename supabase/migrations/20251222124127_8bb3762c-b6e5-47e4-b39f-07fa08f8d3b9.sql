
-- Fix the is_agent_on_vacation function to properly check vacations
-- The vacations table uses user_id (referencing profiles), not agent_id
-- We need to join agents table to get the user_id

CREATE OR REPLACE FUNCTION public.is_agent_on_vacation(p_agent_id uuid, p_date date)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid;
BEGIN
    -- Get the user_id from the agents table
    SELECT user_id INTO v_user_id 
    FROM agents 
    WHERE id = p_agent_id;
    
    -- If agent has no user_id, they can't be on vacation
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if there's a vacation for this user on the given date
    RETURN EXISTS (
        SELECT 1 FROM vacations
        WHERE user_id = v_user_id
        AND p_date BETWEEN start_date AND end_date
    );
END;
$function$;
