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
- Shared/unit tests: `npm test`
- Web: `cd web && npm run build`
- Последние подтверждённые проверки `2026-03-27`: `npm run check`, `npm test`, `cd web && npm run build`.
- Автотесты пока не покрывают e2e-критические сценарии `signup/login/reset password` и `create/edit property`; зелёный `check/build` = smoke-проверка кода, а не полное пользовательское e2e.

## 4. Ключевые инварианты данных
- Основные таблицы: `users`, `properties`, `agency_profiles`, `favorites`, `cities`, `districts`.
- Статусы объявлений: `active`, `sold`, `rented`.
- `property_type = land` — особый кейс:
  - комнаты не показываем;
  - rooms filter не применяем;
  - `rooms` не должен требоваться в create/edit;
  - числовые поля нельзя рендерить через truthy-проверки, если возможен `0`.
- `properties.district_id` nullable; create/edit на web и mobile должны требовать район только если у выбранного города реально есть районы, иначе сохранять `district_id = null`.
- Фото объявлений должны жить единообразно:
  - bucket: `properties`
  - path: `property-images/<userId>/<filename>`
  - удаление только через извлечение storage path из URL, а не по одному filename.

## 5. Auth, email и deep links
- Auth-канал продуктово только один: `email + password`; phone/SMS auth в текущей архитектуре не используется.
- `Magic link` и phone auth продуктово не используются; в Supabase критичны только email signup/login/reset.
- Mobile регистрация централизована в `AuthContext`; `signUp` использует web callback `https://domgo.rs/auth/callback/`.
- Web регистрация централизована в `web/providers/AuthProvider.tsx`; `signUp` использует `/auth/callback/`.
- Восстановление пароля идёт через `/zaboravljena-lozinka/` -> `/auth/reset-password/`.
- Обязательные web auth-роуты: `/prijava`, `/registracija`, `/zaboravljena-lozinka/`, `/auth/callback/`, `/auth/reset-password/`.
- Mobile app умеет принимать handoff через `domgomobile://auth/callback?...` для подтверждения email и recovery.
- Mobile auth-изменения появляются у пользователей только после нового build/release приложения; web auth-изменения — только после деплоя сайта.
- Если web `signUp` вернул `session = null`, нельзя редиректить пользователя в профиль; нужно показывать `auth.confirmEmailSent`.
- Web browser auth должен идти через `@supabase/supabase-js` с `flowType: 'implicit'` и `detectSessionInUrl: false`; использование browser-клиента `@supabase/ssr` приводило к PKCE-ошибке `both auth code and code verifier should be non-empty`.
- Web callback/recovery должен уметь обрабатывать `access_token + refresh_token`, `code`, `token_hash` и уже созданную session; логика централизована в `web/lib/authSession.ts` и `src/utils/authSessionUrl.ts`.
- User-facing auth-ошибки должны быть безопасными и продуктово-понятными; не показывать сырые тексты Supabase вроде `Database error saving new user`, SMTP/internal errors и т.п.
- Для production нельзя полагаться на built-in email service Supabase; нужен custom SMTP вне репозитория.
- Built-in SMTP Supabase допустим только как временная диагностика auth-flow.
- Если custom SMTP на Adriahost/cPanel не работает, в Supabase нужно использовать реальный `Outgoing Server` из панели; `mail.domgo.rs` нельзя считать рабочим host без настроенного DNS.
- `Authentication -> Auth Hooks` в Supabase должны оставаться пустыми/выключенными, если hooks не настроены осознанно.
- `auth.users` и `public.users` — разные сущности; удаление пользователя из `Authentication` при оставшейся строке в `public.users` может ломать повторную регистрацию (`Database error saving new user`).
- Клиентский sync профиля в `public.users` должен upsert’ить только `id/email` и не должен перетирать `created_at`.
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
- В live Supabase, вероятно, есть auth/profile-логика и/или триггеры, которых нет в репозитории; любые ошибки signup/profile sync нельзя объяснять только фронтом, пока live schema не выгружена.
- Перед любым серьёзным рефакторингом БД/RLS нужно сначала выгрузить актуальную схему из live Supabase и заново сгенерировать типы.

## 8. Web-специфика
- Web-листинги после static export обязаны тихо обновлять объявления из Supabase после монтирования; нельзя полагаться только на `initialProperties`.
- Для `/prodaja`, `/izdavanje`, `/novogradnja` initial fetch и client pagination должны использовать общий helper `web/lib/property-listings.ts`, а не копии query по страницам.
- В `web/components/property/PropertyListingsClient.tsx` initial refresh и infinite scroll должны быть разделены: `IntersectionObserver` нельзя включать до завершения первого refresh, иначе короткие desktop-списки могут задвоить первую страницу.
- Любое слияние web-листингов делать только с дедупликацией по `property.id`.
- Web-фильтры листингов должны иметь один источник правды: canonical state живёт в `PropertyListingsClient`, а `PropertyFilters` синхронизируется через `value`, без отдельного постоянного state для city/district.
- Смена города на web всегда сбрасывает район; сброс на `Все города`/`Все районы` обязан реально убирать фильтр из query, а не оставлять старый state.
- Семантика комнат на web: `5+` означает `rooms >= 5`; для `property_type = land` rooms filter автоматически очищается и в query не уходит.
- Web Supabase client/server теперь fail-fast: без `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` web должен падать явно, а не работать на mock/placeholder.
- Карусель последних объявлений на главной не должна ломать обычный клик по карточке.
- Web i18n в рантайме использует shared `src/translations/{ru,sr}.json`; зеркала в `web/public/locales/*` держать синхронно.
- Продуктовый UI на `domgo.rs` по умолчанию должен быть на сербской латинице; русские hardcoded/fallback-строки в публичных web-flow считаются багом.

## 9. Актуальный релизный контекст
- Текущая версия: `1.0.12`
- Android `versionCode`: `17`
- iOS `buildNumber`: `17`
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
- `src/screens/AddPropertyScreen.tsx` и `src/screens/EditPropertyScreen.tsx` — mobile create/edit property, district/null logic, image upload order.
- `src/utils/propertyRules.ts` — общие правила для `rooms/land`.
- `src/utils/propertyListingFilters.ts` — shared helper для sanitize/reset/filter transitions и семантики rooms (`5+`, `land`) в web-листингах.
- `src/utils/propertyStorage.ts` — единый контракт storage path.
- `src/utils/agencyProfile.ts` — нормализация агентств и форматирование ссылок.
- `src/contexts/AuthContext.tsx` и `web/providers/AuthProvider.tsx` — auth/signup flow.
- `web/lib/authSession.ts` и `src/utils/authSessionUrl.ts` — разбор signup/recovery callback’ов и handoff в app.
- `src/utils/authErrorMessage.ts` — безопасное отображение auth-ошибок без утечки внутренних текстов Supabase.
- `src/screens/ForgotPasswordScreen.tsx`, `src/screens/ResetPasswordScreen.tsx`, `web/components/forms/ForgotPasswordForm.tsx`, `web/components/forms/ResetPasswordForm.tsx`, `web/components/forms/AuthCallbackClient.tsx` — email reset/callback flow.
- `web/lib/property-listings.ts` — единый web-helper для initial fetch, пагинации и дедупликации листингов.
- `web/components/property/AddPropertyForm.tsx` и `web/app/(routes)/oglas/izmeni/EditPropertyPageClient.tsx` — web create/edit property, district/null logic, sr-localized validation.
- `web/components/property/PropertyListingsClient.tsx` — client refresh, infinite scroll и canonical filter state на web.
- `web/components/property/PropertyFilters.tsx` — controlled sidebar filters; не должен расходиться с быстрыми фильтрами.
- `src/services/AppVersionManager.ts` — инвалидация кэшей по версии/сборке.
- `MEMORY.md` — краткая оперативная память, `all.md` — полный onboarding.
