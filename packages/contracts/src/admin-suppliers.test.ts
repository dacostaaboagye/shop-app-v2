import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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

  it("accepts supplier detail procurement lifecycle records", () => {
    const parsed = adminSupplierDetailSchema.parse({
      contactCount: 0,
      contacts: [],
      createdAt: "2026-04-22T09:00:00.000Z",
      email: "procurement@acme.example",
      legalName: "Acme Distribution Limited",
      linkedUserCount: 0,
      name: "Acme Distribution",
      paymentTermsDays: 30,
      phone: "+233 555 0100",
      primaryContact: null,
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
      products: [],
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
  });
});
