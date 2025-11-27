-- Create junction table for appointments and agents (many-to-many relationship)
CREATE TABLE public.appointment_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(appointment_id, agent_id)
);

-- Enable RLS
ALTER TABLE public.appointment_agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view appointment_agents"
ON public.appointment_agents
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert appointment_agents"
ON public.appointment_agents
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete appointment_agents"
ON public.appointment_agents
FOR DELETE
USING (true);

-- Create index for better query performance
CREATE INDEX idx_appointment_agents_appointment_id ON public.appointment_agents(appointment_id);
CREATE INDEX idx_appointment_agents_agent_id ON public.appointment_agents(agent_id);

-- Migrate existing appointments with agents to the new table
INSERT INTO public.appointment_agents (appointment_id, agent_id)
SELECT id, agent_id
FROM public.appointments
WHERE agent_id IS NOT NULL;

-- The agent_id column in appointments will be kept for backwards compatibility
-- but new appointments will use the appointment_agents table