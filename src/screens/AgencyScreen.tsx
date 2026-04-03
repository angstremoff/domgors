import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, ActivityIndicator, Platform, useWindowDimensions, Share, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import Colors from '../constants/colors';
import { supabase } from '../lib/supabaseClient';
import type { AgencyScreenProps } from '../types/navigation';
import OptimizedPropertyCard from '../components/OptimizedPropertyCard';
import type { Property } from '../contexts/PropertyContext';
import { Logger } from '../utils/logger';
import {
  formatAgencySiteUrl,
  formatAgencyTelegramUrl,
  normalizeAgencyProfile,
  type NormalizedAgencyProfile,
} from '../utils/agencyProfile';

const AgencyScreen = ({ route, navigation }: AgencyScreenProps) => {
  const { agencyId } = route.params;
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const theme = darkMode ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && width >= 1024;
  const isTabletWeb = isWeb && width >= 768 && width < 1024;
  const horizontalPadding = isWeb
    ? (isDesktopWeb ? 96 : isTabletWeb ? 48 : 24)
    : width >= 600
      ? 24
      : 16;

  const [agency, setAgency] = useState<NormalizedAgencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propsLoading, setPropsLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadAgency = async () => {
      try {
        setLoading(true);
        let { data, error } = await supabase
          .from('agency_profiles')
          .select('*')
          .eq('id', agencyId)
          .maybeSingle();

        if (!data) {
          const fb = await supabase
            .from('agency_profiles')
            .select('*')
            .eq('user_id', agencyId)
            .maybeSingle();
          data = fb.data;
          error = fb.error;
        }

        if (error || !data) {
          Logger.warn('Не удалось загрузить профиль агентства:', error);
          setAgency(null);
        } else {
          Logger.debug('Agency profile loaded:', data);
          setAgency(normalizeAgencyProfile(data));
        }
      } catch (e) {
        Logger.error('Ошибка загрузки агентства:', e);
      } finally {
        setLoading(false);
      }
    };
    loadAgency();
  }, [agencyId]);

  // Загрузка объявлений агентства
  useEffect(() => {
    const loadAgencyProperties = async () => {
      const targetId = agency?.id || agencyId; // предпочитаем фактический id профиля
      if (!targetId) return;
      try {
        setPropsLoading(true);
        const { data: initialData, error } = await supabase
          .from('properties')
          .select(`
            *,
            user:users(name, phone, is_agency),
            city:cities(name),
            district:districts(id, name, city_id),
            agency:agency_profiles(id, name, phone, logo_url, description)
          `)
          .eq('agency_id', targetId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        let data = initialData ?? [];

        // Если по agency_id пусто — пробуем фолбек по user_id (случай, когда route получил users.id)
        if (!data || data.length === 0) {
          const fb = await supabase
            .from('properties')
            .select(`
              *,
              user:users(name, phone, is_agency),
              city:cities(name),
              district:districts(id, name, city_id),
              agency:agency_profiles(id, name, phone, logo_url, description)
            `)
            .eq('user_id', targetId)
            .order('created_at', { ascending: false });
          data = fb.data ?? [];
        }

        setProperties(data as Property[]);
      } catch (e) {
        Logger.error('Ошибка загрузки объявлений агентства:', e);
      } finally {
        setPropsLoading(false);
      }
    };
    loadAgencyProperties();
  }, [agencyId, agency?.id]);

  const siteUrl = formatAgencySiteUrl(agency?.site);
  const telegramUrl = formatAgencyTelegramUrl(agency?.telegram);
  const instagramUrl = formatAgencySiteUrl(agency?.instagram);
  const facebookUrl = formatAgencySiteUrl(agency?.facebook);
  const emailNorm = agency?.email ?? null;
  const addressNorm = agency?.location ?? null;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!agency) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>{t('common.notFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.scrollContent]}
    >
      <View style={[styles.desktopFrame, { paddingHorizontal: horizontalPadding }]}
      >
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, styles.cardWeb]}>
          {agency.logo_url ? (
            <Image source={{ uri: agency.logo_url }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: theme.primary + '1A' }]}>
              <Ionicons name="business-outline" size={28} color={theme.primary} />
            </View>
          )}

          <View style={styles.titleRow}>
            {agency.name ? (
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                {agency.name}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: theme.primary + '1A' }]}
              onPress={() => {
                const targetId = agency.id || agencyId;
                const shareUrl = `https://domgo.rs/agency.html?id=${targetId}`;
                const message = `${agency.name || t('agency.unnamed', 'Агентство')}\n${shareUrl}`;
                Share.share({
                  message,
                  ...(Platform.OS === 'ios'
                    ? { url: shareUrl, title: t('agency.shareTitle', 'Поделиться агентством') }
                    : {})
                }).catch((err) => Logger.error('Ошибка шаринга агентства:', err));
              }}
              accessibilityLabel={t('agency.shareTitle', 'Поделиться агентством')}
            >
              <Ionicons name="share-social-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {agency.description ? (
            <Text style={[styles.description, { color: theme.text }]}>{agency.description}</Text>
          ) : null}

          {/* Адрес, если есть */}
          {addressNorm ? (
            <Text style={[styles.description, { color: theme.secondary, marginTop: 6 }]}>{addressNorm}</Text>
          ) : null}

          {/* Контакты */}
          <View style={styles.section}>
            {agency.phone ? (
              <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={() => Linking.openURL(`tel:${agency.phone}`)}>
                <Text style={styles.buttonText}>{t('agency.call')}</Text>
              </TouchableOpacity>
            ) : null}

            {/* Email */}
            {emailNorm ? (
              <TouchableOpacity style={[styles.linkButton, { borderColor: theme.primary }]} onPress={() => Linking.openURL(`mailto:${emailNorm}`)}>
                <Text style={[styles.linkText, { color: theme.primary }]}>{t('agency.email')}</Text>
              </TouchableOpacity>
            ) : null}

            {siteUrl ? (
              <TouchableOpacity style={[styles.linkButton, { borderColor: theme.primary }]} onPress={() => Linking.openURL(siteUrl)}>
                <Text style={[styles.linkText, { color: theme.primary }]}>{t('agency.website')}</Text>
              </TouchableOpacity>
            ) : null}

            {telegramUrl ? (
              <TouchableOpacity style={[styles.linkButton, { borderColor: theme.primary }]} onPress={() => Linking.openURL(telegramUrl)}>
                <Text style={[styles.linkText, { color: theme.primary }]}>{t('agency.telegram')}</Text>
              </TouchableOpacity>
            ) : null}

            {instagramUrl ? (
              <TouchableOpacity style={[styles.linkButton, { borderColor: theme.primary }]} onPress={() => Linking.openURL(instagramUrl)}>
                <Text style={[styles.linkText, { color: theme.primary }]}>{t('agency.instagram')}</Text>
              </TouchableOpacity>
            ) : null}

            {facebookUrl ? (
              <TouchableOpacity style={[styles.linkButton, { borderColor: theme.primary }]} onPress={() => Linking.openURL(facebookUrl)}>
                <Text style={[styles.linkText, { color: theme.primary }]}>{t('agency.facebook')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Список объявлений агентства с виртуализацией */}
        <View style={[styles.propertiesSection, styles.propertiesSectionWeb]}>
          {propsLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : properties.length === 0 ? (
            <Text style={{ color: theme.secondary, textAlign: 'center', marginTop: 8 }}>{t('common.notFound')}</Text>
          ) : (
            <FlatList
              data={properties}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.propertyItem, styles.propertyItemDesktop]}>
                  <OptimizedPropertyCard
                    property={item}
                    darkMode={darkMode}
                    onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
                  />
                </View>
              )}
              scrollEnabled={false}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={Platform.OS !== 'web'}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 8,
  },
  desktopFrame: {
    width: '100%',
    paddingBottom: 24,
    maxWidth: 1280,
    alignSelf: 'center',
  },
  card: {
    margin: 2,
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardWeb: {
    marginHorizontal: 0,
    marginTop: 8,
    marginBottom: 2,
    padding: 6,
    borderRadius: 12,
  },
  logo: {
    width: '100%',
    height: 50,
    marginBottom: 2,
  },
  logoPlaceholder: {
    width: '100%',
    height: 50,
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 1,
    flex: 1,
  },
  shareButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
  },
  section: {
    marginTop: 4,
  },
  button: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  linkButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 3,
    borderWidth: 1,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  propertiesSection: {
    marginTop: 8,
    paddingBottom: 8,
    gap: 2,
  },
  propertiesSectionWeb: {
    gap: 2,
  },
  propertyItem: {
    width: '100%',
  },
  propertyItemDesktop: {
    marginBottom: 0,
  },
});

export default AgencyScreen;
