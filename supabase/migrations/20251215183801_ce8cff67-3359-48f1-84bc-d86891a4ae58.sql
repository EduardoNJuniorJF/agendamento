-- Create birthdays table
CREATE TABLE public.birthdays (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_name text NOT NULL,
    birth_date date NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create seasonal_dates table
CREATE TABLE public.seasonal_dates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    day integer NOT NULL CHECK (day >= 1 AND day <= 31),
    month integer NOT NULL CHECK (month >= 1 AND month <= 12),
    image_url text,
    location text DEFAULT 'brasil', -- 'brasil' or 'tres_rios'
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.birthdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for birthdays - Only DEV can access
CREATE POLICY "Only dev can view birthdays"
ON public.birthdays FOR SELECT
USING (has_role(auth.uid(), 'dev'));

CREATE POLICY "Only dev can insert birthdays"
ON public.birthdays FOR INSERT
WITH CHECK (has_role(auth.uid(), 'dev'));

CREATE POLICY "Only dev can update birthdays"
ON public.birthdays FOR UPDATE
USING (has_role(auth.uid(), 'dev'))
WITH CHECK (has_role(auth.uid(), 'dev'));

CREATE POLICY "Only dev can delete birthdays"
ON public.birthdays FOR DELETE
USING (has_role(auth.uid(), 'dev'));

-- RLS Policies for seasonal_dates - Only DEV can access
CREATE POLICY "Only dev can view seasonal_dates"
ON public.seasonal_dates FOR SELECT
USING (has_role(auth.uid(), 'dev'));

CREATE POLICY "Only dev can insert seasonal_dates"
ON public.seasonal_dates FOR INSERT
WITH CHECK (has_role(auth.uid(), 'dev'));

CREATE POLICY "Only dev can update seasonal_dates"
ON public.seasonal_dates FOR UPDATE
USING (has_role(auth.uid(), 'dev'))
WITH CHECK (has_role(auth.uid(), 'dev'));

CREATE POLICY "Only dev can delete seasonal_dates"
ON public.seasonal_dates FOR DELETE
USING (has_role(auth.uid(), 'dev'));

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('celebrations', 'celebrations', true);

-- Storage policies
CREATE POLICY "Anyone can view celebration images"
ON storage.objects FOR SELECT
USING (bucket_id = 'celebrations');

CREATE POLICY "Dev can upload celebration images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'celebrations' AND has_role(auth.uid(), 'dev'));

CREATE POLICY "Dev can update celebration images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'celebrations' AND has_role(auth.uid(), 'dev'));

CREATE POLICY "Dev can delete celebration images"
ON storage.objects FOR DELETE
USING (bucket_id = 'celebrations' AND has_role(auth.uid(), 'dev'));

-- Create indexes for performance
CREATE INDEX idx_birthdays_birth_date ON public.birthdays(birth_date);
CREATE INDEX idx_seasonal_dates_month_day ON public.seasonal_dates(month, day);