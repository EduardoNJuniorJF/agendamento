-- Add color column to agents table
ALTER TABLE public.agents 
ADD COLUMN color text DEFAULT '#3b82f6';

-- Add comment explaining the column
COMMENT ON COLUMN public.agents.color IS 'Hex color code for visual identification in appointments (e.g., #3b82f6)';