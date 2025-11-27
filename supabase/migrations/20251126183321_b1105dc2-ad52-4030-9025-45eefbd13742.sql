-- Drop existing RLS policies that require authentication
DROP POLICY IF EXISTS "Authenticated users can view agents" ON agents;
DROP POLICY IF EXISTS "Authenticated users can insert agents" ON agents;
DROP POLICY IF EXISTS "Authenticated users can update agents" ON agents;
DROP POLICY IF EXISTS "Authenticated users can delete agents" ON agents;

DROP POLICY IF EXISTS "Authenticated users can view appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON appointments;

DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can delete vehicles" ON vehicles;

DROP POLICY IF EXISTS "Authenticated users can view vacations" ON vacations;
DROP POLICY IF EXISTS "Authenticated users can insert vacations" ON vacations;
DROP POLICY IF EXISTS "Authenticated users can update vacations" ON vacations;
DROP POLICY IF EXISTS "Authenticated users can delete vacations" ON vacations;

-- Create new policies that allow public access (since we removed authentication)
CREATE POLICY "Anyone can view agents" ON agents FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert agents" ON agents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update agents" ON agents FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete agents" ON agents FOR DELETE TO anon USING (true);

CREATE POLICY "Anyone can view appointments" ON appointments FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert appointments" ON appointments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update appointments" ON appointments FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete appointments" ON appointments FOR DELETE TO anon USING (true);

CREATE POLICY "Anyone can view vehicles" ON vehicles FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert vehicles" ON vehicles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update vehicles" ON vehicles FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete vehicles" ON vehicles FOR DELETE TO anon USING (true);

CREATE POLICY "Anyone can view vacations" ON vacations FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert vacations" ON vacations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update vacations" ON vacations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete vacations" ON vacations FOR DELETE TO anon USING (true);