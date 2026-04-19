import {
  invoiceListQuerySchema,
  invoiceListResponseSchema,
  invoiceResponseSchema,
  processPosPaymentRequestSchema,
  processPosReturnRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { PostgresInvoiceQueryRepository } from "./postgres-invoice-query.repository.js";
import type { PosSaleService } from "./pos-sale.service.js";

type PosSaleRouteDependencies = {
  invoiceRepository: Pick<
    PostgresInvoiceQueryRepository,
    "findByReference" | "listByLocation" | "listByWorker"
  >;
  posSaleService: Pick<PosSaleService, "processSale" | "processReturn">;
};

const workerProcessSaleRoute: RouteDefinition = {
  access: { kind: "permission", permission: "pos.sales.process", scope: "any_active" },
  method: "POST",
  url: "/api/worker/sales",
};

const workerListSalesRoute: RouteDefinition = {
  access: { kind: "permission", permission: "pos.sales.view", scope: "any_active" },
  method: "GET",
  url: "/api/worker/sales",
};

const workerGetSaleRoute: RouteDefinition = {
  access: { kind: "permission", permission: "pos.sales.view", scope: "any_active" },
  method: "GET",
  url: "/api/worker/sales/:reference",
};

const workerReturnSaleRoute: RouteDefinition = {
  access: { kind: "permission", permission: "pos.sales.process", scope: "any_active" },
  method: "POST",
  url: "/api/worker/sales/:reference/return",
};

const managerListSalesRoute: RouteDefinition = {
  access: { kind: "permission", permission: "pos.sales.manage", scope: "any_active" },
  method: "GET",
  url: "/api/manager/sales",
};

const managerGetSaleRoute: RouteDefinition = {
  access: { kind: "permission", permission: "pos.sales.manage", scope: "any_active" },
  method: "GET",
  url: "/api/manager/sales/:reference",
};

export function registerPosSaleRoutes(
  server: FastifyInstance,
  dependencies: PosSaleRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: workerProcessSaleRoute.access },
    method: workerProcessSaleRoute.method,
    url: workerProcessSaleRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const body = processPosPaymentRequestSchema.parse(request.body);
      const invoice = await dependencies.posSaleService.processSale({
        createdBy: userId,
        lines: body.lines.map((l) => ({
          quantity: l.quantity,
          skuId: l.skuId,
          ...(l.unitPrice !== undefined ? { unitPrice: l.unitPrice } : {}),
        })),
        locationId: body.locationId,
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        paymentMethod: body.paymentMethod,
      });
      return invoiceResponseSchema.parse(toInvoiceResponse(invoice));
    },
  });

  server.route({
    config: { access: workerListSalesRoute.access },
    method: workerListSalesRoute.method,
    url: workerListSalesRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const query = invoiceListQuerySchema.parse(request.query);
      if (!query.locationId) {
        throw new AppError({
          code: "validation_error",
          detail: "locationId is required.",
          statusCode: 400,
          title: "Missing locationId",
        });
      }
      const result = await dependencies.invoiceRepository.listByWorker({
        ...(query.dateFrom ? { dateFrom: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { dateTo: new Date(query.dateTo) } : {}),
        locationId: query.locationId,
        page: query.page,
        pageSize: query.pageSize,
        workerId: userId,
      });
      return invoiceListResponseSchema.parse({
        items: result.items.map((inv) => toInvoiceResponse({ ...inv, lines: [] })),
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
      });
    },
  });

  server.route({
    config: { access: workerGetSaleRoute.access },
    method: workerGetSaleRoute.method,
    url: workerGetSaleRoute.url,
    async handler(request) {
      const { reference } = request.params as { reference: string };
      const invoice = await dependencies.invoiceRepository.findByReference(reference);
      if (!invoice) {
        throw new AppError({
          code: "not_found",
          detail: `Invoice ${reference} does not exist.`,
          statusCode: 404,
          title: "Invoice not found",
        });
      }
      return invoiceResponseSchema.parse(toInvoiceResponse(invoice));
    },
  });

  server.route({
    config: { access: workerReturnSaleRoute.access },
    method: workerReturnSaleRoute.method,
    url: workerReturnSaleRoute.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const { reference } = request.params as { reference: string };
      const body = processPosReturnRequestSchema.parse(request.body);
      const creditNote = await dependencies.posSaleService.processReturn({
        createdBy: userId,
        lines: body.lines,
        parentReference: reference,
        reason: body.reason,
      });
      return invoiceResponseSchema.parse(toInvoiceResponse(creditNote));
    },
  });

  server.route({
    config: { access: managerListSalesRoute.access },
    method: managerListSalesRoute.method,
    url: managerListSalesRoute.url,
    async handler(request) {
      const query = invoiceListQuerySchema.parse(request.query);
      if (!query.locationId) {
        throw new AppError({
          code: "validation_error",
          detail: "locationId is required.",
          statusCode: 400,
          title: "Missing locationId",
        });
      }
      const result = await dependencies.invoiceRepository.listByLocation({
        ...(query.dateFrom ? { dateFrom: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { dateTo: new Date(query.dateTo) } : {}),
        locationId: query.locationId,
        page: query.page,
        pageSize: query.pageSize,
        ...(query.workerId ? { workerId: query.workerId } : {}),
      });
      return invoiceListResponseSchema.parse({
        items: result.items.map((inv) => toInvoiceResponse({ ...inv, lines: [] })),
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
      });
    },
  });

  server.route({
    config: { access: managerGetSaleRoute.access },
    method: managerGetSaleRoute.method,
    url: managerGetSaleRoute.url,
    async handler(request) {
      const { reference } = request.params as { reference: string };
      const invoice = await dependencies.invoiceRepository.findByReference(reference);
      if (!invoice) {
        throw new AppError({
          code: "not_found",
          detail: `Invoice ${reference} does not exist.`,
          statusCode: 404,
          title: "Invoice not found",
        });
      }
      return invoiceResponseSchema.parse(toInvoiceResponse(invoice));
    },
  });
}

function toInvoiceResponse(invoice: {
  attributedWorkerId: string | null;
  attributedWorkerName?: string | null;
  attributedWorkerEmail?: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  locationId: string;
  notes: string | null;
  paymentMethod: string | null;
  reference: string;
  status: "confirmed" | "voided";
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  type: "pos" | "portal" | "ecommerce" | "manual" | "credit_note";
  lines: {
    lineTotal: string;
    quantity: number;
    skuId: string;
    skuSnapshot: { sku: string; variantName: string; productName: string };
    stockMovementId: string | null;
    taxAmount: string;
    taxCategory: string | null;
    taxRate: string | null;
    unitPrice: string;
  }[];
}) {
  return {
    attributedWorkerId: invoice.attributedWorkerId,
    attributedWorkerName: invoice.attributedWorkerName ?? null,
    attributedWorkerEmail: invoice.attributedWorkerEmail ?? null,
    confirmedAt: invoice.confirmedAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    lines: invoice.lines.map((l) => ({
      lineTotal: l.lineTotal,
      quantity: l.quantity,
      skuId: l.skuId,
      skuSnapshot: l.skuSnapshot,
      stockMovementId: l.stockMovementId,
      taxAmount: l.taxAmount,
      taxCategory: l.taxCategory,
      taxRate: l.taxRate,
      unitPrice: l.unitPrice,
    })),
    locationId: invoice.locationId,
    notes: invoice.notes,
    paymentMethod: invoice.paymentMethod as "cash" | "card" | "mobile_money" | "transfer" | null,
    reference: invoice.reference,
    status: invoice.status,
    subtotalAmount: invoice.subtotalAmount,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    type: invoice.type,
  };
}

function createUnavailableDependencies(): PosSaleRouteDependencies {
  const unavailable = (): never => {
    throw new AppError({
      code: "internal_error",
      detail: "Sales services are not configured for this environment.",
      statusCode: 503,
      title: "Sales unavailable",
    });
  };

  return {
    invoiceRepository: {
      async findByReference() {
        return unavailable();
      },
      async listByLocation() {
        return unavailable();
      },
      async listByWorker() {
        return unavailable();
      },
    },
    posSaleService: {
      async processSale() {
        return unavailable();
      },
      async processReturn() {
        return unavailable();
      },
    },
  };
}
