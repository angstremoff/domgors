-- Включаем RLS на agency_profiles
ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;

-- Публичное чтение: любой может читать профили агентств (для листинга и детальных страниц)
CREATE POLICY "agency_profiles_select_public"
  ON public.agency_profiles
  FOR SELECT
  USING (true);

-- Владелец может читать свой профиль
-- (дублирует публичную политику, но явно для clarity)
CREATE POLICY "agency_profiles_select_owner"
  ON public.agency_profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Аутентифицированный пользователь может вставлять свой профиль
CREATE POLICY "agency_profiles_insert_owner"
  ON public.agency_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Аутентифицированный пользователь может обновлять свой профиль
CREATE POLICY "agency_profiles_update_owner"
  ON public.agency_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
