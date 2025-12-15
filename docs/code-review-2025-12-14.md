# Полный код‑ревью DomGoMobile (2025‑12‑14)

## 1) Резюме (сейчас)

- **Web (Next.js, domgo.rs):** сборка и линт проходят (`web`: `npm run build`, `npm run lint`).
- **Mobile (Expo/RN):** локальный «контрольный прогон» теперь проходит (`npm run check`).
- **SEO‑база:** есть `robots.txt`, `sitemap.xml`, метаданные (OG/Twitter), JSON‑LD, файлы верификации Google/Яндекс.
- **Домен в Google Search Console (Domain property):** требует DNS‑верификацию (CNAME/TXT) на стороне регистратора/хостинга.

## 2) Верификация домена (Google / Яндекс)

### Google Search Console
- **URL‑prefix property** уже может верифицироваться через файл `web/public/google543a84de6483d7b7.html` и/или `metadata.verification.google` в `web/app/layout.tsx`.
- **Domain property** верифицируется **только через DNS** (TXT/CNAME). Если в консоли показан CNAME:
  - Host/Label: например `jvkynjdksfgt` (в некоторых панелях нужно без `.domgo.rs`)
  - Target: `gv-....dv.googlehosted.com`
  - После добавления дождаться DNS‑распространения и нажать **Verify**.

### Яндекс Вебмастер
- В проекте есть файлы верификации:
  - `web/public/yandex_5d2c280f46e86563.html`
  - `web/public/yandex_5d2c288f46a86563.html`
- Также указан `metadata.verification.yandex` в `web/app/layout.tsx`.

## 3) SEO‑аудит (Web)

### Что сделано хорошо
- `web/app/layout.tsx`: базовые мета‑теги, OpenGraph/Twitter, `robots`, `alternates` (hreflang), `manifest`, `icons`, `verification`.
- JSON‑LD: `RealEstateAgent` и `WebSite` schema.
- `web/app/sitemap.ts`: генерация sitemap со статическими разделами и динамическими URL для объявлений/агентств.
- `web/public/robots.txt`: есть `Sitemap` и `Host` (важно для Яндекса), закрыты служебные пути.

### Рекомендации (приоритет «Важно»)
- В Google Search Console и Яндекс Вебмастер:
  - добавить/переотправить `https://domgo.rs/sitemap.xml`;
  - проверить, что `robots.txt` доступен по `https://domgo.rs/robots.txt`.
- Следить за страницами личного кабинета/редактирования:
  - они должны быть `noindex` и/или закрыты правилами в `robots.txt` (в проекте это уже учтено).

## 4) Иконка сайта (favicon) и индексация

- Файл `web/public/favicon.ico` — валидный ICO‑контейнер и подключается через `metadata.icons` в `web/app/layout.tsx`.
- Обычно Google/Яндекс подтягивают favicon не сразу: обновление может занять от нескольких часов до нескольких дней.
- Проверка:
  - Google: Search Console → URL Inspection → «Просмотреть опубликованную страницу» и «Запросить индексирование».
  - Яндекс: Вебмастер → Индексирование → проверить «Роботс/Сайтмап», затем переобход.

## 5) Техническое ревью (Mobile)

### Что было критично и исправлено
- `tsc --noEmit` падал из‑за захвата `web/**` (конфликт типов React и алиасы). Решено исключением `web/` из `tsconfig.json`.
- `vitest` падал из‑за тестов, ожидающих не‑UUID id. Обновлены тесты под UUID (id объявлений/агентств в базе — UUID).
- `eslint` падал на правилах и паттернах (`no-empty-pattern`, `prefer-const`, `no-require-imports`). Исправлено без изменения логики приложения.

### Что ещё стоит улучшить (приоритет «Желательно»)
- Уменьшать количество `any` (сейчас большинство — предупреждения ESLint).
- Минимизировать `@ts-ignore` (лучше `@ts-expect-error` с пояснением).
- Привести все сообщения логов/ошибок к русскому (часть уже исправлена, но стоит пройтись по проекту системно).

## 6) Безопасность

- DeepLink ID валидируются как UUID — это правильная защита от мусорных/вредоносных параметров.
- Конфигурация Supabase берётся из env‑переменных; при отсутствии ключей выводится диагностический лог (без падения).
- Рекомендация: регулярно проверять RLS‑политики и ограничивать публичные выборки для web‑sitemap (лимиты уже стоят).

## 7) Команды для быстрой проверки

- Mobile: `npm run check`
- Web: `cd web && npm run lint && npm run build`

