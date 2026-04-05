# Память проекта DomGoMobile

## 1. Базовые правила
- Всё общение, комментарии и документация ведём на русском.
- Новые UI-строки всегда добавляем в `ru` и `sr`.
- Схему Supabase меняем только через миграции, затем обновляем типы.
- Root `npm run typecheck` проверяет mobile и не проверяет `web`; web всегда проверять отдельно.
- TypeScript strict обязателен; `any` в проекте ещё есть, но это техдолг, а не норма.
- Web-деплой: render.com, ветка `main`, обычный Node Web Service для Next.js runtime. После push нужно убедиться, что render пересобрал сервис (Manual Deploy → Clear build cache при необходимости).

## 2. Что находится в репозитории
- Это один репозиторий с двумя разными фронтендами и общей Supabase:
  - mobile: React Native 0.76.9 + Expo 52, код в `/src`, вход `index.ts -> App.tsx -> AppNavigator`;
  - web: Next.js 15 App Router в `/web`, отдельный сайт `domgo.rs`.
- Web больше не `static export`: это Next.js runtime с server metadata для SEO-критичных страниц. `/oglas` и `/agencija` читают `?id=` на сервере, отдают canonical/OG/Twitter/JSON-LD и реальный 404 при отсутствии сущности; приватные web-страницы по-прежнему защищаются на клиенте, активного Next middleware сейчас нет.

## 3. Что проверять после изменений
- Mobile: `npm run check`
- Shared/unit tests: `npm test`
- Web: `cd web && npm run build` (требует env `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`; без них падает на prerender — это нормально для локальной проверки)
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
- Фото: максимум 20 на объявление (константа `MAX_IMAGES = 20` в web; hardcoded `>= 20` в mobile).
- Порядок фото: `images: string[]` — первый элемент = обложка. Web edit-форма использует unified `ImageItem[]` (discriminated union `existing | new`) для reorder всех фото в одном массиве.
- Web create/edit: reorder кнопки (↑↓★) без drag-and-drop, без внешних зависимостей.
- Добавлять новые фото можно до 20; превышение — сообщение `addProperty.validation.maxPhotosReached`.
- `crypto.randomUUID()` не использовать — заменён на `Date.now()-random` для совместимости с HTTP.
- В state updater (`setImages`/`setFiles`) нельзя вызывать `URL.revokeObjectURL` — это side effect; выносить наружу.
- Object URLs (`URL.createObjectURL`) нужно чистить через `useEffect` cleanup при unmount через ref.
- Если `uploadNewImages()` не вернул URL для нового фото — бросать ошибку, а не писать `""` в БД.

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
- `Authentication -> Auth Hooks` в Supabase должны оставаться пустыми/выключенными, если hooks не настроены осознанно.
- `auth.users` и `public.users` — разные сущности; удаление пользователя из `Authentication` при оставшейся строке в `public.users` может ломать повторную регистрацию (`Database error saving new user`).
- Клиентский sync профиля в `public.users` должен upsert'ить только `id/email` и не должен перетирать `created_at`.
- Контактные данные объявления архитектурно живут в `public.users`, а не в `properties`: имя и телефон продавца централизованы через `src/utils/contactProfile.ts`.
- Web и mobile create-flow обязаны сначала валидировать/сохранять contact profile, затем публиковать объявление; публикация без телефона недопустима.
- Deep links: `domgomobile://property/<UUID>`, `domgomobile://agency/<UUID>`, `domgomobile://auth/callback?...`
- `https://domgo.rs/property.html?id=<UUID>` — канонический web-обработчик шаринга объявления: на mobile сначала пытается открыть приложение (`domgomobile://...` / Android intent), при неуспехе тихо переводит на `https://domgo.rs/oglas?id=<UUID>`; экран установки/скачивания в этом флоу не показываем.

## 6. Агентства
- Официальные поля `agency_profiles`: `id`, `user_id`, `city_id`, `name`, `phone`, `email`, `site`, `location`, `logo_url`, `description`, `created_at`.
- Полей `website`, `instagram`, `facebook` в typed-схеме нет; не запрашивать и не считать их официальной схемой.
- `site` в контактной форме агентства — только для Telegram; label «Telegram», placeholder `@username ili t.me/...`. Колонка `site` в БД не переименована из-за связей.
- Логотипы агентств: bucket `agency-logos`, path `${userId}/${Date.now()}.${ext}`, лимит 5MB. Storage policies: публичный SELECT, INSERT/UPDATE/DELETE только для владельца (папка = `auth.uid()`). RLS на таблицу `agency_profiles`: публичный SELECT, INSERT/UPDATE для владельца (`user_id = auth.uid()`).
- Логотип upload: `uploadAgencyLogo` в `src/utils/agencyProfile.ts`; при ошибке upload — `logo_url` не сохраняется.
- Для совместимости legacy-значения агентств нормализуются через `src/utils/agencyProfile.ts`.
- На карточке объявления: если `user.is_agency === true`, лейбл «Agencija» вместо «Vlasnik»; название агентства — кликабельная ссылка на `/agencija?id=<agency_id>`. Данные агентства подгружаются из `agency_profiles` по `property.agency_id`.

## 7. Важная правда о БД
- Репозиторий сейчас не содержит надёжного source of truth по live-схеме:
  - `supabase/export/*` пустые;
  - миграции в репо неполные и покрывают не всю живую БД.
- В live Supabase, вероятно, есть auth/profile-логика и/или триггеры, которых нет в репозитории; любые ошибки signup/profile sync нельзя объяснять только фронтом, пока live schema не выгружена.
- Перед любым серьёзным рефакторингом БД/RLS нужно сначала выгрузить актуальную схему из live Supabase и заново сгенерировать типы.

## 8. Web-специфика
- Web-листинги после server snapshot/ISR обязаны тихо обновлять объявления из Supabase после монтирования; нельзя полагаться только на `initialProperties`.
- Для `/prodaja`, `/izdavanje`, `/novogradnja` initial fetch и client pagination используют общий helper `web/lib/property-listings.ts`, а не копии query по страницам.
- В `PropertyListingsClient.tsx` initial refresh и infinite scroll разделены: `IntersectionObserver` нельзя включать до завершения первого refresh.
- Любое слияние web-листингов делать только с дедупликацией по `property.id`.
- Web-фильтры: canonical state живёт в `PropertyListingsClient`, `PropertyFilters` синхронизируется через `value`.
- Смена города на web всегда сбрасывает район; сброс на «Все города»/«Все районы» обязан реально убирать фильтр из query.
- Семантика комнат на web: `5+` означает `rooms >= 5`; для `property_type = land` rooms filter автоматически очищается.
- `/oglas` и `/agencija` SEO-критичны: route page на сервере читает `searchParams.id`, делает fetch из Supabase, выставляет metadata/canonical и должен вызывать `notFound()` для невалидного или удалённого объекта.
- `/profil*` должны оставаться `noindex,nofollow` через route layout; `robots.txt` в одиночку недостаточен.
- `sitemap.xml` должен использовать те же canonical URL, что и страницы: `/prodaja`, `/izdavanje`, `/novogradnja`, `/agencije`, `/oglas?id=...`, `/agencija?id=...`.
- Web Supabase client fail-fast: без env-переменных web падает явно.
- Web i18n в рантайме использует shared `src/translations/{ru,sr}.json`; зеркала в `web/public/locales/*` держать синхронно.
- Продуктовый UI на `domgo.rs` по умолчанию на сербской латинице; русские hardcoded/fallback-строки в публичных web-flow — баг. Все fallback-значения в `t()` вызовах должны быть на сербском.
- I18n hydration: `I18nProvider` обёрнут в `<div style={{ display: 'contents' }} suppressHydrationWarning>` для устранения React #418 при SSR + клиентском i18n.
- Web Supabase client кэшируется (singleton в `web/lib/supabase/client.ts`); безопасно вызывать `createClient()` в любом компоненте.
- Web create/edit property: inline-валидация каждого обязательного поля (красная рамка `border-error` + текст ошибки на сербском). При submit — `scrollIntoView` к первому незаполненному полю. Ошибки сбрасываются при вводе. Формы имеют `noValidate`. Поля: контакты (имя, телефон), заголовок, цена, площадь, комнаты (если не `land`), город, район, адрес, описание, фото. Ключи переводов: `property.addProperty.validation.{titleRequired,priceRequired,areaRequired,roomsRequired,addressRequired,descriptionRequired,cityRequired,districtRequired}` в `sr` и `ru`.
- На web detail page контактный CTA: `Prikaži broj` → раскрытие номера текстом + `tel:` ссылка.

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
- Секреты только через env: `RELEASE_KEYSTORE_PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD`

## 11. Ключевые файлы
- `src/services/propertyService.ts` — CRUD объявлений, storage, статусные операции, кэши.
- `src/contexts/PropertyContext.tsx` — списки, пагинация, города/районы, загрузка по id.
- `src/screens/AddPropertyScreen.tsx` и `src/screens/EditPropertyScreen.tsx` — mobile create/edit property.
- `src/utils/contactProfile.ts` — единый контракт contact profile, валидация и upsert.
- `src/utils/mapCoordinates.ts` — parse/get/format/serialize координат.
- `src/utils/propertyRules.ts` — общие правила для `rooms/land`.
- `src/utils/propertyListingFilters.ts` — shared helper для фильтров.
- `src/utils/propertyStorage.ts` — единый контракт storage path.
- `src/utils/agencyProfile.ts` — нормализация агентств, форматирование ссылок, uploadAgencyLogo, fetchAgencyProfileByUserId, upsertAgencyProfile.
- `src/contexts/AuthContext.tsx` и `web/providers/AuthProvider.tsx` — auth/signup flow.
- `web/lib/authSession.ts` и `src/utils/authSessionUrl.ts` — разбор callback'ов.
- `src/utils/deepLinkParser.ts` — разбор property/agency/auth deep links и web-handler URL.
- `src/utils/authErrorMessage.ts` — безопасное отображение auth-ошибок.
- `web/lib/property-listings.ts` — единый web-helper для initial fetch, пагинации, дедупликации.
- `web/lib/seo-page-data.ts` — server fetch и metadata builder для `/oglas` и `/agencija`.
- `web/components/property/AddPropertyForm.tsx` — web create: `noValidate`, `FieldErrors` state, inline-валидация всех полей, `scrollIntoView`, `clearFieldError`, `handleCityChange` очищает `city`/`district` ошибки.
- `web/app/(routes)/oglas/izmeni/EditPropertyPageClient.tsx` — web edit: та же схема inline-валидации.
- `web/components/property/PropertyDetails.tsx` — detail page с agency logic (is_agency → Agencija label + ссылка).
- `web/app/(routes)/oglas/page.tsx` и `web/app/(routes)/agencija/page.tsx` — server-side SEO route pages для detail URL с `?id=`.
- `web/components/property/PropertyPageClient.tsx` и `web/components/agency/AgencyPageClient.tsx` — client render detail page + синхронизация meta при смене языка после hydration.
- `web/public/property.html` — публичный web-обработчик deep link/шеринга объявления: попытка открыть приложение, затем тихий переход на web без экрана установки.
- `web/components/property/PropertyListingsClient.tsx` — client refresh, infinite scroll, canonical filter state.
- `web/components/property/PropertyFilters.tsx` — controlled sidebar filters.
- `web/components/profile/ContactProfileForm.tsx` — редактирование контактных данных + секция Агентства (без телефона, Telegram-only).
- `web/app/(routes)/profil/layout.tsx` — route-level `noindex,nofollow` для private profile pages.
- `web/providers/I18nProvider.tsx` — i18n с `suppressHydrationWarning`, `display: contents` обёрткой.
- `MEMORY.md` — краткая оперативная память, `all.md` — полный onboarding.

## 12. Админ-панель (/admin)
- Next.js 15 App Router, отдельное приложение в `/admin` (не влияет на mobile/web).
- `basePath: '/admin'` — на продакшене доступно по `https://<render-url>/admin`.
- Авторизация: Supabase auth (anon client) + проверка email (`ADMIN_EMAIL`).
- Rate limiting: 5 неудачных попыток → блок 15 мин по IP.
- Сессия: httpOnly cookie `admin_session`, `sameSite: strict`, `secure` в prod, TTL 8ч.
- CRUD для таблиц: `users`, `agency_profiles`, `properties` (GET/PUT/DELETE).
- Деплой: render.com, ветка `admin-only`, отдельный Web Service, `rootDir: admin`.
- Админ-юзер: `admin@domgo.rs`, пароль: `665708qQ!`
