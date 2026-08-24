# DomGo.rs — веб-сайт

Веб-версия приложения на **Next.js 15** (App Router, **static export** → `domgo.rs`). Деплой: render.com, ветка `main`, Static Site.

## Стек
Next.js 15 · Tailwind CSS · TypeScript · Supabase · i18next (RU/SR)

## Структура
```
web/
├── app/              App Router: layout, page, (routes)/
├── components/       React-компоненты (property, agency, layout, forms, ui…)
├── lib/              supabase/client+server, property-listings, authSession, seo-utils
├── providers/        AuthProvider, I18nProvider, ThemeProvider
├── public/           locales/, property.html (deep-link handler), sitemap
└── styles/
```

## Shared-код из `/src` (через алиас `@shared/*` → `../src/`)
- Типы БД: `@shared/lib/database.types`
- Переводы: `@shared/translations/{ru,sr}.json` (зеркало в `web/public/locales/`)
- Утилиты: `@shared/utils/*` (mapCoordinates, contactProfile, propertyRules, propertyListingFilters, authSessionUrl, agencyProfile, webShare, authErrorMessage)
- Константы: `@shared/constants/colors`

⚠️ При правке общих модулей в `/src` — учитывать влияние на web (и наоборот).

## Запуск
```bash
cd web
cp .env.example .env.local   # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL
npm install
npm run dev                  # http://localhost:3000
```
Без env-переменных `npm run build` падает на prerender — это нормально для локальной проверки.

## Команды
```bash
npm run dev     # разработка
npm run build   # production (static export)
npm run lint    # ESLint
```

## Маршруты
`/` (главная), `/prodaja`, `/izdavanje`, `/novogradnja`, `/agencije`, `/oglas/?id=`, `/agencija/?id=`, `/prijava`, `/registracija`, `/zaboravljena-lozinka`, `/auth/callback`, `/auth/reset-password`, `/profil*` (client-gated, `noindex,nofollow`).

Детальные страницы `/oglas` и `/agencija` — client-only; SEO ограничен клиентскими meta-обновлениями после hydration.

## Ключевые инварианты web
- Листинги (`/prodaja`, `/izdavanje`, `/novogradnja`) используют общий helper `web/lib/property-listings.ts` (initial fetch + infinite scroll, дедупликация по `property.id`)
- Фильтры: canonical state в `PropertyListingsClient`, `PropertyFilters` синхронизируется через `value`
- Смена города сбрасывает район; сброс на «Все» реально убирает фильтр из query
- `property_type='land'` → rooms filter очищается; `5+` означает `rooms >= 5`
- Auth: `@supabase/supabase-js` с `flowType: 'implicit'`, `detectSessionInUrl: false` (не `@supabase/ssr` — иначе PKCE-ошибка)
- Web share: capability detection в `webShare.ts`, fallback «Kopiraj link»
- Продуктовый UI по умолчанию на сербской латинице; fallback в `t()` — сербский

Подробнее — в корневом [`MEMORY.md`](../MEMORY.md) §5 (auth), §8 (web-специфика).
