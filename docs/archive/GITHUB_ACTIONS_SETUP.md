# ⚠️ GitHub Actions для Expo OTA (архив)

> Expo OTA отключены. Workflow ниже хранится как историческая справка (использовался до перехода на Google Play обновления).

## Что это дает?

При каждом пуше в ветку `main` на GitHub автоматически:
1. ✅ Собирается новая версия приложения
2. ✅ Публикуется OTA-обновление в Expo
3. ✅ Пользователи получают обновление при следующем запуске приложения

## Шаг 1: Получить Expo Access Token

### Вариант A: Через командную строку (рекомендуется)
```bash
npx eas-cli token:create
```

Команда выведет токен вида: `xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
**Скопируйте его!** Он понадобится на следующем шаге.

### Вариант B: Через веб-интерфейс
1. Откройте https://expo.dev/accounts/angstremoff/settings/access-tokens
2. Нажмите "Create Token"
3. Введите название: `GitHub Actions - DomGoMobile`
4. Скопируйте созданный токен

## Шаг 2: Добавить токен в GitHub Secrets

1. Откройте ваш репозиторий на GitHub:
   https://github.com/angstremoff/domgomobile

2. Перейдите в **Settings** → **Secrets and variables** → **Actions**

3. Нажмите **New repository secret**

4. Заполните:
   - **Name**: `EXPO_TOKEN`
   - **Secret**: вставьте токен из Шага 1

5. Нажмите **Add secret**

## Шаг 3: Проверить настройку

После добавления секрета:

1. Закоммитьте файл workflow:
```bash
git add .github/workflows/eas-update.yml
git commit -m "Добавлена автоматическая публикация OTA-обновлений через GitHub Actions"
git push origin main
```

2. Откройте вкладку **Actions** в вашем репозитории на GitHub

3. Вы увидите запущенный workflow "EAS Update"

4. Дождитесь завершения (обычно 2-5 минут)

5. Если все успешно - увидите зеленую галочку ✅

## Как это работает

### Автоматически при каждом пуше:
```bash
git add .
git commit -m "Исправления и улучшения"
git push origin main
```
→ GitHub Actions автоматически опубликует OTA-обновление

### Ручной запуск (если нужно):
1. Откройте вкладку **Actions** на GitHub
2. Выберите workflow "EAS Update"
3. Нажмите **Run workflow**
4. Выберите ветку `main`
5. Нажмите **Run workflow**

## Workflow делает следующее:

1. **Проверяет наличие EXPO_TOKEN** - если нет, выдает ошибку
2. **Клонирует репозиторий** - получает последний код
3. **Устанавливает Node.js** - версия 18.x
4. **Настраивает EAS CLI** - с вашим токеном
5. **Устанавливает зависимости** - `npm ci`
6. **Получает версию** - из package.json
7. **Публикует обновление** - в канал production

## Сообщение об обновлении

Автоматически генерируется:
```
Auto-update from GitHub: v0.9.9
```

Если хотите кастомизировать, измените в `.github/workflows/eas-update.yml`:
```yaml
- name: Publish update
  run: eas update --auto --branch production --message "Ваше сообщение"
```

## Мониторинг

### Проверить статус workflow:
https://github.com/angstremoff/domgomobile/actions

### Проверить опубликованные обновления:
```bash
npx eas-cli update:list --branch production
```

Или в веб-интерфейсе:
https://expo.dev/accounts/angstremoff/projects/DomGoMobile/updates

## Troubleshooting

### Ошибка "EXPO_TOKEN not found"
- Убедитесь, что добавили секрет в GitHub (Settings → Secrets → Actions)
- Имя должно быть точно `EXPO_TOKEN` (с большими буквами)

### Ошибка "Unauthorized"
- Токен истек или неверный
- Создайте новый токен: `npx eas-cli token:create`
- Обновите секрет в GitHub

### Workflow не запускается
- Проверьте, что файл находится в `.github/workflows/eas-update.yml`
- Проверьте, что пушите в ветку `main`
- Проверьте вкладку Actions - может быть отключена

### Обновление не приходит на устройство
- Проверьте, что runtimeVersion совпадает
- Убедитесь, что канал в app.config.js = production
- Перезапустите приложение

## Дополнительные возможности

### Публикация только при изменении версии:
Можно настроить workflow, чтобы он публиковал обновление только когда меняется версия в package.json

### Публикация в разные каналы:
Можно настроить разные workflow для разных веток:
- `main` → production
- `develop` → preview
- `staging` → staging

### Уведомления в Telegram/Slack:
Можно добавить шаг для отправки уведомления после успешной публикации

## Полезные ссылки

- [Expo GitHub Actions](https://docs.expo.dev/eas-update/github-actions/)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
