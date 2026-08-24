# ⚙️ Установка и настройка

## Требования
- **Node.js** ≥18 (реком. v23.7.0), **npm** ≥10
- **Android:** Android SDK 35 (minSdk 24), JDK 17, эмулятор или устройство с USB-отладкой
- **iOS (только macOS):** Xcode ≥14, CocoaPods

## Установка
```bash
git clone https://github.com/angstremoff/domgomobile.git
cd domgomobile
npm install
cp .env.example .env   # заполнить ключи
npm start              # expo start --dev-client
```

## Переменные окружения (.env)
```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=...
GOOGLE_MAPS_API_KEY=...   # карты Android
SENTRY_DSN=...            # опционально, мониторинг ошибок
```

## Запуск на платформах
```bash
npm run android     # expo run:android (сборка + установка)
npm run android:emu # через эмулятор (scripts/run_android.sh)
npm run ios         # expo run:ios
npm run web         # expo start --web
```

## Сборка релизов
```bash
./build-simple-apk.sh      # быстрый локальный APK
./build-local-apk.sh       # оптимизированный локальный APK
./build-release-bundle.sh  # релизный .aab → ~/Desktop
```
Подпись: env `ANDROID_KEYSTORE_FILE` / `RELEASE_KEYSTORE_PASSWORD` / `RELEASE_KEY_ALIAS` / `RELEASE_KEY_PASSWORD`. Keystore **не** коммитить.

## Web / Admin
```bash
cd web && npm install && npm run build      # требует NEXT_PUBLIC_SUPABASE_*
cd admin && npm install && npm run build    # отдельное приложение
```

## Проверки
```bash
npm run check   # lint + typecheck + vitest (mobile)
```

## Типичные проблемы
- **Ошибки сборки Android:** `cd android && ./gradlew clean && cd .. && ./fix-gradle-build.sh`
- **Metro кэш:** `npx expo start --clear`
- **node_modules:** `rm -rf node_modules && npm install`
