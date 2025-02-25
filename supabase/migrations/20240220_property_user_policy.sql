-- Allow viewing user information when accessing property details
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