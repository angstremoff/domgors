# ❓ FAQ

## Общее
**Что такое DomGoMobile?** Приложение недвижимости для Сербии (`domgo.rs`): React Native + Expo + Supabase.

**Платформы?** Android (Google Play + RuStore), iOS, Web (`domgo.rs`).

**Языки?** 🇷🇺 Русский, 🇷🇸 Сербский.

## Разработка
**Какая версия Node?** Node ≥18 (реком. v23.7.0), npm ≥10.

**Ошибки сборки Android?**
```bash
cd android && ./gradlew clean && cd .. && ./fix-gradle-build.sh
```

**Metro завис/старый кэш?** `npx expo start --clear`

**Полная переустановка?** `rm -rf node_modules && npm install`

**Как добавить язык?** Создать `translations/<lang>.json`, подключить в `LanguageContext`, добавить переводы в web-mirror `web/public/locales/<lang>/translation.json`.

**Где ключи?** `.env` (Supabase, Google Maps, Sentry). Не коммитить. Шаблон: `.env.example`.

## БД
**Как изменить схему?** Только через Supabase-миграции, затем `supabase gen types typescript` и обновить `src/lib/database.types.ts`.

**Почему `type='rent' AND is_new_building=true`?** Такого быть не должно: новостройки только для продажи. Нормализация — `normalizeNewBuilding()` в `propertyRules.ts`.

## Релизы
**Как опубликовать?** Собрать `.aab` (`./build-release-bundle.sh`) → загрузить в Google Play Console и/или RuStore. OTA выключен — нужен новый build.

**Поднимать versionCode?** Да, для каждого артефакта. ⚠️ Сейчас рассинхрон `app.config.js` (17) и `package.json` (1.0.15.1) — выровнять перед релизом.

## Контакты
Почта: `admin@domgo.rs`.
