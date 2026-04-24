import type {
  locationDocumentSettingsResponseSchema,
  officialDocumentProfileResponseSchema,
  officialDocumentSettingsResponseSchema,
} from "@shop/contracts";
import type { z } from "zod";
import type { OfficialDocumentSettingsRecord } from "./official-document-settings.types.js";
import { locationNotFoundError } from "./official-document-settings-errors.js";

type GlobalSettingsResponse = z.infer<
  typeof officialDocumentSettingsResponseSchema
>;
type LocationSettingsResponse = z.infer<
  typeof locationDocumentSettingsResponseSchema
>;
type ProfileResponse = z.infer<typeof officialDocumentProfileResponseSchema>;

export function serializeGlobalSettings(
  input: OfficialDocumentSettingsRecord,
  logoImageUrl: string | null,
): GlobalSettingsResponse {
  return {
    brand: { ...input.brand, logoImageUrl },
    business: input.business,
    currency: input.currency,
    documents: input.documents,
    emailTemplates: input.emailTemplates,
    locationOverridePolicy: input.locationOverridePolicy,
    updatedAt: input.updatedAt?.toISOString() ?? null,
    updatedByUserSlug: input.updatedByUserSlug,
  };
}

export function serializeLocationSettings(input: {
  addressLines: string[] | null;
  defaultPaperSize: LocationSettingsResponse["defaultPaperSize"];
  displayName: string | null;
  documentPrefix: string | null;
  email: string | null;
  locationId: string;
  locationName: string;
  phone: string | null;
  receiptFooter: string | null;
  timezone: string | null;
  updatedAt: Date | null;
  updatedByUserSlug: string | null;
}): LocationSettingsResponse {
  return {
    addressLines: input.addressLines,
    defaultPaperSize: input.defaultPaperSize,
    displayName: input.displayName,
    documentPrefix: input.documentPrefix,
    email: input.email,
    locationId: input.locationId,
    locationName: input.locationName,
    phone: input.phone,
    receiptFooter: input.receiptFooter,
    timezone: input.timezone,
    updatedAt: input.updatedAt?.toISOString() ?? null,
    updatedByUserSlug: input.updatedByUserSlug,
  };
}

export async function resolveDocumentProfileResponse(input: {
  locationId?: string;
  logoImageUrl: string | null;
  repository: {
    getGlobalSettings: () => Promise<OfficialDocumentSettingsRecord>;
    getLocationSettings: (locationId: string) => Promise<{
      addressLines: string[] | null;
      defaultPaperSize: LocationSettingsResponse["defaultPaperSize"];
      displayName: string | null;
      documentPrefix: string | null;
      email: string | null;
      locationId: string;
      locationName: string;
      phone: string | null;
      receiptFooter: string | null;
      timezone: string | null;
      updatedAt: Date | null;
      updatedByUserSlug: string | null;
    } | null>;
  };
}): Promise<ProfileResponse> {
  const global = await input.repository.getGlobalSettings();
  const location = input.locationId
    ? await input.repository.getLocationSettings(input.locationId)
    : null;

  if (input.locationId && !location) {
    throw locationNotFoundError(input.locationId);
  }

  const policy = global.locationOverridePolicy;
  return {
    accentColor: global.brand.accentColor,
    addressLines:
      policy.allowLocationAddress && location?.addressLines
        ? location.addressLines
        : global.business.addressLines,
    brandName: global.brand.brandName,
    currencyCode: global.currency.defaultDisplayCurrencyCode,
    currencyScale: global.currency.currencyScale,
    documentPrefix:
      policy.allowLocationNumberPrefix && location?.documentPrefix
        ? location.documentPrefix
        : null,
    email:
      policy.allowLocationContact && location?.email
        ? location.email
        : global.business.email,
    footer:
      policy.allowLocationFooter && location?.receiptFooter
        ? location.receiptFooter
        : global.documents.receiptFooter,
    legalName: global.business.legalName,
    locale: global.documents.locale,
    locationId: location?.locationId ?? null,
    locationName:
      policy.allowLocationDisplayName && location?.displayName
        ? location.displayName
        : (location?.locationName ?? null),
    logoImageUrl: input.logoImageUrl,
    logoText: global.brand.logoText,
    paperSize:
      policy.allowLocationPaperSize && location?.defaultPaperSize
        ? location.defaultPaperSize
        : global.documents.defaultPaperSize,
    phone:
      policy.allowLocationContact && location?.phone
        ? location.phone
        : global.business.phone,
    primaryColor: global.brand.primaryColor,
    registrationNumber: global.business.registrationNumber,
    taxNumber: global.business.taxNumber,
    timezone: location?.timezone ?? global.documents.timezone,
    website: global.business.website,
  };
}
