# Память проекта DomGoMobile

## 1. Базовые правила
- Всё общение, комментарии и документация ведём на русском.
- Новые UI-строки всегда добавляем в `ru` и `sr`.
- Схему Supabase меняем только через миграции, затем обновляем типы.
- Root `npm run typecheck` проверяет mobile и не проверяет `web`; web всегда проверять отдельно.
- TypeScript strict обязателен; `any` в проекте ещё есть, но это техдолг, а не норма.

## 2. Что находится в репозитории
- Это один репозиторий с двумя разными фронтендами и общей Supabase:
  - mobile: React Native 0.76.9 + Expo 52, код в `/src`, вход `index.ts -> App.tsx -> AppNavigator`;
  - web: Next.js 15 App Router в `/web`, отдельный сайт `domgo.rs`.
- Web работает как static export. Детальные страницы `/oglas` и `/agencija` client-only; приватные web-страницы защищаются на клиенте, активного Next middleware сейчас нет.

## 3. Что проверять после изменений
- Mobile: `npm run check`
- Web: `cd web && npm run build`
- Актуальное состояние: обе проверки проходят; в mobile остаётся исторический lint-хвост `71 warnings`, в основном старые `any`.

## 4. Ключевые инварианты данных
- Основные таблицы: `users`, `properties`, `agency_profiles`, `favorites`, `cities`, `districts`.
- Статусы объявлений: `active`, `sold`, `rented`.
- `property_type = land` — особый кейс:
  - комнаты не показываем;
  - rooms filter не применяем;
  - `rooms` не должен требоваться в create/edit;
  - числовые поля нельзя рендерить через truthy-проверки, если возможен `0`.
- Фото объявлений должны жить единообразно:
  - bucket: `properties`
  - path: `property-images/<userId>/<filename>`
  - удаление только через извлечение storage path из URL, а не по одному filename.

## 5. Auth, email и deep links
- Mobile регистрация централизована в `AuthContext`; `signUp` использует `emailRedirectTo = domgomobile://auth/callback?source=mobile`.
- Web регистрация централизована в `web/providers/AuthProvider.tsx`; `signUp` использует `emailRedirectTo = window.location.origin`.
- Если web `signUp` вернул `session = null`, нельзя редиректить пользователя в профиль; нужно показывать `auth.confirmEmailSent`.
- Для production нельзя полагаться на built-in email service Supabase; нужен custom SMTP вне репозитория.
- Deep links:
  - `domgomobile://property/<UUID>`
  - `domgomobile://agency/<UUID>`
  - `domgomobile://auth/callback?...`

## 6. Агентства
- Официальные поля `agency_profiles` по типам: `id`, `user_id`, `city_id`, `name`, `phone`, `email`, `site`, `location`, `logo_url`, `description`, `created_at`.
- Полей `website`, `instagram`, `facebook` в typed-схеме нет; не запрашивать и не считать их официальной схемой.
- Для совместимости legacy-значения агентств нормализуются через `src/utils/agencyProfile.ts`.
- Если `site` исторически содержит Telegram handle/URL, helper переводит его в `telegram`, а не считает сайтом.

## 7. Важная правда о БД
- Репозиторий сейчас не содержит надёжного source of truth по live-схеме:
  - `supabase/export/*` пустые;
  - миграции в репо неполные и покрывают не всю живую БД.
- Перед любым серьёзным рефакторингом БД/RLS нужно сначала выгрузить актуальную схему из live Supabase и заново сгенерировать типы.

## 8. Web-специфика
- Web-листинги после static export обязаны тихо обновлять объявления из Supabase после монтирования; нельзя полагаться только на `initialProperties`.
- Web Supabase client/server теперь fail-fast: без `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` web должен падать явно, а не работать на mock/placeholder.
- Карусель последних объявлений на главной не должна ломать обычный клик по карточке.
- Web i18n в рантайме использует shared `src/translations/{ru,sr}.json`; зеркала в `web/public/locales/*` держать синхронно.

## 9. Актуальный релизный контекст
- Текущая версия: `1.0.11`
- Android `versionCode`: `16`
- iOS `buildNumber`: `16`
- `runtimeVersion`: `1.0.4` — не менять без отдельной причины.
- Android-store сейчас только RuStore:
  - ссылка: `https://www.rustore.ru/catalog/app/domgo.rs`
  - старый `openGooglePlay` больше не актуален.
- Контактная почта в UI: `admin@domgo.rs`

## 10. Сборка релизов
- Release AAB: `./build-release-bundle.sh`
- Результат: `~/Desktop/DomGoMobile-<версия>-release.aab`
- Подпись: `android/app/release.keystore`
- Секреты только через env:
  - `RELEASE_KEYSTORE_PASSWORD`
  - `RELEASE_KEY_ALIAS`
  - `RELEASE_KEY_PASSWORD`

## 11. Ключевые файлы
- `src/services/propertyService.ts` — CRUD объявлений, storage, статусные операции, кэши.
- `src/contexts/PropertyContext.tsx` — списки, пагинация, города/районы, загрузка по id.
- `src/utils/propertyRules.ts` — общие правила для `rooms/land`.
- `src/utils/propertyStorage.ts` — единый контракт storage path.
- `src/utils/agencyProfile.ts` — нормализация агентств и форматирование ссылок.
- `src/contexts/AuthContext.tsx` и `web/providers/AuthProvider.tsx` — auth/signup flow.
- `src/services/AppVersionManager.ts` — инвалидация кэшей по версии/сборке.
- `MEMORY.md` — краткая оперативная память, `all.md` — полный onboarding.
