/**
 * Скрипт для автоматического обновления ссылок на скачивание приложения
 * 
 * Как использовать:
 * 1. Запустите скрипт после создания нового релиза: node scripts/update-app-download-links.js
 * 2. Укажите версию (по умолчанию будет использована последняя версия из релизов)
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// Получаем __dirname эквивалент для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация
const config = {
  // Репозиторий мобильного приложения
  repo: {
    owner: 'angstremoff',
    name: 'domgomobile',
  },
  // Файлы, которые нужно обновить
  filesToUpdate: [
    {
      path: 'src/components/layout/Footer.tsx',
      patterns: [
        {
          // Регулярное выражение для поиска ссылки на скачивание Android
          regex: /href="https:\/\/github\.com\/[^\/]+\/[^\/]+\/releases\/(?:download|latest\/download)\/[^"]+"/, 
          replacement: 'href="https://github.com/{owner}/{repo}/releases/latest/download/DomGo-v{version}.apk"'
        },
        {
          // Регулярное выражение для поиска ссылки в JavaScript
          regex: /window\.location\.href\s*=\s*'https:\/\/github\.com\/[^\/]+\/[^\/]+\/releases\/(?:download|latest\/download)\/[^']+'/, 
          replacement: "window.location.href = 'https://github.com/{owner}/{repo}/releases/latest/download/DomGo-v{version}.apk'"
        }
      ]
    },
    // Здесь можно добавить другие файлы, которые нужно обновить
  ],
  // HTML-обработчик ссылок для deeplink
  deeplinkHandlerPath: '../domgomobile/deploy/index.html',
  deeplinkPattern: {
    regex: /getLatestRelease\(\).+?\/releases\/latest/g,
    replacement: "getLatestRelease()...\/releases\/latest"
  }
};

// Получаем последнюю версию из GitHub API
async function getLatestVersion() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${config.repo.owner}/${config.repo.name}/releases/latest`,
      headers: {
        'User-Agent': 'DomGo-Link-Updater-Script'
      }
    };

    const req = https.get(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const release = JSON.parse(data);
            // Убираем 'v' из начала тега, если он есть
            const version = release.tag_name.startsWith('v') 
              ? release.tag_name.substring(1) 
              : release.tag_name;
            resolve(version);
          } catch (e) {
            reject(new Error(`Не удалось распарсить ответ от GitHub API: ${e.message}`));
          }
        } else {
          reject(new Error(`GitHub API вернул ошибку: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Ошибка при запросе к GitHub API: ${error.message}`));
    });
    
    req.end();
  });
}

// Обновляем ссылки в файлах
function updateLinks(version) {
  console.log(`Обновляем ссылки до версии ${version}...`);
  
  // Обновляем указанные файлы
  config.filesToUpdate.forEach(fileConfig => {
    const filePath = path.resolve(__dirname, '..', fileConfig.path);
    console.log(`Обрабатываем файл: ${filePath}`);
    
    try {
      // Читаем содержимое файла
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Применяем все шаблоны замены
      fileConfig.patterns.forEach(pattern => {
        const oldContent = content;
        
        // Заполняем шаблон замены
        const replacement = pattern.replacement
          .replace('{owner}', config.repo.owner)
          .replace('{repo}', config.repo.name)
          .replace('{version}', version);
        
        // Выполняем замену
        content = content.replace(pattern.regex, replacement);
        
        // Проверяем, была ли выполнена замена
        if (oldContent !== content) {
          modified = true;
          console.log(`  Заменено: ${pattern.regex}`);
        }
      });
      
      // Сохраняем файл, если он был изменен
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  Файл обновлен и сохранен`);
      } else {
        console.log(`  В файле не было найдено шаблонов для замены`);
      }
    } catch (error) {
      console.error(`  Ошибка при обработке файла ${filePath}: ${error.message}`);
    }
  });
  
  // Обновляем HTML-обработчик ссылок для deeplink
  try {
    const deeplinkHandlerPath = path.resolve(__dirname, config.deeplinkHandlerPath);
    if (fs.existsSync(deeplinkHandlerPath)) {
      console.log(`Обрабатываем deeplink handler: ${deeplinkHandlerPath}`);
      
      let content = fs.readFileSync(deeplinkHandlerPath, 'utf8');
      // Обновляем версию в обработчике, если нужно
      // (этот шаг можно пропустить, если используется ссылка на latest)
      
      fs.writeFileSync(deeplinkHandlerPath, content, 'utf8');
      console.log(`  Обработчик deeplink обновлен`);
    }
  } catch (error) {
    console.error(`  Ошибка при обработке deeplink handler: ${error.message}`);
  }
  
  console.log('Все файлы успешно обработаны!');
}

// Основная функция скрипта
async function main() {
  try {
    // Если версия передана как аргумент, используем её, иначе получаем последнюю
    const version = process.argv[2] || await getLatestVersion();
    console.log(`Получена версия: ${version}`);
    
    // Обновляем ссылки
    updateLinks(version);
    
    console.log('Скрипт успешно выполнен!');
  } catch (error) {
    console.error(`Ошибка: ${error.message}`);
    process.exit(1);
  }
}

// Запускаем скрипт
main();
