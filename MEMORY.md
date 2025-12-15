# 🧠 Память проекта DomGoMobile

## 1. Коммуникация и правила
- Общение, комментарии и документация **строго на русском языке** (`RULES.md`). Английский запрещён даже в логах.
- Учитываем весь предыдущий контекст разговора; не задаём вопросы, на которые уже был ответ.
- Придерживаемся TypeScript без `any`; соблюдаем `typescript_safety`, `ui_consistency`, `performance_optimization`, `database_consistency`.
- Любые изменения схемы Supabase проходят через миграции + `supabase gen types typescript`.
- UI: поддерживаем светлую/тёмную тему и систему переводов (`ru`, `sr`).

## 2. Архитектура и стек
- **Мобильное приложение**: Android, iOS на React Native 0.76.9 + Expo ~52 + TypeScript 5.9.2 + Hermes. Код в `/src`, навигация через React Navigation.
- **Веб-сайт (domgo.rs)**: Next.js 15.5.7 + React + TypeScript в `/web`. **Общая база данных Supabase**, но отдельный фронтенд (не React Native Web). Компоненты в `/web/components`, страницы в `/web/app`. Запуск: `npm run dev` (порт 3000).
- **Общее**: Supabase (auth, база данных, storage), i18next (ru/sr), темная/светлая тема, те же API и бизнес-логика.
- Старт мобильного: `index.ts` → `App.tsx` → провайдеры → `AppNavigator`.
- Deep Link: `domgomobile://property/<UUID>`, `domgomobile://agency/<UUID>`, `domgomobile://auth/callback?...`; веб‑фолбек: `https://domgo.rs/property.html?id=<UUID>` (`noindex`, пытается открыть приложение или ведёт на `/oglas?id=<UUID>`).

## 3. Основные сервисы и модули
- `src/services/propertyService.ts`: CRUD объявлений в Supabase, пагинация, retry, загрузка изображений ≤5 МБ (jpg/jpeg/png/webp), работа с Supabase Storage, LRU-кэши `propertyCache`/`apiCache`.
- `src/contexts/PropertyContext.tsx`: хранение списков (`all/sale/rent/newBuildings`), throttling запросов (≥5 минут), выбор города, инкрементальная загрузка.
- `AuthContext`/`FavoritesContext`: Supabase Auth + таблица `favorites`. Сессии в AsyncStorage (`autoRefreshToken`, `persistSession` включены).
- `AppVersionManager`: отслеживает версию приложения/сборки, очищает AsyncStorage/FileSystem/LRU при смене версии. Expo OTA отключены, поэтому перезапуск приложения делается вручную.
- Observability: `src/utils/sentry.ts` (DSN из `.env`, тег `app.version`) и `src/utils/logger.ts`.
- Мобильный адрес в карточках: формат `Город, Район`, район обязателен в создании/редактировании; карта центрируется по району, названия районов переводятся.
- Локализация: i18next (`src/translations/{ru,sr}.json`). Любые новые строки добавляем в оба файла.

## 4. Данные и Supabase
- База описана в `DATABASE_SCHEMA.md` + `supabase/export/*`. Таблицы: `users`, `cities`, `properties`, `agency_profiles`, `favorites`.
- Включён RLS: действия учитывают `user_id`/`agency_id`. Требуемые поля объявлений перечислены в `RULES.md`.
- После изменения схемы: миграция + `supabase gen types typescript`.

## 5. Сборка и релизы
### 5.1 Скрипты и запуск
- **Рекомендуемый запуск для разработки:** `npm run android` (expo run:android) - Metro bundler автоматически запускается, приложение работает в dev-режиме с hot reload
- **Debug APK на эмуляторе:** `npx react-native run-android` - устанавливает debug версию с подключением к Metro
- Быстрая локальная проверка mobile: `npm run check` (lint + typecheck + tests)
- Быстрая локальная проверка web (Next): `cd web && npm run lint && npm run build`
- Локальные APK: `build-simple-apk.sh`, `build-local-apk.sh`, `build-dev-apk.sh`, `build-local-user-apk.sh`.
- Прочие утилиты: `build-apk-eas.sh`, `build-and-upload.sh`, `release-build.sh`, `release.sh`, `create-release.sh`, `easy-build-apk.sh`, `build-simple-apk.sh`, `update-version.sh`, `generate-keystore.sh`, `download-apk.sh`.
- Выпуск AAB: `./build-release-bundle.sh` (оборачивает `gradlew bundleRelease` и кладёт `~/Desktop/DomGoMobile-<версия>-release.aab`).
- Релизный APK для локального QA: `android/app/build/outputs/apk/release/app-release.apk`. Установка через `adb install -r`.
- **ВАЖНО:** Не пытаться собирать release APK через `./gradlew assembleRelease` без keystore файла - упадет с ошибкой. Для релизной сборки использовать скрипты или Metro.

### 5.2 Процесс публикации
- Expo OTA отключены. Каждое обновление публикуется через Google Play/App Store.
- **ВАЖНО: Google Play требует targetSdkVersion 35 (Android 15)** с августа 2024 года для новых приложений и обновлений. Проверить в `android/app/build.gradle` → `targetSdkVersion 35`.
- Минимальные разрешения: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `READ_MEDIA_IMAGES/VIDEO`, `INTERNET`, `VIBRATE`. Чувствительные права (`RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `WRITE_EXTERNAL_STORAGE`) убраны.
- Настройки -> «Проверить обновления» ведёт в Google Play (`https://play.google.com/store/apps/details?id=com.anonymous.DomGoMobile`). Для iOS добавим ссылку после релиза.
- Release checklist для Play Console:
  1. Подготовить `.aab` (см. выше) и включить Play App Signing.
  2. Опубликовать Privacy Policy (`PRIVACY_POLICY.md`) на публичном URL и указать его в Store Listing.
  3. Заполнить Data Safety (собираем email, фото/контент объявлений, избранное, логи ошибок/Sentry, геолокацию по запросу пользователя).
  4. Заполнить раздел App Content → User Generated Content: правила модерации из `RULES.md`, контакты для жалоб.
  5. Добавить скриншоты ≥1080px, иконку 512×512, описания, контактный e-mail/сайт.
  6. Пройти Internal testing (получить Pre-launch report) и после проверки выкатывать Production.
- GitHub CLI `gh` авторизован (user `angstremoff`, scopes `repo`,`workflow`). Команда для перезаливки APK: `gh release upload v<версия> releases/domgo.apk --clobber`.

## 6. Документация и инструменты
- README, WIKI (+ `wiki/*.md`), `AUDIT_REPORT.md`, `IMPLEMENTATION_REPORT.md`, `DATABASE_SCHEMA.md`, `OPTIMIZATION_REPORT.md`, `FIXES_REPORT.md`, `CODE_REVIEW_REPORT.md`, `FINAL_SUMMARY.md`, `FULL_OPTIMIZATION_COMPLETE.md`, `TESTING_CHECKLIST.md`.
- `EXPO_UPDATES_SETUP.md` и `GITHUB_ACTIONS_SETUP.md` помечены как архивные (OTA больше не используются).
- Для диагностики доступен MCP Context7 (`docs/context7-setup.md`).

## 7. Важные напоминания
- **Две платформы**: мобильное (Android/iOS) и веб (Next.js). Общая БД Supabase, но разные фронтенды. Веб не использует React Native Web - это отдельный Next.js проект в `/web`.
- **Веб-особенности**: Hydration: клиентские компоненты с i18next требуют `mounted` проверки. Тема: используем `theme` из next-themes, не `resolvedTheme`.
- При шаринге объявлений используем `https://domgo.rs/property.html?id=<UUID>` — страница `noindex`, пытается открыть приложение, иначе ведёт на `https://domgo.rs/oglas?id=<UUID>` и показывает кнопку установки.
- В репозитории есть **две веб-сборки**: Next.js сайт в `/web` (сборка в `web/out`) и Expo Web (React Native Web) экспорт в `dist` (см. `netlify.toml`: `npx expo export -p web`) — не путать.
- TypeScript: корневой `npm run typecheck` проверяет mobile и **исключает `web/`**; web проверяем через `cd web && npm run build` (Next делает проверку типов на сборке).
- Любые новые задачи, связанные с публикацией, должны учитывать требования Google Play и наличие AAB; APK используется только для локального тестирования.
- iOS нюансы: симулятор не умеет `tel:` — в PropertyDetails показываем алерт и копируем номер в буфер; фильтры имеют safe-area паддинг и расширенный hitSlop для кнопки закрытия; заголовок DomGo.rs на iOS выровнен влево, а блок выбора города сдвинут для предотвращения наложения.
- Supabase агенты: `agency_profiles.user_id` 1:1 к `users.id`, `properties.agency_id` → `agency_profiles.id`. Есть триггер на `agency_profiles` (after insert/update) для заполнения `agency_id` у объявлений по `user_id`, и триггер на `properties` (before insert/update user_id) для автоподстановки `agency_id`. Разовая синхронизация: `update properties p set agency_id = ap.id from agency_profiles ap where p.user_id = ap.user_id and p.agency_id is null`.
- При достижении остатка контекста ~5% нужно сжимать контекст (конспект, выжимка последних шагов).
- Важно (web, SEO и стабильность): страницы `/oglas` и `/agencija` переведены в client-only режим (без `generateMetadata`) из-за падений RSC при static export. Метатеги для карточек теперь ставятся только на клиенте через `PropertyPageClient`/`AgencyPageClient`, поэтому серверный HTML содержит общие метаданные. Для полноценного SEO карточек требуется вернуть серверную генерацию (динамический рендер или отказ от `output: 'export'`).
- Supabase-клиент web: если нет `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, возвращается безопасный мок (ошибка в ответах, но без исключений). При наличии env используется обычный `createBrowserClient`.
- Подвал: краткий описательный текст теперь один и тянется из переводов (`footer.aboutLine` в ru/sr), убраны дубли двух языков.

## 8. Обновление версий и сборки
- Версия приложения (отображается в настройках и в store): `package.json` → `version`, синхронизирована с `package-lock.json` (поле `version` в корне и в корневом пакете).
- Android: `android/app/build.gradle` → `defaultConfig.versionCode` (целое, растёт) и `versionName` (строка, совпадает с версией приложения).
 - iOS: `app.config.js` → `ios.buildNumber` (строка) и `version` берётся из `APP_VERSION`/`package.json` (настроено через `APP_VERSION` env или pkg.version).
- Runtime остаётся фиксированным: `app.config.js` → `runtimeVersion` (не менять без миграции обновлений), сейчас 1.0.4.
- Fallback версии в коде: `src/services/AppVersionManager.ts` хранит запасное значение (держать в актуальной версии приложения).
- Сборка AAB: `./build-release-bundle.sh` (использует версию из package.json, кладёт на Desktop `DomGoMobile-<версия>-release.aab`). Перед запуском убедиться, что `release.keystore` актуальный.
- Keystore release: `android/app/release.keystore` (секреты берём из 1Password/секретного хранилища; в сборке использовать env: `RELEASE_KEYSTORE_PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD`).

### 8.1 Секреты и безопасность
- Не храним пароли, ключи, токены и base64-контент в публичных файлах репозитория. Все чувствительные данные кладём в секретные хранилища (1Password, GitHub Secrets) и передаём в сборку через переменные окружения.

### 8.2 Deep Link и UI-тема Android
- Deep link: есть мгновенная навигация к экрану объявления при активном приложении + отложенные ретраи при холодном старте; экран деталей дотягивает данные по `propertyId`, если не пришли в параметрах.
- Android системная навигационная панель синхронизируется с темой через `expo-navigation-bar` (фон и стиль кнопок меняются под светлую/тёмную тему).
- Агентства deep link: `domgomobile://agency/<UUID>`; на вебе используем `/agencija/?id=<UUID>` (Next). `parseDeepLink` также поддерживает legacy `https://domgo.rs/agency.html?id=<UUID>` если такой линк прилетит. Android манифест содержит intent-filter (`scheme=domgomobile`, host=agency, pathPrefix=/).

## 9. Районы (districts)
- Схема: таблица `districts` (id uuid PK, city_id FK → cities, name, is_active, sort_order, latitude, longitude), колонка `properties.district_id` (FK → districts). Индексы: `districts_city_id_idx`, `districts_city_name_unique`, `properties_district_id_idx`.
- RLS: включаем RLS на `districts`; политика select (как для cities). Insert/update — через service_role или нужные правила. Предупреждения Supabase про RLS нужно закрыть.
- Миграции (актуальные): `20250218110000_add_coordinates_to_districts.sql` (latitude/longitude), `20250218110100_seed_districts.sql` (сид всех районов), `20250218110200_migrate_banja_koviljaca.sql` (перенос объявлений города Баня Ковиляча в Лозницу, район «Ковиљача Бања», архивирование города).
- Фронт: поддержка района в фильтрах (HomeScreen — «Все районы» после выбора города), формах создания/редактирования, отображении карточек/деталей (адрес `Город, Район`). В выборке данных сервисы возвращают `district` с координатами.
- Типы: `src/lib/database.types.ts` — автоген (лучше не править руками); после миграций обязательно прогнать `supabase gen types typescript`.
- Важный фикс: в `PropertyContext` автозагрузка районов в useEffect не должна зависеть от loadDistricts, иначе цикл ререндеров. Сейчас зависимость убрана, стоит комментарий.

## 10. Веб: агентства и i18n
- Веб агентства: список в `/web/app/(routes)/agencije/page.tsx` грузит `agency_profiles` и ведёт на детальную страницу `/agencija/?id=<UUID>` (`/web/app/(routes)/agencija/page.tsx`). Детальная (`AgencyPageClient`) показывает контакты/описание и объявления агентства (сначала по `agency_id`, потом фолбек по `user_id`), карточки объявлений кликабельны. **Фильтрация по городу реализована в `AgenciesListClient.tsx`** через `useMemo`, фильтрующий строго по `city_id`.
- UI-кнопки используют обычные `Button` без `asChild` (иначе ошибка DOM). Контакты открывают tel/mailto/сайт.
- Переводы веб обновлены: новые ключи для агентств, 404, загрузок, фильтров, профиля и галереи (ru/sr). Домашняя страница, формы, ЛК и фильтры тянут строки из i18n. `I18nProvider` синхронизирует `document.lang`.
- Фичи в деталях объявления переводятся через i18n (`features.*`). Карточки **не показывают дату** публикации (убрано для чистоты UI).
- Избранное на веб: карточки имеют активное сердце, добавление/удаление идёт через таблицу `favorites`; в разделе избранного карточки остаются кликабельны, а при снятии лайка карточка удаляется из списка.
- Списки Продажа/Аренда/Новостройки/Агентства: бесконечная подгрузка по 50 штук, фильтрация работает при выборе города даже без района, догрузка через IntersectionObserver. **Объявления со статусом sold/rented тоже отображаются** — фильтр `.eq('status', 'active')` убран.
- Профиль: "Настройки" ведёт на `/profil/podesavanja`, "Добавить объявление" из "Мои объявления" ведёт на `/oglas/novi`.
- Деплой Render: обязательно `Root Directory = web`, иначе Next берёт корневой lockfile; очищать build cache перед сборкой при смене root.
- Веб-форма создания объявлений: страница `/oglas/novi` (доступна из профиля). Авторизация обязательна; город и район обязательны; минимум 1 фото (до 10, ≤5 МБ, jpg/jpeg/png/webp). Фото грузятся в Supabase Storage `properties/property-images/<userId>/...`; после сохранения редирект на `/oglas/?id=<id>`. `/oglas` без `id` теперь показывает not-found вместо бесконечной загрузки.
- **Карточки объявлений** (`PropertyCard.tsx`): отображают маркеры типа сделки (Продажа — синий, Аренда — оранжевый) слева сверху, маркер статуса (Продано/Сдано) и маркер Новостройки справа. **Проданные/сданные объявления отображаются с эффектом grayscale** на фото.

## 11. Веб: управление объявлениями в профиле
- **Страница "Мои объявления"** (`/profil/moji-oglasi/page.tsx`): отображает объявления пользователя с кнопками управления:
  - Редактировать → переход на `/oglas/izmeni/?id=<id>`
  - Удалить → с подтверждением через `confirm()`
  - Пометить как Продано/Сдано → обновление `status` в базе
  - Вернуть в активные → установка `status: 'active'`
- **Страница редактирования** (`/oglas/izmeni/page.tsx`): загружает данные объявления по `id` из query params, проверяет владельца (`user_id === user.id`), позволяет редактировать все поля (кроме типа сделки и типа недвижимости — они заблокированы), добавлять/удалять фото, сохраняет изменения в Supabase.
- **Удаление объявления**: при удалении сначала удаляются фото из Supabase Storage (извлечение пути из URL `property-images/...`), затем запись из БД.
- **Supabase типизация**: при использовании `.update()` на таблице `properties` TypeScript выдаёт ошибку типа `never`. Решение — добавить `// @ts-expect-error - Supabase types issue` перед вызовом `.update()`. Это особенность сгенерированных типов, функционально код работает корректно.
- Переводы: ключи `property.editProperty`, `property.updateSuccess`, `property.updateError`, `common.accessDenied`, `common.notEditable` добавлены в `ru` и `sr`.

## 12. Веб: настройки профиля
- **Страница настроек** (`/profil/podesavanja/page.tsx`): создана по аналогии с мобильным `SettingsScreen.tsx`. Секции:
  - Уведомления (заглушка с модальным окном)
  - Аккаунт (email + кнопка выхода)
  - О приложении (версия, помощь, ссылка на Google Play, контакты, условия размещения)
- Модальные окна для информационных сообщений реализованы inline (без отдельного компонента).

## 13. UI исправления веб-версии
- **Hero-секция** (`app/page.tsx`): убран дублирующийся заголовок "DomGo.rs", уменьшены вертикальные отступы `py-16` → `py-6`. **CTA секция теперь учитывает авторизацию** — для залогиненных показывает кнопку "Добавить объявление" → `/oglas/novi`, для гостей — "Регистрация".
- **Header** (`components/layout/Header.tsx`): добавлен `flex-shrink-0` к логотипу для предотвращения сжатия на мобильных; уменьшены отступы `space-x-4` → `space-x-2 sm:space-x-4` для предотвращения наезда переключателя языка на логотип.

## 14. SEO и Аналитика (Web)

### 14.1 Поисковая оптимизация
- **Верификация поисковиков**:
  - Google Search Console: `web/public/google543a84de6483d7b7.html` + мета-тег в layout.tsx
  - Google Search Console (Domain property): верификация **через DNS** (TXT/CNAME). Для `domgo.rs` добавлена CNAME запись: `jvkynjdksfgt` → `gv-uiyqloxnqat74x.dv.googlehosted.com` (TTL 14400)
  - Яндекс Вебмастер: `web/public/yandex_5d2c280f46e86563.html`, `yandex_5d2c288f46a86563.html`
- **Metadata** (`web/app/layout.tsx`):
  - Двуязычные title/description (sr + ru)
  - 20+ ключевых слов на обоих языках
  - Open Graph и Twitter Card теги
  - hreflang альтернативы (sr-RS, ru-RU)
  - viewport с темой для светлой/тёмной
- **JSON-LD структурированные данные** (layout.tsx):
  - `RealEstateAgent` schema для организации
  - `WebSite` schema с SearchAction
- **Sitemap** (`web/app/sitemap.ts`):
  - Динамическая генерация с `force-static`
  - Статические страницы + все активные объявления + агентства
  - Приоритеты: главная 1.0, разделы 0.8, объявления 0.7, агентства 0.6
- **robots.txt** (`web/public/robots.txt`):
  - Блокировка `/api/`, `/_next/`, `/profil/`
  - Разрешение `Allow: /manifest.json` (иначе его блокирует правило `Disallow: /*.json$`)
  - Директива `Host` для Яндекса
  - `Crawl-delay: 1` для Яндекса
- **Favicon**: `web/public/favicon.ico` — валидный ICO (не PNG с расширением `.ico`), чтобы Google/Яндекс корректно подтягивали иконку
- **Noindex**: технические страницы закрыты от индексации: `web/public/property.html`, `web/public/og-image.html`
- **Хлебные крошки**: компонент `web/components/seo/Breadcrumbs.tsx` с JSON-LD BreadcrumbList, добавлен на страницы prodaja, izdavanje, novogradnja, agencije
- **Метаданные страниц**: уникальные title/description/keywords/canonical для каждой основной страницы

### 14.2 Аналитика
- **Google Analytics**: ID `G-B3K5RCDEFZ`
- **Яндекс.Метрика**: ID `10081034` (webvisor, clickmap, trackLinks включены)
- **Компонент** `web/components/Analytics.tsx`:
  - Next.js Script с `afterInteractive`
  - Отслеживание переходов через usePathname
  - noscript fallback для Яндекса

### 14.3 PWA и прочее
- **manifest.json**: для добавления на главный экран
- **Preconnect**: fonts.googleapis.com, mc.yandex.ru, googletagmanager.com
- **Footer**: SEO-текст на двух языках, ссылка на Google Play, schema.org разметка

### 14.4 Шаринг объявлений
- Веб-версия использует `https://domgo.rs/property.html?id=<UUID>` (как мобильное)
- `property.html` закрыт от индексации (`noindex`), проверяет платформу, пробует открыть приложение, fallback на сайт
- Формируется информативный текст с ценой и городом
- Fallback: копирование в буфер обмена если navigator.share недоступен

### 14.5 Deep Link Web Fallback
- `property.html` перенаправляет на `/oglas?id=...` если приложение не открылось

### 14.6 Клиентские SEO-хелперы
- **`web/lib/seo-utils.ts`**: функции `generatePropertyTitle()`, `generatePropertyDescription()`, `generateAgencyTitle()` для формирования SEO-заголовков на клиенте
- **`web/lib/seo-head.ts`**: утилиты `upsertMetaTag()`, `setCanonicalLink()`, `upsertJsonLd()` для динамической вставки метатегов в DOM
- Используются в `PropertyPageClient` и `AgencyPageClient` для установки метаданных на клиенте (т.к. серверный `generateMetadata` недоступен при static export)

### 14.7 Исправления типов и фильтрации
- **Фильтрация агентств** (`AgenciesListClient.tsx`): строгая проверка по `city_id` вместо fuzzy-поиска по location
- **Типы в sitemap.ts**: явное приведение типов для результатов Supabase-запросов
- **`useCallback` в moji-oglasi**: `loadProperties` обёрнут для устранения React warnings о зависимостях

## 15. Изменения 2025‑12‑14 (важное)
- Google Search Console: настроена DNS‑верификация доменного свойства через CNAME (см. раздел 14.1)
- SEO: `robots.txt` разрешает `manifest.json`; favicon приведён к корректному ICO
- Mobile: `npm run check` проходит; `tsconfig.json` исключает `web/` из корневого typecheck
- DeepLink: ID объявлений/агентств — UUID; тесты `deepLinkParser` обновлены под UUID
- TypeScript: добавлен `src/types/assets.d.ts` для импортов изображений (вместо `require()`)
- Логи: русские сообщения и префиксы в `src/utils/logger.ts` (английские теги/сообщения не используем)
- Отчёт ревью: `docs/code-review-2025-12-14.md`
