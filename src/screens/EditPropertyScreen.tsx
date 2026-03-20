import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Switch
} from 'react-native';
import { Logger } from '../utils/logger';
import { useTranslation } from 'react-i18next';
import { propertyService } from '../services/propertyService';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useProperties, District } from '../contexts/PropertyContext';
import { showErrorAlert, showSuccessAlert } from '../utils/alertUtils';
import type { Database } from '../lib/database.types';
import { normalizePropertyRooms, parseFiniteNumberInput, propertyTypeSupportsRooms } from '../utils/propertyRules';

type Property = Database['public']['Tables']['properties']['Row'];
type PropertyInsert = Database['public']['Tables']['properties']['Insert'];

interface City {
  id: string;
  name: string;
}

// Список возможных особенностей
const FEATURES = [
  { id: 'parking', name: 'features.parking' },
  { id: 'balcony', name: 'features.balcony' },
  { id: 'elevator', name: 'features.elevator' },
  { id: 'furniture', name: 'features.furniture' },
];

const EditPropertyScreen = ({ route, navigation }: any) => {
  const { propertyId } = route.params;
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const { invalidateCache, loadDistricts } = useProperties(); // Получаем функцию обновления кэша и загрузку районов
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Форма
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [rooms, setRooms] = useState('');
  const [cityId, setCityId] = useState<string>('0');
  const [districtId, setDistrictId] = useState<string>('');
  const [districtOptions, setDistrictOptions] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [propertyType, setPropertyType] = useState<'sale' | 'rent'>('sale');
  const [propertyCategory, setPropertyCategory] = useState<PropertyInsert['property_type']>('apartment');
  const [images, setImages] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const supportsRooms = propertyTypeSupportsRooms(propertyCategory);

  // Инициализация
  useEffect(() => {
    const init = async () => {
      try {
        await loadCities();
        await loadProperty();
      } catch (error) {
        Logger.error('Ошибка при инициализации:', error);
      }
    };

    init();
  }, [propertyId]);

  const loadCities = async () => {
    try {
      const data = await propertyService.getCities();
      setCities(data);
    } catch (error) {
      Logger.error('Ошибка при загрузке городов:', error);
      showErrorAlert(t('property.errorLoadingCities'));
    }
  };

  const loadDistrictOptions = useCallback(async (cityValue: string | number) => {
    const numericCityId = typeof cityValue === 'string' ? Number(cityValue) : cityValue;
    if (!numericCityId || Number.isNaN(numericCityId)) {
      setDistrictOptions([]);
      return;
    }

    setDistrictsLoading(true);
    try {
      const data = await loadDistricts(numericCityId);
      setDistrictOptions(data || []);
    } catch (error) {
      Logger.error('Ошибка при загрузке районов:', error);
      setDistrictOptions([]);
    } finally {
      setDistrictsLoading(false);
    }
  }, [loadDistricts]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const data = await propertyService.getPropertyById(propertyId);
      setProperty(data);
      
      // Заполняем форму данными
      setTitle(data.title || '');
      setDescription(data.description || '');
      setPrice(data.price?.toString() || '');
      // В веб-версии используется поле location вместо address
      setAddress(data.location || '');
      setArea(data.area?.toString() || '');
      setRooms(data.rooms?.toString() || '');
      
      // Город берётся напрямую из city_id и преобразуется в строку 
      // (Picker в React Native работает со строками)
      if (data.city_id) {
        setCityId(data.city_id.toString());
        await loadDistrictOptions(data.city_id);
      } else {
        setDistrictOptions([]);
      }

      if (data.district_id) {
        setDistrictId(data.district_id);
        const districtFromRelation = (data as any).district as District | undefined;
        setSelectedDistrict(districtFromRelation || null);
      } else {
        setDistrictId('');
        setSelectedDistrict(null);
      }
      
      setPropertyType(data.type || 'sale');
      setPropertyCategory(data.property_type || 'apartment');
      setImages(data.images || []);
      setSelectedFeatures(data.features || []);

      Logger.debug('Загружено объявление:', data);
      Logger.debug('ID города:', data.city_id, 'Адрес (location):', data.location);
    } catch (error) {
      Logger.error('Ошибка при загрузке объявления:', error);
      showErrorAlert(t('property.errorLoadingProperty'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (property) {
      // Можно добавить дополнительную логику при изменении property
    }
  }, [property]);

  useEffect(() => {
    if (cityId && cityId !== '0') {
      loadDistrictOptions(cityId);
      if (selectedDistrict && selectedDistrict.city_id !== Number(cityId)) {
        setSelectedDistrict(null);
        setDistrictId('');
      }
    } else {
      setDistrictOptions([]);
      setSelectedDistrict(null);
      setDistrictId('');
    }
  }, [cityId, selectedDistrict, loadDistrictOptions]);

  useEffect(() => {
    if (!supportsRooms && rooms) {
      setRooms('');
    }
  }, [supportsRooms, rooms]);

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => {
      if (prev.includes(featureId)) {
        return prev.filter(id => id !== featureId);
      } else {
        return [...prev, featureId];
      }
    });
  };

  const pickImage = async () => {
    try {
      Logger.debug('Запрос на выбор изображения...');
      
      // Запрашиваем разрешение на доступ к галерее
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Logger.debug('Разрешение на доступ к галерее не получено');
        showErrorAlert(t('property.permissionDenied'));
        return;
      }
      
      Logger.debug('Разрешение получено, открываем галерею');
      
      // Открываем галерею для выбора изображения
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      Logger.debug('Результат выбора изображения:', result);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        Logger.debug('Выбрано изображение:', selectedAsset.uri);
        
        try {
          setUploadingImages(true);
          
          // Получаем имя файла из URI
          const fileName = selectedAsset.uri.split('/').pop() || 'image.jpg';
          Logger.debug('Имя файла:', fileName);
          
          // Загружаем изображение на сервер
          const imageUrl = await propertyService.uploadImage(selectedAsset.uri, fileName);
          Logger.debug('Изображение загружено, URL:', imageUrl);
          
          // Добавляем URL в список изображений
          setImages(prev => [...prev, imageUrl]);
        } catch (error) {
          Logger.error('Ошибка при загрузке изображения:', error);
          showErrorAlert(t('property.errorUploadingImage'));
        } finally {
          setUploadingImages(false);
        }
      } else {
        Logger.debug('Выбор изображения отменен или произошла ошибка');
      }
    } catch (error) {
      Logger.error('Ошибка при выборе изображения:', error);
      showErrorAlert(t('property.errorSelectingImage'));
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };
  
  // Функция для перемещения фотографий вверх по списку
  const moveImageUp = (index: number) => {
    if (index === 0) return; // Нельзя переместить вверх первое фото
    setImages(prevImages => {
      const newImages = [...prevImages];
      // Меняем местами текущее и предыдущее фото
      [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
      return newImages;
    });
  };

  // Функция для перемещения фотографий вниз по списку
  const moveImageDown = (index: number) => {
    if (index === images.length - 1) return; // Нельзя переместить вниз последнее фото
    setImages(prevImages => {
      const newImages = [...prevImages];
      // Меняем местами текущее и следующее фото
      [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
      return newImages;
    });
  };

  const handleSave = async () => {
    try {
      if (images.length === 0) {
        showErrorAlert(t('property.noImages'));
        return;
      }

      setSaving(true);
      Logger.debug('Сохранение объявления...');
      Logger.debug('ID объявления:', propertyId);
      
      // Проверяем обязательные поля
      if (!title.trim() || !description.trim() || !price || !cityId || !address.trim() || !area || (supportsRooms && !rooms)) {
        showErrorAlert(t('property.requiredFields'));
        setSaving(false);
        return;
      }

      if (!districtId) {
        showErrorAlert(t('property.validation.districtRequired', 'Пожалуйста, выберите район'));
        setSaving(false);
        return;
      }

      const numericPrice = parseFiniteNumberInput(price);
      const numericArea = parseFiniteNumberInput(area);
      const numericRooms = normalizePropertyRooms(propertyCategory, rooms);

      if (numericPrice === null || numericArea === null || (supportsRooms && numericRooms === null)) {
        showErrorAlert(t('filters.validation.invalidNumber'));
        setSaving(false);
        return;
      }
      
      // Собираем данные для обновления
      const updatedProperty: Partial<PropertyInsert> = {
        title: title.trim(),
        description: description.trim(),
        price: numericPrice,
        location: address.trim(), // В API используется поле location вместо address
        area: numericArea,
        rooms: numericRooms ?? 0,
        city_id: parseInt(cityId.trim(), 10),
        district_id: districtId,
        type: propertyType,
        property_type: propertyCategory,
        features: selectedFeatures,
        images,
      };
      
      Logger.debug('Данные для обновления:', updatedProperty);
      
      // Отправляем запрос на обновление
      await propertyService.updateProperty(propertyId, updatedProperty);
      
      // Принудительно очищаем кэш и перезагружаем данные
      await invalidateCache();
      Logger.debug('Кэш объявлений очищен после обновления объявления');
      
      Logger.debug('Объявление успешно обновлено');
      showSuccessAlert(t('property.updateSuccess'), () => {
        // Вместо goBack используем navigate для предотвращения ошибки навигации
        navigation.navigate('MyProperties');
      });
    } catch (error) {
      Logger.error('Ошибка при сохранении объявления:', error);
      showErrorAlert(t('property.errorUpdatingProperty'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, darkMode && styles.darkContainer]}>
        <ActivityIndicator size="large" color={darkMode ? "#FFFFFF" : "#1E3A8A"} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, darkMode && styles.darkContainer]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>{t('property.basicInfo')}</Text>
          
          <Text style={[styles.label, darkMode && styles.darkText]}>{t('property.dealType')}</Text>
          <View style={[styles.pickerContainer, darkMode && styles.darkPickerContainer]}>
            <Picker
              selectedValue={propertyType}
              onValueChange={(itemValue) => setPropertyType(itemValue as 'sale' | 'rent')}
              style={[styles.picker, darkMode && styles.darkPicker]}
              dropdownIconColor={darkMode ? "#FFFFFF" : "#1E3A8A"}
            >
              <Picker.Item label={t('property.sale')} value="sale" />
              <Picker.Item label={t('property.rent')} value="rent" />
            </Picker>
          </View>
          
          <Text style={[styles.label, darkMode && styles.darkText]}>{t('property.propertyType')}</Text>
          <View style={[styles.pickerContainer, darkMode && styles.darkPickerContainer]}>
            <Picker
              selectedValue={propertyCategory}
              onValueChange={(itemValue) => setPropertyCategory(itemValue as PropertyInsert['property_type'])}
              style={[styles.picker, darkMode && styles.darkPicker]}
              dropdownIconColor={darkMode ? "#FFFFFF" : "#1E3A8A"}
            >
              <Picker.Item label={t('property.apartment')} value="apartment" />
              <Picker.Item label={t('property.house')} value="house" />
              <Picker.Item label={t('property.land')} value="land" />
              <Picker.Item label={t('property.commercial')} value="commercial" />
            </Picker>
          </View>
          
          <Text style={[styles.label, darkMode && styles.darkText]}>{t('property.title')}</Text>
          <TextInput
            style={[styles.input, darkMode && styles.darkInput]}
            value={title}
            onChangeText={setTitle}
            placeholder={t('property.titlePlaceholder')}
            placeholderTextColor={darkMode ? "#6B7280" : "#9CA3AF"}
          />
          
          <Text style={[styles.label, darkMode && styles.darkText]}>{t('property.price')} (€)</Text>
          <TextInput
            style={[styles.input, darkMode && styles.darkInput]}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder={t('property.pricePlaceholder')}
            placeholderTextColor={darkMode ? "#6B7280" : "#9CA3AF"}
          />
          
          <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>{t('property.location')}</Text>
          
          <Text style={[styles.label, darkMode && styles.darkText]}>{t('property.city')}</Text>
          <View style={[styles.pickerContainer, darkMode && styles.darkPickerContainer]}>
            <Picker
              selectedValue={cityId}
              onValueChange={(itemValue) => setCityId(itemValue.toString())}
              style={[styles.picker, darkMode && styles.darkPicker]}
              dropdownIconColor={darkMode ? "#FFFFFF" : "#1E3A8A"}
            >
              {cities.map((city) => (
                <Picker.Item key={city.id} label={t(`cities.${city.name}`, { defaultValue: city.name })} value={city.id.toString()} />
              ))}
            </Picker>
          </View>

          <Text style={[styles.label, darkMode && styles.darkText]}>{`${t('property.district', 'Район')} *`}</Text>
          <View style={[
            styles.pickerContainer,
            darkMode && styles.darkPickerContainer,
            cityId === '0' ? styles.disabledPicker : null
          ]}>
            <Picker
              selectedValue={districtId}
              enabled={cityId !== '0'}
              onValueChange={(itemValue) => {
                const valueStr = itemValue?.toString() ?? '';
                setDistrictId(valueStr);
                if (!valueStr) {
                  setSelectedDistrict(null);
                  return;
                }
                const found = districtOptions.find((d) => d.id.toString() === valueStr);
                setSelectedDistrict(found || null);
              }}
              style={[styles.picker, darkMode && styles.darkPicker]}
              dropdownIconColor={darkMode ? "#FFFFFF" : "#1E3A8A"}
            >
              <Picker.Item label={t('common.selectDistrict')} value="" />
              {districtOptions.map((district) => (
                <Picker.Item key={district.id} label={district.name} value={district.id.toString()} />
              ))}
            </Picker>
          </View>
          {districtsLoading && (
            <View style={styles.districtLoaderRow}>
              <ActivityIndicator size="small" color={darkMode ? "#FFFFFF" : "#1E3A8A"} />
            </View>
          )}
          
          <Text style={[styles.label, darkMode && styles.darkText]}>{t('property.address')}</Text>
          <TextInput
            style={[styles.input, darkMode && styles.darkInput]}
            value={address}
            onChangeText={setAddress}
            placeholder={t('property.addressPlaceholder')}
            placeholderTextColor={darkMode ? "#6B7280" : "#9CA3AF"}
          />
          
          <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>{t('property.details')}</Text>
          
          <Text style={[styles.label, darkMode && styles.darkText]}>{t('property.area')} (м²)</Text>
          <TextInput
            style={[styles.input, darkMode && styles.darkInput]}
            value={area}
            onChangeText={setArea}
            keyboardType="numeric"
            placeholder={t('property.areaPlaceholder')}
            placeholderTextColor={darkMode ? "#6B7280" : "#9CA3AF"}
          />
          
          {supportsRooms && (
            <>
              <Text style={[styles.label, darkMode && styles.darkText]}>{t('property.rooms')}</Text>
              <TextInput
                style={[styles.input, darkMode && styles.darkInput]}
                value={rooms}
                onChangeText={setRooms}
                keyboardType="numeric"
                placeholder={t('property.roomsPlaceholder')}
                placeholderTextColor={darkMode ? "#6B7280" : "#9CA3AF"}
              />
            </>
          )}
          
          <Text style={[styles.label, darkMode && styles.darkText]}>{t('property.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea, darkMode && styles.darkInput]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder={t('property.descriptionPlaceholder')}
            placeholderTextColor={darkMode ? "#6B7280" : "#9CA3AF"}
          />
          
          <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>{t('property.features')}</Text>
          
          <View style={styles.featuresContainer}>
            {FEATURES.map((feature) => (
              <View key={feature.id} style={styles.featureItem}>
                <Switch
                  value={selectedFeatures.includes(feature.id)}
                  onValueChange={() => toggleFeature(feature.id)}
                  trackColor={{ false: "#D1D5DB", true: darkMode ? "#3B82F6" : "#1E3A8A" }}
                  thumbColor={selectedFeatures.includes(feature.id) ? "#FFFFFF" : "#F3F4F6"}
                />
                <Text style={[styles.featureText, darkMode && styles.darkText]}>
                  {t(feature.name)}
                </Text>
              </View>
            ))}
          </View>
          
          <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>{t('property.photos')}</Text>
          
          <TouchableOpacity
            style={[styles.uploadButton, uploadingImages && styles.disabledButton]}
            onPress={pickImage}
            disabled={uploadingImages}
          >
            {uploadingImages ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.uploadButtonText}>{t('property.addPhoto')}</Text>
            )}
          </TouchableOpacity>
          
          <Text style={[styles.photoNote, darkMode && styles.darkText]}>
            {t('property.photoNote')}
          </Text>
          
          {images.length > 0 && (
            <View style={styles.imagesContainer}>
              {images.map((imageUrl, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <View style={styles.imageNumberBadge}>
                    <Text style={styles.imageNumberText}>{index + 1}</Text>
                  </View>
                  
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.propertyImage}
                    resizeMode="cover"
                  />
                  
                  {/* Кнопка удаления */}
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                  
                  {/* Кнопки перемещения */}
                  <View style={styles.imageArrowButtons}>
                    {/* Кнопка вверх */}
                    <TouchableOpacity 
                      style={[styles.arrowButton, 
                        index === 0 ? styles.arrowButtonDisabled : {}, 
                        { backgroundColor: darkMode ? "#3B82F6" : "#1E3A8A" }
                      ]}
                      onPress={() => moveImageUp(index)}
                      disabled={index === 0}
                    >
                      <Ionicons name="arrow-up" size={16} color="white" />
                    </TouchableOpacity>
                    
                    {/* Кнопка вниз */}
                    <TouchableOpacity 
                      style={[styles.arrowButton, 
                        index === images.length - 1 ? styles.arrowButtonDisabled : {}, 
                        { backgroundColor: darkMode ? "#3B82F6" : "#1E3A8A" }
                      ]}
                      onPress={() => moveImageDown(index)}
                      disabled={index === images.length - 1}
                    >
                      <Ionicons name="arrow-down" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, darkMode && styles.darkCancelButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.cancelButtonText, darkMode && styles.darkCancelButtonText]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.saveButton, 
                (saving || uploadingImages || images.length === 0 || !districtId || cityId === '0') && styles.disabledButton
              ]} 
              onPress={handleSave}
              disabled={saving || uploadingImages || images.length === 0 || !districtId || cityId === '0'}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : uploadingImages ? (
                <Text style={styles.saveButtonText}>{t('property.uploadingPhotos')}</Text>
              ) : (
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA'
  },
  darkContainer: {
    backgroundColor: '#1F2937'
  },
  scrollView: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  formContainer: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    color: '#1E3A8A'
  },
  darkText: {
    color: '#F3F4F6'
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151'
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#111827'
  },
  darkInput: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#F3F4F6'
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginBottom: 16,
    overflow: 'hidden'
  },
  darkPickerContainer: {
    backgroundColor: '#374151',
    borderColor: '#4B5563'
  },
  disabledPicker: {
    opacity: 0.6
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#111827'
  },
  darkPicker: {
    color: '#F3F4F6'
  },
  districtLoaderRow: {
    marginBottom: 12,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top'
  },
  featuresContainer: {
    marginBottom: 16
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  featureText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#374151'
  },
  uploadButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500'
  },
  photoNote: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 16
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  imageWrapper: {
    width: '30%',
    aspectRatio: 1,
    margin: '1.5%',
    position: 'relative'
  },
  propertyImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'transparent',
    padding: 0,
    zIndex: 1,
  },
  imageArrowButtons: {
    position: 'absolute',
    left: -5,
    top: '50%',
    transform: [{ translateY: -25 }],
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    zIndex: 1,
  },
  arrowButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  arrowButtonDisabled: {
    opacity: 0.5,
  },
  imageNumberBadge: {
    position: 'absolute',
    left: 5,
    bottom: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 1,
  },
  imageNumberText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 32
  },
  saveButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center'
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    flex: 1,
    marginRight: 8,
    alignItems: 'center'
  },
  darkCancelButton: {
    backgroundColor: '#374151',
    borderColor: '#4B5563'
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600'
  },
  darkCancelButtonText: {
    color: '#F3F4F6'
  },
  disabledButton: {
    opacity: 0.5
  }
});

export default EditPropertyScreen;
