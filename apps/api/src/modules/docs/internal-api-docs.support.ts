import type { InternalApiDocRoute } from "./internal-api-docs.catalog.js";
import {
  buildOpenApiParameters,
  buildOpenApiPath,
  buildOpenApiRequestBody,
  buildOpenApiResponses,
  buildOpenApiSecurity,
  createComponentRegistry,
  createOpenApiOperationId,
  describeOpenApiAccess,
  type OpenApiDocument,
} from "./internal-api-docs.openapi-support.js";

export function buildInternalOpenApiDocument(
  routes: readonly InternalApiDocRoute[],
): OpenApiDocument {
  const paths: OpenApiDocument["paths"] = {};
  const components = createComponentRegistry();

  for (const route of routes) {
    const path = buildOpenApiPath(route.url);
    const method = route.method.toLowerCase();
    const methods = paths[path] ?? {};
    const parameters = buildOpenApiParameters(route);
    const requestBody = buildOpenApiRequestBody(route, components);

    const operation: Record<string, unknown> = {
      description: route.description,
      operationId: createOpenApiOperationId(route.method, route.url),
      responses: buildOpenApiResponses(route, components),
      security: buildOpenApiSecurity(route.access),
      summary: route.summary,
      tags: [route.tag],
      "x-route-access": describeOpenApiAccess(route.access),
    };

    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    if (requestBody) {
      operation.requestBody = requestBody;
    }

    methods[method] = operation;
    paths[path] = methods;
  }

  return {
    components: {
      schemas: components.schemas,
      securitySchemes: {
        bearerAuth: {
          bearerFormat: "JWT",
          scheme: "bearer",
          type: "http",
        },
      },
    },
    info: {
      description:
        "Protected internal API reference generated from the application route catalogue and shared Zod contracts. Documented endpoints now include request and response schemas where public contracts already exist.",
      title: "Shop API Internal Reference",
      version: "0.2.0-internal",
    },
    openapi: "3.0.3",
    paths,
    servers: [{ description: "Primary API server", url: "/" }],
  };
}
