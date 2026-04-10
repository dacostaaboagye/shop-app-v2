"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import MapView, { type MapRef, Marker } from "react-map-gl/maplibre";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  type LocationMapPickerProps,
  OPENFREEMAP_STYLE,
  reverseSearchLocation,
  searchLocation,
} from "./location-map-geocoding";

export function LocationMapPicker({ onChange, value }: LocationMapPickerProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [marker, setMarker] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    value?.latitude != null && value?.longitude != null
      ? { latitude: value.latitude, longitude: value.longitude }
      : null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [address, setAddress] = useState(value?.address ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        const resolvedAddress = await reverseSearchLocation(lat, lng);

        if (resolvedAddress) {
          setAddress(resolvedAddress);
          onChange({
            address: resolvedAddress,
            latitude: lat,
            longitude: lng,
          });
        }
      } catch {
        // Nominatim rate limits — silently ignore
      }
    },
    [onChange],
  );

  const forwardGeocode = useCallback(async () => {
    const query = searchQuery.trim();

    if (!query) return;

    setIsGeocoding(true);

    try {
      const first = await searchLocation(query);

      if (!first) return;

      setMarker({ latitude: first.latitude, longitude: first.longitude });
      setAddress(first.address);
      onChange({
        address: first.address,
        latitude: first.latitude,
        longitude: first.longitude,
      });

      mapRef.current?.flyTo({
        center: [first.longitude, first.latitude],
        duration: 1400,
        zoom: 15,
      });
    } finally {
      setIsGeocoding(false);
    }
  }, [onChange, searchQuery]);

  const handleMapClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      const { lat, lng } = event.lngLat;

      setMarker({ latitude: lat, longitude: lng });
      onChange({ address: address || "", latitude: lat, longitude: lng });
      void reverseGeocode(lat, lng);
    },
    [address, onChange, reverseGeocode],
  );

  const handleMarkerDragEnd = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      const { lat, lng } = event.lngLat;

      setMarker({ latitude: lat, longitude: lng });
      void reverseGeocode(lat, lng);
    },
    [reverseGeocode],
  );

  const handleAddressInputChange = useCallback(
    (inputValue: string) => {
      setAddress(inputValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!inputValue.trim()) return;

      debounceRef.current = setTimeout(async () => {
        try {
          const first = await searchLocation(inputValue);

          if (!first) return;

          setMarker({ latitude: first.latitude, longitude: first.longitude });
          setAddress(first.address);
          onChange({
            address: first.address,
            latitude: first.latitude,
            longitude: first.longitude,
          });

          mapRef.current?.flyTo({
            center: [first.longitude, first.latitude],
            duration: 1400,
            zoom: 15,
          });
        } catch {
          // silently ignore rate limit errors
        }
      }, 800);
    },
    [onChange],
  );

  const initialCenter = marker ?? DEFAULT_CENTER;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void forwardGeocode();
              }
            }}
            placeholder="Search for an address…"
            value={searchQuery}
          />
        </div>
        <Button
          disabled={isGeocoding || !searchQuery.trim()}
          onClick={() => void forwardGeocode()}
          size="sm"
          type="button"
          variant="outline"
        >
          {isGeocoding ? <Spinner data-icon="inline-start" /> : null}
          Search
        </Button>
        {marker ? (
          <Button
            onClick={() => {
              setMarker(null);
              setAddress("");
              onChange(null);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Clear pin
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-border/70">
        <MapView
          ref={mapRef}
          initialViewState={{
            latitude: initialCenter.latitude,
            longitude: initialCenter.longitude,
            zoom: marker ? 15 : DEFAULT_ZOOM,
          }}
          mapStyle={OPENFREEMAP_STYLE}
          onClick={handleMapClick}
          style={{ height: 340, width: "100%" }}
          attributionControl={false}
        >
          {marker ? (
            <Marker
              draggable
              latitude={marker.latitude}
              longitude={marker.longitude}
              onDragEnd={handleMarkerDragEnd}
            >
              <div className="flex flex-col items-center">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary shadow-md">
                  <MapPin className="size-4 text-primary-foreground" />
                </div>
                <div className="mt-0.5 size-2 rounded-full bg-primary/40" />
              </div>
            </Marker>
          ) : null}
        </MapView>
      </div>

      {address ? (
        <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Address
          </p>
          <Input
            className="mt-1 h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            onChange={(event) => handleAddressInputChange(event.target.value)}
            value={address}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Click on the map to place a pin, or search for an address above.
        </p>
      )}
    </div>
  );
}
