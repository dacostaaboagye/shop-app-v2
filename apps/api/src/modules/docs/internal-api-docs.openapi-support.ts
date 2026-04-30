import { problemDetailsSchema } from "@shop/contracts";
import type { ZodType } from "zod";
import type { RouteAccess } from "../_core/route-contract.js";
import type { InternalApiDocRoute } from "./internal-api-docs.catalog.js";
import {
  getObjectPropertySchemas,
  getRequiredPropertyNames,
  registerRouteSchemaComponent,
  toOpenApiSchema,
  toPascalCase,
} from "./internal-api-docs.openapi-schema-support.js";

export type ComponentRegistry = {
  names: Map<ZodType, string>;
  schemas: Record<string, unknown>;
};

export type OpenApiDocument = {
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

export function buildOpenApiPath(url: string) {
  return url.replaceAll(/:([A-Za-z0-9_]+)/g, "{$1}");
}

export function buildOpenApiParameters(route: InternalApiDocRoute) {
  return [
    ...buildPathParameters(route.url, route.schemas?.pathParams),
    ...buildQueryParameters(route.schemas?.query),
  ];
}

export function buildOpenApiRequestBody(
  route: InternalApiDocRoute,
  registry: ComponentRegistry,
) {
  const schema = route.schemas?.requestBody;

  if (!schema) {
    return null;
  }

  return {
    content: {
      "application/json": {
        schema: registerRouteSchemaComponent(
          route,
          "Request",
          schema,
          registry,
        ),
      },
    },
    required: true,
  };
}

export function buildOpenApiResponses(
  route: InternalApiDocRoute,
  registry: ComponentRegistry,
) {
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

export function createOpenApiOperationId(method: string, url: string) {
  const parts = url
    .split("/")
    .filter(Boolean)
    .map((part) =>
      part.startsWith(":")
        ? `By${toPascalCase(part.slice(1))}`
        : toPascalCase(part),
    );

  return `${method.toLowerCase()}${parts.join("")}`;
}

export function describeOpenApiAccess(access: RouteAccess) {
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

export function buildOpenApiSecurity(access: RouteAccess) {
  if (access.kind === "public") {
    return [];
  }

  return [{ bearerAuth: [] }];
}

export function createComponentRegistry(): ComponentRegistry {
  return {
    names: new Map<ZodType, string>([[problemDetailsSchema, "ProblemDetails"]]),
    schemas: {
      ProblemDetails: toOpenApiSchema(problemDetailsSchema),
    },
  };
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
        schema: registerRouteSchemaComponent(
          route,
          "Response",
          schema,
          registry,
        ),
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
