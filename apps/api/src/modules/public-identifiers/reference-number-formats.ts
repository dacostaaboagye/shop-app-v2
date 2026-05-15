import { AppError } from "../_core/errors/app-error.js";

export const referenceSequenceKeys = [
  "invoice-pos",
  "invoice-portal",
  "invoice-web",
  "invoice-manual",
  "portal-order",
  "web-order",
  "delivery",
  "delivery-item",
  "purchase-order",
  "supplier-inquiry",
  "supply-request",
  "supply-request-group",
  "stock-take",
  "stock-transfer",
  "gtn",
] as const;

export type ReferenceSequenceKey = (typeof referenceSequenceKeys)[number];

type SequenceProfile = {
  description: string;
  formatReference: (input: { now: Date; sequenceValue: number }) => string;
  resolveStorageKey: (now: Date) => string;
  startsAt: number;
};

const dateScopedSequenceKeys = new Set<ReferenceSequenceKey>([
  "portal-order",
  "web-order",
  "delivery-item",
  "purchase-order",
]);

export const referenceSequenceProfiles: Record<
  ReferenceSequenceKey,
  SequenceProfile
> = {
  delivery: createInvoiceProfile("delivery", "DLV"),
  "delivery-item": createDateProfile("delivery-item", "DEL"),
  "invoice-manual": createInvoiceProfile("invoice-manual", "INV-MAN"),
  "invoice-portal": createInvoiceProfile("invoice-portal", "INV-CPO"),
  "invoice-pos": createInvoiceProfile("invoice-pos", "INV-POS"),
  "invoice-web": createInvoiceProfile("invoice-web", "INV-WEB"),
  "portal-order": createDateProfile("portal-order", "CPO"),
  "purchase-order": createDateProfile("purchase-order", "PO"),
  "supplier-inquiry": createDateProfile("supplier-inquiry", "SINQ"),
  "supply-request": createInvoiceProfile("supply-request", "SUP"),
  "supply-request-group": createInvoiceProfile("supply-request-group", "SUPB"),
  "stock-take": createYearProfile("stock-take", "STKTAKE"),
  "stock-transfer": createInvoiceProfile("stock-transfer", "TRF"),
  gtn: createInvoiceProfile("gtn", "GTN"),
  "web-order": createDateProfile("web-order", "WEB"),
};

export function deriveCreditNoteReference(parentReference: string): string {
  const normalizedParentReference = parentReference.trim().toUpperCase();

  if (!normalizedParentReference) {
    throw invalidParentReferenceError();
  }

  return `CRN-${normalizedParentReference}`;
}

export function formatReferenceNumber(input: {
  now: Date;
  sequenceKey: ReferenceSequenceKey;
  sequenceValue: number;
}): string {
  return referenceSequenceProfiles[input.sequenceKey].formatReference(input);
}

export function getSequenceDescription(
  sequenceKey: ReferenceSequenceKey,
): string {
  return referenceSequenceProfiles[sequenceKey].description;
}

export function getSequenceStartAt(
  sequenceKey: ReferenceSequenceKey,
  configuredStartsAt: number | undefined,
): number {
  if (configuredStartsAt == null) {
    return referenceSequenceProfiles[sequenceKey].startsAt;
  }

  if (!Number.isInteger(configuredStartsAt) || configuredStartsAt < 1) {
    throw invalidSequenceStartError();
  }

  return configuredStartsAt;
}

export function isDateScopedSequenceKey(
  sequenceKey: ReferenceSequenceKey,
): boolean {
  return dateScopedSequenceKeys.has(sequenceKey);
}

export function resolveSequenceStorageKey(input: {
  now: Date;
  sequenceKey: ReferenceSequenceKey;
}): string {
  return referenceSequenceProfiles[input.sequenceKey].resolveStorageKey(
    input.now,
  );
}

function createDateProfile(
  sequenceKey: ReferenceSequenceKey,
  prefix: string,
): SequenceProfile {
  return {
    description: `${prefix} references generated from UTC date + base36 counter`,
    formatReference: ({ now, sequenceValue }) =>
      `${prefix}-${formatUtcDate(now)}-${formatBase36Counter(sequenceValue)}`,
    resolveStorageKey: (now) => `${sequenceKey}:${formatUtcDate(now)}`,
    startsAt: 1,
  };
}

function createInvoiceProfile(
  sequenceKey: ReferenceSequenceKey,
  prefix: string,
): SequenceProfile {
  return {
    description: `${prefix} references generated from a channel-specific counter`,
    formatReference: ({ sequenceValue }) =>
      `${prefix}-${sequenceValue.toString().padStart(5, "0")}`,
    resolveStorageKey: () => sequenceKey,
    startsAt: 1,
  };
}

function createYearProfile(
  sequenceKey: ReferenceSequenceKey,
  prefix: string,
): SequenceProfile {
  return {
    description: `${prefix} references generated from UTC year + counter`,
    formatReference: ({ now, sequenceValue }) =>
      `${prefix}-${now.getUTCFullYear()}-${sequenceValue
        .toString()
        .padStart(4, "0")}`,
    resolveStorageKey: (now) => `${sequenceKey}:${now.getUTCFullYear()}`,
    startsAt: 1,
  };
}

function formatBase36Counter(sequenceValue: number): string {
  return sequenceValue.toString(36).padStart(4, "0");
}

function formatUtcDate(value: Date): string {
  const year = value.getUTCFullYear().toString();
  const month = (value.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = value.getUTCDate().toString().padStart(2, "0");

  return `${year}${month}${day}`;
}

function invalidParentReferenceError(): AppError {
  return new AppError({
    code: "validation_error",
    detail: "A parent invoice reference is required to derive a credit note.",
    statusCode: 400,
    title: "Invalid credit note reference",
  });
}

function invalidSequenceStartError(): AppError {
  return new AppError({
    code: "validation_error",
    detail: "Sequence starting values must be whole numbers greater than zero.",
    statusCode: 400,
    title: "Invalid sequence start",
  });
}
