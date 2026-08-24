# 📖 DomGoMobile — Wiki

Кросс-платформенное приложение недвижимости (Сербия, `domgo.rs`). Один репозиторий = 3 приложения (mobile RN, web Next.js, admin Next.js) + общий Supabase.

## Навигация
| Документ | О чём |
|----------|-------|
| [Project-Overview](./wiki/Project-Overview.md) | Цели, аудитория, функциональность |
| [Installation](./wiki/Installation.md) | Настройка окружения, запуск |
| [Architecture](./wiki/Architecture.md) | Архитектура и структура проекта |
| [Database](./wiki/Database.md) | Схема БД Supabase |
| [FAQ](./wiki/FAQ.md) | Частые вопросы |

## Стек
```
Frontend:  React Native 0.76.9 + Expo 52 + TypeScript 5.9
Web:       Next.js 15 (App Router, static export)
Admin:     Next.js 15 (basePath: /admin)
Backend:   Supabase (PostgreSQL + RLS + Auth + Storage)
I18n:      react-i18next (ru/sr)
Maps:      React Native Maps
Tests:     Vitest
```

## Ключевые документы корня
- [`MEMORY.md`](./MEMORY.md) — оперативная память проекта (главный справочник)
- [`RULES.md`](./RULES.md) — правила разработки
- [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) — схема БД
- [`docs/archive/ARCHIVE.md`](./docs/archive/ARCHIVE.md) — устаревшие отчёты

## Статус
| Параметр | Значение |
|----------|----------|
| Версия | 1.0.15.1 |
| Платформы | Android (Google Play + RuStore), iOS, Web |
| Языки | 🇷🇺 Русский, 🇷🇸 Сербский |

---
© 2025 DomGo.
