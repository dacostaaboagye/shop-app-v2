import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import type { AdminInvoiceListInput } from "../src/modules/sales/postgres-admin-invoice-query.repository.js";
import type {
  AdminInvoiceRecord,
  InvoiceWithLines,
} from "../src/modules/sales/sales.contracts.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-20T10:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_LOCATION_ID = "33333333-3333-4333-8333-333333333333";

describe("admin invoice routes", () => {
  it("lists invoices through the admin repository with scoped filters", async () => {
    let capturedInput: AdminInvoiceListInput | null = null;
    const server = createAdminInvoiceServer({
      async listForAdmin(input) {
        capturedInput = input;
        return adminListResult([adminInvoice()]);
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url:
        "/api/admin/invoices?channel=pos&classification=outgoing" +
        `&currentPayableOnly=true&documentType=invoice&locationId=${LOCATION_ID}` +
        "&page=2&pageSize=10&q=Adwoa&status=confirmed",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(capturedInput, {
      channel: "pos",
      classification: "outgoing",
      currentPayableOnly: true,
      documentType: "invoice",
      locationIds: [LOCATION_ID],
      page: 2,
      pageSize: 10,
      q: "Adwoa",
      status: "confirmed",
    });
    assert.equal(response.json().items[0].locationName, "East Legon");
    assert.equal(response.json().totals.currentPayableAmount, "25.00");
  });

  it("rejects admin invoice requests outside the actor's sales scope", async () => {
    let wasRepositoryCalled = false;
    const server = createAdminInvoiceServer({
      async listForAdmin(input) {
        wasRepositoryCalled = true;
        return adminListResult([adminInvoice()], input);
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: `/api/admin/invoices?locationId=${OTHER_LOCATION_ID}`,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(wasRepositoryCalled, false);
  });

  it("exports scoped invoice rows as CSV", async () => {
    let capturedInput: AdminInvoiceListInput | null = null;
    const server = createAdminInvoiceServer({
      async listForAdmin(input) {
        capturedInput = input;
        return adminListResult([
          adminInvoice({ customerName: "Adwoa Mensah" }),
        ]);
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/admin/invoices/export.csv?documentType=invoice",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "text/csv; charset=utf-8");
    assert.match(
      String(response.headers["content-disposition"]),
      /admin-invoices-\d{4}-\d{2}-\d{2}\.csv/,
    );
    assert.ok(capturedInput);
    const exportInput = capturedInput as AdminInvoiceListInput;
    assert.deepEqual(exportInput.locationIds, [LOCATION_ID]);
    assert.equal(exportInput.pageSize, 5000);
    assert.match(response.body, /Reference,Type,Status/);
    assert.match(response.body, /Adwoa Mensah/);
  });

  it("requires sales scope for admin invoice detail", async () => {
    const server = createAdminInvoiceServer({
      invoice: invoice({ locationId: OTHER_LOCATION_ID }),
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/admin/invoices/INV%2F2026%2F000001",
    });

    assert.equal(response.statusCode, 403);
  });
});

function createAdminInvoiceServer(input: {
  invoice?: InvoiceWithLines;
  listForAdmin?: (
    input: AdminInvoiceListInput,
  ) => Promise<ReturnType<typeof adminListResult>>;
}) {
  const permissionService = {
    async assertHasPermission() {},
    async resolveAllPermissions() {
      return {
        anyActivePermissions: [
          { key: "admin.dashboard.view", source: "role" as const },
        ],
        locationScopes: [
          {
            locationId: LOCATION_ID,
            locationName: "East Legon",
            locationSlug: "east-legon",
            permissions: [{ key: "pos.sales.manage", source: "role" as const }],
          },
        ],
      };
    },
  };

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
                return {
                  id: USER_ID,
                  slug: "admin-user",
                  status: "active" as const,
                };
              },
            },
            "development-access-secret",
            () => NOW,
          ).authenticate(token);
        },
      },
      permissionService,
    },
    adminInvoices: {
      adminInvoiceRepository: {
        async listForAdmin(args) {
          return input.listForAdmin
            ? input.listForAdmin(args)
            : adminListResult([adminInvoice()], args);
        },
      },
      invoiceRepository: {
        async findByReference(reference) {
          return reference === "INV/2026/000001"
            ? (input.invoice ?? invoice())
            : null;
        },
      },
      permissionService,
    },
  });
}

function adminListResult(
  items: AdminInvoiceRecord[],
  input: Pick<AdminInvoiceListInput, "page" | "pageSize"> = {
    page: 1,
    pageSize: 25,
  },
) {
  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    total: items.length,
    totals: {
      adjustedInvoiceCount: 0,
      creditedAmount: "0",
      creditNoteCount: 0,
      currentPayableAmount: "25.00",
      grossOriginalSalesAmount: "25.00",
      supersededAmount: "0",
      voidedAmount: "0",
    },
  };
}

function adminInvoice(
  overrides: Partial<AdminInvoiceRecord> = {},
): AdminInvoiceRecord {
  return {
    ...invoice(),
    locationName: "East Legon",
    locationSlug: "east-legon",
    ...overrides,
  };
}

function invoice(overrides: Partial<InvoiceWithLines> = {}): InvoiceWithLines {
  return {
    attributedWorkerEmail: "worker@example.com",
    attributedWorkerId: USER_ID,
    attributedWorkerName: "Store Worker",
    classification: "outgoing",
    confirmedAt: NOW,
    createdAt: NOW,
    createdBy: USER_ID,
    currentPayableReference: "INV/2026/000001",
    customerBillingAddressLines: null,
    currencyCode: "GHS",
    currencyScale: 2,
    customerEmail: "buyer@example.com",
    customerName: "Buyer",
    customerPhone: null,
    customerTaxNumber: null,
    id: "44444444-4444-4444-8444-444444444444",
    lines: [],
    locationId: LOCATION_ID,
    notes: null,
    parentInvoiceId: null,
    parentInvoiceReference: null,
    paymentMethod: "cash",
    reference: "INV/2026/000001",
    replacementInvoiceId: null,
    replacementInvoiceReference: null,
    revisionCreditNoteId: null,
    revisionCreditNoteReference: null,
    revisionRootInvoiceId: null,
    revisionRootReference: null,
    role: "standard",
    status: "confirmed",
    subtotalAmount: "25.00",
    taxAmount: "0.00",
    totalAmount: "25.00",
    type: "pos",
    updatedAt: NOW,
    voidedAt: null,
    voidReason: null,
    ...overrides,
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
