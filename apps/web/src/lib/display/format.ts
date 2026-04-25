const DEFAULT_LOCALE = "en-GH";

export function formatCount(
  value: number | null | undefined,
  locale = DEFAULT_LOCALE,
) {
  if (value == null || !Number.isFinite(value)) {
    return "0";
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(
  value: Date | string | null | undefined,
  {
    empty = "Not available",
    locale = DEFAULT_LOCALE,
  }: {
    empty?: string;
    locale?: string;
  } = {},
) {
  if (!value) {
    return empty;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return empty;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatPublicReference(
  value: string | null | undefined,
  fallback = "Not available",
) {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

export function formatSupportText(
  value: string | null | undefined,
  fallback = "Not recorded",
) {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}
