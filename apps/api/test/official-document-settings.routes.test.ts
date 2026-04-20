import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  LocationDocumentSettingsResponse,
  OfficialDocumentProfileResponse,
  OfficialDocumentSettingsResponse,
  UpdateOfficialDocumentSettingsRequest,
} from "@shop/contracts";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-20T00:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";

describe("official document settings routes", () => {
  it("returns global document settings to authorized admins", async () => {
    const server = createSettingsServer();

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/admin/settings/documents",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().brand.brandName, "Shop App");
    assert.equal(response.json().currency.baseCurrencyCode, "GHS");
  });

  it("returns the resolved printable document profile for a location", async () => {
    const server = createSettingsServer();

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: `/api/documents/profile?locationId=${LOCATION_ID}`,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().brandName, "Shop App");
    assert.equal(response.json().locationId, LOCATION_ID);
    assert.equal(response.json().locationName, "Airport Branch");
    assert.equal(response.json().currencyCode, "GHS");
  });

  it("updates global document settings through the service", async () => {
    let capturedBrandName: string | undefined;
    const server = createSettingsServer({
      async updateGlobalSettings(input) {
        capturedBrandName = input.patch.brand?.brandName;
        return {
          ...globalSettings(),
          brand: { ...globalSettings().brand, brandName: capturedBrandName ?? "Shop App" },
          updatedAt: NOW.toISOString(),
          updatedByUserSlug: "admin-user",
        };
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "PATCH",
      payload: { brand: { brandName: "Amali Shop" } },
      url: "/api/admin/settings/documents",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().brand.brandName, "Amali Shop");
    assert.equal(capturedBrandName, "Amali Shop");
  });

  it("enforces scoped location permission for manager overrides", async () => {
    const permissionCalls: Array<{ locationId?: string; permission: string }> = [];
    const server = createSettingsServer({
      permissionCalls,
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "PATCH",
      payload: { receiptFooter: "Thank you for visiting this branch." },
      url: `/api/manager/settings/locations/${LOCATION_ID}/documents`,
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(permissionCalls, [
      { permission: "settings.location_documents.manage" },
      {
        locationId: LOCATION_ID,
        permission: "settings.location_documents.manage",
      },
    ]);
    assert.equal(response.json().receiptFooter, "Thank you for visiting this branch.");
  });
});

function createSettingsServer(input: {
  permissionCalls?: Array<{ locationId?: string; permission: string }>;
  updateGlobalSettings?: (input: {
    now: Date;
    patch: UpdateOfficialDocumentSettingsRequest;
    updatedBy: string;
  }) => Promise<OfficialDocumentSettingsResponse>;
} = {}) {
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate(token) {
          const { AccessTokenAuthenticationService } = await import(
            "../src/modules/auth/access-token-authentication.service.js"
          );
          return new AccessTokenAuthenticationService(
            {
              async findUserById() {
                return { id: USER_ID, slug: "admin-user", status: "active" as const };
              },
            },
            "development-access-secret",
            () => NOW,
          ).authenticate(token);
        },
      },
      permissionService: {
        async assertHasPermission(args) {
          input.permissionCalls?.push({
            ...(args.locationId ? { locationId: args.locationId } : {}),
            permission: args.permission,
          });

          if (args.permission.startsWith("settings.")) return;
          throw new AppError({
            code: "forbidden",
            detail: "Unexpected permission in test.",
            statusCode: 403,
            title: "Forbidden",
          });
        },
      },
    },
    officialDocuments: {
      permissionService: {
        async assertHasPermission(args) {
          input.permissionCalls?.push({
            ...(args.locationId ? { locationId: args.locationId } : {}),
            permission: args.permission,
          });
        },
      },
      settingsService: {
        async getGlobalSettings() {
          return globalSettings();
        },
        async getLocationSettings(locationId) {
          return locationSettings(locationId);
        },
        async resolveDocumentProfile(input = {}) {
          return documentProfile(input.locationId);
        },
        async updateGlobalSettings(args) {
          if (input.updateGlobalSettings) return input.updateGlobalSettings(args);
          return { ...globalSettings(), updatedAt: NOW.toISOString() };
        },
        async updateLocationSettings(args) {
          const current = locationSettings(args.locationId);
          return {
            ...current,
            addressLines: args.patch.addressLines ?? current.addressLines,
            defaultPaperSize: args.patch.defaultPaperSize ?? current.defaultPaperSize,
            displayName: args.patch.displayName ?? current.displayName,
            documentPrefix: args.patch.documentPrefix ?? current.documentPrefix,
            email: args.patch.email ?? current.email,
            phone: args.patch.phone ?? current.phone,
            receiptFooter: args.patch.receiptFooter ?? current.receiptFooter,
            timezone: args.patch.timezone ?? current.timezone,
            updatedAt: NOW.toISOString(),
          };
        },
      },
    },
  });
}

function documentProfile(locationId?: string): OfficialDocumentProfileResponse {
  const location = locationId ? locationSettings(locationId) : null;
  return {
    accentColor: "hsl(28 72% 48%)",
    addressLines: ["Primary business location"],
    brandName: "Shop App",
    currencyCode: "GHS",
    currencyScale: 2,
    documentPrefix: "RCT",
    email: "accounts@example.com",
    footer: "Official document.",
    legalName: "Shop App Trading Company",
    locale: "en-GH",
    locationId: location?.locationId ?? null,
    locationName: location?.locationName ?? null,
    logoText: "SA",
    paperSize: "receipt_80mm",
    phone: "+233 00 000 0000",
    primaryColor: "hsl(174 52% 23%)",
    registrationNumber: "REGISTRATION-PENDING",
    taxNumber: "TAX-PENDING",
    timezone: "Africa/Accra",
    website: "www.example.com",
  };
}

function globalSettings(): OfficialDocumentSettingsResponse {
  return {
    brand: {
      accentColor: "hsl(28 72% 48%)",
      brandName: "Shop App",
      logoText: "SA",
      primaryColor: "hsl(174 52% 23%)",
    },
    business: {
      addressLines: ["Primary business location"],
      email: "accounts@example.com",
      legalName: "Shop App Trading Company",
      phone: "+233 00 000 0000",
      registrationNumber: "REGISTRATION-PENDING",
      taxNumber: "TAX-PENDING",
      website: "www.example.com",
    },
    currency: {
      allowExchangeRates: false,
      allowMultiCurrencySales: false,
      baseCurrencyCode: "GHS",
      currencyScale: 2,
      defaultDisplayCurrencyCode: "GHS",
      roundingMode: "half_up" as const,
    },
    documents: {
      defaultPaperSize: "receipt_80mm" as const,
      gtnPrefix: "GTN",
      invoicePrefix: "INV",
      locale: "en-GH",
      receiptFooter: "Official document.",
      receiptPrefix: "RCT",
      timezone: "Africa/Accra",
    },
    locationOverridePolicy: {
      allowLocationAddress: true,
      allowLocationContact: true,
      allowLocationDisplayName: true,
      allowLocationFooter: true,
      allowLocationNumberPrefix: false,
      allowLocationPaperSize: true,
    },
    updatedAt: null,
    updatedByUserSlug: null,
  };
}

function locationSettings(locationId: string): LocationDocumentSettingsResponse {
  return {
    addressLines: null,
    defaultPaperSize: null,
    displayName: null,
    documentPrefix: null,
    email: null,
    locationId,
    locationName: "Airport Branch",
    phone: null,
    receiptFooter: null,
    timezone: null,
    updatedAt: null,
    updatedByUserSlug: null,
  };
}

function bearerToken() {
  return `Bearer ${
    issueAccessToken({
      expiresInSeconds: 900,
      now: NOW,
      secret: "development-access-secret",
      userId: USER_ID,
      userSlug: "admin-user",
    }).token
  }`;
}
