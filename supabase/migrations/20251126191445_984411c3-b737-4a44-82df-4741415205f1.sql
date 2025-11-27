-- Update vacations table to match spreadsheet structure
ALTER TABLE public.vacations
  ADD COLUMN expiry_date date,
  ADD COLUMN deadline date,
  ADD COLUMN days integer DEFAULT 30,
  ADD COLUMN period_number integer DEFAULT 1,
  ADD COLUMN notes text;

-- Create table for time off (folgas)
CREATE TABLE public.time_off (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  type text CHECK (type IN ('completa', 'parcial')),
  approved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_off ENABLE ROW LEVEL SECURITY;

-- Create policies for time_off
CREATE POLICY "Anyone can view time_off"
  ON public.time_off FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert time_off"
  ON public.time_off FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update time_off"
  ON public.time_off FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete time_off"
  ON public.time_off FOR DELETE
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_time_off_date ON public.time_off(date);
CREATE INDEX idx_time_off_agent ON public.time_off(agent_id);
CREATE INDEX idx_vacations_expiry ON public.vacations(expiry_date);

-- Function to check upcoming vacations (for reminders)
CREATE OR REPLACE FUNCTION public.get_upcoming_vacation_reminders()
RETURNS TABLE (
  agent_id uuid,
  agent_name text,
  start_date date,
  days_until_start integer,
  reminder_type text
) 
LANGUAGE plpgsql
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