import { supportedCurrencyCodes, supportedTimeZones } from "@shop/contracts";

const PREFERRED_CURRENCIES = ["GHS", "USD", "EUR", "GBP", "NGN", "KES", "ZAR"];
const PREFERRED_TIME_ZONES = [
  "Africa/Accra",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
  "America/New_York",
  "UTC",
];

export const currencyOptions = prioritizeOptions(
  supportedCurrencyCodes,
  PREFERRED_CURRENCIES,
).map((code) => ({ label: formatCurrencyLabel(code), value: code }));

export const timeZoneOptions = prioritizeOptions(
  supportedTimeZones,
  PREFERRED_TIME_ZONES,
).map((timeZone) => ({
  label: formatTimeZoneLabel(timeZone),
  value: timeZone,
}));

function prioritizeOptions(
  values: readonly string[],
  preferred: readonly string[],
) {
  const valueSet = new Set(values);
  const preferredValues = preferred.filter((value) => valueSet.has(value));
  const remaining = values.filter((value) => !preferredValues.includes(value));
  return [...preferredValues, ...remaining];
}

function formatCurrencyLabel(code: string) {
  const displayName = new Intl.DisplayNames(["en"], { type: "currency" }).of(
    code,
  );
  return displayName ? `${code} - ${displayName}` : code;
}

function formatTimeZoneLabel(timeZone: string) {
  return timeZone.replaceAll("_", " ");
}
