import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../contexts/ThemeContext';
import Colors from '../constants/colors';
import { showErrorAlert } from '../utils/alertUtils';
import { fetchContactProfile, type ContactProfileClient, type ContactProfile } from '../utils/contactProfile';

const EMPTY_CONTACT_PROFILE: ContactProfile = {
  name: '',
  phone: '',
  email: '',
  avatar_url: null,
};

const ProfileScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const { darkMode } = useTheme();
  const theme = darkMode ? Colors.dark : Colors.light;
  const contactSupabase = supabase as unknown as ContactProfileClient;
  const [profile, setProfile] = useState<ContactProfile>(EMPTY_CONTACT_PROFILE);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(EMPTY_CONTACT_PROFILE);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchContactProfile(contactSupabase, user.id, user.email || '');
      setProfile(data);
    } catch {
      showErrorAlert(t('profile.errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  }, [contactSupabase, t, user]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      navigation.navigate('Home');
    } catch {
      showErrorAlert(t('auth.logoutFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.authMessage, { color: theme.text }]}>{t('auth.requiredForProfile')}</Text>
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.profileInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.card }]}>
            {profile.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={30} color={theme.primary} />
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.headerText }]}>
              {profile.name || t('property.sellerNameUnavailable')}
            </Text>
            <Text style={[styles.userEmail, { color: darkMode ? '#FFFFFF' : '#1A4CA1' }]}>{user.email}</Text>
          </View>
        </View>
      </View>

      {loading && !profile.name ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('profile.contactInfo')}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('ContactInfo')}
              >
                <Ionicons name="create-outline" size={20} color={theme.primary} />
                <Text style={[styles.editButtonText, { color: theme.primary }]}>{t('common.edit')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.secondary }]}>{t('profile.name')}</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {profile.name || t('property.sellerNameUnavailable')}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.secondary }]}>{t('profile.phone')}</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {profile.phone || t('property.sellerNameUnavailable')}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.secondary }]}>{t('profile.email')}</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{profile.email || user.email}</Text>
            </View>

            <Text style={[styles.sectionHint, { color: theme.secondary }]}>
              {t('profile.contactInfoDescription')}
            </Text>
          </View>

          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('ContactInfo')}
            >
              <Ionicons name="call-outline" size={24} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>{t('profile.contactInfo')}</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.secondary} style={styles.menuArrow} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('MyProperties')}
            >
              <Ionicons name="home-outline" size={24} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>{t('profile.myProperties')}</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.secondary} style={styles.menuArrow} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Favorites')}
            >
              <Ionicons name="heart-outline" size={24} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>{t('common.favorites')}</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.secondary} style={styles.menuArrow} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={24} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>{t('settings.title')}</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.secondary} style={styles.menuArrow} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: theme.card }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
            <Text style={styles.logoutText}>{t('common.logout')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1A4CA1',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  menuArrow: {
    marginLeft: 'auto',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
    marginLeft: 12,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#1A4CA1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
