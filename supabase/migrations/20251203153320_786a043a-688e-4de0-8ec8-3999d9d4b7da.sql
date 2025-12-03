-- Add user_id to agents table to link agents to users
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Add audit fields to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS created_by_name text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS updated_by_name text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS last_action text DEFAULT 'created';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS last_action_at timestamp with time zone DEFAULT now();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);