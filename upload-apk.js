const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Загрузка переменных окружения из файла .env
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Ошибка: Отсутствуют переменные окружения для Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function uploadApk() {
  try {
    const filePath = '/Users/savaleserg/Downloads/latest.apk';
    const fileContent = fs.readFileSync(filePath);
    const fileName = 'latest.apk';
    
    // Загружаем файл в хранилище Supabase в bucket 'apk'
    const { data, error } = await supabase.storage
      .from('apk')
      .upload(fileName, fileContent, {
        contentType: 'application/vnd.android.package-archive',
        upsert: true // Перезаписать, если файл с таким именем уже существует
      });
    
    if (error) {
      throw error;
    }
    
    console.log('APK файл успешно загружен:', data);
    
    // Получаем публичный URL для скачивания
    const { data: urlData } = await supabase.storage
      .from('apk')
      .getPublicUrl(fileName);
    
    console.log('Публичный URL для скачивания:', urlData.publicUrl);
  } catch (error) {
    console.error('Ошибка при загрузке APK:', error);
  }
}

uploadApk();
