type ForwardGeocodeResult = {
  address: string;
  latitude: number;
  longitude: number;
};

export {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  type LocationMapPickerProps,
  type LocationMapPickerValue,
  OPENFREEMAP_STYLE,
} from "./location-map-picker.support";

import {
  buildForwardGeocodeQueries,
  parseLocationSearchInput,
} from "./location-map-geocoding.support";

const USER_AGENT = "ShopApp/1.0";

export async function searchLocation(query: string) {
  const parsed = parseLocationSearchInput(query);

  if (!parsed) {
    return null;
  }

  if (parsed.kind === "coordinates") {
    const address =
      (await reverseSearchLocation(parsed.latitude, parsed.longitude)) ??
      query.trim();

    return {
      address,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    } satisfies ForwardGeocodeResult;
  }

  for (const candidate of buildForwardGeocodeQueries(parsed.query)) {
    const results = await fetchForwardGeocodeResults(candidate);
    const first = results[0];

    if (!first) {
      continue;
    }

    return {
      address: first.display_name,
      latitude: Number.parseFloat(first.lat),
      longitude: Number.parseFloat(first.lon),
    } satisfies ForwardGeocodeResult;
  }

  return null;
}

export async function reverseSearchLocation(
  latitude: number,
  longitude: number,
) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
    { headers: { "User-Agent": USER_AGENT } },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    display_name?: string;
  };

  return data.display_name ?? null;
}

async function fetchForwardGeocodeResults(query: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
    { headers: { "User-Agent": USER_AGENT } },
  );

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;
}
