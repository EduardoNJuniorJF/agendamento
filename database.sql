-- Fleet Manager - Script SQL Completo
-- Execute este script no SQL Editor do seu painel Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'tecnico');
CREATE TYPE vehicle_status AS ENUM ('available', 'in_use', 'maintenance');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');

-- Profiles table (linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role DEFAULT 'tecnico',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sector TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model TEXT NOT NULL,
    plate TEXT UNIQUE NOT NULL,
    status vehicle_status DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vacations table
CREATE TABLE vacations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    city TEXT NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    expense_status expense_status DEFAULT 'pending',
    status appointment_status DEFAULT 'scheduled',
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacations ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive to start)
-- Profiles: Users can read all, update own
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Agents: Authenticated users can read all, admins can modify
CREATE POLICY "Authenticated users can view agents" ON agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert agents" ON agents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update agents" ON agents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete agents" ON agents FOR DELETE TO authenticated USING (true);

-- Vehicles: Same as agents
CREATE POLICY "Authenticated users can view vehicles" ON vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vehicles" ON vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vehicles" ON vehicles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete vehicles" ON vehicles FOR DELETE TO authenticated USING (true);

-- Vacations: Same pattern
CREATE POLICY "Authenticated users can view vacations" ON vacations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vacations" ON vacations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vacations" ON vacations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete vacations" ON vacations FOR DELETE TO authenticated USING (true);

-- Appointments: Same pattern
CREATE POLICY "Authenticated users can view appointments" ON appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert appointments" ON appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update appointments" ON appointments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete appointments" ON appointments FOR DELETE TO authenticated USING (true);

-- Create indexes for performance
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_agent ON appointments(agent_id);
CREATE INDEX idx_appointments_vehicle ON appointments(vehicle_id);
CREATE INDEX idx_vacations_agent ON vacations(agent_id);
CREATE INDEX idx_vacations_dates ON vacations(start_date, end_date);

-- Function to check vehicle availability
CREATE OR REPLACE FUNCTION check_vehicle_availability(
    p_vehicle_id UUID,
    p_date DATE,
    p_time TIME,
    p_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM appointments
        WHERE vehicle_id = p_vehicle_id
        AND date = p_date
        AND time = p_time
        AND status != 'cancelled'
        AND (p_appointment_id IS NULL OR id != p_appointment_id)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check agent vacation
CREATE OR REPLACE FUNCTION is_agent_on_vacation(
    p_agent_id UUID,
    p_date DATE
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM vacations
        WHERE agent_id = p_agent_id
        AND p_date BETWEEN start_date AND end_date
    );
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Database setup complete! You can now use the Fleet Manager application.' as message;
