-- Create tables
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT
);

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sale', 'rent')),
    property_type TEXT NOT NULL,
    price DECIMAL NOT NULL,
    area DECIMAL NOT NULL,
    rooms INTEGER NOT NULL,
    location TEXT NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    coordinates JSONB,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT valid_price CHECK (price >= 0),
    CONSTRAINT valid_area CHECK (area >= 0),
    CONSTRAINT valid_rooms CHECK (rooms >= 0)
);

CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(user_id, property_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS properties_type_idx ON public.properties(type);
CREATE INDEX IF NOT EXISTS properties_property_type_idx ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS properties_price_idx ON public.properties(price);
CREATE INDEX IF NOT EXISTS properties_rooms_idx ON public.properties(rooms);
CREATE INDEX IF NOT EXISTS properties_created_at_idx ON public.properties(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own data"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Enable insert for users during registration"
    ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

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

-- Insert sample data
INSERT INTO public.properties (
    title,
    description,
    type,
    property_type,
    price,
    area,
    rooms,
    location,
    images,
    features,
    coordinates
) VALUES
(
    'Современная квартира в центре',
    'Светлая квартира с современным ремонтом',
    'sale',
    'apartment',
    185000,
    75,
    2,
    'Центр города',
    ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&w=500'],
    ARRAY['balcony', 'elevator'],
    '{"lat": 44.787197, "lng": 20.457273}'::jsonb
),
(
    'Уютный дом с садом',
    'Просторный дом с ухоженным садом',
    'rent',
    'house',
    2500,
    150,
    4,
    'Пригород',
    ARRAY['https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&w=500'],
    ARRAY['parking', 'furnished'],
    '{"lat": 44.786567, "lng": 20.448873}'::jsonb
);
