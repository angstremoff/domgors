# Исправленные проблемы сборки DomGoMobile

## Выявленные проблемы и решения

### 1. Ошибка владельца проекта
Проблема: `Project config: Owner of project identified by "extra.eas.projectId" (angstremoff) must be specified in "owner" field`
Решение: Добавлено поле "owner": "angstremoff" в app.json и eas.json

### 2. Несовместимые библиотеки
Проблема: Несколько библиотек не поддерживают New Architecture
Решение: Добавлены исключения в package.json для проверки совместимости

### 3. Проблемы с runtimeVersion
Проблема: Фиксированная версия runtime вызывает проблемы
Решение: Изменена конфигурация на `"runtimeVersion": { "policy": "sdkVersion" }`

### 4. Неоптимальные каналы сборки
Проблема: Сложность в управлении каналами сборки
Решение: Упрощены профили сборки в eas.json

## Изменения в файлах

### app.json
- Добавлен "owner": "angstremoff"
- Изменен runtimeVersion на динамический (policy: sdkVersion)
- Добавлен jsEngine: hermes

### eas.json
- Добавлен "owner": "angstremoff"
- Упрощены профили сборки
- Настроены параметры для сборки APK

### package.json
- Добавлены исключения для проблемных библиотек в секции expo.doctor

## Тестирование
После этих изменений сборка должна успешно проходить на серверах Expo.
