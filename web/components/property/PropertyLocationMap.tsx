'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Database } from '@shared/lib/database.types';
import { parseMapCoordinates } from '@shared/utils/mapCoordinates';

type Property = Database['public']['Tables']['properties']['Row'] & {
  city?: { name: string } | null;
  district?: { name: string } | null;
};

interface PropertyLocationMapProps {
  property: Property;
}

export function PropertyLocationMap({ property }: PropertyLocationMapProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const coordinates = parseMapCoordinates(property.coordinates);
  const translatedCity = property.city?.name
    ? t(`cities.${property.city.name}`, { defaultValue: property.city.name })
    : property.city?.name || '';
  const translatedDistrict = property.district?.name
    ? t(`districts.${property.district.name}`, { defaultValue: property.district.name })
    : '';
  const locationLabel = [translatedDistrict, translatedCity].filter(Boolean).join(', ') || property.location || '';

  useEffect(() => {
    setMounted(true);
  }, []);

  const mapHtml = useMemo(() => {
    if (!coordinates) {
      return '';
    }

    const safeTitle = JSON.stringify(property.title);
    const safeLocation = JSON.stringify(locationLabel);
    const safeCaptionTitle = property.title
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    const safeCaptionLocation = (locationLabel || t('property.locationOnMap'))
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

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
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #1E3A8A;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
            }
            .map-caption {
              position: absolute;
              top: 12px;
              left: 12px;
              right: 12px;
              z-index: 2;
              border-radius: 12px;
              background: rgba(17, 24, 39, 0.82);
              color: white;
              padding: 10px 12px;
              font: 500 13px/1.4 system-ui, -apple-system, sans-serif;
              backdrop-filter: blur(8px);
            }
            .map-caption strong {
              display: block;
              margin-bottom: 2px;
              font-size: 14px;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="map-caption">
            <strong>${safeCaptionTitle}</strong>
            ${safeCaptionLocation}
          </div>
          <div id="map"></div>
          <script>
            const propertyTitle = ${safeTitle};
            const propertyLocation = ${safeLocation};

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
              center: [${coordinates.lng}, ${coordinates.lat}],
              zoom: 15
            });

            map.addControl(new maplibregl.NavigationControl());

            const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
              '<strong>' + propertyTitle + '</strong>' +
              (propertyLocation ? '<div style="margin-top:4px;">' + propertyLocation + '</div>' : '')
            );

            const markerElement = document.createElement('div');
            markerElement.className = 'marker';

            new maplibregl.Marker({ element: markerElement })
              .setLngLat([${coordinates.lng}, ${coordinates.lat}])
              .setPopup(popup)
              .addTo(map);
          </script>
        </body>
      </html>
    `;
  }, [coordinates, locationLabel, property.title, t]);

  if (!coordinates) {
    return null;
  }

  if (!mounted) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-xl border border-border bg-surface">
        <p className="text-sm text-textSecondary">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <iframe
        srcDoc={mapHtml}
        title={t('property.locationOnMap')}
        className="h-[360px] w-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
