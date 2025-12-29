-- Add user_id column to time_off table
ALTER TABLE public.time_off ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Copy existing agent_id references to user_id by looking up the user_id from agents table
UPDATE public.time_off 
SET user_id = agents.user_id 
FROM public.agents 
WHERE time_off.agent_id = agents.id AND agents.user_id IS NOT NULL;

-- Drop the foreign key constraint on agent_id
ALTER TABLE public.time_off DROP CONSTRAINT IF EXISTS time_off_agent_id_fkey;

-- Drop the agent_id column
ALTER TABLE public.time_off DROP COLUMN agent_id;