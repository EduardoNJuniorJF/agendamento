-- Add end_date column to time_off table for multi-day time off periods
ALTER TABLE public.time_off ADD COLUMN end_date date NULL;

-- Add comment explaining the column usage
COMMENT ON COLUMN public.time_off.end_date IS 'Optional end date for multi-day time off periods. When null, the time off is for a single day (date column only).';