-- Drop existing restrictive policies on vacations
DROP POLICY IF EXISTS "Anyone can insert vacations" ON vacations;
DROP POLICY IF EXISTS "Anyone can update vacations" ON vacations;
DROP POLICY IF EXISTS "Anyone can delete vacations" ON vacations;
DROP POLICY IF EXISTS "Authenticated users can view vacations" ON vacations;

-- Create new permissive policies for authenticated users
CREATE POLICY "Authenticated users can view vacations"
  ON vacations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vacations"
  ON vacations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vacations"
  ON vacations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete vacations"
  ON vacations
  FOR DELETE
  TO authenticated
  USING (true);