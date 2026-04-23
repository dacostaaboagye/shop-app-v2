import {
  locationDocumentSettings,
  locations,
  officialDocumentSettings,
  users,
} from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import {
  defaultBrandSettings,
  defaultBusinessSettings,
  defaultDocumentSettings,
  defaultEmailTemplateSettings,
  defaultLocationOverridePolicy,
  defaultMoneySettings,
  OFFICIAL_DOCUMENT_SETTINGS_KEY,
} from "./official-document-defaults.js";
import type {
  LocationDocumentSettingsPatch,
  LocationDocumentSettingsRecord,
  OfficialDocumentSettings,
  OfficialDocumentSettingsRecord,
} from "./official-document-settings.types.js";

export class OfficialDocumentSettingsRepository {
  constructor(private readonly db: ApiDatabase) {}

  async getGlobalSettings(): Promise<OfficialDocumentSettingsRecord> {
    const rows = await this.db
      .select({
        brand: officialDocumentSettings.brand,
        business: officialDocumentSettings.business,
        currency: officialDocumentSettings.currency,
        documents: officialDocumentSettings.documents,
        emailTemplates: officialDocumentSettings.emailTemplates,
        locationOverridePolicy: officialDocumentSettings.locationOverridePolicy,
        updatedAt: officialDocumentSettings.updatedAt,
        updatedByUserSlug: users.slug,
      })
      .from(officialDocumentSettings)
      .leftJoin(users, eq(users.id, officialDocumentSettings.updatedBy))
      .where(
        eq(
          officialDocumentSettings.settingsKey,
          OFFICIAL_DOCUMENT_SETTINGS_KEY,
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return defaultGlobalSettings();

    return {
      brand: row.brand,
      business: row.business,
      currency: row.currency,
      documents: row.documents,
      emailTemplates: row.emailTemplates,
      locationOverridePolicy: row.locationOverridePolicy,
      updatedAt: row.updatedAt,
      updatedByUserSlug: row.updatedByUserSlug,
    };
  }

  async saveGlobalSettings(input: {
    settings: OfficialDocumentSettings;
    updatedBy: string;
    now: Date;
  }): Promise<OfficialDocumentSettingsRecord> {
    await this.db
      .insert(officialDocumentSettings)
      .values({
        brand: input.settings.brand,
        business: input.settings.business,
        currency: input.settings.currency,
        documents: input.settings.documents,
        emailTemplates: input.settings.emailTemplates,
        locationOverridePolicy: input.settings.locationOverridePolicy,
        settingsKey: OFFICIAL_DOCUMENT_SETTINGS_KEY,
        updatedAt: input.now,
        updatedBy: input.updatedBy,
      })
      .onConflictDoUpdate({
        set: {
          brand: input.settings.brand,
          business: input.settings.business,
          currency: input.settings.currency,
          documents: input.settings.documents,
          emailTemplates: input.settings.emailTemplates,
          locationOverridePolicy: input.settings.locationOverridePolicy,
          updatedAt: input.now,
          updatedBy: input.updatedBy,
        },
        target: officialDocumentSettings.settingsKey,
      });

    return this.getGlobalSettings();
  }

  async getLocationSettings(
    locationId: string,
  ): Promise<LocationDocumentSettingsRecord | null> {
    const rows = await this.db
      .select({
        addressLines: locationDocumentSettings.addressLines,
        defaultPaperSize: locationDocumentSettings.defaultPaperSize,
        displayName: locationDocumentSettings.displayName,
        documentPrefix: locationDocumentSettings.documentPrefix,
        email: locationDocumentSettings.email,
        locationId: locations.id,
        locationName: locations.name,
        phone: locationDocumentSettings.phone,
        receiptFooter: locationDocumentSettings.receiptFooter,
        timezone: locationDocumentSettings.timezone,
        updatedAt: locationDocumentSettings.updatedAt,
        updatedByUserSlug: users.slug,
      })
      .from(locations)
      .leftJoin(
        locationDocumentSettings,
        eq(locationDocumentSettings.locationId, locations.id),
      )
      .leftJoin(users, eq(users.id, locationDocumentSettings.updatedBy))
      .where(eq(locations.id, locationId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return {
      addressLines: row.addressLines,
      defaultPaperSize: normalizePaperSize(row.defaultPaperSize),
      displayName: row.displayName,
      documentPrefix: row.documentPrefix,
      email: row.email,
      locationId: row.locationId,
      locationName: row.locationName,
      phone: row.phone,
      receiptFooter: row.receiptFooter,
      timezone: row.timezone,
      updatedAt: row.updatedAt,
      updatedByUserSlug: row.updatedByUserSlug,
    };
  }

  async saveLocationSettings(input: {
    locationId: string;
    patch: LocationDocumentSettingsPatch;
    updatedBy: string;
    now: Date;
  }): Promise<LocationDocumentSettingsRecord | null> {
    await this.db
      .insert(locationDocumentSettings)
      .values({
        ...input.patch,
        locationId: input.locationId,
        updatedBy: input.updatedBy,
      })
      .onConflictDoUpdate({
        set: {
          ...input.patch,
          updatedAt: input.now,
          updatedBy: input.updatedBy,
        },
        target: locationDocumentSettings.locationId,
      });

    return this.getLocationSettings(input.locationId);
  }
}

function defaultGlobalSettings(): OfficialDocumentSettingsRecord {
  return {
    brand: defaultBrandSettings,
    business: defaultBusinessSettings,
    currency: defaultMoneySettings,
    documents: defaultDocumentSettings,
    emailTemplates: defaultEmailTemplateSettings,
    locationOverridePolicy: defaultLocationOverridePolicy,
    updatedAt: null,
    updatedByUserSlug: null,
  };
}

function normalizePaperSize(value: string | null) {
  if (value === "receipt_80mm" || value === "a4" || value === "letter") {
    return value;
  }
  return null;
}
