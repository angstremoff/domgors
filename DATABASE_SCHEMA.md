# Схема БД DomGoMobile (Supabase / PostgreSQL)

Краткий справочник. Подробности и live-схема — в Supabase (репозиторий не содержит полного source of truth: `supabase/export/*` пуст, миграции неполные).

## Таблицы

### users — профили
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | uuid (PK) | = `auth.users.id` |
| created_at | timestamptz | NOT NULL |
| email | text | NOT NULL, UNIQUE |
| name | text | отображаемое имя |
| phone | text | телефон (контакты централизованы здесь) |
| avatar_url | text | аватар |
| is_agency | bool | представляет ли агентство (default false) |

### properties — объявления
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | uuid (PK) | |
| created_at | timestamptz | |
| title | text | NOT NULL |
| description | text | NOT NULL |
| type | text | `'sale'` \| `'rent'` |
| property_type | text | `'apartment'` \| `'house'` \| `'commercial'` \| `'land'` |
| price | numeric | NOT NULL |
| area | numeric | м² |
| rooms | int | (не требуется для `land`) |
| location | text | адрес |
| city_id | int | FK → cities |
| district_id | text | FK → districts (nullable; требуется только если у города есть районы) |
| images | text[] | URL фото (первый = обложка; до 20) |
| features | text[] | удобства |
| coordinates | jsonb | `{lat, lng}` |
| **is_new_building** | bool | новостройка (**только при `type='sale'`**; nullable) |
| status | text | `'active'` \| `'sold'` \| `'rented'` |
| user_id | uuid | FK → users (владелец) |
| agency_id | uuid | FK → agency_profiles |

### cities — города
| id | name | coordinates (jsonb, **обязательны** — продуктовый инвариант) | created_at |

### districts — районы
| id | name | city_id (FK) | coordinates (jsonb) | is_active | sort_order |

### agency_profiles — агентства
| id | created_at | user_id (FK, UNIQUE) | city_id (FK) | name | phone | email | site (Telegram) | location | logo_url | description |

### favorites — избранное
| id | created_at | user_id (FK) | property_id (FK) | → уникальная пара (user_id, property_id) |

## Связи
```
users 1—0..1 agency_profiles
users 1—0..* properties 0..*—1 cities
                       0..*—1 districts
properties 1—0..* favorites 0..*—1 users
```

## Ключевые инварианты
- `is_new_building = true` возможен **только** при `type = 'sale'` (нормализация в коде: `normalizeNewBuilding()`)
- `property_type = 'land'` → комнаты не требуются/не показываются
- `district_id` nullable; требуется только если у выбранного города есть районы
- Города без районов: безопасный fallback — район «Центар» с координатами центра
- Имена городов/районов в БД = канонические ключи для переводов
- Контактные данные (имя, телефон) в `public.users`, не в `properties`

## Индексы (для производительности)
`properties.type`, `properties.city_id`, `properties.user_id`, `properties.agency_id`, `properties.status`, `favorites.user_id`.

## Безопасность (RLS)
- Публичный SELECT для активных `properties` и `agency_profiles`
- INSERT/UPDATE/DELETE — только владельцу (`auth.uid() = user_id`)
- Storage: bucket `properties` (`property-images/<userId>/<file>`), bucket `agency-logos` (`<userId>/<file>`); публичный SELECT, запись только владельцу

## Изменение схемы
1. Только через Supabase-миграции (`supabase/migrations/`)
2. Сначала проверить в dev-окружении
3. `supabase gen types typescript` → обновить `src/lib/database.types.ts`
4. Обновить RLS-политики при необходимости
5. Обновить клиентский код
