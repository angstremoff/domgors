#!/usr/bin/env node

/**
 * Скрипт для проверки и обновления ссылок на скачивание Android-приложения
 * Использование: node scripts/update-app-links.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Получаем текущую директорию для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Проверяем ссылки на скачивание приложения...');

// Путь к файлу Footer.tsx
const footerPath = path.resolve(__dirname, '../src/components/layout/Footer.tsx');

// Проверяем, существует ли файл
if (!fs.existsSync(footerPath)) {
  console.error(`Ошибка: файл ${footerPath} не найден`);
  process.exit(1);
}

// Читаем содержимое файла
let content = fs.readFileSync(footerPath, 'utf8');

// Паттерны для проверки и исправления ссылок
const standardLink = 'https://github.com/angstremoff/domgomobile/releases/latest/download/DomGo.apk';

// Регулярные выражения для поиска и замены ссылок
const patterns = [
  {
    // Находим любые ссылки на скачивание APK с GitHub
    regex: /href="https:\/\/github\.com\/angstremoff\/domgomobile\/releases\/[^"]+\.apk"/g,
    replacement: `href="${standardLink}"`
  },
  {
    // Находим любые ссылки в JavaScript коде
    regex: /window\.location\.href\s*=\s*'https:\/\/github\.com\/angstremoff\/domgomobile\/releases\/[^']+\.apk'/g,
    replacement: `window.location.href = '${standardLink}'`
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
console.log('git commit -m "Обновлены ссылки на скачивание приложения"');
console.log('git push origin main');
