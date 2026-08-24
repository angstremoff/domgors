# 🏠 DomGoMobile

**Кросс-платформенное приложение для поиска и размещения объявлений о недвижимости** (Сербия, `domgo.rs`).

[![Version](https://img.shields.io/badge/version-1.0.15.1-blue.svg)](./package.json)
[![React Native](https://img.shields.io/badge/React%20Native-0.76.9-61DAFB.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-52-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)

## ✨ Возможности
- 🔍 Поиск с фильтрацией по типу сделки/недвижимости, цене, площади, комнатам, городу, району
- 🏗️ Новостройки — отдельная категория (только для продажи)
- ❤️ Избранное, 🗺️ карта с геолокацией, 🏢 профили агентств
- 🌍 Мультиязычность: русский / сербский
- 🔐 Auth: email+password (Supabase), deep links (`domgomobile://`)

## 🏗️ Репозиторий = 3 приложения + общий бэкенд
| Часть | Стек | Где |
|-------|------|-----|
| **mobile** | React Native 0.76.9 + Expo 52 (bare/prebuild) + TypeScript | `/src` |
| **web** | Next.js 15 App Router, static export → `domgo.rs` | `/web` |
| **admin** | Next.js 15, `basePath: /admin` | `/admin` |
| **backend** | Supabase (PostgreSQL + RLS + Auth + Storage) | — |

Деплой web/admin: render.com. Один репозиторий, общие модули в `/src` (web тянет через `@shared/*`).

## 🚀 Быстрый старт
```bash
git clone https://github.com/angstremoff/domgomobile.git
cd domgomobile
npm install
cp .env.example .env   # заполнить Supabase, Google Maps, Sentry
npm start              # expo start --dev-client
```
Требования: Node ≥18 (реком. v23), npm ≥10, Android SDK 35 (minSdk 24), JDK 17.

## 📱 Сборка
```bash
./build-simple-apk.sh       # быстрый локальный APK
./build-local-apk.sh        # оптимизированный локальный APK
./build-release-bundle.sh   # релизный .aab → на рабочий стол
```
Подпись: `ANDROID_KEYSTORE_FILE` (или `android/app/release.keystore`). Секреты только через env: `RELEASE_KEYSTORE_PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD`. Keystore в репозиторий **не** коммитить.

## 📦 Публикация
- **Android:** Google Play (AAB) **и** RuStore — оба канала активны
- Package: `domgo.rs`, targetSdk 35, minSdk 24
- Разрешения: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `INTERNET`, `VIBRATE`
- Политика конфиденциальности: [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md), публичный URL (напр. `https://domgo.rs/privacy`)

## 🧪 Проверки
```bash
npm run check               # mobile: lint + typecheck + vitest
cd web && npm run build     # web (требует NEXT_PUBLIC_SUPABASE_*)
cd admin && npm run build   # admin (отдельный install)
```
Внимание: root `npm run check` не покрывает `web` (исключён), `admin` проверяется отдельно.

## 📚 Документация
| Документ | О чём |
|----------|-------|
| [MEMORY.md](./MEMORY.md) | Оперативная память проекта — инварианты, auth, deep links, ключевые файлы |
| [RULES.md](./RULES.md) | Правила разработки (🇷🇺 русский, TypeScript strict, миграции БД) |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Схема БД Supabase |
| [WIKI.md](./WIKI.md) | Wiki-навигация |
| [docs/archive/ARCHIVE.md](./docs/archive/ARCHIVE.md) | Устаревшие исторические отчёты |

## 🤝 Участие
1. Fork → ветка `feature/...` 2. TypeScript для нового кода 3. Тесты для новой логики 4. Комментарии/документация на 🇷🇺 русском 5. PR.

---

© 2025 DomGo. [admin@domgo.rs](mailto:admin@domgo.rs)
