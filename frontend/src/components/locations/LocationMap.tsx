'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Group } from '@/components/ui/group';

// Fix for default marker icons in React Leaflet
if (typeof window !== 'undefined') {
  delete (Icon.Default.prototype as any)._getIconUrl;
  Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  bortleScale?: number | null;
  isFavorite: boolean;
}

interface LocationMapProps {
  locations: Location[];
  center?: [number, number];
  zoom?: number;
  height?: string | number;
  onMapClick?: (lat: number, lng: number) => void;
  onLocationClick?: (location: Location) => void;
  selectedPosition?: { lat: number; lng: number } | null;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Create a custom icon for the selected position marker
const selectedPositionIcon = new DivIcon({
  className: 'selected-position-marker',
  html: `<div style="
    width: 30px;
    height: 30px;
    background-color: #228be6;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: move;
  "></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export function LocationMap({
  locations,
  center = [50.8503, 4.3517], // Default to Brussels
  zoom = 8,
  height = 500,
  onMapClick,
  onLocationClick,
  selectedPosition = null,
}: LocationMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Box
        className="w-full flex items-center justify-center bg-card"
        style={{ height }}
      >
        <Text c="dimmed">Loading map...</Text>
      </Box>
    );
  }

  return (
    <Box className="w-full relative" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onMapClick && <MapClickHandler onClick={onMapClick} />}

        {/* Show selected position marker (draggable and movable) */}
        {selectedPosition && (
          <Marker
            position={[selectedPosition.lat, selectedPosition.lng]}
            icon={selectedPositionIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                onMapClick?.(position.lat, position.lng);
              },
            }}
          >
            <Popup>
              <div>
                <Text fw="semibold" size="sm">Selected Position</Text>
                <Text size="xs" c="dimmed">
                  Lat: {selectedPosition.lat.toFixed(6)}, Lon: {selectedPosition.lng.toFixed(6)}
                </Text>
                <Text size="xs" c="dimmed" className="mt-1">
                  Drag to adjust position
                </Text>
              </div>
            </Popup>
          </Marker>
        )}

        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            eventHandlers={{
              click: () => onLocationClick?.(location),
            }}
          >
            <Popup>
              <div>
                <Group gap="xs" className="mb-1">
                  <Text fw="semibold">{location.name}</Text>
                  {location.isFavorite && <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">★ Favorite</Badge>}
                </Group>
                <Text size="xs" c="dimmed">
                  Lat: {location.latitude.toFixed(4)}, Lon: {location.longitude.toFixed(4)}
                </Text>
                {location.bortleScale && (
                  <Badge className="mt-1">
                    Bortle {location.bortleScale}
                  </Badge>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  );
}
