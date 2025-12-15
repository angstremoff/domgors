import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import Colors from '../constants/colors';
import { Logger } from '../utils/logger';
interface Coordinates {
  lat: number;
  lng: number;
}

interface Property {
  id: string;
  title: string;
  type: 'sale' | 'rent';
  price: number;
  latitude?: string;
  longitude?: string;
  coordinates?: Coordinates | string;
  city_id?: string | number;
}

interface PropertyMapViewProps {
  properties: Property[];
  selectedCity: any;
  onPropertySelect?: (property: Property) => void;
}

type MapFeature = {
  type: 'Feature';
  properties: {
    id: string;
    title: string;
    type: Property['type'];
    price: string;
    description: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
};

type MapFeatureCollection = {
  type: 'FeatureCollection';
  features: MapFeature[];
};

const PropertyMapView: React.FC<PropertyMapViewProps> = ({ 
  properties, 
  selectedCity,
  onPropertySelect
}) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [expanded, setExpanded] = useState(false);
  // Web-responsive helpers
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= 1024;
  const isTabletWeb = isWeb && width >= 768 && width < 1024;
  const mapHeaderIconSize = isWeb && isDesktop ? 16 : 18;

  if (!selectedCity) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.card, borderColor: theme.border },
          // Обёртка для веба: центрируем контейнер, внутренний контент выровнен слева за счёт padding
          isWeb
            ? (isDesktop
                ? { width: '100%', maxWidth: 1280, alignSelf: 'center', paddingHorizontal: 96, marginHorizontal: 0 }
                : isTabletWeb
                  ? { width: '100%', maxWidth: 1280, alignSelf: 'center', paddingHorizontal: 48, marginHorizontal: 0 }
                  : { width: '100%', maxWidth: 1280, alignSelf: 'center', paddingHorizontal: 12, marginHorizontal: 0 })
            : null,
        ]}
      >
        <TouchableOpacity 
          style={[
            styles.header,
            // Desktop web: совпадение внутреннего отступа с колонками списка (16px) и высота 40px
            isWeb ? (isDesktop ? { paddingLeft: 16, paddingRight: 16, paddingVertical: 0, height: 40 } : { paddingLeft: 12, paddingRight: 12 }) : null,
          ]} 
          onPress={() => setExpanded(!expanded)}
        >
          <View style={styles.titleContainer}>
            <Ionicons name="map-outline" size={mapHeaderIconSize} color={theme.primary} style={styles.mapIcon} />
            <Text style={[
              styles.title,
              { color: theme.text },
              isWeb && isDesktop ? { fontSize: 14 } : null,
            ]}>
              {t('property.mapView')}
            </Text>
          </View>
          <MaterialIcons 
            name={expanded ? "expand-less" : "expand-more"} 
            size={isWeb && isDesktop ? 20 : 24} 
            color={theme.text} 
          />
        </TouchableOpacity>
        {expanded && (
          <View style={styles.noCity}>
            <Text style={[styles.noCityText, { color: theme.text }]}>
              {t('property.selectCityForMap')}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Парсинг координат если они в строковом формате
  const parseCoordinates = useCallback((prop: Property): Coordinates | null => {
    if (!prop.coordinates) return null;
    
    // Если координаты уже в виде объекта
    if (typeof prop.coordinates === 'object') {
      return prop.coordinates;
    }
    
    // Если координаты в строковом формате JSON
    try {
      return JSON.parse(prop.coordinates);
    } catch (e) {
      Logger.error('Ошибка при парсинге координат:', e);
      return null;
    }
  }, []);

  // Фильтруем только свойства с координатами и принадлежащие выбранному городу
  const propertiesWithCoords = useMemo(() => properties.filter((p) => {
    try {
      // Нет города для фильтрации или нет координат у объекта - пропускаем
      if (!p || !selectedCity) return false;
      
      // Проверяем наличие координат
      const coords = parseCoordinates(p);
      if (!coords) return false;
      
      // Если нет id города для сравнения - пропускаем
      if (selectedCity.id === undefined || selectedCity.id === null) {
        return false;
      }
      
      // Если нет city_id у объекта - пропускаем
      if (p.city_id === undefined || p.city_id === null) {
        return false;
      }
      
      // Безопасное преобразование в строку для сравнения
      // Используем отдельные переменные, чтобы избежать ошибок преобразования
      const propCityId = p.city_id.toString();
      const selCityId = selectedCity.id.toString();
      
      // Проверяем принадлежность к выбранному городу
      return propCityId === selCityId;
    } catch (error) {
      Logger.error('Ошибка при фильтрации объекта:', error);
      return false;
    }
  }), [properties, selectedCity, parseCoordinates]);

  // Генерация HTML с картой MapLibre как в web версии
  const generateMapHTML = useCallback(() => {
    let centerLat = 44.5315;
    let centerLng = 19.2249;
    const zoom = 12;

    if (selectedCity && selectedCity.latitude && selectedCity.longitude) {
      centerLat = parseFloat(String(selectedCity.latitude));
      centerLng = parseFloat(String(selectedCity.longitude));
    } else if (propertiesWithCoords.length > 0) {
      const firstPropCoords = parseCoordinates(propertiesWithCoords[0]);
      if (firstPropCoords) {
        centerLat = firstPropCoords.lat;
        centerLng = firstPropCoords.lng;
      }
    }

    const features = propertiesWithCoords.reduce<MapFeature[]>((acc, property) => {
      const coords = parseCoordinates(property);
      if (!coords) {
        return acc;
      }

      const isSale = property.type === 'sale';
      const dealLabel = isSale ? t('common.sale') : t('common.rent');
      const priceValue = typeof property.price === 'number' ? property.price : Number(property.price);
      const formattedPrice = !Number.isNaN(priceValue)
        ? `${priceValue.toLocaleString('ru-RU')} ${isSale ? '€' : '€/мес'}`
        : t('property.priceOnRequest');

      acc.push({
        type: 'Feature',
        properties: {
          id: property.id,
          title: property.title,
          type: property.type,
          price: formattedPrice,
          description: `${dealLabel} • ${formattedPrice}`,
        },
        geometry: {
          type: 'Point',
          coordinates: [coords.lng, coords.lat],
        },
      });

      return acc;
    }, []);

    const geojson: MapFeatureCollection = {
      type: 'FeatureCollection',
      features,
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link href="https://cdn.jsdelivr.net/npm/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />
          <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@2.4.0/dist/maplibre-gl.js"></script>
          <style>
            html, body { height: 100%; margin: 0; padding: 0; }
            #map { width: 100%; height: 100%; }
            .marker {
              width: auto;
              height: auto;
              cursor: pointer;
              border-radius: 4px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              background-color: white;
              padding: 3px 6px;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 12px;
              font-weight: bold;
              border-left: 3px solid #1E88E5;
            }
            .marker.rent { border-left-color: #4CAF50; }
            .marker.sale { border-left-color: #1E88E5; }
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
              center: [${centerLng}, ${centerLat}],
              zoom: ${zoom}
            });

            map.addControl(new maplibregl.NavigationControl());

            const data = ${JSON.stringify(geojson)};

            data.features.forEach((feature) => {
              const el = document.createElement('div');
              el.className = 'marker ' + feature.properties.type;
              el.textContent = feature.properties.price;

              const popup = new maplibregl.Popup({ offset: 12 })
                .setHTML('<strong>' + feature.properties.title + '</strong><br>' + feature.properties.description);

              el.addEventListener('click', () => {
                const payload = JSON.stringify({
                  type: 'marker_click',
                  id: feature.properties.id,
                });

                if (window.ReactNativeWebView?.postMessage) {
                  window.ReactNativeWebView.postMessage(payload);
                } else if (window.parent) {
                  window.parent.postMessage(payload, '*');
                }
              });

              new maplibregl.Marker(el)
                .setLngLat(feature.geometry.coordinates)
                .setPopup(popup)
                .addTo(map);
            });
          </script>
        </body>
      </html>
    `;
  }, [parseCoordinates, propertiesWithCoords, selectedCity, t]);

  const mapHtml = useMemo(() => generateMapHTML(), [generateMapHTML]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
        // Обёртка для веба: центрируем контейнер, внутренний контент выровнен слева за счёт padding
        isWeb
          ? (isDesktop
              ? { width: '100%', maxWidth: 1280, alignSelf: 'center', paddingHorizontal: 96, marginHorizontal: 0 }
              : isTabletWeb
                ? { width: '100%', maxWidth: 1280, alignSelf: 'center', paddingHorizontal: 48, marginHorizontal: 0 }
                : { width: '100%', maxWidth: 1280, alignSelf: 'center', paddingHorizontal: 12, marginHorizontal: 0 })
          : null,
      ]}
    >
      <TouchableOpacity 
        style={[
          styles.header,
          // Desktop web: совпадение внутреннего отступа с колонками списка (16px) и высота 40px
          isWeb ? (isDesktop ? { paddingLeft: 16, paddingRight: 16, paddingVertical: 0, height: 40 } : { paddingLeft: 12, paddingRight: 12 }) : null,
        ]} 
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.titleContainer}>
          <Ionicons name="map-outline" size={mapHeaderIconSize} color={theme.primary} style={styles.mapIcon} />
          <Text style={[
            styles.title,
            { color: theme.text },
            isWeb && isDesktop ? { fontSize: 14 } : null,
          ]}>
            {t('property.mapView')}
          </Text>
        </View>
        <MaterialIcons 
          name={expanded ? "expand-less" : "expand-more"} 
          size={isWeb && isDesktop ? 20 : 24} 
          color={theme.text} 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.mapContainer}>
          {propertiesWithCoords.length === 0 ? (
            <View style={styles.noProperties}>
              <Text style={[styles.noPropertiesText, { color: theme.text }]}>
                {t('property.noPropertiesOnMap')}
              </Text>
            </View>
          ) : isWeb ? (
            <View style={styles.webMapWrapper}>
              <iframe
                title="properties-map"
                srcDoc={mapHtml}
                style={{ width: '100%', height: '100%', border: '0' }}
                sandbox="allow-scripts allow-same-origin"
              />
            </View>
          ) : (
            <WebView
              style={styles.map}
              originWhitelist={['*']}
              source={{ html: mapHtml }}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.type === 'marker_click') {
                    const property = propertiesWithCoords.find((p) => p.id === data.id);
                    if (property && onPropertySelect) {
                      onPropertySelect(property);
                    }
                  }
                } catch (e) {
                  Logger.error('Ошибка разбора сообщения WebView:', e);
                }
              }}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapIcon: {
    marginRight: 6,
  },
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12
  },
  title: {
    fontSize: 16,
    fontWeight: '500'
  },
  mapContainer: {
    height: 300,
    width: '100%'
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  noCity: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center'
  },
  noCityText: {
    fontSize: 16,
    textAlign: 'center'
  },
  noProperties: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center'
  },
  noPropertiesText: {
    fontSize: 16,
    textAlign: 'center'
  },
  webMapWrapper: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  }
});

export default PropertyMapView;
