import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type TranslationFile = {
  cities: Record<string, string>;
  districts: Record<string, string>;
};

const readTranslations = (relativePath: string): TranslationFile =>
  JSON.parse(
    readFileSync(resolve(process.env.INIT_CWD ?? process.cwd(), relativePath), 'utf8')
  ) as TranslationFile;

const requiredCities = [
  'Бор',
  'Вальево',
  'Вране',
  'Вршац',
  'Заечар',
  'Зренянин',
  'Ягодина',
  'Кикинда',
  'Кральево',
  'Крушевац',
  'Лесковац',
  'Нови Пазар',
  'Панчево',
  'Пирот',
  'Пожаревац',
  'Приштина',
  'Прокупле',
  'Смедерево',
  'Сомбор',
  'Сремска Митровица',
  'Ужице',
  'Чачак',
  'Шабац',
] as const;

const requiredDistricts = [
  'Панчево',
  'Војловица',
  'Старчево',
  'Качарево',
  'Јабука',
  'Омољица',
  'Долово',
  'Глогоњ',
  'Иваново',
  'Банатско Ново Село',
  'Банатски Брестовац',
  'Врање',
  'Врањска Бања',
  'Пожаревац',
  'Костолац',
  'Ужице',
  'Севојно',
] as const;

describe('location translations coverage', () => {
  const files = {
    sharedRu: readTranslations('src/translations/ru.json'),
    sharedSr: readTranslations('src/translations/sr.json'),
    webRu: readTranslations('web/public/locales/ru/translation.json'),
    webSr: readTranslations('web/public/locales/sr/translation.json'),
  };

  it('contains all seeded city translations in shared and web locales', () => {
    for (const key of requiredCities) {
      expect(files.sharedRu.cities[key]).toBeTruthy();
      expect(files.sharedSr.cities[key]).toBeTruthy();
      expect(files.webRu.cities[key]).toBeTruthy();
      expect(files.webSr.cities[key]).toBeTruthy();
    }
  });

  it('contains all seeded district translations in shared and web locales', () => {
    for (const key of requiredDistricts) {
      expect(files.sharedRu.districts[key]).toBeTruthy();
      expect(files.sharedSr.districts[key]).toBeTruthy();
      expect(files.webRu.districts[key]).toBeTruthy();
      expect(files.webSr.districts[key]).toBeTruthy();
    }
  });
});
