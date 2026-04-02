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
- Для `cities` координаты обязательны как продуктовый инвариант: create/edit forms и карты используют `cities.coordinates` как стартовую точку, если у объявления ещё нет собственных координат.
- Если у города нет полноценного набора районов, безопасный fallback — район `Центар` с координатами центра города; не оставлять новые крупные города совсем без районов.
- Имена городов/районов в БД = канонические ключи для переводов; новые `cities`/`districts` всегда синхронно добавлять в `src/translations/{ru,sr}.json` и `web/public/locales/{ru,sr}/translation.json`.
- Mobile `propertyService` кэширует `cities` и `districts` в AsyncStorage на 3 часа; после сидирования новых городов/районов stale client-cache может скрывать изменения.
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
- Контактные данные объявления архитектурно живут в `public.users`, а не в `properties`: имя и телефон продавца централизованы через `src/utils/contactProfile.ts`.
- Web и mobile create-flow обязаны сначала валидировать/сохранять contact profile, затем публиковать объявление; публикация без телефона недопустима.
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
- Web create/edit property используют карту выбора точки: `PropertyCoordinateSelector` должен стартовать от координат города и сохранять `properties.coordinates`.
- Web list map popup и карточка объявления должны вести на детальную страницу через `/oglas/?id=...`; popup карты кликабелен целиком.
- На web detail page карта объекта встраивается прямо в карточку объявления; переход к ней — компактная icon-only кнопка рядом с адресом.
- На web detail page контактный CTA должен быть `Показать номер` / `Prikaži broj`: после раскрытия номер виден текстом и остаётся кликабельным через `tel:`; сценарий должен быть удобен и для desktop, и для mobile browser.

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
- `src/utils/contactProfile.ts` — единый контракт contact profile (`users.name/phone/email`), валидация и upsert без перезаписи `created_at`.
- `src/utils/mapCoordinates.ts` — parse/get/format/serialize координат городов и объявлений.
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
- `web/components/property/PropertyCoordinateSelector.tsx`, `web/components/property/PropertyMap.tsx`, `web/components/property/PropertyLocationMap.tsx`, `web/components/property/PropertyDetails.tsx` — web-карты create/list/detail и product rules around coordinates, popup routing и phone reveal.
- `web/components/profile/ContactProfileForm.tsx`, `src/screens/ContactInfoScreen.tsx` — отдельное редактирование контактных данных в кабинете на web и mobile.
- `src/services/AppVersionManager.ts` — инвалидация кэшей по версии/сборке.
- `MEMORY.md` — краткая оперативная память, `all.md` — полный onboarding.

## 12. Админ-панель (/admin)
- Next.js 15 App Router, отдельное приложение в `/admin` (не влияет на mobile/web).
- `basePath: '/admin'` — на продакшене доступно по `https://<render-url>/admin`.
- Shared database types из `../src/lib/database.types.ts`.
- Авторизация: Supabase auth (anon client) + проверка email (`ADMIN_EMAIL`).
- Rate limiting: 5 неудачных попыток → блок 15 мин по IP (in-memory Map).
- Сессия: httpOnly cookie `admin_session`, `sameSite: strict`, `secure` в prod, TTL 8ч, path `/`.
- CRUD для таблиц: `users`, `agency_profiles`, `properties` (GET/PUT/DELETE).
- API: `/api/users`, `/api/agencies`, `/api/properties` (+ `/[id]` для PUT/DELETE).
- Middleware: принудительный редирект на `/admin/login` без сессии, security headers на все ответы.
- Security headers: `X-Robots-Tag: noindex`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- `robots.txt` — полный запрет индексации (User-agent: * Disallow: /).
- Деплой: render.com, отдельный сервис, `render.yaml` в корне репо, `rootDir: admin`.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `NEXT_PUBLIC_SITE_URL`.
- Команды: `npm run dev` (dev), `npm run build` (prod), `npm start` (prod server).
- Админ-юзер: `admin@domgo.rs`, пароль: `665708qQ!` (создан в Supabase Auth, email confirmed).
