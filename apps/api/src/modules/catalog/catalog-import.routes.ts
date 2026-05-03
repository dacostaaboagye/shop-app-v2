import {
  catalogImportJobResponseSchema,
  catalogImportReportResponseSchema,
  catalogImportTemplateResponseSchema,
  catalogImportUploadRequestSchema,
  catalogImportUploadResponseSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import { getAuthenticatedActor } from "../auth/auth-route-support.js";
import {
  type CatalogImportRouteDependencies,
  catalogImportRoutes,
  createUnavailableCatalogImportDependencies,
} from "./catalog-import-route-support.js";
import {
  buildCatalogImportTemplate,
  buildCatalogImportTemplateCsv,
} from "./catalog-import-template.js";

export function registerCatalogImportRoutes(
  server: FastifyInstance,
  dependencies: CatalogImportRouteDependencies = createUnavailableCatalogImportDependencies(),
) {
  server.route({
    config: { access: catalogImportRoutes.template.access },
    method: catalogImportRoutes.template.method,
    url: catalogImportRoutes.template.url,
    async handler() {
      return catalogImportTemplateResponseSchema.parse({
        ...buildCatalogImportTemplate(),
        csv: buildCatalogImportTemplateCsv(),
      });
    },
  });

  server.route({
    config: { access: catalogImportRoutes.start.access },
    method: catalogImportRoutes.start.method,
    url: catalogImportRoutes.start.url,
    async handler(request) {
      const payload = catalogImportUploadRequestSchema.parse(request.body);
      const result = await dependencies.catalogImportService.startImport({
        actor: getAuthenticatedActor(request),
        contentType: payload.contentType,
        csv: payload.csv,
        fileName: payload.fileName,
        now: new Date(),
      });
      return catalogImportUploadResponseSchema.parse(result);
    },
  });

  server.route({
    config: { access: catalogImportRoutes.show.access },
    method: catalogImportRoutes.show.method,
    url: catalogImportRoutes.show.url,
    async handler(request) {
      const { reference } = request.params as { reference: string };
      const result = await dependencies.catalogImportService.getJob(reference);
      if (!result) throw importNotFound(reference);
      return catalogImportJobResponseSchema.parse(result);
    },
  });

  server.route({
    config: { access: catalogImportRoutes.report.access },
    method: catalogImportRoutes.report.method,
    url: catalogImportRoutes.report.url,
    async handler(request) {
      const { reference } = request.params as { reference: string };
      const result =
        await dependencies.catalogImportService.getReport(reference);
      if (!result) throw importNotFound(reference);
      return catalogImportReportResponseSchema.parse(result);
    },
  });
}

function importNotFound(reference: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Catalog import "${reference}" does not exist.`,
    statusCode: 404,
    title: "Catalog import not found",
  });
}
