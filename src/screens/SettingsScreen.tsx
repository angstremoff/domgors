import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Platform,
  useWindowDimensions,
  Linking
} from 'react-native';
import { Logger } from '../utils/logger';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Colors from '../constants/colors';
import CustomModal from '../components/CustomModal';
import packageJson from '../../package.json';

const SettingsScreen = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { darkMode } = useTheme();
  const theme = darkMode ? Colors.dark : Colors.light;
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isWebDesktop = isWeb && width >= 1024;

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const codeVersion = packageJson.version;

  const handleLogout = async () => {
    try {
      await logout();
      showModal(t('settings.logoutSuccess.title'), t('settings.logoutSuccess.message'));
    } catch (error) {
      Logger.error('Ошибка при выходе из аккаунта:', error);
      showModal(t('settings.logoutError.title'), t('settings.logoutError.message'));
    }
  };

  const showModal = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };

  const handleStoreUpdate = () => {
    const androidStoreUrl = 'https://www.rustore.ru/catalog/app/domgo.rs';
    const storeUrl = Platform.OS === 'android' ? androidStoreUrl : '';

    if (!storeUrl) {
      showModal(
        t('settings.update.comingSoonTitle', 'Скоро'),
        t('settings.update.comingSoonMessage', 'Ссылки на App Store появятся после публикации.')
      );
      return;
    }

    Linking.openURL(storeUrl).catch((error) => {
      Logger.error('Не удалось открыть магазин:', error);
      showModal(
        t('settings.update.errorTitle', 'Ошибка'),
        t('settings.update.errorMessage', 'Не удалось открыть магазин приложений. Попробуйте обновить вручную.')
      );
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={isWebDesktop ? styles.webContentContainer : undefined}
    >
      <View style={[styles.contentWrapper, isWebDesktop && styles.webContentWrapper]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('settings.title')}</Text>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.notifications')}</Text>

          <View style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>{t('settings.newPropertyNotifications')}</Text>
            <Switch
              value={true}
              onValueChange={() => showModal(t('settings.notificationNote.title'), t('settings.notificationNote.message'))}
              trackColor={{ false: "#767577", true: theme.primary }}
              thumbColor="#f4f3f4"
              ios_backgroundColor="#3e3e3e"
              style={{ transform: [{ scale: 1.0 }], borderWidth: 0 }}
            />
          </View>
        </View>

        {user && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.account')}</Text>

            <TouchableOpacity
              style={[styles.logoutButton, {
                backgroundColor: theme.cardBackground,
                borderWidth: 1,
                borderColor: theme.border
              }]}
              onPress={handleLogout}
            >
              <Text style={[styles.logoutText, { color: theme.text }]}>{t('common.logout')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.about')}</Text>

          <View style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>{t('settings.version')}</Text>
            <Text style={[styles.settingValue, { color: theme.secondary }]}>
              {codeVersion}
            </Text>
          </View>

          <TouchableOpacity style={styles.settingItem} onPress={() => showModal(t('settings.aboutApp.title'), t('settings.aboutApp.message'))}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>{t('settings.help')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleStoreUpdate}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>
              {Platform.OS === 'android'
                ? t('settings.update.openRuStore', 'Открыть DomGo в RuStore')
                : t('settings.update.openAppStore', 'Открыть DomGo в App Store')}
            </Text>
            <Ionicons name="open-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.versionNote, { color: theme.secondary }]}>
            {t('settings.update.description', 'После публикации новое обновление можно будет установить через магазин приложений.')}
          </Text>

          <TouchableOpacity style={styles.settingItem} onPress={() => showModal(t('settings.contactInfo.title'), t('settings.contactInfo.message'))}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>{t('settings.contactUs')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>

          {/* Условия размещения объявлений */}
          <TouchableOpacity style={styles.settingItem} onPress={() => showModal(t('settings.listingTerms.title'), t('settings.listingTerms.message'))}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>{t('settings.listingTerms.title')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>
        </View>

        <CustomModal
          visible={modalVisible}
          title={modalTitle}
          message={modalMessage}
          onClose={() => setModalVisible(false)}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  contentWrapper: {
    width: '100%'
  },
  webContentWrapper: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%'
  },
  webContentContainer: {
    flexGrow: 1,
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  section: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  settingLabel: {
    fontSize: 16,
  },
  settingValue: {
    fontSize: 16,
  },
  logoutButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
    marginVertical: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  versionNote: {
    fontSize: 12,
    marginTop: 2,
  },
  otaLogContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  otaLogTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  otaLogText: {
    fontSize: 12,
    lineHeight: 16,
  }
});

export default SettingsScreen;
