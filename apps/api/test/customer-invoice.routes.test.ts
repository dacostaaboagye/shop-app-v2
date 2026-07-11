import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { customerInvoiceDownloadRateLimit } from "../src/modules/sales/customer-invoice.routes.js";
import type { CustomerInvoiceListInput } from "../src/modules/sales/postgres-customer-invoice-query.repository.js";
import type {
  InvoiceRecord,
  InvoiceWithLines,
} from "../src/modules/sales/sales.contracts.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-05-24T10:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";

describe("customer invoice routes", () => {
  it("lists customer-safe invoices through relationship-scoped repository", async () => {
    let capturedInput: CustomerInvoiceListInput | null = null;
    const server = createCustomerInvoiceServer({
      async listForCustomer(input) {
        capturedInput = input;
        return listResult([invoice()]);
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url:
        "/api/customer/invoices?currentPayableOnly=true&documentType=invoice" +
        "&page=2&pageSize=10&q=INV-CPO&status=confirmed",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(capturedInput, {
      currentPayableOnly: true,
      documentType: "invoice",
      page: 2,
      pageSize: 10,
      q: "INV-CPO",
      status: "confirmed",
      userId: USER_ID,
    });
    const item = response.json().items[0];
    assert.equal(item.reference, "INV-CPO-00001");
    assert.equal(item.customerReference, "CUS-00001");
    assert.equal("attributedWorkerId" in item, false);
    assert.equal("locationId" in item, false);
  });

  it("returns customer-safe invoice detail without stock or workforce internals", async () => {
    const server = createCustomerInvoiceServer({
      invoice: invoice({
        lines: [
          {
            createdAt: NOW,
            id: "55555555-5555-4555-8555-555555555555",
            invoiceId: "44444444-4444-4444-8444-444444444444",
            lineTotal: "25.00",
            quantity: 1,
            skuId: "66666666-6666-4666-8666-666666666666",
            skuSnapshot: {
              productName: "Weekender Duffel",
              sku: "BAG-HHW-001",
              variantName: "Blue",
            },
            stockMovementId: "77777777-7777-4777-8777-777777777777",
            taxAmount: "0.00",
            taxCategory: null,
            taxRate: null,
            unitPrice: "25.00",
            updatedAt: NOW,
          },
        ],
      }),
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/customer/invoices/INV-CPO-00001",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.reference, "INV-CPO-00001");
    assert.equal("attributedWorkerId" in body, false);
    assert.equal("locationId" in body, false);
    const line = body.lines[0];
    assert.equal(line.skuSnapshot.sku, "BAG-HHW-001");
    assert.equal("skuId" in line, false);
    assert.equal("stockMovementId" in line, false);
  });

  it("uses non-disclosing not found behavior for guessed references", async () => {
    let downloadWasCalled = false;
    const server = createCustomerInvoiceServer({
      invoice: null,
      async getPdfDownloadForAuthorizedInvoice() {
        downloadWasCalled = true;
        return pdfFile();
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/customer/invoices/INV-CPO-99999/download",
    });

    assert.equal(response.statusCode, 404);
    assert.equal(downloadWasCalled, false);
  });

  it("downloads a PDF only after customer relationship authorization", async () => {
    const downloadCalls: InvoiceWithLines[] = [];
    const server = createCustomerInvoiceServer({
      async getPdfDownloadForAuthorizedInvoice(input) {
        downloadCalls.push(input.invoice);
        return pdfFile();
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/customer/invoices/INV-CPO-00001/download",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "application/pdf");
    assert.equal(
      response.headers["content-disposition"],
      'attachment; filename="INV-CPO-00001.pdf"',
    );
    assert.equal(downloadCalls[0]?.reference, "INV-CPO-00001");
  });

  it("limits repeated customer invoice downloads", async () => {
    const server = createCustomerInvoiceServer({});

    const responses = await Promise.all(
      Array.from({ length: customerInvoiceDownloadRateLimit.max + 1 }, () =>
        server.inject({
          headers: { authorization: bearerToken() },
          method: "GET",
          url: "/api/customer/invoices/INV-CPO-00001/download",
        }),
      ),
    );

    const limitedResponse = responses.find(
      (response) => response.statusCode === 429,
    );
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.json().code, "rate_limited");
  });
});

function createCustomerInvoiceServer(input: {
  getPdfDownloadForAuthorizedInvoice?: (input: {
    actorUserId: string;
    actorUserSlug?: string;
    invoice: InvoiceWithLines;
  }) => Promise<ReturnType<typeof pdfFile>>;
  invoice?: InvoiceWithLines | null;
  listForCustomer?: (input: CustomerInvoiceListInput) => Promise<{
    items: InvoiceRecord[];
    page: number;
    pageSize: number;
    total: number;
  }>;
}) {
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
                  slug: "customer-user",
                  status: "active" as const,
                };
              },
            },
            "development-access-secret",
            () => NOW,
          ).authenticate(token);
        },
      },
      permissionService: {
        async assertHasPermission() {},
      },
    },
    customerInvoices: {
      customerInvoiceRepository: {
        async findForCustomerByReference() {
          return input.invoice === undefined ? invoice() : input.invoice;
        },
        async listForCustomer(args) {
          return input.listForCustomer
            ? input.listForCustomer(args)
            : listResult([invoice()]);
        },
      },
      salesDocumentSnapshotService: {
        async getPdfDownloadForAuthorizedInvoice(args) {
          return input.getPdfDownloadForAuthorizedInvoice
            ? input.getPdfDownloadForAuthorizedInvoice(args)
            : pdfFile();
        },
      },
    },
  });
}

function listResult(
  items: InvoiceRecord[],
  input: Pick<CustomerInvoiceListInput, "page" | "pageSize"> = {
    page: 1,
    pageSize: 25,
  },
) {
  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    total: items.length,
  };
}

function invoice(overrides: Partial<InvoiceWithLines> = {}): InvoiceWithLines {
  return {
    attributedWorkerEmail: "worker@example.com",
    attributedWorkerId: "33333333-3333-4333-8333-333333333333",
    attributedWorkerName: "Store Worker",
    classification: "outgoing",
    confirmedAt: NOW,
    createdAt: NOW,
    createdBy: "33333333-3333-4333-8333-333333333333",
    currentPayableReference: "INV-CPO-00001",
    customerBillingAddressLines: ["12 Market Street"],
    customerContactId: "88888888-8888-4888-8888-888888888888",
    customerContactReference: "CON-00001",
    currencyCode: "GHS",
    currencyScale: 2,
    customerEmail: "buyer@example.com",
    customerId: "99999999-9999-4999-8999-999999999999",
    customerName: "Adwoa Mensah",
    customerPhone: null,
    customerReference: "CUS-00001",
    customerSlug: "adwoa-mensah",
    customerTaxNumber: null,
    id: "44444444-4444-4444-8444-444444444444",
    lines: [],
    locationId: LOCATION_ID,
    notes: null,
    parentInvoiceId: null,
    parentInvoiceReference: null,
    paymentMethod: "transfer",
    reference: "INV-CPO-00001",
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
    type: "portal",
    updatedAt: NOW,
    voidedAt: null,
    voidReason: null,
    ...overrides,
  };
}

function pdfFile() {
  return {
    body: Buffer.from("%PDF customer invoice"),
    contentType: "application/pdf" as const,
    filename: "INV-CPO-00001.pdf",
  };
}

function bearerToken() {
  return `Bearer ${
    issueAccessToken({
      expiresInSeconds: 900,
      now: NOW,
      secret: "development-access-secret",
      userId: USER_ID,
      userSlug: "customer-user",
    }).token
  }`;
}
