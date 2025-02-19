# DomGors - Real Estate Platform

## Overview
DomGors - современная платформа для поиска и размещения объявлений о недвижимости.

## Функционал
- Аутентификация пользователей
- Размещение объявлений о недвижимости
- Поиск по городам
- Загрузка и управление изображениями
- Адаптивный дизайн

## Технологии
- React
- TypeScript
- Supabase (Backend и Аутентификация)
- Tailwind CSS

## Начало работы

1. Клонировать репозиторий:
```bash
git clone https://github.com/angstremoff/domgors.git
```

2. Установить зависимости:
```bash
npm install
```

3. Создать файл `.env` в корневой директории с учетными данными Supabase:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Запустить сервер разработки:
```bash
npm run dev
```

## Оптимизация
В проекте используются следующие индексы для оптимизации поиска:
```sql
CREATE INDEX properties_type_idx ON properties(type);
CREATE INDEX properties_property_type_idx ON properties(property_type);
CREATE INDEX properties_price_idx ON properties(price);
CREATE INDEX properties_rooms_idx ON properties(rooms);
CREATE INDEX properties_created_at_idx ON properties(created_at DESC);
```

## Лицензия
MIT
