import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput,
  StyleSheet, 
  ScrollView, 
  Switch, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Platform, 
  KeyboardAvoidingView,
  Modal,
  FlatList
} from 'react-native';
import { Logger } from '../utils/logger';
import * as ImagePicker from 'expo-image-picker';
import { compressImage } from '../utils/imageCompression';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useProperties, City, District } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabaseClient';
import { propertyService } from '../services/propertyService';
import { useTheme } from '../contexts/ThemeContext';
import Colors from '../constants/colors';
import MapCoordinateSelector from '../components/MapCoordinateSelector';
import { showErrorAlert, showSuccessAlert } from '../utils/alertUtils';
import { normalizePropertyRooms, parseFiniteNumberInput, propertyTypeSupportsRooms } from '../utils/propertyRules';
import { fetchContactProfile, saveContactProfile, type ContactProfileClient } from '../utils/contactProfile';

// Используем интерфейс City из PropertyContext

// Список возможных особенностей
const FEATURES = [
  { id: 'parking', name: 'Парковка' },
  { id: 'balcony', name: 'Балкон' },
  { id: 'elevator', name: 'Лифт' },
  { id: 'furniture', name: 'Мебель' },
];

const AddPropertyScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const theme = darkMode ? Colors.dark : Colors.light;
  const contactSupabase = supabase as unknown as ContactProfileClient;
  const { invalidateCache, cities, loadCities, loadDistricts } = useProperties(); // Используем города из контекста
  
  // Добавляем состояния для имени и телефона пользователя
  const [userData, setUserData] = useState({
    name: '',
    phone: ''
  });
  
  // Форма по аналогии с веб-версией
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState(''); // location вместо address как в веб-версии
  const [area, setArea] = useState('');
  const [rooms, setRooms] = useState('');
  const [cityId, setCityId] = useState<string>('0'); // По умолчанию 0, как в веб-версии
  
  // Интерфейс для локального использования типа City внутри этого компонента
  interface LocalCity {
    id: string;
    name: string;
    latitude?: string;
    longitude?: string;
    coordinates?: { lat: number; lng: number } | null;
  }
  const [propertyType, setPropertyType] = useState<'sale' | 'rent'>('sale');
  const [propertyCategory, setPropertyCategory] = useState('apartment');
  const [images, setImages] = useState<string[]>([]);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Состояние для модальных окон
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [selectedCityName, setSelectedCityName] = useState(t('common.selectCity'));
  const [selectedCity, setSelectedCity] = useState<LocalCity | null>(null);
  const [districtId, setDistrictId] = useState<string>('');
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [selectedDistrictName, setSelectedDistrictName] = useState(t('common.selectDistrict'));
  const [districtOptions, setDistrictOptions] = useState<District[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  
  const [propertyTypeModalVisible, setPropertyTypeModalVisible] = useState(false);
  const [selectedPropertyTypeName, setSelectedPropertyTypeName] = useState(t('property.sale'));
  
  const [propertyCategoryModalVisible, setPropertyCategoryModalVisible] = useState(false);
  const [selectedPropertyCategoryName, setSelectedPropertyCategoryName] = useState(t('property.apartment'));
  const supportsRooms = propertyTypeSupportsRooms(propertyCategory);
  const districtRequired = districtOptions.length > 0;

  useEffect(() => {
    // Загружаем города только по необходимости при открытии модального окна,
    // а не при монтировании всего компонента
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      if (user) {
        const data = await fetchContactProfile(contactSupabase, user.id, user.email || '');
        setUserData({
          name: data.name,
          phone: data.phone,
        });
      }
    } catch (error) {
      Logger.error('Ошибка при загрузке данных пользователя:', error);
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
      const result = await loadDistricts(numericCityId);
      setDistrictOptions(result || []);
    } catch (error) {
      Logger.error('Ошибка при загрузке районов:', error);
      setDistrictOptions([]);
    } finally {
      setDistrictsLoading(false);
    }
  }, [loadDistricts]);

  useEffect(() => {
    if (cityId && cityId !== '0') {
      loadDistrictOptions(cityId);
    } else {
      setDistrictId('');
      setSelectedDistrictName(t('common.selectDistrict'));
      setDistrictOptions([]);
    }
  }, [cityId, t, loadDistrictOptions]);

  useEffect(() => {
    if (!supportsRooms && rooms) {
      setRooms('');
    }
  }, [supportsRooms, rooms]);

  // Проверяем, авторизован ли пользователь
  if (!user) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('common.loginRequired')}</Text>
        <TouchableOpacity 
          style={[styles.loginButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>{t('common.login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prevFeatures => {
      if (prevFeatures.includes(featureId)) {
        return prevFeatures.filter(id => id !== featureId);
      } else {
        return [...prevFeatures, featureId];
      }
    });
  };

  const pickImage = async () => {
    if (images.length >= 10) {
      showErrorAlert(t('addProperty.validation.maxPhotosReached'));
      return;
    }
    
    try {
      // Запрашиваем разрешения, если это необходимо
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showErrorAlert(t('property.errors.permissionDenied'));
          return;
        }
      }
      
      // Запускаем выбор изображения
      Logger.debug('Запускаем выбор изображения...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: false,
      });
      
      Logger.debug('Результат выбора изображения:', JSON.stringify(result, null, 2));
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingImages(true);
        try {
          const asset = result.assets[0];
          Logger.debug('Выбранное изображение:', asset.uri);
          Logger.debug('Тип файла:', asset.mimeType);
          Logger.debug('Размер файла:', asset.fileSize ? `${asset.fileSize} байт` : 'неизвестно');
          
          // Сжимаем изображение
          Logger.debug('Начинаем сжатие изображения...');
          const compressedImage = await compressImage(asset.uri);
          Logger.debug('Изображение сжато:', compressedImage.uri);
          
          // Добавляем в массив URI из локального хранилища для отображения
          setImages(prev => [...prev, compressedImage.uri]);
          Logger.debug('Изображение добавлено в список');
          
        } catch (error) {
          Logger.error('Ошибка при сжатии или добавлении изображения:', error);
          showErrorAlert(t('property.errors.imageUploadFailed'));
        } finally {
          setUploadingImages(false);
        }
      } else {
        Logger.debug('Выбор изображения отменен или не выбрано ни одного изображения');
      }
    } catch (error) {
      Logger.error('Ошибка при выборе изображения:', error);
      showErrorAlert(t('property.errors.imageSelectFailed'));
      setUploadingImages(false);
    }
  };

  const handleSubmit = async () => {
    // Проверка на обязательные поля
    if (!title.trim() || !price || !area || !location.trim() || !description.trim() || (supportsRooms && !rooms)) {
      showErrorAlert(t('addProperty.validation.fillAllFields'));
      return;
    }

    if (!cityId || cityId === '0') {
      showErrorAlert(t('property.validation.cityRequired'));
      return;
    }

    if (districtsLoading) {
      showErrorAlert(t('common.loading'));
      return;
    }

    if (districtRequired && !districtId) {
      showErrorAlert(t('property.validation.districtRequired'));
      return;
    }

    // Проверка на имя пользователя
    if (!userData.name.trim()) {
      showErrorAlert(t('profile.errors.nameRequired'));
      return;
    }
    
    // Проверка на телефон пользователя
    if (!userData.phone.trim()) {
      showErrorAlert(t('profile.errors.phoneRequired'));
      return;
    }
    
    // Проверка на загрузку изображений
    if (uploadingImages) {
      showErrorAlert(t('addProperty.validation.waitForPhotos'));
      return;
    }
    
    // Проверка на наличие хотя бы одного изображения
    if (images.length === 0) {
      showErrorAlert(t('addProperty.validation.addAtLeastOnePhoto'));
      return;
    }

    const numericPrice = parseFiniteNumberInput(price);
    const numericArea = parseFiniteNumberInput(area);
    const numericRooms = normalizePropertyRooms(propertyCategory, rooms);

    if (numericPrice === null || numericArea === null || (supportsRooms && numericRooms === null)) {
      showErrorAlert(t('filters.validation.invalidNumber'));
      return;
    }

    try {
      setLoading(true);
      
      // Проверка лимита объявлений (максимум 20)
      try {
        const userPropertiesCount = await propertyService.getUserPropertiesCount();
        if (userPropertiesCount >= 20) {
          showErrorAlert(t('property.errors.maxPropertiesReached'));
          setLoading(false);
          return;
        }
      } catch (error) {
        Logger.error('Ошибка при проверке количества объявлений:', error);
      }
      
      // Сохраняем данные пользователя
      try {
        if (user) {
          await saveContactProfile(contactSupabase, {
            userId: user.id,
            email: user.email || '',
            profile: userData,
          });
        }
      } catch (error) {
        Logger.error('Ошибка при сохранении данных пользователя:', error);
        showErrorAlert(t('profile.errors.saveFailed'));
        setLoading(false);
        return;
      }
      
      // Теперь загружаем фотографии на сервер
      const uploadedImageUrls = [];
      setUploadingImages(true);
      
      try {
        Logger.debug(`Начинаем загрузку ${images.length} изображений...`);
        
        for (let i = 0; i < images.length; i++) {
          const imageUri = images[i];
          
          try {
            Logger.debug(`Загрузка изображения ${i+1}/${images.length}: ${imageUri}`);
            
            // Получаем расширение файла
            const uriParts = imageUri.split('.');
            const imageExtension = uriParts.length > 1 
              ? uriParts[uriParts.length - 1].toLowerCase() 
              : 'jpg';
              
            const imageName = `property_${Date.now()}_${i}.${imageExtension}`;
            
            // Проверяем, что расширение файла допустимо
            const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
            if (!validExtensions.includes(imageExtension)) {
              Logger.error('Недопустимое расширение файла:', imageExtension);
              showErrorAlert(`${t('property.errors.invalidImageFormat')}: .${imageExtension}. ${t('property.errors.allowedFormats')}: ${validExtensions.join(', ')}`);
              setLoading(false);
              setUploadingImages(false);
              return;
            }
            
            // Используем метод из propertyService для загрузки изображения
            Logger.debug('Вызываем propertyService.uploadImage...');
            const imageUrl = await propertyService.uploadImage(imageUri, imageName);
            
            uploadedImageUrls.push(imageUrl);
            Logger.debug(`Изображение ${i+1}/${images.length} успешно загружено:`, imageUrl);
          } catch (imageError: any) {
            Logger.error(`Ошибка при загрузке изображения ${i+1}/${images.length}:`, imageError);
            showErrorAlert(`${t('property.errors.imageUploadFailed')} (${i+1}/${images.length}): ${imageError.message || 'Неизвестная ошибка'}`);
            setLoading(false);
            setUploadingImages(false);
            return;
          }
        }
        
        Logger.debug('Все изображения успешно загружены:', uploadedImageUrls);
      } catch (error: any) {
        Logger.error('Общая ошибка при загрузке изображений:', error);
        showErrorAlert(`${t('property.errors.imageUploadFailed')}: ${error.message || 'Неизвестная ошибка'}`);
        setLoading(false);
        setUploadingImages(false);
        return;
      } finally {
        setUploadingImages(false);
      }
      
      // Создаем объект с данными объявления
      const result = await propertyService.createProperty({
        title: title.trim(),
        description: description.trim(),
        price: numericPrice,
        type: propertyType,
        property_type: propertyCategory,
        area: numericArea,
        rooms: numericRooms ?? 0,
        location: location.trim(),
        city_id: cityId !== '0' ? Number(cityId) : undefined,
        district_id: districtId || null,
        features: selectedFeatures,
        images: uploadedImageUrls,
        status: 'active', // по умолчанию активно
        user_id: user.id, // ID пользователя
        // Поле user удалено, так как его нет в таблице properties
        // Передаем координаты как объект, а не как строку JSON
        coordinates: coordinates || null,
      });

      if (result.success) {
        // Принудительно очищаем кэш и перезагружаем данные
        await invalidateCache();
        Logger.debug('Кэш объявлений очищен после создания нового объявления');
        
        resetForm();
        // Показываем уведомление и переходим на страницу с моими объявлениями
        showSuccessAlert(t('addProperty.success'), () => {
          navigation.navigate('MyProperties');
        });
      } else {
        showErrorAlert(t('addProperty.failure'));
      }
    } catch (error) {
      Logger.error('Ошибка при создании объявления:', error);
      showErrorAlert(t('property.errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  // Функция для сброса формы
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setArea('');
    setRooms('');
    setLocation('');
    setPropertyType('sale');
    setPropertyCategory('apartment');
    setCityId('0');
    setDistrictId('');
    setSelectedDistrictName(t('common.selectDistrict'));
    setDistrictOptions([]);
    setSelectedFeatures([]);
    setImages([]);
  };

  const removeImage = (index: number) => {
    setImages(prevImages => {
      const newImages = [...prevImages];
      newImages.splice(index, 1);
      return newImages;
    });
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

  // Валидация ввода только цифр
  const validateNumericInput = (value: string) => {
    return value === '' || /^\d+$/.test(value);
  };

  // Обработчики для числовых полей
  const handlePriceChange = (value: string) => {
    if (validateNumericInput(value)) {
      setPrice(value);
    }
  };

  const handleAreaChange = (value: string) => {
    if (validateNumericInput(value)) {
      setArea(value);
    }
  };

  const handleRoomsChange = (value: string) => {
    if (validateNumericInput(value)) {
      setRooms(value);
    }
  };

  // Функция для выбора города
  const selectCity = (city: City | LocalCity) => {
    setCityId(city.id.toString());
    setDistrictId('');
    setSelectedDistrictName(t('common.selectDistrict'));
    setDistrictOptions([]);
    // Преобразуем City в локальный тип с id как string
    const localCity: LocalCity = {
      ...city,
      id: city.id.toString()
    };
    setSelectedCity(localCity);
    setSelectedCityName(city.name);
    setCityModalVisible(false);
    loadDistrictOptions(city.id);
    
    // Устанавливаем координаты из города, если они доступны
    if (city.coordinates) {
      setCoordinates(city.coordinates);
    } else if (city.latitude && city.longitude) {
      setCoordinates({
        lat: parseFloat(city.latitude),
        lng: parseFloat(city.longitude)
      });
    }
  };

  const selectDistrict = (district: District | null) => {
    if (!district) {
      setDistrictId('');
      setSelectedDistrictName(t('common.selectDistrict'));
      setDistrictModalVisible(false);
      return;
    }
    setDistrictId(district.id.toString());
    setSelectedDistrictName(district.name);
    setDistrictModalVisible(false);
  };

  // Функция для выбора типа сделки
  const selectPropertyType = (type: 'sale' | 'rent', name: string) => {
    setPropertyType(type);
    setSelectedPropertyTypeName(name);
    setPropertyTypeModalVisible(false);
  };
  
  // Функция для выбора типа недвижимости
  const selectPropertyCategory = (category: string, name: string) => {
    setPropertyCategory(category);
    setSelectedPropertyCategoryName(name);
    setPropertyCategoryModalVisible(false);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}
          
          <Text style={[styles.sectionTitle, { color: theme.headerText }]}>{t('addProperty.contactInfo')}</Text>
          
          <Text style={[styles.label, { color: theme.text }]}>{t('addProperty.form.name')}</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.cardBackground,
              color: theme.text,
              borderColor: theme.border,
              borderWidth: 1
            }]}
            value={userData.name}
            onChangeText={(text) => setUserData({ ...userData, name: text })}
            placeholder={t('addProperty.form.namePlaceholder')}
            placeholderTextColor={theme.secondary}
          />
          
          <Text style={[styles.label, { color: theme.text }]}>{t('addProperty.form.phone')}</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.cardBackground,
              color: theme.text,
              borderColor: theme.border,
              borderWidth: 1
            }]}
            value={userData.phone}
            onChangeText={(text) => setUserData({ ...userData, phone: text })}
            placeholder={t('addProperty.form.phonePlaceholder')}
            placeholderTextColor={theme.secondary}
            keyboardType="phone-pad"
          />
          
          <Text style={[styles.sectionTitle, { color: theme.headerText }]}>{t('addProperty.basicInfo')}</Text>
          
          <Text style={[styles.label, { color: theme.text }]}>{t('addProperty.form.type')}</Text>
          <TouchableOpacity 
            style={[styles.pickerButton, { 
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              borderWidth: 1,
            }]}
            onPress={() => setPropertyTypeModalVisible(true)}
          >
            <Text style={[styles.pickerButtonText, { color: theme.text }]}>
              {selectedPropertyTypeName}
            </Text>
            <Ionicons name="chevron-down" size={24} color={theme.text} />
          </TouchableOpacity>
          
          {/* Модальное окно для выбора типа сделки */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={propertyTypeModalVisible}
            onRequestClose={() => setPropertyTypeModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: darkMode ? '#333333' : '#FFFFFF' }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {t('addProperty.form.selectType')}
                </Text>
                
                <FlatList
                  data={[
                    { id: 'sale', name: t('property.sale') },
                    { id: 'rent', name: t('property.rent') }
                  ]}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.cityItem, propertyType === item.id && { backgroundColor: theme.primary + '33' }]}
                      onPress={() => selectPropertyType(item.id as 'sale' | 'rent', item.name)}
                    >
                      <Text style={[styles.cityItemText, { color: darkMode ? '#FFFFFF' : '#000000' }]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
                
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: theme.primary }]}
                  onPress={() => setPropertyTypeModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          
          <Text style={[styles.label, { color: theme.text }]}>{t('addProperty.form.propertyType')}</Text>
          <TouchableOpacity 
            style={[styles.pickerButton, { 
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              borderWidth: 1,
            }]}
            onPress={() => setPropertyCategoryModalVisible(true)}
          >
            <Text style={[styles.pickerButtonText, { color: theme.text }]}>
              {selectedPropertyCategoryName}
            </Text>
            <Ionicons name="chevron-down" size={24} color={theme.text} />
          </TouchableOpacity>
          
          {/* Модальное окно для выбора типа недвижимости */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={propertyCategoryModalVisible}
            onRequestClose={() => setPropertyCategoryModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: darkMode ? '#333333' : '#FFFFFF' }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {t('addProperty.form.selectPropertyType')}
                </Text>
                
                <FlatList
                  data={[
                    { id: 'apartment', name: t('property.apartment') },
                    { id: 'house', name: t('property.house') },
                    { id: 'commercial', name: t('property.commercial') },
                    { id: 'land', name: t('property.land') }
                  ]}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.cityItem, propertyCategory === item.id && { backgroundColor: theme.primary + '33' }]}
                      onPress={() => selectPropertyCategory(item.id, item.name)}
                    >
                      <Text style={[styles.cityItemText, { color: darkMode ? '#FFFFFF' : '#000000' }]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
                
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: theme.primary }]}
                  onPress={() => setPropertyCategoryModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Text style={[styles.label, { color: theme.text }]}>{t('addProperty.form.title')}</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.cardBackground,
              color: theme.text,
              borderColor: theme.border,
              borderWidth: 1
            }]}
            value={title}
            onChangeText={setTitle}
            placeholder={t('addProperty.form.titlePlaceholder')}
            placeholderTextColor={theme.secondary}
          />

          <Text style={[styles.label, { color: theme.text }]}>{t('addProperty.form.price')} {propertyType === 'rent' ? `(${t('addProperty.form.pricePerMonth')})` : ''}</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.cardBackground,
              color: theme.text,
              borderColor: theme.border,
              borderWidth: 1
            }]}
            value={price}
            onChangeText={handlePriceChange}
            placeholder={t('addProperty.form.pricePlaceholder')}
            placeholderTextColor={theme.secondary}
            keyboardType="numeric"
          />
          
          <Text style={[styles.sectionTitle, { color: theme.headerText }]}>{t('addProperty.location')}</Text>
          
          <Text style={[styles.label, { color: theme.text }]}>{t('addProperty.form.city')}</Text>
          <TouchableOpacity 
            style={[styles.pickerButton, { 
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              borderWidth: 1,
            }]}
            onPress={() => {
              // Загружаем города только при открытии модального окна
              loadCities();
              setCityModalVisible(true);
            }}
          >
            <Text style={[styles.pickerButtonText, { color: theme.text }]}>
              {selectedCityName}
            </Text>
            <Ionicons name="chevron-down" size={24} color={theme.text} />
          </TouchableOpacity>
          
          {/* Модальное окно для выбора города */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={cityModalVisible}
            onRequestClose={() => setCityModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: darkMode ? '#333333' : '#FFFFFF' }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {t('property.addProperty.selectCity')}
                </Text>
                
                <FlatList
                  data={[
                    { id: '0', name: t('common.selectCity') } as LocalCity, 
                    ...cities.map(city => ({
                      ...city,
                      id: city.id.toString()
                    }) as LocalCity)
                  ]}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }: { item: LocalCity }) => (
                    <TouchableOpacity
                      style={styles.cityItem}
                      key={item.id}
                      onPress={() => selectCity(item)}
                    >
                      <Text style={styles.cityItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
                
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: theme.primary }]}
                  onPress={() => setCityModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Text style={[styles.label, { color: theme.text }]}>
            {districtRequired ? `${t('property.district')} *` : t('property.districtOptional')}
          </Text>
          <TouchableOpacity 
            style={[styles.pickerButton, { 
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              borderWidth: 1,
              opacity: cityId === '0' ? 0.6 : 1
            }]}
            disabled={cityId === '0'}
            onPress={() => {
              if (cityId !== '0') {
                loadDistrictOptions(cityId);
                setDistrictModalVisible(true);
              }
            }}
          >
            <Text style={[styles.pickerButtonText, { color: theme.text }]}>
              {selectedDistrictName}
            </Text>
            {districtsLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons name="chevron-down" size={24} color={theme.text} />
            )}
          </TouchableOpacity>

          <Modal
            animationType="slide"
            transparent={true}
            visible={districtModalVisible}
            onRequestClose={() => setDistrictModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: darkMode ? '#333333' : '#FFFFFF' }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {t('addProperty.form.selectDistrict')}
                </Text>

                {districtsLoading ? (
                  <View style={{ paddingVertical: 12 }}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                ) : districtOptions.length === 0 ? (
                  <Text style={[styles.cityItemText, { color: theme.secondary }]}>
                    {t('addProperty.form.noDistricts')}
                  </Text>
                ) : (
                  <FlatList
                    data={districtOptions}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }: { item: District }) => (
                      <TouchableOpacity
                        style={styles.cityItem}
                        onPress={() => selectDistrict(item)}
                      >
                        <Text style={styles.cityItemText}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}

                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: theme.primary }]}
                  onPress={() => setDistrictModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Text style={[styles.label, { color: theme.text }]}>{t('addProperty.form.address')}</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.cardBackground,
              color: theme.text,
              borderColor: theme.border,
              borderWidth: 1
            }]}
            value={location}
            onChangeText={setLocation}
            placeholder={t('addProperty.form.addressPlaceholder')}
            placeholderTextColor={theme.secondary}
          />
          
          {/* Выбор координат на карте */}
          {cityId !== '0' && (
            <>
              {/* Отладочная информация */}
              {Logger.debug('Rendering MapCoordinateSelector with:', {
                selectedCity,
                coordinates,
                cityId,
                cityName: selectedCityName
              })}
              <MapCoordinateSelector
                selectedCity={selectedCity || null}
                initialCoordinates={coordinates}
                onCoordinatesSelect={(coords) => {
                  Logger.debug('Coordinates selected:', coords);
                  setCoordinates(coords);
                }}
              />
            </>
          )}
          
          <Text style={[styles.sectionTitle, { color: theme.headerText }]}>{t('addProperty.details')}</Text>

          <Text style={[styles.label, { color: theme.text }]}>{t('addProperty.form.area')}</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.cardBackground,
              color: theme.text,
              borderColor: theme.border,
              borderWidth: 1
            }]}
            value={area}
            onChangeText={handleAreaChange}
            placeholder={t('addProperty.form.areaPlaceholder')}
            placeholderTextColor={theme.secondary}
            keyboardType="numeric"
          />

          {supportsRooms && (
            <>
              <Text style={[styles.label, { color: theme.text }]}>{t('addProperty.form.rooms')}</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.cardBackground,
                  color: theme.text,
                  borderColor: theme.border,
                  borderWidth: 1
                }]}
                value={rooms}
                onChangeText={handleRoomsChange}
                placeholder={t('addProperty.form.roomsPlaceholder')}
                placeholderTextColor={theme.secondary}
                keyboardType="numeric"
              />
            </>
          )}

          <Text style={[styles.label, { color: theme.text }]}>{t('addProperty.form.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea, { 
              backgroundColor: theme.cardBackground,
              color: theme.text,
              borderColor: theme.border,
              borderWidth: 1
            }]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('addProperty.form.descriptionPlaceholder')}
            placeholderTextColor={theme.secondary}
            multiline
            textAlignVertical="top"
          />
          
          <Text style={[styles.sectionTitle, { color: theme.headerText }]}>{t('addProperty.features')}</Text>
          
          <View style={styles.featuresContainer}>
            {FEATURES.map(feature => (
              <View key={feature.id} style={styles.featureItem}>
                <Switch
                  value={selectedFeatures.includes(feature.id)}
                  onValueChange={() => toggleFeature(feature.id)}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={selectedFeatures.includes(feature.id) ? theme.primary : theme.secondary}
                />
                <Text style={[styles.featureText, { color: theme.text }]}>{t(`features.${feature.id}`)}</Text>
              </View>
            ))}
          </View>
          
          <Text style={[styles.sectionTitle, { color: theme.headerText }]}>{t('addProperty.photos')}</Text>
          
          <TouchableOpacity 
            style={[styles.uploadButton, { backgroundColor: theme.primary }]}
            onPress={pickImage}
            disabled={uploadingImages}
          >
            {uploadingImages ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.uploadButtonText}>{t('addProperty.form.uploadPhoto')}</Text>
            )}
          </TouchableOpacity>
          
          <Text style={[styles.photoNote, { color: theme.secondary }]}>
            {t('addProperty.form.maxPhotos', { count: 10 })} ({images.length}/10)
          </Text>
          
          {images.length > 0 && (
            <View style={styles.imagesContainer}>
              {images.map((image, index) => (
                <View key={index} style={[styles.imageWrapper, { borderColor: theme.border }]}>
                  <View style={styles.imageNumberBadge}>
                    <Text style={styles.imageNumberText}>{index + 1}</Text>
                  </View>
                  
                  <Image 
                    source={{ uri: image }} 
                    style={styles.propertyImage} 
                  />
                  
                  {/* Кнопка удаления */}
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.notification} />
                  </TouchableOpacity>
                  
                  {/* Кнопки перемещения */}
                  <View style={styles.imageArrowButtons}>
                    {/* Кнопка вверх */}
                    <TouchableOpacity 
                      style={[styles.arrowButton, 
                        index === 0 ? styles.arrowButtonDisabled : {}, 
                        { backgroundColor: theme.primary }
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
                        { backgroundColor: theme.primary }
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

          <TouchableOpacity 
            style={[
              styles.submitButton, 
              (loading || uploadingImages || districtsLoading || images.length === 0 || (districtRequired && !districtId) || cityId === '0') && styles.disabledButton
            ]} 
            onPress={handleSubmit}
            disabled={loading || uploadingImages || districtsLoading || images.length === 0 || (districtRequired && !districtId) || cityId === '0'}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : uploadingImages ? (
              <Text style={styles.submitButtonText}>{t('addProperty.form.uploadingPhotos')}</Text>
            ) : (
              <Text style={styles.submitButtonText}>{t('addProperty.form.submit')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
    position: 'relative',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    backgroundColor: 'transparent',
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    marginLeft: 10,
    fontSize: 16,
  },
  uploadButton: {
    backgroundColor: '#1E3A8A',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoNote: {
    fontSize: 14,
    marginBottom: 16,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  imageWrapper: {
    width: '30%',
    aspectRatio: 1,
    margin: '1.5%',
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
  },
  propertyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
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
  submitButton: {
    backgroundColor: '#1E3A8A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#1E3A8A',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Стили для кнопки выбора города
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  pickerButtonText: {
    fontSize: 16,
  },
  // Стили для модального окна
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 8,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  cityItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  cityItemText: {
    fontSize: 16,
  },
  closeButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddPropertyScreen;
