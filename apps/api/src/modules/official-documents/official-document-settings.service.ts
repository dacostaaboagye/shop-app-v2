import type {
  EmailTemplatePreviewRequest,
  emailTemplatePreviewResponseSchema,
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
import {
  resolveDocumentProfileResponse,
  serializeGlobalSettings,
  serializeLocationSettings,
} from "./official-document-settings-serializers.js";

type GlobalSettingsResponse = z.infer<
  typeof officialDocumentSettingsResponseSchema
>;
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
    return serializeGlobalSettings(
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
    return serializeGlobalSettings(saved, await this.resolveLogoImageUrl());
  }

  async getLocationSettings(locationId: string) {
    const settings = await this.repository.getLocationSettings(locationId);
    if (!settings) throw locationNotFoundError(locationId);
    return serializeLocationSettings(settings);
  }

  async resolveDocumentProfile(input: { locationId?: string }) {
    return resolveDocumentProfileResponse({
      ...input,
      logoImageUrl: await this.resolveLogoImageUrl(),
      repository: this.repository,
    });
  }

  async updateLocationSettings(input: {
    actor: { userSlug: string };
    locationId: string;
    patch: LocationDocumentSettingsPatch;
    updatedBy: string;
    now: Date;
  }) {
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
    return serializeLocationSettings(saved);
  }

  private resolveLogoImageUrl() {
    return this.brandLogoResolver?.getLogoImageUrl() ?? Promise.resolve(null);
  }
}
