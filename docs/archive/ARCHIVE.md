# Архив устаревших документов

Исторические разовые отчёты и планы. Большинство относится к версиями **0.9.9–1.0.13** и отражает промежуточное состояние проекта — не использовать как актуальную документацию. Актуальные документы — в корне (`README.md`, `MEMORY.md`, `RULES.md`, `DATABASE_SCHEMA.md`, `WIKI.md`) и `wiki/`.

## Аудиты и ревью кода
| Файл | О чём | Состояние |
|------|-------|-----------|
| `AUDIT_REPORT.md` | Комплексный аудит (4 сен 2025, v0.9.9): 51 проблема, console.log, memory leaks. | Исторический срез. Многие пункты уже исправлены. |
| `AUDIT_REPORT_GOOGLE_PLAY.md` | Аудит готовности к Google Play: package name, AAB, Maps API key. | Большинство исправлено (package=`domgo.rs`). |
| `CODE_REVIEW_REPORT.md` | Code review по производительности (v0.9.9). | Исторический. |
| `docs/code-review-2025-12-14.md` | Полный код-ревью от 14 дек 2025. | Исторический срез. |

## Отчёты об оптимизации
| Файл | О чём | Состояние |
|------|-------|-----------|
| `OPTIMIZATION_REPORT.md` | Оптимизация (17 ноя 2025): memory leaks, memoization, FlatList. | Выполнено. |
| `FULL_OPTIMIZATION_COMPLETE.md` | Сводка завершённой оптимизации (17 ноя 2025). | Выполнено. |
| `CHANGELOG_OPTIMIZATION.md` | Changelog оптимизации производительности. | Исторический. |
| `IMPLEMENTATION_REPORT.md` | Итоговый отчёт о завершении работ. | Исторический. |
| `FINAL_SUMMARY.md` | Финальная сводка оптимизации. | Исторический. |
| `FIXES_REPORT.md` | Исправления конфигурации Android. | Исторический. |
| `fix-build-issues.md` | Решённые проблемы сборки. | Исторический. |

## Готовность к Google Play
| Файл | О чём | Состояние |
|------|-------|-----------|
| `FINAL_COMPLIANCE_AUDIT.md` | Финальный аудит комплаенса Google Play. | Проект уже в Google Play. |
| `FINAL_READINESS_REPORT.md` | Отчёт готовности к публикации в Google Play. | Проект уже в Google Play. |

## CI/CD и OTA (архивные настройки)
| Файл | О чём | Состояние |
|------|-------|-----------|
| `EXPO_UPDATES_SETUP.md` | Настройка Expo OTA Updates. | **OTA выключено** (`updates.enabled: false`). Неактуально. |
| `GITHUB_ACTIONS_SETUP.md` | GitHub Actions для Expo OTA. | OTA выключено. Исторический. |
| `.github/GITHUB_ACTIONS_SETUP.md` | Дубликат. | То же. |
| `GITHUB_SECRETS_GUIDE.md` | Получение ключей и настройка GitHub Secrets. | Исторический справочник. |
| `EAS_GITHUB_SETUP.md` | Сборка через GitHub + EAS. | Исторический справочник. |
| `.github/SETUP_CHECKLIST.md` | Чеклист настройки CI. | Исторический. |

## Планы и чеклисты
| Файл | О чём | Состояние |
|------|-------|-----------|
| `DISTRICTS_INTEGRATION_PLAN.md` | План интеграции районов (891 строка). | **Реализовано** — районы работают. Архив плана. |
| `TESTING_CHECKLIST.md` | Чеклист тестирования после оптимизации (v0.9.9). | Исторический. |

## Прочее
| Файл | О чём |
|------|-------|
| `docs/context7-setup.md` | Настройка Context7 MCP-сервера (инструмент, не продукт). |
