-- Complete Schema for DomGo Real Estate Application

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    avatar_url TEXT
);

-- Create cities table
CREATE TABLE IF NOT EXISTS public.cities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    coordinates JSONB NOT NULL
);

-- Create properties table with city reference
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sale', 'rent')),
    property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'house', 'commercial', 'land')),
    price DECIMAL NOT NULL,
    area DECIMAL NOT NULL,
    rooms INTEGER NOT NULL,
    location TEXT NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    coordinates JSONB,
    status TEXT CHECK (status IN ('active', 'sold', 'rented')) DEFAULT 'active',
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    city_id INTEGER REFERENCES public.cities(id),
    CONSTRAINT valid_price CHECK (price >= 0),
    CONSTRAINT valid_area CHECK (area >= 0),
    CONSTRAINT valid_rooms CHECK (rooms >= 0)
);

-- Create favorites table for user-property relationships
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(user_id, property_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS properties_type_idx ON public.properties(type);
CREATE INDEX IF NOT EXISTS properties_property_type_idx ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS properties_price_idx ON public.properties(price);
CREATE INDEX IF NOT EXISTS properties_rooms_idx ON public.properties(rooms);
CREATE INDEX IF NOT EXISTS properties_created_at_idx ON public.properties(created_at DESC);
CREATE INDEX IF NOT EXISTS properties_city_id_idx ON public.properties(city_id);
CREATE INDEX IF NOT EXISTS cities_name_idx ON public.cities(name);
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS favorites_property_id_idx ON public.favorites(property_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view their own data"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own record"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for users during registration"
    ON public.users
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow viewing user information for property listings"
    ON public.users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.properties
            WHERE properties.user_id = users.id
        )
    );

-- Property policies
CREATE POLICY "Anyone can view properties"
    ON public.properties
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert properties"
    ON public.properties
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties"
    ON public.properties
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties"
    ON public.properties
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view their own favorites"
    ON public.favorites
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites"
    ON public.favorites
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Cities policies
CREATE POLICY "Anyone can view cities"
    ON public.cities
    FOR SELECT
    TO public
    USING (true);

-- Insert sample cities data
INSERT INTO public.cities (name, coordinates) VALUES
('Белград', '{"lat": 44.787197, "lng": 20.457273}'::jsonb),
('Нови-Сад', '{"lat": 45.251667, "lng": 19.836944}'::jsonb),
('Ниш', '{"lat": 43.320904, "lng": 21.895761}'::jsonb),
('Крагуевац', '{"lat": 44.012794, "lng": 20.926773}'::jsonb),
('Суботица', '{"lat": 46.100376, "lng": 19.666641}'::jsonb),
('Лозница', '{"lat": 44.533329, "lng": 19.223273}'::jsonb)
ON CONFLICT (name) DO UPDATE
SET coordinates = EXCLUDED.coordinates;

-- Create function to handle property status updates
CREATE OR REPLACE FUNCTION update_property_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If property type is sale and status is changed to sold
    IF NEW.type = 'sale' AND NEW.status = 'sold' AND OLD.status != 'sold' THEN
        NEW.status := 'sold';
    -- If property type is rent and status is changed to rented
    ELSIF NEW.type = 'rent' AND NEW.status = 'sold' AND OLD.status != 'sold' THEN
        NEW.status := 'rented';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for property status updates
CREATE TRIGGER trigger_update_property_status
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION update_property_status();

-- Create function to handle user profile updates
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();