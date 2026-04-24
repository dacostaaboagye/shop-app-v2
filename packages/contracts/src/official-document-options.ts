const FALLBACK_CURRENCY_CODES = [
  "GHS",
  "NGN",
  "KES",
  "ZAR",
  "USD",
  "EUR",
  "GBP",
] as const;

const FALLBACK_TIME_ZONES = [
  "Africa/Accra",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "UTC",
] as const;

export const officialDocumentTypeValues = [
  "sales_receipt",
  "sales_invoice",
  "credit_note",
  "refund_note",
  "goods_transfer_note",
  "dispatch_note",
  "stock_adjustment",
  "stock_count",
  "purchase_order",
  "supplier_invoice",
] as const;

export const supportedCurrencyCodes = getSupportedIntlValues(
  "currency",
  FALLBACK_CURRENCY_CODES,
).map((code) => code.toUpperCase());

export const supportedTimeZones = getSupportedIntlValues(
  "timeZone",
  FALLBACK_TIME_ZONES,
);

function getSupportedIntlValues(
  key: "currency" | "timeZone",
  fallback: readonly string[],
) {
  const intlWithSupportedValues = Intl as unknown as {
    supportedValuesOf?: (input: string) => string[];
  };
  const values = intlWithSupportedValues.supportedValuesOf?.(key);

  if (!values?.length) return [...fallback];

  return [...new Set([...fallback, ...values])].sort((a, b) =>
    a.localeCompare(b),
  );
}
