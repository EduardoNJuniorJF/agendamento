-- Fix RLS policies to be PERMISSIVE (default) instead of RESTRICTIVE

-- Drop and recreate vehicles policies
DROP POLICY IF EXISTS "Anyone can insert vehicles" ON vehicles;
DROP POLICY IF EXISTS "Anyone can update vehicles" ON vehicles;
DROP POLICY IF EXISTS "Anyone can delete vehicles" ON vehicles;

CREATE POLICY "Anyone can insert vehicles" 
ON vehicles 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update vehicles" 
ON vehicles 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete vehicles" 
ON vehicles 
FOR DELETE 
TO authenticated
USING (true);

-- Drop and recreate agents policies
DROP POLICY IF EXISTS "Anyone can insert agents" ON agents;
DROP POLICY IF EXISTS "Anyone can update agents" ON agents;
DROP POLICY IF EXISTS "Anyone can delete agents" ON agents;

CREATE POLICY "Anyone can insert agents" 
ON agents 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update agents" 
ON agents 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete agents" 
ON agents 
FOR DELETE 
TO authenticated
USING (true);

-- Drop and recreate appointments policies
DROP POLICY IF EXISTS "Anyone can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can update appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can delete appointments" ON appointments;

CREATE POLICY "Anyone can insert appointments" 
ON appointments 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update appointments" 
ON appointments 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete appointments" 
ON appointments 
FOR DELETE 
TO authenticated
USING (true);