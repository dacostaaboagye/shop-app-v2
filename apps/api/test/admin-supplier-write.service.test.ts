import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AdminSupplierWriteService } from "../src/modules/admin/admin-supplier-write.service.js";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";

const NOW = new Date("2026-04-26T22:30:00.000Z");
const ACTOR = {
  userId: "11111111-1111-4111-8111-111111111111",
  userSlug: "admin-user",
} as const;
const CONTACT_REFERENCE = "11111111-1111-4111-8111-111111111111";

describe("AdminSupplierWriteService supplier portal events", () => {
  it("publishes a durable event after linking a supplier contact portal", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.linkContactPortal(
      "acme-distribution",
      CONTACT_REFERENCE,
      ACTOR,
      { userSlug: "supplier-user" },
      NOW,
    );

    assert.equal(events[0]?.type, "supplier.portal.linked");
    assert.equal(
      events[0]?.summary,
      "Supplier portal linked for Acme Distribution: Ama Mensah (ama@acme.example) to supplier-user.",
    );
  });

  it("publishes a durable event after inviting a supplier contact portal user", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.inviteContactPortal(
      "acme-distribution",
      CONTACT_REFERENCE,
      ACTOR,
      NOW,
    );

    assert.equal(events[0]?.type, "supplier.portal.invited");
    assert.equal(
      events[0]?.summary,
      "Supplier portal invite sent for Acme Distribution: Ama Mensah (ama@acme.example) (sent).",
    );
  });

  it("publishes a durable event after unlinking a supplier contact portal user", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.unlinkContactPortal(
      "acme-distribution",
      CONTACT_REFERENCE,
      ACTOR,
      NOW,
    );

    assert.equal(events[0]?.type, "supplier.portal.unlinked");
    assert.equal(
      events[0]?.summary,
      "Supplier portal unlinked for Acme Distribution: Ama Mensah (ama@acme.example) from ama-mensah.",
    );
  });
});

describe("AdminSupplierWriteService supplier product events", () => {
  it("publishes a durable event after linking a supplier product", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.linkProduct(
      "acme-distribution",
      ACTOR,
      {
        isPreferred: true,
        leadTimeDays: 5,
        minimumOrderQuantity: 10,
        productSlug: "soap-bar",
      },
      NOW,
    );

    assert.equal(events[0]?.type, "supplier.product.linked");
    assert.equal(
      events[0]?.summary,
      "Supplier product linked for Acme Distribution: Soap Bar (soap-bar) in Bath Care / FreshGlow with 2 variants.",
    );
  });

  it("publishes a durable event after unlinking a supplier product", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.unlinkProduct("acme-distribution", "soap-bar", ACTOR, NOW);

    assert.equal(events[0]?.type, "supplier.product.unlinked");
    assert.equal(
      events[0]?.summary,
      "Supplier product unlinked for Acme Distribution: Soap Bar (soap-bar) in Bath Care / FreshGlow.",
    );
  });
});

describe("AdminSupplierWriteService supplier procurement events", () => {
  it("publishes a durable event after creating a supplier procurement order", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.createProcurementOrder(
      "acme-distribution",
      ACTOR,
      {
        destinationLocationSlug: "accra-central-store",
        lines: [{ requestedQuantity: 12, variantSlug: "soap-bar-fresh" }],
        notes: "Restock the retail shelf.",
      },
      NOW,
    );

    assert.equal(events[0]?.type, "supplier.procurement.created");
    assert.equal(
      events[0]?.summary,
      "Supplier purchase order created for Acme Distribution: PO-2026-0001 to Accra Central Store with 2 lines and 18 requested units.",
    );
  });

  it("publishes a durable event after transitioning a supplier procurement order", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.transitionProcurementOrder(
      "acme-distribution",
      "PO-2026-0001",
      ACTOR,
      "ordered",
      "Sent after approval.",
      NOW,
    );

    assert.equal(events[0]?.type, "supplier.procurement.status_updated");
    assert.equal(
      events[0]?.summary,
      "Supplier purchase order sent to supplier for Acme Distribution: PO-2026-0001 to Accra Central Store.",
    );
  });

  it("publishes a durable event after recording supplier goods receipt", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService(events);

    await service.receiveProcurementOrder(
      "acme-distribution",
      "PO-2026-0001",
      ACTOR,
      {
        lines: [{ receivedQuantity: 18, variantSlug: "soap-bar-fresh" }],
        notes: "All cartons received in good condition.",
      },
      NOW,
    );

    assert.equal(events[0]?.type, "supplier.procurement.received");
    assert.equal(
      events[0]?.summary,
      "Supplier goods receipt recorded for Acme Distribution: PO-2026-0001 to Accra Central Store at 18 received units (fully received).",
    );
  });
});

function createService(events: PlatformEventRecord[]) {
  return new AdminSupplierWriteService(
    {
      async addContact() {
        throw new Error("not used");
      },
      async createInquiry() {
        throw new Error("not used");
      },
      async createProcurementOrder() {
        return supplierDetail();
      },
      async createSupplier() {
        throw new Error("not used");
      },
      async getPortalContactEventContext() {
        return contactContext();
      },
      async inviteContactPortal() {
        return supplierDetail();
      },
      async linkContactPortal() {
        return supplierDetail();
      },
      async linkProduct() {
        return supplierDetail();
      },
      async getSupplierProductEventContext() {
        return supplierProductContext();
      },
      async receiveProcurementOrder() {
        return supplierDetail({ procurementOrderStatus: "received" });
      },
      async removeContact() {
        throw new Error("not used");
      },
      async transitionProcurementOrder() {
        return supplierDetail({ procurementOrderStatus: "ordered" });
      },
      async unlinkContactPortal() {
        return supplierDetail({ userSlug: null });
      },
      async unlinkProduct() {
        return true;
      },
      async updateInquiry() {
        throw new Error("not used");
      },
      async updateSupplier() {
        throw new Error("not used");
      },
    },
    {
      async generateReference() {
        return "PO-2026-0001";
      },
    },
    {
      async publish(event) {
        events.push(event);
      },
    },
  );
}

function contactContext() {
  return {
    contactEmail: "ama@acme.example",
    contactName: "Ama Mensah",
    contactReference: CONTACT_REFERENCE,
    supplierName: "Acme Distribution",
    supplierSlug: "acme-distribution",
    userSlug: "ama-mensah",
  };
}

function supplierDetail(
  overrides: {
    procurementOrderStatus?:
      | "draft"
      | "submitted"
      | "approved"
      | "ordered"
      | "partially_received"
      | "received"
      | "cancelled"
      | "closed";
    procurementOrderTotalReceivedQuantity?: number;
    userSlug?: string | null;
  } = {},
) {
  return {
    contactCount: 1,
    contacts: [
      {
        contactReference: CONTACT_REFERENCE,
        email: "ama@acme.example",
        firstName: "Ama",
        isPrimary: true,
        jobTitle: "Procurement Lead",
        lastName: "Mensah",
        latestInvite: {
          attemptedAt: NOW.toISOString(),
          deliveryReason: null,
          deliveryStatus: "sent" as const,
          expiresAt: new Date("2026-04-26T23:30:00.000Z").toISOString(),
          recipientEmail: "ama@acme.example",
        },
        phone: "+2335550101",
        portalStatus:
          overrides.userSlug === null ? ("none" as const) : ("linked" as const),
        status: "active" as const,
        userSlug: overrides.userSlug ?? "supplier-user",
      },
    ],
    createdAt: NOW.toISOString(),
    email: "procurement@acme.example",
    inquiries: [],
    legalName: "Acme Distribution Limited",
    linkedUserCount: overrides.userSlug === null ? 0 : 1,
    name: "Acme Distribution",
    paymentTermsDays: 30,
    phone: "+2335550100",
    primaryContact: {
      email: "ama@acme.example",
      firstName: "Ama",
      lastName: "Mensah",
      phone: "+2335550101",
      userSlug: overrides.userSlug ?? "supplier-user",
    },
    primaryImageUrl: null,
    procurementOrders: [
      {
        approvedAt:
          overrides.procurementOrderStatus === "approved" ||
          overrides.procurementOrderStatus === "ordered" ||
          overrides.procurementOrderStatus === "partially_received" ||
          overrides.procurementOrderStatus === "received" ||
          overrides.procurementOrderStatus === "closed"
            ? NOW.toISOString()
            : null,
        cancelledAt:
          overrides.procurementOrderStatus === "cancelled"
            ? NOW.toISOString()
            : null,
        createdAt: NOW.toISOString(),
        destinationLocationName: "Accra Central Store",
        destinationLocationSlug: "accra-central-store",
        expectedAt: null,
        lines: [
          {
            approvedQuantity: 12,
            productName: "Soap Bar",
            productSlug: "soap-bar",
            receivedQuantity:
              overrides.procurementOrderTotalReceivedQuantity ?? 12,
            requestedQuantity: 12,
            sku: "SOAP-FRESH-001",
            unitCost: "4.50",
            variantName: "Fresh",
            variantSlug: "soap-bar-fresh",
          },
          {
            approvedQuantity: 6,
            productName: "Soap Bar",
            productSlug: "soap-bar",
            receivedQuantity: 6,
            requestedQuantity: 6,
            sku: "SOAP-LAV-001",
            unitCost: "4.75",
            variantName: "Lavender",
            variantSlug: "soap-bar-lavender",
          },
        ],
        notes: "Restock the retail shelf.",
        orderedAt:
          overrides.procurementOrderStatus === "ordered" ||
          overrides.procurementOrderStatus === "partially_received" ||
          overrides.procurementOrderStatus === "received" ||
          overrides.procurementOrderStatus === "closed"
            ? NOW.toISOString()
            : null,
        receivedAt:
          overrides.procurementOrderStatus === "received" ||
          overrides.procurementOrderStatus === "closed"
            ? NOW.toISOString()
            : null,
        reference: "PO-2026-0001",
        status: overrides.procurementOrderStatus ?? "draft",
      },
    ],
    products: [
      {
        brandName: "FreshGlow",
        categoryName: "Bath Care",
        isPreferred: true,
        lastCostPrice: null,
        leadTimeDays: 5,
        minimumOrderQuantity: 10,
        productName: "Soap Bar",
        productSlug: "soap-bar",
        supplierProductCode: null,
        variantCount: 2,
        variants: [],
      },
    ],
    recentTransactions: [],
    slug: "acme-distribution",
    status: "active" as const,
    taxId: "TIN-12345",
    website: "https://acme.example",
  };
}

function supplierProductContext() {
  return {
    brandName: "FreshGlow",
    categoryName: "Bath Care",
    productName: "Soap Bar",
    productSlug: "soap-bar",
    supplierName: "Acme Distribution",
    supplierSlug: "acme-distribution",
    variantCount: 2,
  };
}
