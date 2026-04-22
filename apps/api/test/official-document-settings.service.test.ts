import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";
import {
  defaultBrandSettings,
  defaultBusinessSettings,
  defaultDocumentSettings,
  defaultLocationOverridePolicy,
  defaultMoneySettings,
} from "../src/modules/official-documents/official-document-defaults.js";
import type { OfficialDocumentSettingsRepository } from "../src/modules/official-documents/official-document-settings.repository.js";
import { OfficialDocumentSettingsService } from "../src/modules/official-documents/official-document-settings.service.js";
import type {
  LocationDocumentSettingsPatch,
  LocationDocumentSettingsRecord,
  OfficialDocumentSettings,
  OfficialDocumentSettingsRecord,
} from "../src/modules/official-documents/official-document-settings.types.js";

const NOW = new Date("2026-04-22T08:00:00.000Z");

describe("OfficialDocumentSettingsService", () => {
  it("publishes an operational event after global document settings change", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.updateGlobalSettings({
      actor: { userSlug: "admin-user" },
      now: NOW,
      patch: {
        brand: { brandName: "Amali Shop" },
        currency: { defaultDisplayCurrencyCode: "GHS" },
      },
      updatedBy: "11111111-1111-4111-8111-111111111111",
    });

    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, "documents.settings.global_updated");
    assert.equal(
      events[0]?.summary,
      "Official document settings updated: brand, currency.",
    );
    assert.deepEqual(events[0]?.audience, [
      { kind: "permission", permission: "settings.documents.view" },
    ]);
  });

  it("publishes location document setting changes to location-scoped managers and admins", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.updateLocationSettings({
      actor: { userSlug: "warehouse-manager" },
      locationId: "22222222-2222-4222-8222-222222222222",
      now: NOW,
      patch: { displayName: "Airport Shop", phone: "+233 24 000 0000" },
      updatedBy: "33333333-3333-4333-8333-333333333333",
    });

    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, "documents.settings.location_updated");
    assert.equal(
      events[0]?.summary,
      "Official document settings for Airport Store updated: displayName, phone.",
    );
    assert.deepEqual(events[0]?.audience, [
      {
        kind: "permission",
        locationId: "22222222-2222-4222-8222-222222222222",
        permission: "settings.location_documents.manage",
      },
      { kind: "permission", permission: "settings.documents.view" },
    ]);
  });
});

function createService(events: PlatformEventRecord[]) {
  return new OfficialDocumentSettingsService(createRepository(), null, {
    async publish(event) {
      events.push(event);
    },
  });
}

function createRepository(): OfficialDocumentSettingsRepository {
  const globalRecord = makeGlobalRecord();
  const locationRecord = makeLocationRecord();

  return {
    async getGlobalSettings() {
      return globalRecord;
    },
    async getLocationSettings() {
      return locationRecord;
    },
    async saveGlobalSettings(input: {
      now: Date;
      settings: OfficialDocumentSettings;
      updatedBy: string;
    }) {
      return {
        ...globalRecord,
        ...input.settings,
        updatedAt: input.now,
        updatedByUserSlug: "admin-user",
      };
    },
    async saveLocationSettings(input: {
      locationId: string;
      now: Date;
      patch: LocationDocumentSettingsPatch;
      updatedBy: string;
    }) {
      return {
        ...locationRecord,
        ...input.patch,
        updatedAt: input.now,
        updatedByUserSlug: "warehouse-manager",
      };
    },
  } as unknown as OfficialDocumentSettingsRepository;
}

function makeGlobalRecord(): OfficialDocumentSettingsRecord {
  return {
    brand: defaultBrandSettings,
    business: defaultBusinessSettings,
    currency: defaultMoneySettings,
    documents: defaultDocumentSettings,
    locationOverridePolicy: defaultLocationOverridePolicy,
    updatedAt: null,
    updatedByUserSlug: null,
  };
}

function makeLocationRecord(): LocationDocumentSettingsRecord {
  return {
    addressLines: null,
    defaultPaperSize: null,
    displayName: null,
    documentPrefix: null,
    email: null,
    locationId: "22222222-2222-4222-8222-222222222222",
    locationName: "Airport Store",
    phone: null,
    receiptFooter: null,
    timezone: null,
    updatedAt: null,
    updatedByUserSlug: null,
  };
}
