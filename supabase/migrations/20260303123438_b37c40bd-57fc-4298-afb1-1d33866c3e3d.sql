-- Change appointment_agents FK from CASCADE to SET NULL
ALTER TABLE public.appointment_agents
  DROP CONSTRAINT appointment_agents_agent_id_fkey;

ALTER TABLE public.appointment_agents
  ALTER COLUMN agent_id DROP NOT NULL;

ALTER TABLE public.appointment_agents
  ADD CONSTRAINT appointment_agents_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;