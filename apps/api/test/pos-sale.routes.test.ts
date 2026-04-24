import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import type { InvoiceWithLines } from "../src/modules/sales/sales.contracts.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-20T10:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "33333333-3333-4333-8333-333333333333";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";

describe("POS sale routes", () => {
  it("allows workers to read their own sale at a scoped location", async () => {
    const permissionCalls: PermissionCall[] = [];
    const server = createSalesServer({ permissionCalls });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/worker/sales/INV%2F2026%2F000001",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().reference, "INV/2026/000001");
    assert.ok(
      permissionCalls.some(
        (call) =>
          call.locationId === LOCATION_ID &&
          call.permission === "pos.sales.view",
      ),
    );
  });

  it("rejects workers reading another worker's sale", async () => {
    const permissionCalls: PermissionCall[] = [];
    const server = createSalesServer({
      invoice: invoice({
        attributedWorkerId: OTHER_USER_ID,
        createdBy: OTHER_USER_ID,
      }),
      permissionCalls,
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/worker/sales/INV%2F2026%2F000001",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(
      permissionCalls.filter((call) => call.locationId === LOCATION_ID).length,
      0,
    );
  });

  it("allows a manager with manage permission to read a sale they created", async () => {
    const permissionCalls: PermissionCall[] = [];
    const server = createSalesServer({
      forbiddenPermissions: ["pos.sales.view"],
      invoice: invoice({ attributedWorkerId: OTHER_USER_ID }),
      permissionCalls,
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: "/api/worker/sales/INV%2F2026%2F000001",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(
      permissionCalls.map((call) => call.permission),
      ["pos.sales.view", "pos.sales.manage"],
    );
  });

  it("requires manager sales permission for the requested location", async () => {
    const permissionCalls: PermissionCall[] = [];
    let listedQuery: null | {
      documentType?: "credit_note" | "invoice";
      locationId: string;
    } = null;
    const server = createSalesServer({
      async listByLocation(input) {
        listedQuery = {
          ...(input.documentType ? { documentType: input.documentType } : {}),
          locationId: input.locationId,
        };
        return { items: [invoice()], total: 1 };
      },
      permissionCalls,
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      url: `/api/manager/sales?documentType=credit_note&locationId=${LOCATION_ID}`,
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(listedQuery, {
      documentType: "credit_note",
      locationId: LOCATION_ID,
    });
    assert.ok(
      permissionCalls.some(
        (call) =>
          call.locationId === LOCATION_ID &&
          call.permission === "pos.sales.manage",
      ),
    );
  });
});

type PermissionCall = {
  locationId?: string;
  permission: string;
  scope?: "any_active" | "contextual";
};

function createSalesServer(input: {
  forbiddenPermissions?: string[];
  invoice?: InvoiceWithLines;
  listByLocation?: (input: {
    documentType?: "credit_note" | "invoice";
    locationId: string;
    page: number;
    pageSize: number;
    workerId?: string;
  }) => Promise<{ items: InvoiceWithLines[]; total: number }>;
  permissionCalls: PermissionCall[];
}) {
  const permissionService = {
    async assertHasPermission(args: {
      locationId?: string;
      permission: string;
      scope?: "any_active" | "contextual";
      user: { userId: string };
    }) {
      input.permissionCalls.push({
        ...(args.locationId ? { locationId: args.locationId } : {}),
        permission: args.permission,
        ...(args.scope ? { scope: args.scope } : {}),
      });
      if (input.forbiddenPermissions?.includes(args.permission)) {
        throw new AppError({
          code: "forbidden",
          detail: "Missing test permission.",
          statusCode: 403,
          title: "Forbidden",
        });
      }
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
                  slug: "worker-user",
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
    posSales: {
      invoiceRepository: {
        async findByReference(reference) {
          return reference === "INV/2026/000001"
            ? (input.invoice ?? invoice())
            : null;
        },
        async listByLocation(args) {
          return input.listByLocation
            ? input.listByLocation(args)
            : { items: [], total: 0 };
        },
        async listByWorker() {
          return { items: [], total: 0 };
        },
      },
      permissionService,
      posSaleService: {
        async processReturn() {
          throw unavailable();
        },
        async processSale() {
          throw unavailable();
        },
      },
    },
  });
}

function invoice(overrides: Partial<InvoiceWithLines> = {}): InvoiceWithLines {
  return {
    attributedWorkerEmail: "worker@example.com",
    attributedWorkerId: USER_ID,
    attributedWorkerName: "Store Worker",
    confirmedAt: NOW,
    createdAt: NOW,
    createdBy: USER_ID,
    customerBillingAddressLines: null,
    customerEmail: null,
    customerName: null,
    customerPhone: null,
    customerTaxNumber: null,
    id: "44444444-4444-4444-8444-444444444444",
    lines: [],
    locationId: LOCATION_ID,
    notes: null,
    parentInvoiceId: null,
    paymentMethod: "cash",
    reference: "INV/2026/000001",
    status: "confirmed",
    subtotalAmount: "0.00",
    taxAmount: "0.00",
    totalAmount: "0.00",
    type: "pos",
    updatedAt: NOW,
    voidedAt: null,
    voidReason: null,
    ...overrides,
  };
}

function unavailable() {
  return new AppError({
    code: "internal_error",
    detail: "Not expected in this test.",
    statusCode: 503,
    title: "Unavailable",
  });
}

function bearerToken() {
  return `Bearer ${
    issueAccessToken({
      expiresInSeconds: 900,
      now: NOW,
      secret: "development-access-secret",
      userId: USER_ID,
      userSlug: "worker-user",
    }).token
  }`;
}
