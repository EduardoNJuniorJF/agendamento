-- Add username field to profiles
ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;

-- Create function to get email from username
CREATE OR REPLACE FUNCTION public.get_email_from_username(_username TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE username = _username
  LIMIT 1
$$;

-- Create the 4 users with their auth records
DO $$
DECLARE
  dev_id UUID;
  admin_id UUID;
  user_id UUID;
  financeiro_id UUID;
BEGIN
  -- Insert auth users (Supabase will handle the auth.users table)
  -- We'll create them via profiles and the trigger will handle auth
  
  -- For now, we'll insert into profiles directly with specific IDs
  -- These need to be created manually in Supabase Auth first
  
  -- Create profiles with usernames (users must exist in auth.users first)
  -- This will be done after users are created in Supabase Auth
END $$;