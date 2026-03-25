# DomGoMobile — полное описание проекта

## 1. Что это за проект
DomGoMobile — платформа объявлений о недвижимости в Сербии. В одном репозитории живут:
- мобильное приложение на React Native / Expo;
- отдельный веб-сайт на Next.js;
- общая Supabase-инфраструктура для auth, базы данных и storage.

Проект двуязычный (`ru`, `sr`), поддерживает светлую и тёмную тему и использует общие бизнес-правила для объявлений, авторизации и профиля пользователя.

## 2. Правила работы по проекту
- Всё общение и документацию вести на русском.
- Любые новые UI-строки добавлять сразу в `ru` и `sr`.
- Изменения схемы Supabase делать только через миграции, затем обновлять generated types.
- Не считать `any` нормой: в кодовой базе ещё остался техдолг, но новый код должен быть строго типизирован.
- Mobile и web проверяются разными командами:
  - mobile: `npm run check`
  - web: `cd web && npm run build`

## 3. Структура репозитория

### 3.1 Mobile
- Стек: React Native 0.76.9, Expo 52, Hermes, TypeScript.
- Основной код: `/src`
- Вход: `index.ts -> App.tsx -> AppNavigator`
- Нативные каталоги: `/android`, `/ios`

### 3.2 Web
- Стек: Next.js 15 App Router, React, TypeScript
- Код: `/web`
- Это отдельный фронтенд, а не React Native Web-оболочка.

### 3.3 Общие части
- `src/lib/database.types.ts` — generated Supabase types
- `src/translations/ru.json`, `src/translations/sr.json` — основной источник переводов
- `web/public/locales/*` — зеркала переводов для web-совместимости, их нужно держать синхронно

## 4. Архитектура приложения

### 4.1 Mobile
Основные уровни:
- `AuthContext` — сессия, регистрация, логин, логаут
- `PropertyContext` — списки объявлений, пагинация, города, районы, загрузка по id
- `FavoritesContext` — избранное
- `ThemeContext` — светлая/тёмная тема
- `propertyService` — работа с Supabase по объявлениям, storage, кэшам и статусам

Важные файлы:
- [propertyService.ts](/Users/angstremoff/Documents/GitHub/domgomobile/src/services/propertyService.ts)
- [PropertyContext.tsx](/Users/angstremoff/Documents/GitHub/domgomobile/src/contexts/PropertyContext.tsx)
- [AuthContext.tsx](/Users/angstremoff/Documents/GitHub/domgomobile/src/contexts/AuthContext.tsx)
- [AppNavigator.tsx](/Users/angstremoff/Documents/GitHub/domgomobile/src/navigation/AppNavigator.tsx)
- [AppVersionManager.ts](/Users/angstremoff/Documents/GitHub/domgomobile/src/services/AppVersionManager.ts)

### 4.2 Web
Web сейчас живёт в режиме static export.

Что это означает practically:
- детальные страницы `/oglas` и `/agencija` сделаны client-only для стабильности;
- часть SEO-метаданных ставится на клиенте;
- приватные разделы вроде `/profil` защищаются на клиенте, а не через активный middleware;
- неиспользуемый server middleware убран как мёртвый код.

Важные файлы:
- [PropertyListingsClient.tsx](/Users/angstremoff/Documents/GitHub/domgomobile/web/components/property/PropertyListingsClient.tsx)
- [PropertyFilters.tsx](/Users/angstremoff/Documents/GitHub/domgomobile/web/components/property/PropertyFilters.tsx)
- [property-listings.ts](/Users/angstremoff/Documents/GitHub/domgomobile/web/lib/property-listings.ts)
- [propertyListingFilters.ts](/Users/angstremoff/Documents/GitHub/domgomobile/src/utils/propertyListingFilters.ts)
- [AuthProvider.tsx](/Users/angstremoff/Documents/GitHub/domgomobile/web/providers/AuthProvider.tsx)
- [AgencyPageClient.tsx](/Users/angstremoff/Documents/GitHub/domgomobile/web/components/agency/AgencyPageClient.tsx)
- [client.ts](/Users/angstremoff/Documents/GitHub/domgomobile/web/lib/supabase/client.ts)
- [server.ts](/Users/angstremoff/Documents/GitHub/domgomobile/web/lib/supabase/server.ts)

## 5. Supabase и состояние данных

### 5.1 Основные сущности
Ключевые таблицы:
- `users`
- `properties`
- `agency_profiles`
- `favorites`
- `cities`
- `districts`

### 5.2 Важная проблема репозитория
Сейчас репозиторий не является надёжным source of truth по live-схеме Supabase:
- `supabase/export/*` фактически пустые;
- миграции в репо покрывают только часть live-схемы;
- возможен drift между реальной базой, generated types и кодом.

Следствие:
- перед любыми крупными изменениями БД/RLS нужно сначала выгрузить актуальную схему из live Supabase;
- только после этого безопасно делать DB-рефакторинг и регенерировать типы.

Это один из самых важных текущих архитектурных рисков проекта.

## 6. Бизнес-правила объявлений

### 6.1 Общие поля и статусы
Для объявлений важны:
- тип сделки: продажа / аренда / новостройки
- тип недвижимости: квартира / дом / коммерческая / участок
- статус: `active`, `sold`, `rented`

### 6.2 Особый кейс `land`
`property_type = land` — отдельный бизнес-инвариант:
- комнаты не должны требоваться в create/edit;
- rooms filter к участкам не применяется;
- комнаты не показываются в карточках и деталях;
- числовые поля `0/null` нельзя рендерить через truthy-проверки.

Эта логика вынесена в shared helper:
- [propertyRules.ts](/Users/angstremoff/Documents/GitHub/domgomobile/src/utils/propertyRules.ts)

### 6.3 Списки и обновление данных
- Web-листинги после static export обязаны делать тихое клиентское обновление из Supabase после монтирования.
- `/prodaja`, `/izdavanje` и `/novogradnja` должны брать initial page и последующие страницы через единый helper:
  - [property-listings.ts](/Users/angstremoff/Documents/GitHub/domgomobile/web/lib/property-listings.ts)
- Нормализация и переходы состояний фильтров для web вынесены в shared helper:
  - [propertyListingFilters.ts](/Users/angstremoff/Documents/GitHub/domgomobile/src/utils/propertyListingFilters.ts)
- В web-листингах нельзя смешивать reset и infinite scroll в один незащищённый поток:
  - `PropertyListingsClient` сначала синхронизирует первую страницу;
  - только после этого можно подключать `IntersectionObserver` для догрузки.
- Любое объединение страниц объявлений на web должно идти только через дедупликацию по `property.id`.
- Если дубли видны только на web desktop и только в коротких категориях, сначала проверять гонку гидрации/observer, а не БД: первая страница может задвоиться, если `loader` сразу попадает в viewport.
- Для фильтров city/district на web действует жёсткий контракт:
  - canonical state живёт в `PropertyListingsClient`;
  - sidebar `PropertyFilters` controlled и получает `value` от родителя;
  - смена города всегда сбрасывает район;
  - выбор `Все города`/`Все районы` обязан реально удалять соответствующий фильтр из query, а не только из UI.
- Семантика rooms на web должна совпадать с остальным проектом:
  - `5+` это `rooms >= 5`, а не `rooms = 5`;
  - для `land` rooms filter очищается и не уходит в query;
  - numeric `0` нельзя терять из-за truthy-проверок.
- Последние объявления не должны зависеть от ручного применения фильтров.
- Проданные и сданные объявления на web не скрываются полностью, а показываются со статусом.

## 7. Агентства

### 7.1 Реальная typed-схема
Официальные поля `agency_profiles` по generated types:
- `id`
- `user_id`
- `city_id`
- `name`
- `phone`
- `email`
- `site`
- `location`
- `logo_url`
- `description`
- `created_at`

Важно:
- `website`, `instagram`, `facebook` не являются частью официальной typed-схемы;
- их нельзя считать гарантированными колонками БД.

### 7.2 Legacy-нормализация
В проекте есть совместимость со старыми/грязными данными агентств через helper:
- [agencyProfile.ts](/Users/angstremoff/Documents/GitHub/domgomobile/src/utils/agencyProfile.ts)

Он делает две важные вещи:
- нормализует legacy-алиасы вроде `website`, `addr`, `mail`, `telegram_url`, `instagram_url`, `facebook_url`;
- если исторически в `site` лежит Telegram handle или `t.me/...`, helper трактует это как `telegram`, а не как сайт.

### 7.3 Отображение агентств
- Mobile и web теперь опираются на один и тот же нормализованный контракт.
- Карточки и детали агентств не должны запрашивать несуществующие typed-поля из `agency_profiles`.
- Загрузка агентства может фолбечиться с `id` на `user_id`, потому что в старых линках/маршрутах иногда передавался именно `users.id`.

## 8. Auth и email-потоки

### 8.1 Mobile
Регистрация централизована в `AuthContext`.

Ключевое поведение:
- `signUp` использует `emailRedirectTo = domgomobile://auth/callback?source=mobile`
- профиль пользователя синхронизируется через upsert
- экран регистрации не должен дублировать auth-логику напрямую

### 8.2 Web
Регистрация централизована в `web/providers/AuthProvider.tsx`.

Ключевое поведение:
- `signUp` использует `emailRedirectTo = window.location.origin`
- если Supabase возвращает `session = null`, это не ошибка логина, а кейс подтверждения email
- в этом случае UI показывает `confirmEmailSent`, а не редиректит пользователя в профиль

### 8.3 SMTP
Для production встроенный email service Supabase использовать нельзя.

Нужно:
- включить custom SMTP в Supabase Dashboard;
- отправлять письма с реального адреса проекта, сейчас в UI используется `admin@domgo.rs`;
- не считать проблему доставки писем чисто кодовой, если SMTP не настроен.

## 9. Storage и изображения
- Bucket для фото объявлений: `properties`
- Рабочая папка: `property-images/<userId>/<filename>`
- Формат path централизован в:
  - [propertyStorage.ts](/Users/angstremoff/Documents/GitHub/domgomobile/src/utils/propertyStorage.ts)

Важно:
- web и mobile должны грузить изображения по одному и тому же path-контракту;
- удаление файлов должно идти через извлечение реального storage path из URL, а не по одному имени файла.

## 10. Deep links, sharing и навигация

Поддерживаемые deep links:
- `domgomobile://property/<UUID>`
- `domgomobile://agency/<UUID>`
- `domgomobile://auth/callback?...`

Web fallback:
- share/deep-link handler для объявлений ведёт на `property.html`/`oglas?id=...`

В mobile есть отложенная навигация при холодном старте:
- если экран ещё не готов, переход откладывается;
- ретраи ограничены, чтобы не было бесконечных циклов навигации.

## 11. Web-специфика

### 11.1 Static export
Из-за static export:
- детали объявлений и агентств работают client-only;
- SEO для этих страниц частично ставится на клиенте;
- полноценный server SEO для карточек потребует отказа от текущей схемы `output: 'export'`.

### 11.2 Supabase env
Web Supabase client/server теперь работают в fail-fast-режиме:
- без `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` web должен падать явно;
- mock/placeholder-клиенты больше не считаются допустимой архитектурой.

### 11.3 Листинги и гидрация
- [PropertyListingsClient.tsx](/Users/angstremoff/Documents/GitHub/domgomobile/web/components/property/PropertyListingsClient.tsx) отвечает не только за UI фильтров, но и за безопасную синхронизацию списка после static export.
- Актуальный архитектурный контракт:
  - первая клиентская синхронизация и пагинация разделены;
  - `IntersectionObserver` стартует только после первого refresh;
  - merge страниц идёт через helper с дедупликацией;
  - быстрые фильтры и sidebar не имеют независимых canonical state.
- Это защищает web от задвоения карточек при коротких списках, что уже проявлялось в desktop-версиях `Аренда` и `Новостройки`.

### 11.4 Web-фильтры
- [PropertyFilters.tsx](/Users/angstremoff/Documents/GitHub/domgomobile/web/components/property/PropertyFilters.tsx) хранит только локальный draft для UI, но синхронизируется с parent `value`; долговременная правда о фильтрах живёт в `PropertyListingsClient`.
- [propertyListingFilters.ts](/Users/angstremoff/Documents/GitHub/domgomobile/src/utils/propertyListingFilters.ts) задаёт общие правила reset/sanitize:
  - пустые `cityId`/`districtId` становятся `undefined`;
  - смена `propertyType` на `land` очищает `rooms`;
  - helper для rooms query возвращает `gte 5` для варианта `5+`.
- Это было введено после реального бага, когда быстрый select `Все города` визуально сбрасывался, но старый `city_id` оставался в web-query из-за рассинхрона state.

### 11.5 Главная страница
На главной есть карусель последних объявлений:
- автопрокрутка;
- drag-scroll;
- клики по карточкам не должны гаситься drag-логикой.

## 12. Настройки, контакты и store-ссылки
- Текущий Android-store: RuStore
- Ссылка: [RuStore](https://www.rustore.ru/catalog/app/domgo.rs)
- Контактная почта в интерфейсе: `admin@domgo.rs`
- Старые упоминания Google Play больше не актуальны
- В web footer используется бейдж `web/public/badges/rustore-badge.svg`
- В mobile/web настройках используется ключ `settings.update.openRuStore`

## 13. Версии и релизное состояние
Актуальное состояние:
- версия приложения: `1.0.11`
- Android `versionCode`: `16`
- Android `versionName`: `1.0.11`
- iOS `buildNumber`: `16`
- `runtimeVersion`: `1.0.4`

Где это хранится:
- `package.json`
- `package-lock.json`
- `android/app/build.gradle`
- `app.config.js`
- web settings version хранится вручную в `web/app/(routes)/profil/podesavanja/page.tsx`

## 14. Сборка Android release
- Основной script: `./build-release-bundle.sh`
- Результат: `~/Desktop/DomGoMobile-<version>-release.aab`
- Подпись через `android/app/release.keystore`
- Секреты только через env:
  - `RELEASE_KEYSTORE_PASSWORD`
  - `RELEASE_KEY_ALIAS`
  - `RELEASE_KEY_PASSWORD`

APK в проекте нужен в основном для локального QA; для store-релиза используется `.aab`.

## 15. SEO и индексация
В проекте уже есть:
- sitemap
- robots.txt
- JSON-LD
- Open Graph / Twitter metadata
- поисковые верификации

Но важно помнить:
- из-за static export detail SEO для `/oglas` и `/agencija` неполноценный на сервере;
- часть метаданных выставляется клиентом после загрузки страницы.

## 16. Текущие проверки и техдолг

### 16.1 Что уже в зелёном состоянии
- Последняя подтверждённая web-проверка: `cd web && npm run build` проходит (`2026-03-25`)
- Последняя подтверждённая shared/unit-проверка: `npm test` проходит (`2026-03-25`)
- `npm run check` остаётся обязательной проверкой для mobile-изменений
- Тесты сейчас покрывают:
  - deep link parsing
  - agency profile normalization
  - property listing filter helpers

### 16.2 Что остаётся проблемой
- В mobile остаётся исторический lint-хвост, в основном старые `any` и техдолг в старых экранах/утилитах.
- Полноценный аудит БД/RLS по-прежнему нельзя считать завершённым, пока не выгружена живая схема Supabase.
- Web-приватность и detail SEO всё ещё ограничены текущей архитектурой static export.

## 17. Самые важные практические инварианты для новых агентов
- Это два разных фронтенда в одном репозитории, а не “одно приложение + web-оболочка”.
- Mobile и web всегда проверять раздельно.
- `land` — отдельный кейс во всём: create/edit, фильтры, карточки, детали.
- `agency_profiles` typed-схема ограничена `email/site/location`; не придумывать новые колонки в запросах.
- Storage path фото должен быть единым для web и mobile.
- Web-листинги нельзя склеивать сырыми массивами; только merge с дедупликацией по `property.id`.
- В web-листингах сначала завершать initial refresh, потом включать infinite scroll.
- Быстрые web-фильтры и sidebar должны писать в один canonical filter state.
- `Все города`/`Все районы` на web должны удалять фильтр из query, а не только менять UI.
- `5+` комнат на web это `>= 5`.
- Web signup зависит и от кода, и от внешней SMTP-настройки Supabase.
- Без актуального экспорта live-схемы нельзя безопасно делать серьёзные DB/RLS-рефакторы.

## 18. Навигация по документации
- [MEMORY.md](/Users/angstremoff/Documents/GitHub/domgomobile/MEMORY.md) — краткая оперативная память
- [all.md](/Users/angstremoff/Documents/GitHub/domgomobile/all.md) — полный onboarding-файл
