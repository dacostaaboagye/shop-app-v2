import {
  invoiceListQuerySchema,
  invoiceListResponseSchema,
  invoiceResponseSchema,
  processPosPaymentRequestSchema,
  processPosReturnRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import {
  getAuthenticatedActor,
  getAuthenticatedUserId,
} from "../auth/auth-route-support.js";
import { toInvoiceResponse } from "./invoice-response.mapper.js";
import type { PosSaleService } from "./pos-sale.service.js";
import { posSaleRoutes } from "./pos-sale-route-definitions.js";
import { createUnavailablePosSaleDependencies } from "./pos-sale-route-dependencies.js";
import type { PostgresInvoiceQueryRepository } from "./postgres-invoice-query.repository.js";
import {
  assertCanManageSales,
  assertCanProcessSales,
  assertCanReturnSale,
  assertCanViewOwnSale,
  invoiceNotFoundError,
  missingLocationIdError,
} from "./sales-route-access.js";

export type PosSaleRouteDependencies = {
  invoiceRepository: Pick<
    PostgresInvoiceQueryRepository,
    "findByReference" | "listByLocation" | "listByWorker"
  >;
  permissionService: Pick<PermissionResolutionService, "assertHasPermission">;
  posSaleService: Pick<PosSaleService, "processSale" | "processReturn">;
};

export function registerPosSaleRoutes(
  server: FastifyInstance,
  dependencies: PosSaleRouteDependencies = createUnavailablePosSaleDependencies(),
) {
  server.route({
    config: { access: posSaleRoutes.workerProcessSale.access },
    method: posSaleRoutes.workerProcessSale.method,
    url: posSaleRoutes.workerProcessSale.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const body = processPosPaymentRequestSchema.parse(request.body);
      await assertCanProcessSales({
        locationId: body.locationId,
        permissionService: dependencies.permissionService,
        userId,
      });
      const invoice = await dependencies.posSaleService.processSale({
        createdBy: userId,
        ...(body.customerBillingAddressLines !== undefined
          ? { customerBillingAddressLines: body.customerBillingAddressLines }
          : {}),
        ...(body.customerEmail !== undefined
          ? { customerEmail: body.customerEmail }
          : {}),
        ...(body.customerName !== undefined
          ? { customerName: body.customerName }
          : {}),
        ...(body.customerPhone !== undefined
          ? { customerPhone: body.customerPhone }
          : {}),
        ...(body.customerTaxNumber !== undefined
          ? { customerTaxNumber: body.customerTaxNumber }
          : {}),
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
    config: { access: posSaleRoutes.workerListSales.access },
    method: posSaleRoutes.workerListSales.method,
    url: posSaleRoutes.workerListSales.url,
    async handler(request) {
      const userId = getAuthenticatedUserId(request);
      const query = invoiceListQuerySchema.parse(request.query);
      if (!query.locationId) {
        throw missingLocationIdError();
      }
      await assertCanViewOwnSale({
        invoice: {
          attributedWorkerId: userId,
          createdBy: userId,
          locationId: query.locationId,
        },
        permissionService: dependencies.permissionService,
        userId,
      });
      const result = await dependencies.invoiceRepository.listByWorker({
        ...(query.dateFrom ? { dateFrom: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { dateTo: new Date(query.dateTo) } : {}),
        ...(query.documentType !== "all"
          ? { documentType: query.documentType }
          : {}),
        locationId: query.locationId,
        page: query.page,
        pageSize: query.pageSize,
        workerId: userId,
      });
      return invoiceListResponseSchema.parse({
        items: result.items.map((inv) =>
          toInvoiceResponse({ ...inv, lines: [] }),
        ),
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
      });
    },
  });

  server.route({
    config: { access: posSaleRoutes.workerGetSale.access },
    method: posSaleRoutes.workerGetSale.method,
    url: posSaleRoutes.workerGetSale.url,
    async handler(request) {
      const { reference } = request.params as { reference: string };
      const userId = getAuthenticatedUserId(request);
      const invoice =
        await dependencies.invoiceRepository.findByReference(reference);
      if (!invoice) throw invoiceNotFoundError(reference);
      await assertCanViewOwnSale({
        invoice,
        permissionService: dependencies.permissionService,
        userId,
      });
      return invoiceResponseSchema.parse(toInvoiceResponse(invoice));
    },
  });

  server.route({
    config: { access: posSaleRoutes.workerReturnSale.access },
    method: posSaleRoutes.workerReturnSale.method,
    url: posSaleRoutes.workerReturnSale.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const userId = actor.userId;
      const { reference } = request.params as { reference: string };
      const body = processPosReturnRequestSchema.parse(request.body);
      const invoice =
        await dependencies.invoiceRepository.findByReference(reference);
      if (!invoice) throw invoiceNotFoundError(reference);
      await assertCanReturnSale({
        invoice,
        permissionService: dependencies.permissionService,
        userId,
      });
      const creditNote = await dependencies.posSaleService.processReturn({
        actor: { userSlug: actor.userSlug },
        createdBy: userId,
        lines: body.lines,
        parentReference: reference,
        reason: body.reason,
      });
      return invoiceResponseSchema.parse(toInvoiceResponse(creditNote));
    },
  });

  server.route({
    config: { access: posSaleRoutes.managerListSales.access },
    method: posSaleRoutes.managerListSales.method,
    url: posSaleRoutes.managerListSales.url,
    async handler(request) {
      const query = invoiceListQuerySchema.parse(request.query);
      if (!query.locationId) {
        throw missingLocationIdError();
      }
      await assertCanManageSales({
        locationId: query.locationId,
        permissionService: dependencies.permissionService,
        userId: getAuthenticatedUserId(request),
      });
      const result = await dependencies.invoiceRepository.listByLocation({
        ...(query.dateFrom ? { dateFrom: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { dateTo: new Date(query.dateTo) } : {}),
        ...(query.documentType !== "all"
          ? { documentType: query.documentType }
          : {}),
        locationId: query.locationId,
        page: query.page,
        pageSize: query.pageSize,
        ...(query.workerId ? { workerId: query.workerId } : {}),
      });
      return invoiceListResponseSchema.parse({
        items: result.items.map((inv) =>
          toInvoiceResponse({ ...inv, lines: [] }),
        ),
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
      });
    },
  });

  server.route({
    config: { access: posSaleRoutes.managerGetSale.access },
    method: posSaleRoutes.managerGetSale.method,
    url: posSaleRoutes.managerGetSale.url,
    async handler(request) {
      const { reference } = request.params as { reference: string };
      const userId = getAuthenticatedUserId(request);
      const invoice =
        await dependencies.invoiceRepository.findByReference(reference);
      if (!invoice) throw invoiceNotFoundError(reference);
      await assertCanManageSales({
        locationId: invoice.locationId,
        permissionService: dependencies.permissionService,
        userId,
      });
      return invoiceResponseSchema.parse(toInvoiceResponse(invoice));
    },
  });
}
