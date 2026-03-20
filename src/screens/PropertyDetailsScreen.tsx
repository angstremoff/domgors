import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, useWindowDimensions, Linking, ActivityIndicator, FlatList, SafeAreaView, Share, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Property } from '../contexts/PropertyContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { propertyService } from '../services/propertyService';
import ImageViewer from '../components/ImageViewer';
import { useTheme } from '../contexts/ThemeContext';
import { WebView } from 'react-native-webview';
import Colors from '../constants/colors';
import { showErrorAlert } from '../utils/alertUtils';
import { Logger } from '../utils/logger';
import * as Clipboard from 'expo-clipboard';

// Тип для параметров навигации
type RouteParams = {
  params: {
    propertyId: string;
    property?: Property; // Добавляем опциональный параметр property для прямой навигации
    id?: string; // Дополнительный параметр id для совместимости
  };
};

const PropertyDetailsScreen = ({ route, navigation }: { route: RouteParams; navigation: any }) => {
  // Получаем ID объявления из параметров навигации
  // Поддерживаем оба варианта: propertyId и id для совместимости
  const { propertyId, property: paramProperty, id } = route.params;
  const actualPropertyId = propertyId || id;
  const { t } = useTranslation();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { darkMode } = useTheme();
  const theme = darkMode ? Colors.dark : Colors.light;
  const { width: windowWidth } = useWindowDimensions();
  const isWebPlatform = Platform.OS === 'web';
  const isDesktopWeb = isWebPlatform && windowWidth >= 1024;
  const desktopContentMaxWidth = 960;
  const desktopHorizontalPadding = 64; // scrollContent padding 32 с каждой стороны
  const availableDesktopWidth = Math.max(windowWidth - desktopHorizontalPadding, 480);
  const carouselWidth = isDesktopWeb
    ? Math.min(availableDesktopWidth, desktopContentMaxWidth)
    : windowWidth;
  const carouselHeight = isDesktopWeb ? Math.min(carouselWidth * 0.5625, 520) : 300;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapLoading, setMapLoading] = useState(!isWebPlatform);
  const flatListRef = useRef<FlatList>(null);
  const webViewRef = useRef<WebView>(null);
  const mapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const phoneNumber = property?.user?.phone || property?.contact?.phone || '';

  const propertyCoords = useMemo(() => {
    if (!property) {
      return null;
    }

    try {
      let lat: number | undefined;
      let lng: number | undefined;

      if (property.coordinates) {
        if (typeof property.coordinates === 'object') {
          lat = property.coordinates.lat;
          lng = property.coordinates.lng;
        } else if (typeof property.coordinates === 'string') {
          const parsed = JSON.parse(property.coordinates);
          lat = parsed?.lat;
          lng = parsed?.lng;
        }
      } else if (property.latitude && property.longitude) {
        lat = parseFloat(property.latitude);
        lng = parseFloat(property.longitude);
      }

      if (typeof lat === 'number' && !Number.isNaN(lat) && typeof lng === 'number' && !Number.isNaN(lng)) {
        return { lat, lng } as const;
      }
    } catch (error) {
      Logger.error('Ошибка парсинга координат объявления:', error);
    }

    return null;
  }, [property]);

  useEffect(() => {
    if (isWebPlatform && showMap) {
      setMapLoading(false);
    }
  }, [isWebPlatform, showMap]);

  // Проверяем, есть ли объявление в контексте, если нет - загружаем с сервера
  useEffect(() => {
    // Если при переходе были переданы данные объявления — отобразим их сразу
    if (paramProperty) {
      Logger.debug(`Используем данные объявления из параметров. ID: ${paramProperty.id}, статус: ${paramProperty.status}`);
      setProperty(paramProperty);
    }

    // Всегда готовим функцию загрузки актуальных данных по ID
    const fetchProperty = async () => {
      if (!actualPropertyId) {
        Logger.error('Нет ID объявления для загрузки');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        Logger.debug('Загружаем данные объявления по ID:', actualPropertyId);
        const data = await propertyService.getPropertyById(actualPropertyId);
        if (data) {
          Logger.debug('Актуальные данные объявления получены, есть agency?:', !!data?.agency?.id);
          setProperty(data);
        }
      } catch (error) {
        Logger.debug('(NOBRIDGE) ERROR ', 'Ошибка загрузки данных объявления:', error);
        showErrorAlert(t('common.errorLoadingData'));
      } finally {
        setLoading(false);
      }
    };

    // Загружаем данные, если:
    // 1) есть ID
    // 2) либо нет объекта в параметрах,
    // 3) либо у переданного объекта нет agency.id (нужно подтянуть свежие связи из БД)
    if (actualPropertyId && (!paramProperty || !paramProperty.agency?.id)) {
      fetchProperty();
    }
  }, [actualPropertyId, paramProperty]);

  // Обработка событий изображений и избранного происходит через обработчики событий в JSX

  // Обработка события скролла для определения активного изображения
  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== activeImageIndex) {
      setActiveImageIndex(index);
    }
  };

  const handleCallPress = useCallback(async () => {
    if (!phoneNumber) {
      return;
    }

    const telUrl = `tel:${phoneNumber}`;

    try {
      const supported = await Linking.canOpenURL(telUrl);
      if (!supported && Platform.OS === 'ios') {
        Alert.alert(
          'Нельзя позвонить в симуляторе',
          'Скопировать номер?',
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Скопировать',
              onPress: () => {
                Clipboard.setStringAsync(phoneNumber).catch(() => {});
              }
            }
          ]
        );
        return;
      }

      await Linking.openURL(telUrl);
    } catch (error) {
      Logger.error('Не удалось открыть звонок', error);
      if (Platform.OS === 'ios') {
        Clipboard.setStringAsync(phoneNumber).catch(() => {});
        Alert.alert('Не удалось открыть звонок', 'Номер скопирован в буфер обмена');
      }
    }
  }, [phoneNumber]);

  // Функция поделиться объявлением
  const handleShare = async () => {
    if (!property) return;

    try {
      // Каноническая ссылка на наш обработчик deep links на домене domgo.rs
      // Он проверит наличие приложения и предложит установить его, если не установлено
      const deeplinkHandlerUrl = `https://domgo.rs/property.html?id=${property.id}`;

      // Формируем текст для шаринга в зависимости от выбранного языка
      const moreDetailsText = t('property.moreDetailsInApp', 'Подробнее в приложении DomGo');

      // Получаем переведенное название города, если есть
      const cityName = property.city?.name || '';
      // Перевод названия города
      const translatedCityName = cityName ? t(`cities.${cityName}`, cityName) : '';

      // Формируем текст для шаринга (без площади и комнат)
      // Добавляем переведенное название города вместо property.location
      const messageText = `${property.title}\n${property.price}${property.currency || '€'}\n${translatedCityName}\n\n${moreDetailsText}: ${deeplinkHandlerUrl}`;

      // Вызываем системный диалог шаринга
      await Share.share({
        message: messageText,
        // На iOS можно также указать заголовок и URL
        ...(Platform.OS === 'ios' ? {
          title: t('property.shareTitle', 'Поделиться объявлением'),
          url: deeplinkHandlerUrl
        } : {})
      });

      Logger.debug('Поделились объявлением:', property.id);
    } catch (error) {
      Logger.error('Ошибка при шаринге:', error);
    }
  };


  // HTML-код для карты с использованием MapLibre GL
  const mapHTML = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link href="https://cdn.jsdelivr.net/npm/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@2.4.0/dist/maplibre-gl.js"></script>
    <style>
      body { margin: 0; padding: 0; }
      #map { position: absolute; top: 0; bottom: 0; width: 100%; height: 100%; }
      .marker {
        width: 25px;
        height: 25px;
        border-radius: 50%;
        background-color: #3B82F6;
        border: 3px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      function initMap(lat, lng) {
        const map = new maplibregl.Map({
          container: 'map',
          style: {
            version: 8,
            sources: {
              'osm': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256
              }
            },
            layers: [{
              id: 'osm',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 19
            }]
          },
          center: [lng, lat],
          zoom: 15
        });
        
        map.addControl(new maplibregl.NavigationControl());
        
        const el = document.createElement('div');
        el.className = 'marker';
        
        new maplibregl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map);
          
        // Сообщаем о загрузке карты
        map.on('load', function() {
          window.ReactNativeWebView.postMessage('mapLoaded');
        });
      }
      
      // Отправляем сообщение, что DOM загружен
      window.ReactNativeWebView.postMessage('log:DOM loaded');

      // Сообщаем, что WebView готов
      window.ReactNativeWebView.postMessage('log:WebView ready, sending ready message');
      window.ReactNativeWebView.postMessage('ready');
      
      // Обработчик сообщений для iOS
      window.addEventListener('message', function(e) {
        const data = e.data;
        processMessage(data);
      });
      
      // Обработчик сообщений для Android
      document.addEventListener('message', function(e) {
        const data = e.data;
        processMessage(data);
      });
      
      // Единая функция обработки сообщений
      function processMessage(data) {
        // Проверяем, не вызывалась ли эта функция ранее с этими же данными
        if (window.lastProcessedData === data) {
          return; // Предотвращаем дублирование
        }
        
        window.lastProcessedData = data;
        window.ReactNativeWebView.postMessage('log:Получено сообщение: ' + data);
        
        try {
          const message = JSON.parse(data);
          if (message && message.coords) {
            window.ReactNativeWebView.postMessage('log:Инициализация карты с координатами: ' + JSON.stringify(message.coords));
            initMap(message.coords.lat, message.coords.lng);
          }
        } catch (e) {
          window.ReactNativeWebView.postMessage('log:Ошибка парсинга JSON: ' + e.toString());
        }
      }
      
      // При загрузке страницы уже было отправлено 'ready'
    </script>
  </body>
  </html>
  `;

  const webFallbackHTML = useMemo(() => {
    if (!propertyCoords) {
      return null;
    }

    const { lat, lng } = propertyCoords;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link href="https://cdn.jsdelivr.net/npm/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />
          <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@2.4.0/dist/maplibre-gl.js"></script>
          <style>
            html, body { margin: 0; padding: 0; height: 100%; }
            #map { position: absolute; inset: 0; }
            .marker {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background-color: #3B82F6;
              border: 3px solid white;
              box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const map = new maplibregl.Map({
              container: 'map',
              style: {
                version: 8,
                sources: {
                  osm: {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256
                  }
                },
                layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
              },
              center: [${lng}, ${lat}],
              zoom: 15
            });

            map.addControl(new maplibregl.NavigationControl());

            const el = document.createElement('div');
            el.className = 'marker';
            new maplibregl.Marker(el).setLngLat([${lng}, ${lat}]).addTo(map);
          </script>
        </body>
      </html>
    `;
  }, [propertyCoords]);

  // Отправка координат в WebView - ДОЛЖЕН БЫТЬ ПЕРЕД handleWebViewMessage
  const sendCoordinatesToMap = useCallback(() => {
    if (!webViewRef.current || !property) {
      return;
    }

    try {
      if (!propertyCoords) {
        Logger.error('Нет корректных координат для объявления');
        setMapLoading(false);
        return;
      }

      webViewRef.current.postMessage(JSON.stringify({ coords: propertyCoords }));
    } catch (error) {
      Logger.error('Ошибка отправки координат:', error);
      setMapLoading(false);
    }
  }, [propertyCoords, property]);

  // Обработчик сообщений от WebView
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = event.nativeEvent.data;

      if (data.startsWith('log:')) {
        // Это логи для отладки
        Logger.debug('Лог из WebView:', data.substring(4));
        return;
      }

      Logger.debug('Получено сообщение от WebView:', data);

      if (data === 'ready') {
        // WebView готов, отправляем координаты
        Logger.debug('WebView готов, отправляем координаты');

        // Очищаем предыдущий таймер, если есть
        if (mapTimeoutRef.current) {
          clearTimeout(mapTimeoutRef.current);
        }

        // Добавляем небольшую задержку перед отправкой координат
        mapTimeoutRef.current = setTimeout(() => {
          sendCoordinatesToMap();
        }, 500);
      } else if (data === 'mapLoaded') {
        // Карта загружена
        Logger.debug('Карта успешно загружена');
        setMapLoading(false);
      }
    } catch (error) {
      Logger.error('Ошибка обработки сообщения от WebView:', error);
    }
  }, [sendCoordinatesToMap]);

  // Очистка таймера при размонтировании компонента
  useEffect(() => {
    return () => {
      if (mapTimeoutRef.current) {
        clearTimeout(mapTimeoutRef.current);
      }
    };
  }, []);

  // Вычисляем форматированную цену ПЕРЕД ранними возвратами
  const formattedPrice = useMemo(() => {
    if (!property) return '';
    const priceValue = typeof property.price === 'number' ? property.price : Number(property.price);
    const priceLabel = Number.isFinite(priceValue) ? priceValue.toLocaleString() : property.price;
    return priceLabel;
  }, [property]);

  // РАННИЕ ВОЗВРАТЫ ДОЛЖНЫ БЫТЬ ПОСЛЕ ВСЕХ ХУКОВ

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{t('property.notFound')}</Text>
      </View>
    );
  }

  // Определяем отображаемые тексты для типа недвижимости и типа сделки
  // Используем filters. для типа недвижимости, чтобы соответствовать PropertyCard
  const propertyTypeText = property.property_type ? t(`filters.${property.property_type}`) : '';
  const dealTypeText = property.type === 'rent' ? t('property.rent') : t('property.sale');

  // Формируем полный адрес
  const cityName = property.city?.name || '';
  // Получаем переведенное название города
  const translatedCityName = cityName ? t(`cities.${cityName}`, cityName) : '';
  const streetName = property.location || '';
  const districtName = property.district?.name
    ? t(`districts.${property.district.name}`, { defaultValue: property.district.name })
    : '';
  const addressParts = [districtName, translatedCityName, streetName].filter(Boolean);
  const fullAddress = addressParts.join(', ');
  const hasAreaValue = property.area !== undefined && property.area !== null;
  const hasRoomsValue = property.rooms !== undefined && property.rooms !== null;

  // Отладочный вывод для всего объекта
  Logger.debug('Детали объявления:', JSON.stringify({
    id: property.id,
    title: property.title,
    status: property.status,
    type: property.type,
    property_type: property.property_type
  }, null, 2));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, isDesktopWeb && styles.webScrollContent]}>
        {/* Карусель изображений */}
        <View style={[styles.imageContainer, isDesktopWeb && styles.webImageContainer, isDesktopWeb && { width: carouselWidth, height: carouselHeight }]}>
          <FlatList
            ref={flatListRef}
            data={property.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `${property.id}-image-${index}`}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={isDesktopWeb ? { width: carouselWidth } : undefined}
            contentContainerStyle={isDesktopWeb ? styles.webFlatListContent : undefined}
            extraData={carouselWidth}
            renderItem={({ item, index }) => {
              // Отладочный вывод для проверки статуса
              const isInactive = property?.status === 'sold' || property?.status === 'rented';
              Logger.debug(`Детали объявления: айди=${property.id}, статус=${property.status}, неактивно=${isInactive}`);

              return (
                <TouchableOpacity
                  onPress={() => { setActiveImageIndex(index); setIsViewerVisible(true); }}
                  activeOpacity={0.9}
                  style={{ width: carouselWidth, height: carouselHeight }}
                >
                  <Image
                    source={{ uri: item }}
                    style={[
                      styles.propertyImage,
                      isInactive && styles.imageInactive // Применяем стиль неактивности
                    ]}
                    resizeMode="cover"
                  />
                  {isInactive && (
                    <View style={styles.statusOverlay}>
                      <Text style={styles.statusText}>
                        {property.status === 'sold' ? t('property.status.sold') : t('property.status.rented')}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            getItemLayout={(_, index) => ({
              length: carouselWidth,
              offset: carouselWidth * index,
              index,
            })}
          />

          {/* Тэги типа объявления */}
          <View style={styles.tagContainer}>
            <View style={[
              styles.typeTag,
              property.type === 'sale' ? styles.saleTag : styles.rentTag
            ]}>
              <Text style={styles.typeTagText}>{dealTypeText}</Text>
            </View>

            {propertyTypeText && (
              <View style={[
                styles.propertyTypeTag,
                property.property_type === 'apartment' && styles.apartmentTag,
                property.property_type === 'house' && styles.houseTag,
                property.property_type === 'commercial' && styles.commercialTag,
                property.property_type === 'land' && styles.landTag
              ]}>
                <Text style={styles.typeTagText}>{propertyTypeText}</Text>
              </View>
            )}
          </View>

          {/* Индикаторы пагинации */}
          {(property.images || []).length > 1 && (
            <View style={styles.dotsContainer}>
              {(property.images || []).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    activeImageIndex === index ? styles.activeDot : null
                  ]}
                />
              ))}
            </View>
          )}

          {/* Кнопка избранного */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(property.id)}
          >
            <Ionicons
              name={isFavorite(property.id) ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite(property.id) ? "#E91E63" : "#FFFFFF"}
            />
          </TouchableOpacity>
        </View>

        {/* Основная информация о объекте */}
        <View style={[styles.detailsContainer, { backgroundColor: theme.card }, isDesktopWeb && styles.webDetailsContainer]}>
          {/* Цена и заголовок */}
          <Text style={[styles.price, { color: theme.primary }]}>
            {formattedPrice}€{property.type === 'rent' ? ` / ${t('property.month')}` : ''}
          </Text>

          <Text style={[styles.title, { color: theme.text }]}>
            {property.title}
          </Text>

          {/* Адрес */}
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color={theme.secondary} />
            <Text style={[styles.location, { color: theme.secondary }]}>
              {fullAddress}
            </Text>
          </View>

          {/* Характеристики */}
          <View style={styles.statsRow}>
            {hasAreaValue && (
              <View style={styles.statItem}>
                <Ionicons name="cube-outline" size={18} color={theme.primary} />
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {property.property_type === 'land' ? `${property.area} ${t('property.sotkas')}` : `${property.area} м²`}
                </Text>
              </View>
            )}

            {hasRoomsValue && property.property_type !== 'land' && (
              <View style={styles.statItem}>
                <Ionicons name="bed-outline" size={18} color={theme.primary} />
                <Text style={[styles.statValue, { color: theme.text }]}>{property.rooms} {t('property.rooms')}</Text>
              </View>
            )}

            {property.type && (
              <View style={styles.statItem}>
                <Ionicons name="home-outline" size={18} color={theme.primary} />
                <Text style={[styles.statValue, { color: theme.text }]}>{t(`property.${property.type}`)}</Text>
              </View>
            )}
          </View>

          {/* Описание */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('property.description')}</Text>
            <Text style={[styles.description, { color: theme.text }]}>{property.description}</Text>
          </View>

          {/* Карта */}
          {propertyCoords && (
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('property.location')}</Text>

              <TouchableOpacity
                style={[styles.mapToggleButton, Platform.OS === 'web' && styles.buttonInlineWeb, { backgroundColor: theme.primary }]}
                onPress={() => setShowMap(!showMap)}
              >
                <Ionicons name="map-outline" size={18} color="#FFFFFF" />
                <Text style={styles.buttonText}>
                  {showMap ? t('property.hideMap') : t('property.showMap')}
                </Text>
              </TouchableOpacity>

              {showMap && (
                <View style={styles.mapContainer}>
                  {isWebPlatform && webFallbackHTML ? (
                    <View style={styles.webMapWrapper}>
                      <iframe
                        title="property-map"
                        srcDoc={webFallbackHTML}
                        style={{ width: '100%', height: '100%', border: '0' }}
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </View>
                  ) : (
                    <>
                      <WebView
                        ref={webViewRef}
                        originWhitelist={['*']}
                        source={{ html: mapHTML }}
                        style={styles.map}
                        onMessage={handleWebViewMessage}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                      />
                      {mapLoading && (
                        <View style={styles.mapLoadingContainer}>
                          <ActivityIndicator size="large" color={theme.primary} />
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Информация о контакте */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('property.contact')}</Text>

            {/* Строка с именем контакта и кнопкой/номером */}
            <View style={styles.contactRow}>
              {/* Имя контакта - слева */}
              {property.user?.name && (() => {
                const agencyId = property.agency?.id || property.agency_id;
                if (agencyId) {
                  return (
                    <TouchableOpacity onPress={() => navigation.navigate('Agency', { agencyId })}>
                      <Text style={[styles.contactName, { color: theme.text }]}>
                        {property.user?.name}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <Text style={[styles.contactName, { color: theme.text }]}>
                    {property.user?.name}
                  </Text>
                );
              })()}

              {/* Кнопка показать номер или сам номер - справа */}
              {(property.user?.phone || property.contact?.phone) && (
                !showPhoneNumber ? (
                  <TouchableOpacity
                    style={[styles.phoneButton, Platform.OS === 'web' && styles.buttonInlineWeb, { backgroundColor: theme.primary }]}
                    onPress={() => setShowPhoneNumber(true)}
                  >
                    <Ionicons name="eye-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.buttonText}>{t('property.showPhone')}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.phoneButton, Platform.OS === 'web' && styles.buttonInlineWeb, { backgroundColor: theme.primary }]}>
                    <View style={styles.phoneNumberBlock}
                    >
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={handleCallPress}
                      >
                        <Ionicons name="call-outline" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={styles.phoneNumberText} numberOfLines={1} adjustsFontSizeToFit>
                        {property.user?.phone || property.contact?.phone}
                      </Text>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => Linking.openURL(`sms:${property.user?.phone || property.contact?.phone}`)}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              )}
            </View>

            {/* Кнопка поделиться */}
            <TouchableOpacity
              style={[styles.shareButton, Platform.OS === 'web' && styles.buttonInlineWeb, { backgroundColor: theme.primary }]}
              onPress={handleShare}
            >
              <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>{t('property.share')}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* Просмотрщик изображений */}
      <ImageViewer
        images={property.images || []}
        visible={isViewerVisible}
        initialIndex={activeImageIndex}
        onClose={() => setIsViewerVisible(false)}
        darkMode={darkMode}
      />
    </SafeAreaView>
  );
};

// Стили
const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
  },
  webScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  // Стили для отображения статуса продано/сдано
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  imageInactive: {
    opacity: 0.6,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    height: 300,
  },
  webImageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 24,
  },
  webFlatListContent: {
    flexGrow: 1,
  },
  imageItem: {
    width: '100%',
    height: 300,
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  tagContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
  },
  typeTag: {
    padding: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  propertyTypeTag: {
    padding: 6,
    borderRadius: 4,
  },
  saleTag: {
    backgroundColor: '#FF6B6B',
  },
  rentTag: {
    backgroundColor: '#1E40AF',
  },
  apartmentTag: {
    backgroundColor: '#3B82F6',
  },
  houseTag: {
    backgroundColor: '#8B9467',
  },
  commercialTag: {
    backgroundColor: '#F59E0B',
  },
  landTag: {
    backgroundColor: '#34C759',
  },
  typeTagText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 12,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: -16,
  },
  webDetailsContainer: {
    width: '100%',
    maxWidth: 960,
    paddingHorizontal: 32,
    paddingVertical: 24,
    marginTop: 32,
    borderRadius: 20,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  location: {
    marginLeft: 6,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    marginLeft: 6,
    fontSize: 14,
  },
  sectionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  mapContainer: {
    height: 200,
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  webMapWrapper: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  map: {
    flex: 1,
  },
  mapLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  // Web-only helper: keep buttons content-sized instead of stretching full width
  buttonInlineWeb: {
    alignSelf: 'flex-start',
    width: 'auto',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
  },
  phoneButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneNumberBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneNumberText: {
    color: '#FFFFFF',
    marginHorizontal: 8,
    fontSize: 14,
    maxWidth: 120,
  },
  iconButton: {
    padding: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  shareButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PropertyDetailsScreen;
