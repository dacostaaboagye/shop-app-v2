import {
  issuedDocumentSnapshotResponseSchema,
  issuedSalesDocumentSnapshotParamsSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import {
  getAuthenticatedActor,
  getAuthenticatedUserId,
} from "../auth/auth-route-support.js";
import type { GtnIssuedDocumentSnapshotService } from "./gtn-issued-document-snapshot.service.js";
import type { SalesIssuedDocumentSnapshotService } from "./sales-issued-document-snapshot.service.js";

type IssuedDocumentRouteDependencies = {
  gtnDocumentSnapshotService: Pick<
    GtnIssuedDocumentSnapshotService,
    "getOrIssueSnapshot" | "getPdfDownload"
  >;
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

const getGtnSnapshotRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "GET",
  url: "/api/documents/gtns/:reference/snapshot",
};

const downloadGtnDocumentRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "GET",
  url: "/api/documents/gtns/:reference/download",
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
          actorUserSlug: getAuthenticatedActor(request).userSlug,
          actorUserId: getAuthenticatedUserId(request),
          reference,
        });
      return issuedDocumentSnapshotResponseSchema.parse(snapshot);
    },
  });

  server.route({
    config: { access: getGtnSnapshotRoute.access },
    method: getGtnSnapshotRoute.method,
    url: getGtnSnapshotRoute.url,
    async handler(request) {
      const { reference } = issuedSalesDocumentSnapshotParamsSchema.parse(
        request.params,
      );
      const snapshot =
        await dependencies.gtnDocumentSnapshotService.getOrIssueSnapshot({
          actorUserSlug: getAuthenticatedActor(request).userSlug,
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
          actorUserSlug: getAuthenticatedActor(request).userSlug,
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

  server.route({
    config: { access: downloadGtnDocumentRoute.access },
    method: downloadGtnDocumentRoute.method,
    url: downloadGtnDocumentRoute.url,
    async handler(request, reply) {
      const { reference } = issuedSalesDocumentSnapshotParamsSchema.parse(
        request.params,
      );
      const file = await dependencies.gtnDocumentSnapshotService.getPdfDownload(
        {
          actorUserSlug: getAuthenticatedActor(request).userSlug,
          actorUserId: getAuthenticatedUserId(request),
          reference,
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

function createUnavailableDependencies(): IssuedDocumentRouteDependencies {
  return {
    gtnDocumentSnapshotService: {
      async getPdfDownload() {
        throw unavailableIssuedDocumentsError();
      },
      async getOrIssueSnapshot() {
        throw unavailableIssuedDocumentsError();
      },
    },
    salesDocumentSnapshotService: {
      async getPdfDownload() {
        throw unavailableIssuedDocumentsError();
      },
      async getOrIssueSnapshot() {
        throw unavailableIssuedDocumentsError();
      },
    },
  };
}

function unavailableIssuedDocumentsError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Issued document services are not configured.",
    statusCode: 503,
    title: "Issued documents unavailable",
  });
}

function contentDispositionAttachment(filename: string): string {
  const safeFilename = filename.replace(/["\r\n]/g, "-");
  return `attachment; filename="${safeFilename}"`;
}
