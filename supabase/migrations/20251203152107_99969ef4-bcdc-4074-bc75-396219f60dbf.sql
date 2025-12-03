-- Add is_penalized column to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_penalized boolean DEFAULT false;

-- Create bonus_settings table for VBC and level values
CREATE TABLE IF NOT EXISTS public.bonus_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_value numeric(10,2) NOT NULL DEFAULT 50.00,
  level_1_value numeric(10,2) NOT NULL DEFAULT 30.00,
  level_2_value numeric(10,2) NOT NULL DEFAULT 50.00,
  level_3_value numeric(10,2) NOT NULL DEFAULT 70.00,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create city_bonus_levels table
CREATE TABLE IF NOT EXISTS public.city_bonus_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text NOT NULL UNIQUE,
  level integer NOT NULL CHECK (level >= 1 AND level <= 3),
  km numeric(10,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bonus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_bonus_levels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bonus_settings
CREATE POLICY "Authenticated users can view bonus_settings" ON public.bonus_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert bonus_settings" ON public.bonus_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can update bonus_settings" ON public.bonus_settings FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can delete bonus_settings" ON public.bonus_settings FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dev'));

-- RLS Policies for city_bonus_levels
CREATE POLICY "Authenticated users can view city_bonus_levels" ON public.city_bonus_levels FOR SELECT USING (true);
CREATE POLICY "Admins can insert city_bonus_levels" ON public.city_bonus_levels FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can update city_bonus_levels" ON public.city_bonus_levels FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dev'));
CREATE POLICY "Admins can delete city_bonus_levels" ON public.city_bonus_levels FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dev'));

-- Insert default bonus settings if not exists
INSERT INTO public.bonus_settings (base_value, level_1_value, level_2_value, level_3_value)
SELECT 50.00, 30.00, 50.00, 70.00
WHERE NOT EXISTS (SELECT 1 FROM public.bonus_settings);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_city_bonus_levels_city_name ON public.city_bonus_levels(city_name);
CREATE INDEX IF NOT EXISTS idx_appointments_is_penalized ON public.appointments(is_penalized);