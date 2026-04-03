import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
import {
  fetchAgencyProfileByUserId,
  upsertAgencyProfile,
  uploadAgencyLogo,
  type AgencyProfileFormData,
  type AgencySupabaseClient,
} from '../utils/agencyProfile';

const EMPTY_CONTACT_PROFILE: ContactProfile = {
  name: '',
  phone: '',
  email: '',
  avatar_url: null,
};

const EMPTY_AGENCY_PROFILE: AgencyProfileFormData = {
  name: '',
  email: '',
  site: '',
  location: '',
  logo_url: '',
};

const ContactInfoScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [loading, setLoading] = useState(false);
  const contactSupabase = supabase as unknown as ContactProfileClient;
  const agencySupabase = supabase as unknown as AgencySupabaseClient;
  const [profile, setProfile] = useState<ContactProfile>(EMPTY_CONTACT_PROFILE);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfileFormData | null>(null);
  const [isAgency, setIsAgency] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

        const { data: userData } = await supabase
          .from('users')
          .select('is_agency')
          .eq('id', user.id)
          .maybeSingle();

        const userIsAgency = (userData as { is_agency: boolean } | null)?.is_agency === true;
        setIsAgency(userIsAgency);

        if (userIsAgency) {
          const agencyData = await fetchAgencyProfileByUserId(agencySupabase, user.id);
          setAgencyProfile(agencyData || { ...EMPTY_AGENCY_PROFILE });
        }
      } catch {
        showErrorAlert(t('profile.errors.saveFailed'));
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [contactSupabase, agencySupabase, supabase, t, user]);

  const handleLogoPick = useCallback(async () => {
    if (!user) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showErrorAlert(t('property.errors.permissionDenied'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      setUploadingLogo(true);
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const url = await uploadAgencyLogo(agencySupabase, user.id, blob);
      setAgencyProfile((current) => current ? { ...current, logo_url: url } : null);
    } catch {
      showErrorAlert(t('profile.errors.saveFailed'));
    } finally {
      setUploadingLogo(false);
    }
  }, [agencySupabase, t, user]);

  const handleSave = async () => {
    if (!user) return;

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

      if (isAgency && agencyProfile) {
        await upsertAgencyProfile(agencySupabase, user.id, agencyProfile);
      }

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

          {isAgency && agencyProfile && (
            <View style={[styles.agencySection, { borderTopColor: theme.border }]}>
              <View style={styles.agencyHeader}>
                <Ionicons name="business-outline" size={20} color={theme.primary} />
                <Text style={[styles.agencyTitle, { color: theme.text }]}>{t('agency.title')}</Text>
              </View>

              <View style={styles.logoRow}>
                {agencyProfile.logo_url ? (
                  <Image source={{ uri: agencyProfile.logo_url }} style={styles.logoImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.logoPlaceholder, { backgroundColor: theme.primary + '1A' }]}>
                    <Ionicons name="business-outline" size={28} color={theme.primary} />
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.logoButton, { borderColor: theme.primary }]}
                  onPress={handleLogoPick}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Text style={[styles.logoButtonText, { color: theme.primary }]}>
                      {t('addProperty.form.uploadPhoto')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.text }]}>{t('agency.title')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={agencyProfile.name}
                onChangeText={(text) => setAgencyProfile((current) => current ? { ...current, name: text } : null)}
                placeholder={t('agency.title')}
                placeholderTextColor={theme.secondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>{t('profile.email')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={agencyProfile.email}
                onChangeText={(text) => setAgencyProfile((current) => current ? { ...current, email: text } : null)}
                placeholder="agency@example.com"
                placeholderTextColor={theme.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Telegram / Сайт</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={agencyProfile.site}
                onChangeText={(text) => setAgencyProfile((current) => current ? { ...current, site: text } : null)}
                placeholder="@username, t.me/..."
                placeholderTextColor={theme.secondary}
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>{t('property.addProperty.location', 'Адрес')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={agencyProfile.location}
                onChangeText={(text) => setAgencyProfile((current) => current ? { ...current, location: text } : null)}
                placeholder={t('property.addProperty.propertyAddressPlaceholder', 'Адрес агентства')}
                placeholderTextColor={theme.secondary}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            onPress={handleSave}
            disabled={loading || uploadingLogo}
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
  agencySection: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  agencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  agencyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logoImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
