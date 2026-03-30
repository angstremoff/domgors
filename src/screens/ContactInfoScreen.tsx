import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../contexts/ThemeContext';
import Colors from '../constants/colors';
import { showSuccessAlert, showErrorAlert } from '../utils/alertUtils';
import {
  fetchContactProfile,
  getContactProfileValidationError,
  saveContactProfile,
  type ContactProfileClient,
  type ContactProfile,
} from '../utils/contactProfile';

const EMPTY_CONTACT_PROFILE: ContactProfile = {
  name: '',
  phone: '',
  email: '',
  avatar_url: null,
};

const ContactInfoScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [loading, setLoading] = useState(false);
  const contactSupabase = supabase as unknown as ContactProfileClient;
  const [profile, setProfile] = useState<ContactProfile>(EMPTY_CONTACT_PROFILE);

  useEffect(() => {
    if (!user) {
      setProfile(EMPTY_CONTACT_PROFILE);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await fetchContactProfile(contactSupabase, user.id, user.email || '');
        setProfile(data);
      } catch {
        showErrorAlert(t('profile.errors.saveFailed'));
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [contactSupabase, t, user]);

  const handleSave = async () => {
    if (!user) {
      return;
    }

    const validationError = getContactProfileValidationError(profile);
    if (validationError === 'name') {
      showErrorAlert(t('profile.errors.nameRequired'));
      return;
    }

    if (validationError === 'phone') {
      showErrorAlert(t('profile.errors.phoneRequired'));
      return;
    }

    try {
      setLoading(true);
      const savedProfile = await saveContactProfile(contactSupabase, {
        userId: user.id,
        email: user.email || profile.email,
        profile,
      });
      setProfile(savedProfile);
      showSuccessAlert(t('profile.contactInfoSaved'));
    } catch {
      showErrorAlert(t('profile.errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.authMessage, { color: theme.text }]}>{t('auth.requiredForProfile')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('profile.contactInfo')}</Text>
          <Text style={[styles.sectionDescription, { color: theme.secondary }]}>
            {t('profile.contactInfoDescription')}
          </Text>

          <Text style={[styles.fieldLabel, { color: theme.text }]}>{t('profile.name')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={profile.name}
            onChangeText={(text) => setProfile((current) => ({ ...current, name: text }))}
            placeholder={t('addProperty.form.namePlaceholder')}
            placeholderTextColor={theme.secondary}
            autoCapitalize="words"
            selectTextOnFocus
          />

          <Text style={[styles.fieldLabel, { color: theme.text }]}>{t('profile.phone')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={profile.phone}
            onChangeText={(text) => setProfile((current) => ({ ...current, phone: text }))}
            placeholder={t('addProperty.form.phonePlaceholder')}
            placeholderTextColor={theme.secondary}
            keyboardType="phone-pad"
            selectTextOnFocus
          />

          <Text style={[styles.fieldLabel, { color: theme.text }]}>{t('profile.email')}</Text>
          <View style={[styles.readOnlyField, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.readOnlyValue, { color: theme.text }]}>{profile.email || user.email}</Text>
          </View>

          <View style={styles.hintList}>
            <Text style={[styles.hintText, { color: theme.secondary }]}>{t('profile.contactNameHint')}</Text>
            <Text style={[styles.hintText, { color: theme.secondary }]}>{t('profile.contactPhoneHint')}</Text>
            <Text style={[styles.hintText, { color: theme.secondary }]}>{t('profile.contactEmailHint')}</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 16,
    paddingVertical: 10,
  },
  readOnlyField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  readOnlyValue: {
    fontSize: 16,
  },
  hintList: {
    gap: 8,
    marginBottom: 20,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
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
  },
});

export default ContactInfoScreen;
