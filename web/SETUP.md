# Настройка и запуск веб-сайта

## Требования
- Node.js ≥18, npm ≥10
- Настроенный проект Supabase (общий с mobile)

## 1. Установка
```bash
cd web
npm install
```

## 2. Переменные окружения
```bash
cp .env.example .env.local
```
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>   # anon, НЕ service_role
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # https://domgo.rs для prod
```
Без этих переменных `npm run build` падает на prerender — нормально для локальной разработки (`npm run dev` работает).

## 3. Актуальность типов БД
При изменении схемы в Supabase — из корня репозитория:
```bash
supabase gen types typescript --project-id <id> > src/lib/database.types.ts
```
Web тянет типы через `@shared/lib/database.types`.

## 4. Запуск
```bash
npm run dev    # http://localhost:3000
```

## Проверка
- `/prodaja`, `/izdavanje`, `/novogradnja` — листинги
- `/oglas/?id=<uuid>` — детали
- `/prijava`, `/registracija` — auth

## Типичные проблемы
- **Invalid URL / API key** — проверить `NEXT_PUBLIC_SUPABASE_*` (URL с `https://`, anon-key)
- **Ошибки импорта типов** — `../src/lib/database.types.ts` существует, `tsconfig.json` paths корректны (`@shared/*`)
- **Ошибки сборки** — `rm -rf node_modules .next && npm install && npm run dev`
- **PKCE-ошибка auth** — использовать `@supabase/supabase-js` с `flowType: 'implicit'`, не `@supabase/ssr`

## Production
```bash
npm run build   # static export
```
Деплой: render.com, ветка `main`, Static Site, rootDir `web`. После push убедиться, что render пересобрал (Manual Deploy → Clear build cache при необходимости).

Подробнее — в корневом [`MEMORY.md`](../MEMORY.md).
