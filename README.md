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

## Последние изменения

1. Исправлены координаты городов Суботица, Лозница и Крагуевац для корректного отображения на карте

## Лицензия
MIT
