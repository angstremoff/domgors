'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Database } from '@shared/lib/database.types';
import { formatMapCoordinates, getCityMapCoordinates, type MapCoordinates } from '@shared/utils/mapCoordinates';
import { Button } from '@/components/ui/Button';

type City = Database['public']['Tables']['cities']['Row'];

interface PropertyCoordinateSelectorProps {
  selectedCity: City | null;
  value: MapCoordinates | null;
  onChange: (coordinates: MapCoordinates) => void;
}

const FALLBACK_COORDINATES: MapCoordinates = {
  lat: 44.8176,
  lng: 20.4633,
};

export function PropertyCoordinateSelector({
  selectedCity,
  value,
  onChange,
}: PropertyCoordinateSelectorProps) {
  const { t } = useTranslation();
  const [mapOpen, setMapOpen] = useState(false);
  const channelIdRef = useRef(`domgo-coordinate-selector-${Math.random().toString(36).slice(2)}`);
  const cityCoordinates = getCityMapCoordinates(selectedCity?.coordinates);
  const currentCoordinates = value ?? cityCoordinates;
  const canOpenMap = Boolean(selectedCity);

  const mapHtml = useMemo(() => {
    const initialCoordinates = currentCoordinates ?? cityCoordinates ?? FALLBACK_COORDINATES;
    const safeChannelId = JSON.stringify(channelIdRef.current);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@2.4.0/dist/maplibre-gl.js"></script>
          <link href="https://cdn.jsdelivr.net/npm/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />
          <style>
            html, body { margin: 0; padding: 0; height: 100%; }
            #map { position: absolute; inset: 0; }
            .marker {
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: #1E3A8A;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            }
            .hint {
              position: absolute;
              top: 12px;
              left: 12px;
              right: 12px;
              z-index: 2;
              padding: 10px 12px;
              border-radius: 10px;
              background: rgba(17, 24, 39, 0.86);
              color: white;
              font: 500 13px/1.4 system-ui, -apple-system, sans-serif;
            }
            .actions {
              position: absolute;
              bottom: 16px;
              left: 16px;
              right: 16px;
              z-index: 2;
              display: flex;
              gap: 12px;
            }
            .button {
              flex: 1;
              border: 0;
              border-radius: 10px;
              padding: 12px 14px;
              font: 600 14px/1 system-ui, -apple-system, sans-serif;
              cursor: pointer;
            }
            .button.secondary {
              background: white;
              color: #111827;
            }
            .button.primary {
              background: #1E3A8A;
              color: white;
            }
          </style>
        </head>
        <body>
          <div class="hint">${t('property.tapMapToSelectLocation')}</div>
          <div id="map"></div>
          <div class="actions">
            <button class="button secondary" id="cancelButton" type="button">${t('common.cancel')}</button>
            <button class="button primary" id="applyButton" type="button">${t('common.apply')}</button>
          </div>
          <script>
            const channelId = ${safeChannelId};
            const initialLat = ${initialCoordinates.lat};
            const initialLng = ${initialCoordinates.lng};
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
              center: [initialLng, initialLat],
              zoom: 14
            });

            map.addControl(new maplibregl.NavigationControl());

            const markerElement = document.createElement('div');
            markerElement.className = 'marker';

            const marker = new maplibregl.Marker({
              element: markerElement,
              draggable: true
            })
              .setLngLat([initialLng, initialLat])
              .addTo(map);

            const sendMessage = (action, coordinates) => {
              window.parent.postMessage({
                source: 'domgo-coordinate-selector',
                channelId,
                action,
                coordinates,
              }, '*');
            };

            const applySelection = () => {
              const lngLat = marker.getLngLat();
              sendMessage('apply', {
                lat: lngLat.lat,
                lng: lngLat.lng,
              });
            };

            document.getElementById('applyButton').addEventListener('click', applySelection);
            document.getElementById('cancelButton').addEventListener('click', () => sendMessage('cancel'));

            map.on('click', (event) => {
              marker.setLngLat(event.lngLat);
            });
          </script>
        </body>
      </html>
    `;
  }, [cityCoordinates, currentCoordinates, t]);

  useEffect(() => {
    if (!mapOpen) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const data = event.data as {
        source?: string;
        channelId?: string;
        action?: 'apply' | 'cancel';
        coordinates?: MapCoordinates;
      };

      if (data?.source !== 'domgo-coordinate-selector' || data.channelId !== channelIdRef.current) {
        return;
      }

      if (data.action === 'apply' && data.coordinates) {
        onChange(data.coordinates);
        setMapOpen(false);
        return;
      }

      if (data.action === 'cancel') {
        setMapOpen(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mapOpen, onChange]);

  return (
    <>
      <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-text">{t('property.locationOnMap')}</h3>
            <p className="mt-1 text-sm text-textSecondary">
              {selectedCity
                ? t('property.defaultMapLocationHint')
                : t('property.chooseCityForMap')}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => canOpenMap && setMapOpen(true)}
            disabled={!canOpenMap}
          >
            {currentCoordinates ? <Pencil className="mr-2 h-4 w-4" /> : <MapPin className="mr-2 h-4 w-4" />}
            {currentCoordinates ? t('common.edit') : t('property.selectLocationOnMap')}
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-background px-4 py-3">
          <div className="mb-1 text-xs uppercase tracking-wide text-textSecondary">
            {t('property.selectedLocation')}
          </div>
          <div className="text-sm font-medium text-text">
            {currentCoordinates ? formatMapCoordinates(currentCoordinates) : t('property.selectLocationOnMap')}
          </div>
          {selectedCity ? (
            <div className="mt-2 text-xs text-textSecondary">
              {t(`cities.${selectedCity.name}`, { defaultValue: selectedCity.name })}
            </div>
          ) : null}
        </div>
      </div>

      {mapOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setMapOpen(false)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h4 className="text-lg font-semibold text-text">{t('property.locationOnMap')}</h4>
                <p className="text-sm text-textSecondary">{t('property.tapMapToSelectLocation')}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setMapOpen(false)}>
                {t('common.close')}
              </Button>
            </div>
            <div className="h-[70vh] min-h-[420px]">
              <iframe
                srcDoc={mapHtml}
                title={t('property.locationOnMap')}
                className="h-full w-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
