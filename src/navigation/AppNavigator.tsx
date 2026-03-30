import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, type NavigationContainerRef } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useProperties } from '../contexts/PropertyContext';
import HeaderControls from '../components/HeaderControls';
import WebHeaderBar from '../components/WebHeaderBar';
import Colors from '../constants/colors';
import { Logger } from '../utils/logger';
import { RootStackParamList } from '../types/navigation';

// Импорт экранов
import HomeScreen from '../screens/HomeScreen';
import PropertyDetailsScreen from '../screens/PropertyDetailsScreen';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import AddPropertyScreen from '../screens/AddPropertyScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ContactInfoScreen from '../screens/ContactInfoScreen';
import MapScreen from '../screens/MapScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import MyPropertiesScreen from '../screens/MyPropertiesScreen';
import EditPropertyScreen from '../screens/EditPropertyScreen';
import AgencyScreen from '../screens/AgencyScreen';

type AppNavigatorProps = {
  pendingPropertyId: string | null;
  clearPendingPropertyId: () => void;
  pendingAgencyId?: string | null;
  clearPendingAgencyId?: () => void;
  pendingAuthScreen?: 'MainTabs' | 'ResetPassword' | null;
  clearPendingAuthScreen?: () => void;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootStackParamList>();

// Навигатор для основных экранов
const MainStack = () => {
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode } = useTheme();
  const { selectedCity, setSelectedCity } = useProperties();
  const theme = darkMode ? Colors.dark : Colors.light;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.headerBackground,
        },
        headerTintColor: theme.headerText,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        // На вебе рисуем собственную «широкую» шапку внутри headerTitle,
        // и убираем headerRight чтобы не дублировать элементы
        headerTitle: () => (
          Platform.OS === 'web' ? (
            <WebHeaderBar
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              title="DomGo.rs"
              isHomeScreen={true}
              selectedCity={selectedCity}
              onCitySelect={setSelectedCity}
            />
          ) : (
            <Text style={{ fontWeight: 'bold', color: theme.headerText, fontSize: 18 }}>DomGo.rs</Text>
          )
        ),
        headerRight: Platform.OS === 'web' ? undefined : () => (
          <HeaderControls
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
            selectedCity={selectedCity}
            onCitySelect={setSelectedCity}
            isHomeScreen={true}
          />
        ),
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Agency"
        component={AgencyScreen}
        options={{
          title: t('agency.title', 'Агентство'),
          headerShown: true,
          presentation: 'card',
          animationTypeForReplace: 'push',
          animation: 'slide_from_right',
          headerTitle: () => (
            Platform.OS === 'web' ? (
              <WebHeaderBar
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                title={t('agency.title', 'Агентство')}
                isHomeScreen={false}
              />
            ) : (
              <Text style={{ fontWeight: 'bold', color: theme.headerText, fontSize: 18 }}>{t('agency.title', 'Агентство')}</Text>
            )
          ),
          headerRight: Platform.OS === 'web' ? undefined : () => (
            <HeaderControls darkMode={darkMode} toggleDarkMode={toggleDarkMode} isHomeScreen={false} />
          ),
        }}
      />
      <Stack.Screen
        name="PropertyDetails"
        component={PropertyDetailsScreen}
        options={{
          title: t('property.details'),
          headerShown: true,
          presentation: 'card',
          animationTypeForReplace: 'push',
          animation: 'slide_from_right',
          headerTitle: () => (
            Platform.OS === 'web' ? (
              <WebHeaderBar
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                title={t('property.details')}
                isHomeScreen={false}
              />
            ) : (
              <Text style={{ fontWeight: 'bold', color: theme.headerText, fontSize: 18 }}>{t('property.details')}</Text>
            )
          ),
          headerRight: Platform.OS === 'web' ? undefined : () => (
            <HeaderControls darkMode={darkMode} toggleDarkMode={toggleDarkMode} isHomeScreen={false} />
          ),
        }}
      />
      <Stack.Screen
        name="MyProperties"
        component={MyPropertiesScreen}
        options={{
          title: t('profile.myProperties'),
          headerShown: true,
          headerTitle: () => (
            Platform.OS === 'web' ? (
              <WebHeaderBar
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                title={t('profile.myProperties')}
                isHomeScreen={false}
              />
            ) : (
              <Text style={{ fontWeight: 'bold', color: theme.headerText, fontSize: 18 }}>{t('profile.myProperties')}</Text>
            )
          ),
          headerRight: Platform.OS === 'web' ? undefined : () => (
            <HeaderControls darkMode={darkMode} toggleDarkMode={toggleDarkMode} isHomeScreen={false} />
          ),
        }}
      />
      <Stack.Screen
        name="EditProperty"
        component={EditPropertyScreen}
        options={{
          title: t('property.editProperty'),
          headerShown: true,
          headerTitle: () => (
            Platform.OS === 'web' ? (
              <WebHeaderBar
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                title={t('property.editProperty')}
                isHomeScreen={false}
              />
            ) : (
              <Text style={{ fontWeight: 'bold', color: theme.headerText, fontSize: 18 }}>{t('property.editProperty')}</Text>
            )
          ),
          headerRight: Platform.OS === 'web' ? undefined : () => (
            <HeaderControls darkMode={darkMode} toggleDarkMode={toggleDarkMode} isHomeScreen={false} />
          ),
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: t('auth.login') }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: t('auth.register') }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: t('auth.resetPassword') }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: t('auth.setNewPassword') }}
      />
      <Stack.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={{ title: t('property.add') }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('settings.title') }}
      />
      <Stack.Screen
        name="ContactInfo"
        component={ContactInfoScreen}
        options={{ title: t('profile.contactInfo') }}
      />
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{ title: t('common.map') }}
      />
    </Stack.Navigator>
  );
};

// Навигатор для панели вкладок
const MainTabs = () => {
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode } = useTheme();
  const { selectedCity, setSelectedCity } = useProperties();
  const theme = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 15,
          paddingTop: 5,
          height: 60 + (insets.bottom > 0 ? insets.bottom - 10 : 0), // Adjust height based on insets
          ...(Platform.OS === 'web' ? { paddingHorizontal: 64 } : {}),
        },
        headerStyle: {
          backgroundColor: theme.headerBackground,
        },
        headerTintColor: theme.headerText,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'DomGo.rs',
          headerTitleAlign: Platform.OS === 'ios' ? 'left' : undefined,
          headerRightContainerStyle: Platform.OS === 'ios' ? { paddingRight: 8 } : undefined,
          tabBarLabel: t('navigation.home'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
          headerTitle: () => (
            Platform.OS === 'web' ? (
              <WebHeaderBar
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                title="DomGo.rs"
                isHomeScreen={true}
                selectedCity={selectedCity}
                onCitySelect={setSelectedCity}
              />
            ) : (
              <Text style={{ fontWeight: 'bold', color: theme.headerText, fontSize: 18 }}>DomGo.rs</Text>
            )
          ),
          headerRight: Platform.OS === 'web' ? undefined : () => (
            <HeaderControls
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              selectedCity={selectedCity}
              onCitySelect={setSelectedCity}
              isHomeScreen={true}
              containerStyle={Platform.OS === 'ios' ? { marginLeft: 8 } : undefined}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: t('navigation.favorites'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="heart" color={color} size={size} />
          ),
          headerTitle: () => (
            Platform.OS === 'web' ? (
              <WebHeaderBar
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                title={t('navigation.favorites')}
                isHomeScreen={false}
                selectedCity={selectedCity}
                onCitySelect={setSelectedCity}
              />
            ) : (
              <Text style={{ fontWeight: 'bold', color: theme.headerText, fontSize: 18 }}>{t('navigation.favorites')}</Text>
            )
          ),
          headerRight: Platform.OS === 'web' ? undefined : () => (
            <HeaderControls
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              selectedCity={selectedCity}
              onCitySelect={setSelectedCity}
              isHomeScreen={false}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={{
          title: t('navigation.add'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="add-circle" color={color} size={size} />
          ),
          headerTitle: () => (
            Platform.OS === 'web' ? (
              <WebHeaderBar
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                title={t('navigation.add')}
                isHomeScreen={false}
                selectedCity={selectedCity}
                onCitySelect={setSelectedCity}
              />
            ) : (
              <Text style={{ fontWeight: 'bold', color: theme.headerText, fontSize: 18 }}>{t('navigation.add')}</Text>
            )
          ),
          headerRight: Platform.OS === 'web' ? undefined : () => (
            <HeaderControls
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              selectedCity={selectedCity}
              onCitySelect={setSelectedCity}
              isHomeScreen={false}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('navigation.profile'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
          headerTitle: () => (
            Platform.OS === 'web' ? (
              <WebHeaderBar
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                title={t('navigation.profile')}
                isHomeScreen={false}
                selectedCity={selectedCity}
                onCitySelect={setSelectedCity}
              />
            ) : (
              <Text style={{ fontWeight: 'bold', color: theme.headerText, fontSize: 18 }}>{t('navigation.profile')}</Text>
            )
          ),
          headerRight: Platform.OS === 'web' ? undefined : () => (
            <HeaderControls
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              selectedCity={selectedCity}
              onCitySelect={setSelectedCity}
              isHomeScreen={false}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('navigation.settings'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="settings" color={color} size={size} />
          ),
          headerTitle: () => (
            Platform.OS === 'web' ? (
              <WebHeaderBar
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                title={t('navigation.settings')}
                isHomeScreen={false}
                selectedCity={selectedCity}
                onCitySelect={setSelectedCity}
              />
            ) : (
              <Text style={{ fontWeight: 'bold', color: theme.headerText, fontSize: 18 }}>{t('navigation.settings')}</Text>
            )
          ),
          headerRight: Platform.OS === 'web' ? undefined : () => (
            <HeaderControls
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              selectedCity={selectedCity}
              onCitySelect={setSelectedCity}
              isHomeScreen={false}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = ({
  pendingPropertyId,
  clearPendingPropertyId,
  pendingAgencyId,
  clearPendingAgencyId,
  pendingAuthScreen,
  clearPendingAuthScreen,
}: AppNavigatorProps) => {
  const { darkMode } = useTheme();
  const { fetchPropertyById } = useProperties();

  // Выбор темы для навигации в зависимости от настроек
  const navigationTheme = darkMode ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: Colors.dark.background,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Colors.light.background,
    },
  };

  // Создаем реф для доступа к навигационному контейнеру извне
  // Делаем его глобально доступным для использования в App.tsx
  const navigationRef = React.useRef<NavigationContainerRef<RootStackParamList> | null>(null);

  React.useEffect(() => {
    globalThis.navigationRef = navigationRef;

    return () => {
      globalThis.navigationRef = null;
    };
  }, []);

  const navigateWithRetry = React.useCallback(
    (
      onNavigate: (navigator: NavigationContainerRef<RootStackParamList>) => void,
      onFailure: () => void,
      maxAttempts = 15
    ) => {
      let attempts = 0;

      const tryNavigate = () => {
        attempts += 1;

        if (navigationRef.current) {
          onNavigate(navigationRef.current);
          return;
        }

        if (attempts < maxAttempts) {
          Logger.debug('Навигация ещё не готова, повторяем попытку...');
          setTimeout(tryNavigate, 200);
          return;
        }

        onFailure();
      };

      setTimeout(tryNavigate, 300);
    },
    []
  );

  // Обработка глубоких ссылок на объявления
  const navigateToPendingProperty = React.useCallback(async (propertyId: string) => {
    Logger.debug('Обнаружена ссылка на объявление, готовим навигацию. ID:', propertyId);
    let propertyData: RootStackParamList['PropertyDetails']['property'];

    try {
      propertyData = (await fetchPropertyById(propertyId)) ?? undefined;
    } catch (error) {
      Logger.error('Ошибка при загрузке объявления по deep link, продолжим с отложенной загрузкой на экране:', error);
    }

    navigateWithRetry(
      (navigator) => {
        navigator.navigate('PropertyDetails', {
          propertyId,
          ...(propertyData ? { property: propertyData } : {})
        });
        Logger.debug('Отложенная навигация к объявлению выполнена');
        clearPendingPropertyId();
        globalThis.pendingPropertyNavigation = null;
        globalThis.propertyDeepLinkId = null;
      },
      () => {
        Logger.error('Не удалось открыть объявление: навигация не инициализировалась');
        clearPendingPropertyId();
        globalThis.pendingPropertyNavigation = null;
        globalThis.propertyDeepLinkId = null;
      }
    );
  }, [clearPendingPropertyId, fetchPropertyById, navigateWithRetry]);

  React.useEffect(() => {
    // Используем state из App + глобальные флаги как запасной вариант
    const fallbackId = globalThis.pendingPropertyNavigation || globalThis.propertyDeepLinkId;
    const targetId = pendingPropertyId || fallbackId;

    if (!targetId) {
      return;
    }

    navigateToPendingProperty(targetId);
  }, [navigateToPendingProperty, pendingPropertyId]);

  React.useEffect(() => {
    // Обработка отложенного перехода к агентству
    const fallbackAgencyId = globalThis.pendingAgencyNavigation;
    const targetAgencyId = pendingAgencyId || fallbackAgencyId;

    if (!targetAgencyId) return;

    navigateWithRetry(
      (navigator) => {
        navigator.navigate('Agency', { agencyId: targetAgencyId });
        Logger.debug('Отложенная навигация к агентству выполнена');
        clearPendingAgencyId?.();
        globalThis.pendingAgencyNavigation = null;
      },
      () => {
        Logger.error('Не удалось открыть агентство: навигация не инициализировалась');
        clearPendingAgencyId?.();
        globalThis.pendingAgencyNavigation = null;
      }
    );
  }, [pendingAgencyId, clearPendingAgencyId, navigateWithRetry]);

  React.useEffect(() => {
    if (!pendingAuthScreen) {
      return;
    }

    navigateWithRetry(
      (navigator) => {
        navigator.navigate(pendingAuthScreen);
        Logger.debug('Отложенная auth-навигация выполнена:', pendingAuthScreen);
        clearPendingAuthScreen?.();
      },
      () => {
        Logger.error('Не удалось выполнить auth-навигацию: навигация не инициализировалась');
        clearPendingAuthScreen?.();
      }
    );
  }, [pendingAuthScreen, clearPendingAuthScreen, navigateWithRetry]);

  return (
    <NavigationContainer
      theme={navigationTheme}
      ref={navigationRef}
    >
      <MainStack />
    </NavigationContainer>
  );
};

export default AppNavigator;
