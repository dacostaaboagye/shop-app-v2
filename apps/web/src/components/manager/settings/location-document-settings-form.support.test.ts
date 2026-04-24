import assert from "node:assert/strict";
import test from "node:test";
import type { LocationDocumentSettingsResponse } from "@shop/contracts";
import {
  toLocationDocumentSettingsFormValues,
  toLocationDocumentSettingsPayload,
} from "./location-document-settings-form.support";

const settings: LocationDocumentSettingsResponse = {
  addressLines: ["Airport Road", "Accra"],
  defaultPaperSize: "receipt_80mm",
  displayName: "Airport Retail",
  documentPrefix: "AIR",
  email: "airport@example.com",
  locationId: "22222222-2222-4222-8222-222222222222",
  locationName: "Airport Branch",
  phone: "+233 00 000 0000",
  receiptFooter: "Thank you for visiting Airport Branch.",
  timezone: "Africa/Accra",
  updatedAt: null,
  updatedByUserSlug: null,
};

test("maps location document overrides into editable form values", () => {
  const values = toLocationDocumentSettingsFormValues(settings);

  assert.equal(values.addressLines, "Airport Road\nAccra");
  assert.equal(values.defaultPaperSize, "receipt_80mm");
  assert.equal(values.displayName, "Airport Retail");
});

test("maps blank location override fields to inherited nulls", () => {
  const payload = toLocationDocumentSettingsPayload({
    addressLines: "  ",
    defaultPaperSize: "inherit",
    displayName: "  ",
    documentPrefix: "  ",
    email: "  ",
    phone: "  ",
    receiptFooter: "  ",
    timezone: "  ",
  });

  assert.deepEqual(payload, {
    addressLines: null,
    defaultPaperSize: null,
    displayName: null,
    documentPrefix: null,
    email: null,
    phone: null,
    receiptFooter: null,
    timezone: null,
  });
});
