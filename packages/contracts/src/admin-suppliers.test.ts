import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminLinkSupplierContactPortalRequestSchema,
  adminSupplierDetailSchema,
  adminSupplierListQuerySchema,
  adminSupplierListResponseSchema,
} from "./admin-suppliers.js";

describe("admin supplier contracts", () => {
  it("parses supplier list query defaults", () => {
    const parsed = adminSupplierListQuerySchema.parse({
      pageSize: "20",
      q: "acme",
      status: "active",
    });

    assert.equal(parsed.dir, "asc");
    assert.equal(parsed.page, 1);
    assert.equal(parsed.pageSize, 20);
    assert.equal(parsed.q, "acme");
    assert.equal(parsed.sort, "name");
    assert.equal(parsed.status, "active");
  });

  it("accepts supplier organizations with optional linked portal contacts", () => {
    const parsed = adminSupplierListResponseSchema.parse({
      items: [
        {
          contactCount: 2,
          createdAt: "2026-04-22T09:00:00.000Z",
          email: "procurement@acme.example",
          legalName: "Acme Distribution Limited",
          linkedUserCount: 1,
          name: "Acme Distribution",
          paymentTermsDays: 30,
          phone: "+233 555 0100",
          primaryContact: {
            email: "ama@acme.example",
            firstName: "Ama",
            lastName: "Mensah",
            phone: "+233 555 0101",
            userSlug: "ama-mensah",
          },
          primaryImageUrl: "https://cdn.example.com/suppliers/acme.png",
          slug: "acme-distribution",
          status: "active",
          taxId: "TIN-12345",
          website: "https://acme.example",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
    });

    assert.equal(parsed.items[0]?.name, "Acme Distribution");
    assert.equal(parsed.items[0]?.primaryContact?.userSlug, "ama-mensah");
  });

  it("accepts supplier contact portal link requests", () => {
    const parsed = adminLinkSupplierContactPortalRequestSchema.parse({
      userSlug: "supplier-user",
    });

    assert.equal(parsed.userSlug, "supplier-user");
  });

  it("accepts supplier detail procurement lifecycle records", () => {
    const parsed = adminSupplierDetailSchema.parse({
      contactCount: 0,
      contacts: [
        {
          contactReference: "11111111-1111-4111-8111-111111111111",
          email: "ama@acme.example",
          firstName: "Ama",
          isPrimary: true,
          jobTitle: "Procurement lead",
          lastName: "Mensah",
          phone: "+233 555 0101",
          portalStatus: "invited",
          status: "active",
          userSlug: "ama-mensah",
        },
      ],
      createdAt: "2026-04-22T09:00:00.000Z",
      email: "procurement@acme.example",
      legalName: "Acme Distribution Limited",
      linkedUserCount: 0,
      name: "Acme Distribution",
      paymentTermsDays: 30,
      phone: "+233 555 0100",
      primaryContact: null,
      inquiries: [
        {
          attachmentMimeType: "application/pdf",
          attachmentName: "black-backpack-spec.pdf",
          attachmentUrl: "https://cdn.example.com/inquiries/spec.pdf",
          createdAt: "2026-04-22T09:00:00.000Z",
          message: "Can you source the black backpack this month?",
          neededBy: null,
          productName: null,
          productSlug: null,
          reference: "SINQ-20260422-0001",
          requestedProductName: "Black backpack with laptop sleeve",
          requestedQuantity: 20,
          status: "sent",
          supplierResponse: null,
        },
      ],
      procurementOrders: [
        {
          approvedAt: null,
          cancelledAt: null,
          createdAt: "2026-04-22T09:00:00.000Z",
          destinationLocationName: "Central Warehouse",
          destinationLocationSlug: "central-warehouse",
          expectedAt: null,
          lines: [
            {
              approvedQuantity: 10,
              productName: "Acme Backpack",
              productSlug: "acme-backpack",
              receivedQuantity: 0,
              requestedQuantity: 10,
              sku: "ACME-BLK",
              unitCost: "100.00",
              variantName: "Black",
              variantSlug: "acme-backpack-black",
            },
          ],
          notes: "Restock",
          orderedAt: null,
          receivedAt: null,
          reference: "PO-0001",
          status: "approved",
        },
      ],
      products: [
        {
          brandName: "Acme",
          categoryName: "Bags",
          isPreferred: true,
          lastCostPrice: "100.00",
          leadTimeDays: 7,
          minimumOrderQuantity: 10,
          productName: "Acme Backpack",
          productSlug: "acme-backpack",
          supplierProductCode: "AB-001",
          variantCount: 1,
          variants: [
            {
              sku: "ACME-BLK",
              variantName: "Black",
              variantSlug: "acme-backpack-black",
            },
          ],
        },
      ],
      recentTransactions: [],
      slug: "acme-distribution",
      status: "active",
      taxId: "TIN-12345",
      website: "https://acme.example",
    });

    assert.equal(
      parsed.procurementOrders[0]?.lines[0]?.variantSlug,
      "acme-backpack-black",
    );
    assert.equal(parsed.inquiries[0]?.status, "sent");
  });
});
