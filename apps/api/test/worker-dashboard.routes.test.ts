import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import type { InvoiceRecord } from "../src/modules/sales/sales.contracts.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-29T12:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";

describe("worker dashboard routes", () => {
  it("returns a worker summary with stock, notifications, and sales metrics", async () => {
    const invoiceCalls: Array<{ dateFrom?: Date; page: number }> = [];
    const server = createWorkerDashboardServer({
      canViewSales: true,
      invoiceListByWorker: async (input) => {
        invoiceCalls.push(
          input.dateFrom
            ? { dateFrom: input.dateFrom, page: input.page }
            : { page: input.page },
        );
        return {
          items:
            input.dateFrom?.toISOString() === "2026-04-29T00:00:00.000Z"
              ? [
                  invoiceRecord({
                    createdAt: new Date("2026-04-29T10:00:00.000Z"),
                    reference: "INV/2026/000101",
                    totalAmount: "20.00",
                    type: "credit_note",
                  }),
                  invoiceRecord({
                    createdAt: new Date("2026-04-29T09:00:00.000Z"),
                    reference: "INV/2026/000100",
                    totalAmount: "120.00",
                  }),
                ]
              : [
                  invoiceRecord({
                    createdAt: new Date("2026-04-29T10:00:00.000Z"),
                    reference: "INV/2026/000101",
                    totalAmount: "20.00",
                    type: "credit_note",
                  }),
                  invoiceRecord({
                    createdAt: new Date("2026-04-29T09:00:00.000Z"),
                    reference: "INV/2026/000100",
                    totalAmount: "120.00",
                  }),
                  invoiceRecord({
                    createdAt: new Date("2026-04-28T15:00:00.000Z"),
                    reference: "INV/2026/000099",
                    totalAmount: "50.00",
                    type: "adjusted",
                  }),
                ],
          total:
            input.dateFrom?.toISOString() === "2026-04-29T00:00:00.000Z"
              ? 2
              : 3,
        };
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      query: { locationId: LOCATION_ID },
      url: "/api/worker/dashboard/summary",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().stockSummary.lowStockCount, 1);
    assert.equal(response.json().stockSummary.outOfStockCount, 1);
    assert.equal(response.json().latestNotifications.length, 1);
    assert.equal(response.json().latestNotifications[0]?.status, "unread");
    assert.equal(response.json().latestSales.length, 2);
    assert.equal(response.json().metrics.todayReceiptCount, 1);
    assert.equal(response.json().metrics.todayNetRevenueAmount, 100);
    assert.equal(response.json().metrics.todayAverageReceiptAmount, 120);
    assert.equal(response.json().metrics.recentCreditNoteCount, 1);
    assert.equal(response.json().metrics.recentNetRevenueAmount, 100);
    assert.equal(response.json().metrics.recentReturnRate, 33);
    assert.equal(response.json().metrics.unreadNotificationCount, 4);
    assert.deepEqual(
      invoiceCalls.map((call) => call.dateFrom?.toISOString()),
      ["2026-04-23T00:00:00.000Z", "2026-04-29T00:00:00.000Z"],
    );
  });

  it("omits sales metrics when the worker cannot view sales", async () => {
    let invoiceCalls = 0;
    const server = createWorkerDashboardServer({
      canViewSales: false,
      invoiceListByWorker: async () => {
        invoiceCalls += 1;
        return { items: [], total: 0 };
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      query: { locationId: LOCATION_ID },
      url: "/api/worker/dashboard/summary",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().metrics, null);
    assert.deepEqual(response.json().latestSales, []);
    assert.equal(invoiceCalls, 0);
  });
});

function createWorkerDashboardServer(input: {
  canViewSales: boolean;
  invoiceListByWorker(input: {
    classification?: "internal" | "outgoing";
    dateFrom?: Date;
    dateTo?: Date;
    documentType?: "adjusted" | "credit_note" | "invoice";
    locationId: string;
    page: number;
    pageSize: number;
    q?: string;
    workerId: string;
  }): Promise<{ items: InvoiceRecord[]; total: number }>;
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
                  slug: "worker-a",
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
        async assertHasPermission(args) {
          if (args.permission === "stock.assignments.own.view") {
            return;
          }

          if (args.permission === "pos.sales.view" && input.canViewSales) {
            return;
          }

          throw new AppError({
            code: "forbidden",
            detail: "Permission denied.",
            statusCode: 403,
            title: "Forbidden",
          });
        },
      },
    },
    workerDashboard: {
      assignmentQueryRepository: {
        async getWorkerAssignments() {
          return [
            assignment({
              availableQuantity: 4,
              quantity: 8,
              sku: "SKU-LOW",
              skuId: "33333333-3333-4333-8333-333333333333",
            }),
            assignment({
              availableQuantity: 0,
              quantity: 6,
              sku: "SKU-OUT",
              skuId: "44444444-4444-4444-8444-444444444444",
            }),
          ];
        },
      },
      invoiceRepository: {
        listByWorker: input.invoiceListByWorker,
      },
      notificationQueryService: {
        async listNotifications() {
          return {
            items: [
              notification({ status: "unread" }),
              notification({
                notificationKey: "55555555-5555-4555-8555-555555555556",
                status: "read",
              }),
            ],
            unreadCount: 4,
          };
        },
      },
      permissionService: {
        async assertHasPermission(args) {
          return createPermissionService(input.canViewSales).assertHasPermission(
            args,
          );
        },
      },
    },
  });
}

function createPermissionService(canViewSales: boolean) {
  return {
    async assertHasPermission(args: {
      locationId?: string;
      permission: string;
      user: { userId: string };
    }) {
      if (args.permission === "stock.assignments.own.view") {
        return;
      }

      if (args.permission === "pos.sales.view" && canViewSales) {
        return;
      }

      throw new AppError({
        code: "forbidden",
        detail: "Permission denied.",
        statusCode: 403,
        title: "Forbidden",
      });
    },
  };
}

function assignment(overrides: Partial<ReturnType<typeof baseAssignment>>) {
  return { ...baseAssignment(), ...overrides };
}

function baseAssignment() {
  return {
    availableQuantity: 10,
    brandName: "Acme",
    brandSlug: "acme",
    categoryName: "Shirts",
    categorySlug: "shirts",
    effectiveFrom: NOW,
    locationId: LOCATION_ID,
    onHandQuantity: 10,
    primaryImageUrl: null,
    productName: "Uniform Shirt",
    productSlug: "uniform-shirt",
    quantity: 10,
    sellingPrice: "25.00",
    sku: "SKU-001",
    skuId: "33333333-3333-4333-8333-333333333334",
    variantName: "Blue / M",
    variantSlug: "blue-m",
    workerId: USER_ID,
  };
}

function invoiceRecord(overrides: Partial<InvoiceRecord>): InvoiceRecord {
  const record: InvoiceRecord = {
    attributedWorkerEmail: "worker@example.com",
    attributedWorkerId: USER_ID,
    attributedWorkerName: "Worker A",
    classification: "outgoing",
    confirmedAt: NOW,
    createdAt: NOW,
    createdBy: USER_ID,
    currencyCode: "GHS",
    currencyScale: 2,
    currentPayableReference: "INV/2026/000100",
    customerBillingAddressLines: null,
    customerEmail: null,
    customerName: null,
    customerPhone: null,
    customerTaxNumber: null,
    id: "66666666-6666-4666-8666-666666666666",
    locationId: LOCATION_ID,
    notes: null,
    parentInvoiceId: null,
    parentInvoiceReference: null,
    paymentMethod: "cash",
    reference: "INV/2026/000100",
    replacementInvoiceId: null,
    replacementInvoiceReference: null,
    revisionCreditNoteId: null,
    revisionCreditNoteReference: null,
    revisionRootInvoiceId: null,
    revisionRootReference: null,
    role: "standard",
    status: "confirmed",
    subtotalAmount: "120.00",
    taxAmount: "0.00",
    totalAmount: "120.00",
    type: "pos",
    updatedAt: NOW,
    voidedAt: null,
    voidReason: null,
  };

  return { ...record, ...overrides };
}

function notification(overrides: Partial<ReturnType<typeof baseNotification>>) {
  return { ...baseNotification(), ...overrides };
}

function baseNotification() {
  return {
    actorUserSlug: "manager-a",
    eventType: "stock.alert",
    notificationKey: "55555555-5555-4555-8555-555555555555",
    occurredAt: NOW.toISOString(),
    payload: {},
    readAt: null,
    resource: {
      kind: "stock_assignment",
      reference: "SKU-LOW",
    },
    status: "unread" as "read" | "unread",
    summary: "Stock is running low.",
  };
}

function bearerToken() {
  return `Bearer ${
    issueAccessToken({
      expiresInSeconds: 900,
      now: NOW,
      secret: "development-access-secret",
      userId: USER_ID,
      userSlug: "worker-a",
    }).token
  }`;
}
