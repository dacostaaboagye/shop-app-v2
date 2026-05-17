import {
  adminInvoiceListQuerySchema,
  adminInvoiceListResponseSchema,
  invoiceResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import {
  adminInvoiceExportFilename,
  buildAdminInvoiceCsv,
} from "./admin-invoice-export.csv.js";
import { toInvoiceResponse } from "./invoice-response.mapper.js";
import { posSaleRoutes } from "./pos-sale-route-definitions.js";
import type {
  AdminInvoiceListInput,
  PostgresAdminInvoiceQueryRepository,
} from "./postgres-admin-invoice-query.repository.js";
import type { PostgresInvoiceQueryRepository } from "./postgres-invoice-query.repository.js";
import type { AdminInvoiceRecord } from "./sales.contracts.js";
import {
  invoiceNotFoundError,
  unavailableSalesError,
} from "./sales-route-access.js";

const EXPORT_MAX_ROWS = 5_000;
const SALES_LOCATION_PERMISSIONS = ["pos.sales.manage", "pos.sales.view"];

export type AdminInvoiceRouteDependencies = {
  adminInvoiceRepository: Pick<
    PostgresAdminInvoiceQueryRepository,
    "listForAdmin"
  >;
  invoiceRepository: Pick<PostgresInvoiceQueryRepository, "findByReference">;
  permissionService: Pick<PermissionResolutionService, "resolveAllPermissions">;
};

export function registerAdminInvoiceRoutes(
  server: FastifyInstance,
  dependencies: AdminInvoiceRouteDependencies = createUnavailableAdminInvoiceDependencies(),
) {
  server.route({
    config: { access: posSaleRoutes.adminListInvoices.access },
    method: posSaleRoutes.adminListInvoices.method,
    url: posSaleRoutes.adminListInvoices.url,
    async handler(request) {
      const query = adminInvoiceListQuerySchema.parse(request.query);
      const locationIds = await resolvePermittedLocationIds({
        dependencies,
        ...(query.locationId ? { requestedLocationId: query.locationId } : {}),
        userId: getAuthenticatedUserId(request),
      });
      const result = await dependencies.adminInvoiceRepository.listForAdmin(
        toAdminInvoiceListInput(query, locationIds),
      );

      return adminInvoiceListResponseSchema.parse({
        ...result,
        items: result.items.map(toAdminInvoiceListItemResponse),
      });
    },
  });

  server.route({
    config: { access: posSaleRoutes.adminExportInvoices.access },
    method: posSaleRoutes.adminExportInvoices.method,
    url: posSaleRoutes.adminExportInvoices.url,
    async handler(request, reply) {
      const query = adminInvoiceListQuerySchema.parse(request.query);
      const locationIds = await resolvePermittedLocationIds({
        dependencies,
        ...(query.locationId ? { requestedLocationId: query.locationId } : {}),
        userId: getAuthenticatedUserId(request),
      });
      const result = await dependencies.adminInvoiceRepository.listForAdmin({
        ...toAdminInvoiceListInput(query, locationIds),
        page: 1,
        pageSize: EXPORT_MAX_ROWS,
      });

      return reply
        .header(
          "Content-Disposition",
          `attachment; filename="${adminInvoiceExportFilename()}"`,
        )
        .type("text/csv; charset=utf-8")
        .send(buildAdminInvoiceCsv(result.items));
    },
  });

  server.route({
    config: { access: posSaleRoutes.adminGetInvoice.access },
    method: posSaleRoutes.adminGetInvoice.method,
    url: posSaleRoutes.adminGetInvoice.url,
    async handler(request) {
      const { reference } = request.params as { reference: string };
      const invoice =
        await dependencies.invoiceRepository.findByReference(reference);
      if (!invoice) throw invoiceNotFoundError(reference);
      await assertCanAccessLocation({
        dependencies,
        locationId: invoice.locationId,
        userId: getAuthenticatedUserId(request),
      });

      return invoiceResponseSchema.parse(toInvoiceResponse(invoice));
    },
  });
}

function createUnavailableAdminInvoiceDependencies(): AdminInvoiceRouteDependencies {
  return {
    adminInvoiceRepository: {
      async listForAdmin() {
        throw unavailableSalesError();
      },
    },
    invoiceRepository: {
      async findByReference() {
        throw unavailableSalesError();
      },
    },
    permissionService: {
      async resolveAllPermissions() {
        throw unavailableSalesError();
      },
    },
  };
}

async function resolvePermittedLocationIds(input: {
  dependencies: AdminInvoiceRouteDependencies;
  requestedLocationId?: string;
  userId: string;
}): Promise<string[]> {
  const scopes = await resolvePermittedLocationScopes(input);
  const permittedLocationIds = scopes.map((scope) => scope.locationId);

  if (!input.requestedLocationId) {
    if (permittedLocationIds.length === 0) throw forbiddenAdminInvoiceError();
    return permittedLocationIds;
  }

  if (!permittedLocationIds.includes(input.requestedLocationId)) {
    throw forbiddenAdminInvoiceError();
  }

  return [input.requestedLocationId];
}

async function assertCanAccessLocation(input: {
  dependencies: AdminInvoiceRouteDependencies;
  locationId: string;
  userId: string;
}): Promise<void> {
  const scopes = await resolvePermittedLocationScopes(input);
  if (!scopes.some((scope) => scope.locationId === input.locationId)) {
    throw forbiddenAdminInvoiceError();
  }
}

async function resolvePermittedLocationScopes(input: {
  dependencies: AdminInvoiceRouteDependencies;
  userId: string;
}) {
  const resolution =
    await input.dependencies.permissionService.resolveAllPermissions({
      userId: input.userId,
    });

  return resolution.locationScopes.filter((scope) =>
    scope.permissions.some((permission) =>
      SALES_LOCATION_PERMISSIONS.includes(permission.key),
    ),
  );
}

function toAdminInvoiceListInput(
  query: ReturnType<typeof adminInvoiceListQuerySchema.parse>,
  locationIds: readonly string[],
): AdminInvoiceListInput {
  return {
    ...(query.channel !== "all" ? { channel: query.channel } : {}),
    ...(query.classification !== "all"
      ? { classification: query.classification }
      : {}),
    ...(query.currentPayableOnly
      ? { currentPayableOnly: query.currentPayableOnly }
      : {}),
    ...(query.dateFrom ? { dateFrom: new Date(query.dateFrom) } : {}),
    ...(query.dateTo ? { dateTo: new Date(query.dateTo) } : {}),
    ...(query.documentType !== "all"
      ? { documentType: query.documentType }
      : {}),
    locationIds,
    page: query.page,
    pageSize: query.pageSize,
    ...(query.q ? { q: query.q } : {}),
    ...(query.status !== "all" ? { status: query.status } : {}),
    ...(query.workerId ? { workerId: query.workerId } : {}),
  };
}

function toAdminInvoiceListItemResponse(record: AdminInvoiceRecord) {
  return {
    ...toInvoiceResponse({ ...record, lines: [] }),
    locationName: record.locationName,
    locationSlug: record.locationSlug,
  };
}

function forbiddenAdminInvoiceError(): AppError {
  return new AppError({
    code: "forbidden",
    detail: "You do not have permission to access invoices for this location.",
    statusCode: 403,
    title: "Forbidden",
  });
}
