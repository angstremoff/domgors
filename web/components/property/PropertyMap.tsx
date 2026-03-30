'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { Database } from '@shared/lib/database.types';
import { parseMapCoordinates } from '@shared/utils/mapCoordinates';

interface PropertyMapProps {
  properties: Property[];
  center?: [number, number];
  zoom?: number;
}

type Property = Database['public']['Tables']['properties']['Row'] & {
  city?: { name: string } | null;
  district?: { name: string } | null;
};

export function PropertyMap({ properties, center, zoom = 7 }: PropertyMapProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const channelIdRef = useRef(`domgo-property-map-${Math.random().toString(36).slice(2)}`);
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'sr-RS';

  useEffect(() => {
    setMounted(true);
  }, []);

  const extractCoordinates = (property: Property): { lat: number; lng: number } | null => {
    return parseMapCoordinates(property.coordinates);
  };

  // Фильтруем объявления с координатами
  const propertiesWithCoords = useMemo(() => {
    return properties.filter((p) => extractCoordinates(p) !== null);
  }, [properties]);

  // Определяем центр карты
  const mapCenter = useMemo(() => {
    if (center) {
      return { lat: center[0], lng: center[1] };
    }

    if (propertiesWithCoords.length > 0) {
      const coords = extractCoordinates(propertiesWithCoords[0]);
      if (coords) {
        return coords;
      }
    }

    return { lat: 44.787197, lng: 20.457273 }; // Белград по умолчанию
  }, [center, propertiesWithCoords]);

  // Подготовка данных для карты
  const mapData = useMemo(() => {
    const features = propertiesWithCoords.map((property) => {
      const coords = extractCoordinates(property);
      if (!coords) return null;

      const priceValue = typeof property.price === 'number' ? property.price : Number(property.price);
      const formattedPrice = !Number.isNaN(priceValue)
        ? `${new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
          }).format(priceValue)}${property.type === 'sale' ? '' : `/${t('property.month')}`}`
        : t('property.priceOnRequest');

      const image = Array.isArray(property.images) && property.images.length > 0
        ? property.images[0]
        : 'https://via.placeholder.com/300x200?text=DomGo';

      return {
        type: 'Feature',
        properties: {
          id: property.id,
          title: property.title,
          propertyType: property.type,
          price: formattedPrice,
          imageUrl: image,
        },
        geometry: {
          type: 'Point',
          coordinates: [coords.lng, coords.lat],
        },
      };
    }).filter(Boolean);

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [propertiesWithCoords, locale, t]);

  const mapHtml = useMemo(() => {
    const calculatedZoom = propertiesWithCoords.length > 1 ? 10 : 12;
    const finalZoom = zoom || calculatedZoom;
    const viewDetails = `${t('property.details')} →`;
    const safeChannelId = JSON.stringify(channelIdRef.current);

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
            .popup-card {
              cursor: pointer;
            }
            .popup-image {
              width: 100%;
              height: 120px;
              object-fit: cover;
              border-radius: 4px;
              margin-bottom: 8px;
            }
            .popup-title { font-weight: 600; margin-bottom: 4px; }
            .popup-price { color: #4B5563; font-size: 14px; margin-bottom: 8px; }
            .popup-link {
              display: inline-block;
              padding: 6px 12px;
              background-color: #1E3A8A;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-size: 12px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const channelId = ${safeChannelId};
            const map = new maplibregl.Map({
              container: 'map',
              style: {
                version: 8,
                sources: {
                  osm: {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '&copy; OpenStreetMap contributors'
                  }
                },
                layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
              },
              center: [${mapCenter.lng}, ${mapCenter.lat}],
              zoom: ${finalZoom}
            });

            map.addControl(new maplibregl.NavigationControl());

            const data = ${JSON.stringify(mapData)};

            data.features.forEach((feature) => {
              const el = document.createElement('div');
              el.className = 'marker ' + feature.properties.propertyType;
              el.textContent = feature.properties.price;

              const propertyUrl = '/oglas/?id=' + encodeURIComponent(feature.properties.id);
              const sendOpenProperty = (url) => {
                window.parent.postMessage({
                  source: 'domgo-property-map',
                  channelId,
                  action: 'openProperty',
                  url,
                }, '*');
              };

              const popup = new maplibregl.Popup({ offset: 12 });
              popup.setHTML(
                '<div class="popup-content popup-card" data-property-url="' + propertyUrl + '" tabindex="0" role="link">' +
                  '<img class="popup-image" src="' + feature.properties.imageUrl + '" alt="' + feature.properties.title + '" />' +
                  '<div class="popup-title">' + feature.properties.title + '</div>' +
                  '<div class="popup-price">' + feature.properties.price + '</div>' +
                  '<a class="popup-link" href="' + propertyUrl + '" data-property-url="' + propertyUrl + '">${viewDetails}</a>' +
                '</div>'
              );

              popup.on('open', () => {
                const popupElement = popup.getElement();
                const popupCard = popupElement ? popupElement.querySelector('.popup-card') : null;
                const link = popupElement ? popupElement.querySelector('.popup-link') : null;

                if (!popupCard) {
                  return;
                }

                if (!popupCard.dataset.boundClick) {
                  popupCard.addEventListener('click', () => {
                    const url = popupCard.getAttribute('data-property-url');

                    if (url) {
                      sendOpenProperty(url);
                    }
                  });

                  popupCard.addEventListener('keydown', (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') {
                      return;
                    }

                    event.preventDefault();
                    const url = popupCard.getAttribute('data-property-url');

                    if (url) {
                      sendOpenProperty(url);
                    }
                  });

                  popupCard.dataset.boundClick = 'true';
                }

                if (link && !link.dataset.boundClick) {
                  link.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const url = link.getAttribute('data-property-url');

                    if (url) {
                      sendOpenProperty(url);
                    }
                  });

                  link.dataset.boundClick = 'true';
                }
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
  }, [mapCenter.lat, mapCenter.lng, mapData, zoom, propertiesWithCoords.length, t]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as {
        source?: string;
        channelId?: string;
        action?: 'openProperty';
        url?: string;
      };

      if (data?.source !== 'domgo-property-map' || data.channelId !== channelIdRef.current) {
        return;
      }

      if (data.action === 'openProperty' && data.url) {
        router.push(data.url);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  if (!mounted) {
    return (
      <div className="w-full h-[500px] bg-surface rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary">{t('property.mapLoading')}</p>
        </div>
      </div>
    );
  }

  if (propertiesWithCoords.length === 0) {
    return (
      <div className="w-full h-[500px] bg-surface rounded-lg flex items-center justify-center border border-border">
        <div className="text-center">
          <p className="text-textSecondary">{t('property.noPropertiesOnMap')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-border">
      <iframe
        srcDoc={mapHtml}
        style={{ width: '100%', height: '100%', border: '0' }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        title="Property Map"
      />
    </div>
  );
}
