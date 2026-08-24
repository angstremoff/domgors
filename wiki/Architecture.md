# 🏗️ Архитектура DomGoMobile

## Высокоуровневая схема
```
┌─ Presentation ─ React-компоненты, Screens, Navigation ─┐
├─ Business ───── Context API, hooks, services ──────────┤
├─ Data ───────── Supabase client, AsyncStorage, types ───┤
└─ Backend ────── PostgreSQL + RLS + Auth + Storage ──────┘
```

## Структура (`/src`)
```
src/
├── components/     UI-компоненты (PropertyCard, FilterModal, MapView…)
├── screens/        Экраны (HomeScreen, AddPropertyScreen, EditPropertyScreen…)
├── contexts/       AuthContext, PropertyContext, FavoritesContext, ThemeContext, LanguageContext
├── services/       propertyService (CRUD, кэш), AppVersionManager
├── navigation/     AppNavigator
├── styles/         темы, глобальные стили
├── translations/   ru.json, sr.json (общие с web через @shared)
├── types/          TypeScript-типы
├── utils/          helpers (filterHelpers, propertyRules, propertyQueryFilters, contactProfile, mapCoordinates…)
├── lib/            supabaseClient, database.types
└── constants/      colors
```
Web (`/web`) и admin (`/admin`) — отдельные Next.js-приложения, тянут общие модули из `/src` через алиас `@shared/*`.

## Управление состоянием
`Context API` + `useReducer` + кастомные hooks. Поток:
```
UserAction → Component → Context → Service → Supabase → DB
    ↑                                                       ↓
UI Update ← State ← Response ← API Response ← Query Result ←─┘
```

## Service Layer
Сервисы инкапсулируют запросы к Supabase и кэширование (`propertyService`): LRU-кэш в памяти (`propertyCache`), кэш городов/районов в AsyncStorage (3 ч). Фильтры листингов: category/город/район — на сервере (`propertyQueryFilters.ts`), price/rooms/area/features — локально (`filterHelpers.ts`).

## Навигация
```
AppNavigator (Stack)
├── Auth Stack: Login, Register, ResetPassword
└── Main Stack
    ├── Tabs: Home, Favorites, Profile
    └── Modals: PropertyDetail, CreateProperty, EditProperty, Settings
```

## Безопасность
- **RLS (Row Level Security):** пользователи видят/редактируют только свои данные
- Auth через Supabase (email+password), сессия в AsyncStorage
- Секреты только через env, не в коде
- Deep links: `domgomobile://property/<id>`, `domgomobile://agency/<id>`, `domgomobile://auth/callback`

## CI/CD
GitHub push → GitHub Actions → EAS Build → ручная загрузка AAB в Google Play / RuStore.
Quality gates: ESLint, tsc, Vitest. OTA выключен — обновления только через новый build.
