#!/bin/bash

# Скрипт для обновления версии приложения и ссылок
# Использование: ./update-version.sh 0.7.0

# Проверяем, был ли передан аргумент с версией
if [ -z "$1" ]; then
  echo "Ошибка: не указана версия. Пример использования: ./update-version.sh 0.7.0"
  exit 1
fi

VERSION=$1
echo "Обновляем до версии $VERSION"

# Запускаем скрипт обновления ссылок
node ./scripts/update-app-download-links.js $VERSION

# Предлагаем отправить изменения в репозиторий
echo "Версия обновлена до $VERSION. Отправить изменения в репозиторий? (y/n)"
read PUSH_CHANGES

if [ "$PUSH_CHANGES" = "y" ]; then
  git add src/components/layout/Footer.tsx scripts/
  git commit -m "Обновлены ссылки на скачивание приложения до версии $VERSION"
  git push origin main
  echo "Изменения отправлены в репозиторий"
else
  echo "Изменения не были отправлены в репозиторий"
fi
