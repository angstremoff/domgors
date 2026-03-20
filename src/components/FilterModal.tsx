import React, { useEffect, useState, useMemo } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Checkbox from './Checkbox';
import RangeInput from './RangeInput';
import Colors from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DealType = 'sale' | 'rent' | 'newBuildings';

type FiltersPayload = {
  propertyTypes: string[];
  rooms: string[];
  price: number[];
  areas: number[];
  features: string[];
};

type DraftFilters = {
  propertyTypes: string[];
  rooms: string[];
  price: [string, string];
  area: [string, string];
  features: string[];
};

const AREA_BOUNDS = { min: 0, max: 500 } as const;

const toRangeStrings = (
  range: number[] | undefined,
  fallback: [number, number]
): [string, string] => {
  if (!Array.isArray(range) || range.length !== 2) {
    return [String(fallback[0]), String(fallback[1])];
  }

  const [rawMin, rawMax] = range;
  return [
    rawMin === undefined || rawMin === null ? '' : String(rawMin),
    rawMax === undefined || rawMax === null ? '' : String(rawMax)
  ];
};

const parseNumberOrNull = (value: string): number | null => {
  if (!value) {
    return null;
  }
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FiltersPayload) => void;
  filters?: FiltersPayload;
  onFiltersChange: (filters: FiltersPayload) => void;
  propertyType: DealType;
  darkMode?: boolean;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  filters,
  onFiltersChange,
  propertyType,
  darkMode = false
}) => {
  const { t } = useTranslation();
  const { darkMode: contextDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const isDarkMode = darkMode || contextDarkMode;
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const topInset = Platform.OS === 'ios' ? Math.max(insets.top, 12) : 0;

  const getPriceBounds = () =>
    propertyType === 'rent'
      ? { min: 0, max: 3000 }
      : { min: 0, max: 500000 };

  const buildInitialState = (): DraftFilters => {
    const { min, max } = getPriceBounds();
    return {
      propertyTypes: filters?.propertyTypes ?? [],
      rooms: filters?.rooms ?? [],
      price: toRangeStrings(filters?.price, [min, max]),
      area: toRangeStrings(filters?.areas, [AREA_BOUNDS.min, AREA_BOUNDS.max]),
      features: filters?.features ?? [],
    };
  };

  const [localFilters, setLocalFilters] = useState<DraftFilters>(buildInitialState);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [areaError, setAreaError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setLocalFilters(buildInitialState());
    setPriceError(null);
    setAreaError(null);
  }, [visible, propertyType]);

  const handlePropertyTypeChange = (type: string) => {
    setLocalFilters(prev => {
      const updatedTypes = prev.propertyTypes.includes(type)
        ? prev.propertyTypes.filter(t => t !== type)
        : [...prev.propertyTypes, type];
      return { ...prev, propertyTypes: updatedTypes };
    });
  };

  const handleRoomChange = (room: string) => {
    setLocalFilters(prev => {
      const updatedRooms = prev.rooms.includes(room)
        ? prev.rooms.filter(r => r !== room)
        : [...prev.rooms, room];
      return { ...prev, rooms: updatedRooms };
    });
  };

  const handleFeatureChange = (feature: string) => {
    setLocalFilters(prev => {
      const updated = prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature];
      return { ...prev, features: updated };
    });
  };

  const handlePriceChange = (values: [string, string]) => {
    setPriceError(null);
    setLocalFilters(prev => ({ ...prev, price: values }));
  };

  const handleAreaChange = (values: [string, string]) => {
    setAreaError(null);
    setLocalFilters(prev => ({ ...prev, area: values }));
  };

  const validateRange = (
    range: [string, string],
    bounds: { min: number; max: number }
  ): { range: number[]; error?: string } => {
    const min = parseNumberOrNull(range[0]);
    const max = parseNumberOrNull(range[1]);

    if ((range[0] && min === null) || (range[1] && max === null)) {
      return { range: [], error: t('filters.validation.invalidNumber') };
    }

    if (min === null && max === null) {
      return { range: [] };
    }

    const clamp = (value: number) => Math.min(bounds.max, Math.max(bounds.min, value));

    const normalizedMin = clamp(min ?? bounds.min);
    const normalizedMax = clamp(max ?? bounds.max);

    const finalMin = normalizedMin > normalizedMax ? normalizedMax : normalizedMin;
    const finalMax = normalizedMin > normalizedMax ? normalizedMin : normalizedMax;

    return { range: [finalMin, finalMax] };
  };

  const handleApplyPress = () => {
    const priceValidation = validateRange(localFilters.price, getPriceBounds());
    const areaValidation = validateRange(localFilters.area, AREA_BOUNDS);

    setPriceError(priceValidation.error ?? null);
    setAreaError(areaValidation.error ?? null);

    if (priceValidation.error || areaValidation.error) {
      return;
    }

    const normalizedFilters: FiltersPayload = {
      propertyTypes: localFilters.propertyTypes,
      rooms: localFilters.rooms,
      price: priceValidation.range,
      areas: areaValidation.range,
      features: localFilters.features
    };

    setLocalFilters(prev => ({
      ...prev,
      price: normalizedFilters.price.length === 2
        ? [String(normalizedFilters.price[0]), String(normalizedFilters.price[1])]
        : ['', ''],
      area: normalizedFilters.areas.length === 2
        ? [String(normalizedFilters.areas[0]), String(normalizedFilters.areas[1])]
        : ['', '']
    }));

    onFiltersChange(normalizedFilters);
    onApply(normalizedFilters);
  };

  const getPropertyTypes = () => [
    { id: 'apartment', label: t('filters.apartment') },
    { id: 'house', label: t('filters.house') },
    { id: 'commercial', label: t('filters.commercial') }
  ];

  // Мемоизированные опции для предотвращения пересоздания на каждом рендере
  const roomOptions = useMemo(() => [
    { id: '1', label: '1' },
    { id: '2', label: '2' },
    { id: '3', label: '3' },
    { id: '4', label: '4' },
    { id: '5+', label: '5+' }
  ], []);

  const features = useMemo(() => [
    { id: 'parking', label: t('filters.parking') },
    { id: 'balcony', label: t('filters.balcony') },
    { id: 'elevator', label: t('filters.elevator') },
    { id: 'furnished', label: t('filters.furniture') }
  ], [t]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: theme.background, paddingTop: topInset }
        ]}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>{t('filters.title')}</Text>
        </View>

        <ScrollView style={styles.content}>
          {/* Тип недвижимости */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('filters.propertyType')}
            </Text>
            <View style={styles.propertyTypeRow}>
              {getPropertyTypes().map(type => (
                <View key={type.id} style={styles.propertyTypeItem}>
                  <Checkbox
                    checked={localFilters.propertyTypes.includes(type.id)}
                    onPress={() => handlePropertyTypeChange(type.id)}
                    darkMode={isDarkMode}
                  />
                  <Text style={[styles.checkboxLabel, { color: theme.text }]} numberOfLines={2}>
                    {type.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Комнаты */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('filters.rooms')}
            </Text>
            <View style={styles.roomsContainer}>
              {roomOptions.slice(0, 2).map(room => (
                <View key={room.id} style={styles.roomItem}>
                  <Checkbox
                    checked={localFilters.rooms.includes(room.id)}
                    onPress={() => handleRoomChange(room.id)}
                    darkMode={isDarkMode}
                  />
                  <Text style={[styles.checkboxLabel, { color: theme.text }]}>
                    {room.label}
                  </Text>
                </View>
              ))}
              {roomOptions.slice(2, 3).map(room => (
                <View key={room.id} style={styles.roomItem}>
                  <Checkbox
                    checked={localFilters.rooms.includes(room.id)}
                    onPress={() => handleRoomChange(room.id)}
                    darkMode={isDarkMode}
                  />
                  <Text style={[styles.checkboxLabel, { color: theme.text }]}>
                    {room.label}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.roomsContainer}>
              {roomOptions.slice(3).map(room => (
                <View key={room.id} style={styles.roomItem}>
                  <Checkbox
                    checked={localFilters.rooms.includes(room.id)}
                    onPress={() => handleRoomChange(room.id)}
                    darkMode={isDarkMode}
                  />
                  <Text style={[styles.checkboxLabel, { color: theme.text }]}>
                    {room.label}
                  </Text>
                </View>
              ))}
              <View style={styles.roomItem} />
            </View>
          </View>

          {/* Цена */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {propertyType === 'rent' ? t('filters.pricePerMonth') : t('filters.price')}
            </Text>
          <RangeInput
            value={localFilters.price}
            onChange={handlePriceChange}
            darkMode={isDarkMode}
            suffix="€"
            minPlaceholder={t('common.from')}
            maxPlaceholder={t('common.to')}
            hasError={!!priceError}
          />
            {priceError && (
              <Text style={[styles.errorText, { color: theme.error }]}>{priceError}</Text>
            )}
          </View>

          {/* Площадь */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('filters.area')}
            </Text>
          <RangeInput
            value={localFilters.area}
            onChange={handleAreaChange}
            darkMode={isDarkMode}
            suffix="m²"
            minPlaceholder={t('common.from')}
            maxPlaceholder={t('common.to')}
            hasError={!!areaError}
          />
            {areaError && (
              <Text style={[styles.errorText, { color: theme.error }]}>{areaError}</Text>
            )}
          </View>

          {/* Особенности */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('filters.features')}
            </Text>
            <View style={styles.featuresContainer}>
              {features.slice(0, 2).map(feature => (
                <View key={feature.id} style={styles.featureItem}>
                  <Checkbox
                    checked={localFilters.features.includes(feature.id)}
                    onPress={() => handleFeatureChange(feature.id)}
                    darkMode={isDarkMode}
                  />
                  <Text style={[styles.checkboxLabel, { color: theme.text }]}>
                    {feature.label}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.featuresContainer}>
              {features.slice(2).map(feature => (
                <View key={feature.id} style={styles.featureItem}>
                  <Checkbox
                    checked={localFilters.features.includes(feature.id)}
                    onPress={() => handleFeatureChange(feature.id)}
                    darkMode={isDarkMode}
                  />
                  <Text style={[styles.checkboxLabel, { color: theme.text }]}>
                    {feature.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: theme.primary }]}
            onPress={handleApplyPress}
          >
            <Text style={[styles.applyButtonText, { color: 'white' }]}>
              {t('filters.applyFilters')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    position: 'absolute',
    left: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  propertyTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  propertyTypeItem: {
    width: '50%',
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  roomItem: {
    width: '33.33%',
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  applyButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  featureItem: {
    width: '50%',
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
  },
});

export default FilterModal;
