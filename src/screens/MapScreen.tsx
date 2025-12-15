import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Property } from '../contexts/PropertyContext';
import { useProperties } from '../contexts/PropertyContext';
import { WebView } from 'react-native-webview';
import { Logger } from '../utils/logger';
 

interface MapScreenProps {
  navigation: any;
  route: any;
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

const MapScreen: React.FC<MapScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { selectedCity: routeSelectedCity, selectedDistrict: routeSelectedDistrict, properties: routeProperties } = route.params || {};
  const {
    properties: contextProperties,
    selectedCity: contextSelectedCity,
    selectedDistrict: contextSelectedDistrict
  } = useProperties();
  const [activeFilter, setActiveFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const isWeb = Platform.OS === 'web';

  const selectedCity = routeSelectedCity || contextSelectedCity || null;
  const selectedDistrict = routeSelectedDistrict || contextSelectedDistrict || null;

  const propertiesForMap: Property[] = Array.isArray(routeProperties)
    ? routeProperties
    : Array.isArray(contextProperties)
      ? contextProperties
      : [];

  const filteredItems = useMemo<Property[]>(() => {
    if (activeFilter === 'all') {
      return propertiesForMap;
    }

    return propertiesForMap.filter((item) => item?.type === activeFilter);
  }, [activeFilter, propertiesForMap]);

  const extractCoordinates = useCallback((item: Property): { lat: number; lng: number } | null => {
    if (item.latitude && item.longitude) {
      const lat = parseFloat(String(item.latitude));
      const lng = parseFloat(String(item.longitude));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }

    if (item.coordinates) {
      try {
        if (typeof item.coordinates === 'string') {
          const parsed = JSON.parse(item.coordinates);
          if (parsed?.lat && parsed?.lng) {
            const lat = parseFloat(String(parsed.lat));
            const lng = parseFloat(String(parsed.lng));
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              return { lat, lng };
            }
          }
        } else if (typeof item.coordinates === 'object') {
          const lat = parseFloat(String(item.coordinates.lat));
          const lng = parseFloat(String(item.coordinates.lng));
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng };
          }
        }
      } catch (error) {
        Logger.error('Ошибка парсинга координат объекта на карте:', error);
      }
    }

    return null;
  }, []);

  const mapPoints = useMemo(() => {
    return filteredItems.reduce<MapFeature[]>((acc, item) => {
      const coords = extractCoordinates(item);
      if (!coords) {
        return acc;
      }

      const isSale = item.type === 'sale';
      const dealLabel = isSale ? t('common.sale') : t('common.rent');
      const priceValue = typeof item.price === 'number' ? item.price : Number(item.price);
      const formattedPrice = !Number.isNaN(priceValue)
        ? `${priceValue.toLocaleString('ru-RU')} ${isSale ? '€' : '€/мес'}`
        : t('property.priceOnRequest');

      const image = Array.isArray(item.images) && item.images.length > 0
        ? item.images[0]
        : 'https://via.placeholder.com/300x200?text=DomGo';

      acc.push({
        type: 'Feature',
        properties: {
          id: item.id,
          title: item.title,
          type: item.type,
          price: formattedPrice,
          description: `${dealLabel} • ${formattedPrice}`,
          imageUrl: image,
        },
        geometry: {
          type: 'Point',
          coordinates: [coords.lng, coords.lat],
        },
      } as MapFeature & { properties: MapFeature['properties'] & { imageUrl: string } });

      return acc;
    }, []);
  }, [extractCoordinates, filteredItems, t]);

  const mapCenter = useMemo(() => {
    if (selectedDistrict?.latitude && selectedDistrict?.longitude) {
      const lat = parseFloat(String(selectedDistrict.latitude));
      const lng = parseFloat(String(selectedDistrict.longitude));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }

    if (selectedCity?.latitude && selectedCity?.longitude) {
      return {
        lat: parseFloat(String(selectedCity.latitude)),
        lng: parseFloat(String(selectedCity.longitude)),
      };
    }

    if (mapPoints.length > 0) {
      const [lng, lat] = mapPoints[0].geometry.coordinates;
      return { lat, lng };
    }

    return { lat: 44.787197, lng: 20.457273 }; // Белград по умолчанию
  }, [mapPoints, selectedCity, selectedDistrict]);

  const mapHtml = useMemo(() => {
    const postMessageSnippet = isWeb
      ? `if (window.parent) { window.parent.postMessage(payload, '*'); }`
      : `if (window.ReactNativeWebView?.postMessage) { window.ReactNativeWebView.postMessage(payload); }`;

    const features = mapPoints.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        imageUrl: (feature as any).properties.imageUrl ?? 'https://via.placeholder.com/300x200?text=DomGo',
      },
    }));

    const geojson: MapFeatureCollection & { features: (MapFeature & { properties: MapFeature['properties'] & { imageUrl: string } })[] } = {
      type: 'FeatureCollection',
      features,
    };

    const zoom = selectedDistrict ? 14 : (mapPoints.length > 1 ? 10 : 12);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link href="https://cdn.jsdelivr.net/npm/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />
          <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@2.4.0/dist/maplibre-gl.js"></script>
          <style>
            html, body { margin: 0; padding: 0; height: 100%; }
            #map { position: absolute; inset: 0; }
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
            .popup-content { width: 220px; }
            .popup-image {
              width: 100%;
              height: 120px;
              object-fit: cover;
              border-radius: 4px;
              margin-bottom: 8px;
            }
            .popup-title { font-weight: 600; margin-bottom: 4px; }
            .popup-price { color: #4B5563; font-size: 14px; }
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
              center: [${mapCenter.lng}, ${mapCenter.lat}],
              zoom: ${zoom}
            });

            map.addControl(new maplibregl.NavigationControl());

            const data = ${JSON.stringify(geojson)};

            data.features.forEach((feature) => {
              const el = document.createElement('div');
              el.className = 'marker ' + feature.properties.type;
              el.textContent = feature.properties.price;

              const popup = new maplibregl.Popup({ offset: 12 });
              popup.setHTML(
                '<div class="popup-content">' +
                  '<img class="popup-image" src="' + feature.properties.imageUrl + '" alt="' + feature.properties.title + '" />' +
                  '<div class="popup-title">' + feature.properties.title + '</div>' +
                  '<div class="popup-price">' + feature.properties.description + '</div>' +
                '</div>'
              );

              el.addEventListener('click', () => {
                const payload = JSON.stringify({
                  type: 'marker_click',
                  id: feature.properties.id,
                });

                ${postMessageSnippet}
              });

              new maplibregl.Marker(el)
                .setLngLat(feature.geometry.coordinates)
                .setPopup(popup)
                .addTo(map);
            });

            if (data.features.length > 1) {
              const bounds = new maplibregl.LngLatBounds();
              data.features.forEach((feature) => bounds.extend(feature.geometry.coordinates));
              map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
            }
          </script>
        </body>
      </html>
    `;
  }, [isWeb, mapCenter.lat, mapCenter.lng, mapPoints, selectedDistrict?.id]);

  useEffect(() => {
    if (!isWeb) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'marker_click' && data?.id) {
          navigation.navigate('PropertyDetails', { propertyId: data.id });
        }
      } catch (error) {
        Logger.error('Ошибка обработки сообщения из iframe карты:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isWeb, navigation]);

  const mapKey = useMemo(() => {
    const districtKey = selectedDistrict?.id || 'no-district';
    return `${activeFilter}-${districtKey}-${mapPoints.length}-${mapPoints.map((point) => point.properties.id).join('|')}`;
  }, [activeFilter, mapPoints, selectedDistrict?.id]);

  const handleNativeMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'marker_click' && data?.id) {
        navigation.navigate('PropertyDetails', { propertyId: data.id });
      }
    } catch (error) {
      Logger.error('Ошибка разбора сообщения WebView:', error);
    }
  };

  return (
    <View style={styles.container}>
      {isWeb ? (
        <View style={styles.webMapWrapper}>
          <iframe
            key={mapKey}
            title="map-screen"
            srcDoc={mapHtml}
            style={{ width: '100%', height: '100%', border: '0' }}
            sandbox="allow-scripts allow-same-origin"
          />
        </View>
      ) : (
        <WebView
          key={mapKey}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.map}
          onMessage={handleNativeMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1E3A8A" />
            </View>
          )}
        />
      )}

      {/* Фильтры */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'all' && styles.activeFilter]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterText, activeFilter === 'all' && styles.activeFilterText]}>
            {t('common.all')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'sale' && styles.activeFilter]}
          onPress={() => setActiveFilter('sale')}
        >
          <Text style={[styles.filterText, activeFilter === 'sale' && styles.activeFilterText]}>
            {t('common.sale')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'rent' && styles.activeFilter]}
          onPress={() => setActiveFilter('rent')}
        >
          <Text style={[styles.filterText, activeFilter === 'rent' && styles.activeFilterText]}>
            {t('common.rent')}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Кнопка возврата */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  map: {
    flex: 1,
  },
  webMapWrapper: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  filterContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 5,
    borderRadius: 50,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  activeFilter: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  filterText: {
    fontWeight: '500',
    color: '#1F2937',
  },
  activeFilterText: {
    color: 'white',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default MapScreen;
