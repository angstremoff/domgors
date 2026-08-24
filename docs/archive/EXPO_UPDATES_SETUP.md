# ⚠️ Expo OTA Updates (архив)

> Начиная с ноября 2025 Expo OTA отключены. Приложение обновляется через Google Play/App Store. Ниже — архивные шаги для истории.

## Текущая конфигурация
✅ Expo Updates уже настроен в `app.config.js`
✅ EAS проект создан (ID: 313d8153-28aa-426a-a0f3-b580238521e5)
✅ Компонент UpdateNotification добавлен в приложение

## Шаги для публикации обновлений

### 1. Войти в Expo аккаунт
```bash
npx eas-cli login
```
Введите ваши учетные данные Expo (angstremoff)

### 2. Проверить конфигурацию
```bash
npx eas-cli build:configure
```

### 3. Опубликовать OTA-обновление

#### Для production (основной канал):
```bash
npx eas-cli update --branch production --platform all --non-interactive --message "Описание обновления"
```

#### Для preview (тестовый канал):
```bash
npx eas-cli update --branch preview --platform all --non-interactive --message "Тестовое обновление"
```

### 4. Проверить статус обновления
```bash
npx eas-cli update:list --branch production
```

## Как это работает

1. **Вы публикуете обновление** через `eas update`
2. **Expo собирает JS-бандл** и загружает на сервер
3. **При запуске приложения** компонент UpdateNotification проверяет обновления
4. **Если обновление найдено** - показывается уведомление пользователю
5. **Пользователь нажимает "Обновить"** - приложение перезапускается с новой версией

## Важные моменты

### Runtime Version
В `app.config.js` указан `runtimeVersion: '1.0.4'`
- Это версия нативного кода (Android/iOS)
- OTA-обновления работают только для **одинаковых** runtimeVersion
- При изменении нативного кода (зависимости, настройки Android/iOS) нужно:
  1. Увеличить runtimeVersion (например, до '1.0.5')
  2. Пересобрать APK
  3. Опубликовать новое OTA-обновление

### Каналы (Channels)
- **production** - для пользователей (основной APK)
- **preview** - для тестирования
- **development** - для разработки

### Версия приложения
В `package.json` указана версия `0.9.9`
- Это версия кода, которую видят пользователи
- При публикации обновления увеличивайте версию:
  ```bash
  # В package.json измените version на 0.9.9
  npx eas-cli update --branch production --platform all --non-interactive --message "Update to 0.9.9"
  ```

## Быстрый старт

### Первое обновление:
```bash
# 1. Войти в аккаунт
npx eas-cli login

# 2. Опубликовать обновление
npx eas-cli update --branch production --platform all --non-interactive --message "Первое OTA обновление: улучшения UI и исправления"

# 3. Проверить
npx eas-cli update:list --branch production
```

### Последующие обновления:
```bash
# 1. Внести изменения в код
# 2. Увеличить версию в package.json (0.9.9 -> 0.9.10)
# 3. Закоммитить изменения
git add .
git commit -m "Update to 0.9.9"
git push

# 4. Опубликовать OTA-обновление
npx eas-cli update --branch production --platform all --non-interactive --message "Update to 0.9.9: описание изменений"
```

## Проверка обновлений

### На устройстве:
1. Откройте приложение
2. Компонент UpdateNotification автоматически проверит обновления
3. Если обновление доступно - появится уведомление внизу экрана
4. Нажмите "Обновить" для применения

### Принудительная проверка (для отладки):
В режиме разработки можно добавить кнопку:
```typescript
import * as Updates from 'expo-updates';

const checkUpdate = async () => {
  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  }
};
```

## Откат обновления

Если обновление вызвало проблемы:
```bash
# Посмотреть список обновлений
npx eas-cli update:list --branch production

# Откатиться на предыдущую версию
npx eas-cli update:republish --group <group-id>
```

## Мониторинг

Проверить статус обновлений можно в веб-интерфейсе:
https://expo.dev/accounts/angstremoff/projects/DomGoMobile/updates

## Troubleshooting

### Обновление не приходит:
1. Проверьте runtimeVersion в app.config.js и в APK
2. Убедитесь, что канал совпадает (production)
3. Проверьте интернет-соединение на устройстве
4. Перезапустите приложение

### Ошибка при публикации:
1. Проверьте, что вы залогинены: `npx eas-cli whoami`
2. Проверьте права доступа к проекту
3. Убедитесь, что projectId правильный в app.config.js

## Полезные команды

```bash
# Проверить текущего пользователя
npx eas-cli whoami

# Список всех обновлений
npx eas-cli update:list

# Удалить обновление
npx eas-cli update:delete --group <group-id>

# Информация о проекте
npx eas-cli project:info
```
