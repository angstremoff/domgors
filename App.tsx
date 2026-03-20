import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Linking, AppState, AppStateStatus } from 'react-native';
import AppVersionManager from './src/services/AppVersionManager';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { FavoritesProvider } from './src/contexts/FavoritesContext';
import { PropertyProvider } from './src/contexts/PropertyContext';
import AlertProvider from './src/components/AlertProvider';
import AlertInitializer from './src/components/AlertInitializer';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { logError } from './src/utils/sentry';
import { Logger } from './src/utils/logger';
import { supabase } from './src/lib/supabaseClient';
import { parseDeepLink } from './src/utils/deepLinkParser';
import { destroyAllCaches } from './src/utils/cacheManager';
import './src/translations';

export default function App() {
  const [pendingPropertyId, setPendingPropertyId] = React.useState<string | null>(null);
  const clearPendingPropertyId = React.useCallback(() => setPendingPropertyId(null), []);
  const [pendingAgencyId, setPendingAgencyId] = React.useState<string | null>(null);
  const clearPendingAgencyId = React.useCallback(() => setPendingAgencyId(null), []);

  // Очистка кэшей при завершении приложения для предотвращения утечек памяти
  React.useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // При переходе в background или inactive (закрытие приложения) очищаем интервалы кэшей
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        Logger.debug('Приложение переходит в фоновый режим, очистка кэшей...');
        destroyAllCaches();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup при размонтировании App
    return () => {
      subscription.remove();
      destroyAllCaches();
    };
  }, []);

  // Улучшенная система управления версиями и кэшированием
  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        Logger.debug('🚀 НАЧАЛО ИНИЦИАЛИЗАЦИИ ПРИЛОЖЕНИЯ...');

        // Получаем диагностическую информацию до очистки
        const diagnosticInfo = await AppVersionManager.getDiagnosticInfo();
        Logger.debug('🔍 ИНФОРМАЦИЯ О ВЕРСИЯХ:');
        Logger.debug('  - Текущая версия:', diagnosticInfo.current);
        Logger.debug('  - Сохранённая версия:', diagnosticInfo.stored);

        // Проверяем и очищаем кэш при необходимости
        const wasCleared = await AppVersionManager.checkAndClearIfNeeded();

        if (wasCleared) {
          Logger.debug('🧹 Кэш был очищен из-за изменения версии или других условий');

          // Получаем обновлённую информацию после очистки
          const updatedInfo = await AppVersionManager.getVersionInfo();
          Logger.debug('🔄 Обновлённая информация о версии:', updatedInfo);
        } else {
          Logger.debug('✅ Кэш не требует очистки');
        }

        Logger.debug('✨ ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ЗАВЕРШЕНА УСПЕШНО!');

      } catch (error) {
        Logger.error('❌ КРИТИЧЕСКАЯ ОШИБКА при инициализации приложения:', error);

        // При критической ошибке пытаемся очистить кэш для восстановления
        try {
          await AppVersionManager.forceClearAll(`Критическая ошибка инициализации: ${error}`);
          Logger.debug('⚙️ Кэш очищен для восстановления после ошибки');
        } catch (clearError) {
          Logger.error('❌ Не удалось очистить кэш после ошибки:', clearError);
        }
      }
    };

    initializeApp();
  }, []);

  // Обработка глубоких ссылок (deep links)
  React.useEffect(() => {
    // Обработчик для ссылок, по которым открывается приложение
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      Logger.debug('Получена ссылка:', url);
      const parsed = parseDeepLink(url);

      if (parsed.type === 'auth') {
        Logger.debug('Обработка подтверждения email');
        const { error } = await supabase.auth.setSession({
          access_token: parsed.accessToken,
          refresh_token: parsed.refreshToken
        });
        if (error) {
          Logger.error('Ошибка установки сессии:', error);
        } else {
          Logger.debug('Сессия установлена успешно');
        }
        return;
      }

      if (parsed.type === 'property') {
        const propertyId = parsed.propertyId;
        Logger.debug('Открываем объявление по ID:', propertyId);
        setPendingPropertyId(propertyId);
        globalThis.propertyDeepLinkId = propertyId;
        globalThis.pendingPropertyNavigation = propertyId;

        // Если навигация уже инициализирована (приложение активное), пробуем перейти сразу
        // Запасной механизм через состояние останется, если навигатор ещё не готов
        if (globalThis.navigationRef && globalThis.navigationRef.current) {
          try {
            globalThis.navigationRef.current.navigate('PropertyDetails', {
              propertyId,
            });
            Logger.debug('Мгновенная навигация к объявлению выполнена');
          } catch (error) {
            Logger.warn('Не удалось сразу перейти по deep link, сработает отложенная навигация:', error);
          }
        }
        return;
      }

      if (parsed.type === 'agency') {
        const agencyId = parsed.agencyId;
        Logger.debug('Открываем агентство по ID:', agencyId);
        setPendingAgencyId(agencyId);
        globalThis.pendingAgencyNavigation = agencyId;

        // Если навигация готова — пробуем перейти сразу
        if (globalThis.navigationRef && globalThis.navigationRef.current) {
          try {
            globalThis.navigationRef.current.navigate('Agency', { agencyId });
            Logger.debug('Мгновенная навигация к агентству выполнена');
          } catch (error) {
            Logger.warn('Не удалось сразу перейти по deep link агентства, сработает отложенная навигация:', error);
          }
        }
        return;
      }

      Logger.debug('Неизвестный deeplink, пропускаем');
    };

    // Подписываемся на событие открытия приложения по ссылке
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Проверяем, не было ли приложение открыто по ссылке
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      // Отписываемся при размонтировании компонента
      subscription.remove();
    };
  }, []);

  // Обработчик глобальных ошибок в приложении
  React.useEffect(() => {
    // Функция обработки непойманных ошибок
    const handleError = (error: Error) => {
      // Логируем ошибку в Sentry
      logError(error, { context: 'Global error handler' });
      Logger.error('Глобальная ошибка в приложении:', error);
    };

    // Функция обработки необработанных обещаний
    const handlePromiseRejection = (error: any) => {
      logError(error instanceof Error ? error : new Error('Unhandled Promise Rejection: ' + error), {
        context: 'Unhandled Promise rejection'
      });
      Logger.error('Необработанная ошибка в Promise:', error);
    };

    // Для React Native используем глобальный обработчик ошибок
    const errorHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error, isFatal) => {
      // Логируем ошибку и передаем её в Sentry
      handleError(error);

      // Затем вызываем стандартный обработчик
      errorHandler(error, isFatal);
    });

    // Подписываемся на необработанные обещания
    const rejectionTracking = require('promise/setimmediate/rejection-tracking');

    if (rejectionTracking) {
      rejectionTracking.enable({
        allRejections: true,
        onUnhandled: handlePromiseRejection,
      });
    }

    return () => {
      // Восстанавливаем исходный обработчик
      ErrorUtils.setGlobalHandler(errorHandler);

      // Отключаем отслеживание обещаний
      if (rejectionTracking) {
        rejectionTracking.disable();
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <LanguageProvider>
          <ThemeProvider>
            <AlertProvider>
              <AlertInitializer />
              <AuthProvider>
                <FavoritesProvider>
                  <PropertyProvider>
                    <AppNavigator
                      pendingPropertyId={pendingPropertyId}
                      clearPendingPropertyId={clearPendingPropertyId}
                      pendingAgencyId={pendingAgencyId}
                      clearPendingAgencyId={clearPendingAgencyId}
                    />
                    <StatusBar style="auto" />
                  </PropertyProvider>
                </FavoritesProvider>
              </AuthProvider>
            </AlertProvider>
          </ThemeProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
