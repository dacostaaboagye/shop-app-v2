import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminCreateCustomerAddressRequestSchema,
  adminCreateCustomerContactRequestSchema,
  adminCreateCustomerRequestSchema,
  adminCustomerDetailSchema,
  adminCustomerListQuerySchema,
} from "./admin-customers.js";

describe("admin customer contracts", () => {
  it("normalizes customer list filters", () => {
    const parsed = adminCustomerListQuerySchema.parse({
      page: "2",
      pageSize: "50",
      q: "  acme  ",
      status: "active",
      type: "business",
    });

    assert.deepEqual(parsed, {
      dir: "asc",
      page: 2,
      pageSize: 50,
      q: "acme",
      sort: "displayName",
      status: "active",
      type: "business",
    });
  });

  it("accepts customer master data inputs", () => {
    const parsed = adminCreateCustomerRequestSchema.parse({
      creditLimitAmount: "2500.00",
      defaultCurrencyCode: "ghs",
      displayName: "Acme Retail",
      paymentTermsDays: 14,
    });

    assert.equal(parsed.customerType, "business");
    assert.equal(parsed.status, "active");
    assert.equal(parsed.defaultCurrencyCode, "ghs");
  });

  it("accepts contact and address inputs", () => {
    const contact = adminCreateCustomerContactRequestSchema.parse({
      email: "buyer@example.com",
      isPrimary: true,
      name: "Ama Mensah",
      receivesInvoices: true,
    });
    const address = adminCreateCustomerAddressRequestSchema.parse({
      addressLines: ["12 Market Street"],
      isDefaultBilling: true,
      label: "Head office",
      type: "billing",
    });

    assert.equal(contact.receivesDeliveryUpdates, false);
    assert.equal(address.isDefaultShipping, false);
  });

  it("keeps detail DTOs free of raw ids", () => {
    const parsed = adminCustomerDetailSchema.parse({
      addressCount: 1,
      addresses: [
        {
          addressLines: ["12 Market Street"],
          addressReference: "CAD-00001",
          city: null,
          countryCode: "GH",
          isDefaultBilling: true,
          isDefaultShipping: false,
          label: "Head office",
          recipientName: null,
          recipientPhone: null,
          region: null,
          status: "active",
          type: "billing",
        },
      ],
      contactCount: 1,
      contacts: [
        {
          contactReference: "CTC-00001",
          email: "buyer@example.com",
          isPrimary: true,
          name: "Ama Mensah",
          phone: null,
          portalStatus: "none",
          receivesDeliveryUpdates: false,
          receivesInvoices: true,
          roleTitle: null,
          status: "active",
          userSlug: null,
        },
      ],
      createdAt: "2026-05-24T06:00:00.000Z",
      creditLimitAmount: "2500.00",
      customerType: "business",
      defaultCurrencyCode: "GHS",
      displayName: "Acme Retail",
      events: [],
      legalName: null,
      notes: null,
      paymentTermsDays: 14,
      primaryContact: {
        contactReference: "CTC-00001",
        email: "buyer@example.com",
        name: "Ama Mensah",
        phone: null,
      },
      reference: "CUS-00001",
      slug: "acme-retail",
      status: "active",
      taxNumber: null,
    });

    assert.equal("id" in parsed, false);
    assert.equal(parsed.reference, "CUS-00001");
  });
});
