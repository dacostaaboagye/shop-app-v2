import type {
  LocationDocumentSettingsResponse,
  UpdateLocationDocumentSettingsRequest,
} from "@shop/contracts";

export type LocationPaperSizeValue = "inherit" | "receipt_80mm" | "a4" | "letter";

export type LocationDocumentSettingsFormValues = {
  addressLines: string;
  defaultPaperSize: LocationPaperSizeValue;
  displayName: string;
  documentPrefix: string;
  email: string;
  phone: string;
  receiptFooter: string;
  timezone: string;
};

export function toLocationDocumentSettingsFormValues(
  settings: LocationDocumentSettingsResponse,
): LocationDocumentSettingsFormValues {
  return {
    addressLines: settings.addressLines?.join("\n") ?? "",
    defaultPaperSize: settings.defaultPaperSize ?? "inherit",
    displayName: settings.displayName ?? "",
    documentPrefix: settings.documentPrefix ?? "",
    email: settings.email ?? "",
    phone: settings.phone ?? "",
    receiptFooter: settings.receiptFooter ?? "",
    timezone: settings.timezone ?? "",
  };
}

export function toLocationDocumentSettingsPayload(
  values: LocationDocumentSettingsFormValues,
): UpdateLocationDocumentSettingsRequest {
  return {
    addressLines: normalizeAddressLines(values.addressLines),
    defaultPaperSize:
      values.defaultPaperSize === "inherit" ? null : values.defaultPaperSize,
    displayName: normalizeNullableString(values.displayName),
    documentPrefix: normalizeNullableString(values.documentPrefix),
    email: normalizeNullableString(values.email),
    phone: normalizeNullableString(values.phone),
    receiptFooter: normalizeNullableString(values.receiptFooter),
    timezone: normalizeNullableString(values.timezone),
  };
}

function normalizeNullableString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeAddressLines(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : null;
}
