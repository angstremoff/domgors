#!/usr/bin/env node

/**
 * Скрипт для обновления ссылок на скачивание Android-приложения
 * Использование: node scripts/update-app-links.mjs 0.7.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Получаем текущую директорию для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Получаем версию из аргументов командной строки
const version = process.argv[2];

if (!version) {
  console.error('Ошибка: не указана версия!');
  console.error('Пример использования: node scripts/update-app-links.mjs 0.7.0');
  process.exit(1);
}

console.log(`Обновляем ссылки до версии ${version}...`);

// Путь к файлу Footer.tsx
const footerPath = path.resolve(__dirname, '../src/components/layout/Footer.tsx');

// Проверяем, существует ли файл
if (!fs.existsSync(footerPath)) {
  console.error(`Ошибка: файл ${footerPath} не найден`);
  process.exit(1);
}

// Читаем содержимое файла
let content = fs.readFileSync(footerPath, 'utf8');

// Регулярные выражения для замены
const patterns = [
  {
    regex: /href="https:\/\/github\.com\/angstremoff\/domgomobile\/releases\/latest\/download\/DomGo-v[0-9\.]+\.apk"/g,
    replacement: `href="https://github.com/angstremoff/domgomobile/releases/latest/download/DomGo-v${version}.apk"`
  },
  {
    regex: /window\.location\.href\s*=\s*'https:\/\/github\.com\/angstremoff\/domgomobile\/releases\/latest\/download\/DomGo-v[0-9\.]+\.apk'/g,
    replacement: `window.location.href = 'https://github.com/angstremoff/domgomobile/releases/latest/download/DomGo-v${version}.apk'`
  }
];

// Применяем замены
let modified = false;
for (const pattern of patterns) {
  const oldContent = content;
  content = content.replace(pattern.regex, pattern.replacement);
  
  if (oldContent !== content) {
    modified = true;
    console.log(`Заменена ссылка на загрузку приложения`);
  }
}

// Сохраняем файл, если были изменения
if (modified) {
  fs.writeFileSync(footerPath, content, 'utf8');
  console.log(`Файл ${footerPath} успешно обновлен`);
} else {
  console.log(`В файле ${footerPath} не найдены ссылки для замены`);
}

console.log('Готово! Теперь вы можете отправить изменения в репозиторий:');
console.log('git add src/components/layout/Footer.tsx');
console.log(`git commit -m "Обновлена ссылка на скачивание приложения до версии ${version}"`);
console.log('git push origin main');
