-- Drop existing restrictive policies and create new ones
-- These policies will allow all authenticated users to view data

-- agents table
DROP POLICY IF EXISTS "Anyone can view agents" ON agents;
CREATE POLICY "Authenticated users can view agents"
  ON agents FOR SELECT
  TO authenticated
  USING (true);

-- appointments table  
DROP POLICY IF EXISTS "Anyone can view appointments" ON appointments;
CREATE POLICY "Authenticated users can view appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (true);

-- appointment_agents table
DROP POLICY IF EXISTS "Anyone can view appointment_agents" ON appointment_agents;
CREATE POLICY "Authenticated users can view appointment_agents"
  ON appointment_agents FOR SELECT
  TO authenticated
  USING (true);

-- vehicles table
DROP POLICY IF EXISTS "Anyone can view vehicles" ON vehicles;
CREATE POLICY "Authenticated users can view vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

-- time_off table
DROP POLICY IF EXISTS "Anyone can view time_off" ON time_off;
CREATE POLICY "Authenticated users can view time_off"
  ON time_off FOR SELECT
  TO authenticated
  USING (true);

-- vacations table
DROP POLICY IF EXISTS "Anyone can view vacations" ON vacations;
CREATE POLICY "Authenticated users can view vacations"
  ON vacations FOR SELECT
  TO authenticated
  USING (true);