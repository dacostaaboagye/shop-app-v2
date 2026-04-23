import type {
  EmailTemplatePreviewRequest,
  emailTemplatePreviewResponseSchema,
  locationDocumentSettingsResponseSchema,
  officialDocumentProfileResponseSchema,
  officialDocumentSettingsResponseSchema,
} from "@shop/contracts";
import type { EmailTemplateSettings } from "@shop/database";
import type { z } from "zod";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import { previewEmailTemplate as renderEmailTemplatePreview } from "./official-document-email-template-preview.service.js";
import type { OfficialDocumentSettingsRepository } from "./official-document-settings.repository.js";
import type {
  LocationDocumentSettingsPatch,
  OfficialDocumentSettings,
  OfficialDocumentSettingsPatch,
  OfficialDocumentSettingsRecord,
} from "./official-document-settings.types.js";
import { locationNotFoundError } from "./official-document-settings-errors.js";
import {
  createOfficialDocumentSettingsEvent,
  getChangedSettingSections,
} from "./official-document-settings-events.js";
import {
  mergeDefined,
  mergeEmailTemplates,
} from "./official-document-settings-merge.js";

type GlobalSettingsResponse = z.infer<
  typeof officialDocumentSettingsResponseSchema
>;
type LocationSettingsResponse = z.infer<
  typeof locationDocumentSettingsResponseSchema
>;
type ProfileResponse = z.infer<typeof officialDocumentProfileResponseSchema>;
type EmailTemplatePreviewResponse = z.infer<
  typeof emailTemplatePreviewResponseSchema
>;

export type OfficialDocumentBrandLogoResolver = {
  getLogoImageUrl: () => Promise<string | null>;
};

export class OfficialDocumentSettingsService {
  constructor(
    private readonly repository: OfficialDocumentSettingsRepository,
    private readonly brandLogoResolver: OfficialDocumentBrandLogoResolver | null = null,
    private readonly emailFromAddress: string | null = null,
    private readonly eventPublisher: PlatformEventPublisher | null = null,
  ) {}

  async getGlobalSettings(): Promise<GlobalSettingsResponse> {
    return serializeGlobal(
      await this.repository.getGlobalSettings(),
      await this.resolveLogoImageUrl(),
    );
  }

  async previewEmailTemplate(
    type: keyof EmailTemplateSettings,
    draft?: EmailTemplatePreviewRequest,
  ): Promise<EmailTemplatePreviewResponse> {
    const settings = await this.repository.getGlobalSettings();
    const logoImageUrl = await this.resolveLogoImageUrl();
    if (draft) {
      return renderEmailTemplatePreview({
        draft,
        emailFromAddress: this.emailFromAddress,
        logoImageUrl,
        settings,
        type,
      });
    }
    return renderEmailTemplatePreview({
      emailFromAddress: this.emailFromAddress,
      logoImageUrl,
      settings,
      type,
    });
  }

  async updateGlobalSettings(input: {
    actor: { userSlug: string };
    patch: OfficialDocumentSettingsPatch;
    updatedBy: string;
    now: Date;
  }): Promise<GlobalSettingsResponse> {
    const current = await this.repository.getGlobalSettings();
    const settings: OfficialDocumentSettings = {
      brand: mergeDefined(current.brand, input.patch.brand),
      business: mergeDefined(current.business, input.patch.business),
      currency: mergeDefined(current.currency, input.patch.currency),
      documents: mergeDefined(current.documents, input.patch.documents),
      emailTemplates: mergeEmailTemplates(
        current.emailTemplates,
        input.patch.emailTemplates,
      ),
      locationOverridePolicy: mergeDefined(
        current.locationOverridePolicy,
        input.patch.locationOverridePolicy,
      ),
    };
    const saved = await this.repository.saveGlobalSettings({
      now: input.now,
      settings,
      updatedBy: input.updatedBy,
    });
    await this.eventPublisher?.publish(
      createOfficialDocumentSettingsEvent({
        actor: input.actor,
        changedSections: getChangedSettingSections(input.patch),
        occurredAt: input.now,
        scope: "global",
      }),
    );
    return serializeGlobal(saved, await this.resolveLogoImageUrl());
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
    const logoImageUrl = await this.resolveLogoImageUrl();
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
      logoImageUrl,
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
    actor: { userSlug: string };
    locationId: string;
    patch: LocationDocumentSettingsPatch;
    updatedBy: string;
    now: Date;
  }): Promise<LocationSettingsResponse> {
    const saved = await this.repository.saveLocationSettings(input);
    if (!saved) throw locationNotFoundError(input.locationId);
    await this.eventPublisher?.publish(
      createOfficialDocumentSettingsEvent({
        actor: input.actor,
        changedSections: getChangedSettingSections(input.patch),
        locationId: input.locationId,
        locationName: saved.locationName,
        occurredAt: input.now,
        scope: "location",
      }),
    );
    return serializeLocation(saved);
  }

  private resolveLogoImageUrl() {
    return this.brandLogoResolver?.getLogoImageUrl() ?? Promise.resolve(null);
  }
}

function serializeGlobal(
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
