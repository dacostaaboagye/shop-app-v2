type ParsedLocationInput =
  | {
      kind: "coordinates";
      latitude: number;
      longitude: number;
    }
  | {
      kind: "text";
      query: string;
    };

const DIRECT_COORDINATE_PATTERN =
  /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
const EMBEDDED_COORDINATE_PATTERN = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;
const LOOSE_COORDINATE_PATTERN = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/;

export function parseLocationSearchInput(
  input: string,
): ParsedLocationInput | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  const directCoordinates = parseCoordinates(
    trimmed,
    DIRECT_COORDINATE_PATTERN,
  );

  if (directCoordinates) {
    return { kind: "coordinates", ...directCoordinates };
  }

  const url = tryParseUrl(trimmed);

  if (!url) {
    return { kind: "text", query: trimmed };
  }

  const coordinateCandidates = [
    url.searchParams.get("q"),
    url.searchParams.get("query"),
    url.searchParams.get("ll"),
    url.searchParams.get("center"),
    url.searchParams.get("destination"),
    url.searchParams.get("origin"),
    url.hash,
    trimmed.match(EMBEDDED_COORDINATE_PATTERN)?.slice(1).join(",") ?? null,
  ];

  for (const candidate of coordinateCandidates) {
    const coordinates = parseCoordinates(candidate, LOOSE_COORDINATE_PATTERN);

    if (coordinates) {
      return { kind: "coordinates", ...coordinates };
    }
  }

  const queryCandidate =
    url.searchParams.get("q") ??
    url.searchParams.get("query") ??
    parsePlacePath(url.pathname) ??
    trimmed;

  return { kind: "text", query: queryCandidate };
}

export function buildForwardGeocodeQueries(query: string): string[] {
  const variants = [
    query.trim(),
    query
      .replace(/\+/g, " ")
      .replace(/[()]/g, " ")
      .replace(/\s*,\s*/g, ", ")
      .replace(/\s+/g, " ")
      .trim(),
  ];

  return [...new Set(variants.filter(Boolean))];
}

function parseCoordinates(
  value: string | null | undefined,
  pattern: RegExp,
): { latitude: number; longitude: number } | null {
  if (!value) {
    return null;
  }

  const match = value.match(pattern);

  if (!match) {
    return null;
  }

  const latitude = Number.parseFloat(match[1] ?? "");
  const longitude = Number.parseFloat(match[2] ?? "");

  if (
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function parsePlacePath(pathname: string): string | null {
  const placeMatch = pathname.match(/\/place\/([^/]+)/);

  if (!placeMatch?.[1]) {
    return null;
  }

  return decodeURIComponent(placeMatch[1]).replace(/\+/g, " ").trim();
}

function tryParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
