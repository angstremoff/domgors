# Быстрая сборка через GitHub + EAS

## 1. Создайте Expo Access Token

1. Зайдите: https://expo.dev/accounts/angstremoff/settings/access-tokens
2. Нажмите **Create Token**
3. Название: `GitHub Actions`
4. Скопируйте сгенерированный токен

## 2. Добавьте секрет в GitHub

1. Зайдите: https://github.com/angstremoff/domgomobile/settings/secrets/actions
2. Нажмите **New repository secret**
3. Name: `EXPO_TOKEN`
4. Value: (вставьте токен из шага 1)
5. Нажмите **Add secret**

## 3. Запустите сборку

1. Зайдите: https://github.com/angstremoff/domgomobile/actions
2. Выберите **EAS Build** в списке слева
3. Нажмите **Run workflow** (справа)
4. Нажмите зеленую кнопку **Run workflow**

🚀 Сборка запустится **без очереди** и займет ~10 минут.

AAB скачаете здесь: https://expo.dev/accounts/angstremoff/projects/DomGoMobile/builds
