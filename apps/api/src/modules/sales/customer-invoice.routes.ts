import {
  customerInvoiceListQuerySchema,
  customerInvoiceListResponseSchema,
  customerInvoiceResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import type { SalesIssuedDocumentSnapshotService } from "../official-documents/sales-issued-document-snapshot.service.js";
import {
  toCustomerInvoiceListItemResponse,
  toCustomerInvoiceResponse,
} from "./customer-invoice-response.mapper.js";
import type {
  CustomerInvoiceListInput,
  PostgresCustomerInvoiceQueryRepository,
} from "./postgres-customer-invoice-query.repository.js";
import { unavailableSalesError } from "./sales-route-access.js";

export const customerInvoiceDownloadRateLimit = {
  groupId: "customer-issued-document-download",
  max: 30,
  timeWindow: "1 minute",
};

type CustomerInvoiceRouteDependencies = {
  customerInvoiceRepository: Pick<
    PostgresCustomerInvoiceQueryRepository,
    "findForCustomerByReference" | "listForCustomer"
  >;
  salesDocumentSnapshotService: Pick<
    SalesIssuedDocumentSnapshotService,
    "getPdfDownloadForAuthorizedInvoice"
  >;
};

const customerListInvoicesRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "GET",
  url: "/api/customer/invoices",
};

const customerGetInvoiceRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "GET",
  url: "/api/customer/invoices/:reference",
};

const customerDownloadInvoiceRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "GET",
  url: "/api/customer/invoices/:reference/download",
};

export function registerCustomerInvoiceRoutes(
  server: FastifyInstance,
  dependencies: CustomerInvoiceRouteDependencies = createUnavailableCustomerInvoiceDependencies(),
) {
  server.route({
    config: { access: customerListInvoicesRoute.access },
    method: customerListInvoicesRoute.method,
    url: customerListInvoicesRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const query = customerInvoiceListQuerySchema.parse(request.query);
      const result =
        await dependencies.customerInvoiceRepository.listForCustomer(
          toCustomerInvoiceListInput(query, actor.userId),
        );

      return customerInvoiceListResponseSchema.parse({
        ...result,
        items: result.items.map(toCustomerInvoiceListItemResponse),
      });
    },
  });

  server.route({
    config: { access: customerGetInvoiceRoute.access },
    method: customerGetInvoiceRoute.method,
    url: customerGetInvoiceRoute.url,
    async handler(request) {
      const actor = getAuthenticatedActor(request);
      const { reference } = request.params as { reference: string };
      const invoice =
        await dependencies.customerInvoiceRepository.findForCustomerByReference(
          {
            reference,
            userId: actor.userId,
          },
        );
      if (!invoice) throw customerInvoiceNotFoundError();

      return customerInvoiceResponseSchema.parse(
        toCustomerInvoiceResponse(invoice),
      );
    },
  });

  server.route({
    config: {
      access: customerDownloadInvoiceRoute.access,
      rateLimit: customerInvoiceDownloadRateLimit,
    },
    method: customerDownloadInvoiceRoute.method,
    url: customerDownloadInvoiceRoute.url,
    async handler(request, reply) {
      const actor = getAuthenticatedActor(request);
      const { reference } = request.params as { reference: string };
      const invoice =
        await dependencies.customerInvoiceRepository.findForCustomerByReference(
          {
            reference,
            userId: actor.userId,
          },
        );
      if (!invoice) throw customerInvoiceNotFoundError();

      const file =
        await dependencies.salesDocumentSnapshotService.getPdfDownloadForAuthorizedInvoice(
          {
            actorUserId: actor.userId,
            actorUserSlug: actor.userSlug,
            invoice,
          },
        );

      return reply
        .header(
          "Content-Disposition",
          contentDispositionAttachment(file.filename),
        )
        .header("Content-Type", file.contentType)
        .send(file.body);
    },
  });
}

function toCustomerInvoiceListInput(
  query: ReturnType<typeof customerInvoiceListQuerySchema.parse>,
  userId: string,
): CustomerInvoiceListInput {
  return {
    ...(query.currentPayableOnly
      ? { currentPayableOnly: query.currentPayableOnly }
      : {}),
    ...(query.dateFrom ? { dateFrom: new Date(query.dateFrom) } : {}),
    ...(query.dateTo ? { dateTo: new Date(query.dateTo) } : {}),
    ...(query.documentType !== "all"
      ? { documentType: query.documentType }
      : {}),
    page: query.page,
    pageSize: query.pageSize,
    ...(query.q ? { q: query.q } : {}),
    ...(query.status !== "all" ? { status: query.status } : {}),
    userId,
  };
}

function createUnavailableCustomerInvoiceDependencies(): CustomerInvoiceRouteDependencies {
  return {
    customerInvoiceRepository: {
      async findForCustomerByReference() {
        throw unavailableSalesError();
      },
      async listForCustomer() {
        throw unavailableSalesError();
      },
    },
    salesDocumentSnapshotService: {
      async getPdfDownloadForAuthorizedInvoice() {
        throw unavailableSalesError();
      },
    },
  };
}

function customerInvoiceNotFoundError(): AppError {
  return new AppError({
    code: "not_found",
    detail: "Invoice was not found for this customer account.",
    statusCode: 404,
    title: "Invoice not found",
  });
}

function contentDispositionAttachment(filename: string): string {
  const safeFilename = filename.replace(/["\r\n]/g, "-");
  return `attachment; filename="${safeFilename}"`;
}
