import {
  issuedDocumentSnapshotResponseSchema,
  issuedSalesDocumentSnapshotParamsSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import { getAuthenticatedUserId } from "../auth/auth-route-support.js";
import type { SalesIssuedDocumentSnapshotService } from "./sales-issued-document-snapshot.service.js";

type IssuedDocumentRouteDependencies = {
  salesDocumentSnapshotService: Pick<
    SalesIssuedDocumentSnapshotService,
    "getOrIssueSnapshot" | "getPdfDownload"
  >;
};

const getSalesSnapshotRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "GET",
  url: "/api/documents/sales/:reference/snapshot",
};

const downloadSalesDocumentRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "GET",
  url: "/api/documents/sales/:reference/download",
};

export function registerIssuedDocumentRoutes(
  server: FastifyInstance,
  dependencies: IssuedDocumentRouteDependencies = createUnavailableDependencies(),
) {
  server.route({
    config: { access: getSalesSnapshotRoute.access },
    method: getSalesSnapshotRoute.method,
    url: getSalesSnapshotRoute.url,
    async handler(request) {
      const { reference } = issuedSalesDocumentSnapshotParamsSchema.parse(
        request.params,
      );
      const snapshot =
        await dependencies.salesDocumentSnapshotService.getOrIssueSnapshot({
          actorUserId: getAuthenticatedUserId(request),
          reference,
        });
      return issuedDocumentSnapshotResponseSchema.parse(snapshot);
    },
  });

  server.route({
    config: { access: downloadSalesDocumentRoute.access },
    method: downloadSalesDocumentRoute.method,
    url: downloadSalesDocumentRoute.url,
    async handler(request, reply) {
      const { reference } = issuedSalesDocumentSnapshotParamsSchema.parse(
        request.params,
      );
      const file =
        await dependencies.salesDocumentSnapshotService.getPdfDownload({
          actorUserId: getAuthenticatedUserId(request),
          reference,
        });

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

function createUnavailableDependencies(): IssuedDocumentRouteDependencies {
  return {
    salesDocumentSnapshotService: {
      async getPdfDownload() {
        throw new AppError({
          code: "internal_error",
          detail: "Issued document services are not configured.",
          statusCode: 503,
          title: "Issued documents unavailable",
        });
      },
      async getOrIssueSnapshot() {
        throw new AppError({
          code: "internal_error",
          detail: "Issued document services are not configured.",
          statusCode: 503,
          title: "Issued documents unavailable",
        });
      },
    },
  };
}

function contentDispositionAttachment(filename: string): string {
  const safeFilename = filename.replace(/["\r\n]/g, "-");
  return `attachment; filename="${safeFilename}"`;
}
