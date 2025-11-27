-- Fix security warnings by adding search_path to existing functions

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_agent_on_vacation(p_agent_id UUID, p_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM vacations
        WHERE agent_id = p_agent_id
        AND p_date BETWEEN start_date AND end_date
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_vehicle_availability(
    p_vehicle_id UUID, 
    p_date DATE, 
    p_time TIME WITHOUT TIME ZONE, 
    p_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM appointments
        WHERE vehicle_id = p_vehicle_id
        AND date = p_date
        AND time = p_time
        AND status != 'cancelled'
        AND (p_appointment_id IS NULL OR id != p_appointment_id)
    );
END;
$function$;