import type {
  locationDocumentSettingsResponseSchema,
  officialDocumentProfileResponseSchema,
  officialDocumentSettingsResponseSchema,
} from "@shop/contracts";
import type { z } from "zod";
import { AppError } from "../_core/errors/app-error.js";
import type { OfficialDocumentSettingsRepository } from "./official-document-settings.repository.js";
import type {
  LocationDocumentSettingsPatch,
  OfficialDocumentSettingsPatch,
} from "./official-document-settings.types.js";

type GlobalSettingsResponse = z.infer<
  typeof officialDocumentSettingsResponseSchema
>;
type LocationSettingsResponse = z.infer<
  typeof locationDocumentSettingsResponseSchema
>;
type ProfileResponse = z.infer<typeof officialDocumentProfileResponseSchema>;

export class OfficialDocumentSettingsService {
  constructor(
    private readonly repository: OfficialDocumentSettingsRepository,
  ) {}

  async getGlobalSettings(): Promise<GlobalSettingsResponse> {
    return serializeGlobal(await this.repository.getGlobalSettings());
  }

  async updateGlobalSettings(input: {
    patch: OfficialDocumentSettingsPatch;
    updatedBy: string;
    now: Date;
  }): Promise<GlobalSettingsResponse> {
    const current = await this.repository.getGlobalSettings();
    const settings = {
      brand: mergeDefined(current.brand, input.patch.brand),
      business: mergeDefined(current.business, input.patch.business),
      currency: mergeDefined(current.currency, input.patch.currency),
      documents: mergeDefined(current.documents, input.patch.documents),
      locationOverridePolicy: mergeDefined(
        current.locationOverridePolicy,
        input.patch.locationOverridePolicy,
      ),
      updatedAt: current.updatedAt?.toISOString() ?? null,
      updatedByUserSlug: current.updatedByUserSlug,
    };
    const saved = await this.repository.saveGlobalSettings({
      now: input.now,
      settings,
      updatedBy: input.updatedBy,
    });
    return serializeGlobal(saved);
  }

  async getLocationSettings(
    locationId: string,
  ): Promise<LocationSettingsResponse> {
    const settings = await this.repository.getLocationSettings(locationId);
    if (!settings) throw locationNotFoundError(locationId);
    return serializeLocation(settings);
  }

  async resolveDocumentProfile(input: {
    locationId?: string;
  }): Promise<ProfileResponse> {
    const global = await this.repository.getGlobalSettings();
    const location = input.locationId
      ? await this.repository.getLocationSettings(input.locationId)
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

  async updateLocationSettings(input: {
    locationId: string;
    patch: LocationDocumentSettingsPatch;
    updatedBy: string;
    now: Date;
  }): Promise<LocationSettingsResponse> {
    const saved = await this.repository.saveLocationSettings(input);
    if (!saved) throw locationNotFoundError(input.locationId);
    return serializeLocation(saved);
  }
}

type LoosePatch<T> = { [K in keyof T]?: T[K] | undefined };

function mergeDefined<T extends Record<string, unknown>>(
  current: T,
  patch: LoosePatch<T> | undefined,
): T {
  if (!patch) return current;

  const next = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      next[key as keyof T] = value as T[keyof T];
    }
  }
  return next;
}

function serializeGlobal(input: {
  brand: GlobalSettingsResponse["brand"];
  business: GlobalSettingsResponse["business"];
  currency: GlobalSettingsResponse["currency"];
  documents: GlobalSettingsResponse["documents"];
  locationOverridePolicy: GlobalSettingsResponse["locationOverridePolicy"];
  updatedAt: Date | null;
  updatedByUserSlug: string | null;
}): GlobalSettingsResponse {
  return {
    brand: input.brand,
    business: input.business,
    currency: input.currency,
    documents: input.documents,
    locationOverridePolicy: input.locationOverridePolicy,
    updatedAt: input.updatedAt?.toISOString() ?? null,
    updatedByUserSlug: input.updatedByUserSlug,
  };
}

function serializeLocation(input: {
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

function locationNotFoundError(locationId: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Location ${locationId} does not exist.`,
    statusCode: 404,
    title: "Location not found",
  });
}
