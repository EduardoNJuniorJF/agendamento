-- Add appointment_type column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN appointment_type TEXT;