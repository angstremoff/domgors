# 🗄️ База данных (Supabase / PostgreSQL)

Подробная схема — в корневом [`DATABASE_SCHEMA.md`](../DATABASE_SCHEMA.md). Здесь — краткий обзор.

## Таблицы
| Таблица | Назначение |
|---------|-----------|
| `users` | Профили: id, email, name, phone, avatar_url, is_agency |
| `properties` | Объявления: title, description, type(sale/rent), property_type(apartment/house/commercial/land), price, area, rooms, location, city_id, district_id, images[], features[], coordinates, is_new_building, status, user_id, agency_id |
| `cities` | Города: name, coordinates (обязательны как продуктовый инвариант) |
| `districts` | Районы: name, city_id, coordinates |
| `agency_profiles` | Агентства: name, phone, email, site (Telegram), logo_url, city_id |
| `favorites` | Избранное: user_id + property_id (уникальная пара) |

## Связи
```
users 1—0..1 agency_profiles
users 1—0..* properties 0..*—1 cities
                       0..*—1 districts
properties 1—0..* favorites 0..*—1 users
```

## Ключевые инварианты
- Статусы: `active`, `sold`, `rented`
- `is_new_building=true` возможен только при `type='sale'` (новостройки — подмножество продажи)
- `property_type='land'`: комнаты не показываем/не требуем
- `district_id` nullable; требуется только если у города есть районы
- Имена городов/районов в БД = канонические ключи переводов (синхрон с `translations/{ru,sr}.json`)
- Контактные данные (имя, телефон) живут в `public.users`, не в `properties`

## Безопасность
- **RLS**: публичный SELECT для активных properties/agency_profiles; INSERT/UPDATE/DELETE — только владельцу (`auth.uid() = user_id`)
- Фото: bucket `properties`, path `property-images/<userId>/<file>`; логотипы — bucket `agency-logos`, path `<userId>/<file>`
- Схему БД меняем **только через миграции**, затем `supabase gen types typescript`

## Типичные запросы
```sql
-- Активные объявления по типу сделки
SELECT * FROM properties WHERE status='active' AND type=$1 ORDER BY created_at DESC LIMIT 20;
-- Новостройки
SELECT * FROM properties WHERE status='active' AND type='sale' AND is_new_building=true;
```

## Бэкап
```bash
supabase db dump --data-only > backup.sql
```

⚠️ Репозиторий не содержит полного source of truth по live-схеме (`supabase/export/*` пуст, миграции неполные). Перед серьёзным рефакторингом БД — выгрузить актуальную схему из live Supabase.
