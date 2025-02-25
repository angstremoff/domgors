-- Create cities table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    coordinates JSONB NOT NULL
);

-- Update city coordinates
UPDATE public.cities 
SET coordinates = '{"lat": 46.100376, "lng": 19.666641}'::jsonb 
WHERE name = 'Суботица';

UPDATE public.cities 
SET coordinates = '{"lat": 44.533329, "lng": 19.223273}'::jsonb 
WHERE name = 'Лозница';

UPDATE public.cities 
SET coordinates = '{"lat": 44.012794, "lng": 20.926773}'::jsonb 
WHERE name = 'Крагуевац';

-- Create index for city names
CREATE INDEX IF NOT EXISTS cities_name_idx ON public.cities(name);

-- Enable RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cities data
CREATE POLICY "Anyone can view cities"
    ON public.cities
    FOR SELECT
    TO public
    USING (true);