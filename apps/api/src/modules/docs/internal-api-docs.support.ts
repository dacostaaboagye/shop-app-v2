import { problemDetailsSchema } from "@shop/contracts";
import type { ZodType } from "zod";
import { z } from "zod";
import type { RouteAccess } from "../_core/route-contract.js";
import type { InternalApiDocRoute } from "./internal-api-docs.catalog.js";

type ComponentRegistry = {
  names: Map<ZodType, string>;
  schemas: Record<string, unknown>;
};

type OpenApiDocument = {
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: {
      bearerAuth: {
        bearerFormat: "JWT";
        scheme: "bearer";
        type: "http";
      };
    };
  };
  info: {
    description: string;
    title: string;
    version: string;
  };
  openapi: "3.0.3";
  paths: Record<string, Record<string, Record<string, unknown>>>;
  servers: Array<{ description: string; url: string }>;
};

export function buildInternalOpenApiDocument(
  routes: readonly InternalApiDocRoute[],
): OpenApiDocument {
  const paths: OpenApiDocument["paths"] = {};
  const components = createComponentRegistry();

  for (const route of routes) {
    const path = toOpenApiPath(route.url);
    const method = route.method.toLowerCase();
    const methods = paths[path] ?? {};
    const parameters = buildParameters(route);
    const requestBody = buildRequestBody(route, components);

    const operation: Record<string, unknown> = {
      description: route.description,
      operationId: createOperationId(route.method, route.url),
      responses: buildResponses(route, components),
      security: getSecurity(route.access),
      summary: route.summary,
      tags: [route.tag],
      "x-route-access": describeAccess(route.access),
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

function buildParameters(route: InternalApiDocRoute) {
  return [
    ...buildPathParameters(route.url, route.schemas?.pathParams),
    ...buildQueryParameters(route.schemas?.query),
  ];
}

function buildPathParameters(url: string, schema: ZodType | undefined) {
  const propertySchemas = getObjectPropertySchemas(schema);

  return url
    .split("/")
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => {
      const name = segment.slice(1);

      return {
        in: "path",
        name,
        required: true,
        schema: propertySchemas[name] ?? { type: "string" },
      };
    });
}

function buildQueryParameters(schema: ZodType | undefined) {
  const propertySchemas = getObjectPropertySchemas(schema);
  const required = getRequiredPropertyNames(schema);

  return Object.entries(propertySchemas).map(([name, parameterSchema]) => ({
    in: "query",
    name,
    required: required.has(name),
    schema: parameterSchema,
  }));
}

function buildRequestBody(route: InternalApiDocRoute, registry: ComponentRegistry) {
  const schema = route.schemas?.requestBody;

  if (!schema) {
    return null;
  }

  return {
    content: {
      "application/json": {
        schema: registerRouteSchemaComponent(route, "Request", schema, registry),
      },
    },
    required: true,
  };
}

function buildResponses(route: InternalApiDocRoute, registry: ComponentRegistry) {
  const responses: Record<string, unknown> = {
    "200": buildSuccessResponse(route, registry),
    default: {
      content: {
        "application/problem+json": {
          schema: { $ref: "#/components/schemas/ProblemDetails" },
        },
      },
      description:
        "Structured problem-details error response for validation, conflict, or server errors.",
    },
  };

  if (route.access.kind !== "public") {
    responses["401"] = buildProblemResponse("Authentication required");
  }

  if (route.access.kind === "permission") {
    responses["403"] = buildProblemResponse("Permission denied");
  }

  return responses;
}

function buildSuccessResponse(
  route: InternalApiDocRoute,
  registry: ComponentRegistry,
) {
  const schema = route.schemas?.response;

  if (!schema) {
    return { description: "Successful response" };
  }

  return {
    content: {
      "application/json": {
        schema: registerRouteSchemaComponent(route, "Response", schema, registry),
      },
    },
    description: "Successful response",
  };
}

function buildProblemResponse(description: string) {
  return {
    content: {
      "application/problem+json": {
        schema: { $ref: "#/components/schemas/ProblemDetails" },
      },
    },
    description,
  };
}

function createOperationId(method: string, url: string) {
  const parts = url
    .split("/")
    .filter(Boolean)
    .map((part) =>
      part.startsWith(":") ? `By${toPascalCase(part.slice(1))}` : toPascalCase(part),
    );

  return `${method.toLowerCase()}${parts.join("")}`;
}

function describeAccess(access: RouteAccess) {
  if (access.kind === "public") {
    return { kind: "public" };
  }

  if (access.kind === "authenticated") {
    return { kind: "authenticated" };
  }

  return {
    kind: "permission",
    permission: access.permission,
    scope: access.scope ?? "contextual",
  };
}

function getObjectPropertySchemas(schema: ZodType | undefined) {
  const jsonSchema = schema ? toOpenApiSchema(schema) : null;

  if (!jsonSchema || jsonSchema.type !== "object") {
    return {};
  }

  const properties = jsonSchema.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return {};
  }

  return properties as Record<string, unknown>;
}

function getRequiredPropertyNames(schema: ZodType | undefined) {
  const jsonSchema = schema ? toOpenApiSchema(schema) : null;

  if (!jsonSchema || !Array.isArray(jsonSchema.required)) {
    return new Set<string>();
  }

  return new Set(
    jsonSchema.required.filter((value): value is string => typeof value === "string"),
  );
}

function getSecurity(access: RouteAccess) {
  if (access.kind === "public") {
    return [];
  }

  return [{ bearerAuth: [] }];
}

function toOpenApiPath(url: string) {
  return url.replaceAll(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function createComponentRegistry(): ComponentRegistry {
  return {
    names: new Map<ZodType, string>([[problemDetailsSchema, "ProblemDetails"]]),
    schemas: {
      ProblemDetails: toOpenApiSchema(problemDetailsSchema),
    },
  };
}

function registerRouteSchemaComponent(
  route: InternalApiDocRoute,
  kind: "Request" | "Response",
  schema: ZodType,
  registry: ComponentRegistry,
) {
  const existingName = registry.names.get(schema);

  if (existingName) {
    return { $ref: `#/components/schemas/${existingName}` };
  }

  const componentName = [
    toPascalCase(route.tag),
    toPascalCase(route.method.toLowerCase()),
    ...toOpenApiPath(route.url)
      .split("/")
      .filter(Boolean)
      .map((segment) =>
        segment.startsWith("{") && segment.endsWith("}")
          ? `By${toPascalCase(segment.slice(1, -1))}`
          : toPascalCase(segment),
      ),
    kind,
  ].join("");

  registry.names.set(schema, componentName);
  registry.schemas[componentName] = toOpenApiSchema(schema);

  return { $ref: `#/components/schemas/${componentName}` };
}

function toOpenApiSchema(schema: ZodType) {
  return stripSchemaKeyword(z.toJSONSchema(schema));
}

function stripSchemaKeyword(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (Array.isArray(item)) {
        return [key, item.map(stripNestedSchemaKeyword)];
      }

      return [key, stripNestedSchemaKeyword(item)];
    }).filter(([key]) => key !== "$schema"),
  );
}

function stripNestedSchemaKeyword(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripNestedSchemaKeyword);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "$schema")
      .map(([key, item]) => [key, stripNestedSchemaKeyword(item)]),
  );
}

function toPascalCase(value: string) {
  return value
    .replaceAll(/[^A-Za-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("");
}
