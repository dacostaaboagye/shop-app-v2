import type { ZodType } from "zod";
import { z } from "zod";
import type { InternalApiDocRoute } from "./internal-api-docs.catalog.js";
import type { ComponentRegistry } from "./internal-api-docs.openapi-support.js";

export function getObjectPropertySchemas(schema: ZodType | undefined) {
  const jsonSchema = schema ? toOpenApiSchema(schema) : null;

  if (!jsonSchema || jsonSchema.type !== "object") {
    return {};
  }

  const properties = jsonSchema.properties;
  if (
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  ) {
    return {};
  }

  return properties as Record<string, unknown>;
}

export function getRequiredPropertyNames(schema: ZodType | undefined) {
  const jsonSchema = schema ? toOpenApiSchema(schema) : null;

  if (!jsonSchema || !Array.isArray(jsonSchema.required)) {
    return new Set<string>();
  }

  return new Set(
    jsonSchema.required.filter(
      (value): value is string => typeof value === "string",
    ),
  );
}

export function toOpenApiSchema(schema: ZodType) {
  return stripSchemaKeyword(z.toJSONSchema(schema));
}

export function toPascalCase(value: string) {
  return value
    .replaceAll(/[^A-Za-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join("");
}

export function registerRouteSchemaComponent(
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
    ...route.url
      .replaceAll(/:([A-Za-z0-9_]+)/g, "{$1}")
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
function stripSchemaKeyword(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => {
        if (Array.isArray(item)) {
          return [key, item.map(stripNestedSchemaKeyword)];
        }

        return [key, stripNestedSchemaKeyword(item)];
      })
      .filter(([key]) => key !== "$schema"),
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
